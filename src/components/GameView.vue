<template>
  <div class="game-view">
    <GameHeader
      :state="state"
      :days-left="daysLeft"
      :profit="profit"
      :theme="theme"
      @back="$emit('back')"
      @toggle-theme="$emit('toggle-theme')"
    />

    <div class="game-body">
      <aside class="sidebar">
        <div class="trainee-grid">
          <TraineeCard
            v-for="t in activeTrainees"
            :key="t.id"
            :trainee="t"
            :score="calcScore(t)"
          />
        </div>
      </aside>

      <main class="main-panel">
        <SchedulePanel
          :trainees="activeTrainees"
          :schedule="state.schedule"
          :can-end="canEndDay"
          @set="(id, act) => $emit('set-schedule', id, act)"
          @clear="$emit('clear-schedule')"
          @end-day="$emit('end-day')"
        />
        <DayLog :logs="state.logs" />
      </main>

      <aside class="right-panel">
        <GroupsPanel
          :groups="state.groups"
          :trainees="state.trainees"
          :money="state.money"
          :has-active-production="!!state.activeProduction"
          @release="(id) => $emit('release-single', id)"
          @produce="onProduce"
        />
        <ProducerPanel
          :hired-producers="state.hiredProducers"
          :money="state.money"
          :get-synergy="getSynergy"
          :active-production="state.activeProduction"
          @hire="onHireProducer"
        />
        <RelationshipPanel
          :trainees="state.trainees"
          :relationships="state.relationships"
        />
      </aside>
    </div>

    <RatingModal
      v-if="state.pendingRating && state.gameStatus === 'playing'"
      :results="ratingResults"
      @close="$emit('dismiss-rating')"
      @debut="showDebut = true"
    />

    <DebutModal
      v-if="showDebut"
      :candidates="ratingResults"
      @close="showDebut = false"
      @confirm="onDebut"
    />

    <EventModal
      v-if="state.pendingEvent"
      :event="state.pendingEvent"
      @resolve="(keep) => $emit('resolve-poaching', keep)"
    />

    <ProductionModal
      v-if="showProduction"
      :group="selectedGroup"
      :hired-producers="state.hiredProducers"
      :money="state.money"
      :get-synergy="getSynergy"
      @close="showProduction = false"
      @confirm="onStartProduction"
    />

    <ResourceAssignModal
      v-if="showResourceModal"
      :current-stage="currentStage"
      :available-members="availableMembers"
      :current-quality="state.activeProduction.currentQuality"
      @confirm="onAssignResources"
    />

    <ProductionEventModal
      v-if="showEventModal"
      :event="state.activeProduction.pendingEvent"
      :current-quality="state.activeProduction.currentQuality"
      @select="onResolveEvent"
    />

    <div v-if="showReworkModal" class="modal-overlay" @click.self="">
      <div class="modal-content rework-modal">
        <div class="modal-header">
          <h3>⚠️ 返工确认</h3>
        </div>
        <div class="modal-body">
          <p>制作人对当前作品不满意，建议进行返工以提升品质。</p>
          <div class="rework-info">
            <div class="rework-item">
              <span>当前品质</span>
              <strong>{{ state.activeProduction?.currentQuality.toFixed(1) }}</strong>
            </div>
            <div class="rework-item">
              <span>返工费用</span>
              <strong>¥{{ reworkCost.toLocaleString() }}</strong>
            </div>
            <div class="rework-item">
              <span>预计品质提升</span>
              <strong class="positive">+{{ potentialGain.toFixed(1) }} ~ +{{ (potentialGain * 2).toFixed(1) }}</strong>
            </div>
            <div class="rework-item">
              <span>已返工次数</span>
              <strong>{{ state.activeProduction?.reworkCount || 0 }} 次</strong>
            </div>
          </div>
          <div class="decision-summary">
            <div class="summary-title">本次制作决策评价</div>
            <div class="summary-stats">
              <span class="good">优 {{ goodDecisions }}</span>
              <span class="bad">劣 {{ badDecisions }}</span>
              <span class="neutral">中 {{ neutralDecisions }}</span>
            </div>
            <div class="rework-chance">
              返工风险系数：<strong>{{ Math.round(reworkChance * 100) }}%</strong>
            </div>
          </div>
          <p class="rework-tip">返工后将重新经历制作流程，需要重新分配资源。</p>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" @click="onSkipRework">
            直接发行
          </button>
          <button class="btn primary" :disabled="state.money < reworkCost" @click="onConfirmRework">
            确认返工
          </button>
        </div>
      </div>
    </div>

    <GameOverModal
      v-if="state.gameStatus !== 'playing'"
      :status="state.gameStatus"
      :state="state"
      :profit="profit"
      @back="$emit('back')"
    />

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import GameHeader from './GameHeader.vue'
import TraineeCard from './TraineeCard.vue'
import SchedulePanel from './SchedulePanel.vue'
import DayLog from './DayLog.vue'
import GroupsPanel from './GroupsPanel.vue'
import ProducerPanel from './ProducerPanel.vue'
import RelationshipPanel from './RelationshipPanel.vue'
import RatingModal from './RatingModal.vue'
import DebutModal from './DebutModal.vue'
import EventModal from './EventModal.vue'
import ProductionModal from './ProductionModal.vue'
import ResourceAssignModal from './ResourceAssignModal.vue'
import ProductionEventModal from './ProductionEventModal.vue'
import GameOverModal from './GameOverModal.vue'
import { GAME_CONFIG } from '../config/gameConfig'

const props = defineProps({
  state: Object,
  activeTrainees: Array,
  daysLeft: Number,
  profit: Number,
  theme: String,
  canEndDay: Boolean,
  ratingResults: Array,
  calcScore: Function,
  getSynergy: Function,
  hireProducer: Function,
  startProduction: Function,
  confirmRework: Function,
  skipRework: Function,
  assignResources: Function,
  resolveEvent: Function,
})

const emit = defineEmits([
  'back',
  'toggle-theme',
  'set-schedule',
  'clear-schedule',
  'end-day',
  'dismiss-rating',
  'debut',
  'resolve-poaching',
  'release-single',
])

const showDebut = ref(false)
const showProduction = ref(false)
const selectedGroup = ref(null)
const toast = ref('')

const showResourceModal = computed(() => {
  return props.state?.activeProduction?.status === 'assigning_resources' &&
         !props.state.activeProduction.pendingEvent &&
         !props.state.activeProduction.reworkPending
})

const showEventModal = computed(() => {
  return props.state?.activeProduction?.pendingEvent &&
         !props.state.activeProduction.reworkPending
})

const showReworkModal = computed(() => {
  return props.state?.activeProduction?.reworkPending === true
})

const currentStage = computed(() => {
  if (!props.state?.activeProduction) return null
  return props.state.activeProduction.stages[props.state.activeProduction.currentStageIndex]
})

const availableMembers = computed(() => {
  if (!props.state?.activeProduction) return []
  const group = props.state.groups.find((g) => g.id === props.state.activeProduction.groupId)
  if (!group) return []
  return props.state.trainees.filter((t) => group.memberIds.includes(t.id))
})

const reworkCost = computed(() => {
  if (!props.state?.activeProduction) return 0
  return Math.round(props.state.activeProduction.totalCost * GAME_CONFIG.producers.rework.extraCostPercent)
})

const goodDecisions = computed(() => {
  return props.state?.activeProduction?.eventHistory?.filter((e) => e.qualityEffect > 0.02).length || 0
})

const badDecisions = computed(() => {
  return props.state?.activeProduction?.eventHistory?.filter((e) => e.qualityEffect < -0.02).length || 0
})

const neutralDecisions = computed(() => {
  const total = props.state?.activeProduction?.eventHistory?.length || 0
  return total - goodDecisions.value - badDecisions.value
})

const reworkChance = computed(() => {
  if (!props.state?.activeProduction) return 0
  let chance = GAME_CONFIG.producers.rework.baseThreshold
  chance += (badDecisions.value - goodDecisions.value) * 0.1
  chance -= (props.state.activeProduction.decisionScore || 0) * 0.05
  const producer = props.state.activeProduction.producerId
    ? props.state.producerSynergy[props.state.activeProduction.producerId]
    : null
  if (producer) {
    chance += 0.15
  }
  return Math.max(0.05, Math.min(0.7, chance))
})

const potentialGain = computed(() => {
  if (!props.state?.activeProduction) return 0
  const qualityGap = 80 - props.state.activeProduction.currentQuality
  return Math.max(5, qualityGap * 0.3)
})

function showToast(message, duration = 2500) {
  toast.value = message
  setTimeout(() => { toast.value = '' }, duration)
}

function onDebut(memberIds, groupName) {
  emit('debut', memberIds, groupName, (result) => {
    if (result?.success) {
      showDebut.value = false
      showToast('出道成功！')
    } else if (result?.message) {
      showToast(result.message, 3000)
    }
  })
}

function onProduce(groupId) {
  const group = props.state.groups.find((g) => g.id === groupId)
  if (group) {
    selectedGroup.value = group
    showProduction.value = true
  }
}

function onHireProducer(producerId) {
  const result = props.hireProducer(producerId)
  if (result?.success) {
    showToast('雇佣成功！')
  } else if (result?.message) {
    showToast(result.message, 3000)
  }
}

function onStartProduction(producerId) {
  if (!selectedGroup.value) return
  const result = props.startProduction(selectedGroup.value.id, producerId)
  if (result?.success) {
    showProduction.value = false
    selectedGroup.value = null
    showToast('开始制作单曲！请分配作曲资源。')
  } else if (result?.message) {
    showToast(result.message, 3000)
  }
}

function onAssignResources(memberIds) {
  const result = props.assignResources(memberIds)
  if (result?.success) {
    showToast(`资源分配完成！品质 +${result.qualityGain.toFixed(1)}`)
  } else if (result?.message) {
    showToast(result.message, 3000)
  }
}

function onResolveEvent(choiceIndex) {
  const result = props.resolveEvent(choiceIndex)
  if (result?.success) {
    const effects = result.effects
    const qualityText = effects.qualityEffect > 0
      ? `品质提升 ${Math.round(effects.qualityEffect * 100)}%`
      : effects.qualityEffect < 0
      ? `品质下降 ${Math.abs(Math.round(effects.qualityEffect * 100))}%`
      : '品质不变'
    showToast(`决策完成！${qualityText}`)
  } else if (result?.message) {
    showToast(result.message, 3000)
  }
}

function onConfirmRework() {
  const result = props.confirmRework()
  if (result?.success) {
    showToast('开始返工！请重新分配作曲资源。')
  } else if (result?.message) {
    showToast(result.message, 3000)
  }
}

function onSkipRework() {
  const result = props.skipRework()
  if (result?.success) {
    showToast('单曲已发行！')
  }
}
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.game-body {
  display: grid;
  grid-template-columns: 1fr 1.1fr 0.9fr;
  gap: 1rem;
  padding: 1rem;
  flex: 1;
}

@media (max-width: 1100px) {
  .game-body {
    grid-template-columns: 1fr;
  }
}

.sidebar .trainee-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.main-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-card);
  border: 1px solid var(--accent);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  z-index: 200;
  box-shadow: var(--shadow);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-card);
  border-radius: 12px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
}

.modal-body {
  padding: 1.25rem;
}

.modal-body p {
  margin: 0 0 1rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.rework-info {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}

.rework-item {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
  font-size: 0.9rem;
}

.rework-item span {
  color: var(--text-muted);
}

.rework-item strong {
  color: var(--text-primary);
}

.rework-item .positive {
  color: #10b981;
}

.decision-summary {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}

.summary-title {
  font-weight: 600;
  font-size: 0.85rem;
  color: #92400e;
  margin-bottom: 0.4rem;
}

.summary-stats {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
}

.summary-stats .good {
  background: rgba(16, 185, 129, 0.2);
  color: #065f46;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-weight: 500;
}

.summary-stats .bad {
  background: rgba(239, 68, 68, 0.2);
  color: #991b1b;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-weight: 500;
}

.summary-stats .neutral {
  background: rgba(107, 114, 128, 0.2);
  color: #374151;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-weight: 500;
}

.rework-chance {
  font-size: 0.8rem;
  color: #92400e;
}

.rework-chance strong {
  color: #d97706;
}

.rework-tip {
  font-size: 0.8rem;
  color: var(--text-muted) !important;
  margin: 0 !important;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
}
</style>
