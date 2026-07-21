<template>
  <a-card :id="node.id" :title="formState.message ? formState.message.slice(0, 30) : 'Text Message'" style="width: 300px" size="small">
    <template #extra>
      <Handle type="target" :position="Position.Left" />
      <a-button shape="circle" size="small" @click="deleteNode">
        <template #icon><CloseOutlined /></template>
      </a-button>
      <Handle type="source" :position="Position.Right" connectable="single" />
    </template>
  </a-card>
</template>

<script setup>
import { CloseOutlined } from '@ant-design/icons-vue';
import { Handle, Position, useNode, useVueFlow } from '@vue-flow/core';
import { onMounted, reactive, watch } from 'vue';

const { node } = useNode();
const { removeNodes } = useVueFlow();

const formState = reactive({ message: '', captureData: false });

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
