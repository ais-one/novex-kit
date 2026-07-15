import Redis from 'ioredis-mock';

const redis = new Redis();

await redis.set('foo', 'bar');
const val = await redis.get('foo'); // 'bar'

// // Jest setup
// afterEach(async () => {
//   await new Redis().flushall();
// });

// // vitest.config.js or jest.config.js
// vi.mock('ioredis', () => {
//   const Redis = require('ioredis-mock');
//   return { default: Redis };
// });
