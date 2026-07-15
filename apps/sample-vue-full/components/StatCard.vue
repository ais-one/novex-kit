<template>
  <a-card class="stat-card" :bordered="false">
    <div class="stat-top">
      <span class="stat-label">{{ title }}</span>
      <div class="stat-icon-wrap" :style="{ background: iconBg }">
        <component :is="icon" class="stat-icon" />
      </div>
    </div>

    <a-statistic
      :value="value"
      :precision="precision"
      :suffix="suffix"
      :value-style="computedValueStyle"
    >
      <template v-if="trendIcon" #prefix>
        <component :is="trendIcon" />
      </template>
    </a-statistic>

    <div v-if="footer" class="stat-footer">
      <span
        class="stat-trend-badge"
        :class="trend === 'up' ? 'stat-trend-badge--up' : trend === 'down' ? 'stat-trend-badge--down' : ''"
      >
        <component :is="trendIcon" />
        {{ footer }}
      </span>
    </div>
  </a-card>
</template>

<script setup>
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons-vue';
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  value: { type: Number, required: true },
  precision: { type: Number, default: 0 },
  suffix: { type: String, default: '' },
  trend: { type: String, default: null }, // 'up' | 'down' | null
  footer: { type: String, default: '' },
  icon: { type: Object, required: true },
  iconBg: { type: String, default: '#eef2ff' },
  valueColor: { type: String, default: '' },
});

const trendIcon = computed(() => {
  if (props.trend === 'up') return ArrowUpOutlined;
  if (props.trend === 'down') return ArrowDownOutlined;
  return null;
});

const computedValueStyle = computed(() => {
  if (props.valueColor) return { color: props.valueColor };
  if (props.trend === 'up') return { color: '#16a34a' };
  if (props.trend === 'down') return { color: '#dc2626' };
  return { color: '#0f172a' };
});
</script>

<style scoped>
.stat-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  height: 100%;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  cursor: default;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-card:hover .stat-icon-wrap {
  transform: scale(1.12);
}

:deep(.stat-card .ant-card-body) {
  padding: 20px 24px;
}

.stat-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.stat-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
}

.stat-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  transition: transform 0.22s ease;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon {
  font-size: 16px;
}

:deep(.ant-statistic-content) {
  font-family: 'DM Sans', sans-serif;
}

:deep(.ant-statistic-content-value) {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.stat-trend-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.stat-trend-badge--up   { color: #16a34a; }
.stat-trend-badge--down { color: #dc2626; }
</style>
