import * as fs from 'fs';
import * as puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import { config } from './config';

const PlexAPI = require('plex-api');

if (!fs.existsSync('./media/media.json')) {
  fs.writeFileSync('./media/media.json', '[]');
}
  
interface IMedia {
  title: string;
  year: number;
  rating: number;
  audienceRating: number;
  tagline: string;
  art: string;
  roles: Array<string>;
  key: string,
  summary: string;
}
    
async function getMediaAssets(client) {
  const data = await client.query('/hubs');

  const moviesHub = data.MediaContainer.Hub.find((item: { hubIdentifier: string }) => item.hubIdentifier === 'home.movies.recent');
  console.log(moviesHub?.Metadata)
  const meta: Array<IMedia> = moviesHub?.Metadata?.map((item: IMedia) => ({
    title: item.title,
    year: item.year,
    rating: item.rating,
    audienceRating: item.audienceRating,
    tagline: item.tagline,
    art: item.art,
    roles: item['Role'].map((role) => role.tag),
    key: item.key.replace(/\/|\:/g, '_'),
    summary: item.summary,
  })).filter((item: IMedia) => item.art && item.tagline);

  return meta;
}

async function getArt(client: any, media: IMedia, filename: string) {
  const data = await client.query(media.art);

  fs.writeFileSync(filename, data);
}

async function getPlexInfo(skipMeta: boolean) {
  const currentMedia = JSON.parse(fs.readFileSync('./media/media.json', 'utf-8'));
  console.log(config)

  if (!skipMeta) {
    const client = new PlexAPI({
      ...config,
      hostname: '192.168.0.44',
      username: 'darko.kukovec',
      password: 'Td3P#7igs{!/5&9diprtP6NT',
      options: {
        product: 'PlexRoll',
        version: require('./package.json').version,
      }
    });

    const newList = await getMediaAssets(client);
    for (let media of newList) {
      const existing = currentMedia.find((item) => item.key === media.key);
      if (!existing) {
        currentMedia.push(media);
        await getArt(client, media, `media/${media.key}.jpg`);
      }
    }
    fs.writeFileSync('./media/media.json', JSON.stringify(currentMedia, null, 2));
  }

  return currentMedia;
}

async function renderFrames(media) {
  fs.mkdirSync(`./frames/${media.key}`);
  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 3840, height: 2160 } });
  const page = await browser.newPage();
  await page.goto(`file://${__dirname}/index.html`);
  await page.evaluate((media) => window['init'](media), media)
  await page.waitFor(1000);

  const TARGET_LEGTH = 6;
  const FPS = 60;
  const TOTAL_FRAMES = TARGET_LEGTH * FPS;

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const same = await page.evaluate((frame) => window['renderFrame'](frame + 1), frame);
    if (same && frame) {
      fs.copyFileSync(`./frames/${media.key}/frame-${frame - 1}.png`, `./frames/${media.key}/frame-${frame}.png`);
    } else {
      await page.screenshot({
        type: 'png',
        path: `./frames/${media.key}/frame-${frame}.png`,
      });
    }
  }
}

Promise.resolve().then(async () => {
  const items = await getPlexInfo(process.argv.length > 2);
  console.log('items', items);
  for (let media of items) {
    if (fs.existsSync(`./prerolls/${media.key}.mp4`)) {
      console.log('Skipping', media.title, media.key);
      continue;
    }
    console.log('Rendering', media.title, media.key)
    await renderFrames(media);
    console.log('Converting');
    execSync(`ffmpeg -framerate 60 -r 60 -i ./frames/${media.key}/frame-%d.png -r 60 ./prerolls/${media.key}.mp4`);
  }

  items.slice().reverse().slice(0, 5).forEach((media, index) => {
    if (fs.existsSync(`./final/Preroll ${index + 1}.mp4`)) {
      fs.unlinkSync(`./final/Preroll ${index + 1}.mp4`);
    }
    fs.copyFileSync(`./prerolls/${media.key}.mp4`, `./final/Preroll ${index + 1}.mp4`);
  });
}).catch(console.error);
