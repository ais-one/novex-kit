<template>
  <div class="color-box" :style="{ backgroundColor: color }">
    <span class="color-box-label">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({
  color: { type: String, required: true },
  label: { type: String, required: true },
});
</script>

<style scoped>
.color-box {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  flex-shrink: 0;
}

.color-box:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
}

.color-box-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
</style>
