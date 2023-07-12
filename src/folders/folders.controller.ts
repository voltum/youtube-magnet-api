import { Body, Controller, Delete, forwardRef, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Query, UseFilters } from "@nestjs/common";
import { AnyArray } from "mongoose";
import { ChannelsService } from "src/channels/channels.service";
import { MongoExceptionFilter } from "src/exceptions/mongo-exception.filter";
import { FolderDto } from "./dto/folder.dto";
import { FoldersService } from "./folders.service";
import { Folder, Folder as GEOFolder } from "./schemas/folder.schema";

@Controller('folders')
export class FoldersController {

    constructor(
        private readonly foldersService: FoldersService,
        @Inject(forwardRef(() => ChannelsService))
        private readonly channelsService: ChannelsService
        ){

    }

    @Get()
    @UseFilters(MongoExceptionFilter)
    getAll(@Query('root') isRoot: boolean): Promise<Folder[]> {
        if(isRoot) return this.foldersService.getAllRoot();
        else return this.foldersService.getAll();
    }

    @Get(':id')
    @UseFilters(MongoExceptionFilter)
    getOne(@Param('id') id: string): Promise<Folder> {
        return this.foldersService.getById(id);
    }

    @Post()
    @UseFilters(MongoExceptionFilter)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() folder: FolderDto): Promise<Folder> {
        // folder._id = folder.name.toLowerCase();
        return this.foldersService.create(folder);
    }

    @Post('remake/:id')
    @UseFilters(MongoExceptionFilter)
    remakeFolder(@Param('id') folderID: string){
        return this.channelsService.remakeFolder(folderID);
    }

    @Delete(':id')
    @UseFilters(MongoExceptionFilter)
    remove(@Param('id') id: string): Promise<Folder>{
        return this.foldersService.remove(id);
    }

    @Put()
    @UseFilters(MongoExceptionFilter)
    update(@Body() folder: FolderDto): Promise<Folder>{
        return this.foldersService.update(folder._id, folder);
    }
}