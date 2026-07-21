<template>
  <div style="padding: 24px; max-width: 600px">
    <h2>Knowledge Base Upload</h2>
    <a-form layout="vertical">
      <a-form-item label="Document Title">
        <a-input v-model:value="title" placeholder="e.g. Refund Policy" />
      </a-form-item>
      <a-form-item label="Content (plain text)">
        <a-textarea v-model:value="content" :rows="12" placeholder="Paste your document content here..." />
      </a-form-item>
      <a-button type="primary" @click="handleUpload" :loading="loading">Upload to KB</a-button>
    </a-form>

    <a-divider />
    <h3>Uploaded Documents</h3>
    <a-table :columns="columns" :data-source="docs" row-key="id" :loading="loading" size="small" />
  </div>
</template>

<script setup>
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';

const API = 'http://127.0.0.1:3101/api/sample-botbuilder';

const title = ref('');
const content = ref('');
const docs = ref([]);
const loading = ref(false);

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: 'Title', dataIndex: 'filename', key: 'filename' },
  { title: 'Created', dataIndex: 'created_at', key: 'createdAt' },
];

const api = async (method, path, body) => {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  return res.json();
};

const fetchDocs = async () => {
  loading.value = true;
  try {
    const data = await api('GET', '/rag/documents');
    docs.value = data.documents || [];
  } catch (e) {
    message.error('Failed to load documents');
  } finally {
    loading.value = false;
  }
};

const handleUpload = async () => {
  if (!title.value || !content.value) {
    message.warning('Title and content are required');
    return;
  }
  loading.value = true;
  try {
    console.log('Uploading...', { title: title.value, content: content.value.slice(0, 50) });
    const data = await api('POST', '/rag/upload', { title: title.value, content: content.value });
    console.log('Upload response:', data);
    if (data.ok) {
      message.success('Uploaded and ingested!');
    } else {
      message.error(data.error || 'Failed');
    }
    title.value = '';
    content.value = '';
    fetchDocs();
  } catch (e) {
    console.error('Upload error:', e);
    message.error('Failed to upload');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchDocs);
</script>
