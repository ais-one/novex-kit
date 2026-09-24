<template>
  <div class="demo-signpad">
    <a-row :gutter="[16, 16]">

      <!-- Full signature — wide landscape canvas, thin black ink -->
      <a-col :xs="24" :lg="16">
        <SignaturePad
          v-model="signature1"
          title="Full Signature"
          :width="420"
          :height="150"
          :line-width="2"
          stroke-style="#1e293b"
          background-color="#ffffff"
          @update:model-value="onSign1"
        />
      </a-col>

      <!-- Initials / Paraf — small square canvas, thicker indigo ink -->
      <a-col :xs="24" :lg="8">
        <SignaturePad
          v-model="signature2"
          title="Initials / Paraf"
          :width="150"
          :height="150"
          :line-width="3"
          stroke-style="#4f46e5"
          background-color="#f5f3ff"
          @update:model-value="onSign2"
        />
      </a-col>

      <!-- Log card -->
      <a-col :span="24">
        <a-card :bordered="false" class="log-card">
          <template #title>
            <div class="card-title-row">
              <FileTextOutlined class="card-title-icon" />
              <span>Signature Log</span>
              <a-badge :count="log.length" :number-style="{ background: '#4f46e5' }" />
            </div>
          </template>
          <template #extra>
            <a-button v-if="log.length" type="text" size="small" danger @click="log = []">
              Clear All
            </a-button>
          </template>

          <a-empty v-if="!log.length" description="No signatures recorded yet" :image="Empty.PRESENTED_IMAGE_SIMPLE" />

          <a-list v-else size="small" :data-source="log" :split="true">
            <template #renderItem="{ item, index }">
              <a-list-item>
                <a-list-item-meta>
                  <template #avatar>
                    <a-image :src="item.dataUrl" :width="60" :height="30" :preview="false" style="border-radius:4px;border:1px solid #e2e8f0;object-fit:contain" />
                  </template>
                  <template #title>{{ item.source }}</template>
                  <template #description>{{ item.time }}</template>
                </a-list-item-meta>
                <template #actions>
                  <a-tag :color="item.color" style="font-size:11px">{{ item.tag }}</a-tag>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>

    </a-row>
  </div>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icons and components used in Vue template
import { FileTextOutlined } from '@ant-design/icons-vue';
// biome-ignore lint/correctness/noUnusedImports: Empty.PRESENTED_IMAGE_SIMPLE used in template
import { Empty } from 'ant-design-vue';
import { ref } from 'vue';
// biome-ignore lint/correctness/noUnusedImports: component used in Vue template
import SignaturePad from '../../components/SignaturePad.vue';

const signature1 = ref('');
const signature2 = ref('');
const log = ref([]);

const addLog = (dataUrl, source, tag, color) => {
  if (!dataUrl) return;
  log.value.unshift({
    dataUrl,
    source,
    tag,
    color,
    time: new Date().toLocaleTimeString(),
  });
};

const onSign1 = val => addLog(val, 'Full Signature', 'Signature', 'default');
const onSign2 = val => addLog(val, 'Initials / Paraf', 'Initials', 'purple');
</script>

<style scoped>
.demo-signpad {
  font-family: 'DM Sans', sans-serif;
}

:deep(.log-card) {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.log-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 48px;
}

:deep(.log-card .ant-card-body) {
  padding: 16px 20px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.card-title-icon {
  color: #4f46e5;
  font-size: 15px;
}
</style>
