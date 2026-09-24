<template>
  <a-card :bordered="false" class="webcam-card">
    <template #title>
      <div class="card-title-row">
        <VideoCameraOutlined class="card-title-icon" />
        <span>{{ title }}</span>
      </div>
    </template>

    <template #extra>
      <a-tag :color="isActive ? 'green' : 'default'" class="status-tag">
        <template #icon>
          <span class="status-dot" :class="{ 'status-dot--active': isActive }" />
        </template>
        {{ isActive ? 'Live' : 'Standby' }}
      </a-tag>
    </template>

    <!-- Web component — CSS custom properties control button position inside shadow DOM -->
    <div class="webcam-wrapper">
      <vcxwc-web-cam
        :width="width"
        :height="height"
        style="--vcxwc-web-cam-top: 8%"
        @snap="onSnap"
      >
        <button
          slot="button-snap"
          type="button"
          class="cam-btn cam-btn--snap"
          @click="isActive = true"
        >
          📷 Take Photo
        </button>
        <button
          slot="button-unsnap"
          type="button"
          class="cam-btn cam-btn--unsnap"
          @click="isActive = true"
        >
          🎥 Start Camera
        </button>
      </vcxwc-web-cam>
    </div>

    <!-- Snapshot preview -->
    <Transition name="snap-fade">
      <div v-if="snapshots.length" class="snapshot-section">
        <a-divider orientation="left" style="font-size:13px">
          Captured ({{ snapshots.length }})
        </a-divider>

        <div class="snapshot-grid">
          <div
            v-for="(snap, i) in snapshots"
            :key="i"
            class="snapshot-item"
          >
            <a-image
              :src="snap"
              :width="120"
              :height="90"
              :preview="{ mask: 'Preview' }"
              class="snapshot-img"
            />
            <div class="snapshot-actions">
              <a-button type="text" size="small" @click="download(snap, i)">
                <template #icon><DownloadOutlined /></template>
              </a-button>
              <a-button type="text" size="small" danger @click="remove(i)">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>
          </div>
        </div>

        <a-button
          v-if="snapshots.length > 1"
          type="default"
          size="small"
          danger
          style="margin-top: 8px"
          @click="snapshots = []"
        >
          <template #icon><DeleteOutlined /></template>
          Clear All
        </a-button>
      </div>
    </Transition>
  </a-card>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icons used in Vue template
import { DeleteOutlined, DownloadOutlined, VideoCameraOutlined } from '@ant-design/icons-vue';
import { ref } from 'vue';
import '@common/web/web-cam.js';

const props = defineProps({
  title: { type: String, default: 'Web Camera' },
  width: { type: Number, default: 320 },
  height: { type: Number, default: 240 },
});

const emit = defineEmits(['snap']);

const isActive = ref(false);
const snapshots = ref([]);

const onSnap = e => {
  const dataUrl = e.detail;
  snapshots.value.unshift(dataUrl);
  emit('snap', dataUrl);
};

const download = (dataUrl, index) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `photo-${index + 1}.png`;
  a.click();
};

const remove = index => {
  snapshots.value.splice(index, 1);
};
</script>

<style scoped>
.webcam-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.webcam-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 48px;
}

:deep(.webcam-card .ant-card-body) {
  padding: 20px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.card-title-icon {
  color: #4f46e5;
  font-size: 15px;
}

/* Status indicator */
.status-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #cbd5e1;
}

.status-dot--active {
  background: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Web component wrapper */
.webcam-wrapper {
  position: relative;
  display: inline-block;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid #e2e8f0;
}

/* Slotted button styles — positioning is handled by shadow DOM's ::slotted(button)
   via --vcxwc-web-cam-top CSS custom property; only appearance is set here */
.cam-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, transform 0.1s;
}

.cam-btn--snap {
  background: #4f46e5;
  color: #fff;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
}

.cam-btn--snap:hover {
  background: #4338ca;
  transform: scale(1.03);
}

.cam-btn--unsnap {
  background: rgba(255, 255, 255, 0.9);
  color: #1e293b;
  border: 1.5px solid #e2e8f0;
}

.cam-btn--unsnap:hover {
  background: #f1f5f9;
  transform: scale(1.03);
}

/* Snapshot section */
.snapshot-section {
  margin-top: 16px;
}

.snapshot-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.snapshot-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

:deep(.snapshot-img.ant-image img) {
  border-radius: 8px;
  object-fit: cover;
  border: 1.5px solid #e2e8f0;
}

.snapshot-actions {
  display: flex;
  gap: 4px;
}

/* Transition */
.snap-fade-enter-active,
.snap-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.snap-fade-enter-from,
.snap-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
