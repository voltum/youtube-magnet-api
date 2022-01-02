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
        return this.channelModel.findByIdAndUpdate(id, channel, { new: true, upsert: true })
    }
}
