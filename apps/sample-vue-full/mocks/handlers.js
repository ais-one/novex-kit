import { HttpResponse, http } from 'msw';
import t4tConfigs from './t4t-configs.js';
import t4tData from './t4t-data.js';

// header.payload.sig — a structurally valid JWT whose payload parseJwt can decode
const mockJwt =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJUZXN0R3JvdXAiXSwic3ViIjoiMSJ9.sig';

export default [
  http.get('http://127.0.0.1:8080/api/msw/test', () => {
    return HttpResponse.json({ message: 'it works :)' });
  }),

  http.get('http://127.0.0.1:8080/api/t4t/config/:table', ({ params }) => {
    const config = t4tConfigs[params.table];
    if (!config) return HttpResponse.json({ error: 'Table not found' }, { status: 404 });
    return HttpResponse.json(config);
  }),

  http.get('http://127.0.0.1:8080/api/t4t/find/:table', ({ params, request }) => {
    const table = new URL(request.url).pathname.split('/').pop();
    const result = t4tData[table] ?? t4tData[params.table] ?? { results: [], total: 0 };
    return HttpResponse.json(result);
  }),

  http.post('http://127.0.0.1:8080/api/auth/login', () => {
    return HttpResponse.json({ otp: 1 });
  }),

  http.post('http://127.0.0.1:8080/api/auth/otp', () => {
    return HttpResponse.json({
      access_token: mockJwt, // NOSONAR — not a real secret, mock JWT for MSW testing
      refresh_token: 'mock-refresh-token',
      user_meta: { email: 'test@example.com', roles: ['TestGroup'] },
    });
  }),

  http.get('http://127.0.0.1:8080/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged Out' });
  }),
];
