import { HttpStatus, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { YTLastVideo } from 'src/utils/channels/channels';

@Injectable()
export class ChannelLastVideo implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const { id } = req.body;
    const key = 'AIzaSyBquyODQDQl7mf82awWwWZzAUqYBkTRMgQ';
    await YTLastVideo(id, ['snippet'], key)
    .then((response) => {
        const lastVideoPublishedAt = response.data.items[0].snippet.publishedAt;
        req.body = {
            ...req.body,
            lastVideoPublishedAt
        }
        Logger.log(`Info about last video (${response.data.items[0].snippet.title}) received: SUCCESS`, 'LastVideoMiddleware');
        next();
    })
    .catch((error) => {
        Logger.error(error, 'LastVideoFinder')
        res.status(HttpStatus.BAD_REQUEST);
        res.send({error: 'Invalid url provided'});
        res.end();
    })
  }
}