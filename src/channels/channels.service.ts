import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Res } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, FilterQuery, Model, UpdateQuery } from 'mongoose';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChannelDto } from './dto/channel.dto';
import { Channel, ChannelDocument } from './schemas/channel.schema';
import { google } from 'googleapis'
import { InjectQueue } from '@nestjs/bull';
import Bull, { Queue } from 'bull';
import { Response } from 'express';
import { format } from 'fast-csv';
import { Stream } from 'stream';
import { Parser } from 'json2csv'
import * as fs from 'fs'
import { DetermineChannelID, GetMainInfo } from 'src/utils/channels/channels';
import { FoldersService } from 'src/folders/folders.service';
const LanguageDetect = require('languagedetect');
const cld = require('cld')

@Injectable()
export class ChannelsService {

    constructor(
        @InjectModel(Channel.name)
        private channelModel: Model<ChannelDocument>,

        @InjectQueue('channels')
        private channelsQueue: Queue,

        @Inject(forwardRef(() => FoldersService))
        private readonly foldersService: FoldersService
    ) {

    }

    async getAll(folder: string, blacklist?: string, filterOptions?: string): Promise<Channel[]> {
        if (folder) {
            if (blacklist === 'true') {
                return this.channelModel.find({ folders: { $elemMatch: { name: folder, blocked: true } } }).sort({ lastVideoPublishedAt: 'desc' }).exec();
            }
            else return this.channelModel.find({ folders: { $elemMatch: { name: folder, blocked: { $in: [null, false] } } } }, { description: 0 }).sort({ lastVideoPublishedAt: 'desc' }).exec();
        } else {
            Logger.log(`Global search: ${filterOptions}`)
            return this.channelModel.find(JSON.parse(filterOptions), { description: 0 }).sort({ lastVideoPublishedAt: 'desc' }).exec();
        };
        // else return this.channelModel.find({ ['folders.blocked']: { $in: [null, false] } }).sort({ lastVideoPublishedAt: 'desc' }).exec();
    }

    async getById(id: string): Promise<Channel> {
        return await this.channelModel.findById(id);
    }

    async getStats(): Promise<Bull.JobCounts> {
        Logger.log("Get jobs stat", "ChannelsService");
        return this.channelsQueue.getJobCounts();
    }

    async create(channel: CreateChannelDto, chunkStampParam: number): Promise<Bull.Job<any>> {
        Logger.log("Post single request", 'ChannelsService');
        const { url, folder, chunkStamp } = channel;

        return await this.channelsQueue.add({ id: url, url: url, folder: folder.toLowerCase(), chunkStamp: chunkStamp || chunkStampParam });
    }

    async save(channel: ChannelDocument): Promise<Channel> {
        return channel.save();
    }

    async remove(id: string, folder?: string): Promise<Channel> {
        Logger.log(`Deleting ${id} from ${folder}...`, 'ChannelsService');

        const foundChannel = await this.getById(id);
        Logger.log(`Channel exists at: ${foundChannel.folders.toString()}`, 'ChannelsService')

        if (foundChannel.folders.length > 1 && folder) {
            Logger.log(`Updating channel's folders array`, 'ChannelsService');
            return this.channelModel.findByIdAndUpdate(id, { $pull: { folders: { name: folder } } });
        } else {
            Logger.log(`Deleting channel completely`, 'ChannelsService');
            return this.channelModel.findByIdAndRemove(id);
        }
    }

    async removeMany(ids?: string[], from?: string) {
        Logger.log(`Delete multiple channels ${ids.toString()}`, 'ChannelsService');
        return await Promise.all(ids.map(async (id) => { Logger.log(`Deleting ${id}...`); return await this.remove(id, from) }));
        // return this.channelModel.deleteMany({ _id: ids });
    }

    async update(id: string, channelUpdateQuery: ChannelDto & UpdateQuery<Channel>, options?: object): Promise<Channel> {
        Logger.log('Channel info sent to database', 'ChannelsService')
        return this.channelModel.findByIdAndUpdate(id, channelUpdateQuery, { ...options, new: true }) // upsert: true/false
    }

    async sendQueue(data: Array<string[]>, folder: string, options?: { onlyEmail?: boolean, shouldBlock?: boolean, remake?: boolean }): Promise<Bull.Job<any>[]> {
        Logger.log(`Sending a job...`, 'ChannelsService')
        Logger.log(`Length of data ${data.length}`, 'ChannelsService');

        const chunkStamp = Date.now();

        return this.channelsQueue.addBulk(data.map(row => ({
            data: {
                id: row[0],
                url: row[0],
                folder,
                chunkStamp,
                options: {
                    onlyEmail: options.onlyEmail ? { email: row[1].trim() } : null,
                    shouldBlock: options.shouldBlock,
                    remake: options.remake
                }
            }
        })));
    }

    // TBD
    async remakeFolder(folderID: string): Promise<Bull.Job<any>[]> {
        const foundFolder = await this.foldersService.getById(folderID);
        if (foundFolder) {
            const channelsInCategory = await this.channelModel.find({ ['folders.name']: foundFolder.category }, { url: 1 }).exec();
            const channelsArray = channelsInCategory.map((channel) => [channel.url]);
            const bulked = this.sendQueue(channelsArray, foundFolder.category, { remake: true });
            Logger.log(channelsInCategory, 'Channels found | ChannelsService');
            Logger.log(channelsArray, 'Array of channels | ChannelsService');
            return bulked;
        } else throw 'Folder not found';
    }

    async export(folder: string, blacklist: string, @Res() res: Response) {
        if (!folder) return "No folder specified";

        const allRaw = await this.getAll(folder, blacklist);
        // const all = allRaw.map((channel) => ({ ...channel,  folders: channel.folders.map(folder => ([folder.name, folder.blocked, folder.note])).toString() }));

        var fields = ['title', 'url', 'email', 'emailExists', 'language', 'country', 'viewCount', 'videoCount', 'subscriberCount', 'lastVideoPublishedAt', 'publishedAt', 'globalNote']; // TBD: add 'folders'

        const date = new Date();
        const filename = `export${folder.replace(/\//g, '-')}-${(new Date().toJSON().slice(0, 10))}.csv`;

        try {
            const csv = new Parser({ fields }).parse(allRaw);

            fs.writeFile(filename, 'sep=,\n' + csv, function (err) {
                if (err) throw err;
                Logger.log('File has been saved')
                setTimeout(() => {
                    fs.unlink(filename, function (err) { // delete this file after timeout
                        if (err) {
                            console.error(err);
                        }
                        Logger.log('File has been Deleted');
                    });
                }, 10000);
                res.download(filename);
            });
        } catch (err) {
            console.error(err);
        }

        Logger.log(`Download folder ${folder}`, 'ChannelsController');
    }
}

