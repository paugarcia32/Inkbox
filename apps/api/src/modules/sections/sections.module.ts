import { Module } from '@nestjs/common';
import { SectionsRouter } from './sections.router';
import { SectionsService } from './sections.service';

@Module({
  providers: [SectionsService, SectionsRouter],
  exports: [SectionsRouter],
})
export class SectionsModule {}
