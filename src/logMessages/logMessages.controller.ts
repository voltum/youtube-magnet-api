import { Controller, Param, Get, Post, Body, Delete, Put, HttpCode, HttpStatus, UseInterceptors, UploadedFile, Query, Logger, Res, UseFilters } from '@nestjs/common';
import { Express, Response } from 'express'
import { FileInterceptor } from '@nestjs/platform-express';
import { LogMessagesService } from './logMessages.service';
import { LogMessageDto } from './dto/logMessage.dto';
import { LogMessage } from './schemas/logMessage.schema';
import { MongoExceptionFilter } from 'src/exceptions/mongo-exception.filter';

@Controller('log')
export class LogMessagesController {

    constructor(private readonly logMessagesService: LogMessagesService){

    }

    @Get()
    @UseFilters(MongoExceptionFilter)
    getAll(@Query('folder') folder: string): Promise<LogMessage[]> {
        Logger.log(`Folder: ${folder?.toLowerCase()}`, 'ChannelsController')
        return this.logMessagesService.getAll(folder?.toLowerCase())
    }

    @Post()
    @UseFilters(MongoExceptionFilter)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() channel: LogMessageDto): Promise<LogMessage> {
        return this.logMessagesService.create(channel, Date.now());
    }

    @Delete(':id')
    @UseFilters(MongoExceptionFilter)
    remove(@Param('id') id: string): Promise<LogMessage>{
        return this.logMessagesService.remove(id);
    }
}