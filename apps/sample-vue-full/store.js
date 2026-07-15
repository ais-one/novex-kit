import { auth, http } from '@common/vue/plugins/fetch.js';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import router from './router.js';

// import aaa from 'https://unpkg.com/swrv@0.3.0/esm/index.js' - will error

const { VITE_INITIAL_SECURE_PATH, VITE_INITIAL_PUBLIC_PATH } = import.meta.env;

// name of the store
// it is used in devtools and allows restoring state
export const useMainStore = defineStore('main', () => {
  const user = ref(null);
  const loading = ref(false);

  // actions
  async function doLogin(payload) {
    if (payload) {
      if (payload.forced) {
        //  forced - refresh token error
        user.value = null;
        await router.push(VITE_INITIAL_PUBLIC_PATH);
      } else {
        // sign in ok
        user.value = { ...payload };
        await router.push(VITE_INITIAL_SECURE_PATH);
      }
    } else {
      // sign in failed
      // console.log('payload forced === false')
      const { VITE_LOGOUT_URL } = import.meta.env;
      try {
        if (VITE_LOGOUT_URL) await auth.get(VITE_LOGOUT_URL);
        user.value = null;
        await router.push(VITE_INITIAL_PUBLIC_PATH);
      } catch (e) {
        if (e.toString() === 'TypeError: Failed to fetch' || (e.data && e.data.message !== 'Token Expired Error')) {
          user.value = null;
          await router.push(VITE_INITIAL_PUBLIC_PATH);
        }
      }
    }
  }
  function updateUser(payload) {
    user.value = { ...user.value, ...payload };
  }
  return { user, loading, doLogin, updateUser };
});

export const useAppStore = defineStore('app', {
  // it is used in devtools and allows restoring state
  // a function that returns a fresh state
  state: () => ({
    counter: 5,
    form: {
      delivery: true,
      date1: '2021-04-01',
    },
    message: 'No Message From WS', // for testing websockets
  }),
  // optional getters
  getters: {
    doubleCount() {
      return this.counter * 2;
    },
    doubleCountPlusOne() {
      return this.doubleCount * 2 + 1; // use getters in other getters
    },
  },
  // optional actions
  actions: {
    reset() {
      this.counter = 0; // `this` is the store instance
    },
  },
});
