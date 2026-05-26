<template>
  <div class="demo-cascade">
    <a-row :gutter="[16, 16]">

      <!-- Cascade Form Card -->
      <a-col :xs="24" :lg="14">
        <a-card :bordered="false" class="cascade-card">
          <template #title>
            <div class="card-title-row">
              <ApartmentOutlined class="card-title-icon" />
              <span>Region & Country Cascade</span>
            </div>
          </template>
          <template #extra>
            <a-tag :color="storeCounter > 0 ? 'purple' : 'default'">
              Store Counter: {{ storeCounter }}
            </a-tag>
          </template>

          <a-form :model="formState" layout="vertical">
            <a-form-item label="Region" name="regions">
              <a-select
                v-model:value="formState.regions"
                mode="multiple"
                placeholder="Select one or more regions"
                allow-clear
                :max-tag-count="4"
                @blur="updateCountries"
                @deselect="updateCountries"
              >
                <a-select-option v-for="region in formState.regionList" :key="region">
                  {{ region }}
                </a-select-option>
              </a-select>
              <div class="field-hint">Selecting a region filters the available countries below.</div>
            </a-form-item>

            <a-form-item label="Countries" name="countries">
              <a-select
                v-model:value="formState.countries"
                mode="multiple"
                placeholder="Select region first, then pick countries"
                allow-clear
                :disabled="!formState.countriesList.length"
                :max-tag-count="6"
              >
                <a-select-option v-for="country in formState.countriesList" :key="country">
                  {{ country }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-divider style="margin: 4px 0 16px" />

            <a-form-item style="margin-bottom:0">
              <a-space>
                <a-button type="primary" :disabled="!formState.countries.length" @click="onSubmit">
                  <template #icon><CheckOutlined /></template>
                  Create
                </a-button>
                <a-button @click="resetForm">Reset</a-button>
              </a-space>
            </a-form-item>
          </a-form>

          <Transition name="result-fade">
            <div v-if="submitResult" class="result-box">
              <a-tag color="green" style="margin-bottom:6px">Submitted</a-tag>
              <pre class="result-json">{{ submitResult }}</pre>
            </div>
          </Transition>
        </a-card>
      </a-col>

      <!-- Summary Card -->
      <a-col :xs="24" :lg="10">
        <a-row :gutter="[0, 16]">

          <!-- Selection summary -->
          <a-col :span="24">
            <a-card :bordered="false" class="cascade-card">
              <template #title>
                <div class="card-title-row">
                  <UnorderedListOutlined class="card-title-icon" />
                  <span>Selection Summary</span>
                </div>
              </template>

              <a-empty
                v-if="!formState.regions.length"
                description="No regions selected"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
                style="margin: 8px 0"
              />

              <template v-else>
                <div v-for="region in formState.regions" :key="region" class="region-group">
                  <div class="region-label">
                    <GlobalOutlined style="margin-right:6px;color:#4f46e5" />
                    <span>{{ region }}</span>
                    <a-badge
                      :count="selectedByRegion(region).length"
                      :number-style="{ background: '#4f46e5', fontSize: '10px' }"
                      style="margin-left:6px"
                    />
                  </div>
                  <div class="region-countries">
                    <template v-if="selectedByRegion(region).length">
                      <a-tag
                        v-for="country in selectedByRegion(region)"
                        :key="country"
                        color="blue"
                        style="margin:2px"
                      >
                        {{ country }}
                      </a-tag>
                    </template>
                    <span v-else class="no-country">No countries selected</span>
                  </div>
                </div>
              </template>
            </a-card>
          </a-col>

          <!-- Stats -->
          <a-col :span="24">
            <a-card :bordered="false" class="cascade-card">
              <a-row :gutter="0">
                <a-col :span="8" class="mini-stat">
                  <a-statistic
                    title="Regions"
                    :value="formState.regions.length"
                    :value-style="{ color: '#4f46e5', fontSize: '22px', fontWeight: 700 }"
                  />
                </a-col>
                <a-col :span="8" class="mini-stat">
                  <a-statistic
                    title="Available"
                    :value="formState.countriesList.length"
                    :value-style="{ color: '#0891b2', fontSize: '22px', fontWeight: 700 }"
                  />
                </a-col>
                <a-col :span="8" class="mini-stat">
                  <a-statistic
                    title="Selected"
                    :value="formState.countries.length"
                    :value-style="{ color: '#16a34a', fontSize: '22px', fontWeight: 700 }"
                  />
                </a-col>
              </a-row>
            </a-card>
          </a-col>

        </a-row>
      </a-col>

    </a-row>
  </div>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icons used in Vue template
import { ApartmentOutlined, CheckOutlined, GlobalOutlined, UnorderedListOutlined } from '@ant-design/icons-vue';
// biome-ignore lint/correctness/noUnusedImports: Empty.PRESENTED_IMAGE_SIMPLE used in template
import { Empty } from 'ant-design-vue';
import { computed, reactive, ref } from 'vue';
import { useAppStore } from '../../store.js';

const appStore = useAppStore();
const submitResult = ref('');

const formState = reactive({
  regions: [],
  regionList: ['Asia', 'Europe', 'NA', 'SA', 'Africa', 'ME'],
  countries: [],
  countriesList: [],
  countriesMasterList: {
    Asia: ['Russia', 'Japan', 'Burma', 'Indonesia', 'Afghanistan'],
    Europe: ['Russia', 'Germany', 'France', 'Poland', 'Sweden', 'Italy'],
    NA: ['United States', 'Canada'],
    SA: ['Brazil', 'Argentina', 'Ecuador'],
    Africa: ['Egypt', 'Nigeria', 'Kenya', 'Liberia'],
    ME: ['Egypt', 'Saudi Arabia', 'Afghanistan'],
  },
});

const updateCountries = () => {
  const keys = {};
  const list = [];
  const retained = [];

  for (const region of formState.regions) {
    for (const country of formState.countriesMasterList[region]) {
      if (!keys[country]) {
        list.push(country);
        keys[country] = true;
        if (formState.countries.includes(country)) retained.push(country);
      }
    }
  }

  formState.countries = retained;
  formState.countriesList = list;
};

const selectedByRegion = region => {
  const regionCountries = formState.countriesMasterList[region] ?? [];
  return formState.countries.filter(c => regionCountries.includes(c));
};

const onSubmit = () => {
  submitResult.value = JSON.stringify({ regions: formState.regions, countries: formState.countries }, null, 2);
};

const resetForm = () => {
  formState.regions = [];
  formState.countries = [];
  formState.countriesList = [];
  submitResult.value = '';
};

const storeCounter = computed(() => appStore.counter);
</script>

<style scoped>
.demo-cascade {
  font-family: 'DM Sans', sans-serif;
}

.cascade-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  height: 100%;
}

:deep(.cascade-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 48px;
}

:deep(.cascade-card .ant-card-body) {
  padding: 20px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.card-title-icon {
  color: #4f46e5;
  font-size: 15px;
}

:deep(.ant-form-item-label > label) {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.field-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

/* Region summary */
.region-group {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.region-group:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.region-label {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 6px;
}

.region-countries {
  padding-left: 18px;
}

.no-country {
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

/* Mini stats */
.mini-stat {
  padding: 4px 12px;
  border-right: 1px solid #f1f5f9;
}

.mini-stat:last-child {
  border-right: none;
}

:deep(.mini-stat .ant-statistic-title) {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 2px;
}

/* Result box */
.result-box {
  margin-top: 16px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.result-json {
  margin: 4px 0 0;
  font-size: 12px;
  color: #1e293b;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Transition */
.result-fade-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.result-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>
