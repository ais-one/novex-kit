<template>
  <div class="demo-form">
    <a-row :gutter="[16, 16]">

      <!-- LEFT COLUMN -->
      <a-col :xs="24" :lg="15">

        <!-- Various Inputs -->
        <a-card :bordered="false" class="form-card">
          <template #title>
            <div class="card-title-row">
              <FormOutlined class="card-title-icon" />
              <span>Various Inputs</span>
              <a-badge
                :count="storeCounter"
                :number-style="{ background: '#4f46e5' }"
                style="margin-left:auto"
              />
            </div>
          </template>

          <a-form :model="formState" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }" layout="horizontal">
            <a-form-item label="Rating">
              <a-row :gutter="12">
                <a-col :span="17">
                  <a-slider v-model:value="formState.rating" :min="1" :max="20" />
                </a-col>
                <a-col :span="7">
                  <a-input-number v-model:value="formState.rating" :min="1" :max="20" style="width:100%" />
                </a-col>
              </a-row>
            </a-form-item>

            <a-form-item label="Activity name">
              <a-input v-model:value="formState.name" placeholder="Enter activity name" />
            </a-form-item>

            <a-form-item label="Zone">
              <a-select v-model:value="formState.region" placeholder="Select a zone" allow-clear>
                <a-select-option value="shanghai">Zone One</a-select-option>
                <a-select-option value="beijing">Zone Two</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="Date">
              <a-date-picker
                v-model:value="appStore.form.date1"
                show-time
                placeholder="Pick a date"
                style="width:100%"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </a-form-item>

            <a-form-item label="Instant delivery">
              <a-switch
                v-model:checked="appStore.form.delivery"
                checked-children="On"
                un-checked-children="Off"
              />
            </a-form-item>

            <a-form-item label="Type">
              <a-checkbox-group v-model:value="formState.type">
                <a-checkbox value="1">Online</a-checkbox>
                <a-checkbox value="2">Promotion</a-checkbox>
                <a-checkbox value="3">Offline</a-checkbox>
              </a-checkbox-group>
            </a-form-item>

            <a-form-item label="Resources">
              <a-radio-group v-model:value="formState.resource">
                <a-radio value="1">Sponsor</a-radio>
                <a-radio value="2">Venue</a-radio>
              </a-radio-group>
            </a-form-item>

            <a-form-item label="Description">
              <a-textarea
                v-model:value="formState.desc"
                :rows="3"
                placeholder="Enter activity description"
                show-count
                :maxlength="300"
              />
            </a-form-item>

            <a-form-item label="Store counter">
              <a-input-number v-model:value="storeCounter" :min="0" style="width:100%" />
            </a-form-item>

            <a-divider style="margin: 12px 0" />

            <a-form-item :wrapper-col="{ span: 18, offset: 6 }">
              <a-space>
                <a-button type="primary" :loading="submitting" @click="onSubmit">
                  <template #icon><CheckOutlined /></template>
                  Create
                </a-button>
                <a-button @click="resetForm">Reset</a-button>
              </a-space>
            </a-form-item>
          </a-form>

          <Transition name="result-fade">
            <div v-if="submitResult" class="result-box">
              <a-tag :color="submitResult.ok ? 'green' : 'red'" style="margin-bottom:6px">
                {{ submitResult.ok ? 'Success' : 'Error' }}
              </a-tag>
              <pre class="result-json">{{ submitResult.msg }}</pre>
            </div>
          </Transition>
        </a-card>

        <!-- Transfer -->
        <a-card :bordered="false" class="form-card" style="margin-top:16px">
          <template #title>
            <div class="card-title-row">
              <SwapOutlined class="card-title-icon" />
              <span>Transfer List</span>
            </div>
          </template>
          <template #extra>
            <a-button size="small" @click="getMock">
              <template #icon><ReloadOutlined /></template>
              Reload
            </a-button>
          </template>

          <div class="transfer-wrap">
            <a-transfer
              :data-source="mockData"
              show-search
              :list-style="{ flex: 1, height: '280px' }"
              :operations="['Add →', '← Remove']"
              :target-keys="targetKeys"
              :render="item => `${item.title} — ${item.description}`"
              @change="handleChange"
            >
              <template #notFoundContent>
                <a-empty description="No data" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
              </template>
            </a-transfer>
          </div>
        </a-card>

      </a-col>

      <!-- RIGHT COLUMN -->
      <a-col :xs="24" :lg="9">

        <!-- File Upload -->
        <a-card :bordered="false" class="form-card">
          <template #title>
            <div class="card-title-row">
              <UploadOutlined class="card-title-icon" />
              <span>File Upload</span>
            </div>
          </template>

          <a-form :model="form1" layout="vertical">
            <a-form-item label="Files">
              <a-upload-dragger
                :file-list="form1.files"
                :remove="handleRemove"
                :before-upload="beforeUpload"
                :multiple="true"
                class="upload-dragger"
              >
                <p class="ant-upload-drag-icon"><InboxOutlined /></p>
                <p class="ant-upload-text">Click or drag files here</p>
                <p class="ant-upload-hint">Single or bulk upload supported.</p>
              </a-upload-dragger>
            </a-form-item>

            <a-form-item label="Text">
              <a-input v-model:value="form1.text" placeholder="Enter text" />
            </a-form-item>

            <a-form-item label="Number">
              <a-input-number v-model:value="form1.number" :min="0" style="width:100%" />
            </a-form-item>

            <a-button type="primary" block :loading="uploading" @click="onSubmit1">
              <template #icon><UploadOutlined /></template>
              Upload
            </a-button>
          </a-form>

          <Transition name="result-fade">
            <div v-if="uploadResult" class="result-box" style="margin-top:12px">
              <a-tag :color="uploadResult.ok ? 'green' : 'red'" style="margin-bottom:6px">
                {{ uploadResult.ok ? 'Success' : 'Error' }}
              </a-tag>
              <pre class="result-json">{{ uploadResult.msg }}</pre>
            </div>
          </Transition>
        </a-card>

        <!-- WebSocket -->
        <a-card :bordered="false" class="form-card" style="margin-top:16px">
          <template #title>
            <div class="card-title-row">
              <WifiOutlined class="card-title-icon" />
              <span>WebSocket Test</span>
            </div>
          </template>

          <a-form layout="vertical">
            <a-form-item label="Message">
              <a-input
                v-model:value="wsMsg"
                placeholder="Type a message"
                allow-clear
                @press-enter="onWsMsg"
              />
            </a-form-item>

            <a-button type="primary" block @click="onWsMsg">
              <template #icon><SendOutlined /></template>
              Send
            </a-button>

            <a-divider style="margin: 14px 0" />

            <div class="ws-received">
              <span class="ws-label">Received</span>
              <a-tag :color="appStore.message ? 'blue' : 'default'" style="margin-left:8px">
                {{ appStore.message || 'No message yet' }}
              </a-tag>
            </div>
          </a-form>
        </a-card>

        <!-- Error Pages -->
        <a-card :bordered="false" class="form-card" style="margin-top:16px">
          <template #title>
            <div class="card-title-row">
              <WarningOutlined class="card-title-icon" />
              <span>Error Pages</span>
            </div>
          </template>

          <a-space direction="vertical" style="width:100%">
            <a-button block danger @click="goToForbidden">
              <template #icon><StopOutlined /></template>
              403 Forbidden
            </a-button>
            <a-button block @click="goToNotFound">
              <template #icon><QuestionCircleOutlined /></template>
              404 Not Found
            </a-button>
          </a-space>
        </a-card>

      </a-col>
    </a-row>
  </div>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icons used in Vue template
import {
  CheckOutlined,
  FormOutlined,
  InboxOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
  SwapOutlined,
  UploadOutlined,
  WarningOutlined,
  WifiOutlined,
} from '@ant-design/icons-vue';
import { http } from '@common/vue/plugins/fetch.js';
import { ws } from '@common/vue/plugins/ws.js';
// biome-ignore lint/correctness/noUnusedImports: Empty.PRESENTED_IMAGE_SIMPLE used in template
import { Empty } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, toRaw } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../../store.js';

const { VITE_API_URL } = import.meta.env;

const appStore = useAppStore();
const router = useRouter();

// --- Transfer ---
const mockData = ref([]);
const targetKeys = ref([]);

const getMock = () => {
  const keys = [];
  const mData = [];
  for (let i = 0; i < 20; i++) {
    const data = {
      key: i.toString(),
      title: `Item ${i + 1}`,
      description: `Description ${i + 1}`,
      chosen: Math.random() * 2 > 1,
    };
    if (data.chosen) keys.push(data.key);
    mData.push(data);
  }
  mockData.value = mData;
  targetKeys.value = keys;
};

const handleChange = keys => {
  targetKeys.value = keys;
};

onMounted(getMock);

// --- Form 1: File Upload ---
const form1 = reactive({ files: [], text: 'abcd', number: 3 });
const uploading = ref(false);
const uploadResult = ref(null);

const handleRemove = file => {
  form1.files = form1.files.filter(f => f.uid !== file.uid);
};

const beforeUpload = file => {
  if (!form1.files.find(f => f.name === file.name)) {
    form1.files = [...form1.files, file];
  }
  return false;
};

const onSubmit1 = async () => {
  uploading.value = true;
  uploadResult.value = null;
  try {
    const form = new FormData();
    for (const file of form1.files) form.append('myfiles', file);
    form.append('mydata', JSON.stringify({ text: form1.text, number: form1.number }));
    const { data } = await http.post(`${VITE_API_URL}/api/custom-app/uploads/file-and-json`, form);
    uploadResult.value = { ok: true, msg: JSON.stringify(data, null, 2) };
  } catch (e) {
    uploadResult.value = { ok: false, msg: e?.data ? JSON.stringify(e.data, null, 2) : e.toString() };
  }
  uploading.value = false;
};

// --- Form 2: Various Inputs ---
const formState = reactive({
  name: '',
  region: undefined,
  type: [],
  resource: '',
  desc: '',
  rating: 5,
});

const submitting = ref(false);
const submitResult = ref(null);

const onSubmit = async () => {
  submitting.value = true;
  submitResult.value = null;
  try {
    const body = toRaw(formState);
    const { data } = await http.post(`${VITE_API_URL}/api/healthcheck`, body);
    submitResult.value = { ok: true, msg: JSON.stringify(data, null, 2) };
  } catch (e) {
    submitResult.value = { ok: false, msg: e?.data ? JSON.stringify(e.data, null, 2) : e.toString() };
  }
  submitting.value = false;
};

const resetForm = () => {
  formState.name = '';
  formState.region = undefined;
  formState.type = [];
  formState.resource = '';
  formState.desc = '';
  formState.rating = 5;
  submitResult.value = null;
};

// --- WebSocket ---
const wsMsg = ref('');
const onWsMsg = () => {
  ws.send(wsMsg.value);
};

// --- Navigation ---
const goToNotFound = () => router.push('/notfound');
const goToForbidden = () => router.push('/forbidden');

// --- Store counter ---
const storeCounter = computed({
  get: () => appStore.counter,
  set: val => {
    appStore.counter = val;
  },
});
</script>

<style scoped>
.demo-form {
  font-family: 'DM Sans', sans-serif;
}

.form-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.form-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 48px;
}

:deep(.form-card .ant-card-body) {
  padding: 20px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  width: 100%;
}

.card-title-icon {
  color: #4f46e5;
  font-size: 15px;
}

/* Form labels */
:deep(.ant-form-item-label > label) {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* Upload dragger */
.upload-dragger {
  border-radius: 10px;
}

/* Transfer */
.transfer-wrap {
  overflow-x: auto;
}

:deep(.ant-transfer) {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

:deep(.ant-transfer-list) {
  flex: 1;
  border-radius: 8px;
  border-color: #e2e8f0;
  min-width: 0;
}

:deep(.ant-transfer-list-header) {
  background: #f8fafc;
  border-color: #e2e8f0;
}

/* WS received row */
.ws-received {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #64748b;
}

.ws-label {
  font-weight: 500;
  white-space: nowrap;
}

/* Result box */
.result-box {
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.result-json {
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
