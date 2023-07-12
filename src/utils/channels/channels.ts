import { Logger } from "@nestjs/common";
import { google } from 'googleapis';
import configuration from "src/config/configuration";
const puppeteer = require('puppeteer');
var service = google.youtube('v3');

// Main middleware-like functions
export async function DetermineChannelID(url: string, folder: string) {

    const urlObject = new URL(String(url), 'https://youtube.com');

    let identificator = null;

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
            throw "Invalid url or timeout";
    }

    Logger.log('Identificator determination: SUCCESS', 'ChannelTypeMiddleware');

    return identificator;
}

interface GetMainInfoInterface{
  (channelID: string, { skipMedia }?: any): any
}

export async function GetMainInfo( channelID: string, { skipMedia }: { skipMedia?: boolean} = {}): Promise<any> {
    const key = configuration().getYoutubeApiKey();

    return await Promise.allSettled([
      YTGetChannelInfo(String(channelID), ['id', 'snippet','contentDetails','statistics'], key), 
      YTScrapeLinks(channelID, skipMedia),
      YTLastVideo(channelID, ['snippet'], key)
    ])
    .then((results) => {

        if(results[0].status === 'fulfilled' && results[1].status === 'fulfilled' && results[2].status === 'fulfilled'){

            const channels = results[0].value.data.items;
            const lastVideo = results[2].value.data.items[0];
            if (!channels) throw "No channel found.";

            const { title, description, country, defaultLanguage, publishedAt } = channels[0].snippet;
            const { subscriberCount, viewCount, videoCount } = channels[0].statistics;

            const emailInMainDescription = EmailFinder(description, 'channel description');
            const emailInLastVideoDescription = EmailFinder(lastVideo?.snippet.description, 'last video description');

            return {
                id: channels[0].id,
                title,
                description,
                email: emailInMainDescription || emailInLastVideoDescription,
                url: `https://youtube.com/channel/${channels[0].id}`,
                country,
                defaultLanguage: defaultLanguage || '',
                subscriberCount,
                viewCount,
                videoCount,
                socialLinks: JSON.stringify(results[1].value),
                lastVideoPublishedAt: lastVideo?.snippet.publishedAt,
                publishedAt
            }
        } 
        else {
          throw `Youtube API calls error: ${results[0].status === 'rejected' ? 'Maininfo' : results[1].status === 'rejected' ? 'Social links' : results[2].status === 'rejected' ? 'Last video' : 'undefined'}`;
        }
    })
    .catch((error) => {
      throw error;
    });
}

// Helper functions
export async function YTGetID(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", 
    "--disable-setuid-sandbox", 
    `--user-data-dir=${configuration().getUserDataDir()}`
  ],
  });

  const selector = "meta[itemprop='channelId']";
  let id = null;

  try{
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 0 });

    Logger.log('Waiting for selectors', 'IDScraper');

    const current_URL = await page.evaluate(() => {
      return document.URL;
    });

    Logger.log(current_URL, "RejectButton");

    if(current_URL !== url) {
      // There is a cookies page, so click "Reject all" button
      await page.waitForSelector("[aria-label='Reject all']", { timeout: 3000 });

      await page.evaluate(() => {
        const button =  <HTMLElement>document.querySelector("[aria-label='Reject all']");
        button.click();
      });
    }

    await page.waitForSelector(selector, { timeout: 7000 });

    id = await page.evaluate(() => {
      const meta = <HTMLMetaElement>document.querySelector("meta[itemprop='channelId']");
      return meta.content;
    });
   
    await browser.close();
  } catch (e) {
    Logger.log(e, 'YTScrapeID');
  } finally {
    await browser.close();
    return id;
  }
}
export async function YTScrapeLinks(identificator, skip: boolean = false): Promise<object[]> {
  if(skip) return;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", 
    "--disable-setuid-sandbox", 
    `--user-data-dir=${configuration().getUserDataDir()}`
  ],
  });
  let links = null;

  try{
    const page = await browser.newPage();
    await page.goto(`https://www.youtube.com/channel/${identificator}/about`, {waitUntil: 'load', timeout: 0});
    Logger.log('Waiting for selector', 'LinksScraper');
    
    await page.waitForSelector("div#links-holder");
  
    links = await page.evaluate(function () {
      return Array.from(
            document.querySelectorAll("div#primary-links>a, div#secondary-links>a")
        ).map((el) => (
          new URLSearchParams(decodeURIComponent(el.getAttribute('href'))).get('q')
        ))
    });
    await browser.close();
  } catch (e) {
    Logger.log(e, 'YTScrapeLinks');
  } finally {
    await browser.close();
    return links;
  }

}
export async function YTCheckEmailCaptcha(identificator): Promise<boolean | undefined> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", 
    `--user-data-dir=${configuration().getUserDataDir()}`
  ],
  });
  let captchaExists;
  let recaptcha = null;

  try{
    const page = await browser.newPage();
    await page.goto(`https://www.youtube.com/channel/${identificator}/about`, { waitUntil: 'load', timeout: 0 });

    Logger.log('Waiting for email selector', 'EmailCaptchaScraper');
    
    try{
      await page.waitForSelector('#recaptcha', { timeout: 5000 });
    
      captchaExists = await page.evaluate(() => {
        const parentElement:HTMLElement = document.querySelector("#recaptcha").parentElement.previousElementSibling.previousElementSibling as HTMLElement;
        return !parentElement.hidden;
      });

      Logger.log(recaptcha, 'EmailCaptchaScraper')
    } catch(error) {
      // Ignore
      Logger.error('Error while scraping email captcha: ' + error, 'EmailCaptchaScraper')
    }

    Logger.log(`Captcha with email: ${captchaExists}`, 'EmailCaptchaScraper')

    await browser.close();
  } catch (e) {
    Logger.log(e, 'YTScrapeLinks');
  } finally {
    await browser.close();
    return captchaExists;
  }

}
export function YTGetChannelInfo(id:string, part: string[], key: string) {
  Logger.log('Youtube API call', 'ChannelInfo');
  return service.channels.list({
    part,
    id: [id],
    key: key,
  });
}
export function YTLastVideo(id: string, part: string[], key: string) {
  Logger.log('Youtube API call', 'PlaylistInfo');
  return service.playlistItems.list({
    part,
    playlistId: `UU` + id.substring(2),
    maxResults: 1,
    key: key,
  })
}
export function EmailFinder(text: string, context?: string){
  const matches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);

  Logger.log(`Email ${matches ? 'found' : 'not found'} in ${context || 'the given context'}`, 'EmailFinder');

  return matches ? matches[0] : null;
}