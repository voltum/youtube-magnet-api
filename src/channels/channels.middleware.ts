import { HttpStatus, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { async } from 'rxjs';
import { EmailFinder, YTGetChannelInfo, YTLastVideo, YTScrapeLinks } from 'src/utils/channels/channels';

@Injectable()
export class ChannelsMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const { identificator, chunkStamp } = req.query;
    const key = 'AIzaSyBquyODQDQl7mf82awWwWZzAUqYBkTRMgQ';

    await Promise.allSettled([YTGetChannelInfo(String(identificator), ['id', 'snippet','contentDetails','statistics'], key), YTScrapeLinks(identificator)])
    .then((results) => {

        if(results[0].status === 'fulfilled' && results[1].status === 'fulfilled'){

            const channels = results[0].value.data.items;
            if (!channels) throw "No channel found."; 

            const { title, description, country, defaultLanguage, publishedAt } = channels[0].snippet;
            const { subscriberCount, viewCount, videoCount } = channels[0].statistics;

            req.body = {
                id: channels[0].id,
                title,
                description,
                email: EmailFinder(description),
                url: `https://youtube.com/channel/${channels[0].id}`,
                country,
                defaultLanguage: defaultLanguage || '',
                subscriberCount,
                viewCount,
                videoCount,
                socialLinks: JSON.stringify(results[1].value),
                publishedAt,
                chunkStamp
            }
            Logger.log(`Main info about (${channels[0].id}) received: SUCCESS`, title)
            next();
        } 
        else {
            throw 'Youtube API calls error';
        }
    })
    .catch((error) => {
        if (error) {
            Logger.log('Error: ' + error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.send({error: 'Error: ' + error});
            res.end();
        }
    });
  }
}