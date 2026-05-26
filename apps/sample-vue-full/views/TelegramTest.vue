<template>
  <div class="tg-test-wrap">
    <a-card title="Telegram Bot Test Sender" style="max-width: 600px; margin: 40px auto">
      <a-form layout="vertical" @submit.prevent="send">
        <a-form-item label="Send from (config)">
          <a-select
            v-model:value="configLabel"
            placeholder="Select a Telegram config"
            style="width: 100%"
            :loading="configsLoading"
          >
            <a-select-option v-for="c in configs" :key="c.label" :value="c.label">
              {{ c.label }}{{ c.senderIdentity.bot_name ? ` (${c.senderIdentity.bot_name})` : '' }}
            </a-select-option>
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
            <a-form-item label="To (chat ID or @username)">
              <a-input v-model:value="to" placeholder="123456789 or @username or -100123456789" />
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
      configs.value = data.data.filter(c => c.channel === 'telegram');
    }
    if (configs.value.length > 0 && !configLabel.value) {
      configLabel.value = configs.value[0].label;
    }
  } catch (err) {
    console.error('Failed to fetch Telegram configs:', err);
  } finally {
    configsLoading.value = false;
  }
}

onMounted(fetchConfigs);

const TYPES = [
  { value: 'message', label: 'Text Message' },
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Document / File' },
  { value: 'voice', label: 'Voice Message (OGG/OPUS)' },
  { value: 'video_note', label: 'Video Note (Round Video)' },
  { value: 'sticker', label: 'Sticker' },
  { value: 'animation', label: 'Animation (GIF)' },
  { value: 'media_group', label: 'Media Group (Album)' },
  { value: 'location', label: 'Location' },
  { value: 'venue', label: 'Venue' },
  { value: 'contact', label: 'Contact' },
  { value: 'poll', label: 'Poll' },
  { value: 'dice', label: 'Dice / Game' },
  { value: 'chat_action', label: 'Chat Action (Typing Indicator)' },
  { value: 'forward', label: 'Forward Message' },
  { value: 'copy', label: 'Copy Message' },
  { value: 'edit_text', label: 'Edit Message Text' },
  { value: 'edit_caption', label: 'Edit Message Caption' },
  { value: 'edit_markup', label: 'Edit Reply Markup' },
  { value: 'delete', label: 'Delete Message' },
  { value: 'pin', label: 'Pin Message' },
  { value: 'unpin', label: 'Unpin Message' },
];

const TEMPLATES = {
  message: {
    text: 'Hello from the Telegram test page!',
    '_docs (remove this)':
      'Optional: parse_mode ("HTML"|"Markdown"|"MarkdownV2"), disable_web_page_preview, reply_markup',
    parse_mode: 'HTML',
  },
  photo: {
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
    caption: 'Test photo',
    '_docs (remove this)':
      'photo: HTTPS URL, local path, or "file_id:<id>". Optional: has_spoiler, caption, parse_mode',
  },
  video: {
    video: 'https://www.w3schools.com/html/mov_bbb.mp4',
    caption: 'Test video',
    '_docs (remove this)':
      'video: HTTPS URL, local path, or "file_id:<id>". Optional: duration, width, height, supports_streaming, has_spoiler, thumbnail',
  },
  audio: {
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    caption: 'Test audio',
    performer: 'Test Artist',
    title: 'Test Song',
    '_docs (remove this)':
      'audio: HTTPS URL, local path, or "file_id:<id>". Optional: duration, performer, title, thumbnail',
  },
  document: {
    document: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf',
    caption: 'Sample PDF',
    '_docs (remove this)':
      'document: HTTPS URL, local path, or "file_id:<id>". Optional: thumbnail, disable_content_type_detection',
  },
  voice: {
    voice: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    '_docs (remove this)':
      'voice: OGG/OPUS encoded audio. HTTPS URL, local path, or "file_id:<id>". Optional: duration',
  },
  video_note: {
    video_note: 'file_id:<replace_with_actual_file_id>',
    '_docs (remove this)':
      'video_note: must be 1:1 aspect ratio, max 639px diameter. HTTPS URL, local path, or "file_id:<id>". Optional: duration, length',
  },
  sticker: {
    sticker: 'file_id:<replace_with_actual_sticker_file_id>',
    '_docs (remove this)':
      'sticker: WEBP, TGS (animated), or WEBM (video) sticker. "file_id:<id>", HTTPS URL, or local path.',
  },
  animation: {
    animation: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif',
    caption: 'Test animation',
    '_docs (remove this)':
      'animation: GIF or H.264/MPEG-4 AVC video. HTTPS URL, local path, or "file_id:<id>". Optional: has_spoiler, duration, width, height',
  },
  media_group: {
    media: [
      {
        type: 'photo',
        file: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
        caption: 'First image',
      },
      {
        type: 'photo',
        file: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
      },
    ],
    '_docs (remove this)':
      '2–10 items. Each item: { type: "photo"|"video"|"audio"|"document", file, caption?, parse_mode?, has_spoiler? }',
  },
  location: {
    latitude: 3.139,
    longitude: 101.6869,
    '_docs (remove this)':
      'Optional: horizontal_accuracy (0–1500m), live_period (60–86400s for live location), heading (1–360), proximity_alert_radius',
  },
  venue: {
    venue: {
      latitude: 3.139,
      longitude: 101.6869,
      title: 'Kuala Lumpur City Centre',
      address: 'Kuala Lumpur, Malaysia',
      foursquare_id: '',
    },
    '_docs (remove this)':
      'venue: { latitude, longitude, title (required), address (required), foursquare_id?, foursquare_type?, google_place_id?, google_place_type? }',
  },
  contact: {
    contact: {
      phone_number: '+60123456789',
      first_name: 'John',
      last_name: 'Doe',
      vcard: '',
    },
    '_docs (remove this)': 'contact: { phone_number (required), first_name (required), last_name?, vcard? }',
  },
  poll: {
    question: 'What is your favourite programming language?',
    options: ['TypeScript', 'Python', 'Go', 'Rust'],
    '_docs (remove this)':
      'options: 2–10 strings. Optional: type ("regular"|"quiz"), is_anonymous, allows_multiple_answers, correct_option_id (quiz only), explanation (quiz only), open_period (5–600s), close_date (unix timestamp)',
  },
  dice: {
    emoji: '🎲',
    '_docs (remove this)':
      'emoji: "🎲" (dice) | "🎯" (darts) | "🏀" (basketball) | "⚽" (football) | "🎳" (bowling) | "🎰" (slot machine). Default: 🎲',
  },
  chat_action: {
    action: 'typing',
    '_docs (remove this)':
      'action: "typing" | "upload_photo" | "record_video" | "upload_video" | "record_voice" | "upload_voice" | "upload_document" | "choose_sticker" | "find_location" | "record_video_note" | "upload_video_note"',
  },
  forward: {
    from_chat_id: '<source_chat_id>',
    message_id: 12345,
    '_docs (remove this)': 'Forwards a message from from_chat_id. to = destination chat ID.',
  },
  copy: {
    from_chat_id: '<source_chat_id>',
    message_id: 12345,
    caption: 'Optional new caption',
    '_docs (remove this)': 'Copies a message without the forward header. to = destination chat ID.',
  },
  edit_text: {
    message_id: 12345,
    text: 'Updated message text',
    '_docs (remove this)':
      'to = the chat where the message lives. message_id = ID of the message to edit. Optional: parse_mode, disable_web_page_preview, reply_markup',
  },
  edit_caption: {
    message_id: 12345,
    caption: 'Updated caption text',
    '_docs (remove this)':
      'to = the chat where the message lives. message_id = ID of the message to edit. Optional: parse_mode, reply_markup',
  },
  edit_markup: {
    message_id: 12345,
    reply_markup: '{"inline_keyboard":[[{"text":"Button","callback_data":"btn1"}]]}',
    '_docs (remove this)': 'reply_markup must be a JSON string of an InlineKeyboardMarkup object.',
  },
  delete: {
    message_id: 12345,
    '_docs (remove this)': 'to = the chat where the message lives. message_id = ID of the message to delete.',
  },
  pin: {
    message_id: 12345,
    disable_notification: false,
    '_docs (remove this)':
      'to = the chat. message_id = ID of the message to pin. disable_notification: true to pin silently.',
  },
  unpin: {
    message_id: 12345,
    '_docs (remove this)': 'to = the chat. message_id = ID of the message to unpin.',
  },
};

const type = ref('message');
const to = ref('');
const bodyJson = ref(JSON.stringify(TEMPLATES.message, null, 2));
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
    const res = await fetch(`${API_URL}/api/sample-api/telegram/test`, {
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
.tg-test-wrap {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
}
</style>
