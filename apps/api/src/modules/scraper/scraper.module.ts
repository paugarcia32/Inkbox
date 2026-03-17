import { Module } from '@nestjs/common';
import { SCRAPER_STRATEGIES } from './interfaces/scraper.interface';
import { ScraperUtilsService } from './scraper-utils.service';
import { ScraperService } from './scraper.service';
import { GenericScraperService } from './strategies/generic.scraper';
import { PinterestScraperService } from './strategies/pinterest.scraper';
import { TwitterScraperService } from './strategies/twitter.scraper';

@Module({
  providers: [
    ScraperUtilsService,
    TwitterScraperService,
    PinterestScraperService,
    GenericScraperService,
    {
      provide: SCRAPER_STRATEGIES,
      // Order matters: specific scrapers first, generic fallback last.
      useFactory: (
        twitter: TwitterScraperService,
        pinterest: PinterestScraperService,
        generic: GenericScraperService,
      ) => [twitter, pinterest, generic],
      inject: [TwitterScraperService, PinterestScraperService, GenericScraperService],
    },
    ScraperService,
  ],
  exports: [ScraperService],
})
export class ScraperModule {}
