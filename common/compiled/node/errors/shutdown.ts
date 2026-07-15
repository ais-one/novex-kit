// NodeJS Application Error Handling
// **WebSockets/SSE:** You need to track connections manually and close them
// For WS, broadcast a "server shutting down" message, then close all clients before server.close().
const { NODE_ENV } = process.env;
const DEFAULT_SHUTFOWN_TIMEOUT_MS = NODE_ENV === 'production' ? 30000 : 3000;
const { GRACEFUL_EXIT = NODE_ENV !== 'development', SHUTDOWN_TIMEOUT_MS = DEFAULT_SHUTFOWN_TIMEOUT_MS } = process.env;

// both resolved lazily at shutdown time so setup() can be called before server/services are ready
// biome-ignore lint/suspicious/noExplicitAny: set via setup()
let _getServer: (() => any) | null = null;
// biome-ignore lint/suspicious/noExplicitAny: set via setup()
let _getServices: (() => any) | null = null;

let shuttingDown = false;

const gracefulShutdown = async signal => {
  if (shuttingDown) return; // prevent multiple signals from triggering multiple shutdowns
  shuttingDown = true;
  logger.info(`Cleanup initiated by signal: ${signal}`);
  setTimeout(() => {
    // give the LB time to notice the 503 and stop routing
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, Number(SHUTDOWN_TIMEOUT_MS));
  const server = _getServer?.();
  if (server) {
    server.close(async () => {
      const services = _getServices?.();
      if (services) await services.stop(); // promise all...
      logger.info('process exiting gracefully');
      process.exit(0);
    });
  }
};

/**
 * Register process signal handlers. Call as early as possible — both getters are
 * resolved only when shutdown fires, so neither server nor services need to exist yet.
 *   getServer   — lazy getter () => server (http.Server / https.Server)
 *   getServices — lazy getter () => services (object with a stop() method)
 */
// biome-ignore lint/suspicious/noExplicitAny: server and services shapes vary by app
export const setup = (getServer: () => any, getServices: () => any) => {
  _getServer = getServer;
  _getServices = getServices;

  if (GRACEFUL_EXIT) {
    ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
      process.on(signal, gracefulShutdown);
    }); // SIGKILL cannot be caught
    process.on('uncaughtException', (err, origin) => {
      logger.info(`Uncaught Exception - error: ${err} origin: ${origin}`);
      process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.info(`Unhandled Rejection - promise: ${promise} reason: ${reason}`);
      process.exit(1);
    });
  }
};

// error and signal
// export default (signalFn, exceptionFn) => {
//   const defaultExceptionFn = async (e, type) => {
//     // TODO REPLACE WITH logger
//     // logger.error(type, e.toString())
//     // process.emit("SIGTERM") // process.exit(0), process.kill(process.pid, task)
//   };
//   if (!exceptionFn) exceptionFn = defaultExceptionFn;
//   const exceptions = ['unhandledRejection', 'uncaughtException'];
//   exceptions.forEach(type => {
//     process.on(type, e => exceptionFn(e, type));
//   });

//   const defaultSignalFn = async type => {
//     // TODO REPLACE WITH logger
//     // logger.error(type)
//   };
//   if (!signalFn) signalFn = defaultSignalFn;
//   const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']; // SIGINT now works on windows
//   // if (process.platform === 'win32') {
//   //   import('readline').then(readline => readline.createInterface({ input: process.stdin, output: process.stdout }).on('SIGINT', () => process.emit('SIGINT')))
//   // }
//   signals.forEach(type => {
//     process.once(type, async () => {
//       const exitCode = await signalFn(type);
//       return Number.isInteger(exitCode) ? process.exit(parseInt(exitCode)) : process.exit(-10001); // should terminate the application
//     });
//   });
// };
