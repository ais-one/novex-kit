<template>
  <div class="wa-test-wrap">
    <a-card title="WhatsApp Test Sender" style="max-width: 600px; margin: 40px auto">
      <a-form layout="vertical" @submit.prevent="send">
        <a-form-item label="Send from (config)">
          <a-select v-model:value="configLabel" placeholder="Select a WhatsApp config" style="width: 100%" :loading="configsLoading">
            <a-select-option v-for="c in configs" :key="c.label" :value="c.label">{{ c.label }} ({{ c.senderIdentity.phone_number_id }})</a-select-option>
          </a-select>
        </a-form-item>

        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="Message type">
              <a-select v-model:value="type" @change="prefill" style="width: 100%">
                <a-select-option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="['read', 'typing', 'get_media_url'].includes(type) ? 'Phone (not needed for this type)' : 'To (phone number)'">
              <a-input v-model:value="to" placeholder="+60123456789" :disabled="['read', 'typing', 'get_media_url'].includes(type)" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Body (JSON)">
          <a-textarea
            v-model:value="bodyJson"
            :rows="10"
            style="font-family: monospace; font-size: 12px"
            :status="jsonError ? 'error' : ''"
          />
          <div v-if="jsonError" style="color: #ff4d4f; font-size: 12px; margin-top: 4px">{{ jsonError }}</div>
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="loading" block>Send</a-button>
        </a-form-item>

        <a-alert
          v-if="result"
          :type="result.ok ? 'success' : 'error'"
          :message="result.ok ? 'Sent successfully' : 'Error'"
          :description="result.ok ? JSON.stringify(result.result, null, 2) : result.error"
          show-icon
          style="white-space: pre-wrap; font-family: monospace; font-size: 12px"
        />
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

// ─── Config selector ──────────────────────────────────────────────────────────

const configs = ref([]);
const configLabel = ref('');
const configsLoading = ref(false);

async function fetchConfigs() {
  configsLoading.value = true;
  try {
    const res = await fetch(`${API_URL}/api/sample-api/tenant-comms`, { credentials: 'include' });
    const data = await res.json();
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

const TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Document' },
  { value: 'video', label: 'Video' },
  { value: 'sticker', label: 'Sticker' },
  { value: 'location', label: 'Location' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'buttons', label: 'Interactive Buttons' },
  { value: 'list', label: 'Interactive List' },
  { value: 'template', label: 'Template' },
  { value: 'reaction', label: 'Reaction' },
  { value: 'read', label: 'Mark as Read' },
  { value: 'typing', label: 'Typing Indicator' },
  { value: 'cta_url', label: 'CTA URL Button' },
  { value: 'address_request', label: 'Address Request' },
  { value: 'flow', label: 'WhatsApp Flow' },
  { value: 'get_media_url', label: 'Get Media URL' },
];

const TEMPLATES = {
  text: { body: 'Hello from the test page!' },
  image: {
    link: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
    caption: 'Test image',
  },
  audio: { link: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  document: {
    link: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf',
    filename: 'sample.pdf',
    caption: 'Sample PDF',
  },
  video: { link: 'https://www.w3schools.com/html/mov_bbb.mp4', caption: 'Test video' },
  sticker: { id: '<sticker_media_id>' },
  location: {
    latitude: 3.139,
    longitude: 101.6869,
    name: 'Kuala Lumpur City Centre',
    address: 'Kuala Lumpur, Malaysia',
  },
  contacts: {
    contacts: [
      {
        name: { formatted_name: 'John Doe', first_name: 'John', last_name: 'Doe' },
        phones: [{ phone: '+60123456789', type: 'CELL' }],
        emails: [{ email: 'john@example.com', type: 'WORK' }],
      },
    ],
  },
  buttons: {
    body: 'Choose an option:',
    buttons: [
      { id: 'yes', title: 'Yes' },
      { id: 'no', title: 'No' },
      { id: 'later', title: 'Remind me later' },
    ],
    footer: 'Tap a button to reply',
  },
  list: {
    body: 'Select a department:',
    button: 'View options',
    sections: [
      {
        title: 'Support',
        rows: [
          { id: 'billing', title: 'Billing', description: 'Payment issues' },
          { id: 'technical', title: 'Technical', description: 'App problems' },
        ],
      },
    ],
  },
  template: { name: 'hello_world', language: 'en_US' },
  reaction: { message_id: '<wamid_from_inbound_webhook>', emoji: '👍' },
  read: { message_id: '<wamid_from_inbound_webhook>' },
  typing: { message_id: '<wamid_from_inbound_webhook>' },
  cta_url: {
    body: 'Visit our website for the latest updates.',
    displayText: 'Visit us',
    url: 'https://example.com',
    footer: 'Tap the button below',
  },
  address_request: {
    body: 'Please share your delivery address to confirm your order.',
    country: 'IN',
    footer: 'We need this to deliver your order',
  },
  flow: {
    body: 'Fill out our quick form.',
    flowId: '<flow_id_from_meta>',
    flowToken: '<unique_token_per_session>',
    flowCta: 'Open Form',
    flowAction: 'navigate',
    screen: '<SCREEN_ID>',
  },
  get_media_url: { media_id: '<media_id_from_inbound_webhook>' },
};

const type = ref('text');
const to = ref('');
const bodyJson = ref(JSON.stringify(TEMPLATES.text, null, 2));
const jsonError = ref('');
const loading = ref(false);
const result = ref(null);

function prefill() {
  bodyJson.value = JSON.stringify(TEMPLATES[type.value] ?? {}, null, 2);
  jsonError.value = '';
  result.value = null;
}

watch(bodyJson, () => {
  try {
    JSON.parse(bodyJson.value);
    jsonError.value = '';
  } catch {
    jsonError.value = 'Invalid JSON';
  }
});

async function send() {
  jsonError.value = '';
  let parsed;
  try {
    parsed = JSON.parse(bodyJson.value);
  } catch {
    jsonError.value = 'Invalid JSON — fix before sending';
    return;
  }

  const payload = { type: type.value, to: to.value, configLabel: configLabel.value, ...parsed };
  loading.value = true;
  result.value = null;
  try {
    const res = await fetch(`${API_URL}/api/sample-api/whatsapp/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    result.value = await res.json();
  } catch (err) {
    result.value = { ok: false, error: err.message };
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.wa-test-wrap {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
}
</style>
