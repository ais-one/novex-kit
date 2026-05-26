<template>
  <div class="demo-card">
    <a-row :gutter="[16, 16]">

      <!-- Section: Basic Cards -->
      <a-col :span="24">
        <a-typography-title :level="5" class="section-title">Basic Cards</a-typography-title>
      </a-col>

      <a-col :xs="24" :sm="8">
        <a-card :bordered="true" class="base-card">
          <template #title>
            <div class="card-title-row"><component :is="icons.FileTextOutlined" class="card-title-icon" /><span>Bordered</span></div>
          </template>
          <p class="card-body-text">Default card with visible border. Good for clear visual grouping on white backgrounds.</p>
          <template #extra><a-tag color="blue">Default</a-tag></template>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="8">
        <a-card :bordered="false" class="base-card shadow-card">
          <template #title>
            <div class="card-title-row"><component :is="icons.AppstoreOutlined" class="card-title-icon" /><span>Shadow</span></div>
          </template>
          <p class="card-body-text">Borderless card with box shadow. Works well on light gray page backgrounds.</p>
          <template #extra><a-tag color="purple">Shadowless border</a-tag></template>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="8">
        <a-card hoverable class="base-card">
          <template #title>
            <div class="card-title-row"><component :is="icons.ThunderboltOutlined" class="card-title-icon" /><span>Hoverable</span></div>
          </template>
          <p class="card-body-text">Lift effect on hover. Useful for clickable card grids like product or media listings.</p>
          <template #extra><a-tag color="green">Hover me</a-tag></template>
        </a-card>
      </a-col>

      <!-- Section: Cover Cards -->
      <a-col :span="24">
        <a-typography-title :level="5" class="section-title">Cover Cards</a-typography-title>
      </a-col>

      <a-col v-for="item in coverCards" :key="item.id" :xs="24" :sm="12" :lg="6">
        <a-card hoverable class="cover-card">
          <template #cover>
            <div class="card-cover" :style="{ background: item.gradient }">
              <component :is="item.icon" class="cover-icon" />
            </div>
          </template>
          <template #actions>
            <a-tooltip title="Settings"><component :is="icons.SettingOutlined" /></a-tooltip>
            <a-tooltip title="Edit"><component :is="icons.EditOutlined" /></a-tooltip>
            <a-tooltip title="More"><component :is="icons.EllipsisOutlined" /></a-tooltip>
          </template>
          <a-card-meta :title="item.title" :description="item.desc">
            <template #avatar>
              <a-avatar :style="{ background: item.avatarBg }">{{ item.initials }}</a-avatar>
            </template>
          </a-card-meta>
        </a-card>
      </a-col>

      <!-- Section: Stat Cards -->
      <a-col :span="24">
        <a-typography-title :level="5" class="section-title">Statistic Cards</a-typography-title>
      </a-col>

      <a-col v-for="stat in statCards" :key="stat.title" :xs="12" :sm="6">
        <a-card :bordered="false" class="stat-card">
          <a-statistic
            :title="stat.title"
            :value="stat.value"
            :precision="stat.precision"
            :prefix="stat.prefix"
            :suffix="stat.suffix"
            :value-style="{ color: stat.color, fontWeight: 700, fontSize: '20px' }"
          />
          <div class="stat-footer">
            <component :is="stat.trend === 'up' ? icons.ArrowUpOutlined : icons.ArrowDownOutlined"
              :style="{ color: stat.trend === 'up' ? '#16a34a' : '#dc2626', fontSize: '12px' }"
            />
            <span :style="{ color: stat.trend === 'up' ? '#16a34a' : '#dc2626', fontSize: '12px', marginLeft: '4px' }">
              {{ stat.change }}
            </span>
            <span class="stat-sub">vs last month</span>
          </div>
        </a-card>
      </a-col>

      <!-- Section: Tabs Card + Inner Card -->
      <a-col :xs="24" :lg="14">
        <a-card :bordered="false" class="base-card shadow-card">
          <template #title>
            <div class="card-title-row"><component :is="icons.ProfileOutlined" class="card-title-icon" /><span>Tabbed Card</span></div>
          </template>
          <a-tabs v-model:activeKey="activeTab" size="small">
            <a-tab-pane key="recent" tab="Recent">
              <a-list size="small" :data-source="recentItems">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta :description="item.time">
                      <template #title>{{ item.title }}</template>
                      <template #avatar>
                        <a-avatar :style="{ background: item.color }" size="small">{{ item.initials }}</a-avatar>
                      </template>
                    </a-list-item-meta>
                    <template #actions>
                      <a-tag :color="item.tag.color" style="font-size:11px">{{ item.tag.label }}</a-tag>
                    </template>
                  </a-list-item>
                </template>
              </a-list>
            </a-tab-pane>
            <a-tab-pane key="popular" tab="Popular">
              <a-list size="small" :data-source="popularItems">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta :description="item.views + ' views'">
                      <template #title>{{ item.title }}</template>
                      <template #avatar>
                        <a-avatar :style="{ background: '#4f46e5' }" size="small">
                          <template #icon><component :is="icons.StarOutlined" /></template>
                        </a-avatar>
                      </template>
                    </a-list-item-meta>
                    <template #actions>
                      <a-rate :value="item.rating" disabled allow-half style="font-size:12px" />
                    </template>
                  </a-list-item>
                </template>
              </a-list>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="10">
        <a-card :bordered="false" class="base-card shadow-card" title="Inner Cards">
          <a-card type="inner" title="Storage" style="margin-bottom:12px">
            <a-progress :percent="72" stroke-color="#4f46e5" />
            <div class="inner-card-meta">72 GB used of 100 GB</div>
          </a-card>
          <a-card type="inner" title="Bandwidth">
            <a-progress :percent="38" stroke-color="#0891b2" status="active" />
            <div class="inner-card-meta">38 GB used of 100 GB</div>
          </a-card>
        </a-card>
      </a-col>

      <!-- Section: Loading + Form -->
      <a-col :xs="24" :lg="10">
        <a-card :bordered="false" class="base-card shadow-card">
          <template #title>
            <div class="card-title-row"><component :is="icons.LoadingOutlined" class="card-title-icon" /><span>Loading State</span></div>
          </template>
          <template #extra>
            <a-switch v-model:checked="isLoading" checked-children="On" un-checked-children="Off" />
          </template>
          <a-skeleton :loading="isLoading" avatar :paragraph="{ rows: 3 }" active>
            <a-card-meta
              title="Content Loaded"
              description="Toggle the switch above to simulate loading state. Skeleton placeholders maintain layout during async data fetch."
            >
              <template #avatar>
                <a-avatar style="background:#4f46e5">
                  <template #icon><component :is="icons.UserOutlined" /></template>
                </a-avatar>
              </template>
            </a-card-meta>
          </a-skeleton>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="14">
        <a-card :bordered="false" class="base-card shadow-card">
          <template #title>
            <div class="card-title-row"><component :is="icons.FormOutlined" class="card-title-icon" /><span>Quick Entry Form</span></div>
          </template>
          <a-form :model="formState" layout="vertical">
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="Field A">
                  <a-input v-model:value="formState.fieldA" placeholder="Enter value" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Field B">
                  <a-select v-model:value="formState.fieldB" placeholder="Select option" allow-clear>
                    <a-select-option value="opt1">Option 1</a-select-option>
                    <a-select-option value="opt2">Option 2</a-select-option>
                    <a-select-option value="opt3">Option 3</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="Notes">
              <a-textarea v-model:value="formState.notes" :rows="2" placeholder="Optional notes" />
            </a-form-item>
            <a-form-item style="margin-bottom:0">
              <a-space>
                <a-button type="primary" @click="onSubmit">
                  <template #icon><component :is="icons.CheckOutlined" /></template>
                  Submit
                </a-button>
                <a-button @click="resetForm">Reset</a-button>
              </a-space>
            </a-form-item>
          </a-form>
          <Transition name="result-fade">
            <div v-if="submitMsg" class="result-box">
              <a-tag color="green">Submitted</a-tag>
              <pre class="result-json">{{ submitMsg }}</pre>
            </div>
          </Transition>
        </a-card>
      </a-col>

    </a-row>
  </div>
</template>

<script setup>
import {
  AppstoreOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  EditOutlined,
  EllipsisOutlined,
  FileTextOutlined,
  FormOutlined,
  LoadingOutlined,
  ProfileOutlined,
  SettingOutlined,
  StarOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { markRaw, reactive, ref } from 'vue';

const icons = markRaw({
  AppstoreOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  EditOutlined,
  EllipsisOutlined,
  FileTextOutlined,
  FormOutlined,
  LoadingOutlined,
  ProfileOutlined,
  SettingOutlined,
  StarOutlined,
  ThunderboltOutlined,
  UserOutlined,
});

// --- Cover cards ---
const coverCards = [
  {
    id: 1,
    title: 'Analytics',
    desc: 'Real-time data insights',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    icon: markRaw(AppstoreOutlined),
    avatarBg: '#4f46e5',
    initials: 'AN',
  },
  {
    id: 2,
    title: 'Documents',
    desc: 'Manage your files',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
    icon: markRaw(FileTextOutlined),
    avatarBg: '#0891b2',
    initials: 'DO',
  },
  {
    id: 3,
    title: 'Projects',
    desc: 'Track progress & tasks',
    gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    icon: markRaw(ProfileOutlined),
    avatarBg: '#16a34a',
    initials: 'PR',
  },
  {
    id: 4,
    title: 'Performance',
    desc: 'Speed & reliability metrics',
    gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    icon: markRaw(ThunderboltOutlined),
    avatarBg: '#d97706',
    initials: 'PE',
  },
];

// --- Stat cards ---
const statCards = [
  { title: 'Revenue', value: 84200, prefix: '$', color: '#4f46e5', trend: 'up', change: '+14.3%' },
  { title: 'Users', value: 5312, color: '#0891b2', trend: 'up', change: '+7.1%' },
  { title: 'Conversion', value: 3.8, precision: 1, suffix: '%', color: '#d97706', trend: 'down', change: '-0.6%' },
  { title: 'Avg. Session', value: '4m 12s', color: '#16a34a', trend: 'up', change: '+0.8%' },
];

// --- Tabs card ---
const activeTab = ref('recent');

const recentItems = [
  {
    title: 'Updated user permissions',
    time: '2 min ago',
    initials: 'AL',
    color: '#4f46e5',
    tag: { label: 'Admin', color: 'purple' },
  },
  {
    title: 'New deployment to staging',
    time: '18 min ago',
    initials: 'DV',
    color: '#0891b2',
    tag: { label: 'DevOps', color: 'blue' },
  },
  {
    title: 'Invoice #1042 paid',
    time: '1 hr ago',
    initials: 'FN',
    color: '#16a34a',
    tag: { label: 'Finance', color: 'green' },
  },
  {
    title: 'API rate limit warning',
    time: '3 hr ago',
    initials: 'SY',
    color: '#d97706',
    tag: { label: 'Alert', color: 'orange' },
  },
];

const popularItems = [
  { title: 'Getting Started Guide', views: '12.4k', rating: 4.5 },
  { title: 'API Reference Docs', views: '9.8k', rating: 4 },
  { title: 'Vue Integration Tutorial', views: '7.2k', rating: 5 },
  { title: 'Authentication Setup', views: '5.1k', rating: 4 },
];

// --- Loading card ---
const isLoading = ref(true);

// --- Form card ---
const formState = reactive({ fieldA: '', fieldB: undefined, notes: '' });
const submitMsg = ref('');

const onSubmit = () => {
  submitMsg.value = JSON.stringify(formState, null, 2);
};

const resetForm = () => {
  formState.fieldA = '';
  formState.fieldB = undefined;
  formState.notes = '';
  submitMsg.value = '';
};
</script>

<style scoped>
.demo-card {
  font-family: 'DM Sans', sans-serif;
}

.section-title {
  color: #64748b !important;
  margin: 4px 0 0 !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Base card */
.base-card {
  border-radius: 12px;
  height: 100%;
}

.shadow-card {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
}

:deep(.base-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 48px;
}

:deep(.base-card .ant-card-body) {
  padding: 16px 20px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.card-title-icon {
  color: #4f46e5;
  font-size: 15px;
}

.card-body-text {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

/* Cover cards */
.cover-card {
  border-radius: 12px;
  overflow: hidden;
}

.card-cover {
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-icon {
  font-size: 40px;
  color: rgba(255, 255, 255, 0.85);
}

/* Stat cards */
.stat-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  height: 100%;
}

:deep(.stat-card .ant-card-body) {
  padding: 16px 20px;
}

:deep(.stat-card .ant-statistic-title) {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-footer {
  display: flex;
  align-items: center;
  margin-top: 6px;
}

.stat-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-left: 6px;
}

/* Inner card */
.inner-card-meta {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

/* Result box */
.result-box {
  margin-top: 12px;
  padding: 10px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.result-json {
  margin: 6px 0 0;
  font-size: 12px;
  color: #1e293b;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Form labels */
:deep(.ant-form-item-label > label) {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* Transition */
.result-fade-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.result-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>
