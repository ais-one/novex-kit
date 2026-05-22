<template>
  <div class="email-test-wrap">
    <a-card title="Email Test Sender (email2)" style="max-width: 640px; margin: 40px auto">
      <a-form layout="vertical" @submit.prevent="send">
        <a-row :gutter="12">
          <a-col :span="10">
            <a-form-item label="Message type">
              <a-select v-model:value="type" @change="prefill" style="width: 100%">
                <a-select-option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="14">
            <a-form-item :label="type === 'cancel' ? 'To (not needed for cancel)' : 'To (email address)'">
              <a-input
                v-model:value="to"
                placeholder="recipient@example.com"
                :disabled="type === 'cancel'"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Body (JSON)">
          <a-textarea
            v-model:value="bodyJson"
            :rows="12"
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
import { ref, watch } from 'vue';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

const TYPES = [
  { value: 'html', label: 'HTML Email' },
  { value: 'dynamic', label: 'Dynamic Template' },
  { value: 'attachment', label: 'With Attachment' },
  { value: 'bulk', label: 'Bulk (multiple recipients)' },
  { value: 'bulk-dynamic', label: 'Bulk Dynamic Template' },
  { value: 'scheduled', label: 'Scheduled Send' },
  { value: 'cancel', label: 'Cancel Scheduled' },
];

const TEMPLATES = {
  html: () => ({
    subject: 'Test Email',
    html: '<p>Hello from <strong>email2</strong>!</p><p>This is a test sent via the SendGrid v3 API.</p>',
    '_docs (remove this)': 'All fields below are optional. Delete what you do not need.',
    cc: [{ email: 'cc@example.com', name: 'CC Person' }],
    bcc: [{ email: 'bcc@example.com' }],
    replyTo: { email: 'reply@example.com', name: 'Reply Here' },
    attachments: [{ content: 'SGVsbG8=', filename: 'hello.txt', type: 'text/plain' }],
    sendAt: Math.floor(Date.now() / 1000) + 3600,
    categories: ['test', 'newsletter'],
  }),
  dynamic: () => ({
    templateId: 'd-xxxx (replace with your template ID)',
    data: {
      name: 'World',
      link: 'https://example.com',
    },
    '_docs (remove this)': 'All fields below are optional. Delete what you do not need.',
    cc: [{ email: 'cc@example.com', name: 'CC Person' }],
    bcc: [{ email: 'bcc@example.com' }],
    replyTo: { email: 'reply@example.com', name: 'Reply Here' },
    sendAt: Math.floor(Date.now() / 1000) + 3600,
    attachments: [{ content: 'SGVsbG8=', filename: 'hello.txt', type: 'text/plain' }],
    categories: ['test'],
  }),
  attachment: () => ({
    subject: 'Email with Attachment',
    html: '<p>Please find the attached file.</p>',
    attachments: [
      {
        content: 'SGVsbG8gV29ybGQ=',
        filename: 'hello.txt',
        type: 'text/plain',
      },
    ],
    '_docs (remove this)': 'All fields below are optional. Delete what you do not need.',
    cc: [{ email: 'cc@example.com', name: 'CC Person' }],
    bcc: [{ email: 'bcc@example.com' }],
    replyTo: { email: 'reply@example.com', name: 'Reply Here' },
    sendAt: Math.floor(Date.now() / 1000) + 3600,
    categories: ['test'],
  }),
  bulk: () => ({
    subject: 'Bulk Test',
    html: '<p>Hello! This is a bulk email sent to multiple recipients.</p>',
    personalizations: [
      { to: [{ email: 'recipient-1@example.com' }] },
      { to: [{ email: 'recipient-2@example.com' }], subject: 'Custom subject for recipient 2' },
    ],
    '_docs (remove this)':
      'All fields below are optional. Delete what you do not need. Each personalization can override subject and add cc/bcc.',
    attachments: [{ content: 'SGVsbG8=', filename: 'hello.txt', type: 'text/plain' }],
    replyTo: { email: 'reply@example.com', name: 'Reply Here' },
    sendAt: Math.floor(Date.now() / 1000) + 3600,
    categories: ['bulk-test'],
  }),
  'bulk-dynamic': () => ({
    templateId: 'd-xxxx (replace with your template ID)',
    personalizations: [
      { to: [{ email: 'recipient-1@example.com' }], dynamic_template_data: { name: 'Alice' } },
      { to: [{ email: 'recipient-2@example.com' }], dynamic_template_data: { name: 'Bob' } },
    ],
    '_docs (remove this)':
      'All fields below are optional. Delete what you do not need. Each personalization can have its own cc, bcc, subject override, and dynamic_template_data.',
    replyTo: { email: 'reply@example.com', name: 'Reply Here' },
    sendAt: Math.floor(Date.now() / 1000) + 3600,
    categories: ['bulk-dynamic-test'],
  }),
  scheduled: () => ({
    subject: 'Scheduled Email',
    html: '<p>This email was scheduled to be delivered in 1 hour.</p>',
    sendAt: Math.floor(Date.now() / 1000) + 3600,
    '_docs (remove this)': 'All fields below are optional. Delete what you do not need.',
    cc: [{ email: 'cc@example.com', name: 'CC Person' }],
    bcc: [{ email: 'bcc@example.com' }],
    replyTo: { email: 'reply@example.com', name: 'Reply Here' },
    attachments: [{ content: 'SGVsbG8=', filename: 'hello.txt', type: 'text/plain' }],
    categories: ['scheduled-test'],
  }),
  cancel: {
    batchId: 'replace-with-batch-id-from-scheduled-response',
  },
};

const type = ref('html');
const to = ref('');
const bodyJson = ref(JSON.stringify(TEMPLATES.html(), null, 2));
const jsonError = ref('');
const loading = ref(false);
const result = ref(null);

function prefill() {
  const tpl = TEMPLATES[type.value];
  bodyJson.value = JSON.stringify(typeof tpl === 'function' ? tpl() : tpl, null, 2);
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

  const payload = { type: type.value, to: to.value, ...parsed };
  loading.value = true;
  result.value = null;
  try {
    const res = await fetch(`${API_URL}/api/sample-api/email/test`, {
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
.email-test-wrap {
  padding: 16px;
}
</style>
