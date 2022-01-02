import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ChannelsModule } from './channels/channels.module';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChannelsMiddleware } from './channels/channels.middleware';

@Module({
  imports: [
    ChannelsModule,
    MongooseModule.forRoot('mongodb+srv://admin_ytmagnet:-Aa4RrAxPST7gMC@youtubemagnet.jkh1h.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      }
    }),
    BullModule.registerQueue({
      name: 'channels',
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ChannelsMiddleware)
      .forRoutes({ path: 'channels/:id', method: RequestMethod.PUT })
  }
}
