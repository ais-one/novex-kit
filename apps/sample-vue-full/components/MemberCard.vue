<template>
  <a-card class="member-card" :bordered="false" hoverable>
    <div class="member-inner">
      <a-avatar :size="52" :style="{ background: avatarColor, fontFamily: 'DM Sans, sans-serif', fontSize: '20px', fontWeight: 700, flexShrink: 0 }">
        {{ initials }}
      </a-avatar>
      <div class="member-info">
        <span class="member-name">{{ name }}</span>
        <a-tag class="member-role-tag" :color="tagColor">{{ role }}</a-tag>
      </div>
    </div>
  </a-card>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: { type: String, required: true },
  role: { type: String, required: true },
  avatarColor: { type: String, default: '#4f46e5' },
  tagColor: { type: String, default: 'purple' },
});

const initials = computed(() =>
  props.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2),
);
</script>

<style scoped>
.member-card {
  border-radius: 12px;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}

.member-card:hover {
  border-color: #a5b4fc !important;
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.18);
  transform: translateY(-2px);
}

:deep(.member-card .ant-card-body) {
  padding: 16px;
}

.member-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.member-name {
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role-tag {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  width: fit-content;
}
</style>
