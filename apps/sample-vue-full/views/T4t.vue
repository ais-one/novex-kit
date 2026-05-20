<template>
  <div class="t4t-view">
    <a-card :bordered="false" class="t4t-card">
      <template #title>
        <div class="card-title-row">
          <TableOutlined class="card-title-icon" />
          <span>{{ table?.config?.displayName || props.tableName }}</span>
          <a-badge
            v-if="table.pagination.total"
            :count="table.pagination.total"
            :overflow-count="99999"
            :number-style="{ background: '#4f46e5', fontSize: '11px' }"
            style="margin-left: 8px"
          />
        </div>
      </template>
      <template #extra>
        <a-space :size="6" wrap>
          <a-button size="small" @click="filterApply">
            <template #icon><ReloadOutlined /></template>
            Reload
          </a-button>
          <a-button size="small" @click="filterOpen">
            <template #icon><FilterOutlined /></template>
            Filter
            <a-badge
              v-if="table.filters.length"
              :count="table.filters.length"
              :number-style="{ background: '#4f46e5', fontSize: '10px', marginLeft: '4px' }"
            />
          </a-button>
          <a-button v-if="table?.config?.create" size="small" type="primary" @click="() => formOpen(null)">
            <template #icon><PlusOutlined /></template>
            Create
          </a-button>
          <a-button v-if="table?.config?.delete" size="small" danger @click="deleteItems">
            <template #icon><DeleteOutlined /></template>
            Delete
          </a-button>
          <a-upload
            v-if="table?.config?.import"
            name="csv-file"
            :before-upload="importCsv"
            :show-upload-list="false"
            :max-count="1"
            accept="text/csv"
          >
            <a-button size="small">
              <template #icon><UploadOutlined /></template>
              Import
            </a-button>
          </a-upload>
          <a-button v-if="table?.config?.export" size="small" @click="exportCsv">
            <template #icon><DownloadOutlined /></template>
            Export
          </a-button>
          <a-button v-if="props?.filterKeys" size="small" @click="goBack">
            <template #icon><ArrowLeftOutlined /></template>
            Back
          </a-button>
        </a-space>
      </template>

      <a-table
        :columns="table.columns"
        :data-source="table.data"
        :pagination="table.pagination"
        :scroll="{ x: table.scrollX, y: tableHeight }"
        :loading="table.loading"
        size="small"
        @change="handleTableChange"
        :row-key="'__key'"
        :customRow="customRow"
        :customHeaderRow="customHeaderRow"
        :row-selection="rowSelection"
        class="t4t-table"
        @resizeColumn="handleResizeColumn"
      />
    </a-card>

    <!-- Filter Drawer -->
    <a-drawer
      title="Filters"
      :width="520"
      :open="filterShow"
      placement="left"
      @close="filterClose"
    >
      <template #extra>
        <a-tag v-if="table.filters.length" color="purple">{{ table.filters.length }} active</a-tag>
      </template>
      <template #footer>
        <a-space>
          <a-button @click="filterAdd" :disabled="table.filters.length > 9">
            <template #icon><PlusOutlined /></template>
            Add Filter
          </a-button>
          <a-button @click="filterClearAll" :disabled="table.filters.length === 0">Clear All</a-button>
          <a-button type="primary" @click="filterApply">
            <template #icon><CheckOutlined /></template>
            Apply
          </a-button>
        </a-space>
      </template>

      <a-form layout="vertical">
        <a-empty
          v-if="!table.filters.length"
          description="No filters added yet"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
          style="margin: 40px 0"
        />
        <a-form-item v-for="(filter, index) in table.filters" :key="index" :label="`Filter ${index + 1}`">
          <a-input-group compact>
            <a-select style="width: 130px" placeholder="Column" v-model:value="filter.col">
              <a-select-option v-for="col in table.filterCols" :key="col.value" :value="col.value">
                {{ col.label }}
              </a-select-option>
            </a-select>
            <a-select style="width: 80px" placeholder="Op" v-model:value="filter.op">
              <a-select-option v-for="op in table.filterOps" :key="op" :value="op">{{ op }}</a-select-option>
            </a-select>
            <a-input
              style="width: 140px"
              placeholder="Value"
              v-model:value="filter.val"
              :type="table?.config?.cols[filter?.col]?.ui?.attrs?.type || 'text'"
            />
            <a-select style="width: 74px" placeholder="And/Or" v-model:value="filter.andOr">
              <a-select-option v-for="andOr in table.filterAndOr" :key="andOr" :value="andOr">{{ andOr }}</a-select-option>
            </a-select>
            <a-button danger @click="() => filterDelete(index)">
              <template #icon><CloseOutlined /></template>
            </a-button>
          </a-input-group>
        </a-form-item>
      </a-form>
    </a-drawer>

    <!-- Add / Edit Drawer -->
    <a-drawer
      :title="formMode === 'add' ? 'Create Record' : 'Edit Record'"
      :width="500"
      :open="!!formMode"
      @close="formClose"
    >
      <template #extra>
        <a-tag :color="formMode === 'add' ? 'green' : 'blue'">{{ formMode }}</a-tag>
      </template>
      <template #footer>
        <a-space>
          <a-button @click="formClose">Cancel</a-button>
          <a-button v-if="table?.config?.update" type="primary" @click="formSubmit">
            <template #icon><SaveOutlined /></template>
            Save Changes
          </a-button>
        </a-space>
      </template>

      <a-form layout="vertical" :model="table.formData" :rules="table.formRules">
        <template v-for="(colObj, col, index) in table.formCols" :key="col">
          <a-form-item :label="colObj.label" :rules="colRequired(col)" v-if="colShow(colObj)">
            <a-textarea
              v-if="colUiType(colObj, 'textarea')"
              v-model:value="table.formData[col]"
              v-bind="table.formColAttrs[col]"
            />
            <a-select
              v-else-if="colUiType(colObj, 'select')"
              v-model:value="table.formData[col]"
              v-bind="table.formColAttrs[col]"
            />
            <div v-else-if="colUiType(colObj, 'files')">
              <a-upload
                :file-list="table.formFiles[col]"
                :before-upload="(file) => beforeUpload(file, col)"
                @remove="(file) => handleRemove(file, col)"
                v-bind="table.formColAttrs[col]"
              >
                <a-button>
                  <template #icon><UploadOutlined /></template>
                  Select File
                </a-button>
              </a-upload>
              <div>{{ table.formData[col] }}</div>
              <a-image v-if="table.formData[col]" :alt="table.formData[col]" :width="200" :src="openImg(col)" />
            </div>
            <a-auto-complete
              v-else-if="colUiType(colObj, 'autocomplete')"
              v-model:value="table.formData[col]"
              v-bind="table.formColAttrs[col]"
              :options="table.formColAc[col].options"
              style="width: 100%"
              placeholder="Type to search..."
              @select="(value, option) => onAcSelect(col, value, option)"
              @search="(value) => debouncedAcSearch(value, col, table.formData)"
            />
            <a-input v-else v-model:value="table.formData[col]" v-bind="table.formColAttrs[col]" />
          </a-form-item>
        </template>
      </a-form>
    </a-drawer>
  </div>
</template>

<script>
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  TableOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';
import { getLocaleDateTimeTzISO, getTzOffsetISO, getYmdhmsUtc } from '@common/iso/datetime';
import { http } from '@common/vue/plugins/fetch.js';
import * as t4tFe from '@common/web/t4t-fe';
import { debounce, downloadData } from '@common/web/util';
import { Empty, notification } from 'ant-design-vue';
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '../store.js';

const FILTER_TEMPLATE = { col: '', op: '=', andOr: 'and', val: '' };
const DEFAULT_PAGE_SIZE = 10;

export default {
  name: 'T4t',
  props: ['tableName', 'filterKeys', 'filterVals'],
  components: {
    ArrowLeftOutlined,
    CheckOutlined,
    CloseOutlined,
    DeleteOutlined,
    DownloadOutlined,
    FilterOutlined,
    PlusOutlined,
    ReloadOutlined,
    SaveOutlined,
    TableOutlined,
    UploadOutlined,
  },
  setup(props, context) {
    const store = useMainStore();
    const router = useRouter();

    const table = reactive({
      scroll: { x: 1800, y: 240 },
      pagination: { pageSize: DEFAULT_PAGE_SIZE, total: 0, current: 1 },
      sorter: null,

      filters: [],
      filterCols: [],
      filterOps: ['like', '=', '!=', '>=', '>', '<', '<='],
      filterAndOr: ['and', 'or'],

      keyCols: [],
      data: [],
      loading: false,
      config: null,
      columns: [],

      formKey: null,
      formData: {},
      formFiles: {},
      formRules: {},
      formCols: {},
      formColAttrs: {},
      formColAc: {},
      scrollX: 1800,
    });

    const filterShow = ref(false);

    const deleteItems = async () => {
      if (!confirm('Delete Items?')) return;
      const numSelected = rowSelection.selectedRowKeys.length;
      const { deleteLimit } = table.config;
      if (numSelected > deleteLimit) {
        return alert(`Limit is ${deleteLimit} record. ${numSelected} currently selected`);
      }
      const message = 'Delete Items';
      const duration = 3;
      if (store.loading === false) {
        store.loading = true;
        try {
          await t4tFe.remove(rowSelection.selectedRowKeys);
          await fetchData();
          notification.open({ message, duration, description: 'Success' });
        } catch (e) {
          notification.open({ message, duration, description: 'Error' });
        }
        store.loading = false;
      }
    };

    const handleRemove = (file, col) => {
      const index = table.formFiles[col].indexOf(file);
      const newFileList = table.formFiles[col].slice();
      newFileList.splice(index, 1);
      table.formFiles[col] = newFileList;
    };
    const beforeUpload = (file, col) => {
      const maxFiles = table.config.cols[col]?.ui?.attrs?.maxCount || 0;
      if (table.formFiles[col].length === maxFiles) {
        alert(`Maximum ${maxFiles} Files Exceeded. Remove a file before adding`);
      } else {
        table.formFiles[col] = [...(table.formFiles[col] || []), file];
      }
      return false;
    };

    const formMode = ref(false);
    const formOpen = async item => {
      table.formData = {};
      table.formFiles = {};
      table.formKey = null;
      let rv = {};
      const mode = item ? 'edit' : 'add';
      try {
        if (mode === 'edit') {
          if (table.loading) return;
          table.loading = true;
          rv = await t4tFe.findOne(item.__key);
          table.formKey = item.__key;
          table.loading = false;
        }

        for (const colName in table.config.cols) {
          const col = table.config.cols[colName];
          if (
            !(col[mode] && col.type !== 'link' && !(col.auto && mode === 'add') && !(col.hide && col.hide !== 'blank'))
          )
            continue;

          table.formCols[colName] = col;
          table.formData[colName] = mode === 'add' ? table.config.cols[colName].default || '' : rv[colName];
          table.formColAttrs[colName] = {
            ...col.ui?.attrs,
            disabled:
              (mode === 'add' && col.add === 'readonly') || (mode === 'edit' && (col.edit === 'readonly' || col.auto)),
            required: col.required,
          };
          if (col?.ui?.tag === 'files') table.formFiles[colName] = [];
          else if (col?.ui?.tag === 'autocomplete') {
            table.formColAc[colName] = { options: [] };
            table.formData[colName] = {
              key: table.formData[colName].key,
              label: table.formData[colName].text,
              value: table.formData[colName].text,
            };
          } else if (col?.ui?.attrs?.type === 'datetime-local') {
            table.formData[colName] = getLocaleDateTimeTzISO(table.formData[colName]).substring(0, 16);
          }
        }
      } catch (e) {
        notification.open({ message: 'Open Form', duration: 3, description: e.toString() });
      }
      if (Object.keys(table.formCols).length !== 0) formMode.value = mode;
    };

    const formSubmit = async () => {
      const formData = new FormData();
      const jsonData = {};
      for (const col in table.formData) {
        jsonData[col] = table.formData[col];
        if (table.formFiles[col]) {
          if (table.formFiles[col].length) {
            jsonData[col] = '';
            for (const file of table.formFiles[col]) {
              jsonData[col] = jsonData[col] ? `${jsonData[col]},${file.name}` : file.name;
              formData.append(col, file, file.name);
            }
          }
        }
        if (table.config.cols[col]?.ui?.tag === 'autocomplete') {
          jsonData[col] = table.formData[col]?.key;
        } else if (table.config.cols[col]?.ui?.attrs?.type === 'datetime-local') {
          jsonData[col] = new Date(table.formData[col]).toISOString();
        }
      }
      formData.append('json', JSON.stringify(jsonData));
      if (store.loading === false) {
        store.loading = true;
        const message = formMode.value === 'add' ? 'Add' : 'Update';
        const duration = 3;
        try {
          if (formMode.value === 'add') {
            await t4tFe.create(formData);
          } else {
            await t4tFe.update(table.formKey, formData);
          }
          await fetchData();
          notification.open({ message, duration, description: 'Success' });
        } catch (e) {
          notification.open({ message, duration, description: 'Error' });
        }
        store.loading = false;
      }
      formMode.value = false;
    };

    const rowSelection = reactive({
      selectedRowKeys: [],
      onChange: selectedRowKeys => {
        rowSelection.selectedRowKeys = selectedRowKeys;
      },
    });

    const mapRecordCol = (record, _col) => {
      const colObj = table.config.cols[_col];
      if (colObj?.ui?.tag === 'autocomplete' && colObj.options) {
        const { display } = colObj.options;
        if (display && record[_col][display]) {
          record[_col] = record[_col][display];
        } else if (typeof record[_col] !== 'string') {
          record[_col] = JSON.stringify(record[_col]);
        }
      }
      return record[_col];
    };

    const mapRecord = record => {
      for (const _col in table.config.cols) {
        const tableCol = table.config.cols[_col];
        if (tableCol.type === 'link') {
          // no mapping needed
        } else if (record[_col]) {
          record[_col] = mapRecordCol(record, _col);
        }
      }
      return record;
    };

    const fetchData = async () => {
      if (table.loading) return;
      table.loading = true;
      try {
        const filters = JSON.parse(JSON.stringify(table.filters));
        for (const [index, filter] of filters.entries()) {
          const attrsType = table.config.cols[filter?.col]?.ui?.attrs?.type;
          if (attrsType === 'datetime-local') {
            filters[index].val += `:00${getTzOffsetISO()}`;
          }
        }
        const { filterKeys, filterVals } = props;
        if (filterKeys?.length && filterVals?.length) {
          const filterKeysA = filterKeys.split(',');
          const filterValsA = filterVals.split(',');
          for (const [index, value] of filterKeysA.entries()) {
            filters.push({ andOr: 'and', col: filterKeysA[index], op: '=', val: filterValsA[index] });
          }
        }
        const { results, total } = await t4tFe.find(filters, null, table.pagination.current, table.pagination.pageSize);
        table.data = results.map(result => mapRecord(result));
        table.pagination.total = total;
      } catch (e) {
        alert(`Error find${e.toString()}`);
      }
      table.loading = false;
    };

    onMounted(async () => {
      t4tFe.setFetch(http);
      t4tFe.setTableName(props.tableName);

      if (store.loading === false) {
        store.loading = true;
        try {
          table.config = await t4tFe.getConfig();
        } catch (e) {
          alert('Error Loading Table Configuration');
        }
        if (table.config) {
          try {
            for (const key in table.config.cols) {
              const val = table.config.cols[key];
              if (val.multiKey || val.auto === 'pk') table.keyCols.push(key);
              const column = {
                title: val.label,
                dataIndex: key,
                filter: val.filter,
                sorter: val.sort,
                __type: val.type || 'text',
                ui: val.ui,
                customCell: (record, rowIndex, column) => {
                  const key = column.dataIndex;
                  const rv = {
                    onClick: event => {
                      if (column?.__type === 'link') {
                        const col = table.config.cols[key];
                        let fvals = '';
                        const keys_a = col.link.keys.split(',');
                        for (const linkKey of keys_a) {
                          if (fvals) fvals += `,${record[linkKey]}`;
                          else fvals = record[linkKey];
                        }
                        router.push({
                          path: '/t4t-link',
                          name: 'T4t-Link',
                          query: { fkeys: col.link.ckeys, fvals },
                          params: { table: col.link.ctable },
                        });
                      } else {
                        formOpen(record);
                      }
                    },
                  };
                  return rv;
                },
                resizable: true,
                width: 100,
                ellipsis: true,
                customRender(e) {
                  const { column, text } = e;
                  const attrsType = column?.ui?.attrs?.type;
                  if (attrsType === 'datetime-local') {
                    if (column?.ui?.tz === 'utc') return new Date(text).toISOString();
                    else return new Date(text).toLocaleString();
                  }
                  return e.text;
                },
              };
              if (!val.hide) table.columns.push(column);
            }
            table.filterCols = table.columns
              .filter(col => col.filter)
              .map(col => ({ value: col.dataIndex, label: col.title }));
            await fetchData();
          } catch (e) {
            alert('Error Loading Table Data');
          }
        }
        store.loading = false;
      }
    });

    const handleTableChange = async (pagination, filters, sorter) => {
      table.pagination = { ...pagination };
      table.sorter = { ...sorter };
      if (store.loading === false) {
        store.loading = true;
        await fetchData();
        store.loading = false;
      }
    };

    const customRow = (record, index) => ({});
    const customHeaderRow = column => ({});

    const importCsv = async file => {
      const message = 'Import CSV';
      const duration = 3;
      try {
        const { data } = await t4tFe.upload(file);
        if (data.errorCount > 0) {
          notification.open({ message, duration, description: 'Errors - downloading...' });
          downloadData(data.errors.join('\n'), `${getYmdhmsUtc()}-import-errors-${props.tableName}.csv`);
        } else {
          notification.open({ message, duration, description: data?.message || 'Success' });
        }
      } catch (e) {
        notification.open({ message, duration, description: 'Failed' });
      }
      return false;
    };

    const exportCsv = async () => {
      const filters = [...table.filters];
      const { filterKeys, filterVals } = props;
      if (filterKeys?.length && filterVals?.length) {
        const filterKeysA = filterKeys.split(',');
        const filterValsA = filterVals.split(',');
        for (const [index, value] of filterKeysA.entries()) {
          filters.push({ andOr: 'and', col: filterKeysA[index], op: '=', val: filterValsA[index] });
        }
      }
      const sorter = null;
      const message = 'Export CSV';
      const duration = 3;
      try {
        const data = await t4tFe.download(filters, sorter);
        downloadData(data.csv, `${new Date().toISOString()}-${props.tableName}.csv`);
        notification.open({ message, duration, description: 'Success' });
      } catch (e) {
        notification.open({ message, duration, description: 'Failed' });
      }
    };

    const tableHeight = ref(0);
    const OFFSET_HEIGHT = 306;
    const handleResize = () => {
      tableHeight.value = window.innerHeight - OFFSET_HEIGHT;
    };
    onMounted(() => {
      handleResize();
      window.addEventListener('resize', handleResize);
    });
    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
    });

    return {
      Empty,
      props,
      goBack: () => router.go(-1),
      colShow: val => (formMode.value === 'add' && val.add) || (formMode.value === 'edit' && val.edit),
      colUiType: (val, uiType) => val?.ui?.tag === uiType,
      colRequired: val => [
        { required: !!table.formColAttrs[val]?.required, message: `${table.formCols[val]?.label} is required` },
      ],
      openImg: col => {
        const file = table.formData[col];
        const path = table.config.cols[col]?.ui?.url;
        return `${path + file}`;
      },
      table,
      handleTableChange,
      customRow,
      customHeaderRow,

      filterShow,
      filterApply: async () => {
        if (store.loading === false) {
          store.loading = true;
          await fetchData();
          store.loading = false;
        }
      },
      filterOpen: () => (filterShow.value = true),
      filterClose: () => (filterShow.value = false),
      filterAdd: () => table.filters.push({ ...FILTER_TEMPLATE }),
      filterClearAll: () => (table.filters = []),
      filterDelete: index => table.filters.splice(index, 1),

      importCsv,
      exportCsv,

      formMode,
      formOpen,
      formSubmit,
      formClose: () => (formMode.value = false),

      rowSelection,
      deleteItems,

      tableHeight,
      handleResizeColumn: (w, col) => (col.width = w),

      handleRemove,
      beforeUpload,

      debouncedAcSearch: debounce(async (text, col, record) => {
        const res = await t4tFe.autocomplete(text, col, record);
        table.formColAc[col].options = res.map(item => ({
          key: item.key,
          label: item.text,
          value: item.text,
        }));
      }, 500),
      onAcSelect: (col, text, option) => {
        table.formData[col] = option;
      },
    };
  },
};
</script>

<style scoped>
.t4t-view {
  font-family: 'DM Sans', sans-serif;
}

.t4t-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.t4t-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 52px;
}

:deep(.t4t-card .ant-card-body) {
  padding: 16px 20px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.card-title-icon {
  color: #4f46e5;
  font-size: 16px;
}

:deep(.t4t-table .ant-table-thead > tr > th) {
  background: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  padding: 8px 12px;
}

:deep(.t4t-table .ant-table-tbody > tr > td) {
  font-size: 13px;
  color: #1e293b;
  padding: 8px 12px;
  cursor: pointer;
}

:deep(.t4t-table .ant-table-tbody > tr:hover > td) {
  background: #f1f5f9;
}
</style>
