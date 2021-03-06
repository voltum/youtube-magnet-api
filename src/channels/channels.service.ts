import { HttpException, HttpStatus, Injectable, Res } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, FilterQuery, Model } from 'mongoose';
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
const LanguageDetect = require('languagedetect');
const cld = require('cld')

@Injectable()
export class ChannelsService {

    constructor(@InjectModel(Channel.name) private channelModel: Model<ChannelDocument>, @InjectQueue('channels') private channelsQueue: Queue){

    }

    async getAll(folder: string): Promise<Channel[]> {
        if(folder) return this.channelModel.find({ folder }).sort({ lastVideoPublishedAt: 'desc' }).exec();
        else return this.channelModel.find().sort({ lastVideoPublishedAt: 'desc' }).exec();
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

    async remove(id: string): Promise<Channel> {
        return this.channelModel.findByIdAndRemove(id);
    }

    async removeMany(ids?: String[]) {
        Logger.log('Delete multiple channels', 'ChannelsService');
        return this.channelModel.deleteMany({ _id: ids });
    }

    async update(id: string, channel: ChannelDto): Promise<Channel> {
        Logger.log('Channel info sent to database', 'ChannelsService')
        return this.channelModel.findByIdAndUpdate(id, channel, { new: true }) // upsert: true/false
    }

    async sendQueue(data: Array<string[]>, folder: string, shouldUpdate: boolean): Promise<Bull.Job<any>[]>{
        Logger.log(`Sending a job...`, 'ChannelsService')
        Logger.log(data, 'ChannelsService');
        const chunkStamp = Date.now();
        return this.channelsQueue.addBulk(data.map(row => ({data: { id: row[0], url: row[0], email: row[1], folder, chunkStamp, shouldUpdate }})));
    }

    async export(folder: string, @Res() res: Response) {
        if(!folder) return "No folder specified";

        const all = await this.getAll(folder);
  
        var fields = ['title', 'url', 'email', 'emailExists', 'language', 'viewCount', 'videoCount', 'subscriberCount', 'lastVideoPublishedAt', 'publishedAt'];

        const date = new Date();
        const filename = `export-${folder}-${(new Date().toJSON().slice(0,10))}.csv`;
        
        try {
            const csv = new Parser({ fields }).parse(all);
            
            fs.writeFile(filename, 'sep=,\n'+csv, function(err) {
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

