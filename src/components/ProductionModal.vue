<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content production-modal">
      <div class="modal-header">
        <h3>🎼 制作单曲</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <div class="group-info">
          <strong>{{ group.name }}</strong>
          <span class="debut-day">第 {{ group.debutedDay }} 天出道</span>
        </div>

        <div class="section-label">选择制作人</div>

        <div class="producer-options">
          <label
            class="producer-option internal"
            :class="{ selected: selectedProducer === null }"
            @click="selectedProducer = null"
          >
            <div class="option-radio">
              <span v-if="selectedProducer === null" class="radio-dot"></span>
            </div>
            <div class="option-content">
              <div class="option-head">
                <strong>内部制作</strong>
                <span class="cost">免费</span>
              </div>
              <div class="option-desc">使用事务所内部资源制作，品质一般但无需额外费用。</div>
              <div class="option-stats">
                <span>基础品质</span>
                <span>返工率 35%</span>
              </div>
            </div>
          </label>

          <label
            v-for="p in hiredProducerDetails"
            :key="p.id"
            class="producer-option"
            :class="{ selected: selectedProducer === p.id }"
            :style="{ borderLeftColor: tierColors[p.tier] }"
            @click="selectedProducer = p.id"
          >
            <div class="option-radio">
              <span v-if="selectedProducer === p.id" class="radio-dot"></span>
            </div>
            <div class="option-content">
              <div class="option-head">
                <strong>{{ p.name }}</strong>
                <span class="tier-badge" :style="{ background: tierColors[p.tier] }">
                  {{ tierLabels[p.tier] }}
                </span>
              </div>
              <div class="option-title">{{ p.title }} · {{ specialtyLabels[p.specialty] }}</div>
              <div class="option-stats">
                <span>品质 +{{ Math.round(p.qualityBonus * 100) }}%</span>
                <span>返工率 {{ Math.round(p.reworkRisk * 100) }}%</span>
                <span>制作费 ¥{{ Math.round(p.cost * 0.5).toLocaleString() }}</span>
              </div>
              <div class="synergy-mini">
                <span>磨合度</span>
                <div class="mini-bar">
                  <div
                    class="mini-fill"
                    :style="{ width: getSynergy(p.id) + '%', background: tierColors[p.tier] }"
                  ></div>
                </div>
                <span>{{ getSynergy(p.id) }}/100</span>
              </div>
            </div>
          </label>
        </div>

        <div v-if="hiredProducerDetails.length === 0" class="no-producers">
          <p>暂无雇佣的制作人，先去雇佣制作人吧！</p>
        </div>

        <div class="cost-summary">
          <div class="cost-row">
            <span>基础制作费</span>
            <span>¥{{ baseCost.toLocaleString() }}</span>
          </div>
          <div v-if="selectedProducer" class="cost-row">
            <span>制作人费用</span>
            <span>¥{{ producerFee.toLocaleString() }}</span>
          </div>
          <div class="cost-row total">
            <span>总计</span>
            <span>¥{{ totalCost.toLocaleString() }}</span>
          </div>
        </div>

        <div class="quality-preview">
          <div class="preview-label">预计品质</div>
          <div class="quality-bar">
            <div
              class="quality-fill"
              :style="{ width: estimatedQuality + '%', background: qualityColor }"
            ></div>
          </div>
          <span class="quality-level" :style="{ color: qualityColor }">
            {{ qualityLevel.label }}
          </span>
        </div>

        <div class="stages-preview">
          <span>制作周期</span>
          <div class="stage-timeline">
            <span
              v-for="stage in stages"
              :key="stage.key"
              class="stage-chip"
            >
              {{ stage.label }} · {{ stage.days }}天
            </span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn secondary" @click="$emit('close')">取消</button>
        <button
          class="btn primary"
          :disabled="!canAfford"
          @click="onConfirm"
        >
          开始制作
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { GAME_CONFIG } from '../config/gameConfig'
import { getQualityLevel } from '../utils/gameLogic'

const props = defineProps({
  group: Object,
  hiredProducers: Array,
  money: Number,
  getSynergy: Function,
})

const emit = defineEmits(['close', 'confirm'])

const selectedProducer = ref(null)

const producerPool = GAME_CONFIG.producers.pool
const tierLabels = GAME_CONFIG.producers.tierLabels
const tierColors = GAME_CONFIG.producers.tierColors
const specialtyLabels = GAME_CONFIG.producers.specialtyLabels
const baseCost = GAME_CONFIG.single.creationCost
const stages = GAME_CONFIG.producers.stages

const hiredProducerDetails = computed(() => {
  return producerPool.filter((p) => props.hiredProducers.includes(p.id))
})

const selectedProducerObj = computed(() => {
  if (!selectedProducer.value) return null
  return producerPool.find((p) => p.id === selectedProducer.value)
})

const producerFee = computed(() => {
  if (!selectedProducerObj.value) return 0
  return Math.round(selectedProducerObj.value.cost * 0.5)
})

const totalCost = computed(() => {
  return baseCost + producerFee.value
})

const canAfford = computed(() => {
  return props.money >= totalCost.value
})

const estimatedQuality = computed(() => {
  const statAvg = Object.values(props.group.avgStats).reduce((s, v) => s + v, 0) / 5
  let quality = statAvg

  if (selectedProducerObj.value) {
    quality *= 1 + selectedProducerObj.value.qualityBonus
    if (selectedProducerObj.value.specialty !== 'all') {
      quality += props.group.avgStats[selectedProducerObj.value.specialty] * 0.15
    }
    const synergy = props.getSynergy(selectedProducerObj.value.id)
    quality *= 1 + synergy * GAME_CONFIG.producers.synergy.qualityPerPoint
  }

  return Math.min(100, Math.max(0, quality))
})

const qualityLevel = computed(() => {
  return getQualityLevel(estimatedQuality.value)
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

function onConfirm() {
  emit('confirm', selectedProducer.value)
}
</script>

<style scoped>
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
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
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

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-muted);
  padding: 0 0.5rem;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
}

.group-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-secondary);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.debut-day {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.section-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.producer-options {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.producer-option {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  border-left: 3px solid var(--text-muted);
  transition: all 0.2s;
}

.producer-option:hover {
  background: var(--bg-card);
}

.producer-option.selected {
  border-color: var(--accent);
  background: var(--bg-card);
}

.producer-option.internal {
  border-left-color: var(--text-muted);
}

.option-radio {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.producer-option.selected .option-radio {
  border-color: var(--accent);
}

.radio-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
}

.option-content {
  flex: 1;
  min-width: 0;
}

.option-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.2rem;
}

.tier-badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  color: white;
  font-weight: 500;
}

.cost {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.option-title {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}

.option-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.4rem;
}

.option-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.75rem;
}

.option-stats span {
  background: var(--bg-card);
  padding: 0.1rem 0.5rem;
  border-radius: 6px;
  color: var(--text-secondary);
}

.synergy-mini {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.4rem;
  font-size: 0.75rem;
}

.synergy-mini > span:first-child {
  color: var(--text-muted);
  width: 3rem;
}

.mini-bar {
  flex: 1;
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  overflow: hidden;
}

.mini-fill {
  height: 100%;
  border-radius: 2px;
}

.synergy-mini > span:last-child {
  width: 3rem;
  text-align: right;
  color: var(--text-secondary);
}

.no-producers {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.cost-summary {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.cost-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 0.25rem 0;
  color: var(--text-secondary);
}

.cost-row.total {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
  border-top: 1px solid var(--border-color);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}

.quality-preview {
  margin-bottom: 1rem;
}

.preview-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.4rem;
}

.quality-bar {
  height: 10px;
  background: var(--bg-secondary);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 0.3rem;
}

.quality-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s;
}

.quality-level {
  font-size: 0.85rem;
  font-weight: 600;
}

.stages-preview {
  margin-bottom: 0.5rem;
}

.stages-preview > span {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 0.4rem;
}

.stage-timeline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.stage-chip {
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
}
</style>
