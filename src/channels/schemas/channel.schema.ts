import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ChannelDocument = Channel & Document

@Schema({ timestamps: true })
export class Channel {
    @Prop() _id: String
    @Prop() folder: string
    // @Prop() status: string
    @Prop() title: String
    @Prop() url: String
    @Prop() description: String
    @Prop() email: String
    @Prop() country: String
    @Prop() language: String // Language detected
    @Prop() defaultLanguage: String // From youtube
    @Prop() subscriberCount: Number
    @Prop() socialLinks: String
    @Prop() viewCount: Number
    @Prop() videoCount: Number
    @Prop() lastVideoPublishedAt: Date
    @Prop() publishedAt: Date
    @Prop() chunkStamp: Number
    @Prop() createdAt: Date
    @Prop() updatedAt: Date
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);