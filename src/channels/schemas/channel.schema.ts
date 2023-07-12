import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ChannelDocument = Channel & Document

export type FolderType = {
    name: string;
    chunkStamp: number,
    note?: string,
    blocked: boolean
}

@Schema({ timestamps: true })
export class Channel {
    // UNIVERSAL VALUES
    @Prop() _id: string
    @Prop() blocked: boolean
    @Prop() title: string
    @Prop() url: string
    @Prop() description: string
    @Prop() email: string
    @Prop() emailExists: boolean
    @Prop() country: string
    @Prop() language: string // Language detected
    @Prop() defaultLanguage: string // From youtube
    @Prop() subscriberCount: number
    @Prop() socialLinks: string
    @Prop() viewCount: number
    @Prop() videoCount: number
    @Prop() lastVideoPublishedAt: Date
    @Prop() publishedAt: Date
    @Prop() createdAt: Date
    @Prop() updatedAt: Date
    @Prop() globalNote: string
    // CONDITIONAL VALUES
    @Prop() folders: FolderType[] // Nested
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);