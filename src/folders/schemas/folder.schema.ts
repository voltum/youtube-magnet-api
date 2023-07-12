import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type FolderDocument = Folder & Document

@Schema()
export class Folder {
    // @Prop()
    // _id: String
    @Prop({ required: true })
    name: string
    @Prop()
    code: string
    @Prop()
    parent: string
    @Prop()
    category: string
    @Prop()
    createdAt: Date
}

export const FolderSchema = SchemaFactory.createForClass(Folder);