import Fetch from '@common/iso/fetch';

const { VITE_WITH_CREDENTIALS, VITE_API_URL, VITE_AUTH_URL, VITE_REFRESH_URL } = import.meta.env;

// Absolute refresh URL pointing to base-iam — both http and auth instances
// need to refresh at the same endpoint regardless of their own baseUrl.
const authRefreshUrl = VITE_AUTH_URL ? `${VITE_AUTH_URL}${VITE_REFRESH_URL}` : VITE_REFRESH_URL;

export const http = new Fetch({
  baseUrl: VITE_API_URL,
  refreshUrl: authRefreshUrl,
  credentials: VITE_WITH_CREDENTIALS || 'same-origin',
});

/** Auth-specific fetch instance — points to IAM service (base-iam).
 *  Tokens must be synced manually via setTokens() on both http and auth
 *  after login/refresh so both instances carry the same auth headers. */
export const auth = VITE_AUTH_URL
  ? new Fetch({
      baseUrl: VITE_AUTH_URL,
      refreshUrl: authRefreshUrl,
      credentials: VITE_WITH_CREDENTIALS || 'same-origin',
    })
  : http;
