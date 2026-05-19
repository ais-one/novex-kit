<template>
  <div ref="mapRef" class="leaflet-map-container" />
</template>

<script setup>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { onMounted, onUnmounted, ref, watch } from 'vue';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const props = defineProps({
  center: { type: Array, default: () => [51.505, -0.09] },
  zoom: { type: Number, default: 13 },
  markers: { type: Array, default: () => [] },
  tileLayer: { type: String, default: 'osm' },
});

const emit = defineEmits(['map-click', 'marker-click']);

const mapRef = ref(null);
let mapInstance = null;
const markerInstances = [];

const tileLayers = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
};

const addMarkers = () => {
  for (const m of markerInstances) m.remove();
  markerInstances.length = 0;

  for (const loc of props.markers) {
    const m = L.marker([loc.lat, loc.lng])
      .addTo(mapInstance)
      .bindPopup(`<strong>${loc.title}</strong>${loc.desc ? `<br>${loc.desc}` : ''}`);

    m.on('click', () => emit('marker-click', loc));
    markerInstances.push(m);
  }
};

onMounted(() => {
  mapInstance = L.map(mapRef.value).setView(props.center, props.zoom);

  const layer = tileLayers[props.tileLayer] ?? tileLayers.osm;
  L.tileLayer(layer.url, { attribution: layer.attribution }).addTo(mapInstance);

  mapInstance.on('click', e => emit('map-click', { lat: e.latlng.lat, lng: e.latlng.lng }));

  addMarkers();
});

onUnmounted(() => {
  if (mapInstance) mapInstance.remove();
});

watch(() => props.markers, addMarkers, { deep: true });

watch(
  () => props.tileLayer,
  val => {
    if (!mapInstance) return;
    mapInstance.eachLayer(l => {
      if (l instanceof L.TileLayer) mapInstance.removeLayer(l);
    });
    const layer = tileLayers[val] ?? tileLayers.osm;
    L.tileLayer(layer.url, { attribution: layer.attribution }).addTo(mapInstance);
  },
);

watch(
  () => props.center,
  val => {
    if (mapInstance) mapInstance.setView(val, props.zoom);
  },
);

defineExpose({
  flyTo: (lat, lng, zoom) => mapInstance?.flyTo([lat, lng], zoom ?? props.zoom),
});
</script>

<style scoped>
.leaflet-map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border-radius: 10px;
  overflow: hidden;
  z-index: 1;
}
</style>
