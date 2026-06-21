<template>
  <div class="producer-panel card">
    <h3>🎵 制作人协作</h3>

    <div v-if="activeProduction" class="active-production">
      <div class="active-title">
        <strong>正在制作</strong>
        <span class="producer-tag">{{ activeProduction.producerName }}</span>
      </div>
      <div class="stages">
        <div
          v-for="(stage, idx) in activeProduction.stages"
          :key="stage.key"
          class="stage-item"
          :class="{ completed: stage.completed, current: idx === activeProduction.currentStageIndex && !stage.completed }"
        >
          <span class="stage-dot"></span>
          <span class="stage-label">{{ stage.label }}</span>
          <span v-if="!stage.completed && idx === activeProduction.currentStageIndex" class="stage-days">
            {{ stage.daysLeft }}天
          </span>
        </div>
      </div>
      <div class="production-info">
        <span>已投入 ¥{{ activeProduction.totalCost.toLocaleString() }}</span>
        <span>返工 {{ activeProduction.reworkCount }} 次</span>
      </div>
    </div>

    <div class="section-title">
      <span>已雇佣制作人</span>
      <span class="count">{{ hiredProducers.length }}</span>
    </div>

    <div v-if="hiredProducers.length === 0" class="empty">
      暂无雇佣的制作人
    </div>
    <div v-else class="producer-list">
      <div
        v-for="p in hiredProducerDetails"
        :key="p.id"
        class="producer-item hired"
        :style="{ borderLeftColor: tierColors[p.tier] }"
      >
        <div class="producer-head">
          <strong>{{ p.name }}</strong>
          <span class="tier-badge" :style="{ background: tierColors[p.tier] }">
            {{ tierLabels[p.tier] }}
          </span>
        </div>
        <div class="producer-title">{{ p.title }}</div>
        <div class="producer-stats">
          <span class="specialty">{{ specialtyLabels[p.specialty] }}</span>
          <span>品质 +{{ Math.round(p.qualityBonus * 100) }}%</span>
        </div>
        <div class="synergy-bar">
          <span class="synergy-label">磨合度</span>
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{ width: `${getSynergy(p.id)}%`, background: tierColors[p.tier] }"
            ></div>
          </div>
          <span class="synergy-value">{{ getSynergy(p.id) }}</span>
        </div>
        <div class="producer-desc">{{ p.description }}</div>
      </div>
    </div>

    <div class="section-title">
      <span>制作人市场</span>
    </div>

    <div class="producer-list">
      <div
        v-for="p in availableProducers"
        :key="p.id"
        class="producer-item"
        :style="{ borderLeftColor: tierColors[p.tier] }"
      >
        <div class="producer-head">
          <strong>{{ p.name }}</strong>
          <span class="tier-badge" :style="{ background: tierColors[p.tier] }">
            {{ tierLabels[p.tier] }}
          </span>
        </div>
        <div class="producer-title">{{ p.title }}</div>
        <div class="producer-stats">
          <span class="specialty">{{ specialtyLabels[p.specialty] }}</span>
          <span>品质 +{{ Math.round(p.qualityBonus * 100) }}%</span>
          <span>返工率 {{ Math.round(p.reworkRisk * 100) }}%</span>
        </div>
        <div class="producer-desc">{{ p.description }}</div>
        <button
          class="btn primary sm hire-btn"
          :disabled="money < p.cost"
          @click="$emit('hire', p.id)"
        >
          雇佣 ¥{{ p.cost.toLocaleString() }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { GAME_CONFIG } from '../config/gameConfig'

const props = defineProps({
  hiredProducers: Array,
  money: Number,
  getSynergy: Function,
  activeProduction: Object,
})

defineEmits(['hire'])

const producerPool = GAME_CONFIG.producers.pool
const tierLabels = GAME_CONFIG.producers.tierLabels
const tierColors = GAME_CONFIG.producers.tierColors
const specialtyLabels = GAME_CONFIG.producers.specialtyLabels

const hiredProducerDetails = computed(() => {
  return producerPool.filter((p) => props.hiredProducers.includes(p.id))
})

const availableProducers = computed(() => {
  return producerPool.filter((p) => !props.hiredProducers.includes(p.id))
})
</script>

<style scoped>
.producer-panel h3 {
  margin-bottom: 0.75rem;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.section-title .count {
  background: var(--bg-secondary);
  padding: 0.1rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.empty {
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 0.5rem 0;
}

.producer-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.producer-item {
  padding: 0.7rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 3px solid var(--text-muted);
}

.producer-item.hired {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-left-width: 3px;
}

.producer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.2rem;
}

.tier-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  color: white;
  font-weight: 500;
}

.producer-title {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}

.producer-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.75rem;
  margin-bottom: 0.4rem;
}

.producer-stats span {
  background: var(--bg-card);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  color: var(--text-secondary);
}

.specialty {
  color: var(--accent) !important;
  font-weight: 500;
}

.producer-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.hire-btn {
  width: 100%;
}

.synergy-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  font-size: 0.75rem;
}

.synergy-label {
  color: var(--text-muted);
  width: 3rem;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.synergy-value {
  width: 2rem;
  text-align: right;
  color: var(--text-secondary);
  font-weight: 500;
}

.active-production {
  background: linear-gradient(135deg, var(--accent-light), var(--accent) 200%);
  border-radius: 10px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  color: white;
}

.active-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.producer-tag {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.25);
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
}

.stages {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}

.stage-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.6;
}

.stage-item.completed {
  opacity: 1;
}

.stage-item.current {
  opacity: 1;
  font-weight: 500;
}

.stage-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
}

.stage-item.completed .stage-dot {
  background: #4ade80;
}

.stage-item.current .stage-dot {
  background: #fbbf24;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

.stage-label {
  flex: 1;
}

.stage-days {
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
}

.production-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  opacity: 0.9;
}
</style>
