import { Module } from '@nestjs/common';
import { ChannelsModule } from './channels/channels.module';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FoldersModule } from './folders/folders.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ChannelsModule,
    FoldersModule,
    MongooseModule.forRoot('mongodb+srv://admin_ytmagnet:-Aa4RrAxPST7gMC@youtubemagnet.jkh1h.mongodb.net/YoutubeMagnet?retryWrites=true&w=majority'),
    BullModule.forRoot({
      redis: {
        host: 'redisdb',
        port: 6379,
      }
    }),
    ConfigModule.forRoot({
      load: [configuration]
    }),
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
