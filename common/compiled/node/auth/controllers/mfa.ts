import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { generateSecret, generateURI, verify } from 'otplib';

import { encryptWithPassword } from '../../utils/aes.ts';
import { matchScryptHash, setScryptHash } from '../scrypt.ts';
import { findUser, getDb, getMfaRecoveryCodesTable, getMfaTotpTable } from '../store.ts';

const MFA_KEY = process.env.MFA_ENCRYPTION_KEY;

const getMfaKey = () => {
  if (!MFA_KEY) throw new Error('MFA_ENCRYPTION_KEY is not set');
  return MFA_KEY;
};

const generateRecoveryCodes = async () => {
  const codes: Array<{ plaintext: string; salt: string; code_hash: string }> = [];
  for (let i = 0; i < 8; i++) {
    const plaintext = crypto.randomBytes(12).toString('hex');
    const salt = crypto.randomBytes(16).toString('hex');
    const code_hash = await setScryptHash(plaintext, salt);
    codes.push({ plaintext, salt, code_hash });
  }
  return codes;
};

const setup = async (req: Request, res: Response): Promise<void> => {
  try {
    const secret = generateSecret();
    const uri = generateURI({
      issuer: 'novex',
      label: (req.user as { sub: string }).sub,
      secret,
    });
    res.status(200).json({ secret, uri });
  } catch (e) {
    logger.info('mfa setup err', { err: String(e) });
    res.status(500).json({ message: 'Failed to generate MFA secret' });
  }
};

const activate = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as { sub: string }).sub;
    const { pin, secret, label } = req.body as { pin: string; secret: string; label?: string };

    if (!pin || !secret) {
      res.status(400).json({ message: 'pin and secret are required' });
      return;
    }

    const result = await verify({ token: pin, secret });
    if (!result.valid) {
      res.status(401).json({ message: 'Invalid verification code' });
      return;
    }

    const key = getMfaKey();
    const table = getMfaTotpTable();
    if (!table) {
      res.status(500).json({ message: 'MFA tables not configured' });
      return;
    }

    // Prevent duplicate activation
    const existing = await getDb()
      .select()
      .from(table)
      .where(and(eq(table.user_id, userId), eq(table.is_active, true)))
      .limit(1);
    if (existing.length > 0) {
      res.status(400).json({ message: 'MFA already activated' });
      return;
    }

    const secretEncrypted = encryptWithPassword(secret, key);
    await getDb()
      .insert(table)
      .values({
        user_id: userId,
        label: label ?? null,
        secret_encrypted: secretEncrypted,
        is_active: true,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        verified_at: new Date(),
      });

    // Generate and store recovery codes
    const recoveryCodes = await generateRecoveryCodes();
    const recoveryTable = getMfaRecoveryCodesTable();
    if (recoveryTable) {
      await getDb()
        .insert(recoveryTable)
        .values(
          recoveryCodes.map(c => ({
            user_id: userId,
            salt: c.salt,
            code_hash: c.code_hash,
          })),
        );
    }

    res.status(200).json({
      recovery_codes: recoveryCodes.map(c => c.plaintext),
    });
  } catch (e) {
    logger.info('mfa activate err', { err: String(e) });
    res.status(500).json({ message: 'Failed to activate MFA' });
  }
};

const deactivate = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as { sub: string }).sub;
    const { password } = req.body as { password: string };

    if (!password) {
      res.status(400).json({ message: 'password is required' });
      return;
    }

    const user = await findUser({ id: userId });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const SALT_FIELD = process.env.AUTH_USER_FIELD_SALT ?? 'salt';
    const PASSWORD_FIELD = process.env.AUTH_USER_FIELD_PASSWORD ?? 'password';
    if (!(await matchScryptHash(password, user[SALT_FIELD] as string, user[PASSWORD_FIELD] as string))) {
      res.status(401).json({ message: 'Incorrect password' });
      return;
    }

    const totpTable = getMfaTotpTable();
    const recoveryTable = getMfaRecoveryCodesTable();
    if (totpTable) {
      await getDb().delete(totpTable).where(eq(totpTable.user_id, userId));
    }
    if (recoveryTable) {
      await getDb().delete(recoveryTable).where(eq(recoveryTable.user_id, userId));
    }

    res.status(200).json({ message: 'MFA deactivated' });
  } catch (e) {
    logger.info('mfa deactivate err', { err: String(e) });
    res.status(500).json({ message: 'Failed to deactivate MFA' });
  }
};

const status = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as { sub: string }).sub;
    const table = getMfaTotpTable();
    if (!table) {
      res.status(200).json({ enabled: false, label: null });
      return;
    }

    const rows = await getDb().select().from(table).where(eq(table.user_id, userId)).limit(1);

    if (rows.length > 0 && (rows[0] as { is_active: boolean; label: string | null }).is_active) {
      res.status(200).json({ enabled: true, label: (rows[0] as { label: string | null }).label });
    } else {
      res.status(200).json({ enabled: false, label: null });
    }
  } catch (e) {
    logger.info('mfa status err', { err: String(e) });
    res.status(500).json({ message: 'Failed to get MFA status' });
  }
};

const regenerate = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as { sub: string }).sub;
    const recoveryTable = getMfaRecoveryCodesTable();
    if (!recoveryTable) {
      res.status(500).json({ message: 'MFA tables not configured' });
      return;
    }

    // Invalidate existing unused codes
    await getDb().update(recoveryTable).set({ used_at: new Date() }).where(eq(recoveryTable.user_id, userId));

    // Generate new codes
    const recoveryCodes = await generateRecoveryCodes();
    await getDb()
      .insert(recoveryTable)
      .values(
        recoveryCodes.map(c => ({
          user_id: userId,
          salt: c.salt,
          code_hash: c.code_hash,
        })),
      );

    res.status(200).json({
      recovery_codes: recoveryCodes.map(c => c.plaintext),
    });
  } catch (e) {
    logger.info('mfa regenerate err', { err: String(e) });
    res.status(500).json({ message: 'Failed to regenerate recovery codes' });
  }
};

export { activate, deactivate, regenerate, setup, status };
