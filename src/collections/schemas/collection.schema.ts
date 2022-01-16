import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type CollectionDocument = Collection & Document

@Schema()
export class Collection {
    @Prop()
    name: String
    @Prop()
    code: String
    @Prop()
    createdAt: Date
}

export const CollectionSchema = SchemaFactory.createForClass(Collection);