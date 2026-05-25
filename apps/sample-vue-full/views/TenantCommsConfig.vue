<template>
  <div class="comms-config-wrap">
    <a-card title="Communications Config" style="max-width: 900px; margin: 40px auto">
      <template #extra>
        <a-button type="primary" @click="showAddModal">+ Add Channel</a-button>
      </template>

      <a-alert
        v-if="error"
        type="error"
        :message="error"
        closable
        @close="error = ''"
        style="margin-bottom: 16px"
      />

      <a-table
        :columns="columns"
        :data-source="configs"
        :loading="loading"
        row-key="id"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'senderIdentity'">
            <span v-for="(val, key) in record.senderIdentity" :key="key" style="display: block; font-size: 12px">
              {{ key }}: {{ val }}
            </span>
          </template>
          <template v-if="column.key === 'isActive'">
            <a-switch :checked="record.isActive" @change="toggleActive(record)" size="small" />
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="showEditModal(record)">Edit</a-button>
              <a-popconfirm title="Delete this config?" @confirm="deleteConfig(record.id)">
                <a-button size="small" danger>Delete</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Add/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingId ? 'Edit Channel Config' : 'Add Channel Config'"
      @ok="handleSubmit"
      :confirm-loading="submitting"
      :ok-text="editingId ? 'Update' : 'Create'"
      width="600px"
    >
      <a-form layout="vertical" style="margin-top: 16px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="Channel" :required="!editingId">
              <a-select v-model:value="form.channel" :disabled="!!editingId" style="width: 100%" @change="onChannelChange">
                <a-select-option value="email">Email</a-select-option>
                <a-select-option value="whatsapp">WhatsApp</a-select-option>
                <a-select-option value="telegram">Telegram</a-select-option>
                <a-select-option value="sms">SMS</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Provider">
              <a-input :value="providerLabel" disabled />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Dynamic credential fields based on channel -->
        <a-divider orientation="left" style="font-size: 13px">Credentials (secret)</a-divider>

        <template v-if="form.channel === 'email'">
          <a-form-item label="SendGrid API Key" required>
            <a-input-password v-model:value="form.credentials.api_key" placeholder="SG.xxxxx" />
          </a-form-item>
        </template>

        <template v-else-if="form.channel === 'whatsapp'">
          <a-form-item label="Access Token" required>
            <a-input-password v-model:value="form.credentials.token" placeholder="EAAxxxxx" />
          </a-form-item>
        </template>

        <template v-else-if="form.channel === 'telegram'">
          <a-form-item label="Bot Token" required>
            <a-input-password v-model:value="form.credentials.bot_token" placeholder="123456:ABC-DEF" />
          </a-form-item>
        </template>

        <template v-else-if="form.channel === 'sms'">
          <a-form-item label="API Key" required>
            <a-input-password v-model:value="form.credentials.api_key" placeholder="API key" />
          </a-form-item>
          <a-form-item label="API Secret" required>
            <a-input-password v-model:value="form.credentials.api_secret" placeholder="API secret" />
          </a-form-item>
        </template>

        <a-divider orientation="left" style="font-size: 13px">Sender Identity</a-divider>

        <template v-if="form.channel === 'email'">
          <a-form-item label="Sender Name" required>
            <a-input v-model:value="form.senderIdentity.sender_name" placeholder="Company A Support" />
          </a-form-item>
          <a-form-item label="Sender Email" required>
            <a-input v-model:value="form.senderIdentity.sender_email" placeholder="noreply@companya.com" />
          </a-form-item>
        </template>

        <template v-else-if="form.channel === 'whatsapp'">
          <a-form-item label="Phone Number ID" required>
            <a-input v-model:value="form.senderIdentity.phone_number_id" placeholder="123456789" />
          </a-form-item>
          <a-form-item label="Business Account ID (WABA ID)" required>
            <a-input v-model:value="form.senderIdentity.business_account_id" placeholder="1528784982254938" />
          </a-form-item>
        </template>

        <template v-else-if="form.channel === 'telegram'">
          <a-form-item label="Bot Name">
            <a-input v-model:value="form.senderIdentity.bot_name" placeholder="CompanyA_Bot" />
          </a-form-item>
        </template>

        <template v-else-if="form.channel === 'sms'">
          <a-form-item label="Sender Name" required>
            <a-input v-model:value="form.senderIdentity.sender_name" placeholder="SMSnotice" />
          </a-form-item>
        </template>

        <a-alert
          v-if="editingId"
          type="info"
          message="Leave credential fields empty to keep existing values unchanged."
          style="margin-top: 8px"
        />
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';
const BASE = `${API_URL}/api/sample-api/tenant-comms`;

// ─── Channel → Provider mapping ───────────────────────────────────────────────

const CHANNEL_PROVIDER_MAP = {
  email: 'sendgrid',
  whatsapp: 'meta',
  telegram: 'telegram',
  sms: 'nexmo',
};

const PROVIDER_LABELS = {
  sendgrid: 'SendGrid',
  meta: 'Meta (WhatsApp)',
  telegram: 'Telegram',
  nexmo: 'Nexmo',
};

const providerLabel = computed(() => PROVIDER_LABELS[form.value.provider] || form.value.provider);

function onChannelChange(channel) {
  form.value.provider = CHANNEL_PROVIDER_MAP[channel] || '';
  form.value.credentials = {};
  form.value.senderIdentity = {};
}

// ─── State ────────────────────────────────────────────────────────────────────

const configs = ref([]);
const loading = ref(false);
const error = ref('');
const modalVisible = ref(false);
const submitting = ref(false);
const editingId = ref(null);

const defaultForm = () => ({
  channel: 'email',
  provider: 'sendgrid',
  credentials: {},
  senderIdentity: {},
});
const form = ref(defaultForm());

// ─── Table columns ────────────────────────────────────────────────────────────

const columns = [
  { title: 'Channel', dataIndex: 'channel', key: 'channel', width: 100 },
  { title: 'Provider', dataIndex: 'provider', key: 'provider', width: 100 },
  { title: 'Sender Identity', key: 'senderIdentity', width: 200 },
  {
    title: 'Credentials',
    dataIndex: 'credentials',
    key: 'credentials',
    width: 200,
    customRender: ({ record }) => {
      return Object.entries(record.credentials || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    },
  },
  { title: 'Active', key: 'isActive', width: 80 },
  { title: 'Actions', key: 'actions', width: 150 },
];

// ─── API calls ────────────────────────────────────────────────────────────────

async function fetchConfigs() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch(BASE, { credentials: 'include' });
    const data = await res.json();
    if (data.ok) {
      configs.value = data.data;
    } else {
      error.value = data.error || 'Failed to load configs';
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function createConfig() {
  submitting.value = true;
  error.value = '';
  try {
    const body = {
      channel: form.value.channel,
      provider: form.value.provider,
      credentials: form.value.credentials,
      senderIdentity: form.value.senderIdentity,
    };
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      modalVisible.value = false;
      await fetchConfigs();
    } else {
      error.value = data.error || 'Failed to create config';
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}

async function updateConfig() {
  submitting.value = true;
  error.value = '';
  try {
    const body = {};
    // Only send credentials if user entered new values
    const creds = form.value.credentials;
    const hasCredentials = Object.values(creds).some(v => v && v.trim() !== '');
    if (hasCredentials) body.credentials = creds;

    const identity = form.value.senderIdentity;
    const hasIdentity = Object.values(identity).some(v => v && v.trim() !== '');
    if (hasIdentity) body.senderIdentity = identity;

    const res = await fetch(`${BASE}/${editingId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      modalVisible.value = false;
      await fetchConfigs();
    } else {
      error.value = data.error || 'Failed to update config';
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}

async function deleteConfig(id) {
  error.value = '';
  try {
    const res = await fetch(`${BASE}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (data.ok) {
      await fetchConfigs();
    } else {
      error.value = data.error || 'Failed to delete config';
    }
  } catch (err) {
    error.value = err.message;
  }
}

async function toggleActive(record) {
  error.value = '';
  try {
    const res = await fetch(`${BASE}/${record.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive: !record.isActive }),
    });
    const data = await res.json();
    if (data.ok) {
      await fetchConfigs();
    } else {
      error.value = data.error || 'Failed to toggle status';
    }
  } catch (err) {
    error.value = err.message;
  }
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function showAddModal() {
  editingId.value = null;
  form.value = defaultForm();
  modalVisible.value = true;
}

function showEditModal(record) {
  editingId.value = record.id;
  form.value = {
    channel: record.channel,
    provider: record.provider,
    credentials: {}, // empty — user must re-enter to update (security)
    senderIdentity: { ...record.senderIdentity },
  };
  modalVisible.value = true;
}

function handleSubmit() {
  if (editingId.value) {
    updateConfig();
  } else {
    createConfig();
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(fetchConfigs);
</script>

<style scoped>
.comms-config-wrap {
  padding: 16px;
}
</style>
