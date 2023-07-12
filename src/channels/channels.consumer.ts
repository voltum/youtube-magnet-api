import { InjectQueue, OnGlobalQueueActive, OnGlobalQueueCompleted, OnQueueActive, OnQueueCompleted, OnQueueDrained, OnQueueError, OnQueueFailed, OnQueueProgress, OnQueueStalled, Process, Processor } from "@nestjs/bull";
import { HttpService } from '@nestjs/axios'
import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Job, JobId, Queue } from "bull";
import { ChannelsService } from "./channels.service";
import { firstValueFrom } from "rxjs";
import { EventsGateway } from "./channels.gateway";
import { DetermineChannelID, GetMainInfo, YTCheckEmailCaptcha } from "src/utils/channels/channels";
import { Channel, ChannelDocument, FolderType } from "./schemas/channel.schema";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { LogMessagesService } from "src/logMessages/logMessages.service";
import { getRootFolderName } from "src/utils/channels/functions";
const cld = require('cld')

interface ChannelJob{
    id: string
    url: string
    folder: string
    chunkStamp: number
    skipMedia: boolean
    options?: {
        onlyEmail?: {
            email: string
        }
        shouldBlock?: boolean
        remake?: boolean
    }
}
 
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
    async readOperationJob(job:Job<ChannelJob>): Promise<Channel>{
        const { id, url, folder, chunkStamp, skipMedia = false, options = {} } = job.data;
        const rootOfCurrent = getRootFolderName(folder);
        
        if(folder === '/') throw 'Channel cannot be inserted in root folder';

        let progress = 0;

        this.channelsQueue.client.on('error', function(err){ 
            Logger.log('Redis connection lost');
        });
        
        Logger.log(this.channelsQueue.client.status, 'Processor Queue Status');

        if(this.channelsQueue.client.status !== 'ready') this.channelsQueue.client.connect();
        
        Logger.log(`Should update: ${options.onlyEmail?.email ? true : false}`, 'Job');
        Logger.log(`URL: ${url.trim()}`, 'Job');

        // 1 step: determine channel ID
        const ID = await DetermineChannelID(url.trim(), folder);
        progress=15; await job.progress(progress);

        // 2 step: check if there is a channel in database already
        const foundOne = await this.channelsService.getById(ID);
        
        const isSameRootFolder = foundOne && foundOne.folders.some((foundFolder) => (rootOfCurrent === getRootFolderName(foundFolder.name)));
        const isBlocked = foundOne && foundOne.folders.some((folder) => (rootOfCurrent === getRootFolderName(folder.name) && folder.blocked === true)); // TBD

        // Throw exception immediately if it is blocked
        if(isBlocked) throw `Channel is blocked in current category ${rootOfCurrent}`;

        const isSameFolder = foundOne ? foundOne.folders.some((foundFolder: FolderType) => (foundFolder.name === folder)) : false;
        progress=35; await job.progress(progress);

        // Exceptional case for updating email or blocking
        if(foundOne && options.onlyEmail?.email){
            progress=50; await job.progress(progress);
            const updatedChannel = await this.channelModel.findByIdAndUpdate(ID, 
                { email: options.onlyEmail.email || foundOne.email }, { new: true });
            return updatedChannel;
        }
        else if(foundOne && options.shouldBlock){
            progress=70; await job.progress(progress);
            const updatedChannel = await this.channelModel.findByIdAndUpdate(ID,
                { "folders.$[element].blocked": true }, { arrayFilters: [{ "element.name": folder }] });
            return updatedChannel;
        }

        // If there is the same channel in the same root category
        if(isSameRootFolder){
            if(!options.remake){
                throw `Channel already exists in the same category ${rootOfCurrent}`;
            }
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

        let result;

        if(foundOne){
            if(options.remake){
                result = await this.channelsService.update(ID, { ...mainInfo, emailExists, language })
                Logger.log('Updating...');
            } else {
                // Found but in different category
                Logger.log(`Updating and appending new folder: ${folder}`);
                result = await this.channelsService.update(ID, { ...mainInfo, emailExists, language, $push: { folders: { name: folder, chunkStamp } } });
            }
        } else {
            Logger.log('Creating new channel in database...');
            result = await this.channelsService.save(new this.channelModel({ _id: ID, emailExists, folders: [ { name: folder, chunkStamp } ], language, ...mainInfo }));
        }
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
        Logger.log('Job completed ' + JSON.stringify(jobId), 'ChannelsConsumer');
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
        await this.logMessagesService.create({ url: job.data.id, text: String(error), folder: job.data.folder, status: String(error) });
        Logger.error(error, 'ChannelsConsumer');
    }

    @OnQueueStalled()
    async onStalled(job: Job){
        this.eventsGateway.server.emit('events:error', `Process ${job.data.id} stalled!`);
        Logger.error(`Process ${job.data.id} stalled!`);
    }
    
}