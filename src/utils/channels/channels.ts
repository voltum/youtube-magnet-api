import { Logger } from "@nestjs/common";
import { google } from 'googleapis';
const puppeteer = require('puppeteer');
var service = google.youtube('v3');

export async function YTScrapeLinks(channelID): Promise<object[]> {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(
    `https://www.youtube.com/channel/${channelID}/about`
  );
  await page.waitForSelector("div#links-holder");
  await page.waitForTimeout(0);

  const links = await page.evaluate(function () {
    return Array.from(
          document.querySelectorAll("div#primary-links>a, div#secondary-links>a")
      ).map((el) => (
        new URLSearchParams(decodeURIComponent(el.getAttribute('href'))).get('q')
      ))
  });

  await browser.close();
  return links;
}

export function YTGetChannelInfo(id: string, part: string[], key: string) {
  return service.channels.list({
    part,
    id: [id],
    key: key,
  })
}
export function YTLastVideo(id: string, part: string[], key: string) {
  return service.playlistItems.list({
    part,
    playlistId: `UU` + id.substring(2),
    key: key,
  })
}
export function EmailFinder(text: string){
  return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi)[0];
}