<template>
  <div class="demo-webcam">
    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :lg="14">
        <WebCamCapture
          title="Live Camera"
          :width="320"
          :height="240"
          @snap="onSnap"
        />
      </a-col>

      <a-col :xs="24" :lg="10">
        <a-card :bordered="false" class="log-card">
          <template #title>
            <div class="card-title-row">
              <FileImageOutlined class="card-title-icon" />
              <span>Snap Log</span>
              <a-badge :count="log.length" :number-style="{ background: '#4f46e5' }" />
            </div>
          </template>
          <template #extra>
            <a-button v-if="log.length" type="text" size="small" danger @click="log = []">
              Clear
            </a-button>
          </template>

          <div v-if="!log.length" class="log-empty">
            <a-empty description="No photos taken yet" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
          </div>

          <a-list v-else size="small" :data-source="log" :split="true">
            <template #renderItem="{ item, index }">
              <a-list-item class="log-item">
                <a-list-item-meta>
                  <template #avatar>
                    <a-image :src="item.thumb" :width="48" :height="36" :preview="false" style="border-radius:6px;object-fit:cover" />
                  </template>
                  <template #title>Photo {{ log.length - index }}</template>
                  <template #description>{{ item.time }}</template>
                </a-list-item-meta>
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
import { FileImageOutlined } from '@ant-design/icons-vue';
// biome-ignore lint/correctness/noUnusedImports: Empty.PRESENTED_IMAGE_SIMPLE used in template
import { Empty } from 'ant-design-vue';
import { ref } from 'vue';
// biome-ignore lint/correctness/noUnusedImports: component used in Vue template
import WebCamCapture from '../../components/WebCamCapture.vue';

const log = ref([]);

const onSnap = dataUrl => {
  log.value.unshift({
    thumb: dataUrl,
    time: new Date().toLocaleTimeString(),
  });
};
</script>

<style scoped>
.demo-webcam {
  font-family: 'DM Sans', sans-serif;
}

:deep(.log-card) {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  height: 100%;
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

.log-empty {
  padding: 24px 0;
}

:deep(.log-item.ant-list-item) {
  padding: 10px 0;
}

:deep(.log-item .ant-list-item-meta-title) {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

:deep(.log-item .ant-list-item-meta-description) {
  font-size: 12px;
  color: #64748b;
}
</style>
