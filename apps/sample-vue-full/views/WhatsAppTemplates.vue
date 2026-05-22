<template>
  <div class="wa-tmpl-wrap">
    <!-- List -->
    <a-card title="WhatsApp Templates" style="max-width: 900px; margin: 40px auto">
      <template #extra>
        <a-space>
          <a-select v-model:value="filterStatus" style="width: 160px" @change="loadTemplates">
            <a-select-option value="">All statuses</a-select-option>
            <a-select-option value="APPROVED">Approved</a-select-option>
            <a-select-option value="PENDING">Pending</a-select-option>
            <a-select-option value="REJECTED">Rejected</a-select-option>
            <a-select-option value="PAUSED">Paused</a-select-option>
            <a-select-option value="DISABLED">Disabled</a-select-option>
          </a-select>
          <a-button type="primary" @click="openCreate">New Template</a-button>
        </a-space>
      </template>

      <a-alert
        v-if="listError"
        type="error"
        :message="listError"
        show-icon
        style="margin-bottom: 16px"
        closable
        @close="listError = ''"
      />

      <a-table
        :data-source="templates"
        :columns="columns"
        :loading="listLoading"
        row-key="id"
        size="small"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'rejected_reason'">
            <span style="font-size: 12px; color: #888">{{ record.rejected_reason ?? '–' }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="openEdit(record)">Edit</a-button>
              <a-popconfirm
                :title="`Delete template '${record.name}'?`"
                ok-text="Delete"
                ok-type="danger"
                @confirm="deleteOne(record.name)"
              >
                <a-button size="small" danger>Delete</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>

      <a-button style="margin-top: 12px" @click="loadTemplates">Refresh</a-button>
    </a-card>

    <!-- Create / Edit modal -->
    <a-modal
      v-model:open="modalOpen"
      :title="editId ? 'Edit Template' : 'Create Template'"
      :confirm-loading="saving"
      ok-text="Save"
      width="680px"
      @ok="save"
      @cancel="closeModal"
    >
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="Name" required>
              <a-input v-model:value="form.name" :disabled="!!editId" placeholder="e.g. order_confirmation" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="Language" required>
              <a-input v-model:value="form.language" placeholder="en_US" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="Category" required>
              <a-select v-model:value="form.category" style="width: 100%">
                <a-select-option value="UTILITY">UTILITY</a-select-option>
                <a-select-option value="MARKETING">MARKETING</a-select-option>
                <a-select-option value="AUTHENTICATION">AUTHENTICATION</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Components (JSON)" required>
          <a-textarea
            v-model:value="componentsJson"
            :rows="12"
            style="font-family: monospace; font-size: 12px"
            :status="jsonError ? 'error' : ''"
          />
          <div v-if="jsonError" style="color: #ff4d4f; font-size: 12px; margin-top: 4px">{{ jsonError }}</div>
        </a-form-item>

        <a-collapse size="small" style="margin-top: 4px">
          <a-collapse-panel key="example" header="Example: simple text template">
            <pre style="font-size: 11px; margin: 0">{{ EXAMPLE_COMPONENTS }}</pre>
          </a-collapse-panel>
        </a-collapse>

        <a-alert
          v-if="saveError"
          type="error"
          :message="saveError"
          show-icon
          style="margin-top: 12px"
        />
        <a-alert
          v-if="saveSuccess"
          type="success"
          :message="saveSuccess"
          show-icon
          style="margin-top: 12px"
        />
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';
const BASE = `${API_URL}/api/sample-api/whatsapp/templates`;

// ── Table ───────────────────────────────────────────────────────────────────
const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Language', dataIndex: 'language', key: 'language', width: 100 },
  { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
  { title: 'Status', key: 'status', width: 140 },
  { title: 'Reject reason', key: 'rejected_reason', ellipsis: true },
  { title: 'Actions', key: 'actions', width: 140 },
];

const statusColor = status => {
  const map = {
    APPROVED: 'green',
    PENDING: 'blue',
    REJECTED: 'red',
    DISABLED: 'orange',
    PAUSED: 'orange',
    DELETED: 'default',
  };
  return map[status] ?? 'default';
};

const templates = ref([]);
const listLoading = ref(false);
const listError = ref('');

const filterStatus = ref('');

const loadTemplates = async () => {
  listLoading.value = true;
  listError.value = '';
  try {
    const qs = filterStatus.value ? `?limit=50&status=${filterStatus.value}` : '?limit=50';
    const res = await fetch(`${BASE}${qs}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    templates.value = json.data ?? [];
  } catch (err) {
    listError.value = err?.message ?? String(err);
  } finally {
    listLoading.value = false;
  }
};

onMounted(loadTemplates);

// ── Create / Edit modal ──────────────────────────────────────────────────────
const modalOpen = ref(false);
const editId = ref('');
const saving = ref(false);
const saveError = ref('');
const saveSuccess = ref('');
const jsonError = ref('');

const EMPTY_FORM = () => ({ name: '', language: 'en_US', category: 'UTILITY' });
const form = ref(EMPTY_FORM());
const componentsJson = ref(
  JSON.stringify([{ type: 'BODY', text: 'Hello {{1}}, your order {{2}} is confirmed.' }], null, 2),
);

const EXAMPLE_COMPONENTS = JSON.stringify(
  [
    { type: 'HEADER', format: 'TEXT', text: 'Order Update' },
    {
      type: 'BODY',
      text: 'Hi {{1}}, your order {{2}} has been confirmed.',
      // example is REQUIRED when body text contains {{1}}-style variables
      example: { body_text: [['John', 'ORD-9876']] },
    },
    { type: 'FOOTER', text: 'Thank you for shopping with us.' },
    {
      type: 'BUTTONS',
      buttons: [{ type: 'QUICK_REPLY', text: 'Track Order' }],
    },
  ],
  null,
  2,
);

const openCreate = () => {
  editId.value = '';
  form.value = EMPTY_FORM();
  // Note: if you use {{1}} variables, you MUST include example.body_text or Meta returns "invalid parameter"
  componentsJson.value = JSON.stringify([{ type: 'BODY', text: 'Hello! Your request has been received.' }], null, 2);
  saveError.value = '';
  saveSuccess.value = '';
  jsonError.value = '';
  modalOpen.value = true;
};

const openEdit = record => {
  editId.value = record.id;
  form.value = { name: record.name, language: record.language, category: record.category };
  componentsJson.value = JSON.stringify(record.components ?? [], null, 2);
  saveError.value = '';
  saveSuccess.value = '';
  jsonError.value = '';
  modalOpen.value = true;
};

const closeModal = () => {
  modalOpen.value = false;
};

const save = async () => {
  jsonError.value = '';
  saveError.value = '';
  saveSuccess.value = '';

  let components;
  try {
    components = JSON.parse(componentsJson.value);
  } catch {
    jsonError.value = 'Invalid JSON in components';
    return;
  }

  saving.value = true;
  try {
    let res;
    if (editId.value) {
      res = await fetch(`${BASE}/${editId.value}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ components }),
      });
    } else {
      res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form.value, components }),
      });
    }
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    saveSuccess.value = editId.value ? 'Template updated.' : `Template created (status: ${json.status}).`;
    await loadTemplates();
  } catch (err) {
    saveError.value = err?.message ?? String(err);
  } finally {
    saving.value = false;
  }
};

// ── Delete ───────────────────────────────────────────────────────────────────
const deleteOne = async name => {
  try {
    const res = await fetch(`${BASE}?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    await loadTemplates();
  } catch (err) {
    listError.value = err?.message ?? String(err);
  }
};
</script>

<style scoped>
.wa-tmpl-wrap {
  padding: 8px 0;
}
</style>
