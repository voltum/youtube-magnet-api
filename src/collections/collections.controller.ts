import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from "@nestjs/common";
import { AnyArray } from "mongoose";
import { CollectionsService } from "./collections.service";
import { Collection as GEOCollection } from "./schemas/collection.schema";

@Controller('collections')
export class CollectionsController {

    constructor(private readonly collectionsService: CollectionsService){

    }

    @Get()
    getAll(): Promise<any> {
        return this.collectionsService.getAll();
    }
}