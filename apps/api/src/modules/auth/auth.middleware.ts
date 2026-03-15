import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
// biome-ignore lint/style/useImportType: needed for emitDecoratorMetadata
import { AuthService } from './auth.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Fix: NestJS middleware mounting modifies req.url/baseUrl which breaks
    // better-call's constructRelativeUrl — it can drop the query string.
    // Reset to originalUrl so toNodeHandler sees the full URL with params.
    const savedUrl = req.url;
    const savedBaseUrl = req.baseUrl;
    req.url = req.originalUrl;
    (req as any).baseUrl = '';

    await this.authService.handler(req, res);

    // Restore for downstream middleware
    req.url = savedUrl;
    (req as any).baseUrl = savedBaseUrl;

    if (!res.headersSent) next();
  }
}
