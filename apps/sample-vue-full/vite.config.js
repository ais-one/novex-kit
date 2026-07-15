import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

export default ({ command, mode }) => {
  // command = serve, build
  loadEnvFile(`.env.${mode}`);
  return {
    define: {
      __VUE_PROD_DEVTOOLS__: false,
    },
    base: process.env.BASE_PATH || '/', // set to '/vite' for dev:build, '/' otherwise
    build: {
      esbuildOptions: {
        // VITE uses esbuild by default
        drop: mode === 'production' ? ['console', 'debugger'] : [],
      },
      // sourcemap: true,
      // rollupOptions: {
      //   // external: [ 'react' ] // ignore react stuff
      //   input: {
      //     app: path.resolve(__dirname, 'index.html'),
      //     main: path.resolve(__dirname, 'index.html')
      //   }
      // }
    },
    optimizeDeps: {
      // include: ['apps/node_modules/leaflet'],
      // include: ['node_modules/leaflet'],
    },
    root: '.',
    // publicDir: 'public',
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: tag => tag.startsWith('bwc-') || tag.startsWith('vcxwc-'),
          },
        },
      }),
    ],
    resolve: {
      alias: {
        // https://github.com/vitejs/vite/issues/279#issuecomment-636110354
        '@common/vue': path.resolve(root, 'common/compiled/vue'),
        '@common/iso': path.resolve(root, 'common/vanilla/iso'),
        '@common/web': path.resolve(root, 'common/vanilla/web'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 8080,
    },
  };
};
