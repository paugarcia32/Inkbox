import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
// biome-ignore lint/style/useImportType: needed for emitDecoratorMetadata
import { AuthService } from './auth.service';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const session = await this.authService.getSession(req);
    if (session) {
      (req as Request & { userId?: string }).userId = session.userId;
    }
    next();
  }
}
