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

    <div v-if="showReworkModal" class="modal-overlay" @click.self="">
      <div class="modal-content rework-modal">
        <div class="modal-header">
          <h3>⚠️ 返工确认</h3>
        </div>
        <div class="modal-body">
          <p>制作人对当前作品不满意，建议进行返工以提升品质。</p>
          <div class="rework-info">
            <div class="rework-item">
              <span>返工费用</span>
              <strong>¥{{ reworkCost.toLocaleString() }}</strong>
            </div>
            <div class="rework-item">
              <span>预计品质提升</span>
              <strong class="positive">+5% ~ +10%</strong>
            </div>
            <div class="rework-item">
              <span>已返工次数</span>
              <strong>{{ state.activeProduction?.reworkCount || 0 }} 次</strong>
            </div>
          </div>
          <p class="rework-tip">返工后将重新经历制作流程（耗时约5天）。</p>
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
import { ref, computed, watch } from 'vue'
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

const showReworkModal = computed(() => {
  return props.state?.activeProduction?.reworkPending === true
})

const reworkCost = computed(() => {
  if (!props.state?.activeProduction) return 0
  return Math.round(props.state.activeProduction.totalCost * GAME_CONFIG.producers.rework.extraCostPercent)
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
    showToast('开始制作单曲！')
  } else if (result?.message) {
    showToast(result.message, 3000)
  }
}

function onConfirmRework() {
  const result = props.confirmRework()
  if (result?.success) {
    showToast('开始返工！')
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
