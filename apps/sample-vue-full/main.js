import '@common/vue';
import Antd from 'ant-design-vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';

import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/fraunces/900.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/700-italic.css';
import '@fontsource/dm-sans/300.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import './style/main.css'; // app overall custom style
import './msw.js'; // msw
import './pwa.js'; // pwa
import createSentry from './sentry.js'; // sentry

import '@common/web/bwc-loading-overlay'; // our own web components

import { version } from './package.json' with { type: 'json' };

console.log(`V${version}`);

const app = createApp(App);
createSentry(app, router); // add or remove your post createApp code here...
app.use(createPinia()); // state management

// NOSONAR
// https://zhuanlan.zhihu.com/p/135280049
// app.config.isCustomElement = (tag) => tag.startsWith('bwc-') || tag.startsWith('vcxwc-')

// avoid using provide & inject - reduce tech footprint
// app.use(createPinia()) // state management
app.use(router); // routing
app.use(Antd);

app.mount('#app');
