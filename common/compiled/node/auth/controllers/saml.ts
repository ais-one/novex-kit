// working SAML ADFS example
// no refresh token, issue own OAuth2 like JWT server

import { SAML } from '@node-saml/node-saml';
import type { Request, Response } from 'express';
import { createToken, setTokensToHeader } from '../jwt.ts';

const { SAML_CERTIFICATE, SAML_PRIVATE_KEY } = process.env;
const { AUTH_ERROR_URL } = globalThis.__config;
const samlJwtMap = globalThis.__config?.SAML_JWT_MAP || null;
const samlOptions = globalThis.__config?.SAML_OPTIONS || null;

if (samlOptions) {
  if (SAML_CERTIFICATE) samlOptions.privateCert = SAML_CERTIFICATE;
  if (SAML_PRIVATE_KEY) {
    samlOptions.privateKey = SAML_PRIVATE_KEY;
    samlOptions.decryptionPvk = SAML_PRIVATE_KEY;
  }
}

const saml = samlOptions ? new SAML(samlOptions) : null;

/**
 * Redirect the user to the SAML IdP authorization URL.
 * Mounted at: GET /saml/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  // biome-ignore lint/suspicious/noExplicitAny: saml type definitions are incomplete
  const authUrl = await (saml as any)?.getAuthorizeUrlAsync(req.query.RelayState);
  res.redirect(authUrl);
};

/**
 * Handle the SAML IdP POST callback, validate the assertion, then issue a local JWT.
 * Mounted at: POST /saml/callback
 */
export const auth = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedResponse = await saml?.validatePostResponseAsync(req.body);
    const TO = req.body.RelayState as string;
    const authenticated = !parsedResponse?.loggedOut;
    const user = {
      sub: parsedResponse?.profile[samlJwtMap?.id ?? 'nameID'],
      roles: parsedResponse?.profile[samlJwtMap?.groups ?? 'groups'],
    };
    if (!TO) {
      res.status(200).json({ authenticated, user });
      return;
    }
    if (authenticated) {
      const tokens = await createToken(user);
      setTokensToHeader(res, tokens);
      res.redirect(`${TO}#${tokens.access_token};${tokens.refresh_token};${JSON.stringify(tokens.user_meta)}`);
      return;
    }
    AUTH_ERROR_URL ? res.redirect(AUTH_ERROR_URL) : res.status(401).json({ error: 'NOT Authenticated' });
  } catch (e) {
    res.json({
      message: String(e),
      note: 'Currently it always triggers invalid document signature fix is on the way',
    });
  }
};
