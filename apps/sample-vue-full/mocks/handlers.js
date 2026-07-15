import { HttpResponse, http } from 'msw';

export default [
  http.get('http://127.0.0.1:8080/api/msw/test', () => {
    return HttpResponse.json({
      message: 'it works :)',
    });
  }),
  http.post('http://127.0.0.1:8080/api/auth/login', ({ request, params, cookies }) => {
    console.log('cookies ? :', cookies);
    return HttpResponse.json({ otp: 1 });
  }),
  http.post('http://127.0.0.1:8080/api/auth/otp', ({ request, params, cookies }) => {
    console.log(request.body); // {"id":1,"pin":"111111"}
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user_meta: {
        email: 'test',
        roles: ['TestGroup'],
      },
    });
  }),
  http.get('http://127.0.0.1:8080/api/auth/logout', () => {
    return HttpResponse.json({
      message: 'Logged Out',
    });
  }),
];
