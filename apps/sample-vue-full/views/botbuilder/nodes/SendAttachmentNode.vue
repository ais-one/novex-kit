<template>
  <a-card :id="node.id" title="Send Attachment" style="width: 300px" size="small">
    <template #extra>
      <Handle type="target" :position="Position.Left" />
      <a-button shape="circle" size="small" @click="deleteNode">
        <template #icon><CloseOutlined /></template>
      </a-button>
      <Handle type="source" :position="Position.Right" connectable="single" />
    </template>
    <a-typography-text type="secondary" style="font-size: 12px">
      {{ formState.caption || 'Send file to user' }}
    </a-typography-text>
  </a-card>
</template>

<script setup>
import { CloseOutlined } from '@ant-design/icons-vue';
import { Handle, Position, useNode, useVueFlow } from '@vue-flow/core';
import { onMounted, reactive, watch } from 'vue';

const { node } = useNode();
const { removeNodes } = useVueFlow();

const formState = reactive({ filePathVar: 'filePath', caption: '' });

const deleteNode = e => {
  e.stopPropagation();
  removeNodes(node.id);
};

onMounted(() => {
  if (node.data?.input) Object.assign(formState, node.data.input);
});

watch(
  () => node.data?.input,
  v => {
    if (v) Object.assign(formState, v);
  },
  { deep: true },
);
</script>
