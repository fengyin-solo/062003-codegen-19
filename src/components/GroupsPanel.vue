<template>
  <div class="groups-panel card">
    <h3>🌟 出道组合</h3>
    <div v-if="groups.length === 0" class="empty">暂无出道组合</div>
    <div v-for="group in groups" :key="group.id" class="group-item">
      <div class="group-head">
        <strong>{{ group.name }}</strong>
        <span class="debut-day">第 {{ group.debutedDay }} 天出道</span>
      </div>
      <div class="members">
        {{ memberNames(group).join(' · ') }}
      </div>
      <div class="group-stats">
        <span>总销量 {{ group.totalSales.toLocaleString() }}</span>
        <span>{{ group.singles.length }} 张单曲</span>
      </div>
      <div v-if="group.singles.length > 0" class="recent-singles">
        <div class="singles-label">最近单曲</div>
        <div v-for="single in group.singles.slice(-2).reverse()" :key="single.day" class="single-item">
          <span class="single-title">{{ single.title }}</span>
          <span v-if="single.qualityLevel" class="quality-badge" :class="'q-' + single.qualityLevel">
            {{ single.qualityLevel }}
          </span>
          <span class="single-sales">{{ single.sales.toLocaleString() }}销量</span>
        </div>
      </div>
      <div class="action-buttons">
        <button
          class="btn secondary sm"
          :disabled="money < singleCost"
          @click="$emit('release', group.id)"
        >
          快速发行
        </button>
        <button
          class="btn primary sm"
          :disabled="hasActiveProduction"
          @click="$emit('produce', group.id)"
        >
          制作人制作
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { GAME_CONFIG } from '../config/gameConfig'

const props = defineProps({
  groups: Array,
  trainees: Array,
  money: Number,
  hasActiveProduction: Boolean,
})

defineEmits(['release', 'produce'])

const singleCost = GAME_CONFIG.single.creationCost

function memberNames(group) {
  return group.memberIds
    .map((id) => props.trainees.find((t) => t.id === id)?.name)
    .filter(Boolean)
}
</script>

<style scoped>
.groups-panel h3 { margin-bottom: 0.75rem; }

.empty {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.group-item {
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.group-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.debut-day {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.members {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.35rem;
}

.group-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.recent-singles {
  margin-bottom: 0.5rem;
}

.singles-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.3rem;
}

.single-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  padding: 0.2rem 0;
}

.single-title {
  color: var(--text-secondary);
}

.quality-badge {
  font-weight: 600;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
}

.quality-badge.q-S { background: #fef3c7; color: #d97706; }
.quality-badge.q-A { background: #f3e8ff; color: #9333ea; }
.quality-badge.q-B { background: #dbeafe; color: #2563eb; }
.quality-badge.q-C { background: #d1fae5; color: #059669; }
.quality-badge.q-D { background: #f3f4f6; color: #6b7280; }

.single-sales {
  color: var(--text-muted);
  margin-left: auto;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-buttons .btn {
  flex: 1;
}
</style>
