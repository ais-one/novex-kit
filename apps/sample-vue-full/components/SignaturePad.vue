<template>
  <a-card :bordered="false" class="signpad-card">
    <template #title>
      <div class="card-title-row">
        <EditOutlined class="card-title-icon" />
        <span>{{ title }}</span>
      </div>
    </template>

    <template #extra>
      <a-tag :color="isSigned ? 'green' : 'default'">
        {{ isSigned ? 'Signed' : 'Empty' }}
      </a-tag>
    </template>

    <!-- Web component -->
    <div class="pad-wrapper">
      <p class="pad-hint">Draw your signature below</p>
      <vcxwc-sign-pad
        :width="width"
        :height="height"
        :value="modelValue"
        :context2d="context2dJson"
        :style="{ '--vcxwc-sign-pad-background-color': backgroundColor }"
        class="sign-pad-el"
        @input="onInput"
      />
    </div>

    <!-- Actions -->
    <div class="pad-actions">
      <a-button
        :disabled="!isSigned"
        type="primary"
        size="small"
        @click="download"
      >
        <template #icon><DownloadOutlined /></template>
        Save
      </a-button>

      <a-button
        :disabled="!isSigned"
        size="small"
        danger
        @click="clear"
      >
        <template #icon><DeleteOutlined /></template>
        Clear
      </a-button>
    </div>

    <!-- Preview -->
    <Transition name="preview-fade">
      <div v-if="isSigned" class="pad-preview">
        <a-divider orientation="left" style="font-size:13px">Preview</a-divider>
        <a-image
          :src="modelValue"
          :width="width"
          :height="height"
          :preview="{ mask: 'Enlarge' }"
          class="preview-img"
        />
      </div>
    </Transition>
  </a-card>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icons used in Vue template
import { DeleteOutlined, DownloadOutlined, EditOutlined } from '@ant-design/icons-vue';
import { computed } from 'vue';
import '@common/web/sign-pad.js';

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: 'Signature Pad' },
  width: { type: Number, default: 300 },
  height: { type: Number, default: 150 },
  lineWidth: { type: Number, default: 2 },
  strokeStyle: { type: String, default: '#1e293b' },
  backgroundColor: { type: String, default: '#f8fafc' },
});

const emit = defineEmits(['update:modelValue']);

const context2dJson = computed(() => JSON.stringify({ lineWidth: props.lineWidth, strokeStyle: props.strokeStyle }));

const isSigned = computed(() => !!props.modelValue);

const onInput = e => {
  emit('update:modelValue', e.target.value ?? '');
};

const clear = () => {
  emit('update:modelValue', '');
};

const download = () => {
  const a = document.createElement('a');
  a.href = props.modelValue;
  a.download = 'signature.png';
  a.click();
};
</script>

<style scoped>
.signpad-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.signpad-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 48px;
}

:deep(.signpad-card .ant-card-body) {
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

/* Pad area */
.pad-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pad-hint {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.sign-pad-el {
  border: 2px dashed #cbd5e1;
  border-radius: 10px;
  overflow: hidden;
  display: block;
  cursor: crosshair;
  transition: border-color 0.2s;
}

.sign-pad-el:hover {
  border-color: #4f46e5;
}

/* Actions */
.pad-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

/* Preview */
.pad-preview {
  margin-top: 4px;
}

:deep(.preview-img.ant-image img) {
  border-radius: 8px;
  border: 1.5px solid #e2e8f0;
  object-fit: contain;
}

/* Transitions */
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
