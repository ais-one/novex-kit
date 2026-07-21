<template>
  <a-form layout="vertical">
    <a-row style="margin-bottom: 8px">
      <a-col :span="20"><span style="font-weight: 600; font-size: 14px">Paths</span></a-col>
      <a-col><a-button shape="circle" size="small" @click="addCondition"><PlusOutlined /></a-button></a-col>
    </a-row>
    <div v-for="(c, i) in formState.conditionals" :key="i" style="margin-bottom: 12px">
      <a-row :gutter="4" style="margin-bottom: 4px">
        <a-col :span="8"><a-input v-model:value="c.variable" size="small" placeholder="variable" /></a-col>
        <a-col :span="6">
          <a-select v-model:value="c.operator" size="small" :options="[
            {value:'=',label:'='},{value:'!=',label:'!='},{value:'contains',label:'contains'},{value:'>',label:'>'},{value:'<',label:'<'},{value:'>=',label:'>='},{value:'<=',label:'<='}
          ]" style="width:100%" />
        </a-col>
        <a-col :span="7"><a-input v-model:value="c.matches" size="small" placeholder="value" /></a-col>
        <a-col :span="3"><a-button shape="circle" size="small" @click="() => deleteCondition(i)"><MinusOutlined /></a-button></a-col>
      </a-row>
      <div v-for="(and, j) in (c.and || [])" :key="j" style="margin-left: 16px; margin-bottom: 4px">
        <a-row :gutter="4">
          <a-col :span="1"><span style="line-height: 24px; font-size: 12px; color: #999">AND</span></a-col>
          <a-col :span="7"><a-input v-model:value="and.variable" size="small" placeholder="variable" /></a-col>
          <a-col :span="6"><a-select v-model:value="and.operator" size="small" :options="[{value:'=',label:'='},{value:'!=',label:'!='},{value:'contains',label:'contains'}]" style="width:100%" /></a-col>
          <a-col :span="7"><a-input v-model:value="and.matches" size="small" placeholder="value" /></a-col>
          <a-col :span="3"><a-button shape="circle" size="small" @click="() => deleteInlineCondition(i, j)"><MinusOutlined /></a-button></a-col>
        </a-row>
      </div>
      <a-button size="small" type="dashed" @click="() => addInlineCondition(i)" style="margin-left: 16px">+ AND condition</a-button>
    </div>
  </a-form>
</template>

<script setup>
import { MinusOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { useVueFlow } from '@vue-flow/core';
import { computed, onMounted, reactive, watch } from 'vue';
import { useBotBuilderStore } from '../store.js';

const store = useBotBuilderStore();
const { updateNode } = useVueFlow();

const selectedNode = computed(() => store.selectedNode);

const formState = reactive({
  conditionals: [{ variable: null, operator: null, matches: null, and: [] }],
});

let isLoading = false;

const addCondition = () => formState.conditionals.push({ variable: null, operator: null, matches: null, and: [] });
const deleteCondition = i => {
  if (formState.conditionals.length > 1) formState.conditionals.splice(i, 1);
};
const addInlineCondition = i => {
  if (!formState.conditionals[i].and) formState.conditionals[i].and = [];
  formState.conditionals[i].and.push({ variable: null, operator: null, matches: null });
};
const deleteInlineCondition = (i, j) => formState.conditionals[i].and.splice(j, 1);

watch(
  formState,
  () => {
    if (!isLoading || !selectedNode.value) return;
    updateNode(selectedNode.value.id, {
      data: { ...selectedNode.value.data, input: { conditionals: [...formState.conditionals] } },
    });
  },
  { deep: true },
);

onMounted(() => {
  if (selectedNode.value?.data?.input?.conditionals) {
    formState.conditionals = selectedNode.value.data.input.conditionals;
  }
  setTimeout(() => {
    isLoading = true;
  }, 100);
});
</script>
