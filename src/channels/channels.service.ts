import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChannelDto } from './dto/channel.dto';
import { Channel, ChannelDocument } from './schemas/channel.schema';
import { google } from 'googleapis'
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class ChannelsService {

    constructor(@InjectModel(Channel.name) private channelModel: Model<ChannelDocument>, @InjectQueue('channels') private channelsQueue: Queue){

    }

    async getAll(): Promise<Channel[]> {
        return this.channelModel.find().exec()
    }

    async getById(id: string): Promise<Channel> {
        return this.channelModel.findById(id);
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

    async sendQueue(data){
        Logger.log(`Sending a job...`, 'ChannelsService')
        const job = await this.channelsQueue.add(
            {
                id: 'UC111111111111111',               
                url: 'https://www.youtube.com/channel/UCEkg0hhWS_oxD24f_6C9Qbw',
            },
        );
        const job2 = await this.channelsQueue.add(
            {
                id: 'UC222222222222222',
                url: 'https://www.youtube.com/channel/UCgv0PksMs_v',
            },
        );
        const job3 = await this.channelsQueue.add(
            {
                id: 'UC333333333333333',
                url: 'https://www.youtube.com/channel/UCXKUWDBPjhhF1pWBVGno94A',
            },
        );
        Logger.log(`Job ${job.name} is sent to the queue`, 'ChannelsService')
    }
}
