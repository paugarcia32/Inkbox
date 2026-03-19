import { Global, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { CollectionsModule } from '../modules/collections/collections.module';
import { ItemsModule } from '../modules/items/items.module';
import { SectionsModule } from '../modules/sections/sections.module';
import { UsersModule } from '../modules/users/users.module';
import { TrpcMiddleware } from './trpc.middleware';
import { TrpcService } from './trpc.service';

@Global()
@Module({
  imports: [ItemsModule, CollectionsModule, SectionsModule, UsersModule],
  providers: [TrpcService, TrpcMiddleware],
  exports: [TrpcService],
})
export class TrpcModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TrpcMiddleware).forRoutes('/trpc');
  }
}
