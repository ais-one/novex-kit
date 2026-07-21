<template>
  <a-card :id="node.id" title="Listening to trigger" style="width: 300px" size="small">
    <template #extra>
      <a-button shape="circle" size="small" @click="deleteNode">
        <template #icon><CloseOutlined /></template>
      </a-button>
      <Handle type="target" :position="Position.Left" />
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
