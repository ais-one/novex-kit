<template>
  <div class="demo-cascade2">
    <a-row :gutter="[16, 16]">

      <!-- LEFT: Geography Cascade -->
      <a-col :xs="24" :lg="15">
        <a-card :bordered="false" class="cascade-card">
          <template #title>
            <div class="card-title-row">
              <GlobalOutlined class="card-title-icon" />
              <span>Geography Cascade</span>
            </div>
          </template>

          <a-form :model="formState" layout="vertical">

            <!-- Continents -->
            <a-form-item name="continents">
              <template #label>
                <div class="field-label-row">
                  <span>Continents</span>
                  <a-checkbox
                    :checked="allContinentsSelected"
                    :indeterminate="someContinentsSelected"
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
                @blur="blurSelect"
                @deselect="blurSelect"
                @clear="blurSelect"
              >
                <a-select-option v-for="item in lists.continentsList" :key="item">{{ item }}</a-select-option>
              </a-select>
            </a-form-item>

            <a-divider style="margin: 4px 0 16px">
              <a-tag color="blue" style="font-size:11px">Driven by Continents</a-tag>
            </a-divider>

            <!-- East / West Countries side by side -->
            <a-row :gutter="12">
              <a-col :xs="24" :sm="12">
                <a-form-item label="Countries — East Hemisphere" name="countriesEast">
                  <a-select
                    v-model:value="formState.countriesEast"
                    mode="multiple"
                    placeholder="Asia, Europe, Africa, ME"
                    allow-clear
                    :disabled="!lists.countriesEastList.length"
                    :max-tag-count="4"
                  >
                    <a-select-option v-for="item in lists.countriesEastList" :key="item">{{ item }}</a-select-option>
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
                    :disabled="!lists.countriesWestList.length"
                    :max-tag-count="4"
                    @blur="blurSelect2"
                    @deselect="blurSelect2"
                    @clear="blurSelect2"
                  >
                    <a-select-option v-for="item in lists.countriesWestList" :key="item">{{ item }}</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>

            <a-divider style="margin: 4px 0 16px">
              <a-tag color="cyan" style="font-size:11px">Driven by West Countries</a-tag>
            </a-divider>

            <!-- States -->
            <a-form-item label="Country States (West)" name="westCountryStates">
              <a-select
                v-model:value="formState.westCountryStates"
                mode="multiple"
                placeholder="Select west countries first"
                allow-clear
                :disabled="!lists.westCountryStatesList.length"
                :max-tag-count="6"
              >
                <a-select-option v-for="item in lists.westCountryStatesList" :key="item">{{ item }}</a-select-option>
              </a-select>
            </a-form-item>

            <a-divider style="margin: 4px 0 16px">
              <a-tag color="orange" style="font-size:11px">Force Filters</a-tag>
            </a-divider>

            <!-- Force Include / Exclude side by side -->
            <a-row :gutter="12">
              <a-col :xs="24" :sm="12">
                <a-form-item name="forceIncludes">
                  <template #label>
                    <div class="field-label-row">
                      <span>Force Include</span>
                      <a-checkbox
                        :checked="allIncludesSelected"
                        :indeterminate="someIncludesSelected"
                        style="margin-left:12px"
                        @change="onCheckAllChangeIncludes"
                      >
                        All
                      </a-checkbox>
                    </div>
                  </template>
                  <a-select
                    v-model:value="formState.forceIncludes"
                    mode="multiple"
                    placeholder="Select to force include"
                    allow-clear
                    :max-tag-count="4"
                  >
                    <a-select-option
                      v-for="item in forceIncludeList"
                      :key="item"
                      :value="item"
                    >
                      {{ item }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12">
                <a-form-item name="forceExcludes">
                  <template #label>
                    <div class="field-label-row">
                      <span>Force Exclude</span>
                      <a-checkbox
                        :checked="allExcludesSelected"
                        :indeterminate="someExcludesSelected"
                        style="margin-left:12px"
                        @change="onCheckAllChangeExcludes"
                      >
                        All
                      </a-checkbox>
                    </div>
                  </template>
                  <a-select
                    v-model:value="formState.forceExcludes"
                    mode="multiple"
                    placeholder="Select to force exclude"
                    allow-clear
                    :max-tag-count="4"
                  >
                    <a-select-option
                      v-for="item in forceExcludeList"
                      :key="item"
                      :value="item"
                    >
                      {{ item }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>

            <a-divider style="margin: 4px 0 16px" />

            <a-form-item style="margin-bottom:0">
              <a-space>
                <a-button type="primary" @click="onSubmit">
                  <template #icon><PlayCircleOutlined /></template>
                  Run
                </a-button>
                <a-button @click="onClear">Clear All</a-button>
              </a-space>
            </a-form-item>
          </a-form>

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

          <!-- Force filters summary -->
          <a-col v-if="formState.forceIncludes.length || formState.forceExcludes.length" :span="24">
            <a-card :bordered="false" class="cascade-card">
              <template #title>
                <div class="card-title-row">
                  <FilterOutlined class="card-title-icon" />
                  <span>Force Filters</span>
                </div>
              </template>

              <div v-if="formState.forceIncludes.length" class="force-group">
                <span class="force-label include">Include</span>
                <a-tag v-for="item in formState.forceIncludes" :key="item" color="green" style="margin:2px">
                  {{ item }}
                </a-tag>
              </div>
              <div v-if="formState.forceExcludes.length" class="force-group" style="margin-top:10px">
                <span class="force-label exclude">Exclude</span>
                <a-tag v-for="item in formState.forceExcludes" :key="item" color="red" style="margin:2px">
                  {{ item }}
                </a-tag>
              </div>
            </a-card>
          </a-col>

        </a-row>
      </a-col>

    </a-row>
  </div>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icons used in Vue template
import { FilterOutlined, GlobalOutlined, PlayCircleOutlined, UnorderedListOutlined } from '@ant-design/icons-vue';
// biome-ignore lint/correctness/noUnusedImports: Empty.PRESENTED_IMAGE_SIMPLE used in template
import { Empty } from 'ant-design-vue';
import { computed, reactive, ref, toRaw } from 'vue';

const submitResult = ref('');

const lists = reactive({
  continentsList: ['Asia', 'Europe', 'NA', 'SA', 'Africa', 'ME'],
  countriesEastList: [],
  countriesEastMasterList: {
    Asia: ['Russia', 'Japan', 'Burma', 'Indonesia', 'Afghanistan'],
    Europe: ['Russia', 'Germany', 'France', 'Poland', 'Sweden', 'Italy'],
    Africa: ['Egypt', 'Nigeria', 'Kenya', 'Liberia'],
    ME: ['Egypt', 'Saudi Arabia', 'Afghanistan'],
  },
  countriesWestList: [],
  countriesWestMasterList: {
    NA: ['United States', 'Canada'],
    SA: ['Brazil', 'Argentina', 'Ecuador'],
  },
  westCountryStatesList: [],
  westCountryStatesMasterList: {
    'United States': ['California', 'New York', 'Ohio', 'Utah', 'Texas'],
    Canada: ['Ontario', 'Quebec', 'BC', 'Alberta'],
    Brazil: ['B1', 'B2'],
    Argentina: ['A1', 'A2', 'A3'],
    Ecuador: ['EC1', 'EC2'],
  },
});

const formState = reactive({
  forceIncludes: [],
  forceExcludes: [],
  continents: [],
  countriesEast: [],
  countriesWest: [],
  westCountryStates: [],
});

// --- Cascade logic ---
const cascadeDown = (sourceKey, subs) => {
  for (const sub of subs) {
    const { subKey, subKeyMasterList, subKeyList } = sub;
    const seen = {};
    const list = [];
    const retained = [];
    for (const item of formState[sourceKey]) {
      for (const subItem of lists[subKeyMasterList][item] ?? []) {
        if (!seen[subItem]) {
          list.push(subItem);
          seen[subItem] = true;
          if (formState[subKey].includes(subItem)) retained.push(subItem);
        }
      }
    }
    formState[subKey] = retained;
    lists[subKeyList] = list;
  }
};

const blurSelect = () => {
  cascadeDown('continents', [
    { subKey: 'countriesEast', subKeyMasterList: 'countriesEastMasterList', subKeyList: 'countriesEastList' },
    { subKey: 'countriesWest', subKeyMasterList: 'countriesWestMasterList', subKeyList: 'countriesWestList' },
  ]);
  blurSelect2();
};

const blurSelect2 = () => {
  cascadeDown('countriesWest', [
    {
      subKey: 'westCountryStates',
      subKeyMasterList: 'westCountryStatesMasterList',
      subKeyList: 'westCountryStatesList',
    },
  ]);
};

// --- Continent select all ---
const allContinentsSelected = computed(() => formState.continents.length === lists.continentsList.length);
const someContinentsSelected = computed(() => formState.continents.length > 0 && !allContinentsSelected.value);

const onCheckAllChange = e => {
  formState.continents = e.target.checked ? [...lists.continentsList] : [];
  blurSelect();
};

// --- Force lists ---
const forceList = ['aa1', 'aa22', 'aa23', 'aa4', 'aa5', 'bb1', 'bb22', 'bb23', 'bb4', 'bb5'];

const forceIncludeList = computed(() => forceList.filter(o => !formState.forceExcludes.includes(o)));
const forceExcludeList = computed(() => forceList.filter(o => !formState.forceIncludes.includes(o)));

const allIncludesSelected = computed(
  () => formState.forceIncludes.length === forceIncludeList.value.length && forceIncludeList.value.length > 0,
);
const someIncludesSelected = computed(() => formState.forceIncludes.length > 0 && !allIncludesSelected.value);
const allExcludesSelected = computed(
  () => formState.forceExcludes.length === forceExcludeList.value.length && forceExcludeList.value.length > 0,
);
const someExcludesSelected = computed(() => formState.forceExcludes.length > 0 && !allExcludesSelected.value);

const onCheckAllChangeIncludes = e => {
  formState.forceIncludes = e.target.checked ? [...forceIncludeList.value] : [];
};

const onCheckAllChangeExcludes = e => {
  formState.forceExcludes = e.target.checked ? [...forceExcludeList.value] : [];
};

// --- Stats ---
const totalCountries = computed(() => formState.countriesEast.length + formState.countriesWest.length);

// --- Selection tree for a-tree ---
const selectionTree = computed(() => {
  return formState.continents.map(continent => {
    const eastCountries = (lists.countriesEastMasterList[continent] ?? []).filter(c =>
      formState.countriesEast.includes(c),
    );
    const westCountries = (lists.countriesWestMasterList[continent] ?? []).filter(c =>
      formState.countriesWest.includes(c),
    );
    const allCountries = [...eastCountries, ...westCountries];

    return {
      title: continent,
      key: continent,
      children: allCountries.map(country => {
        const states = (lists.westCountryStatesMasterList[country] ?? []).filter(s =>
          formState.westCountryStates.includes(s),
        );
        return {
          title: country,
          key: `${continent}-${country}`,
          children: states.map(s => ({ title: s, key: `${continent}-${country}-${s}` })),
        };
      }),
    };
  });
});

// --- Submit / Clear ---
const onSubmit = () => {
  const raw = toRaw(formState);
  submitResult.value = JSON.stringify(
    {
      continents: raw.continents,
      countriesEast: raw.countriesEast,
      countriesWest: raw.countriesWest,
      westCountryStates: raw.westCountryStates,
      forceIncludes: raw.forceIncludes,
      forceExcludes: raw.forceExcludes,
    },
    null,
    2,
  );
};

const onClear = () => {
  formState.forceIncludes = [];
  formState.forceExcludes = [];
  formState.continents = [];
  formState.countriesEast = [];
  formState.countriesWest = [];
  formState.westCountryStates = [];
  lists.countriesEastList = [];
  lists.countriesWestList = [];
  lists.westCountryStatesList = [];
  submitResult.value = '';
};
</script>

<style scoped>
.demo-cascade2 {
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

.field-label-row {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
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

/* Selection tree */
.selection-tree {
  font-size: 13px;
}

:deep(.selection-tree .ant-tree-node-content-wrapper) {
  color: #1e293b;
}

/* Force filters */
.force-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}

.force-label {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 10px;
  margin-right: 4px;
}

.force-label.include {
  background: #dcfce7;
  color: #16a34a;
}

.force-label.exclude {
  background: #fee2e2;
  color: #dc2626;
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
