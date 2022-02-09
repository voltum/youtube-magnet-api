import { HttpException, HttpStatus, Injectable, Res } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, FilterQuery, Model } from 'mongoose';
import { Response } from 'express';
import { LogMessage, LogMessageDocument } from './schemas/logMessage.schema';
import { LogMessageDto } from './dto/logMessage.dto';

@Injectable()
export class LogMessagesService {

    constructor(@InjectModel(LogMessage.name) private logMessageModel: Model<LogMessageDocument>){

    }

    async getAll(folder: string): Promise<LogMessage[]> {
        if(folder) return this.logMessageModel.find({ folder }).sort({ createdAt: 'desc' }).limit(200).exec();
        else return this.logMessageModel.find().sort({ createdAt: 'desc' }).limit(200).exec();
    }

    async create(logMessage: LogMessageDto, chunkStampParam?: number): Promise<LogMessage> {
        Logger.log("Post single request", 'ChannelsService');
        return this.save(new this.logMessageModel({ ...logMessage, chunkStamp: chunkStampParam || Date.now() }));
    }

    async save(logMessage: LogMessageDocument): Promise<LogMessage> {
        return logMessage.save();
    }

    async remove(id: string): Promise<LogMessage> {
        return this.logMessageModel.findByIdAndRemove(id);
    }

    async removeMany(ids?: String[]) {
        Logger.log('Delete multiple channels', 'ChannelsService');
        return this.logMessageModel.deleteMany({ _id: ids });
    }
}

