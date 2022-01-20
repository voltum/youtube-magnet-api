import { Process, Processor } from "@nestjs/bull";
import { HttpService } from '@nestjs/axios'
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { ChannelsService } from "./channels.service";
import { firstValueFrom } from "rxjs";
 
@Processor('channels')
export class ChannelsConsumer {

    constructor(private readonly channelsService: ChannelsService, private readonly httpService: HttpService){
    }
    
    @Process()
    async readOperationJob(job:Job<{id: string, url: string, folder: string}>){
        const { id, url, folder } = job.data;
        let progress = 0;
        
        Logger.log(`Processing job ${job.data.id}...`, 'QueueProcessor');

        // await new Promise((res, rej) => setTimeout(() => {
        //     res(null);
        // }, 800));

        try{
            const res = await firstValueFrom(this.httpService.put('http://localhost:3001/channels', null, { params: { url, folder } }));
            await job.progress(progress);
            Logger.log(`Job ${job.data.id} is done!`, 'QueueProcessor');
        } catch (err) {
            Logger.error(`Queue error: ${err}`, 'QueueProcessor');
        } finally {
            return {};
        }
    }
}