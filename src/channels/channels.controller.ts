import { Controller, Param, Get, Post, Body, Delete, Put, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Express } from 'express'
import { FileInterceptor } from '@nestjs/platform-express';
import { ChannelsService } from './channels.service';
import { ChannelDto } from './dto/channel.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Channel } from './schemas/channel.schema';

@Controller('channels')
export class ChannelsController {

    constructor(private readonly channelsService: ChannelsService){

    }

    @Get()
    getAll(): Promise<Channel[]> {
        return this.channelsService.getAll()
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
    update(@Body() channel: ChannelDto, @Param('id') id: string): Promise<Channel>{
        return this.channelsService.update(channel.id, channel);
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    uploadFile(@UploadedFile() file: Express.Multer.File) {

        return this.channelsService.sendQueue(file.buffer);
    }
}