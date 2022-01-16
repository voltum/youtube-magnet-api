import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { CollectionDto } from './dto/collection.dto';
import { Collection, CollectionDocument } from './schemas/collection.schema';
import { google } from 'googleapis'
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class CollectionsService {

    constructor(@InjectModel(Collection.name) private collectionModel: Model<CollectionDocument>, @InjectConnection() private readonly connection: Connection){

    }

    async getAll(): Promise<any> {
        Logger.log('GET: list of collections', 'CollectionsService')
        return this.connection.db.listCollections({}, {nameOnly: true}).toArray();
        // return this.connection.db.listCollections().toArray((err, names) => {
        //     if(err) Logger.log('Error while getting list of collections', 'CollectionsService');
        //     else {
        //         Logger.log(names, 'CollectionsService')
        //         names.map((name) => {
        //             return name.name;
        //         });
        //     }
        // });
    }
}
