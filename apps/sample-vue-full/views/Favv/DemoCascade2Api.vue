<template>
  <div class="demo-cascade-api">
    <a-row :gutter="[16, 16]">

      <!-- LEFT: Cascade Form -->
      <a-col :xs="24" :lg="15">
        <a-card :bordered="false" class="cascade-card">
          <template #title>
            <div class="card-title-row">
              <CloudServerOutlined class="card-title-icon" />
              <span>API-Driven Geography Cascade</span>
              <a-badge
                v-if="apiError"
                status="error"
                text="API error"
                style="margin-left:auto;font-size:12px"
              />
              <a-badge
                v-else-if="loadingContinents"
                status="processing"
                text="Loading…"
                style="margin-left:auto;font-size:12px"
              />
              <a-badge
                v-else
                status="success"
                text="Connected"
                style="margin-left:auto;font-size:12px"
              />
            </div>
          </template>

          <a-spin :spinning="loadingContinents" tip="Loading continents…">
            <a-form :model="formState" layout="vertical">

              <!-- Continents -->
              <a-form-item name="continents">
                <template #label>
                  <div class="field-label-row">
                    <span>Continents</span>
                    <a-checkbox
                      :checked="allContinentsSelected"
                      :indeterminate="someContinentsSelected"
                      :disabled="!formState.continentsList.length"
                      style="margin-left:12px"
                      @change="onCheckAllChange"
                    >
                      Select all
                    </a-checkbox>
                  </div>
                </template>
                <a-select
                  v-model:value="formState.continents"
                  mode="multiple"
                  placeholder="Select continents"
                  allow-clear
                  :max-tag-count="6"
                  :loading="loadingContinents"
                  @blur="blurSelect"
                  @deselect="blurSelect"
                  @clear="blurSelect"
                >
                  <a-select-option v-for="item in formState.continentsList" :key="item">{{ item }}</a-select-option>
                </a-select>
                <div class="field-hint">Options loaded from API on mount.</div>
              </a-form-item>

              <a-divider style="margin: 4px 0 16px">
                <a-tag color="blue" style="font-size:11px">
                  <template #icon><ApiOutlined /></template>
                  Driven by Continents API
                </a-tag>
              </a-divider>

              <!-- East / West Countries -->
              <a-spin :spinning="loadingCountries" tip="Fetching countries…">
                <a-row :gutter="12">
                  <a-col :xs="24" :sm="12">
                    <a-form-item label="Countries — East Hemisphere" name="countriesEast">
                      <a-select
                        v-model:value="formState.countriesEast"
                        mode="multiple"
                        placeholder="Asia, Europe, Africa, ME"
                        allow-clear
                        :disabled="!formState.countriesEastList.length"
                        :max-tag-count="4"
                      >
                        <a-select-option v-for="item in formState.countriesEastList" :key="item">
                          {{ item }}
                        </a-select-option>
                      </a-select>
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="12">
                    <a-form-item label="Countries — West Hemisphere" name="countriesWest">
                      <a-select
                        v-model:value="formState.countriesWest"
                        mode="multiple"
                        placeholder="NA, SA"
                        allow-clear
                        :disabled="!formState.countriesWestList.length"
                        :max-tag-count="4"
                        @blur="blurSelect2"
                        @deselect="blurSelect2"
                        @clear="blurSelect2"
                      >
                        <a-select-option v-for="item in formState.countriesWestList" :key="item">
                          {{ item }}
                        </a-select-option>
                      </a-select>
                    </a-form-item>
                  </a-col>
                </a-row>
              </a-spin>

              <a-divider style="margin: 4px 0 16px">
                <a-tag color="cyan" style="font-size:11px">
                  <template #icon><ApiOutlined /></template>
                  Driven by West Countries API
                </a-tag>
              </a-divider>

              <!-- States -->
              <a-spin :spinning="loadingStates" tip="Fetching states…">
                <a-form-item label="Country States (West)" name="westCountryStates">
                  <a-select
                    v-model:value="formState.westCountryStates"
                    mode="multiple"
                    placeholder="Select west countries first"
                    allow-clear
                    :disabled="!formState.westCountryStatesList.length"
                    :max-tag-count="6"
                  >
                    <a-select-option v-for="item in formState.westCountryStatesList" :key="item">
                      {{ item }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-spin>

              <a-divider style="margin: 4px 0 16px" />

              <a-form-item style="margin-bottom:0">
                <a-space>
                  <a-button
                    type="primary"
                    :loading="submitting"
                    :disabled="!formState.continents.length"
                    @click="onSubmit"
                  >
                    <template #icon><PlayCircleOutlined /></template>
                    Run
                  </a-button>
                  <a-button @click="onClear">Clear All</a-button>
                </a-space>
              </a-form-item>
            </a-form>
          </a-spin>

          <!-- API error alert -->
          <Transition name="result-fade">
            <a-alert
              v-if="apiError"
              :message="apiError"
              type="error"
              show-icon
              closable
              style="margin-top:16px"
              @close="apiError = ''"
            />
          </Transition>

          <!-- Submit result -->
          <Transition name="result-fade">
            <div v-if="submitResult" class="result-box">
              <a-tag color="green" style="margin-bottom:6px">Result</a-tag>
              <pre class="result-json">{{ submitResult }}</pre>
            </div>
          </Transition>
        </a-card>
      </a-col>

      <!-- RIGHT: Summary -->
      <a-col :xs="24" :lg="9">
        <a-row :gutter="[0, 16]">

          <!-- Stats -->
          <a-col :span="24">
            <a-card :bordered="false" class="cascade-card">
              <a-row>
                <a-col :span="8" class="mini-stat">
                  <a-statistic
                    title="Continents"
                    :value="formState.continents.length"
                    :value-style="{ color: '#4f46e5', fontSize: '22px', fontWeight: 700 }"
                  />
                </a-col>
                <a-col :span="8" class="mini-stat">
                  <a-statistic
                    title="Countries"
                    :value="totalCountries"
                    :value-style="{ color: '#0891b2', fontSize: '22px', fontWeight: 700 }"
                  />
                </a-col>
                <a-col :span="8" class="mini-stat">
                  <a-statistic
                    title="States"
                    :value="formState.westCountryStates.length"
                    :value-style="{ color: '#16a34a', fontSize: '22px', fontWeight: 700 }"
                  />
                </a-col>
              </a-row>
            </a-card>
          </a-col>

          <!-- Selection tree -->
          <a-col :span="24">
            <a-card :bordered="false" class="cascade-card">
              <template #title>
                <div class="card-title-row">
                  <UnorderedListOutlined class="card-title-icon" />
                  <span>Selection Tree</span>
                </div>
              </template>

              <a-empty
                v-if="!formState.continents.length"
                description="No continents selected"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
                style="margin: 8px 0"
              />

              <a-tree
                v-else
                :tree-data="selectionTree"
                default-expand-all
                :selectable="false"
                class="selection-tree"
              />
            </a-card>
          </a-col>

          <!-- API endpoints info -->
          <a-col :span="24">
            <a-card :bordered="false" class="cascade-card">
              <template #title>
                <div class="card-title-row">
                  <ApiOutlined class="card-title-icon" />
                  <span>API Endpoints</span>
                </div>
              </template>

              <a-timeline>
                <a-timeline-item color="blue">
                  <div class="endpoint-row">
                    <a-tag color="blue" style="font-size:10px;margin-bottom:2px">GET</a-tag>
                    <code class="endpoint-path">/api/custom-app/cascade/continents</code>
                  </div>
                  <div class="endpoint-desc">Returns available continents list</div>
                </a-timeline-item>
                <a-timeline-item color="cyan">
                  <div class="endpoint-row">
                    <a-tag color="cyan" style="font-size:10px;margin-bottom:2px">GET</a-tag>
                    <code class="endpoint-path">/api/custom-app/cascade/countries</code>
                  </div>
                  <div class="endpoint-desc">Returns east & west country lists filtered by <code>?continents=</code></div>
                </a-timeline-item>
                <a-timeline-item color="green">
                  <div class="endpoint-row">
                    <a-tag color="green" style="font-size:10px;margin-bottom:2px">GET</a-tag>
                    <code class="endpoint-path">/api/custom-app/cascade/states</code>
                  </div>
                  <div class="endpoint-desc">Returns states filtered by <code>?countries=</code></div>
                </a-timeline-item>
              </a-timeline>
            </a-card>
          </a-col>

        </a-row>
      </a-col>

    </a-row>
  </div>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icons used in Vue template
import { ApiOutlined, CloudServerOutlined, PlayCircleOutlined, UnorderedListOutlined } from '@ant-design/icons-vue';
import { http } from '@common/vue/plugins/fetch.js';
// biome-ignore lint/correctness/noUnusedImports: Empty.PRESENTED_IMAGE_SIMPLE used in template
import { Empty } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, toRaw } from 'vue';

const { VITE_API_URL } = import.meta.env;

const loadingContinents = ref(false);
const loadingCountries = ref(false);
const loadingStates = ref(false);
const submitting = ref(false);
const apiError = ref('');
const submitResult = ref('');

const formState = reactive({
  continents: [],
  continentsList: [],
  countriesEast: [],
  countriesEastList: [],
  countriesWest: [],
  countriesWestList: [],
  westCountryStates: [],
  westCountryStatesList: [],
});

onMounted(async () => {
  loadingContinents.value = true;
  try {
    const { data } = await http.get(`${VITE_API_URL}/api/custom-app/cascade/continents`);
    formState.continentsList = [...data];
  } catch (e) {
    apiError.value = `Failed to load continents: ${e?.message ?? e.toString()}`;
  }
  loadingContinents.value = false;
});

const allContinentsSelected = computed(
  () => formState.continents.length === formState.continentsList.length && formState.continentsList.length > 0,
);
const someContinentsSelected = computed(() => formState.continents.length > 0 && !allContinentsSelected.value);

const onCheckAllChange = e => {
  formState.continents = e.target.checked ? [...formState.continentsList] : [];
  blurSelect();
};

const blurSelect = async () => {
  loadingCountries.value = true;
  apiError.value = '';
  try {
    const { data } = await http.get(
      `${VITE_API_URL}/api/custom-app/cascade/countries?continents=${formState.continents.join(',')}`,
    );
    formState.countriesEastList = data.countriesEastList;
    formState.countriesWestList = data.countriesWestList;
    formState.countriesEast = formState.countriesEastList.filter(x => formState.countriesEast.includes(x));
    formState.countriesWest = formState.countriesWestList.filter(x => formState.countriesWest.includes(x));
    await blurSelect2();
  } catch (e) {
    apiError.value = `Failed to load countries: ${e?.message ?? e.toString()}`;
  }
  loadingCountries.value = false;
};

const blurSelect2 = async () => {
  loadingStates.value = true;
  try {
    const { data } = await http.get(
      `${VITE_API_URL}/api/custom-app/cascade/states?countries=${formState.countriesWest.join(',')}`,
    );
    formState.westCountryStatesList = data;
    formState.westCountryStates = formState.westCountryStatesList.filter(x => formState.westCountryStates.includes(x));
  } catch (e) {
    apiError.value = `Failed to load states: ${e?.message ?? e.toString()}`;
  }
  loadingStates.value = false;
};

const totalCountries = computed(() => formState.countriesEast.length + formState.countriesWest.length);

const selectionTree = computed(() =>
  formState.continents.map(continent => {
    const east = formState.countriesEastList.filter(c => formState.countriesEast.includes(c));
    const west = formState.countriesWestList.filter(c => formState.countriesWest.includes(c));
    const allCountries = [...east, ...west];
    return {
      title: continent,
      key: continent,
      children: allCountries.map(country => ({
        title: country,
        key: `${continent}-${country}`,
        children: formState.westCountryStates
          .filter(s => formState.westCountryStatesList.includes(s))
          .map(s => ({ title: s, key: `${continent}-${country}-${s}` })),
      })),
    };
  }),
);

const onSubmit = async () => {
  submitting.value = true;
  const raw = toRaw(formState);
  submitResult.value = JSON.stringify(
    {
      continents: raw.continents,
      countriesEast: raw.countriesEast,
      countriesWest: raw.countriesWest,
      westCountryStates: raw.westCountryStates,
    },
    null,
    2,
  );
  submitting.value = false;
};

const onClear = () => {
  formState.continents = [];
  formState.countriesEast = [];
  formState.countriesEastList = [];
  formState.countriesWest = [];
  formState.countriesWestList = [];
  formState.westCountryStates = [];
  formState.westCountryStatesList = [];
  submitResult.value = '';
  apiError.value = '';
};
</script>

<style scoped>
.demo-cascade-api {
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
  width: 100%;
}

.card-title-icon {
  color: #4f46e5;
  font-size: 15px;
}

:deep(.ant-form-item-label > label) {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

.field-label-row {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

.field-hint {
  font-size: 11px;
  color: #475569;
  margin-top: 4px;
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
  color: #475569;
  font-weight: 500;
  margin-bottom: 2px;
}

/* Selection tree */
.selection-tree {
  font-size: 13px;
}

:deep(.selection-tree .ant-tree-node-content-wrapper) {
  color: #1e293b;
}

/* API endpoints */
.endpoint-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.endpoint-path {
  font-size: 11px;
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
  color: #4f46e5;
}

.endpoint-desc {
  font-size: 11px;
  color: #475569;
  margin-top: 2px;
}

.endpoint-desc code {
  background: #f1f5f9;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 11px;
  color: #475569;
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
