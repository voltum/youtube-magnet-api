import { InjectQueue, OnGlobalQueueActive, OnGlobalQueueCompleted, OnQueueActive, OnQueueCompleted, OnQueueDrained, OnQueueError, OnQueueFailed, OnQueueProgress, Process, Processor } from "@nestjs/bull";
import { HttpService } from '@nestjs/axios'
import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Job, JobId, Queue } from "bull";
import { ChannelsService } from "./channels.service";
import { firstValueFrom } from "rxjs";
import { EventsGateway } from "./channels.gateway";
import { DetermineChannelID, GetMainInfo, YTCheckEmailCaptcha } from "src/utils/channels/channels";
import { Channel, ChannelDocument } from "./schemas/channel.schema";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { LogMessagesService } from "src/logMessages/logMessages.service";
const cld = require('cld')
 
@Processor('channels')
export class ChannelsConsumer {

    constructor(
        private readonly channelsService: ChannelsService,
        private readonly logMessagesService: LogMessagesService,
        @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>, 
        private readonly httpService: HttpService,
        private readonly eventsGateway: EventsGateway,
        @InjectQueue('channels') private channelsQueue: Queue){
    }
    
    @Process()
    async readOperationJob(job:Job<{id: string, url: string, email: string, folder: string, chunkStamp: number, shouldUpdate: string, skipMedia: boolean}>): Promise<Channel>{
        const { id, url, email, folder, chunkStamp, shouldUpdate: shouldUpdateString, skipMedia = false } = job.data;
        let progress = 0;
        
        let shouldUpdate: boolean = (shouldUpdateString === 'true');
        Logger.log(`Should update: ${shouldUpdate}`, 'Job');
        Logger.log(`URL: ${url.trim()}`, 'Job');

        // 1 step: determine channel ID
        const ID = await DetermineChannelID(url.trim(), folder);
        progress=15; await job.progress(progress);

        // 2 step: check if there is a channel in database already
        const foundOne = await this.channelsService.getById(ID);
        progress=35; await job.progress(progress);
        // If so, throw an exception directly to the client
        if (foundOne && !shouldUpdate) throw 'Channel already exists in database';
        // If found and should update, just update email
        else if(foundOne && shouldUpdate) {
            if(!email) throw 'No email specified for update';

            progress=50; await job.progress(progress);
            const updatedChannel = await this.channelModel.findByIdAndUpdate(ID, { email }, { new: true });
            return updatedChannel;
        }
        // 3 step: check if email catcha exists
        const emailExists = await YTCheckEmailCaptcha(ID);
        progress=45; await job.progress(progress);

        // 4 step: get main info about channel
        const mainInfo = await GetMainInfo(ID, { skipMedia });
        progress=80; await job.progress(progress);

        // 5 step: detect channel language
        let language = null;
        try{
            const probableLanguages = mainInfo.description ? await cld.detect(mainInfo.description) : null;
            language = probableLanguages?.languages[0].name ? probableLanguages?.languages[0].name : '';
        } catch {
            // Ignore
        }
        progress=90; await job.progress(progress);

        const result = await this.channelsService.save(new this.channelModel({ _id: ID, emailExists, folder, chunkStamp, language, ...mainInfo }));
        progress=100; await job.progress(progress);

        this.eventsGateway.server.emit('events:progress', `Channel '${mainInfo.title}' analysis is done`);
        Logger.log(`Job ${id} is done!`, 'QueueProcessor');

        return result;
    }

    @OnQueueActive()
    async onActive(job: Job){
        const remainedCount = await this.channelsQueue.getWaitingCount();
        this.eventsGateway.server.emit('events:active', { job, remainedCount });
        
        Logger.log(`Processing job ${job.data.id}...`, 'QueueProcessor');
    }

    @OnQueueProgress()
    async onProgress(job: Job, progress: number){
        const remainedCount = await this.channelsQueue.getWaitingCount();
        this.eventsGateway.server.emit('events:progress', { id: job.data.id, progress, remainedCount });
    }

    @OnQueueCompleted()
    async onQueueCompleted(jobId: number, result: any) {
        this.eventsGateway.server.emit('events:completed', { job: result });
        Logger.log('Job completed ' + jobId, 'ChannelsConsumer');
    }

    @OnQueueDrained()
    onDrained(){
        this.eventsGateway.server.emit('events:empty');
        Logger.log('Queue empty', 'ChannelsConsumer')
    }

    @OnQueueFailed()
    async onFail(job: Job, error: Error){
        this.eventsGateway.server.emit('events:error', `'${job.data.id}': ${error}`);
        this.eventsGateway.server.emit('events:inactive', { id: job.data.id });
        await this.logMessagesService.create({ url: job.data.id, text: String(error), folder: job.data.folder, status: String(error) }, job.data.chunkStamp);
        Logger.error(error, 'ChannelsConsumer');
    }
    
}