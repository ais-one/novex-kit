/**
 * Standalone role-checking middleware.
 *
 * Checks `req.user.roles` (the flat array from the JWT payload, populated by
 * `authUser` middleware). Returns 403 if the user holds none of the required
 * roles.
 *
 * No RBAC setup or database access needed — works with any authentication
 * mode (RBAC, FGA, or legacy column).
 *
 * Usage:
 *   import { requireRole } from '@common/node/auth/require-role';
 *   router.get('/admin', authUser, requireRole('admin'), handler);
 */

import type { NextFunction, Request, Response } from 'express';

const requireRole =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.roles?.some((r: string) => roles.includes(r))) return next();
    return res.sendStatus(403);
  };

export { requireRole };
