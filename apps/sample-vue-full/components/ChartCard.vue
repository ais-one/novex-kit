<template>
  <a-card :bordered="false" class="chart-card">
    <template #title>
      <div class="card-title-row">
        <component :is="titleIcon" v-if="titleIcon" class="card-title-icon" />
        <span>{{ title }}</span>
      </div>
    </template>

    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>

    <div class="chart-wrapper" :style="{ height: `${height}px` }">
      <canvas ref="canvasRef" />
    </div>
  </a-card>
</template>

<script setup>
import Chart from 'chart.js/auto';
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  title: { type: String, default: 'Chart' },
  titleIcon: { type: Object, default: null },
  chartType: { type: String, default: 'bar' },
  labels: { type: Array, required: true },
  datasets: { type: Array, required: true },
  height: { type: Number, default: 240 },
  options: { type: Object, default: () => ({}) },
});

const canvasRef = ref(null);
let chartInstance = null;

const buildChart = () => {
  if (chartInstance) chartInstance.destroy();
  if (!canvasRef.value) return;

  chartInstance = new Chart(canvasRef.value, {
    type: props.chartType,
    data: { labels: props.labels, datasets: props.datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      ...props.options,
    },
  });
};

onMounted(buildChart);
onUnmounted(() => {
  if (chartInstance) chartInstance.destroy();
});

watch(
  () => [props.labels, props.datasets, props.chartType],
  () => {
    buildChart();
  },
  { deep: true },
);
</script>

<style scoped>
.chart-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  height: 100%;
}

:deep(.chart-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 48px;
}

:deep(.chart-card .ant-card-body) {
  padding: 16px 20px 20px;
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

.chart-wrapper {
  position: relative;
  width: 100%;
}
</style>
