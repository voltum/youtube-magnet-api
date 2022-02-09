import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type LogMessageDocument = LogMessage & Document

@Schema({ timestamps: true })
export class LogMessage {
    @Prop() url: String
    @Prop() text: String
    @Prop() folder: string
    @Prop() status: string
    @Prop() chunkStamp: Number
    @Prop() createdAt: Date
    @Prop() updatedAt: Date
}

export const LogMessageSchema = SchemaFactory.createForClass(LogMessage);