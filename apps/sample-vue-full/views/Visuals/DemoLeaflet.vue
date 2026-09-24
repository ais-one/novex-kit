<template>
  <div class="demo-leaflet">
    <a-row :gutter="[16, 16]">

      <!-- Map card -->
      <a-col :xs="24" :lg="16">
        <a-card :bordered="false" class="map-card">
          <template #title>
            <div class="card-title-row">
              <EnvironmentOutlined class="card-title-icon" />
              <span>Interactive Map</span>
              <a-tag :color="tileLayer === 'dark' ? 'default' : 'blue'" style="margin-left:auto;font-size:11px">
                {{ tileLabels[tileLayer] }}
              </a-tag>
            </div>
          </template>
          <template #extra>
            <a-radio-group v-model:value="tileLayer" size="small" button-style="solid">
              <a-radio-button value="osm">Street</a-radio-button>
              <a-radio-button value="topo">Topo</a-radio-button>
              <a-radio-button value="dark">Dark</a-radio-button>
            </a-radio-group>
          </template>

          <div class="map-wrapper">
            <LeafletMap
              ref="mapRef"
              :center="mapCenter"
              :zoom="mapZoom"
              :markers="markers"
              :tile-layer="tileLayer"
              @marker-click="onMarkerClick"
            />
          </div>
        </a-card>
      </a-col>

      <!-- Sidebar -->
      <a-col :xs="24" :lg="8">
        <a-row :gutter="[0, 12]">

          <!-- Stats row -->
          <a-col :span="12">
            <a-card :bordered="false" class="mini-stat-card">
              <a-statistic
                title="Total Locations"
                :value="markers.length"
                :value-style="{ color: '#4f46e5', fontSize: '22px', fontWeight: 700 }"
              />
            </a-card>
          </a-col>
          <a-col :span="12" style="padding-left:6px">
            <a-card :bordered="false" class="mini-stat-card">
              <a-statistic
                title="Active Markers"
                :value="markers.filter(m => m.active).length"
                :value-style="{ color: '#16a34a', fontSize: '22px', fontWeight: 700 }"
              />
            </a-card>
          </a-col>

          <!-- Location list -->
          <a-col :span="24">
            <a-card :bordered="false" class="location-card">
              <template #title>
                <div class="card-title-row">
                  <UnorderedListOutlined class="card-title-icon" />
                  <span>Locations</span>
                  <a-badge :count="markers.length" :number-style="{ background: '#4f46e5' }" style="margin-left:auto" />
                </div>
              </template>
              <template #extra>
                <a-button type="text" size="small" @click="showAddModal = true">
                  <template #icon><PlusOutlined /></template>
                  Add
                </a-button>
              </template>

              <a-list :data-source="markers" size="small" :split="true">
                <template #renderItem="{ item }">
                  <a-list-item
                    class="location-item"
                    :class="{ 'location-item--active': selectedId === item.id }"
                    @click="flyToMarker(item)"
                  >
                    <a-list-item-meta>
                      <template #avatar>
                        <a-avatar
                          :style="{ background: item.active ? '#4f46e5' : '#94a3b8', flexShrink: 0 }"
                          size="small"
                        >
                          <template #icon><EnvironmentOutlined /></template>
                        </a-avatar>
                      </template>
                      <template #title>
                        <span class="loc-title">{{ item.title }}</span>
                      </template>
                      <template #description>
                        <span class="loc-desc">{{ item.desc }}</span>
                      </template>
                    </a-list-item-meta>
                    <template #actions>
                      <a-tag :color="item.active ? 'green' : 'default'" style="font-size:11px">
                        {{ item.active ? 'Active' : 'Off' }}
                      </a-tag>
                    </template>
                  </a-list-item>
                </template>
              </a-list>
            </a-card>
          </a-col>

          <!-- Selected detail -->
          <a-col v-if="selected" :span="24">
            <a-card :bordered="false" class="detail-card">
              <template #title>
                <div class="card-title-row">
                  <InfoCircleOutlined class="card-title-icon" />
                  <span>Selected Location</span>
                </div>
              </template>

              <a-descriptions :column="1" size="small" :bordered="false">
                <a-descriptions-item label="Name">{{ selected.title }}</a-descriptions-item>
                <a-descriptions-item label="Description">{{ selected.desc }}</a-descriptions-item>
                <a-descriptions-item label="Latitude">{{ selected.lat.toFixed(5) }}</a-descriptions-item>
                <a-descriptions-item label="Longitude">{{ selected.lng.toFixed(5) }}</a-descriptions-item>
                <a-descriptions-item label="Status">
                  <a-tag :color="selected.active ? 'green' : 'default'">
                    {{ selected.active ? 'Active' : 'Inactive' }}
                  </a-tag>
                </a-descriptions-item>
              </a-descriptions>
            </a-card>
          </a-col>

        </a-row>
      </a-col>

    </a-row>

    <!-- Add location modal -->
    <a-modal
      v-model:open="showAddModal"
      title="Add New Location"
      ok-text="Add Marker"
      @ok="submitAdd"
      @cancel="resetForm"
    >
      <a-form :model="addForm" layout="vertical" style="margin-top:12px">
        <a-form-item label="Title" required>
          <a-input v-model:value="addForm.title" placeholder="Location name" />
        </a-form-item>
        <a-form-item label="Description">
          <a-input v-model:value="addForm.desc" placeholder="Short description" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="Latitude" required>
              <a-input-number
                v-model:value="addForm.lat"
                :precision="5"
                :step="0.001"
                style="width:100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Longitude" required>
              <a-input-number
                v-model:value="addForm.lng"
                :precision="5"
                :step="0.001"
                style="width:100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Status">
          <a-switch v-model:checked="addForm.active" checked-children="Active" un-checked-children="Inactive" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
// biome-ignore lint/correctness/noUnusedImports: icons used in Vue template
import { EnvironmentOutlined, InfoCircleOutlined, PlusOutlined, UnorderedListOutlined } from '@ant-design/icons-vue';
import { reactive, ref } from 'vue';
// biome-ignore lint/correctness/noUnusedImports: component used in Vue template
import LeafletMap from '../../components/LeafletMap.vue';

const mapRef = ref(null);
const tileLayer = ref('osm');
const mapCenter = ref([51.505, -0.09]);
const mapZoom = ref(12);
const selectedId = ref(null);
const selected = ref(null);
const showAddModal = ref(false);

const tileLabels = { osm: 'OpenStreetMap', topo: 'Topographic', dark: 'Dark Mode' };

const markers = reactive([
  { id: 1, lat: 51.505, lng: -0.09, title: 'Central London', desc: 'City of Westminster', active: true },
  { id: 2, lat: 51.515, lng: -0.072, title: 'Shoreditch', desc: 'Tech & creative hub', active: true },
  { id: 3, lat: 51.495, lng: -0.135, title: 'Chelsea', desc: 'Royal Borough of Kensington', active: true },
  { id: 4, lat: 51.532, lng: -0.106, title: 'Islington', desc: 'London Borough of Islington', active: false },
  { id: 5, lat: 51.488, lng: -0.074, title: 'Bermondsey', desc: 'London Borough of Southwark', active: true },
]);

let nextId = markers.length + 1;

const addForm = reactive({ title: '', desc: '', lat: 51.505, lng: -0.09, active: true });

const flyToMarker = item => {
  selectedId.value = item.id;
  selected.value = item;
  mapRef.value?.flyTo(item.lat, item.lng, 14);
};

const onMarkerClick = item => {
  selectedId.value = item.id;
  selected.value = item;
};

const submitAdd = () => {
  if (!addForm.title || !addForm.lat || !addForm.lng) return;
  markers.push({
    id: nextId++,
    lat: addForm.lat,
    lng: addForm.lng,
    title: addForm.title,
    desc: addForm.desc,
    active: addForm.active,
  });
  resetForm();
  showAddModal.value = false;
};

const resetForm = () => {
  addForm.title = '';
  addForm.desc = '';
  addForm.lat = 51.505;
  addForm.lng = -0.09;
  addForm.active = true;
};
</script>

<style scoped>
.demo-leaflet {
  font-family: 'DM Sans', sans-serif;
}

.map-card,
.location-card,
.detail-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.map-card .ant-card-head),
:deep(.location-card .ant-card-head),
:deep(.detail-card .ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 48px;
}

:deep(.map-card .ant-card-body) {
  padding: 0;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
}

:deep(.location-card .ant-card-body),
:deep(.detail-card .ant-card-body) {
  padding: 8px 16px 16px;
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

.map-wrapper {
  height: 480px;
}

/* Mini stat cards */
.mini-stat-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.mini-stat-card .ant-card-body) {
  padding: 14px 16px;
}

:deep(.mini-stat-card .ant-statistic-title) {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
}

/* Location list items */
.location-item {
  cursor: pointer;
  border-radius: 8px;
  padding: 8px 6px;
  transition: background 0.15s;
}

.location-item:hover {
  background: #f8fafc;
}

.location-item--active {
  background: #eef2ff;
}

.loc-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.loc-desc {
  font-size: 11px;
  color: #64748b;
}

/* Descriptions */
:deep(.detail-card .ant-descriptions-item-label) {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

:deep(.detail-card .ant-descriptions-item-content) {
  font-size: 12px;
  color: #1e293b;
}
</style>
