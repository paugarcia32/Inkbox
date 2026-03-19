import { Injectable, type NestMiddleware } from '@nestjs/common';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import type { NextFunction, Request, Response } from 'express';
import { CollectionsRouter } from '../modules/collections/collections.router';
import { ItemsRouter } from '../modules/items/items.router';
import { SectionsRouter } from '../modules/sections/sections.router';
import { UsersRouter } from '../modules/users/users.router';
import { TrpcService } from './trpc.service';

function createAppRouter(
  trpc: TrpcService,
  items: ItemsRouter,
  collections: CollectionsRouter,
  sections: SectionsRouter,
  users: UsersRouter,
) {
  return trpc.mergeRouters(
    trpc.router({ items: items.router }),
    trpc.router({ collections: collections.router }),
    trpc.router({ sections: sections.router }),
    trpc.router({ users: users.router }),
  );
}

export type AppRouter = ReturnType<typeof createAppRouter>;

@Injectable()
export class TrpcMiddleware implements NestMiddleware {
  private readonly handler: ReturnType<typeof createExpressMiddleware>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly items: ItemsRouter,
    private readonly collections: CollectionsRouter,
    private readonly sections: SectionsRouter,
    private readonly users: UsersRouter,
  ) {
    const appRouter = createAppRouter(
      this.trpc,
      this.items,
      this.collections,
      this.sections,
      this.users,
    );
    this.handler = createExpressMiddleware({
      router: appRouter,
      createContext: ({ req }) => ({
        userId: (req as Request & { userId?: string }).userId ?? '',
        req,
      }),
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.handler(req, res, next);
  }
}
