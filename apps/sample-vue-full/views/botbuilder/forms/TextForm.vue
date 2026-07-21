<template>
  <a-form layout="vertical">
    <a-form-item label="Message Source">
      <a-radio-group v-model:value="formState.messageSource">
        <a-radio value="text">Text</a-radio>
      </a-radio-group>
    </a-form-item>
    <a-form-item label="Message">
      <a-textarea v-model:value="formState.message" :rows="3" placeholder="e.g. What is your name?" />
    </a-form-item>
    <a-form-item label="Capture Data">
      <a-switch v-model:checked="formState.captureData" />
    </a-form-item>
    <a-form-item v-if="formState.captureData" label="Stored To">
      <a-input v-model:value="formState.stored_to" placeholder="last_message" />
    </a-form-item>
  </a-form>
</template>

<script setup>
import { useVueFlow } from '@vue-flow/core';
import { computed, onMounted, reactive, watch } from 'vue';
import { useBotBuilderStore } from '../store.js';

const store = useBotBuilderStore();
const { updateNode } = useVueFlow();

const selectedNode = computed(() => store.selectedNode);

const formState = reactive({
  messageSource: 'text',
  message: '',
  captureData: false,
  stored_to: 'last_message',
});

let isLoading = false;

watch(
  formState,
  () => {
    if (!isLoading || !selectedNode.value) return;
    updateNode(selectedNode.value.id, { data: { ...selectedNode.value.data, input: { ...formState } } });
  },
  { deep: true },
);

onMounted(() => {
  if (selectedNode.value?.data?.input) {
    Object.assign(formState, {
      messageSource: 'text',
      message: '',
      captureData: false,
      stored_to: 'last_message',
      ...selectedNode.value.data.input,
    });
  }
  setTimeout(() => {
    isLoading = true;
  }, 100);
});
</script>
