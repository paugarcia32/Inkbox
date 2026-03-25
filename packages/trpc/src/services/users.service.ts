import type { PrismaClient } from '@hako/db';

export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  async updateProfile(userId: string, name: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true },
    });
  }

  async deleteAccount(userId: string) {
    await this.prisma.item.deleteMany({ where: { userId } });
    await this.prisma.collection.deleteMany({ where: { userId } });
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
