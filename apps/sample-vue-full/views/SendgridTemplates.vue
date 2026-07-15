<template>
  <div class="email-tmpl-wrap">
    <!-- ── Template List ─────────────────────────────────────────────────── -->
    <a-card title="Email Templates (SendGrid Dynamic)" style="max-width: 960px; margin: 40px auto">
      <template #extra>
        <a-space>
          <a-select v-model:value="configLabel" placeholder="Select config" style="width: 200px" :loading="configsLoading" @change="loadTemplates">
            <a-select-option v-for="c in configs" :key="c.label" :value="c.label">{{ c.label }} ({{ c.senderIdentity.sender_email }})</a-select-option>
          </a-select>
          <a-button type="primary" @click="openCreateTemplate">New Template</a-button>
        </a-space>
      </template>

      <a-alert
        v-if="listError"
        type="error"
        :message="listError"
        show-icon
        closable
        style="margin-bottom: 16px"
        @close="listError = ''"
      />

      <a-table
        :data-source="templates"
        :columns="templateColumns"
        :loading="listLoading"
        row-key="id"
        size="small"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'id'">
            <code style="font-size: 11px; background: #f5f5f5; padding: 2px 4px; border-radius: 3px; user-select: all">{{ record.id }}</code>
          </template>
          <template v-if="column.key === 'active_version'">
            <span v-if="activeVersion(record)" style="font-size: 12px">
              {{ activeVersion(record).name }}
              <span style="color: #888"> — {{ activeVersion(record).subject ?? '(no subject)' }}</span>
            </span>
            <span v-else-if="Array.isArray(record.versions)" style="color: #ccc; font-size: 12px">no active version</span>
            <span v-else style="color: #bbb; font-size: 12px">–</span>
          </template>
          <template v-if="column.key === 'updated_at'">
            <span style="font-size: 12px; color: #888">{{ record.updated_at?.slice(0, 16).replace('T', ' ') ?? '–' }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="openRenameTemplate(record)">Rename</a-button>
              <a-button size="small" @click="openDuplicate(record)">Duplicate</a-button>
              <a-button size="small" type="primary" ghost @click="openVersions(record)">Versions</a-button>
              <a-popconfirm
                :title="`Delete template '${record.name}' and ALL its versions?`"
                ok-text="Delete"
                ok-type="danger"
                @confirm="deleteOne(record.id)"
              >
                <a-button size="small" danger>Delete</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>

      <a-button style="margin-top: 12px" @click="loadTemplates">Refresh</a-button>
    </a-card>

    <!-- ── Create Template modal ────────────────────────────────────────── -->
    <a-modal
      v-model:open="createOpen"
      title="New Template"
      :confirm-loading="createSaving"
      ok-text="Create"
      @ok="saveCreateTemplate"
      @cancel="createOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="Template name" required>
          <a-input v-model:value="createName" placeholder="e.g. Welcome Email" @pressEnter="saveCreateTemplate" />
        </a-form-item>
        <a-alert v-if="createError" type="error" :message="createError" show-icon style="margin-top: 8px" />
      </a-form>
    </a-modal>

    <!-- ── Rename Template modal ─────────────────────────────────────────── -->
    <a-modal
      v-model:open="renameOpen"
      title="Rename Template"
      :confirm-loading="renameSaving"
      ok-text="Save"
      @ok="saveRename"
      @cancel="renameOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="New name" required>
          <a-input v-model:value="renameName" @pressEnter="saveRename" />
        </a-form-item>
        <a-alert v-if="renameError" type="error" :message="renameError" show-icon style="margin-top: 8px" />
      </a-form>
    </a-modal>

    <!-- ── Duplicate Template modal ──────────────────────────────────────── -->
    <a-modal
      v-model:open="dupOpen"
      title="Duplicate Template"
      :confirm-loading="dupSaving"
      ok-text="Duplicate"
      @ok="saveDuplicate"
      @cancel="dupOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="New template name (optional — leave blank to auto-name)">
          <a-input v-model:value="dupName" placeholder="Copy of original" />
        </a-form-item>
        <a-alert v-if="dupError" type="error" :message="dupError" show-icon style="margin-top: 8px" />
      </a-form>
    </a-modal>

    <!-- ── Version Management drawer ─────────────────────────────────────── -->
    <a-drawer
      v-model:open="versionDrawerOpen"
      :title="`Versions — ${selectedTemplate?.name ?? ''}`"
      width="720"
      @close="versionDrawerOpen = false"
    >
      <a-button type="primary" style="margin-bottom: 16px" @click="openCreateVersion">Add Version</a-button>

      <a-alert
        v-if="versionListError"
        type="error"
        :message="versionListError"
        show-icon
        closable
        style="margin-bottom: 12px"
        @close="versionListError = ''"
      />

      <a-table
        :data-source="selectedVersions"
        :columns="versionColumns"
        :loading="versionLoading"
        row-key="id"
        size="small"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'active'">
            <a-tag :color="record.active === 1 ? 'green' : 'default'">
              {{ record.active === 1 ? 'Active' : 'Draft' }}
            </a-tag>
          </template>
          <template v-if="column.key === 'updated_at'">
            <span style="font-size: 12px; color: #888">{{ record.updated_at?.slice(0, 16).replace('T', ' ') ?? '–' }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="openEditVersion(record)">Edit</a-button>
              <a-popconfirm
                v-if="record.active !== 1"
                :title="`Activate version '${record.name}'?`"
                ok-text="Activate"
                @confirm="activateVersion(record)"
              >
                <a-button size="small" type="primary" ghost>Activate</a-button>
              </a-popconfirm>
              <a-tag v-else color="green" style="margin: 0">Live</a-tag>
              <a-popconfirm
                :title="`Delete version '${record.name}'?`"
                ok-text="Delete"
                ok-type="danger"
                @confirm="deleteVersion(record)"
              >
                <a-button size="small" danger>Delete</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>

      <a-alert
        v-if="versionActionMsg"
        :type="versionActionMsg.ok ? 'success' : 'error'"
        :message="versionActionMsg.text"
        show-icon
        closable
        style="margin-top: 16px"
        @close="versionActionMsg = null"
      />
    </a-drawer>

    <!-- ── Create / Edit Version modal ───────────────────────────────────── -->
    <a-modal
      v-model:open="versionModalOpen"
      :title="editVersionId ? 'Edit Version' : 'New Version'"
      :confirm-loading="versionSaving"
      ok-text="Save"
      width="700px"
      @ok="saveVersion"
      @cancel="versionModalOpen = false"
    >
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="Version name" required>
              <a-input v-model:value="versionForm.name" placeholder="e.g. v1 — welcome redesign" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Subject line">
              <a-input v-model:value="versionForm.subject" placeholder="Hello {{name}}!" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="HTML content (Handlebars supported)">
          <a-textarea
            v-model:value="versionForm.html_content"
            :rows="10"
            style="font-family: monospace; font-size: 12px"
            placeholder="<p>Hello {{name}}, welcome!</p>"
          />
        </a-form-item>

        <a-form-item label="Plain-text fallback">
          <a-textarea
            v-model:value="versionForm.plain_content"
            :rows="3"
            style="font-family: monospace; font-size: 12px"
            placeholder="Hello {{name}}, welcome!"
          />
        </a-form-item>

        <a-form-item>
          <a-checkbox v-model:checked="versionForm.setActive">Set as active version immediately</a-checkbox>
        </a-form-item>

        <a-alert v-if="versionSaveError" type="error" :message="versionSaveError" show-icon style="margin-top: 8px" />
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { http } from '@common/vue/plugins/fetch.js';
import { onMounted, ref } from 'vue';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';
const BASE = '/api/sample-api/sendgrid/templates';

// ─── Config selector ──────────────────────────────────────────────────────────

const configs = ref([]);
const configLabel = ref('');
const configsLoading = ref(false);

async function fetchConfigs() {
  configsLoading.value = true;
  try {
    const res = await http.get('/api/sample-api/tenant-comms');
    if (res.data.ok) {
      configs.value = res.data.data.filter(c => c.channel === 'email');
    }
    if (configs.value.length > 0 && !configLabel.value) {
      configLabel.value = configs.value[0].label;
    }
  } catch (err) {
    console.error('Failed to fetch Email configs:', err);
  } finally {
    configsLoading.value = false;
  }
}

function configQs() {
  return configLabel.value ? `?configLabel=${encodeURIComponent(configLabel.value)}` : '';
}

// ── Template table ───────────────────────────────────────────────────────────
const templateColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'ID', key: 'id', width: 220 },
  { title: 'Active Version', key: 'active_version', ellipsis: true },
  { title: 'Updated At', key: 'updated_at', width: 140 },
  { title: 'Actions', key: 'actions', width: 260 },
];

const activeVersion = template => template.versions?.find(v => v.active === 1);

const templates = ref([]);
const listLoading = ref(false);
const listError = ref('');

const loadTemplates = async () => {
  if (!configLabel.value) return;
  listLoading.value = true;
  listError.value = '';
  try {
    const res = await http.get(`${BASE}${configQs()}`);
    if (!res.data.ok) throw new Error(res.data.error ?? 'Failed to load templates');
    templates.value = res.data.templates ?? [];
  } catch (err) {
    listError.value = err?.message ?? String(err);
  } finally {
    listLoading.value = false;
  }
};

onMounted(async () => {
  await fetchConfigs();
  if (configLabel.value) loadTemplates();
});

// ── Create Template ──────────────────────────────────────────────────────────
const createOpen = ref(false);
const createName = ref('');
const createSaving = ref(false);
const createError = ref('');

const openCreateTemplate = () => {
  createName.value = '';
  createError.value = '';
  createOpen.value = true;
};

const saveCreateTemplate = async () => {
  if (!createName.value.trim()) {
    createError.value = 'Name is required';
    return;
  }
  createSaving.value = true;
  createError.value = '';
  try {
    const res = await http.post(`${BASE}${configQs()}`, {
      name: createName.value.trim(),
      configLabel: configLabel.value,
    });
    if (!res.data.ok) throw new Error(res.data.error);
    createOpen.value = false;
    await loadTemplates();
  } catch (err) {
    createError.value = err?.message ?? String(err);
  } finally {
    createSaving.value = false;
  }
};

// ── Rename Template ──────────────────────────────────────────────────────────
const renameOpen = ref(false);
const renameName = ref('');
const renameId = ref('');
const renameSaving = ref(false);
const renameError = ref('');

const openRenameTemplate = record => {
  renameId.value = record.id;
  renameName.value = record.name;
  renameError.value = '';
  renameOpen.value = true;
};

const saveRename = async () => {
  if (!renameName.value.trim()) {
    renameError.value = 'Name is required';
    return;
  }
  renameSaving.value = true;
  renameError.value = '';
  try {
    const res = await http.patch(`${BASE}/${renameId.value}${configQs()}`, {
      name: renameName.value.trim(),
      configLabel: configLabel.value,
    });
    if (!res.data.ok) throw new Error(res.data.error);
    renameOpen.value = false;
    await loadTemplates();
  } catch (err) {
    renameError.value = err?.message ?? String(err);
  } finally {
    renameSaving.value = false;
  }
};

// ── Duplicate Template ───────────────────────────────────────────────────────
const dupOpen = ref(false);
const dupName = ref('');
const dupId = ref('');
const dupSaving = ref(false);
const dupError = ref('');

const openDuplicate = record => {
  dupId.value = record.id;
  dupName.value = '';
  dupError.value = '';
  dupOpen.value = true;
};

const saveDuplicate = async () => {
  dupSaving.value = true;
  dupError.value = '';
  try {
    const body = dupName.value.trim()
      ? { name: dupName.value.trim(), configLabel: configLabel.value }
      : { configLabel: configLabel.value };
    const res = await http.post(`${BASE}/${dupId.value}/duplicate${configQs()}`, body);
    if (!res.data.ok) throw new Error(res.data.error);
    dupOpen.value = false;
    await loadTemplates();
  } catch (err) {
    dupError.value = err?.message ?? String(err);
  } finally {
    dupSaving.value = false;
  }
};

// ── Delete Template ──────────────────────────────────────────────────────────
const deleteOne = async id => {
  try {
    const res = await http.del(`${BASE}/${id}${configQs()}`);
    if (!res.data.ok) throw new Error(res.data.error);
    await loadTemplates();
  } catch (err) {
    listError.value = err?.message ?? String(err);
  }
};

// ── Version Drawer ───────────────────────────────────────────────────────────
const versionColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Subject', dataIndex: 'subject', key: 'subject', ellipsis: true },
  { title: 'Status', key: 'active', width: 80 },
  { title: 'Updated At', key: 'updated_at', width: 140 },
  { title: 'Actions', key: 'actions', width: 220 },
];

const versionDrawerOpen = ref(false);
const selectedTemplate = ref(null);
const selectedVersions = ref([]);
const versionLoading = ref(false);
const versionListError = ref('');
const versionActionMsg = ref(null);

const openVersions = async record => {
  selectedTemplate.value = record;
  selectedVersions.value = [];
  versionListError.value = '';
  versionActionMsg.value = null;
  versionDrawerOpen.value = true;
  await reloadVersions();
};

const reloadVersions = async () => {
  if (!selectedTemplate.value) return;
  versionLoading.value = true;
  versionListError.value = '';
  try {
    const res = await http.get(`${BASE}/${selectedTemplate.value.id}${configQs()}`);
    if (!res.data.ok) throw new Error(res.data.error ?? 'Failed to load versions');
    const versions = res.data.versions ?? [];
    selectedVersions.value = versions;
    templates.value = templates.value.map(t => (t.id === selectedTemplate.value.id ? { ...t, versions } : t));
  } catch (err) {
    versionListError.value = err?.message ?? String(err);
  } finally {
    versionLoading.value = false;
  }
};

const activateVersion = async version => {
  versionActionMsg.value = null;
  try {
    const res = await http.post(`${BASE}/${selectedTemplate.value.id}/versions/${version.id}/activate${configQs()}`);
    if (!res.data.ok) throw new Error(res.data.error);
    versionActionMsg.value = { ok: true, text: `Version '${version.name}' is now active.` };
    await reloadVersions();
  } catch (err) {
    versionActionMsg.value = { ok: false, text: err?.message ?? String(err) };
  }
};

const deleteVersion = async version => {
  versionActionMsg.value = null;
  try {
    const res = await http.del(`${BASE}/${selectedTemplate.value.id}/versions/${version.id}${configQs()}`);
    if (!res.data.ok) throw new Error(res.data.error);
    versionActionMsg.value = { ok: true, text: `Version '${version.name}' deleted.` };
    await reloadVersions();
  } catch (err) {
    versionActionMsg.value = { ok: false, text: err?.message ?? String(err) };
  }
};

// ── Create / Edit Version ────────────────────────────────────────────────────
const versionModalOpen = ref(false);
const editVersionId = ref('');
const versionSaving = ref(false);
const versionSaveError = ref('');

const EMPTY_VERSION_FORM = () => ({
  name: '',
  subject: '',
  html_content: '',
  plain_content: '',
  setActive: false,
});

const versionForm = ref(EMPTY_VERSION_FORM());

const openCreateVersion = () => {
  editVersionId.value = '';
  versionForm.value = EMPTY_VERSION_FORM();
  versionSaveError.value = '';
  versionModalOpen.value = true;
};

const openEditVersion = version => {
  editVersionId.value = version.id;
  versionForm.value = {
    name: version.name ?? '',
    subject: version.subject ?? '',
    html_content: version.html_content ?? '',
    plain_content: version.plain_content ?? '',
    setActive: false,
  };
  versionSaveError.value = '';
  versionModalOpen.value = true;
};

const saveVersion = async () => {
  if (!versionForm.value.name.trim()) {
    versionSaveError.value = 'Version name is required';
    return;
  }
  versionSaving.value = true;
  versionSaveError.value = '';
  try {
    const { setActive, ...fields } = versionForm.value;
    const payload = { ...fields, ...(setActive ? { active: 1 } : {}) };
    const templateId = selectedTemplate.value.id;

    let res;
    if (editVersionId.value) {
      res = await http.patch(`${BASE}/${templateId}/versions/${editVersionId.value}${configQs()}`, {
        ...payload,
        configLabel: configLabel.value,
      });
    } else {
      res = await http.post(`${BASE}/${templateId}/versions${configQs()}`, {
        ...payload,
        configLabel: configLabel.value,
      });
    }

    if (!res.data.ok) throw new Error(res.data.error);
    versionModalOpen.value = false;
    versionActionMsg.value = {
      ok: true,
      text: editVersionId.value ? 'Version updated.' : 'Version created.',
    };
    await reloadVersions();
  } catch (err) {
    versionSaveError.value = err?.message ?? String(err);
  } finally {
    versionSaving.value = false;
  }
};
</script>

<style scoped>
.email-tmpl-wrap {
  padding: 16px;
}
</style>
