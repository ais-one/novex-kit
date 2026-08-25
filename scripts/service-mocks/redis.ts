import Redis from 'ioredis-mock';

const redis = new Redis();

await redis.set('foo', 'bar');
const val = await redis.get('foo'); // 'bar'
