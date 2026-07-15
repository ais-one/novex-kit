<template>
  <a-layout class="secure-layout">
    <bwc-loading-overlay v-if="loading" />
    <a-back-top />

    <AppSidebar
      v-model:collapsed="collapsed"
      :mapped-routes="mappedRoutes"
      :sub-menus="subMenus"
      brand-icon="N"
      brand-name="novex"
      @logout="logout"
    />

    <Transition name="backdrop-fade">
      <div v-if="!collapsed" class="mobile-backdrop" @click="collapsed = true" />
    </Transition>

    <a-layout class="main-layout">
      <AppHeader
        v-model:collapsed="collapsed"
        :notifications="notifications"
        :messages="messages"
        user-label="U"
        @logout="logout"
        @notif-read="markNotifRead"
        @notif-read-all="markAllNotifsRead"
        @message-read="markMessageRead"
        @message-read-all="markAllMessagesRead"
      />

      <a-layout-content class="main-content">
        <router-view :key="$route.fullPath" />
      </a-layout-content>

      <AppFooter brand="novex" />
    </a-layout>
  </a-layout>
</template>

<script setup>
import idleTimer from '@common/web/idle';
import { computed, onBeforeUnmount, onMounted, onUnmounted, reactive, ref } from 'vue';
import { onLogin, onLogout } from '../setups/events.js';
import { SECURE_ROUTES } from '../setups/routes.js';
import { useMainStore } from '../store.js';
// biome-ignore lint/correctness/noUnusedImports: components used in Vue template
import AppFooter from './components/AppFooter.vue';
// biome-ignore lint/correctness/noUnusedImports: components used in Vue template
import AppHeader from './components/AppHeader.vue';
// biome-ignore lint/correctness/noUnusedImports: components used in Vue template
import AppSidebar from './components/AppSidebar.vue';

const store = useMainStore();
const mappedRoutes = reactive([]);
const subMenus = reactive({});
const loading = computed(() => store.loading);
const collapsed = ref(false);

/* ── Notifications ── */
const notifications = ref([
  { id: 1, message: 'New user registered', time: '2 min ago', read: false },
  { id: 2, message: 'Server deployment completed', time: '1 hr ago', read: false },
  { id: 3, message: 'Weekly report is ready', time: 'Yesterday', read: true },
]);

const markNotifRead = id => {
  const n = notifications.value.find(n => n.id === id);
  if (n) n.read = true;
};

const markAllNotifsRead = () => {
  notifications.value.forEach(n => {
    n.read = true;
  });
};

/* ── Messages ── */
const messages = ref([
  { id: 1, name: 'Aaron Gong', initials: 'AG', preview: 'Can you review the PR?', time: '5 min ago', read: false },
  { id: 2, name: 'Tech Lead', initials: 'TL', preview: 'Deploy is ready for staging', time: '30 min ago', read: false },
  { id: 3, name: 'System', initials: 'SY', preview: 'Scheduled maintenance tonight', time: '2 hr ago', read: true },
]);

const markMessageRead = id => {
  const m = messages.value.find(m => m.id === id);
  if (m) m.read = true;
};

const markAllMessagesRead = () => {
  messages.value.forEach(m => {
    m.read = true;
  });
};

/* ── Routes ── */
onMounted(async () => {
  console.log('SECURE mounted!');
  idleTimer.timeouts.push({ time: 300, fn: () => alert('Idle Timeout Test'), stop: true });
  idleTimer.start();

  SECURE_ROUTES.filter(route => !route.hidden).forEach(route => {
    const pathLen = route.path.split('/').length;
    if (pathLen === 2 || pathLen === 3) {
      const submenu = pathLen === 3 ? route.path.split('/', 2)[1] : '';
      if (submenu) {
        if (!subMenus[submenu]) {
          subMenus[submenu] = [];
          mappedRoutes.push({ ...route, submenu });
        }
        subMenus[submenu].push({ ...route });
      } else {
        mappedRoutes.push({ ...route, submenu: '' });
      }
    }
  });
  onLogin?.();
});

onUnmounted(() => {
  console.log('SECURE unmounted');
});

onBeforeUnmount(() => {
  idleTimer.stop();
  onLogout?.();
});

const logout = async () => {
  console.time('time-logout');
  store.loading = true;
  await store.doLogin(null);
  store.loading = false;
  console.timeEnd('time-logout');
};
</script>

<style scoped>
.secure-layout {
  min-height: 100vh;
  background: #f1f5f9;
}

.main-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f1f5f9;
}

.mobile-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 199;
}

.backdrop-fade-enter-active,
.backdrop-fade-leave-active { transition: opacity 0.2s ease; }
.backdrop-fade-enter-from,
.backdrop-fade-leave-to { opacity: 0; }

@media (max-width: 767px) {
  .mobile-backdrop { display: block; }
  .main-content { padding: 16px; }
}
</style>
