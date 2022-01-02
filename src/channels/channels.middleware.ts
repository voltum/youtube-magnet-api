import { HttpStatus, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { EmailFinder, YTGetChannelInfo, YTLastVideo, YTScrapeLinks } from 'src/utils/channels/channels';

@Injectable()
export class ChannelsMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const key = 'AIzaSyBquyODQDQl7mf82awWwWZzAUqYBkTRMgQ';

    await Promise.allSettled([YTGetChannelInfo(id, ['snippet','contentDetails','statistics'], key), YTLastVideo(id, ['snippet'], key), YTScrapeLinks(id)])
    .then((results) => {

        if(results[0].status === 'fulfilled' && results[1].status === 'fulfilled' && results[2].status === 'fulfilled'){

            const channels = results[0].value.data.items;
            const lastVideoPublishedAt = results[1].value.data.items[0].snippet.publishedAt;

            if (!channels.length) throw "No channel found."; 

            const { title, description, country, defaultLanguage, publishedAt } = channels[0].snippet;
            const { subscriberCount, viewCount, videoCount } = channels[0].statistics;

            req.body = {
                title,
                description,
                email: EmailFinder(description),
                url: `https://youtube.com/channels/${id}`,
                country,
                defaultLanguage: defaultLanguage || '',
                subscriberCount,
                viewCount,
                videoCount,
                socialLinks: JSON.stringify(results[2].value),
                lastVideoPublishedAt,
                publishedAt
            }
    
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