<template>
  <a-layout-header class="app-header">

    <!-- Left: toggle + breadcrumb -->
    <div class="header-left">
      <a-button type="text" class="toggle-btn" @click="$emit('update:collapsed', !collapsed)">
        <template #icon>
          <MenuUnfoldOutlined v-if="collapsed" />
          <MenuFoldOutlined v-else />
        </template>
      </a-button>

      <a-breadcrumb class="header-breadcrumb">
        <a-breadcrumb-item>
          <router-link to="/dashboard">Home</router-link>
        </a-breadcrumb-item>
        <a-breadcrumb-item v-if="currentRoute.name">
          {{ currentRoute.name }}
        </a-breadcrumb-item>
      </a-breadcrumb>
    </div>

    <!-- Right: search, chat, bell, divider, user -->
    <div class="header-right">

      <!-- Search -->
      <Transition name="search-switch" mode="out-in">
        <a-input
          v-if="searchOpen"
          key="search"
          ref="searchInputRef"
          v-model:value="searchQuery"
          placeholder="Search..."
          class="search-input-field"
          @keydown.esc="closeSearch"
        >
          <template #prefix><SearchOutlined /></template>
          <template #suffix>
            <a-button type="text" size="small" class="search-close-btn" @click="closeSearch">
              <template #icon><CloseOutlined /></template>
            </a-button>
          </template>
        </a-input>
        <a-button v-else key="search-btn" type="text" class="icon-btn" @click="openSearch">
          <template #icon><SearchOutlined /></template>
        </a-button>
      </Transition>

      <!-- Chat -->
      <a-popover trigger="click" placement="bottomRight" :overlay-inner-style="{ padding: 0 }" :overlay-style="{ width: '320px' }">
        <template #content>
          <div class="panel-head">
            <span class="panel-title">Messages</span>
            <a-button v-if="unreadMessages" type="link" size="small" @click="emit('message-read-all')">
              Mark all read
            </a-button>
          </div>
          <a-list size="small" :data-source="messages" class="panel-list">
            <template #renderItem="{ item }">
              <a-list-item class="panel-item" :class="{ 'panel-item--unread': !item.read }" @click="emit('message-read', item.id)">
                <a-list-item-meta>
                  <template #avatar>
                    <a-badge :dot="!item.read" color="#4f46e5">
                      <a-avatar class="chat-avatar">{{ item.initials }}</a-avatar>
                    </a-badge>
                  </template>
                  <template #title>
                    <div class="chat-title-row">
                      <span class="chat-name">{{ item.name }}</span>
                      <span class="item-time">{{ item.time }}</span>
                    </div>
                  </template>
                  <template #description>{{ item.preview }}</template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </template>
        <a-badge :count="unreadMessages" :overflow-count="9">
          <a-button type="text" class="icon-btn" aria-label="Messages">
            <template #icon><MessageOutlined /></template>
          </a-button>
        </a-badge>
      </a-popover>

      <!-- Notifications -->
      <a-popover trigger="click" placement="bottomRight" :overlay-inner-style="{ padding: 0 }" :overlay-style="{ width: '320px' }">
        <template #content>
          <div class="panel-head">
            <span class="panel-title">Notifications</span>
            <a-button v-if="unreadCount" type="link" size="small" @click="emit('notif-read-all')">
              Mark all read
            </a-button>
          </div>
          <a-list size="small" :data-source="notifications" class="panel-list">
            <template #renderItem="{ item }">
              <a-list-item class="panel-item" :class="{ 'panel-item--unread': !item.read }" @click="emit('notif-read', item.id)">
                <a-list-item-meta :description="item.time">
                  <template #avatar>
                    <div class="notif-dot" :class="{ 'notif-dot--active': !item.read }" />
                  </template>
                  <template #title>{{ item.message }}</template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </template>
        <a-badge :count="unreadCount" :overflow-count="9">
          <a-button type="text" class="icon-btn" aria-label="Notifications">
            <template #icon><BellOutlined /></template>
          </a-button>
        </a-badge>
      </a-popover>

      <a-divider type="vertical" class="header-divider" />

      <!-- User dropdown -->
      <a-dropdown trigger="click" placement="bottomRight">
        <a-avatar class="user-avatar">{{ userLabel }}</a-avatar>
        <template #overlay>
          <a-menu>
            <a-menu-item key="profile">
              <UserOutlined style="margin-right:8px" />Profile
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="logout" class="logout-item" @click="$emit('logout')">
              <LogoutOutlined style="margin-right:8px" />Logout
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

    </div>
  </a-layout-header>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icons used in Vue template
import {
  BellOutlined,
  CloseOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { computed, nextTick, ref } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  collapsed: { type: Boolean, required: true },
  notifications: { type: Array, default: () => [] },
  messages: { type: Array, default: () => [] },
  userLabel: { type: String, default: 'U' },
});

const emit = defineEmits([
  'update:collapsed',
  'logout',
  'notif-read',
  'notif-read-all',
  'message-read',
  'message-read-all',
]);

const route = useRoute();
const currentRoute = computed(() => route);

/* ── Search ── */
const searchOpen = ref(false);
const searchQuery = ref('');
const searchInputRef = ref(null);

const openSearch = async () => {
  searchOpen.value = true;
  await nextTick();
  searchInputRef.value?.focus();
};

const closeSearch = () => {
  searchOpen.value = false;
  searchQuery.value = '';
};

/* ── Computed counts ── */
const unreadCount = computed(() => props.notifications.filter(n => !n.read).length);
const unreadMessages = computed(() => props.messages.filter(m => !m.read).length);
</script>

<style scoped>
/* ── Layout ── */
.app-header {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  background: #ffffff !important;
  padding: 0 16px 0 8px !important;
  height: 56px !important;
  line-height: normal !important;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
  overflow: hidden;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  margin-left: 8px;
}

/* ── Toggle & icon buttons ── */
:deep(.toggle-btn.ant-btn),
:deep(.icon-btn.ant-btn) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #64748b;
  border-radius: 8px;
  flex-shrink: 0;
}

:deep(.toggle-btn.ant-btn:hover),
:deep(.icon-btn.ant-btn:hover) {
  background: #f1f5f9 !important;
  color: #4f46e5 !important;
}

.header-breadcrumb {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  overflow: hidden;
  white-space: nowrap;
  min-width: 0;
}

:deep(.header-breadcrumb .ant-breadcrumb-link a) {
  color: #64748b;
  text-decoration: none;
}

:deep(.header-breadcrumb .ant-breadcrumb-link a:hover) {
  color: #4f46e5;
}

:deep(.header-breadcrumb .ant-breadcrumb-link) {
  color: #1e293b;
  font-weight: 500;
}

:deep(.header-breadcrumb .ant-breadcrumb-separator) {
  color: #64748b;
}

/* ── Search input ── */
:deep(.search-input-field.ant-input-affix-wrapper) {
  height: 36px;
  border-radius: 9px;
  border: 1.5px solid #a5b4fc;
  background: #f8fafc;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  width: 200px;
  flex-shrink: 1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  transition: border-color 0.15s, box-shadow 0.15s;
}

:deep(.search-input-field.ant-input-affix-wrapper:focus-within) {
  border-color: #4f46e5 !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
  background: #fff;
}

:deep(.search-input-field .ant-input) {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  background: transparent;
}

:deep(.search-input-field .ant-input-prefix) {
  color: #64748b;
  margin-right: 6px;
}

.search-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.search-close-btn.ant-btn) {
  width: 20px;
  height: 20px;
  min-width: 20px;
  color: #64748b;
  padding: 0;
  border-radius: 4px;
}

:deep(.search-close-btn.ant-btn:hover) {
  color: #b91c1c !important;
  background: #fef2f2 !important;
}

/* prevent right-side items from ever shrinking */
.header-right > * {
  flex-shrink: 0;
}

/* ── Popover badge ── */
:deep(.ant-badge-count) {
  box-shadow: 0 0 0 2px #fff;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
}

/* ── Divider ── */
:deep(.header-divider.ant-divider-vertical) {
  height: 20px;
  border-color: #e2e8f0;
  margin: 0;
}

/* ── User avatar ── */
:deep(.user-avatar.ant-avatar) {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  font-family: 'DM Sans', sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: box-shadow 0.15s;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px;
  line-height: 32px;
  font-size: 13px;
  flex-shrink: 0;
}

:deep(.user-avatar.ant-avatar:hover) {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}

/* ── Dropdown logout item ── */
:deep(.logout-item) {
  color: #dc2626 !important;
}

:deep(.logout-item:hover) {
  background: #fef2f2 !important;
}

/* ── Popover panel shared ── */
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #f1f5f9;
}

.panel-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

:deep(.panel-list .ant-list-item) {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.12s;
}

:deep(.panel-list .ant-list-item:hover) {
  background: #f8fafc;
}

:deep(.panel-item--unread .ant-list-item-meta-title) {
  font-weight: 600;
  color: #0f172a;
}

:deep(.panel-list .ant-list-item-meta-description) {
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Chat items ── */
:deep(.chat-avatar.ant-avatar) {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
}

.chat-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.chat-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.item-time {
  font-size: 11px;
  color: #64748b;
  flex-shrink: 0;
}

/* ── Notification dot ── */
.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  margin-top: 6px;
  flex-shrink: 0;
}

.notif-dot--active {
  background: #4f46e5;
}

/* ── Search transition ── */
.search-switch-enter-active,
.search-switch-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.search-switch-enter-from,
.search-switch-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

/* ── Mobile ── */
@media (max-width: 767px) {
  .app-header {
    padding: 0 12px 0 8px !important;
  }

  .header-breadcrumb {
    display: none;
  }
}
</style>
