import {
  DribbbleScraperService,
  GenericScraperService,
  InstagramScraperService,
  PinterestScraperService,
  ScraperService,
  ScraperUtilsService,
  TikTokScraperService,
  TwitterScraperService,
  YoutubeScraperService,
} from '@hako/trpc';

const utils = new ScraperUtilsService();

export const scraperService = new ScraperService([
  new TwitterScraperService(utils),
  new PinterestScraperService(utils),
  new YoutubeScraperService(utils),
  new DribbbleScraperService(utils),
  new TikTokScraperService(utils),
  new InstagramScraperService(utils),
  new GenericScraperService(utils),
]);
