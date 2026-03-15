import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { Request } from 'express';
// biome-ignore lint/style/useImportType: needed for emitDecoratorMetadata
import { PrismaService } from '../../prisma/prisma.service';

type NodeHandler = (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>;

@Injectable()
export class AuthService implements OnModuleInit {
  // biome-ignore lint/suspicious/noExplicitAny: better-auth is ESM-only; the concrete generic type can't be expressed in CJS TypeScript
  private _auth!: any;
  private _handler!: NodeHandler;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // TypeScript with module:CommonJS transforms `await import()` into `require()`,
    // which breaks ESM-only packages like better-auth. Using `new Function` bypasses
    // that transformation while preserving type safety via type-only imports.
    const esmImport = new Function('m', 'return import(m)') as <T>(m: string) => Promise<T>;

    const { betterAuth } = await esmImport<typeof import('better-auth')>('better-auth');
    const { toNodeHandler, fromNodeHeaders } = await esmImport<typeof import('better-auth/node')>('better-auth/node');
    const { prismaAdapter } = await esmImport<typeof import('better-auth/adapters/prisma')>('better-auth/adapters/prisma');

    this._auth = betterAuth({
      database: prismaAdapter(this.prisma, { provider: 'postgresql' }),
      emailAndPassword: { enabled: true },
      socialProviders: {
        google: {
          clientId: process.env['GOOGLE_CLIENT_ID']!,
          clientSecret: process.env['GOOGLE_CLIENT_SECRET']!,
        },
      },
      user: {
        fields: { image: 'avatarUrl' },
      },
      trustedOrigins: [process.env['WEB_ORIGIN'] ?? 'http://localhost:3000'],
      secret: process.env['BETTER_AUTH_SECRET'],
      baseURL: process.env['BETTER_AUTH_URL'],
      advanced: {
        useSecureCookies: false,
      },
    });

    this._handler = toNodeHandler(this._auth);
    this._fromNodeHeaders = fromNodeHeaders;
  }

  // Stored so getSession can use it without re-importing
  private _fromNodeHeaders!: typeof import('better-auth/node')['fromNodeHeaders'];

  get handler(): NodeHandler {
    if (!this._handler) throw new Error('AuthService not yet initialized');
    return this._handler;
  }

  async getSession(req: Request): Promise<{ userId: string } | null> {
    try {
      const session = await this._auth.api.getSession({
        headers: this._fromNodeHeaders(req.headers),
      });
      return session ? { userId: session.user.id } : null;
    } catch {
      return null;
    }
  }
}
