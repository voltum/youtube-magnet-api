import { Logger } from "@nestjs/common";
import { google } from 'googleapis';
const puppeteer = require('puppeteer');
var service = google.youtube('v3');

export async function YTGetID(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const selector = "meta[itemprop='channelId']";
  let id = null;

  try{
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'load', timeout: 0});
    Logger.log('Waiting for selector', 'IDScraper');
    await page.waitForSelector(selector, { timeout: 5000 });

    id = await page.evaluate(function () {
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
export async function YTScrapeLinks(identificator): Promise<object[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  let links = null;

  try{
    const page = await browser.newPage();
    await page.goto(`https://www.youtube.com/channel/${identificator}/about`, {waitUntil: 'load', timeout: 0});
    Logger.log('Waiting for selector', 'LinksScraper');
    await page.waitForSelector("div#links-holder", { timeout: 5000 });
    await page.waitForTimeout(0);
  
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
export function EmailFinder(text: string){
  const matches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
  if(matches) Logger.log('Email found in channel description', 'EmailFinder');
  else Logger.log('Email not found in channel description', 'EmailFinder');
  return matches ? matches[0] : null;
}