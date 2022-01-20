import { HttpStatus, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { YTGetID } from 'src/utils/channels/channels';

@Injectable()
export class ChannelTypeDeterminant implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const { url, folder } = req.query;

    try{
        if(!folder) throw "Folder is not specified";

        const urlObject = new URL(String(url), 'https://youtube.com');
        let identificator = null

        if(!urlObject.pathname.substring(1)) throw "Invalid url provided: path empty";

        const prefix = urlObject.pathname.indexOf('/', 1) > 0 ? urlObject.pathname.substring(1, urlObject.pathname.indexOf('/', 1)) : '';

        if(prefix === 'channel'){
            identificator = urlObject.pathname.substring(9)
        }
        else{
            const ID = await YTGetID(String(url));
            Logger.log(ID, 'URLDeterminantID');
            if(ID)
                identificator = ID;
            else
                throw "Invalid url provided: invalid path";
        }

        req.query.identificator = identificator;

        Logger.log('Identificator determination: SUCCESS', 'ChannelTypeMiddleware');
        next();
    }
    catch(error){
        Logger.error(error, 'URLDeterminant')
        res.status(HttpStatus.BAD_REQUEST);
        res.send({error: 'Invalid url provided'});
        res.end();
    }
  }
}