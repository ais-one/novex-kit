## Sentinel - Easier Setup

```js
import Redis from 'ioredis';

const redis = new Redis({
  sentinels: [
    { host: '192.168.1.1', port: 26379 },
    { host: '192.168.1.2', port: 26379 },
    { host: '192.168.1.3', port: 26379 },
  ],
  name: 'mymaster', // must match the sentinel monitor name
  role: 'master', // 'master' for writes, 'slave' for reads
  sentinelPassword: 'secret', // if sentinels are password-protected
  password: 'secret', // if Redis nodes are password-protected
  db: 0,

  // Sentinel-specific options
  sentinelRetryStrategy: times => Math.min(times * 100, 3000),
  failoverDetector: true, // faster failover detection
});
```

// Key points:

// name must match what's in your sentinel.conf (sentinel monitor <name> ...)
// ioredis automatically discovers the current master via Sentinel — you never hardcode the master IP
// Set role: 'slave' on a second client instance for read scaling

## Cluster - Harder Setup

```js
import { Cluster } from 'ioredis';

const redis = new Cluster(
  [
    // Just seed nodes — ioredis discovers the rest automatically
    { host: '192.168.1.1', port: 6379 },
    { host: '192.168.1.2', port: 6379 },
    { host: '192.168.1.3', port: 6379 },
  ],
  {
    clusterRetryStrategy: times => Math.min(times * 100, 3000),

    redisOptions: {
      password: 'secret', // applied to all nodes
      tls: {}, // if using TLS
    },

    scaleReads: 'slave', // 'master' | 'slave' | 'all'

    // How long to cache the cluster topology
    slotsRefreshTimeout: 2000,
    slotsRefreshInterval: 5000,
  },
);
```

Key points:

- You only need to provide a few seed nodes — ioredis fetches the full slot map via CLUSTER SLOTS
- scaleReads: 'slave' automatically routes read commands to replicas
- Multi-key commands (mget, mset, pipelines) must target the same hash slot — use hash tags to ensure this:

```js
// These will be in the same slot because {user:123} is the hash tag
await redis.mset('{user:123}:name', 'Alice', '{user:123}:age', '30');
await redis.mget('{user:123}:name', '{user:123}:age');
```


### Read/Write Splitting Pattern (both modes)

```js
// Sentinel

const master = new Redis({ sentinels: [...], name: 'mymaster', role: 'master' });
const replica = new Redis({ sentinels: [...], name: 'mymaster', role: 'slave' });

// Cluster
const cluster = new Cluster([...], { scaleReads: 'slave' });

// Write always goes to master, reads distributed to replicas
await master.set('key', 'value');
await replica.get('key');
```
