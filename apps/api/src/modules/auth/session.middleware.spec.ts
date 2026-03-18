import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SessionMiddleware } from './session.middleware';

type RequestWithUserId = Request & { userId?: string };

describe('SessionMiddleware', () => {
  let middleware: SessionMiddleware;
  const mockAuthService = { getSession: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [SessionMiddleware, { provide: AuthService, useValue: mockAuthService }],
    }).compile();
    middleware = module.get(SessionMiddleware);
  });

  it('calls authService.getSession with the request', async () => {
    const req = {} as RequestWithUserId;
    const next = vi.fn() as NextFunction;
    mockAuthService.getSession.mockResolvedValueOnce(null);

    await middleware.use(req, {} as Response, next);

    expect(mockAuthService.getSession).toHaveBeenCalledWith(req);
  });

  it('sets req.userId when a session is found', async () => {
    const req = {} as RequestWithUserId;
    const next = vi.fn() as NextFunction;
    mockAuthService.getSession.mockResolvedValueOnce({ userId: 'user-123' });

    await middleware.use(req, {} as Response, next);

    expect(req.userId).toBe('user-123');
  });

  it('does not set req.userId when getSession returns null', async () => {
    const req = {} as RequestWithUserId;
    const next = vi.fn() as NextFunction;
    mockAuthService.getSession.mockResolvedValueOnce(null);

    await middleware.use(req, {} as Response, next);

    expect(req.userId).toBeUndefined();
  });

  it('calls next() when session is found', async () => {
    const req = {} as RequestWithUserId;
    const next = vi.fn() as NextFunction;
    mockAuthService.getSession.mockResolvedValueOnce({ userId: 'user-123' });

    await middleware.use(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next() when session is null', async () => {
    const req = {} as RequestWithUserId;
    const next = vi.fn() as NextFunction;
    mockAuthService.getSession.mockResolvedValueOnce(null);

    await middleware.use(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
