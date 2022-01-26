import { InjectQueue, OnGlobalQueueActive, OnGlobalQueueCompleted, OnQueueActive, OnQueueCompleted, OnQueueDrained, OnQueueError, OnQueueFailed, OnQueueProgress, Process, Processor } from "@nestjs/bull";
import { HttpService } from '@nestjs/axios'
import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Job, JobId, Queue } from "bull";
import { ChannelsService } from "./channels.service";
import { firstValueFrom } from "rxjs";
import { EventsGateway } from "./channels.gateway";
import { DetermineChannelID, GetMainInfo } from "src/utils/channels/channels";
import { Channel, ChannelDocument } from "./schemas/channel.schema";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
const cld = require('cld')
 
@Processor('channels')
export class ChannelsConsumer {

    constructor(private readonly channelsService: ChannelsService, @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>, private readonly httpService: HttpService, private readonly eventsGateway: EventsGateway, @InjectQueue('channels') private channelsQueue: Queue){
    }
    
    @Process()
    async readOperationJob(job:Job<{id: string, url: string, folder: string, chunkStamp: number}>): Promise<Channel>{
        const { id, url, folder, chunkStamp } = job.data;
        let progress = 0;
        // const res = await firstValueFrom(this.httpService.put('http://localhost:3001/channels', null, { params: { url, folder, chunkStamp } }));

        // 1 step: determine channel ID
        const ID = await DetermineChannelID(url, folder);
        progress=15; await job.progress(progress);

        // 2 step: check if there is a channel in database already
        const foundOne = await this.channelsService.getById(ID);
        progress=35; await job.progress(progress);
        // If so, throw an exception directly to the client
        if (foundOne) throw 'Channel already exists in database';

        // 3 step: get main info about channel
        const mainInfo = await GetMainInfo(ID);
        progress=80; await job.progress(progress);

        // 4 step: detect channel language
        let language = null;
        try{
            const probableLanguages = mainInfo.description ? await cld.detect(mainInfo.description) : null;
            language = probableLanguages?.languages[0].name ? probableLanguages?.languages[0].name : '';
        } catch {
            // Ignore
        }
        progress=90; await job.progress(progress);

        const result = await this.channelsService.save(new this.channelModel({ _id: ID, folder, chunkStamp, language, ...mainInfo }));
        progress=100; await job.progress(progress);

        this.eventsGateway.server.emit('events:progress', `Channel '${mainInfo.title}' analysis is done`);
        Logger.log(`Job ${id} is done!`, 'QueueProcessor');

        return result;
    }

    @OnQueueActive()
    async onActive(job: Job){
        const remain = await this.channelsQueue.getActiveCount();
        this.eventsGateway.server.emit('events:active', { id: job.data.id, remain });
        
        Logger.log(`Processing job ${job.data.id}...`, 'QueueProcessor');
    }

    @OnQueueProgress()
    onProgress(job: Job, progress: number){
        this.eventsGateway.server.emit('events:progress', { id: job.data.id, progress });
    }

    @OnQueueCompleted()
    async onQueueCompleted(jobId: number, result: any) {
        const job = await this.channelsQueue.getJob(jobId);
        this.eventsGateway.server.emit('events:completed', result);
        Logger.log('Job completed ' + jobId, 'ChannelsConsumer');
    }

    @OnQueueDrained()
    onDrained(){
        this.eventsGateway.server.emit('events:empty');
        Logger.log('Queue empty', 'ChannelsConsumer')
    }

    @OnQueueFailed()
    onFail(job: Job, error: Error){
        this.eventsGateway.server.emit('events:error', `'${job.data.id}': ${error}`);
        this.eventsGateway.server.emit('events:inactive', { id: job.data.id });
        Logger.error(error, 'ChannelsConsumer');
    }
    
}