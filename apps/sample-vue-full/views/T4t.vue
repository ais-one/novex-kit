<template>
  <div class="main-container">
    <div class="title-label">{{ table?.config?.displayName || props.tableName }}</div>
    <div class="table-operations">
      <a-button @click="filterApply" class="button-variation-1"
        ><span class="button-variation-1-label">Reload</span></a-button
      >
      <a-button @click="filterOpen" class="button-variation-1"
        ><span class="button-variation-1-label">Filter</span></a-button
      >
      <a-button v-if="table?.config?.create" @click="() => formOpen(null)" class="button-variation-2"
        ><span class="button-variation-2-label">Create</span></a-button
      >
      <a-button v-if="table?.config?.delete" @click="deleteItems" class="button-variation-2"
        ><span class="button-variation-2-label">Delete</span></a-button
      >
      <a-upload
        style="margin-right: 8px;"
        v-if="table?.config?.import"
        name="csv-file"
        :before-upload="importCsv"
        :show-upload-list="false"
        :max-count="1"
        accept="text/csv"
      >
        <a-button class="button-variation-1"><span class="button-variation-1-label">Import</span></a-button>
      </a-upload>
      <a-button v-if="table?.config?.export" @click="exportCsv" class="button-variation-3"
        ><span class="button-variation-3-label">Export</span></a-button
      >
      <a-button v-if="props?.filterKeys" @click="goBack" class="button-variation-1"
        ><span class="button-variation-1-label">Back</span></a-button
      >
    </div>
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
      class="main-table"
      @resizeColumn="handleResizeColumn"
    >
      <!-- <template #action="item">
        <a-button @click="() => console.log(item)">{{ item.text }}</a-button>
      </template> -->
    </a-table>
    <a-drawer
      title="Filters (Max 10)"
      :width="512"
      :open="filterShow"
      :body-style="{ paddingBottom: '80px' }"
      @close="filterClose"
      placement="left"
    >
      <a-form layout="vertical">
        <a-form-item v-for="(filter, index) in table.filters" :key="index">
          <a-input-group compact>
            <a-select style="width: 125px" placeholder="Column" v-model:value="filter.col">
              <a-select-option v-for="col in table.filterCols" :key="col.value" :value="col.value"
                >{{ col.label }}</a-select-option
              >
            </a-select>
            <a-select style="width: 75px" placeholder="Operation" v-model:value="filter.op">
              <a-select-option v-for="op in table.filterOps" :key="op" :value="op">{{ op }}</a-select-option>
            </a-select>
            <a-input
              style="width: 125px"
              placeholder="Value"
              v-model:value="filter.val"
              :type="table?.config?.cols[filter?.col]?.ui?.attrs?.type || 'text'"
            />
            <a-select style="width: 75px" placeholder="And Or" v-model:value="filter.andOr">
              <a-select-option v-for="andOr in table.filterAndOr" :key="andOr" :value="andOr"
                >{{ andOr }}</a-select-option
              >
            </a-select>
            <a-button type="primary" @click="() => filterDelete(index)">
              <template #icon><CloseOutlined /></template>
            </a-button>
          </a-input-group>
        </a-form-item>
      </a-form>
      <a-button
        :disabled="table.filters.length > 9"
        style="margin-bottom: 8px"
        @click="filterAdd"
        class="button-variation-1"
        ><span class="button-variation-1-label">Add Filter</span></a-button
      >
      <a-button
        :disabled="table.filters.length === 0"
        style="margin-bottom: 8px; margin-left: 8px"
        @click="filterClearAll"
        class="button-variation-1"
        ><span class="button-variation-1-label">Clear All</span></a-button
      >
      <div class="t4t-drawer">
        <a-button type="primary" @click="filterApply" style="margin-left: 25px" class="button-variation-2"
          ><span class="button-variation-2-label">Apply</span></a-button
        >
      </div>
    </a-drawer>
    <a-drawer
      :title="formMode"
      :width="480"
      :open="!!formMode"
      :body-style="{ paddingBottom: '80px' }"
      @close="formClose"
    >
      <a-form layout="vertical" :model="table.formData" :rules="table.formRules">
        <template v-for="(colObj, col, index) in table.formCols" :key="col">
          <a-form-item :label="colObj.label" :rules="colRequired(col)" v-if="colShow(colObj)">
            <!-- <a-input v-model:value="table.formData[col]" v-bind="table.formColAttrs[col]"/> -->
            <!-- <div>{{ index }} {{ table.formData[col] }}</div><br/> -->
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
                :before-upload="(file) => beforeUpload(file,col)"
                @remove="(file) => handleRemove(file,col)"
                v-bind="table.formColAttrs[col]"
              >
                <a-button> Select File </a-button>
              </a-upload>
              <div>{{ table.formData[col] }}</div>
              <a-image v-if="table.formData[col]" :alt="table.formData[col]" :width="200" :src="openImg(col)" />
            </div>
            <a-auto-complete
              v-else-if="colUiType(colObj, 'autocomplete')"
              v-model:value="table.formData[col]"
              v-bind="table.formColAttrs[col]"
              :options="table.formColAc[col].options"
              style="width: 200px"
              placeholder="input here"
              @select="(value, option)=>onAcSelect(col, value, option)"
              @search="(value)=>debouncedAcSearch(value, col, table.formData)"
            />
            <a-input v-else v-model:value="table.formData[col]" v-bind="table.formColAttrs[col]" />
            <!-- <div v-else>[{{ index }}] {{ table.formData[col] }}</div><br/> -->
          </a-form-item>
        </template>
        <!-- TODOOOO single autocomplete, multi autocomplete, multi select -->
      </a-form>
      <div class="t4t-drawer">
        <a-button v-if="table?.config?.update" style="margin-left: 25px" @click="formSubmit" class="button-variation-2"
          ><span class="button-variation-2-label">Save Changes</span></a-button
        >
        <a-button style="margin-left: 10px" @click="formClose" class="button-variation-1"
          ><span class="button-variation-1-label">Cancel</span></a-button
        >
      </div>
    </a-drawer>
  </div>
</template>
<script>
import { CloseOutlined } from '@ant-design/icons-vue';
import { getLocaleDateTimeTzISO, getTzOffsetISO, getYmdhmsUtc } from '@common/iso/datetime';
import { http } from '@common/vue/plugins/fetch.js';
import * as t4tFe from '@common/web/t4t-fe'; // Reference - https://github.com/es-labs/jslib/blob/main/libs/esm/t4t-fe.js
import { debounce, downloadData } from '@common/web/util';
import { notification } from 'ant-design-vue';
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '../store.js';

const FILTER_TEMPLATE = { col: '', op: '=', andOr: 'and', val: '' };
const DEFAULT_PAGE_SIZE = 10;

export default {
  name: 'T4t',
  props: ['tableName', 'filterKeys', 'filterVals'],
  components: {
    CloseOutlined,
  },
  setup(props, context) {
    console.log('t4t - v0.0.2');
    const store = useMainStore();
    const router = useRouter();
    // const loading = store.loading

    // table information
    const table = reactive({
      scroll: { x: 1800, y: 240 },
      pagination: { pageSize: DEFAULT_PAGE_SIZE, total: 0, current: 1 }, // start at page 1, 8 records per page
      sorter: null, // single sort only

      filters: [],
      filterCols: [],
      filterOps: ['like', '=', '!=', '>=', '>', '<', '<='], // isNull, isEmpty
      filterAndOr: ['and', 'or'],

      keyCols: [],
      data: [],
      loading: false,
      config: null,
      columns: [],

      formKey: null,
      formData: {},
      formFiles: {},
      formRules: {}, // To Remove
      formCols: {},
      formColAttrs: {}, // attributes for your inputs
      formColAc: {}, // autocomplete properties
      scrollX: 1800,
    });

    const filterShow = ref(false); // Filter drawer

    // Deletion
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
          console.log('t4t delete error', e.toString());
          notification.open({ message, duration, description: 'Error' });
        }
        store.loading = false;
      }
    };

    // File Handling
    const handleRemove = (file, col) => {
      const index = table.formFiles[col].indexOf(file);
      const newFileList = table.formFiles[col].slice();
      newFileList.splice(index, 1);
      table.formFiles[col] = newFileList;
    };
    const beforeUpload = (file, col) => {
      console.log('beforeUpload');
      const maxFiles = table.config.cols[col]?.ui?.attrs?.maxCount || 0;
      if (table.formFiles[col].length === maxFiles) {
        alert(`Maximum ${maxFiles} Files Exceeded. Remove a file before adding`); // have a problem, can keep popping up...
      } else {
        table.formFiles[col] = [...(table.formFiles[col] || []), file];
      }
      return false;
    };

    // Add / Edit Form
    const formMode = ref(false); // false, add or edit
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
            !(
              (
                col[mode] && // mode is found
                col.type !== 'link' && // column is not link type
                !(col.auto && mode === 'add') && // column is not auto or column is auto but mode is not add
                !(col.hide && col.hide !== 'blank')
              ) // column is not hide or column is hide but blank
            )
          )
            continue;

          table.formCols[colName] = col;
          table.formData[colName] = mode === 'add' ? table.config.cols[colName].default || '' : rv[colName]; // get the data // TODO May need formatting?
          table.formColAttrs[colName] = {
            ...col.ui?.attrs,
            disabled:
              (mode === 'add' && col.add === 'readonly') || (mode === 'edit' && (col.edit === 'readonly' || col.auto)),
            required: col.required,
          };
          // if (col?.ui?.tag === 'select') {
          //   console.log('yyyy', table.formColAttrs[colName], table.formData[colName])
          // }
          // Do For Form - table.formData[colName] = mapRecordCol(table.formData, colName)
          if (col?.ui?.tag === 'files')
            table.formFiles[colName] = []; // add file
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
        // console.log('table.formData', table.formData)
        // console.log('table.formCols', table.formCols)
        console.log('table.formColAttrs', table.formColAttrs);
      } catch (e) {
        console.log('formOpen', e.toString());
      }
      if (Object.keys(table.formCols).length !== 0) formMode.value = mode;
    };
    const formSubmit = async () => {
      const formData = new FormData();
      const jsonData = {};
      // input processing...
      for (const col in table.formData) {
        jsonData[col] = table.formData[col];

        if (table.formFiles[col]) {
          // handle files
          if (table.formFiles[col].length) {
            jsonData[col] = '';
            for (const file of table.formFiles[col]) {
              jsonData[col] = jsonData[col] ? `${jsonData[col]},${file.name}` : file.name;
              formData.append(col, file, file.name);
            }
          } else {
            // TODO clearing file
            // jsonData[col] = ''
          }
        }
        if (table.config.cols[col]?.ui?.tag === 'autocomplete') {
          jsonData[col] = table.formData[col]?.key;
        } else if (table.config.cols[col]?.ui?.attrs?.type === 'datetime-local') {
          jsonData[col] = new Date(table.formData[col]).toISOString(); // 2024-12-24 08:00 - 16 chars... convert to ISO
        }
      }
      formData.append('json', JSON.stringify(jsonData));
      if (store.loading === false) {
        store.loading = true;
        const message = formMode.value === 'add' ? 'Add' : 'Update';
        const duration = 3; // seconds
        try {
          if (formMode.value === 'add') {
            await t4tFe.create(formData);
          } else {
            await t4tFe.update(table.formKey, formData);
          }
          await fetchData();
          notification.open({ message, duration, description: 'Success' });
        } catch (e) {
          console.log('t4t submit error', e.toString());
          notification.open({ message, duration, description: 'Error' });
        }
        store.loading = false;
      }
      formMode.value = false;
    };
    const rowSelection = reactive({
      selectedRowKeys: [],
      onChange: selectedRowKeys => {
        // Check here to configure the default column
        console.log('selectedRowKeys changed: ', selectedRowKeys);
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
          // TODO handle display === both
          record[_col] = JSON.stringify(record[_col]);
        }
      } else if (colObj?.ui?.tag === 'select') {
        // TODO display label
      }
      return record[_col];
    };
    const mapRecord = record => {
      for (const _col in table.config.cols) {
        const tableCol = table.config.cols[_col];
        if (tableCol.type === 'link') {
          // no mapping needed for now
        } else if (record[_col]) {
          record[_col] = mapRecordCol(record, _col);
        }
      }
      return record;
    };
    // const hasSelected = computed(() => state.selectedRowKeys.length > 0);
    const fetchData = async () => {
      if (table.loading) return;
      table.loading = true;
      try {
        const filters = JSON.parse(JSON.stringify(table.filters)); // [ ...table.filters ]
        for (const [index, filter] of filters.entries()) {
          // convert filter data here...
          const attrsType = table.config.cols[filter?.col]?.ui?.attrs?.type;
          if (attrsType === 'datetime-local') {
            filters[index].val += `:00${getTzOffsetISO()}`; // convert to UTC
          }
        }
        const { filterKeys, filterVals } = props; // child table filter...
        if (filterKeys?.length && filterVals?.length) {
          const filterKeysA = filterKeys.split(',');
          const filterValsA = filterVals.split(',');
          for (const [index, value] of filterKeysA.entries()) {
            filters.push({ andOr: 'and', col: filterKeysA[index], op: '=', val: filterValsA[index] });
          }
        }
        const { results, total } = await t4tFe.find(filters, null, table.pagination.current, table.pagination.pageSize);
        // console.log('columns', table.columns, 'results', results, total)
        table.data = results.map(result => mapRecord(result)); // format the results...
        table.pagination.total = total;
      } catch (e) {
        alert(`Error find${e.toString()}`);
      }
      table.loading = false;
    };

    // const getRowKey = (record) => table.keyCols.map(keyCol => record[keyCol]).join('|')

    onMounted(async () => {
      t4tFe.setFetch(http);
      t4tFe.setTableName(props.tableName);
      // console.log(props, context)

      if (store.loading === false) {
        store.loading = true;
        try {
          table.config = await t4tFe.getConfig();
        } catch (e) {
          console.log('table config error', e.toString());
          alert('Error Loading Table Configuration');
        }
        if (table.config) {
          try {
            console.log('TABLE CONFIG', table.config);
            for (const key in table.config.cols) {
              const val = table.config.cols[key];
              if (val.multiKey || val.auto === 'pk') table.keyCols.push(key);
              const column = {
                title: val.label,
                dataIndex: key,
                filter: val.filter,
                sorter: val.sort,
                __type: val.type || 'text', // aka type
                ui: val.ui,
                customCell: (record, rowIndex, column) => {
                  const key = column.dataIndex;
                  const rv = {
                    onClick: event => {
                      // console.log('onClick', rowIndex, record, column, event)
                      if (column?.__type === 'link') {
                        const col = table.config.cols[key];
                        console.log(col);
                        let fvals = '';
                        const keys_a = col.link.keys.split(',');
                        for (const linkKey of keys_a) {
                          console.log('linkKey', linkKey, record);
                          if (fvals) fvals += `,${record[linkKey]}`;
                          else fvals = record[linkKey];
                        }
                        // console.log(col.link.ctable, col.link.ckeys, fvals)
                        // TOCHECK replace with t4tfe parentFilter?
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
                  // if (column?.__type === 'link') rv.innerHTML = record[key] + ' - ' + table.config.cols[key].link?.text // || 'Click To View'
                  return rv;
                },
                resizable: true, // these 2 for resizing
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
            console.log('table load error', e.toString());
            alert('Error Loading Table Data');
          }
        }
        store.loading = false;
      }
    });

    const handleTableChange = async (pagination, filters, sorter) => {
      // console.log('handleTableChange', pagination, filters, sorter) // use own filters
      table.pagination = { ...pagination };
      table.sorter = { ...sorter };
      if (store.loading === false) {
        store.loading = true;
        await fetchData();
        store.loading = false;
      }
    };

    // onClick, onDblclick, onMouseenter, onMouseleave, onContextmenu: (event) => {}
    const customRow = (record, index) => ({});
    const customHeaderRow = column => ({});

    // CSV
    const importCsv = async file => {
      try {
        const message = 'Import CSV';
        const duration = 3;
        const { data } = await t4tFe.upload(file);
        if (data.errorCount > 0) {
          notification.open({ message, duration, description: 'Errors - downloading...' });
          downloadData(data.errors.join('\n'), `${getYmdhmsUtc()}-import-errors-${props.tableName}.csv`);
        } else {
          notification.open({ message, duration, description: data?.message || 'Success' });
        }
      } catch (e) {
        notification.open({ message, duration, description: 'Failed' });
        console.log(e);
      }
      return false;
    };
    const exportCsv = async () => {
      // FIX REPEATING CODE START
      const filters = [...table.filters];
      const { filterKeys, filterVals } = props; // child table filter...
      if (filterKeys?.length && filterVals?.length) {
        const filterKeysA = filterKeys.split(',');
        const filterValsA = filterVals.split(',');
        for (const [index, value] of filterKeysA.entries()) {
          filters.push({ andOr: 'and', col: filterKeysA[index], op: '=', val: filterValsA[index] });
        }
      }
      // FIX REPEATING CODE END

      const sorter = null;
      const message = 'Export CSV';
      const duration = 3;
      try {
        const data = await t4tFe.download(filters, sorter);
        downloadData(data.csv, `${(new Date()).toISOString()}-${props.tableName}.csv`);
        notification.open({ message, duration, description: 'Success' });
      } catch (e) {
        notification.open({ message, duration, description: 'Failed' });
        console.log(e);
      }
    };

    // t4tFe.autocomplete

    //responsive table height
    const tableHeight = ref(0);
    const OFFSET_HEIGHT = 306; // IMPORTANT! - Adjust based on your layout (headers, footers, etc.)
    const handleResize = () => {
      const windowHeight = window.innerHeight;
      tableHeight.value = windowHeight - OFFSET_HEIGHT;
    };
    onMounted(() => {
      handleResize();
      window.addEventListener('resize', handleResize);
    });
    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
    });

    return {
      props,
      goBack: () => router.go(-1),
      colShow: val => (formMode.value === 'add' && val.add) || (formMode.value === 'edit' && val.edit),
      colUiType: (val, uiType) => val?.ui?.tag === uiType,
      colRequired: val => [
        { required: !!table.formColAttrs[val]?.required, message: `${table.formCols[val]?.label} is required` },
      ],
      openImg: col => {
        // TODO handle multiple files
        const file = table.formData[col];
        const path = table.config.cols[col]?.ui?.url;
        // console.log(path, file)
        return `${path + file}`;
      },
      table,
      handleTableChange,
      customRow,
      customHeaderRow,

      // filters
      filterShow,
      filterApply: async () => {
        // also used for reload
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

      // csv
      importCsv,
      exportCsv,

      // forms
      formMode,
      formOpen,
      formSubmit,
      formClose: () => (formMode.value = false),

      // others
      rowSelection,
      deleteItems,

      //responsive table height
      tableHeight,
      handleResizeColumn: (w, col) => (col.width = w),

      // files
      handleRemove,
      beforeUpload,

      // autocomplete - search
      debouncedAcSearch: debounce(async (text, col, record) => {
        // console.log('debounced2', text, col, record) // do the search here...
        const res = await t4tFe.autocomplete(text, col, record);
        table.formColAc[col].options = res.map(item => ({
          key: item.key,
          label: item.text,
          value: item.text,
        }));
      }, 500), // when tab key pressed or focus lost,
      // autocomplete - select
      onAcSelect: (col, text, option) => {
        // value, label
        console.log('select', col, text, option); // actually the value..., displayed is also the value...
        table.formData[col] = option;
      },
    };
  },
};
</script>

<style scoped>
@import 'T4t.css';
</style>
