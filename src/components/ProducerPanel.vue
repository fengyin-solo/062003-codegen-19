<template>
  <div class="producer-panel card">
    <h3>🎵 制作人协作</h3>

    <div v-if="activeProduction" class="active-production">
      <div class="active-header">
        <div class="active-title">
          <strong>{{ statusText }}</strong>
          <span class="producer-tag">{{ activeProduction.producerName }}</span>
        </div>
        <div class="production-days">第 {{ activeProduction.totalDays }} 天</div>
      </div>

      <div v-if="activeProduction.status === 'assigning_resources'" class="assign-notice">
        <span class="notice-icon">📋</span>
        <span class="notice-text">请分配成员参与当前阶段</span>
      </div>

      <div v-if="activeProduction.pendingEvent" class="event-notice">
        <span class="notice-icon">⚡</span>
        <span class="notice-text">事件待处理：{{ activeProduction.pendingEvent.label }}</span>
      </div>

      <div v-if="activeProduction.reworkPending" class="rework-notice">
        <span class="notice-icon">⚠️</span>
        <span class="notice-text">等待返工决策</span>
      </div>

      <div class="quality-display">
        <div class="quality-label">
          <span>当前品质</span>
          <span class="quality-change" :class="qualityChangeClass">
            {{ qualityChangeText }}
          </span>
        </div>
        <div class="quality-bar-large">
          <div
            class="quality-fill"
            :style="{ width: activeProduction.currentQuality + '%', background: qualityColor }"
          ></div>
        </div>
        <div class="quality-values">
          <span class="quality-current" :style="{ color: qualityColor }">
            {{ activeProduction.currentQuality.toFixed(1) }}
          </span>
          <span class="quality-level" :style="{ color: qualityColor }">
            {{ qualityLevel.label }}
          </span>
        </div>
      </div>

      <div class="stages">
        <div
          v-for="(stage, idx) in activeProduction.stages"
          :key="stage.key"
          class="stage-item"
          :class="{
            completed: stage.completed,
            current: idx === activeProduction.currentStageIndex && !stage.completed,
            assigning: idx === activeProduction.currentStageIndex && activeProduction.status === 'assigning_resources'
          }"
        >
          <span class="stage-dot"></span>
          <span class="stage-label">{{ stage.label }}</span>
          <span v-if="stage.completed" class="stage-contribution">
            +{{ stage.qualityContribution.toFixed(1) }}
          </span>
          <span v-else-if="idx === activeProduction.currentStageIndex && !stage.completed" class="stage-days">
            {{ stage.daysLeft }}天
          </span>
          <span v-if="stage.assignedMembers && stage.assignedMembers.length > 0" class="stage-members">
            👥 {{ stage.assignedMembers.length }}人
          </span>
        </div>
      </div>

      <div v-if="activeProduction.eventHistory && activeProduction.eventHistory.length > 0" class="event-history">
        <div class="history-title">📊 决策记录</div>
        <div class="history-stats">
          <span class="stat good">{{ goodDecisions }} 优</span>
          <span class="stat bad">{{ badDecisions }} 劣</span>
          <span class="stat neutral">{{ neutralDecisions }} 中</span>
        </div>
        <div class="history-list">
          <div
            v-for="(event, idx) in activeProduction.eventHistory.slice(-3).reverse()"
            :key="idx"
            class="history-item"
          >
            <span class="event-day">第{{ event.day }}天</span>
            <span class="event-effect" :class="event.qualityEffect > 0 ? 'good' : event.qualityEffect < 0 ? 'bad' : 'neutral'">
              {{ event.qualityEffect > 0 ? '+' : '' }}{{ Math.round(event.qualityEffect * 100) }}%
            </span>
          </div>
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
              :style="{ width: getSynergy(p.id) + '%', background: tierColors[p.tier] }"
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
import { getQualityLevel } from '../utils/gameLogic'

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

const qualityLevel = computed(() => {
  if (!props.activeProduction) return { label: '', key: 'D' }
  return getQualityLevel(props.activeProduction.currentQuality)
})

const qualityColor = computed(() => {
  const colors = {
    S: '#f59e0b',
    A: '#a855f7',
    B: '#3b82f6',
    C: '#10b981',
    D: '#6b7280',
  }
  return colors[qualityLevel.value.key] || '#6b7280'
})

const statusText = computed(() => {
  if (!props.activeProduction) return ''
  const statusMap = {
    assigning_resources: '分配作曲资源',
    in_progress: '正在制作',
  }
  return statusMap[props.activeProduction.status] || '制作中'
})

const qualityChangeClass = computed(() => {
  if (!props.activeProduction || !props.activeProduction.eventHistory) return 'neutral'
  const lastEvent = props.activeProduction.eventHistory[props.activeProduction.eventHistory.length - 1]
  if (!lastEvent) return 'neutral'
  if (lastEvent.qualityEffect > 0) return 'positive'
  if (lastEvent.qualityEffect < 0) return 'negative'
  return 'neutral'
})

const qualityChangeText = computed(() => {
  if (!props.activeProduction || !props.activeProduction.eventHistory) return '—'
  const lastEvent = props.activeProduction.eventHistory[props.activeProduction.eventHistory.length - 1]
  if (!lastEvent) return '—'
  const pct = Math.round(lastEvent.qualityEffect * 100)
  return pct > 0 ? `+${pct}%` : `${pct}%`
})

const goodDecisions = computed(() => {
  return props.activeProduction?.eventHistory?.filter((e) => e.qualityEffect > 0.02).length || 0
})

const badDecisions = computed(() => {
  return props.activeProduction?.eventHistory?.filter((e) => e.qualityEffect < -0.02).length || 0
})

const neutralDecisions = computed(() => {
  const total = props.activeProduction?.eventHistory?.length || 0
  return total - goodDecisions.value - badDecisions.value
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

.active-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.active-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.producer-tag {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.25);
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
}

.production-days {
  font-size: 0.8rem;
  opacity: 0.9;
}

.assign-notice,
.event-notice,
.rework-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.event-notice {
  background: rgba(254, 240, 138, 0.3);
}

.rework-notice {
  background: rgba(254, 202, 202, 0.3);
}

.notice-icon {
  font-size: 1rem;
}

.quality-display {
  margin-bottom: 0.6rem;
}

.quality-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
}

.quality-change {
  font-weight: 600;
  font-size: 0.8rem;
}

.quality-change.positive {
  color: #bbf7d0;
}

.quality-change.negative {
  color: #fecaca;
}

.quality-change.neutral {
  color: rgba(255, 255, 255, 0.8);
}

.quality-bar-large {
  height: 12px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.3rem;
}

.quality-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
}

.quality-values {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quality-current {
  font-size: 1.2rem;
  font-weight: 700;
}

.quality-level {
  font-size: 0.85rem;
  font-weight: 600;
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
  flex-wrap: wrap;
}

.stage-item.completed {
  opacity: 1;
}

.stage-item.current,
.stage-item.assigning {
  opacity: 1;
  font-weight: 500;
}

.stage-item.assigning {
  background: rgba(255, 255, 255, 0.15);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  margin: 0 -0.25rem;
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

.stage-item.assigning .stage-dot {
  background: #60a5fa;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

.stage-label {
  flex: 1;
  min-width: 3rem;
}

.stage-days {
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
}

.stage-contribution {
  font-size: 0.7rem;
  color: #bbf7d0;
  font-weight: 600;
}

.stage-members {
  font-size: 0.65rem;
  opacity: 0.8;
}

.event-history {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

.history-title {
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.history-stats {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
}

.history-stats .stat {
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
}

.history-stats .stat.good {
  background: rgba(74, 222, 128, 0.3);
}

.history-stats .stat.bad {
  background: rgba(248, 113, 113, 0.3);
}

.history-stats .stat.neutral {
  background: rgba(255, 255, 255, 0.2);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  opacity: 0.9;
}

.event-day {
  color: rgba(255, 255, 255, 0.7);
}

.event-effect.good {
  color: #bbf7d0;
  font-weight: 600;
}

.event-effect.bad {
  color: #fecaca;
  font-weight: 600;
}

.event-effect.neutral {
  color: rgba(255, 255, 255, 0.8);
}

.production-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  opacity: 0.9;
}
</style>
