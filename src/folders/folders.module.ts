import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FoldersController } from "./folders.controller";
import { FoldersService } from "./folders.service";
import { Folder, FolderSchema } from "./schemas/folder.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            {name: Folder.name, schema: FolderSchema}
        ]),
    ],
    providers: [FoldersService],
    controllers: [FoldersController]
})
export class FoldersModule {
    
}
