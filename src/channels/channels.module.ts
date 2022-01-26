import { BullModule } from '@nestjs/bull';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ChannelLastVideo } from './channel-last-video.middleware';
import { ChannelTypeDeterminant } from './channels-type-determinant.middleware';
import { ChannelsConsumer } from './channels.consumer';
import { ChannelsController } from './channels.controller';
import { ChannelsMiddleware } from './channels.middleware';
import { ChannelsService } from './channels.service';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import { EventsGateway } from './channels.gateway';

@Module({
    imports: [
        MongooseModule.forFeature([
            {name: Channel.name, schema: ChannelSchema}
        ]),
        BullModule.registerQueue({
            name: 'channels',
            redis: {
                host: 'localhost',
                port: 6379
            }
        }),
        MulterModule.register({
            dest: './upload',
        }),
        HttpModule
    ],
    providers: [ChannelsService, ChannelsConsumer, EventsGateway],
    controllers: [ChannelsController],
    exports: [ChannelsService]
})
export class ChannelsModule {
    // configure(consumer: MiddlewareConsumer) {
    //   consumer
    //     .apply(ChannelTypeDeterminant, ChannelsMiddleware, ChannelLastVideo)
    //     .forRoutes({ path: 'channels', method: RequestMethod.PUT })
    // }
}
