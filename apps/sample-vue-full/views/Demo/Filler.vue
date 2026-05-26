<template>
  <div class="demo-filler">
    <a-row :gutter="[16, 16]">

      <!-- Header card -->
      <a-col :span="24">
        <a-card :bordered="false" class="filler-card">
          <template #title>
            <div class="card-title-row">
              <ExperimentOutlined class="card-title-icon" />
              <span>Filler Test Page</span>
            </div>
          </template>
          <template #extra>
            <a-button v-if="!routeParam" type="primary" size="small" @click="setParam">
              <template #icon><LinkOutlined /></template>
              Set Param
            </a-button>
            <a-button v-else size="small" @click="$router.back()">
              <template #icon><ArrowLeftOutlined /></template>
              Back
            </a-button>
          </template>

          <a-descriptions :column="{ xs: 1, sm: 2 }" size="small" :bordered="false">
            <a-descriptions-item label="Prop testId">
              <a-tag :color="testId === -1 ? 'default' : 'purple'">{{ testId }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="Route Param">
              <a-tag :color="routeParam ? 'blue' : 'default'">{{ routeParam || 'none' }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="Full Path">
              <code class="path-code">{{ $route.fullPath }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="Route Name">
              <a-tag color="green">{{ $route.name }}</a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>

      <!-- Scroll list card -->
      <a-col :span="24">
        <a-card :bordered="false" class="filler-card">
          <template #title>
            <div class="card-title-row">
              <UnorderedListOutlined class="card-title-icon" />
              <span>Scroll Test List</span>
              <a-badge
                :count="50"
                :number-style="{ background: '#4f46e5' }"
                style="margin-left:auto"
              />
            </div>
          </template>
          <p class="hint-text">A long list to test layout scrolling behaviour within the secure layout.</p>

          <a-list :data-source="items" :grid="{ gutter: 12, xs: 2, sm: 3, md: 4, lg: 5, xl: 6 }">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-card :bordered="false" hoverable class="item-card">
                  <div class="item-number">{{ item }}</div>
                  <div class="item-label">Item</div>
                </a-card>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>

    </a-row>
  </div>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icons used in Vue template
import { ArrowLeftOutlined, ExperimentOutlined, LinkOutlined, UnorderedListOutlined } from '@ant-design/icons-vue';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps({
  testId: { type: Number, default: -1 },
});

const route = useRoute();
const router = useRouter();
const routeParam = ref(route.params.param);

const items = Array.from({ length: 50 }, (_, i) => i + 1);

const setParam = () => router.push(`${route.path}/111`);
</script>

<style scoped>
.demo-filler {
  font-family: 'DM Sans', sans-serif;
}

.filler-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.filler-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 48px;
}

:deep(.filler-card .ant-card-body) {
  padding: 16px 20px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  width: 100%;
}

.card-title-icon {
  color: #4f46e5;
  font-size: 15px;
}

:deep(.ant-descriptions-item-label) {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

:deep(.ant-descriptions-item-content) {
  font-size: 12px;
}

.path-code {
  font-size: 11px;
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
  color: #4f46e5;
}

.hint-text {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 16px;
}

/* Grid items */
.item-card {
  border-radius: 10px;
  background: #f8fafc;
  text-align: center;
}

:deep(.item-card .ant-card-body) {
  padding: 12px 8px;
}

.item-number {
  font-size: 20px;
  font-weight: 700;
  color: #4f46e5;
  line-height: 1.2;
}

.item-label {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}
</style>
