import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ChannelDocument = Channel & Document

@Schema()
export class Channel {
    @Prop()
    _id: String
    @Prop()
    title: String
    @Prop()
    url: String
    @Prop()
    description: String
    @Prop()
    email: String
    @Prop()
    country: String
    @Prop()
    language: String
    @Prop()
    publishedAt: Date
    @Prop()
    subscriberCount: Number
    @Prop()
    socialLinks: String
    @Prop()
    viewCount: Number
    @Prop()
    videoCount: Number
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);