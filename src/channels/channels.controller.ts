import { Controller, Param, Get, Post, Body, Delete, Put, HttpCode, HttpStatus, UseInterceptors, UploadedFile, Query, Logger, Res, UseFilters } from '@nestjs/common';
import { Express, Response } from 'express'
import { FileInterceptor } from '@nestjs/platform-express';
import { ChannelsService } from './channels.service';
import { ChannelDto } from './dto/channel.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Channel } from './schemas/channel.schema';
import * as fs from 'fs';
import { CSVToArray } from 'src/utils/channels/functions';
import Bull from 'bull';
import { format } from '@fast-csv/format';
import { MongoExceptionFilter } from 'src/exceptions/mongo-exception.filter';

@Controller('channels')
export class ChannelsController {

    constructor(private readonly channelsService: ChannelsService){

    }

    @Get('stats')
    @UseFilters(MongoExceptionFilter)
    getStats(): Promise<Bull.JobCounts> {
        return this.channelsService.getStats();
    }

    @Get('export')
    @UseFilters(MongoExceptionFilter)
    export(@Query('folder') folder: string, @Res() res: Response) {
        return this.channelsService.export(folder?.toLowerCase(), res);
    }

    @Get()
    @UseFilters(MongoExceptionFilter)
    getAll(@Query('folder') folder: string): Promise<Channel[]> {
        Logger.log(`Folder: ${folder?.toLowerCase()}`, 'ChannelsController')
        return this.channelsService.getAll(folder?.toLowerCase())
    }

    @Get(':id')
    @UseFilters(MongoExceptionFilter)
    getOne(@Param('id') id: string): Promise<Channel> {
        return this.channelsService.getById(id);
    }

    @Post()
    @UseFilters(MongoExceptionFilter)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() channel: CreateChannelDto): Promise<Channel> {
        return this.channelsService.create(channel, Date.now());
    }

    @Delete(':id')
    @UseFilters(MongoExceptionFilter)
    remove(@Param('id') id: string): Promise<Channel>{
        return this.channelsService.remove(id);
    }

    @Put()
    @UseFilters(MongoExceptionFilter)
    update(@Query('id') id: string, @Body() channel: ChannelDto): Promise<Channel>{
        return this.channelsService.update(id, channel);
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @UseFilters(MongoExceptionFilter)
    uploadFile(@UploadedFile() file: Express.Multer.File, @Query('folder') folder: string): Promise<Bull.Job<any>[]> {
        if(!folder) return; // TBD
        Logger.log('Uploading', 'ChannelsController')

        const data = fs.readFile(file.path, 'utf-8', (error, data) => {
            if(error) return; // TBD
            Logger.log(JSON.stringify(CSVToArray(data.trim(), ';')));
            return this.channelsService.sendQueue(CSVToArray(data.trim(), ';'), folder.toLowerCase());

        });

    }
}