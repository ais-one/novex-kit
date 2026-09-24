<template>
  <div class="demo-chart1">
    <a-row :gutter="[16, 16]">

      <!-- Summary stats -->
      <a-col v-for="stat in stats" :key="stat.title" :xs="12" :sm="6">
        <a-card :bordered="false" class="stat-card">
          <a-statistic
            :title="stat.title"
            :value="stat.value"
            :precision="stat.precision"
            :prefix="stat.prefix"
            :value-style="{ color: stat.color, fontWeight: 700 }"
          >
            <template #suffix>
              <span v-if="stat.suffix" :style="{ color: stat.color }">{{ stat.suffix }}</span>
              <component
                :is="stat.trend === 'up' ? icons.ArrowUpOutlined : icons.ArrowDownOutlined"
                :style="{ color: stat.trend === 'up' ? '#16a34a' : '#dc2626', fontSize: '14px', marginLeft: '4px' }"
              />
            </template>
          </a-statistic>
          <div class="stat-sub">{{ stat.sub }}</div>
        </a-card>
      </a-col>

      <!-- Bar chart — Monthly Revenue -->
      <a-col :xs="24" :lg="16">
        <ChartCard
          title="Monthly Revenue"
          :title-icon="icons.BarChartOutlined"
          chart-type="bar"
          :labels="barLabels"
          :datasets="barDatasets"
          :height="260"
          :options="barOptions"
        >
          <template #extra>
            <a-radio-group v-model:value="barPeriod" size="small" button-style="solid" @change="onBarPeriodChange">
              <a-radio-button value="q1">Q1</a-radio-button>
              <a-radio-button value="q2">Q2</a-radio-button>
              <a-radio-button value="q3">Q3</a-radio-button>
              <a-radio-button value="q4">Q4</a-radio-button>
            </a-radio-group>
          </template>
        </ChartCard>
      </a-col>

      <!-- Doughnut chart — Category Split -->
      <a-col :xs="24" :lg="8">
        <ChartCard
          title="Category Split"
          :title-icon="icons.PieChartOutlined"
          chart-type="doughnut"
          :labels="donutLabels"
          :datasets="donutDatasets"
          :height="260"
          :options="donutOptions"
        />
      </a-col>

      <!-- Line chart — User Growth -->
      <a-col :span="24">
        <ChartCard
          title="User Growth Trend"
          :title-icon="icons.LineChartOutlined"
          chart-type="line"
          :labels="lineLabels"
          :datasets="lineDatasets"
          :height="220"
          :options="lineOptions"
        >
          <template #extra>
            <a-select v-model:value="lineYear" size="small" style="width:90px" @change="onLineYearChange">
              <a-select-option value="2024">2024</a-select-option>
              <a-select-option value="2025">2025</a-select-option>
            </a-select>
          </template>
        </ChartCard>
      </a-col>

    </a-row>
  </div>
</template>

<script setup>
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons-vue';
import { markRaw, ref } from 'vue';
// biome-ignore lint/correctness/noUnusedImports: component used in Vue template
import ChartCard from '../../components/ChartCard.vue';

const icons = markRaw({ ArrowDownOutlined, ArrowUpOutlined, BarChartOutlined, LineChartOutlined, PieChartOutlined });

const stats = [
  {
    title: 'Total Revenue',
    value: 128400,
    prefix: '$',
    color: '#4f46e5',
    trend: 'up',
    sub: '+12.5% from last quarter',
  },
  { title: 'Active Users', value: 3842, color: '#0891b2', trend: 'up', sub: '+8.3% from last month' },
  {
    title: 'Conversion Rate',
    value: 4.7,
    precision: 1,
    suffix: '%',
    color: '#d97706',
    trend: 'down',
    sub: '-0.4% from last month',
  },
  {
    title: 'Avg. Order Value',
    value: 33.4,
    precision: 1,
    prefix: '$',
    color: '#16a34a',
    trend: 'up',
    sub: '+2.1% from last week',
  },
];

// --- Bar chart ---
const barPeriod = ref('q1');

const barData = {
  q1: { labels: ['Jan', 'Feb', 'Mar'], revenue: [18200, 22400, 19800], orders: [340, 410, 370] },
  q2: { labels: ['Apr', 'May', 'Jun'], revenue: [24100, 27600, 23900], orders: [420, 490, 430] },
  q3: { labels: ['Jul', 'Aug', 'Sep'], revenue: [21500, 25800, 28300], orders: [390, 460, 510] },
  q4: { labels: ['Oct', 'Nov', 'Dec'], revenue: [29400, 34200, 38800], orders: [530, 620, 710] },
};

const barLabels = ref(barData.q1.labels);
const barDatasets = ref([
  {
    label: 'Revenue ($)',
    data: barData.q1.revenue,
    backgroundColor: 'rgba(79,70,229,0.75)',
    borderRadius: 6,
    yAxisID: 'y',
  },
  {
    label: 'Orders',
    data: barData.q1.orders,
    backgroundColor: 'rgba(8,145,178,0.65)',
    borderRadius: 6,
    yAxisID: 'y1',
  },
]);

const barOptions = {
  scales: {
    y: { position: 'left', ticks: { color: '#64748b' }, grid: { color: '#f1f5f9' } },
    y1: { position: 'right', ticks: { color: '#64748b' }, grid: { drawOnChartArea: false } },
    x: { ticks: { color: '#64748b' }, grid: { color: '#f1f5f9' } },
  },
};

const onBarPeriodChange = () => {
  const d = barData[barPeriod.value];
  barLabels.value = d.labels;
  barDatasets.value[0].data = d.revenue;
  barDatasets.value[1].data = d.orders;
};

// --- Doughnut chart ---
const donutLabels = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Other'];
const donutDatasets = [
  {
    data: [35, 25, 18, 14, 8],
    backgroundColor: ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#94a3b8'],
    borderWidth: 2,
    borderColor: '#ffffff',
    hoverOffset: 8,
  },
];
const donutOptions = {
  plugins: { legend: { position: 'right' } },
  cutout: '62%',
};

// --- Line chart ---
const lineYear = ref('2025');

const lineData = {
  2024: {
    new: [210, 240, 190, 310, 280, 350, 320, 410, 390, 440, 460, 500],
    returning: [180, 200, 175, 260, 240, 290, 270, 340, 320, 370, 390, 420],
  },
  2025: {
    new: [520, 570, 490, 640, 710, 680, 750, 820, 790, 870, 910, 980],
    returning: [430, 480, 410, 540, 600, 570, 640, 700, 670, 740, 780, 840],
  },
};

const lineLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const lineDatasets = ref([
  {
    label: 'New Users',
    data: lineData[2025].new,
    borderColor: '#4f46e5',
    backgroundColor: 'rgba(79,70,229,0.1)',
    fill: true,
    tension: 0.4,
    pointRadius: 3,
    pointHoverRadius: 6,
  },
  {
    label: 'Returning Users',
    data: lineData[2025].returning,
    borderColor: '#0891b2',
    backgroundColor: 'rgba(8,145,178,0.08)',
    fill: true,
    tension: 0.4,
    pointRadius: 3,
    pointHoverRadius: 6,
  },
]);

const lineOptions = {
  scales: {
    y: { ticks: { color: '#64748b' }, grid: { color: '#f1f5f9' } },
    x: { ticks: { color: '#64748b' }, grid: { color: '#f1f5f9' } },
  },
};

const onLineYearChange = () => {
  const d = lineData[lineYear.value];
  lineDatasets.value[0].data = d.new;
  lineDatasets.value[1].data = d.returning;
};
</script>

<style scoped>
.demo-chart1 {
  font-family: 'DM Sans', sans-serif;
}

.stat-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  height: 100%;
}

:deep(.stat-card .ant-card-body) {
  padding: 16px 20px;
}

:deep(.stat-card .ant-statistic-title) {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 6px;
}

:deep(.stat-card .ant-statistic-content) {
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.stat-card .ant-statistic-content-value) {
  font-size: 22px;
  line-height: 1.2;
}

.stat-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
}
</style>
