import { Controller, Param, Get, Post, Body, Delete, Put, HttpCode, HttpStatus, UseInterceptors, UploadedFile, Query, Logger, Res } from '@nestjs/common';
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

@Controller('channels')
export class ChannelsController {

    constructor(private readonly channelsService: ChannelsService){

    }

    @Get('stats')
    getStats(): Promise<Bull.JobCounts> {
        return this.channelsService.getStats();
    }

    @Get('export')
    export(@Query('folder') folder: string, @Res() res: Response) {
        return this.channelsService.export(folder?.toLowerCase(), res);
    }

    @Get()
    getAll(@Query('folder') folder: string): Promise<Channel[]> {
        Logger.log(`Folder: ${folder?.toLowerCase()}`, 'ChannelsController')
        return this.channelsService.getAll(folder?.toLowerCase())
    }

    @Get(':id')
    getOne(@Param('id') id: string): Promise<Channel> {
        return this.channelsService.getById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() channel: CreateChannelDto): Promise<Channel> {
        return this.channelsService.create(channel);
    }

    @Delete(':id')
    remove(@Param('id') id: string): Promise<Channel>{
        return this.channelsService.remove(id);
    }

    @Put()
    update(@Body() channel: ChannelDto, @Query('folder') folder: string): Promise<Channel>{
        channel.folder = folder?.toLowerCase();
        return this.channelsService.update(channel.id, channel);
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    uploadFile(@UploadedFile() file: Express.Multer.File, @Query('folder') folder: string): Promise<Bull.Job<any>[]> {
        if(!folder) return; // TBD
        Logger.log('Uploading', 'ChannelsController')

        const data = fs.readFile(file.path, 'utf-8', (error, data) => {
            if(error) return; // TBD
            Logger.log(JSON.stringify(CSVToArray(data.trim(), ';')));
            return this.channelsService.sendQueue(CSVToArray(data.trim(), ';'), folder);

        });

    }
}