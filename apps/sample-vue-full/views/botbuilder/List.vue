<template>
  <div style="padding: 24px">
    <h2>Bot Configurations</h2>
    <a-button type="primary" @click="$router.push('/botbuilder/editor/new')" style="margin-bottom: 16px">Create New</a-button>
    <a-table :columns="columns" :data-source="configs" row-key="id" :loading="loading">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === 'published' ? 'green' : 'orange'">{{ record.status }}</a-tag>
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a @click="$router.push(`/botbuilder/editor/${record.id}`)">Edit</a>
            <a-popconfirm title="Delete this config?" @confirm="handleDelete(record.id)">
              <a style="color: red">Delete</a>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { http } from '@common/vue/plugins/fetch.js';
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';

const configs = ref([]);
const loading = ref(false);

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Status', key: 'status' },
  { title: 'Updated', dataIndex: 'updatedAt', key: 'updatedAt' },
  { title: 'Action', key: 'action' },
];

const fetch = async () => {
  loading.value = true;
  try {
    const rv = await http.get('http://127.0.0.1:3101/api/sample-botbuilder/graph/configs');
    configs.value = rv.data?.configs || [];
  } catch (e) {
    message.error(e?.data?.error || 'Failed to fetch');
  } finally {
    loading.value = false;
  }
};

const handleDelete = async id => {
  try {
    await http.delete(`http://127.0.0.1:3101/api/sample-botbuilder/graph/configs/${id}`);
    message.success('Deleted');
    fetch();
  } catch (e) {
    message.error(e?.data?.error || 'Failed to delete');
  }
};

onMounted(fetch);
</script>
