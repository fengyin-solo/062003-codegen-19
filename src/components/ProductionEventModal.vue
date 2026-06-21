<template>
  <div class="modal-overlay">
    <div class="modal-content event-modal">
      <div class="event-header">
        <div class="event-icon">⚡</div>
        <div class="event-title">
          <div class="event-label">{{ event.label }}</div>
          <div class="event-stage">【{{ stageLabels[event.stageKey] }}】阶段</div>
        </div>
      </div>

      <div class="event-body">
        <p class="event-description">{{ event.description }}</p>

        <div class="involved-members">
          <span class="members-label">参与成员：</span>
          <span class="members-list">
            {{ event.assignedMembers.map((m) => m.name).join('、') }}
          </span>
        </div>

        <div class="current-quality">
          <span>当前品质：</span>
          <span class="quality-value">{{ currentQuality.toFixed(1) }}</span>
        </div>

        <div class="choices">
          <div
            v-for="(choice, index) in event.choices"
            :key="index"
            class="choice-card"
            @click="onSelect(index)"
          >
            <div class="choice-label">{{ choice.label }}</div>
            <div class="choice-effects">
              <span
                v-for="(effect, eKey) in getChoiceEffects(choice)"
                :key="eKey"
                class="effect-tag"
                :class="effect.class"
              >
                {{ effect.icon }} {{ effect.text }}
              </span>
            </div>
          </div>
        </div>

        <div class="event-hint">
          💡 提示：你的选择将直接影响最终品质和返工概率
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { GAME_CONFIG } from '../config/gameConfig'

const props = defineProps({
  event: Object,
  currentQuality: Number,
})

const emit = defineEmits(['select'])

const stageLabels = {}
GAME_CONFIG.producers.stages.forEach((s) => {
  stageLabels[s.key] = s.label
})

function getChoiceEffects(choice) {
  const effects = []

  if (choice.qualityEffect) {
    const [min, max] = choice.qualityEffect
    if (max > 0 && min >= 0) {
      effects.push({
        icon: '📈',
        text: `品质 +${Math.round(min * 100)}% ~ +${Math.round(max * 100)}%`,
        class: 'positive',
      })
    } else if (min < 0 && max <= 0) {
      effects.push({
        icon: '📉',
        text: `品质 ${Math.round(min * 100)}% ~ ${Math.round(max * 100)}%`,
        class: 'negative',
      })
    } else {
      effects.push({
        icon: '📊',
        text: `品质 ${Math.round(min * 100)}% ~ +${Math.round(max * 100)}%`,
        class: 'neutral',
      })
    }
  }

  if (choice.synergyEffect) {
    const [min, max] = choice.synergyEffect
    if (max > 0) {
      effects.push({
        icon: '🤝',
        text: `磨合度 ${min > 0 ? '+' : ''}${min} ~ +${max}`,
        class: min > 0 ? 'positive' : 'neutral',
      })
    } else {
      effects.push({
        icon: '💔',
        text: `磨合度 ${min} ~ ${max}`,
        class: 'negative',
      })
    }
  }

  if (choice.stressEffect) {
    const [min, max] = choice.stressEffect
    if (max > 0) {
      effects.push({
        icon: '😰',
        text: `压力 +${min} ~ +${max}`,
        class: 'negative',
      })
    } else {
      effects.push({
        icon: '😌',
        text: `压力 ${min} ~ ${max}`,
        class: 'positive',
      })
    }
  }

  if (choice.fatigueEffect) {
    const [min, max] = choice.fatigueEffect
    if (max > 0) {
      effects.push({
        icon: '😫',
        text: `疲劳 +${min} ~ +${max}`,
        class: 'negative',
      })
    }
  }

  if (choice.extraCost) {
    const [min, max] = choice.extraCost
    effects.push({
      icon: '💰',
      text: `¥${min.toLocaleString()} ~ ¥${max.toLocaleString()}`,
      class: 'negative',
    })
  }

  if (choice.extraDays) {
    effects.push({
      icon: '⏰',
      text: `延迟 ${choice.extraDays} 天`,
      class: 'neutral',
    })
  }

  if (choice.fansEffect) {
    const [min, max] = choice.fansEffect
    effects.push({
      icon: '❤️',
      text: `粉丝 +${min} ~ +${max}`,
      class: 'positive',
    })
  }

  return effects
}

function onSelect(index) {
  emit('select', index)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 150;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--bg-card);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.event-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
}

.event-icon {
  font-size: 2.5rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.event-title {
  flex: 1;
}

.event-label {
  font-size: 1.2rem;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 0.2rem;
}

.event-stage {
  font-size: 0.85rem;
  color: #b45309;
  font-weight: 500;
}

.event-body {
  padding: 1.25rem;
}

.event-description {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 3px solid var(--accent);
}

.involved-members {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.members-label {
  color: var(--text-muted);
}

.members-list {
  color: var(--text-primary);
  font-weight: 500;
}

.current-quality {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.quality-value {
  font-weight: 700;
  color: var(--accent);
  font-size: 1rem;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.choice-card {
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.choice-card:hover {
  background: var(--bg-card);
  border-color: var(--accent);
  transform: translateX(4px);
}

.choice-label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.4rem;
}

.choice-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.effect-tag {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  background: var(--bg-card);
}

.effect-tag.positive {
  background: #d1fae5;
  color: #065f46;
}

.effect-tag.negative {
  background: #fee2e2;
  color: #991b1b;
}

.effect-tag.neutral {
  background: #e0e7ff;
  color: #3730a3;
}

.event-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  font-style: italic;
}
</style>
