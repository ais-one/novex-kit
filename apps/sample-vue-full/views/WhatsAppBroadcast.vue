<template>
  <div class="wa-broadcast-wrap">
    <a-card title="WhatsApp Broadcast" style="max-width: 600px; margin: 40px auto">
      <a-form layout="vertical" @submit.prevent="sendBroadcast">
        <a-form-item label="Send from (config)">
          <a-select
            v-model:value="configLabel"
            placeholder="Select a WhatsApp config"
            style="width: 100%"
            :loading="configsLoading"
          >
            <a-select-option v-for="c in configs" :key="c.label" :value="c.label">
              {{ c.label }} ({{ c.senderIdentity.phone_number_id }})
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Recipients (one phone number per line, with country code)">
          <a-textarea
            v-model:value="recipientsText"
            :rows="4"
            placeholder="+60123456789&#10;+60198765432&#10;+60111222333"
          />
          <div style="color: #888; font-size: 12px; margin-top: 4px">
            {{ recipientCount }} recipient(s)
          </div>
        </a-form-item>

        <a-form-item label="Message type">
          <a-select v-model:value="type" @change="prefill" style="width: 100%">
            <a-select-option value="text">Text</a-select-option>
            <a-select-option value="image">Image</a-select-option>
            <a-select-option value="document">Document</a-select-option>
            <a-select-option value="template">Template</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Payload (JSON)">
          <a-textarea
            v-model:value="payloadJson"
            :rows="6"
            style="font-family: monospace; font-size: 12px"
            :status="jsonError ? 'error' : ''"
          />
          <div v-if="jsonError" style="color: #ff4d4f; font-size: 12px; margin-top: 4px">{{ jsonError }}</div>
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="loading" block>Send Broadcast</a-button>
        </a-form-item>

        <a-alert
          v-if="result"
          :type="result.ok ? 'success' : 'error'"
          :message="result.ok ? `Broadcast complete: ${result.result?.sent ?? 0} sent, ${result.result?.failed ?? 0} failed` : 'Error'"
          :description="JSON.stringify(result.result ?? result.error, null, 2)"
          show-icon
          style="white-space: pre-wrap; font-family: monospace; font-size: 12px"
        />
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { http } from '@common/vue/plugins/fetch.js';
import { computed, onMounted, ref } from 'vue';

// ─── Config selector ──────────────────────────────────────────────────────────

const configs = ref([]);
const configLabel = ref('');
const configsLoading = ref(false);

async function fetchConfigs() {
  configsLoading.value = true;
  try {
    const { data } = await http.get('/api/sample-api/tenant-comms');
    if (data.ok) {
      configs.value = data.data.filter(c => c.channel === 'whatsapp');
    }
    if (configs.value.length > 0 && !configLabel.value) {
      configLabel.value = configs.value[0].label;
    }
  } catch (err) {
    console.error('Failed to fetch WhatsApp configs:', err);
  } finally {
    configsLoading.value = false;
  }
}

onMounted(fetchConfigs);

// ─── Form state ───────────────────────────────────────────────────────────────

const recipientsText = ref('');
const type = ref('text');
const payloadJson = ref('');
const loading = ref(false);
const result = ref(null);
const jsonError = ref('');

const recipientCount = computed(() => {
  return recipientsText.value
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean).length;
});

const TEMPLATES = {
  text: { text: 'Hello from WhatsApp broadcast!' },
  image: {
    media: {
      link: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
    },
    opts: { caption: 'Broadcast image' },
  },
  document: {
    media: { link: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf' },
    opts: { filename: 'sample.pdf', caption: 'Broadcast document' },
  },
  template: { opts: { name: 'hello_world', language: { code: 'en_US' }, components: [] } },
};

function prefill() {
  payloadJson.value = JSON.stringify(TEMPLATES[type.value] ?? TEMPLATES.text, null, 2);
}
prefill();

// ─── Send ─────────────────────────────────────────────────────────────────────

async function sendBroadcast() {
  jsonError.value = '';
  result.value = null;

  let payload;
  try {
    payload = JSON.parse(payloadJson.value);
  } catch (e) {
    jsonError.value = 'Invalid JSON';
    return;
  }

  const recipients = recipientsText.value
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  if (recipients.length === 0) {
    jsonError.value = 'At least one recipient is required';
    return;
  }

  loading.value = true;
  try {
    result.value = (
      await http.post('/api/sample-api/whatsapp/broadcast', {
        recipients,
        type: type.value,
        configLabel: configLabel.value || undefined,
        ...payload,
      })
    ).data;
  } catch (err) {
    result.value = { ok: false, error: err.message };
  } finally {
    loading.value = false;
  }
}
</script>
