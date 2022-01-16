import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CollectionsController } from "./collections.controller";
import { CollectionsService } from "./collections.service";
import { Collection, CollectionSchema } from "./schemas/collection.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            {name: Collection.name, schema: CollectionSchema}
        ]),
    ],
    providers: [CollectionsService],
    controllers: [CollectionsController]
})
export class CollectionsModule {
    
}
