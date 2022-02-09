import { BullModule } from '@nestjs/bull';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { LogMessage, LogMessageSchema } from './schemas/logMessage.schema';
import { LogMessagesService } from './logMessages.service';
import { LogMessagesController } from './logMessages.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            {name: LogMessage.name, schema: LogMessageSchema}
        ]),
        HttpModule
    ],
    providers: [LogMessagesService],
    controllers: [LogMessagesController],
    exports: [LogMessagesService]
})
export class LogMessagesModule {
    
}
