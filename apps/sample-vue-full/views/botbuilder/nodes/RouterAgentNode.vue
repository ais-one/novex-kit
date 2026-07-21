<template>
  <a-card :id="node.id" :title="node.data?.label || 'Router Agent'" style="width: 300px; border-color: #eb2f96" size="small">
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

const { node } = useNode();
const { removeNodes } = useVueFlow();
const deleteNode = e => {
  e.stopPropagation();
  removeNodes(node.id);
};
</script>
