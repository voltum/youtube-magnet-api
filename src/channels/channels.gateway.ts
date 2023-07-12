import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, WsResponse } from "@nestjs/websockets";
import { Server } from "socket.io";
import { from, map, Observable } from "rxjs";
import { Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EventsGateway {
    constructor(
        @InjectQueue('channels')
        private channelsQueue: Queue
    ){

    }

@WebSocketServer()
server: Server;

// 
// @SubscribeMessage('events')
// findAll(@MessageBody() data: any): Observable<WsResponse<string>>{
//     return from(['Job is active', 'Job is processing 1...', 'Job is processing 2...', 'Job is done successfully!']).pipe(map(item => 
//         {
//             // Logger.log('Event emitted');
//             return { event: 'events', data: item };
//         }
//     ));
// }

@SubscribeMessage('queue:info')
async getQueueInfo(){
    Logger.log(`Queue management query: INFO`)
    const jobCounts = await this.channelsQueue.getJobCounts();
    const isPaused = await this.channelsQueue.isPaused(true);
    return { jobCounts, isPaused }
}
@SubscribeMessage('queue:resume')
async resumeQueue(){
    Logger.log(`Queue management query: RESUME`);
    return await this.channelsQueue.resume(true).then(() => {
        return { status: 200 };
    }).catch((error) => {
        return { status: 500, message: error };
    })
}
@SubscribeMessage('queue:pause')
async pauseQueue(){
    Logger.log(`Queue management query: PAUSE`)
    return await this.channelsQueue.pause(true).then(() => {
        return { status: 200 };
    }).catch((error) => {
        return { status: 500, message: error };
    })
}
@SubscribeMessage('queue:empty')
async emptyQueue(){
    Logger.log(`Queue management query: EMPTY`)
    return await this.channelsQueue.empty().then(() => {
        return { status: 200 };
    }).catch((error) => {
        return { status: 500, message: error };
    })
}

@SubscribeMessage('identity')
async identity(@MessageBody() data: number): Promise<number> {
    return data;
}

}