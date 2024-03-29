import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ChannelsModule } from "src/channels/channels.module";
import { FoldersController } from "./folders.controller";
import { FoldersService } from "./folders.service";
import { Folder, FolderSchema } from "./schemas/folder.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            {name: Folder.name, schema: FolderSchema}
        ]),
        forwardRef(() => ChannelsModule)
    ],
    providers: [FoldersService],
    controllers: [FoldersController],
    exports: [FoldersService]
})
export class FoldersModule {
    
}
