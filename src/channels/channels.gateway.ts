import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, WsResponse } from "@nestjs/websockets";
import { Server } from "socket.io";
import { from, map, Observable } from "rxjs";
import { Logger } from "@nestjs/common";

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EventsGateway {
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

@SubscribeMessage('identity')
async identity(@MessageBody() data: number): Promise<number> {
    return data;
}
}