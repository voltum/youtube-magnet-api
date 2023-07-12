import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { FolderDto } from './dto/folder.dto';
import { Folder, FolderDocument } from './schemas/folder.schema';
import { google } from 'googleapis'
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ChannelsService } from 'src/channels/channels.service';

@Injectable()
export class FoldersService {

    constructor(
        @InjectModel(Folder.name) private folderModel: Model<FolderDocument>, 
        @InjectConnection() private readonly connection: Connection,
        @Inject(forwardRef(() => ChannelsService))
        private readonly channelsService: ChannelsService
        ){

    }

    async getAll(): Promise<Folder[]> {
        Logger.log('GET: list of folders', 'FoldersService')
        // return this.connection.db.listCollections({}, {nameOnly: true}).toArray();
        return this.folderModel.find().exec();
    }

    async getAllRoot(): Promise<Folder[]> {
        return this.folderModel.find({ parent: /^\/$/ }).exec();
    }

    async getById(id: string): Promise<Folder> {
        return this.folderModel.findById(id);
    }

    async create(folder: FolderDto): Promise<Folder> {
        const existingFolder = await this.folderModel.findOne({ category: folder.category }).exec();
        if(!existingFolder){
            const newFolder = new this.folderModel(folder);
            return newFolder.save();
        }
    }

    async remove(id: string): Promise<Folder> {
        const folder = await this.getById(id);
        const allFromFolder = await this.channelsService.getAll(folder.category);
        const deletedMany = await this.channelsService.removeMany(allFromFolder.map(channel => channel._id), folder.category);
        return this.folderModel.findByIdAndRemove(id);
    }

    async update(id: string, folder: FolderDto): Promise<Folder> {
        Logger.log('Folder info sent to database', 'FoldersService')
        return this.folderModel.findByIdAndUpdate(id, folder, { new: true }) // upsert: true
    }

}
