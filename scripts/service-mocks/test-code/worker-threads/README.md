## References

- https://www.section.io/engineering-education/nodejs-worker-thread/
- https://livecodestream.dev/post/how-to-work-with-worker-threads-in-nodejs/
- https://medium.com/codex/achieve-the-best-performance-10x-faster-node-js-with-worker-threads-97fc2890e40f
  - https://github.com/GaetanoPiazzolla/nodejs-worker-performance
- https://blog.logrocket.com/real-time-processing-web-workers/

The codes in this **worker-threads** folder are lifted from the above references

## Notes

- worker thread useful for CPU intensive operations (not for I/O intensive as native nodejs handles it well)
- creating and destruction of thread is resource heavy
- thread pool still has time overheads, faster is pre-allocate array of threads

## Sample Codes from above reference

```js
// index.js
const { Worker } = require('worker_threads');

let number = 10;

const worker = new Worker('./myWorker.js', { workerData: { num: number } });

worker.once('message', result => {
  console.log(`${number}th Fibonacci No: ${result}`);
});

worker.on('error', error => {
  console.log(error);
});

worker.on('exit', exitCode => {
  console.log(`It exited with code ${exitCode}`);
});

console.log('Execution in main thread');
```

```js
// worker.js
const { parentPort, workerData } = require('worker_threads');

parentPort.postMessage(getFibonacciNumber(workerData.num));

function getFibonacciNumber(num) {
  if (num === 0) {
    return 0;
  } else if (num === 1) {
    return 1;
  } else {
    return getFibonacciNumber(num - 1) + getFibonacciNumber(num - 2);
  }
}
```
