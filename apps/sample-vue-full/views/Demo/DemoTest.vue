<template>
  <div class="demo-test">
    <a-row :gutter="[16, 16]">

      <!-- Template Refs -->
      <a-col :span="24">
        <a-card :bordered="false" class="test-card">
          <template #title>
            <div class="card-title-row">
              <AppstoreOutlined class="card-title-icon" />
              <span>Template Refs & Flex Layout</span>
            </div>
          </template>
          <p class="test-desc">
            Items rendered via <code>v-for</code> with inline <code>:ref</code> binding.
          </p>
          <div class="ref-list">
            <a-tag v-for="(item, i) in list" :key="i" :ref="(el) => (divs[i] = el)" color="purple">
              {{ item }}
            </a-tag>
          </div>
          <a-divider style="margin: 16px 0" />
          <div class="box-row">
            <ColorBox v-for="box in boxes" :key="box.label" :color="box.color" :label="box.label" />
          </div>
        </a-card>
      </a-col>

      <!-- Counter & Store -->
      <a-col :xs="24" :lg="12">
        <a-card :bordered="false" class="test-card">
          <template #title>
            <div class="card-title-row">
              <SyncOutlined class="card-title-icon" />
              <span>Counter & Store</span>
            </div>
          </template>

          <div class="test-row">
            <span class="test-label">Count</span>
            <a-space>
              <a-tag color="blue" style="font-size:14px;padding:4px 12px">{{ count }}</a-tag>
              <a-button size="small" type="primary" @click="count++">
                <template #icon><PlusOutlined /></template>
                Increment
              </a-button>
            </a-space>
          </div>

          <a-divider style="margin: 12px 0" />

          <div class="test-row">
            <span class="test-label">Non-reactive</span>
            <a-tag>{{ nonReactiveData }}</a-tag>
          </div>
          <div class="test-row">
            <span class="test-label">Reactive</span>
            <a-tag color="green">{{ reactiveData }}</a-tag>
          </div>

          <a-divider style="margin: 12px 0" />

          <div class="test-row">
            <span class="test-label">Store user</span>
            <a-tag color="purple">{{ store.user?.id ?? 'null' }}</a-tag>
          </div>
          <a-button size="small" style="margin-top:8px" @click="store.updateUser({ id: 'AnewId' })">
            Change Store User ID
          </a-button>
        </a-card>
      </a-col>

      <!-- Object Reactivity -->
      <a-col :xs="24" :lg="12">
        <a-card :bordered="false" class="test-card">
          <template #title>
            <div class="card-title-row">
              <ApiOutlined class="card-title-icon" />
              <span>Object Reactivity</span>
            </div>
          </template>
          <p class="test-desc">Click to increment. Check console for <code>onUpdated</code> calls.</p>

          <div class="test-row">
            <span class="test-label">ref({ a })</span>
            <a-space>
              <a-tag color="orange" style="font-size:14px;padding:4px 12px">{{ testObjectRef.a }}</a-tag>
              <a-button size="small" @click="testObjectRef.a++">
                <template #icon><PlusOutlined /></template>
                ref.a++
              </a-button>
            </a-space>
          </div>

          <a-divider style="margin: 12px 0" />

          <div class="test-row">
            <span class="test-label">reactive({ a.xx })</span>
            <a-space>
              <a-tag color="cyan" style="font-size:14px;padding:4px 12px">{{ testObjectReactive.a.xx }}</a-tag>
              <a-button size="small" @click="testObjectReactive.a.xx++">
                <template #icon><PlusOutlined /></template>
                reactive.a.xx++
              </a-button>
            </a-space>
          </div>

          <a-divider style="margin: 12px 0" />

          <a-button
            size="small"
            type="dashed"
            @click="router.push('/dun-no-what-is-this')"
          >
            Navigate to unknown route →
          </a-button>
        </a-card>
      </a-col>

      <!-- API Tests -->
      <a-col :span="24">
        <a-card :bordered="false" class="test-card">
          <template #title>
            <div class="card-title-row">
              <CloudOutlined class="card-title-icon" />
              <span>API & MSW Tests</span>
            </div>
          </template>

          <a-space wrap>
            <a-button type="primary" :loading="apiLoading === 'healthcheck'" @click="testApi('healthcheck')">
              <template #icon><PlayCircleOutlined /></template>
              Health Check
            </a-button>
            <a-button :loading="apiLoading === 'health-auth'" @click="testApi('health-auth')">
              <template #icon><PlayCircleOutlined /></template>
              Health Auth
            </a-button>
            <a-button type="dashed" :loading="apiLoading === 'msw'" @click="callMsw">
              <template #icon><PlayCircleOutlined /></template>
              MSW Endpoint
            </a-button>
          </a-space>

          <Transition name="result-fade">
            <div v-if="apiResult" class="api-result">
              <a-tag :color="apiResult.ok ? 'green' : 'red'" style="margin-bottom:6px">
                {{ apiResult.ok ? '200 OK' : 'Error' }}
              </a-tag>
              <pre class="api-json">{{ JSON.stringify(apiResult.data, null, 2) }}</pre>
            </div>
          </Transition>
        </a-card>
      </a-col>

    </a-row>
  </div>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icons used in Vue template
import {
  ApiOutlined,
  AppstoreOutlined,
  CloudOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import { http } from '@common/vue/plugins/fetch.js';
import { onBeforeUnmount, onBeforeUpdate, onMounted, onUnmounted, onUpdated, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
// biome-ignore lint/correctness/noUnusedImports: component used in Vue template
import ColorBox from '../../components/ColorBox.vue';
import { useMainStore } from '../../store.js';

const list = reactive([1, 2, 3]);
const divs = ref([]);
const router = useRouter();
const store = useMainStore();
const count = ref(0);
let nonReactiveData = 10;
const reactiveData = ref(20);
const testObjectRef = ref({ a: 10, b: 20, c: 30 });
const testObjectReactive = reactive({ a: { xx: 40 }, b: 50, c: 60 });
const apiLoading = ref('');
const apiResult = ref(null);

const boxes = [
  { color: '#ef4444', label: 'A' },
  { color: '#60a5fa', label: 'B' },
  { color: '#fbbf24', label: 'C' },
  { color: '#92400e', label: 'D' },
  { color: '#4ade80', label: 'E' },
  { color: '#f87171', label: 'A' },
  { color: '#a16207', label: 'G' },
];

onBeforeUpdate(() => {
  divs.value = [];
});

let timerId;
onMounted(async () => {
  console.log('demomain mounted!');
  timerId = setInterval(() => {
    console.log('timer fired');
    nonReactiveData += 1;
    reactiveData.value += 1;
  }, 200000);
});
onBeforeUnmount(() => {
  if (timerId) clearInterval(timerId);
});
onUpdated(() => console.log('demomain updated!'));
onUnmounted(() => console.log('demomain unmounted!'));

const testApi = async endpoint => {
  apiLoading.value = endpoint;
  apiResult.value = null;
  try {
    const { data } = await http.get(`/api/${endpoint}`);
    apiResult.value = { ok: true, data };
  } catch (e) {
    apiResult.value = { ok: false, data: e?.data || e.toString() };
  }
  apiLoading.value = '';
};

const callMsw = async () => {
  apiLoading.value = 'msw';
  apiResult.value = null;
  try {
    const { data } = await http.get('/api/msw/test');
    apiResult.value = { ok: true, data };
  } catch (e) {
    apiResult.value = { ok: false, data: e?.data || e.toString() };
  }
  apiLoading.value = '';
};
</script>

<style scoped>
.demo-test {
  font-family: 'DM Sans', sans-serif;
}

:deep(.test-card) {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.test-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 48px;
}

:deep(.test-card .ant-card-body) {
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

.test-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 12px;
}

.test-desc code {
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #4f46e5;
}

/* Ref list */
.ref-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Box row */
.box-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

/* Test rows */
.test-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
}

.test-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  min-width: 120px;
}

/* API result */
.api-result {
  margin-top: 16px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.api-json {
  margin: 0;
  font-size: 12px;
  color: #1e293b;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
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
