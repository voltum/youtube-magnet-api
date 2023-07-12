import { BullModule } from '@nestjs/bull';
import { forwardRef, MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
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
import { LogMessagesService } from 'src/logMessages/logMessages.service';
import { LogMessagesModule } from 'src/logMessages/logMessages.module';
import configuration from 'src/config/configuration';
import { FoldersService } from 'src/folders/folders.service';
import { FoldersModule } from 'src/folders/folders.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            {name: Channel.name, schema: ChannelSchema}
        ]),
        BullModule.registerQueue({
            name: 'channels',
            redis: {
                host: configuration().getRedisHost(),
                port: configuration().getRedisPort(),
            },
            defaultJobOptions: {
                attempts: 2,
                timeout: 100000,
                removeOnComplete: true,
                removeOnFail: true
            }
        }),
        MulterModule.register({
            dest: './upload',
        }),
        forwardRef(() => FoldersModule),
        HttpModule,
        LogMessagesModule
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
