import { CollectionsRouter } from '../../modules/collections/collections.router';
import { ItemsRouter } from '../../modules/items/items.router';
import { SectionsRouter } from '../../modules/sections/sections.router';
import { UsersRouter } from '../../modules/users/users.router';
import { TrpcService } from '../../trpc/trpc.service';
import { getTestModule } from './create-test-module';

type MockReq = { headers: Record<string, string> };

export async function getCaller(userId?: string) {
  const m = await getTestModule();

  const trpc = m.get(TrpcService);
  const items = m.get(ItemsRouter);
  const collections = m.get(CollectionsRouter);
  const sections = m.get(SectionsRouter);
  const users = m.get(UsersRouter);

  const appRouter = trpc.mergeRouters(
    trpc.router({ items: items.router }),
    trpc.router({ collections: collections.router }),
    trpc.router({ sections: sections.router }),
    trpc.router({ users: users.router }),
  );

  const ctx = {
    userId: userId ?? '',
    req: { headers: {} } as MockReq,
  };

  // tRPC v11: every router has a createCaller method for server-side testing
  return appRouter.createCaller(ctx as Parameters<typeof appRouter.createCaller>[0]);
}
