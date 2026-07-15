<template>
  <a-layout-footer class="app-footer">
    <span class="footer-brand">{{ brand }}</span>
    <span class="footer-sep">·</span>
    <span class="footer-copy">{{ year }} All rights reserved</span>
  </a-layout-footer>
</template>

<script setup>
defineProps({
  brand: { type: String, default: 'novex' },
});

const year = new Date().getFullYear();
</script>

<style scoped>
.app-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.footer-brand {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #4f46e5;
  letter-spacing: 0.06em;
}

.footer-sep {
  color: #cbd5e1;
  font-size: 12px;
}

.footer-copy {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #94a3b8;
}

@media (max-width: 767px) {
  .app-footer {
    padding: 0 16px;
    flex-wrap: wrap;
    height: auto;
    min-height: 40px;
    gap: 4px;
  }
}
</style>
