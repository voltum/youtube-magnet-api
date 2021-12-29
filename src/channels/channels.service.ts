import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Channel, ChannelDocument } from './schemas/channel.schema';
import { google } from 'googleapis'

@Injectable()
export class ChannelsService {

    constructor(@InjectModel(Channel.name) private channelModel: Model<ChannelDocument>){

    }

    async getAll(): Promise<Channel[]> {
        return this.channelModel.find().exec()
    }

    async getById(id: string): Promise<Channel> {
        var service = google.youtube('v3');
        service.channels.list({
            part: ['snippet','contentDetails','statistics'],
            id: ['UCdKuE7a2QZeHPhDntXVZ91w'],
            key: 'AIzaSyBquyODQDQl7mf82awWwWZzAUqYBkTRMgQ',
        }, function(err, response) {
            if (err) {
                Logger.log('The API returned an error: ' + err);
                return;
            }
            var channels = response.data.items;
            if (channels.length == 0) {
                Logger.log('No channel found.');
            } else {
                Logger.log(`https://youtube.com/channel/${channels[0].id}`);
                Logger.log(channels[0].snippet.title);
                Logger.log(channels[0].snippet.description);
                Logger.log(channels[0].snippet.country);
                Logger.log(channels[0].snippet.defaultLanguage);
                Logger.log(`Published at ${channels[0].snippet.publishedAt}`);
                Logger.log(channels[0].statistics.subscriberCount + " subs");
                Logger.log(channels[0].statistics.viewCount + " views");
                Logger.log(channels[0].statistics.videoCount + " videos");
            }
        });
        return this.channelModel.findById(id);
    }

    async create(channel: CreateChannelDto): Promise<Channel> {
        const newChannel = new this.channelModel(channel);
        return newChannel.save();
    }

    async remove(id: string): Promise<Channel> {
        return this.channelModel.findByIdAndRemove(id);
    }

    async update(id: string, channel: UpdateChannelDto): Promise<Channel> {
        return this.channelModel.findByIdAndUpdate(id, channel, { new: true })
    }
}
