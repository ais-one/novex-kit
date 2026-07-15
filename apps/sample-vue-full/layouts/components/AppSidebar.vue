<template>
  <a-layout-sider
    :collapsed="collapsed"
    :trigger="null"
    collapsible
    :collapsed-width="0"
    :width="240"
    breakpoint="md"
    class="app-sidebar"
    @update:collapsed="$emit('update:collapsed', $event)"
    @breakpoint="(broken) => $emit('update:collapsed', broken)"
  >
    <div class="sidebar-brand" @click="$router.push('/')">
      <div class="brand-icon">{{ brandIcon }}</div>
      <Transition name="fade-label">
        <span v-if="!collapsed" class="brand-name">{{ brandName }}</span>
      </Transition>
    </div>

    <nav class="sidebar-nav">
      <a-menu
        theme="dark"
        mode="inline"
        v-model:selectedKeys="selectedKeys"
        class="sidebar-menu"
      >
        <template v-for="route in mappedRoutes" :key="route.path">
          <a-sub-menu v-if="route.submenu" :key="route.submenu">
            <template #title>{{ toPascalCase(route.submenu) }}</template>
            <a-menu-item
              v-for="menu in subMenus[route.submenu]"
              :key="`sm-${menu.path}`"
              @click="$router.push(menu)"
            >
              {{ menu.name }}
            </a-menu-item>
          </a-sub-menu>
          <a-menu-item
            v-else
            :key="`m-${route.path}`"
            @click="$router.push(route)"
          >
            {{ route.name }}
          </a-menu-item>
        </template>
      </a-menu>
    </nav>

    <div class="sidebar-footer">
      <a-button
        type="text"
        danger
        block
        data-cy="logout"
        class="logout-btn"
        @click="$emit('logout')"
      >
        <template #icon><LogoutOutlined /></template>
        <Transition name="fade-label">
          <span v-if="!collapsed">Logout</span>
        </Transition>
      </a-button>
    </div>
  </a-layout-sider>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icon used in Vue template
import { LogoutOutlined } from '@ant-design/icons-vue';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

defineProps({
  collapsed: { type: Boolean, required: true },
  mappedRoutes: { type: Array, required: true },
  subMenus: { type: Object, required: true },
  brandIcon: { type: String, default: 'N' },
  brandName: { type: String, default: 'novex' },
});

defineEmits(['update:collapsed', 'logout']);

const route = useRoute();
const selectedKeys = ref([]);

const toPascalCase = str => {
  str = str.replace(/-\w/g, x => ` ${x[1].toUpperCase()}`);
  return str[0].toUpperCase() + str.substring(1, str.length);
};

watch(
  () => route.path,
  path => {
    selectedKeys.value = [`m-${path}`];
  },
  { immediate: true },
);
</script>

<style>
.app-sidebar .ant-menu-dark { background: #07091a; }
.app-sidebar .ant-menu-dark.ant-menu-inline .ant-menu-sub.ant-menu-inline { background: #050712; }
.app-sidebar .ant-menu-dark .ant-menu-item { color: #94a3b8; border-radius: 8px; margin-inline: 8px; width: calc(100% - 16px); }
.app-sidebar .ant-menu-dark .ant-menu-item:hover { background: #13163d !important; color: #c7d2fe; }
.app-sidebar .ant-menu-dark .ant-menu-item-selected { background: #1a1f4a !important; color: #e0e7ff !important; }
.app-sidebar .ant-menu-dark .ant-menu-submenu-title { color: #94a3b8; border-radius: 8px; margin-inline: 8px; width: calc(100% - 16px); }
.app-sidebar .ant-menu-dark .ant-menu-submenu-title:hover { background: #13163d !important; color: #c7d2fe; }
.app-sidebar .ant-layout-sider-children { display: flex; flex-direction: column; background: #07091a; }
</style>

<style scoped>
.app-sidebar {
  background: #07091a !important;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  position: relative;
}

@media (max-width: 767px) {
  .app-sidebar {
    position: fixed !important;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 200;
  }
}

.app-sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(148, 163, 220, 0.1) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse 100% 60% at 50% 0%, black 40%, transparent 100%);
  pointer-events: none;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 20px 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.brand-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'DM Sans', sans-serif;
  font-weight: 900;
  font-size: 17px;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.4);
}

.brand-name {
  font-family: 'DM Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #dde4f5;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 0;
}

.sidebar-nav::-webkit-scrollbar { width: 4px; }
.sidebar-nav::-webkit-scrollbar-track { background: transparent; }
.sidebar-nav::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 4px; }

.sidebar-menu { border-inline-end: none !important; }

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

:deep(.logout-btn.ant-btn) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  height: 38px;
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #94a3b8 !important;
  padding: 0 12px;
}

:deep(.logout-btn.ant-btn:hover) {
  background: #1e0a0a !important;
  color: #fca5a5 !important;
}

.fade-label-enter-active,
.fade-label-leave-active { transition: opacity 0.15s ease; }
.fade-label-enter-from,
.fade-label-leave-to { opacity: 0; }
</style>
