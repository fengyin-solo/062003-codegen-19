<template>
  <div class="modal-overlay">
    <div class="modal-content resource-modal">
      <div class="modal-header">
        <h3>📋 分配作曲资源</h3>
      </div>

      <div class="modal-body">
        <div class="stage-info">
          <div class="stage-badge">{{ currentStage.label }}</div>
          <div class="stage-desc">{{ currentStage.description }}</div>
          <div class="stage-requirements">
            <div class="req-item">
              <span class="req-label">需要成员</span>
              <span class="req-value">{{ currentStage.requiredMembers }} 人</span>
            </div>
            <div v-if="currentStage.primaryStat" class="req-item">
              <span class="req-label">核心属性</span>
              <span class="req-value primary">{{ statLabels[currentStage.primaryStat] }}</span>
            </div>
            <div v-if="currentStage.secondaryStat" class="req-item">
              <span class="req-label">次要属性</span>
              <span class="req-value secondary">{{ statLabels[currentStage.secondaryStat] }}</span>
            </div>
            <div class="req-item">
              <span class="req-label">已选择</span>
              <span class="req-value" :class="{ ok: selectedIds.length >= currentStage.requiredMembers }">
                {{ selectedIds.length }} / {{ currentStage.requiredMembers }}
              </span>
            </div>
          </div>
        </div>

        <div class="section-label">选择参与成员</div>

        <div class="members-list">
          <div
            v-for="member in availableMembers"
            :key="member.id"
            class="member-card"
            :class="{ selected: selectedIds.includes(member.id), disabled: isMemberDisabled(member) }"
            @click="toggleMember(member.id)"
          >
            <div class="member-avatar">
              {{ member.name.charAt(0) }}
            </div>
            <div class="member-info">
              <div class="member-name">
                {{ member.name }}
                <span v-if="member.fatigue > 70" class="fatigue-badge">😫</span>
                <span v-if="member.stress > 70" class="stress-badge">😰</span>
              </div>
              <div class="member-stats">
                <div class="stat-row" :class="{ highlight: currentStage.primaryStat === k }" v-for="(v, k) in displayStats(member)" :key="k">
                  <span class="stat-name">{{ statLabels[k] }}</span>
                  <div class="stat-bar">
                    <div class="stat-fill" :style="{ width: v + '%', background: statColor(v) }"></div>
                  </div>
                  <span class="stat-value">{{ Math.round(v) }}</span>
                </div>
              </div>
              <div class="match-score">
                匹配度：<span :style="{ color: matchColor(calcMatchScore(member)) }">{{ Math.round(calcMatchScore(member)) }}</span>
              </div>
            </div>
            <div v-if="selectedIds.includes(member.id)" class="selected-check">✓</div>
          </div>
        </div>

        <div v-if="selectedIds.length > 0" class="selection-summary">
          <div class="summary-title">预估效果</div>
          <div class="summary-content">
            <div class="summary-item">
              <span>平均匹配度</span>
              <strong :style="{ color: matchColor(avgMatchScore) }">{{ avgMatchScore.toFixed(1) }}</strong>
            </div>
            <div class="summary-item">
              <span>预计品质提升</span>
              <strong class="positive">+{{ estimatedQualityGain.toFixed(1) }}</strong>
            </div>
            <div class="summary-item">
              <span>疲劳增加</span>
              <strong class="negative">+5 / 人</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="btn primary"
          :disabled="selectedIds.length < currentStage.requiredMembers"
          @click="onConfirm"
        >
          确认分配
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { GAME_CONFIG } from '../config/gameConfig'

const props = defineProps({
  currentStage: Object,
  availableMembers: Array,
  currentQuality: Number,
})

const emit = defineEmits(['confirm'])

const selectedIds = ref([])

const statLabels = {
  vocal: '唱功',
  dance: '舞蹈',
  rap: '说唱',
  charm: '魅力',
  variety: '综艺',
}

function displayStats(member) {
  const stats = {}
  if (props.currentStage.primaryStat) {
    stats[props.currentStage.primaryStat] = member[props.currentStage.primaryStat]
  }
  if (props.currentStage.secondaryStat) {
    stats[props.currentStage.secondaryStat] = member[props.currentStage.secondaryStat]
  }
  const otherStats = ['vocal', 'dance', 'rap', 'charm', 'variety'].filter(
    (k) => k !== props.currentStage.primaryStat && k !== props.currentStage.secondaryStat
  )
  otherStats.forEach((k) => {
    stats[k] = member[k]
  })
  return stats
}

function calcMatchScore(member) {
  let score = 0
  if (props.currentStage.primaryStat) {
    score += member[props.currentStage.primaryStat] * 0.6
  }
  if (props.currentStage.secondaryStat) {
    score += member[props.currentStage.secondaryStat] * 0.3
  }
  const avg = (member.vocal + member.dance + member.rap + member.charm + member.variety) / 5
  score += avg * 0.1
  return score * props.currentStage.statWeight
}

function matchColor(score) {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#3b82f6'
  if (score >= 40) return '#f59e0b'
  return '#6b7280'
}

function statColor(value) {
  if (value >= 80) return '#10b981'
  if (value >= 60) return '#3b82f6'
  if (value >= 40) return '#f59e0b'
  return '#6b7280'
}

function isMemberDisabled(member) {
  if (selectedIds.includes(member.id)) return false
  if (member.fatigue > 90) return true
  return false
}

function toggleMember(memberId) {
  const member = props.availableMembers.find((m) => m.id === memberId)
  if (member && isMemberDisabled(member)) return

  const index = selectedIds.value.indexOf(memberId)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(memberId)
  }
}

const avgMatchScore = computed(() => {
  if (selectedIds.value.length === 0) return 0
  const scores = selectedIds.value.map((id) => {
    const member = props.availableMembers.find((m) => m.id === id)
    return member ? calcMatchScore(member) : 0
  })
  return scores.reduce((s, v) => s + v, 0) / scores.length
})

const estimatedQualityGain = computed(() => {
  if (selectedIds.value.length === 0) return 0
  const score = avgMatchScore.value * props.currentStage.statWeight * 0.008
  return score
})

function onConfirm() {
  if (selectedIds.value.length >= props.currentStage.requiredMembers) {
    emit('confirm', selectedIds.value)
  }
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
  max-width: 550px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
}

.modal-body {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
}

.stage-info {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.stage-badge {
  display: inline-block;
  background: var(--accent);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.stage-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.stage-requirements {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.req-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.req-label {
  color: var(--text-muted);
}

.req-value {
  font-weight: 500;
  color: var(--text-primary);
}

.req-value.primary {
  color: var(--accent);
}

.req-value.secondary {
  color: #3b82f6;
}

.req-value.ok {
  color: #10b981;
}

.section-label {
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.member-card {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  align-items: flex-start;
}

.member-card:hover:not(.disabled) {
  background: var(--bg-card);
}

.member-card.selected {
  border-color: var(--accent);
  background: var(--bg-card);
}

.member-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.member-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-weight: 600;
  margin-bottom: 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.fatigue-badge, .stress-badge {
  font-size: 0.85rem;
}

.member-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.35rem;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.6;
}

.stat-row.highlight {
  opacity: 1;
  font-weight: 500;
}

.stat-name {
  width: 2rem;
  flex-shrink: 0;
  color: var(--text-muted);
}

.stat-bar {
  flex: 1;
  height: 4px;
  background: var(--bg-card);
  border-radius: 2px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

.stat-value {
  width: 2rem;
  text-align: right;
  color: var(--text-secondary);
}

.match-score {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.match-score span {
  font-weight: 600;
}

.selected-check {
  color: var(--accent);
  font-size: 1.2rem;
  font-weight: bold;
}

.selection-summary {
  background: linear-gradient(135deg, var(--accent-light), var(--accent) 200%);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: white;
}

.summary-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.summary-content {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
}

.summary-item span {
  opacity: 0.9;
}

.summary-item strong {
  font-size: 1.1rem;
}

.positive {
  color: #bbf7d0;
}

.negative {
  color: #fecaca;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
}
</style>
