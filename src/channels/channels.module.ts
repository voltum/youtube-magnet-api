import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { Channel, ChannelSchema } from './schemas/channel.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            {name: Channel.name, schema: ChannelSchema}
        ])
    ],
    providers: [ChannelsService],
    controllers: [ChannelsController]
})
export class ChannelsModule {}
