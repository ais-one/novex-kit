<template>
  <div style="padding: 24px; max-width: 600px; margin: 0 auto">
    <h2>Bot Test Chat</h2>
    <p style="color: #888">Send a message to test the bot. Messages are sent via Telegram webhook URL.</p>
    <a-alert v-if="error" type="error" :message="error" closable style="margin-bottom: 12px" />
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; min-height: 300px; max-height: 500px; overflow-y: auto; margin-bottom: 12px">
      <div v-for="(msg, i) in messages" :key="i" :style="{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: '8px' }">
        <a-tag :color="msg.role === 'user' ? 'blue' : 'green'" style="max-width: 80%; white-space: normal; text-align: left; padding: 8px; height: auto;">
          {{ msg.content }}
        </a-tag>
      </div>
      <div v-if="loading" style="text-align: left">
        <a-tag color="green" style="opacity: 0.5">Thinking...</a-tag>
      </div>
    </div>
    <a-space style="width: 100%">
      <a-input v-model:value="input" @press-enter="send" placeholder="Type a message..." style="flex: 1" />
      <a-button type="primary" @click="send" :loading="loading">Send</a-button>
    </a-space>
  </div>
</template>

<script setup>
import { http } from '@common/vue/plugins/fetch.js';
import { ref } from 'vue';

const input = ref('');
const messages = ref([]);
const loading = ref(false);
const error = ref('');

const send = async () => {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  messages.value.push({ role: 'user', content: text });
  loading.value = true;
  error.value = '';

  try {
    // Simulate Telegram update for testing
    await http.post('http://127.0.0.1:3101/api/sample-botbuilder/telegram/webhook', {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        date: Math.floor(Date.now() / 1000),
        chat: { id: 12345, type: 'private', first_name: 'TestUser' },
        from: { id: 12345, is_bot: false, first_name: 'TestUser' },
        text: text,
      },
    });
  } catch (e) {
    error.value = e?.data?.error || 'Failed to send';
  } finally {
    loading.value = false;
  }
};
</script>
