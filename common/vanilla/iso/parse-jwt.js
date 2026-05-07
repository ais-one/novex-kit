/**
 * Decode and return the payload of a JWT without verifying the signature.
 * Throws if the token is malformed — caller must handle.
 * @param {string} token - raw JWT string (three base64url segments separated by `.`)
 * @returns {Record<string, unknown>} - parsed payload object
 */
export default function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => {
        const hex = c.codePointAt(0).toString(16).padStart(2, '0');
        return `%${hex}`;
      })
      .join(''),
  );
  return JSON.parse(jsonPayload);
}
