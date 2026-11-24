import crypto from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const GUEST_COOKIE_NAME = 'geodle_guest_id';
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      guestId?: string;
    }
  }
}

/**
 * Assigns every visitor a cryptographically signed httpOnly cookie (`geodle_guest_id`)
 * so guests can refresh the browser without losing their Daily game progress.
 */
@Injectable()
export class GuestCookieMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existing = req.signedCookies?.[GUEST_COOKIE_NAME] as string | undefined;
    if (existing && UUID_REGEX.test(existing)) {
      req.guestId = existing;
      next();
      return;
    }

    const freshGuestId = crypto.randomUUID();
    req.guestId = freshGuestId;
    res.cookie(GUEST_COOKIE_NAME, freshGuestId, {
      httpOnly: true,
      signed: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    next();
  }
}
