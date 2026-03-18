import { Module } from '@nestjs/common';
import { ScraperModule } from '../scraper/scraper.module';
import { ItemsRouter } from './items.router';
import { ItemsService } from './items.service';

@Module({
  imports: [ScraperModule],
  providers: [ItemsService, ItemsRouter],
  exports: [ItemsRouter],
})
export class ItemsModule {}
