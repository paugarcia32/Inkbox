import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrpcModule } from '../../trpc/trpc.module';

let cached: TestingModule | null = null;

export async function getTestModule(): Promise<TestingModule> {
  if (cached) return cached;
  cached = await Test.createTestingModule({
    imports: [
      PrismaModule, // @Global — provides PrismaService
      TrpcModule, // @Global — imports ItemsModule + CollectionsModule
    ],
  }).compile();
  await cached.init();
  return cached;
}

export async function closeTestModule(): Promise<void> {
  if (cached) {
    await cached.close();
    cached = null;
  }
}
