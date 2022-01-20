import { Injectable, Res } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
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

@Injectable()
export class ChannelsService {

    constructor(@InjectModel(Channel.name) private channelModel: Model<ChannelDocument>, @InjectQueue('channels') private channelsQueue: Queue, @InjectConnection() private readonly connection: Connection){

    }

    async getAll(folder: string): Promise<Channel[]> {
        if(folder) return this.channelModel.find({ folder }).exec();
        else return this.channelModel.find().sort({ lastVideoPublishedAt: 'desc' }).exec();
    }

    async getById(id: string): Promise<Channel> {
        return this.channelModel.findById(id);
    }

    async getStats(): Promise<Bull.JobCounts> {
        Logger.log("Get jobs stat", "ChannelsService");
        return this.channelsQueue.getJobCounts();
    }

    async create(channel: CreateChannelDto): Promise<Channel> {
        const newChannel = new this.channelModel(channel);
        return newChannel.save();
    }

    async remove(id: string): Promise<Channel> {
        return this.channelModel.findByIdAndRemove(id);
    }

    async update(id: string, channel: ChannelDto): Promise<Channel> {
        Logger.log('Channel info sent to database', 'ChannelsService')
        return this.channelModel.findByIdAndUpdate(id, channel, { new: true, upsert: true })
    }

    async sendQueue(data: Array<string[]>, folder: string): Promise<Bull.Job<any>[]>{
        Logger.log(`Sending a job...`, 'ChannelsService')
        Logger.log(data, 'ChannelsService');
        return this.channelsQueue.addBulk(data.map(row => ({data: { id: row[0], url: row[0], folder }})));
    }

    async export(folder: string, @Res() res: Response) {
        if(!folder) return "No folder specified";

        const all = await this.getAll(folder);
  
        var fields = ['title', 'url', 'email', 'language', 'viewCount', 'videoCount', 'subscriberCount', 'lastVideoPublishedAt', 'publishedAt'];
        var fieldNames = ['URL', 'Title', 'View Count'];

        const date = new Date();
        const filename = `export-${folder}-${(new Date().toJSON().slice(0,10))}.csv`;    

        // res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        // res.writeHead(200, { 'Content-Type': 'text/csv' });
        // res.flushHeaders();
        
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

