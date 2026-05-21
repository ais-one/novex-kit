import { HttpResponse, http } from 'msw';
import t4tConfigs from './t4t-configs.js';
import t4tData from './t4t-data.js';

export default [
  http.get('http://127.0.0.1:8080/api/msw/test', () => {
    return HttpResponse.json({ message: 'it works :)' });
  }),

  http.get('http://127.0.0.1:8080/api/t4t/config/:table', ({ params }) => {
    const config = t4tConfigs[params.table];
    if (!config) return HttpResponse.json({ error: 'Table not found' }, { status: 404 });
    return HttpResponse.json(config);
  }),

  http.get('http://127.0.0.1:8080/api/t4t/find/:table', ({ params }) => {
    return HttpResponse.json(t4tData[params.table] ?? { results: [], total: 0 });
  }),

  http.post('http://127.0.0.1:8080/api/auth/login', () => {
    return HttpResponse.json({ otp: 1 });
  }),

  http.post('http://127.0.0.1:8080/api/auth/otp', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user_meta: { email: 'test', roles: ['TestGroup'] },
    });
  }),

  http.get('http://127.0.0.1:8080/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged Out' });
  }),
];
