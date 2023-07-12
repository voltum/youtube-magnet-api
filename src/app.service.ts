import { Injectable, Logger } from '@nestjs/common';
import configuration from './config/configuration';

@Injectable()
export class AppService {
  getHello(): string {
    return `${configuration().getYoutubeApiKey()}`;
  }
}
