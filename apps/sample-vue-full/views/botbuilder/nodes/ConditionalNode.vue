<template>
  <a-card :id="node.id" title="Conditional" style="width: 300px" size="small">
    <template #extra>
      <Handle type="target" :position="Position.Left" />
      <a-button shape="circle" size="small" @click="deleteNode">
        <template #icon><CloseOutlined /></template>
      </a-button>
    </template>
    <div v-for="(c, i) in formState.conditionals" :key="i" style="display: flex; position: relative; align-items: center; margin-bottom: 6px">
      <span style="font-size: 13px; flex: 1">{{ c.variable ? `${c.variable} ${c.operator} ${c.matches}` : 'Empty condition' }}</span>
      <Handle :id="'source-if-' + i" type="source" :position="Position.Right" style="position: absolute; bottom: 0; background-color: green" connectable="single" />
    </div>
    <hr />
    <div style="display: flex; position: relative; align-items: center">
      <span style="font-weight: 500; font-size: 14px">Else Path</span>
      <Handle id="source-else" type="source" :position="Position.Right" style="position: absolute; bottom: 0; background-color: orangered" connectable="single" />
    </div>
  </a-card>
</template>

<script setup>
import { CloseOutlined } from '@ant-design/icons-vue';
import { Handle, Position, useNode, useVueFlow } from '@vue-flow/core';
import { onMounted, reactive, watch } from 'vue';

const { node } = useNode();
const { removeNodes } = useVueFlow();

const formState = reactive({ conditionals: [{ variable: null, operator: null, matches: null, and: [] }] });

const deleteNode = e => {
  e.stopPropagation();
  removeNodes(node.id);
};

onMounted(() => {
  if (node.data?.input?.conditionals) formState.conditionals = node.data.input.conditionals;
});

watch(
  () => node.data?.input?.conditionals,
  v => {
    if (v) formState.conditionals = v;
  },
  { deep: true },
);
</script>
