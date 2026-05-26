<template>
  <div class="dashboard">

    <!-- ── Stats row ── -->
    <a-row :gutter="[16, 16]">
      <a-col v-for="stat in stats" :key="stat.title" :xs="24" :sm="12" :xl="6">
        <StatCard v-bind="stat" />
      </a-col>
    </a-row>

    <!-- ── Main content ── -->
    <a-row :gutter="[16, 16]" style="margin-top: 16px">

      <!-- Left column -->
      <a-col :xs="24" :xl="16">
        <a-row :gutter="[16, 16]">

          <!-- Team Members -->
          <a-col :span="24">
            <a-card :bordered="false" class="dash-card">
              <template #title>
                <div class="card-title-row">
                  <component :is="templateIcons.TeamOutlined" class="card-title-icon" />
                  <span>Team Members</span>
                  <a-badge :count="members.length" :number-style="{ background: '#4f46e5' }" />
                </div>
              </template>
              <template #extra>
                <a-button type="link" size="small">View all</a-button>
              </template>
              <a-list :grid="{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 3 }" :data-source="members">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <MemberCard
                      :name="item.name"
                      :role="item.role"
                      :avatar-color="item.color"
                      :tag-color="item.tagColor"
                    />
                  </a-list-item>
                </template>
              </a-list>
            </a-card>
          </a-col>

          <!-- Comments -->
          <a-col :span="24">
            <a-card :bordered="false" class="dash-card">
              <template #title>
                <div class="card-title-row">
                  <component :is="templateIcons.CommentOutlined" class="card-title-icon" />
                  <span>Comments</span>
                </div>
              </template>
              <template #extra>
                <a-button type="primary" size="small" ghost>
                  <template #icon><component :is="templateIcons.PlusOutlined" /></template>
                  Add
                </a-button>
              </template>
              <a-list item-layout="horizontal" :data-source="comments" :split="true">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <template #actions>
                      <a-button type="text" size="small" @click="likeComment(item.id)">
                        <template #icon><component :is="templateIcons.LikeOutlined" /></template>
                        {{ item.likes }}
                      </a-button>
                      <a-button type="text" size="small">
                        <template #icon><component :is="templateIcons.MessageOutlined" /></template>
                        Reply
                      </a-button>
                    </template>
                    <a-list-item-meta>
                      <template #avatar>
                        <a-avatar :style="{ background: item.color, fontFamily: 'DM Sans, sans-serif', fontWeight: 700 }">
                          {{ item.initials }}
                        </a-avatar>
                      </template>
                      <template #title>
                        <div class="comment-title-row">
                          <span class="comment-author">{{ item.author }}</span>
                          <a-tag :color="item.tagColor" style="font-size:11px">{{ item.role }}</a-tag>
                          <span class="comment-time">{{ item.time }}</span>
                        </div>
                      </template>
                      <template #description>
                        <a-typography-paragraph :ellipsis="{ rows: 2, expandable: true, symbol: 'more' }" :content="item.content" />
                      </template>
                    </a-list-item-meta>
                  </a-list-item>
                </template>
              </a-list>
            </a-card>
          </a-col>

        </a-row>
      </a-col>

      <!-- Right column -->
      <a-col :xs="24" :xl="8">
        <a-row :gutter="[16, 16]">

          <!-- Useful Links -->
          <a-col :span="24">
            <a-card :bordered="false" class="dash-card">
              <template #title>
                <div class="card-title-row">
                  <component :is="templateIcons.LinkOutlined" class="card-title-icon" />
                  <span>Useful Links</span>
                </div>
              </template>
              <a-list size="small" :data-source="usefulLinks" :split="false">
                <template #renderItem="{ item }">
                  <a-list-item class="link-item">
                    <div class="link-icon-wrap" :style="{ background: item.bg }">
                      <component :is="item.icon" :style="{ color: item.color }" />
                    </div>
                    <div class="link-body">
                      <a :href="item.url" target="_blank" rel="noopener" class="link-title">
                        {{ item.title }}
                      </a>
                      <span class="link-desc">{{ item.desc }}</span>
                    </div>
                    <component :is="templateIcons.LinkOutlined" class="link-arrow" />
                  </a-list-item>
                </template>
              </a-list>
            </a-card>
          </a-col>

          <!-- Announcements -->
          <a-col :span="24">
            <a-card :bordered="false" class="dash-card">
              <template #title>
                <div class="card-title-row">
                  <component :is="templateIcons.NotificationOutlined" class="card-title-icon" />
                  <span>Announcements</span>
                  <a-badge :count="announcements.filter(a => !a.read).length" :number-style="{ background: '#4f46e5' }" />
                </div>
              </template>
              <a-timeline class="announcement-timeline">
                <a-timeline-item
                  v-for="item in announcements"
                  :key="item.id"
                  :color="item.color"
                >
                  <div class="announcement-item" :class="{ 'announcement-item--unread': !item.read }">
                    <div class="announcement-head">
                      <a-tag :color="item.tagColor" style="font-size:11px;margin:0">{{ item.type }}</a-tag>
                      <span class="announcement-time">{{ item.time }}</span>
                    </div>
                    <p class="announcement-title">{{ item.title }}</p>
                    <p class="announcement-body">{{ item.body }}</p>
                  </div>
                </a-timeline-item>
              </a-timeline>
            </a-card>
          </a-col>

        </a-row>
      </a-col>

    </a-row>
  </div>
</template>

<script setup>
/* ── Icon refs used in template (explicit for Biome) ── */
import {
  BookOutlined,
  BugOutlined,
  CodeOutlined,
  CommentOutlined,
  DollarOutlined,
  FileTextOutlined,
  GithubOutlined,
  LikeOutlined,
  LinkOutlined,
  MessageOutlined,
  NotificationOutlined,
  PlusOutlined,
  RiseOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { markRaw, ref } from 'vue';
// biome-ignore lint/correctness/noUnusedImports: component used in Vue template
import MemberCard from '../components/MemberCard.vue';
// biome-ignore lint/correctness/noUnusedImports: component used in Vue template
import StatCard from '../components/StatCard.vue';

const templateIcons = markRaw({
  CommentOutlined,
  LikeOutlined,
  LinkOutlined,
  MessageOutlined,
  NotificationOutlined,
  PlusOutlined,
  TeamOutlined,
});

/* ── Stats ── */
const stats = [
  {
    title: 'Feedback',
    value: 11.28,
    precision: 2,
    suffix: '%',
    trend: 'up',
    footer: '+4.6% from last month',
    icon: RiseOutlined,
    iconBg: '#dcfce7',
  },
  {
    title: 'Idle',
    value: 9.3,
    precision: 2,
    suffix: '%',
    trend: 'down',
    footer: '-1.2% from last month',
    icon: ThunderboltOutlined,
    iconBg: '#fee2e2',
  },
  {
    title: 'Active Users',
    value: 112893,
    trend: null,
    footer: '+2,340 this week',
    icon: UserOutlined,
    iconBg: '#eef2ff',
  },
  {
    title: 'Account Balance (CNY)',
    value: 112893,
    precision: 2,
    trend: null,
    footer: 'Updated just now',
    icon: DollarOutlined,
    iconBg: '#fef9c3',
  },
];

/* ── Team members ── */
const members = [
  { name: 'Faith Tan', role: 'Full-stack Dev', color: '#4f46e5', tagColor: 'purple' },
  { name: 'Hope Lee', role: 'Data Scientist', color: '#0ea5e9', tagColor: 'blue' },
  { name: 'Charity Wong', role: 'Data Engineer', color: '#10b981', tagColor: 'green' },
  { name: 'Love Chen', role: 'Data Scientist', color: '#f59e0b', tagColor: 'gold' },
];

/* ── Comments ── */
const comments = ref([
  {
    id: 1,
    author: 'Faith Tan',
    initials: 'FT',
    role: 'Full-stack Dev',
    color: '#4f46e5',
    tagColor: 'purple',
    content:
      'The new dashboard layout looks great! Really improves the data visibility for the team. Can we also add a date range filter?',
    time: '2 hours ago',
    likes: 5,
  },
  {
    id: 2,
    author: 'Hope Lee',
    initials: 'HL',
    role: 'Data Scientist',
    color: '#0ea5e9',
    tagColor: 'blue',
    content:
      'Agreed. The stat cards are much cleaner now. I think we should consider adding sparkline charts inside each card to show the trend over time.',
    time: '1 hour ago',
    likes: 3,
  },
  {
    id: 3,
    author: 'Charity Wong',
    initials: 'CW',
    role: 'Data Engineer',
    color: '#10b981',
    tagColor: 'green',
    content:
      'Pipeline ran successfully overnight. All 14 jobs completed without errors. Data is fresh as of 06:00 UTC.',
    time: '30 min ago',
    likes: 7,
  },
]);

const likeComment = id => {
  const c = comments.value.find(c => c.id === id);
  if (c) c.likes++;
};

/* ── Useful Links ── */
const usefulLinks = [
  {
    title: 'Documentation',
    desc: 'Project docs and API reference',
    url: '#',
    icon: BookOutlined,
    color: '#4f46e5',
    bg: '#eef2ff',
  },
  {
    title: 'GitHub Repo',
    desc: 'Source code and pull requests',
    url: '#',
    icon: GithubOutlined,
    color: '#0f172a',
    bg: '#f1f5f9',
  },
  {
    title: 'API Playground',
    desc: 'Test endpoints interactively',
    url: '#',
    icon: CodeOutlined,
    color: '#0ea5e9',
    bg: '#e0f2fe',
  },
  {
    title: 'Release Notes',
    desc: 'Changelog and version history',
    url: '#',
    icon: FileTextOutlined,
    color: '#10b981',
    bg: '#dcfce7',
  },
  {
    title: 'Bug Tracker',
    desc: 'Report and track issues',
    url: '#',
    icon: BugOutlined,
    color: '#ef4444',
    bg: '#fee2e2',
  },
];

/* ── Announcements ── */
const announcements = ref([
  {
    id: 1,
    type: 'Release',
    tagColor: 'purple',
    color: '#4f46e5',
    title: 'v0.7.0 released',
    body: 'New sidebar layout, reusable StatCard and MemberCard components, and ADV-based header with notifications and chat.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: 2,
    type: 'Maintenance',
    tagColor: 'orange',
    color: '#f59e0b',
    title: 'Scheduled downtime — 22 May 02:00 UTC',
    body: 'Database migration for the audit log table. Expected duration: 15 minutes. No data loss expected.',
    time: 'Yesterday',
    read: false,
  },
  {
    id: 3,
    type: 'Update',
    tagColor: 'blue',
    color: '#0ea5e9',
    title: 'CDN dependencies updated',
    body: 'Vue upgraded to 3.5.34, vue-router to 4.6.4, Bulma to 0.9.4. SRI hashes refreshed across all CDN links.',
    time: '3 days ago',
    read: true,
  },
  {
    id: 4,
    type: 'Security',
    tagColor: 'red',
    color: '#ef4444',
    title: 'SRI enforcement enabled',
    body: 'All external CDN resources now require Subresource Integrity attributes. Review your custom scripts if any.',
    time: '1 week ago',
    read: true,
  },
]);
</script>

<style scoped>
.dashboard {
  font-family: 'DM Sans', sans-serif;
}

:deep(.dash-card) {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  height: 100%;
}

:deep(.dash-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 48px;
}

:deep(.dash-card .ant-card-head-title) {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  padding: 12px 0;
}

:deep(.dash-card .ant-card-body) {
  padding: 16px 20px 20px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title-icon {
  color: #4f46e5;
  font-size: 15px;
}

.comment-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.comment-author {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.comment-time {
  font-size: 12px;
  color: #94a3b8;
  margin-left: auto;
}

:deep(.ant-list-item-action li) {
  padding: 0;
}

/* ── Useful Links ── */
:deep(.link-item.ant-list-item) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
}

:deep(.link-item.ant-list-item:hover) {
  background: #f8fafc;
  padding-left: 6px;
  padding-right: 6px;
}

.link-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.link-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.link-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  text-decoration: none;
  transition: color 0.15s;
}

.link-title:hover {
  color: #4f46e5;
}

.link-desc {
  font-size: 12px;
  color: #94a3b8;
}

.link-arrow {
  color: #cbd5e1;
  font-size: 12px;
  flex-shrink: 0;
}

/* ── Announcements ── */
.announcement-timeline {
  padding-top: 4px;
}

:deep(.announcement-timeline.ant-timeline) {
  margin-bottom: -24px;
}

.announcement-item {
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  transition: border-color 0.15s;
}

.announcement-item--unread {
  background: #fafafe;
  border-color: #e0e7ff;
}

.announcement-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.announcement-time {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  color: #94a3b8;
}

.announcement-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
}

.announcement-body {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}
</style>
