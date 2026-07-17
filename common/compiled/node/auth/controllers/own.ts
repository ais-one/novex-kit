// own authentication

import { eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verify } from 'otplib';

import { createToken, getSecret, setTokensToHeader } from '../jwt.ts';
import { matchScryptHash } from '../scrypt.ts';
import { findUser, getDb, getMfaRecoveryCodesTable, revokeRefreshToken } from '../store.ts';

const { COOKIE_HTTPONLY, JWT_ALG } = globalThis.__config.JWT;

const LOGIN_FIELD = process.env.AUTH_USER_FIELD_LOGIN ?? '';
const SALT_FIELD = process.env.AUTH_USER_FIELD_SALT ?? '';
const PASSWORD_FIELD = process.env.AUTH_USER_FIELD_PASSWORD ?? '';
const ID_FIELD = process.env.AUTH_USER_FIELD_ID_FOR_JWT ?? '';
const USE_OTP = process.env.USE_OTP;

/**
 * Log out the current user by revoking their refresh token.
 * Clears auth cookies when COOKIE_HTTPONLY is enabled.
 * Mounted at: POST /auth/logout
 */
const logout = async (req: Request, res: Response): Promise<void> => {
  let id: string | null = null;
  try {
    const tmp = req.cookies?.Authorization || req.header('Authorization') || req.query?.Authorization;
    const access_token = (tmp as string).split(' ')[1];
    const user = jwt.decode(access_token) as Record<string, unknown>;
    id = user?.sub as string;
    jwt.verify(access_token, getSecret('verify'), { algorithms: [JWT_ALG] });
  } catch (e) {
    const err = e as Error & { name?: string };
    if (err.name !== 'TokenExpiredError') id = null;
  }
  try {
    if (id) {
      await revokeRefreshToken(id);
      if (COOKIE_HTTPONLY) {
        res.clearCookie('refresh_token');
        res.clearCookie('Authorization');
      }
      res.status(200).json({ message: 'Logged Out' });
      return;
    }
  } catch (e) {
    logger.info('logout err', { err: String(e) });
  }
  res.status(500).json();
};

/**
 * Placeholder refresh endpoint — actual refresh is handled by `authRefresh` in jwt.ts.
 * Mounted at: POST /auth/refresh
 */
const refresh = async (_req: Request, res: Response): Promise<void> => {
  res.status(401).json({ message: 'Error token revoked' });
};

/**
 * Authenticate a user with username + password (scrypt), optionally requiring OTP.
 * Returns JWT tokens on success, or a 401 on credential failure.
 * Mounted at: POST /auth/login
 */
const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await findUser({ [LOGIN_FIELD]: req.body[LOGIN_FIELD] });
    if (!user) {
      res.status(401).json({ message: 'Incorrect credentials...1' });
      return;
    }
    if (!(await matchScryptHash(req.body[PASSWORD_FIELD], user[SALT_FIELD], user[PASSWORD_FIELD]))) {
      res.status(401).json({ message: 'Incorrect credentials...2' });
      return;
    }
    if (user.revoked) {
      res.status(401).json({ message: 'Revoked credentials' });
      return;
    }
    const id = user[ID_FIELD];
    if (!id) {
      res.status(401).json({ message: 'Authorization Format Error' });
      return;
    }
    if (USE_OTP || user.mfa_active) {
      res.status(200).json({ otp: id });
      return;
    }
    const tokens = await createToken(user);
    setTokensToHeader(res, tokens);
    res.status(200).json(tokens);
  } catch (_e) {
    res.status(500).json();
  }
};

/**
 * Verify a TOTP pin or recovery code after the initial login step returns `{ otp: id }`.
 * Mounted at: POST /auth/otp
 */
const otp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, pin, type } = req.body as { id: string; pin: string; type?: string };
    const user = await findUser({ id });
    if (user) {
      const otpSecret = user.otp_secret as string | undefined;

      if (type === 'recovery') {
        const recoveryTable = getMfaRecoveryCodesTable();
        if (!recoveryTable) {
          res.status(400).json({ message: 'Recovery codes not available' });
          return;
        }
        const codes = await getDb().select().from(recoveryTable).where(eq(recoveryTable.user_id, user.id));
        for (const c of codes as Array<{ id: string; salt: string; code_hash: string; used_at: Date | null }>) {
          if (c.used_at) continue;
          if (await matchScryptHash(pin, c.salt, c.code_hash)) {
            await getDb().update(recoveryTable).set({ used_at: new Date() }).where(eq(recoveryTable.id, c.id));
            const tokens = await createToken(user);
            setTokensToHeader(res, tokens);
            res.status(200).json(tokens);
            return;
          }
        }
        res.status(401).json({ message: 'Invalid recovery code' });
        return;
      }

      const valid =
        USE_OTP !== 'TEST' ? (await verify({ token: pin, secret: otpSecret ?? '' })).valid : String(pin) === '111111';
      if (valid) {
        const tokens = await createToken(user);
        setTokensToHeader(res, tokens);
        res.status(200).json(tokens);
        return;
      }
      res.status(401).json({ message: 'Error token wrong pin' });
      return;
    }
  } catch (e) {
    logger.info('otp err', { err: String(e) });
  }
  res.status(401).json({ message: 'Error token revoked' });
};

export { login, logout, otp, refresh };
