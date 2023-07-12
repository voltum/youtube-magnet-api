import { Controller, Param, Get, Post, Body, Delete, Put, HttpCode, HttpStatus, UseInterceptors, UploadedFile, Query, Logger, Res, UseFilters } from '@nestjs/common';
import { Express, Response } from 'express'
import { FileInterceptor } from '@nestjs/platform-express';
import { ChannelsService } from './channels.service';
import { ChannelDto, ChannelUpdateQuery } from './dto/channel.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Channel } from './schemas/channel.schema';
import * as fs from 'fs';
import { CSVToArray } from 'src/utils/channels/functions';
import Bull from 'bull';
import { format } from '@fast-csv/format';
import { MongoExceptionFilter } from 'src/exceptions/mongo-exception.filter';
import configuration from 'src/config/configuration';
const puppeteer = require('puppeteer');

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
    export(@Query('folder') folder: string, @Query('blacklist') blacklist: string, @Res() res: Response) {
        return this.channelsService.export(folder?.toLowerCase(), blacklist, res);
    }

    @Get()
    @UseFilters(MongoExceptionFilter)
    getAll(@Query('folder') folder: string, @Query('blacklist') blacklist: string, @Query('filter') filterOptions?: string): Promise<Channel[]> {
        Logger.log(`Folder: ${folder?.toLowerCase()}`, 'ChannelsController')
        return this.channelsService.getAll(folder?.toLowerCase(), blacklist, filterOptions)
    }

    @Get(':id')
    @UseFilters(MongoExceptionFilter)
    getOne(@Param('id') id: string): Promise<Channel> {
        return this.channelsService.getById(id);
    }

    @Post()
    @UseFilters(MongoExceptionFilter)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() channel: CreateChannelDto): Promise<Bull.Job<any>> {
        return this.channelsService.create(channel, Date.now());
    }

    @Delete(':id')
    @UseFilters(MongoExceptionFilter)
    remove(@Param('id') id: string, @Query('from') fromFolder: string): Promise<Channel> {
        return this.channelsService.remove(id, fromFolder);
    }

    @Put()
    @UseFilters(MongoExceptionFilter)
    update(@Query('id') id: string, @Body() channelUpdateQuery: ChannelUpdateQuery): Promise<Channel> {
        return this.channelsService.update(id, channelUpdateQuery.update, channelUpdateQuery.options);
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @UseFilters(MongoExceptionFilter)
    uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Query('folder') folder: string,
        @Query('shouldUpdate') shouldUpdate: boolean,
        @Query('shouldBlock') shouldBlock: string,
        @Query('delimeter') delimeter: string
    ): Promise<Bull.Job<any>[]> {
        if(!folder) return; // TBD
        Logger.log('Uploading', 'ChannelsController');

        fs.readFile(file.path, 'utf-8', (error, data) => {
            if(error) return; // TBD
            // Logger.log(JSON.stringify(CSVToArray(data.trim(), delimeter || ';')));
            Logger.log("Should block: " + shouldBlock + " " + typeof shouldBlock)
            return this.channelsService.sendQueue(CSVToArray(data.trim(), delimeter || ';'), folder.toLowerCase(), { onlyEmail: shouldUpdate, shouldBlock: shouldBlock === 'true' ? true : false });

        });

    }
}