import { GAME_CONFIG } from '../config/gameConfig'
import { randInt, randFloat, pickRandom, weightedPick, clamp, pairKey } from './random'

const CFG = GAME_CONFIG

export function createInitialGameState() {
  const names = [...CFG.names].sort(() => Math.random() - 0.5)
  const trainees = []
  for (let i = 0; i < CFG.initial.traineeCount; i++) {
    trainees.push(createTrainee(names[i], i))
  }
  return {
    day: 1,
    money: CFG.initial.money,
    fans: CFG.initial.fans,
    totalRevenue: 0,
    totalExpenses: 0,
    trainees,
    groups: [],
    relationships: initRelationships(trainees),
    schedule: {},
    logs: [{ day: 1, text: '事务所成立！五位练习生已就位，三年征途正式开始。' }],
    pendingEvent: null,
    pendingRating: false,
    gameStatus: 'playing',
    lastSingleDay: {},
    hiredProducers: [],
    producerSynergy: {},
    activeProduction: null,
  }
}

function createTrainee(name, index) {
  const stats = {}
  for (const key of CFG.stats) {
    stats[key] = randInt(CFG.initial.statMin, CFG.initial.statMax)
  }
  return {
    id: `t${index}_${Date.now()}`,
    name,
    stats,
    fatigue: CFG.initial.fatigue + randInt(-5, 5),
    stress: CFG.initial.stress + randInt(-3, 3),
    status: 'trainee',
    groupId: null,
    illnessDays: 0,
    poachResist: randInt(40, 70),
    fans: 0,
    singlesReleased: 0,
  }
}

function initRelationships(trainees) {
  const rel = {}
  for (let i = 0; i < trainees.length; i++) {
    for (let j = i + 1; j < trainees.length; j++) {
      rel[pairKey(trainees[i].id, trainees[j].id)] = randInt(
        CFG.relationships.initialRange[0],
        CFG.relationships.initialRange[1]
      )
    }
  }
  return rel
}

export function calcTraineeScore(trainee) {
  const w = CFG.rating.scoreWeights
  let score = 0
  for (const key of CFG.stats) {
    score += trainee.stats[key] * w[key]
  }
  const fatiguePenalty = trainee.fatigue > CFG.thresholds.fatigueExhausted ? 0.85 : 1
  const stressPenalty = trainee.stress > CFG.thresholds.stressHigh ? 0.9 : 1
  return Math.round(score * fatiguePenalty * stressPenalty)
}

export function getRelationship(relationships, idA, idB) {
  return relationships[pairKey(idA, idB)] ?? 0
}

export function setRelationship(relationships, idA, idB, value) {
  relationships[pairKey(idA, idB)] = clamp(
    value,
    CFG.relationships.min,
    CFG.relationships.max
  )
}

export function getActiveTrainees(state) {
  return state.trainees.filter((t) => t.status !== 'left')
}

export function getDebutedTrainees(state) {
  return state.trainees.filter((t) => t.status === 'debuted')
}

export function calcProfit(state) {
  return state.totalRevenue - state.totalExpenses
}

export function checkVictory(state) {
  const profit = calcProfit(state)
  const groups = state.groups.length
  const goalsMet =
    groups >= CFG.victory.targetGroups &&
    (!CFG.victory.requirePositiveProfit || profit > 0)

  if (goalsMet) return 'won'

  if (state.day > CFG.victory.totalDays) {
    if (groups < CFG.victory.targetGroups) return 'lost_groups'
    if (CFG.victory.requirePositiveProfit && profit <= 0) return 'lost_profit'
  }
  if (state.money < -20000) return 'lost_bankrupt'
  const active = getActiveTrainees(state)
  if (active.length === 0 && state.groups.length === 0) return 'lost_empty'
  return null
}

function applyRange(val, range, mult = 1) {
  if (!range || range.length < 2) return val
  return val + randInt(Math.round(range[0] * mult), Math.round(range[1] * mult))
}

function getTrainingMultiplier(trainee, partners, relationships) {
  let mult = 1
  if (trainee.fatigue >= CFG.thresholds.fatigueExhausted) mult *= 0.5
  if (trainee.stress >= CFG.thresholds.stressHigh) mult *= 0.8
  if (trainee.stress >= CFG.thresholds.stressBreakdown) mult *= 0

  let synergyCount = 0
  for (const p of partners) {
    const rel = getRelationship(relationships, trainee.id, p.id)
    if (rel >= CFG.relationships.synergyThreshold) synergyCount++
  }
  if (synergyCount > 0) {
    mult *= 1 + CFG.relationships.synergyBonus * Math.min(synergyCount, 2)
  }
  return mult
}

export function processDay(state) {
  const logs = []
  let money = state.money
  let fans = state.fans
  let totalExpenses = state.totalExpenses
  const relationships = { ...state.relationships }
  const trainees = state.trainees.map((t) => ({ ...t, stats: { ...t.stats } }))
  const schedule = state.schedule

  const activityGroups = {}
  for (const [traineeId, activity] of Object.entries(schedule)) {
    if (!activityGroups[activity]) activityGroups[activity] = []
    activityGroups[activity].push(traineeId)
  }

  for (const trainee of trainees) {
    if (trainee.status === 'left') continue

    if (trainee.illnessDays > 0) {
      trainee.illnessDays--
      trainee.fatigue = clamp(trainee.fatigue - 5, 0, 100)
      logs.push({ day: state.day, text: `${trainee.name} 仍在休养中（剩余 ${trainee.illnessDays} 天）。` })
      continue
    }

    if (trainee.fatigue >= CFG.thresholds.fatigueCollapse) {
      trainee.fatigue = applyRange(trainee.fatigue, CFG.activities.rest.fatigue)
      trainee.stress = applyRange(trainee.stress, CFG.activities.rest.stress)
      logs.push({ day: state.day, text: `${trainee.name} 过度疲劳，被迫休息。` })
      continue
    }

    const activityKey = schedule[trainee.id]
    if (!activityKey) {
      logs.push({ day: state.day, text: `${trainee.name} 今日未安排日程。` })
      continue
    }

    const activity = CFG.activities[activityKey]
    if (!activity) continue

    money -= activity.moneyCost
    totalExpenses += activity.moneyCost

    const partners = (activityGroups[activityKey] || [])
      .filter((id) => id !== trainee.id)
      .map((id) => trainees.find((t) => t.id === id))
      .filter(Boolean)

    const mult = getTrainingMultiplier(trainee, partners, relationships)

    if (activity.requiresTraining && trainee.stress >= CFG.thresholds.stressBreakdown) {
      logs.push({ day: state.day, text: `${trainee.name} 压力过大，无法集中精力训练。` })
      trainee.stress = clamp(trainee.stress + randInt(2, 5), 0, 100)
      continue
    }

    for (const [stat, range] of Object.entries(activity.statGain || {})) {
      const gain = randInt(range[0], range[1])
      trainee.stats[stat] = clamp(
        trainee.stats[stat] + Math.round(gain * mult),
        0,
        CFG.thresholds.statCap
      )
    }

    trainee.fatigue = clamp(applyRange(trainee.fatigue, activity.fatigue), 0, 100)
    trainee.stress = clamp(applyRange(trainee.stress, activity.stress), 0, 100)

    if (activity.fansGain) {
      const gained = randInt(activity.fansGain[0], activity.fansGain[1])
      fans += gained
      trainee.fans += Math.round(gained * 0.3)
      logs.push({ day: state.day, text: `${trainee.name} 参与公关，粉丝 +${gained}。` })
    }

    for (const p of partners) {
      const cur = getRelationship(relationships, trainee.id, p.id)
      setRelationship(
        relationships,
        trainee.id,
        p.id,
        cur + randInt(CFG.relationships.trainingTogether[0], CFG.relationships.trainingTogether[1])
      )
    }
  }

  for (let i = 0; i < trainees.length; i++) {
    for (let j = i + 1; j < trainees.length; j++) {
      const a = trainees[i]
      const b = trainees[j]
      if (a.status === 'left' || b.status === 'left') continue

      const key = pairKey(a.id, b.id)
      let rel = relationships[key] ?? 0
      rel += randInt(CFG.relationships.dailyDrift[0], CFG.relationships.dailyDrift[1])
      rel = clamp(rel, CFG.relationships.min, CFG.relationships.max)

      const maxStat = (t) => Math.max(...CFG.stats.map((s) => t.stats[s]))
      const gap = Math.abs(maxStat(a) - maxStat(b))
      if (gap >= CFG.relationships.statGapCompetition) {
        rel -= randInt(2, 6)
        const weaker = maxStat(a) < maxStat(b) ? a : b
        weaker.stress = clamp(
          weaker.stress + randInt(CFG.relationships.competitionStress[0], CFG.relationships.competitionStress[1]),
          0,
          100
        )
        if (rel <= CFG.relationships.competitionThreshold) {
          logs.push({
            day: state.day,
            text: `${weaker.name} 感受到来自 ${weaker === a ? b.name : a.name} 的竞争压力！`,
          })
        }
      }

      relationships[key] = rel
    }
  }

  const dailyCost =
    CFG.dailyCosts.baseOperatingCost +
    trainees.filter((t) => t.status === 'trainee').length * CFG.dailyCosts.perTraineeCost +
    trainees.filter((t) => t.status === 'debuted').length * CFG.dailyCosts.perDebutedCost +
    state.groups.length * CFG.dailyCosts.perGroupCost

  money -= dailyCost
  totalExpenses += dailyCost

  const newDay = state.day + 1
  const pendingRating = state.day % CFG.rating.interval === 0

  let pendingEvent = null
  if (Math.random() < CFG.events.dailyChance) {
    pendingEvent = generateRandomEvent(trainees, state.day)
    if (pendingEvent.type === 'fan_surge') {
      fans += pendingEvent.fansGain
      logs.push({ day: state.day, text: `【${pendingEvent.label}】粉丝 +${pendingEvent.fansGain}！` })
      pendingEvent = null
    } else if (pendingEvent.type === 'inspiration') {
      const target = pendingEvent.target
      const stat = pickRandom(CFG.stats)
      target.stats[stat] = clamp(target.stats[stat] + pendingEvent.statBoost, 0, CFG.thresholds.statCap)
      logs.push({
        day: state.day,
        text: `【${pendingEvent.label}】${target.name} 的${CFG.statLabels[stat]} +${pendingEvent.statBoost}！`,
      })
      pendingEvent = null
    } else if (pendingEvent.type === 'negative_news') {
      fans = Math.max(0, fans - pendingEvent.fansLoss)
      for (const t of trainees) {
        if (t.status !== 'left') {
          t.stress = clamp(t.stress + pendingEvent.stressGain, 0, 100)
        }
      }
      logs.push({
        day: state.day,
        text: `【${pendingEvent.label}】粉丝 -${pendingEvent.fansLoss}，全员压力上升。`,
      })
      pendingEvent = null
    } else if (pendingEvent.type === 'illness') {
      pendingEvent.target.illnessDays = pendingEvent.duration
      pendingEvent.target.stress = clamp(
        pendingEvent.target.stress + pendingEvent.stressGain,
        0,
        100
      )
      logs.push({
        day: state.day,
        text: `【${pendingEvent.label}】${pendingEvent.target.name} 需要休养 ${pendingEvent.duration} 天。`,
      })
      pendingEvent = null
    }
  }

  let nextState = {
    ...state,
    day: newDay,
    money,
    fans,
    totalExpenses,
    trainees,
    relationships,
    schedule: {},
    logs: [...state.logs, ...logs],
    pendingEvent,
    pendingRating,
  }

  nextState = processProductionDay(nextState)

  const result = checkVictory(nextState)
  if (result) nextState.gameStatus = result

  return nextState
}

function generateRandomEvent(trainees, day) {
  const active = trainees.filter((t) => t.status !== 'left' && t.illnessDays === 0)
  if (active.length === 0) return null

  const types = Object.entries(CFG.events.types).map(([key, val]) => ({
    key,
    ...val,
  }))
  const picked = weightedPick(types)
  const target = pickRandom(active)

  const event = {
    type: picked.key,
    label: picked.label,
    description: picked.description,
    day,
    target,
    resolved: false,
  }

  switch (picked.key) {
    case 'poaching':
      event.successChance = picked.successChance
      break
    case 'illness':
      event.duration = randInt(picked.duration[0], picked.duration[1])
      event.stressGain = randInt(picked.stressGain[0], picked.stressGain[1])
      break
    case 'inspiration':
      event.statBoost = randInt(picked.statBoost[0], picked.statBoost[1])
      break
    case 'negative_news':
      event.fansLoss = randInt(picked.fansLoss[0], picked.fansLoss[1])
      event.stressGain = randInt(picked.stressGain[0], picked.stressGain[1])
      break
    case 'fan_surge':
      event.fansGain = randInt(picked.fansGain[0], picked.fansGain[1])
      break
  }

  return event
}

export function resolvePoachingEvent(state, keepTrainee) {
  const event = state.pendingEvent
  if (!event || event.type !== 'poaching') return state

  const logs = [...state.logs]
  const trainees = state.trainees.map((t) => ({ ...t, stats: { ...t.stats } }))
  const target = trainees.find((t) => t.id === event.target.id)

  if (keepTrainee) {
    const cost = randInt(8000, 15000)
    logs.push({
      day: state.day,
      text: `【挖角危机】你花费 ¥${cost} 成功挽留 ${target.name}！`,
    })
    target.stress = clamp(target.stress + randInt(5, 12), 0, 100)
    return {
      ...state,
      money: state.money - cost,
      totalExpenses: state.totalExpenses + cost,
      trainees,
      logs,
      pendingEvent: null,
    }
  }

  const roll = Math.random()
  const resist = target.poachResist / 100
  if (roll > event.successChance * (1 - resist * 0.5)) {
    logs.push({ day: state.day, text: `【挖角危机】${target.name} 决定留在事务所。` })
    return { ...state, trainees, logs, pendingEvent: null }
  }

  target.status = 'left'
  logs.push({ day: state.day, text: `【挖角危机】${target.name} 被竞争对手挖走，离开了事务所！` })
  const result = checkVictory({ ...state, trainees })
  return {
    ...state,
    trainees,
    logs,
    pendingEvent: null,
    gameStatus: result || state.gameStatus,
  }
}

export function debutGroup(state, memberIds, groupName) {
  const members = state.trainees.filter((t) => memberIds.includes(t.id))
  if (members.length < CFG.rating.minGroupSize || members.length > CFG.rating.maxGroupSize) {
    return { success: false, message: `出道人数需在 ${CFG.rating.minGroupSize}-${CFG.rating.maxGroupSize} 人之间` }
  }

  for (const m of members) {
    if (m.status !== 'trainee') return { success: false, message: `${m.name} 无法出道` }
    if (calcTraineeScore(m) < CFG.rating.debutScoreThreshold) {
      return { success: false, message: `${m.name} 综合评分未达标（需 ≥${CFG.rating.debutScoreThreshold}）` }
    }
  }

  const groupId = `g_${Date.now()}`
  const trainees = state.trainees.map((t) => {
    if (memberIds.includes(t.id)) {
      return { ...t, status: 'debuted', groupId }
    }
    return t
  })

  const avgStats = {}
  for (const key of CFG.stats) {
    avgStats[key] = Math.round(members.reduce((s, m) => s + m.stats[key], 0) / members.length)
  }

  const groups = [
    ...state.groups,
    {
      id: groupId,
      name: groupName || `${members.map((m) => m.name[0]).join('')}组`,
      memberIds: [...memberIds],
      debutedDay: state.day,
      avgStats,
      totalSales: 0,
      singles: [],
    },
  ]

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `🎉 组合「${groupName || groups[groups.length - 1].name}」正式出道！成员：${members.map((m) => m.name).join('、')}`,
    },
  ]

  return {
    success: true,
    state: { ...state, trainees, groups, logs, pendingRating: false },
  }
}

export function releaseSingle(state, groupId) {
  const group = state.groups.find((g) => g.id === groupId)
  if (!group) return { success: false, message: '组合不存在' }

  const lastDay = state.lastSingleDay[groupId] || 0
  if (state.day - lastDay < CFG.single.cooldownDays) {
    return {
      success: false,
      message: `距上次发歌还需 ${CFG.single.cooldownDays - (state.day - lastDay)} 天`,
    }
  }

  if (state.money < CFG.single.creationCost) {
    return { success: false, message: '资金不足' }
  }

  const members = state.trainees.filter((t) => group.memberIds.includes(t.id))
  const statAvg =
    CFG.stats.reduce((s, k) => s + group.avgStats[k], 0) / CFG.stats.length
  const charmAvg = group.avgStats.charm
  const popularity = state.fans + members.reduce((s, m) => s + m.fans, 0)

  const sales = Math.round(
    CFG.single.baseSales +
      statAvg * CFG.single.statWeight * 50 +
      popularity * CFG.single.fansWeight * 0.08 +
      charmAvg * CFG.single.charmWeight * 30 +
      randInt(-200, 400)
  )

  const revenue = sales * CFG.single.revenuePerSale
  const groups = state.groups.map((g) => {
    if (g.id !== groupId) return g
    return {
      ...g,
      totalSales: g.totalSales + sales,
      singles: [
        ...g.singles,
        { day: state.day, sales, revenue, title: `单曲 Vol.${g.singles.length + 1}` },
      ],
    }
  })

  const trainees = state.trainees.map((t) => {
    if (!group.memberIds.includes(t.id)) return t
    return { ...t, singlesReleased: t.singlesReleased + 1, fans: t.fans + Math.round(sales * 0.05) }
  })

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `💿 ${group.name} 发行新单曲，销量 ${sales.toLocaleString()}，收入 ¥${revenue.toLocaleString()}！`,
    },
  ]

  return {
    success: true,
    state: {
      ...state,
      money: state.money - CFG.single.creationCost + revenue,
      totalRevenue: state.totalRevenue + revenue,
      totalExpenses: state.totalExpenses + CFG.single.creationCost,
      fans: state.fans + Math.round(sales * 0.02),
      groups,
      trainees,
      logs,
      lastSingleDay: { ...state.lastSingleDay, [groupId]: state.day },
    },
    sales,
    revenue,
  }
}

export function getRatingResults(state) {
  return getActiveTrainees(state)
    .filter((t) => t.status === 'trainee')
    .map((t) => ({
      ...t,
      score: calcTraineeScore(t),
      canDebut: calcTraineeScore(t) >= CFG.rating.debutScoreThreshold,
    }))
    .sort((a, b) => b.score - a.score)
}

export function hireProducer(state, producerId) {
  const producer = CFG.producers.pool.find((p) => p.id === producerId)
  if (!producer) return { success: false, message: '制作人不存在' }

  if (state.hiredProducers.includes(producerId)) {
    return { success: false, message: '已雇佣该制作人' }
  }

  if (state.money < producer.cost) {
    return { success: false, message: '资金不足' }
  }

  const newState = {
    ...state,
    money: state.money - producer.cost,
    totalExpenses: state.totalExpenses + producer.cost,
    hiredProducers: [...state.hiredProducers, producerId],
    logs: [
      ...state.logs,
      {
        day: state.day,
        text: `🎵 成功雇佣制作人「${producer.name}」，花费 ¥${producer.cost.toLocaleString()}。`,
      },
    ],
  }

  return { success: true, state: newState }
}

export function getProducer(producerId) {
  return CFG.producers.pool.find((p) => p.id === producerId) || null
}

export function getProducerSynergy(state, producerId) {
  return state.producerSynergy[producerId] || 0
}

function calcBaseQuality(group, producer) {
  const statAvg = CFG.stats.reduce((s, k) => s + group.avgStats[k], 0) / CFG.stats.length
  let baseQuality = statAvg

  if (producer) {
    baseQuality *= 1 + producer.qualityBonus
    if (producer.specialty !== 'all' && group.avgStats[producer.specialty]) {
      baseQuality += group.avgStats[producer.specialty] * 0.15
    }
  }

  return clamp(baseQuality, 0, 100)
}

export function getQualityLevel(quality) {
  const levels = CFG.producers.qualityLevels
  if (quality >= levels.S.min) return { key: 'S', ...levels.S }
  if (quality >= levels.A.min) return { key: 'A', ...levels.A }
  if (quality >= levels.B.min) return { key: 'B', ...levels.B }
  if (quality >= levels.C.min) return { key: 'C', ...levels.C }
  return { key: 'D', ...levels.D }
}

export function startProduction(state, groupId, producerId) {
  const group = state.groups.find((g) => g.id === groupId)
  if (!group) return { success: false, message: '组合不存在' }

  const lastDay = state.lastSingleDay[groupId] || 0
  if (state.day - lastDay < CFG.single.cooldownDays) {
    return {
      success: false,
      message: `距上次发歌还需 ${CFG.single.cooldownDays - (state.day - lastDay)} 天`,
    }
  }

  if (state.activeProduction) {
    return { success: false, message: '当前已有单曲正在制作中' }
  }

  let producer = null
  let baseCost = CFG.single.creationCost

  if (producerId) {
    if (!state.hiredProducers.includes(producerId)) {
      return { success: false, message: '未雇佣该制作人' }
    }
    producer = getProducer(producerId)
    baseCost += producer.cost * 0.5
  }

  if (state.money < baseCost) {
    return { success: false, message: '制作资金不足' }
  }

  const stages = CFG.producers.stages.map((s) => ({
    ...s,
    daysLeft: s.days,
    completed: false,
    assignedMembers: [],
    qualityContribution: 0,
    eventResults: [],
  }))

  const baseQuality = calcBaseQuality(group, producer)
  const synergy = getProducerSynergy(state, producerId)
  const synergyBonus = synergy * CFG.producers.synergy.qualityPerPoint

  const production = {
    id: `prod_${Date.now()}`,
    groupId,
    producerId: producerId || null,
    producerName: producer?.name || '内部制作',
    stages,
    currentStageIndex: 0,
    baseQuality: clamp(baseQuality * (1 + synergyBonus), 0, 100),
    currentQuality: clamp(baseQuality * (1 + synergyBonus), 0, 100),
    finalQuality: 0,
    reworkCount: 0,
    totalCost: baseCost,
    startDay: state.day,
    status: 'assigning_resources',
    reworkPending: false,
    pendingEvent: null,
    eventHistory: [],
    decisionScore: 0,
    totalDays: 0,
  }

  const members = state.trainees.filter((t) => group.memberIds.includes(t.id))
  const firstStage = stages[0]

  const newState = {
    ...state,
    money: state.money - baseCost,
    totalExpenses: state.totalExpenses + baseCost,
    activeProduction: production,
    logs: [
      ...state.logs,
      {
        day: state.day,
        text: `🎼 ${group.name} 开始制作新单曲${producer ? `，制作人：${producer.name}` : ''}。`,
      },
      {
        day: state.day,
        text: `📋 【${firstStage.label}】阶段需要 ${firstStage.requiredMembers} 名成员参与，请分配作曲资源。`,
      },
    ],
  }

  return { success: true, state: newState, members, stage: firstStage }
}

export function assignStageResources(state, memberIds) {
  if (!state.activeProduction || state.activeProduction.status !== 'assigning_resources') {
    return { success: false, message: '当前不需要分配资源' }
  }

  const production = { ...state.activeProduction }
  const stages = production.stages.map((s) => ({ ...s }))
  const currentStage = stages[production.currentStageIndex]

  if (memberIds.length < currentStage.requiredMembers) {
    return {
      success: false,
      message: `需要至少 ${currentStage.requiredMembers} 名成员参与`,
    }
  }

  const group = state.groups.find((g) => g.id === production.groupId)
  const assignedMembers = state.trainees.filter((t) => memberIds.includes(t.id))

  let qualityBonus = 0
  const matchDetails = []

  for (const member of assignedMembers) {
    let memberScore = 0

    if (currentStage.primaryStat) {
      memberScore += member[currentStage.primaryStat] * 0.6
    }
    if (currentStage.secondaryStat) {
      memberScore += member[currentStage.secondaryStat] * 0.3
    }
    memberScore += (member.vocal + member.dance + member.rap + member.charm + member.variety) / 5 * 0.1

    const matchBonus = memberScore * currentStage.statWeight * 0.008
    qualityBonus += matchBonus

    matchDetails.push({
      name: member.name,
      score: Math.round(memberScore),
      contribution: Math.round(matchBonus * 100) / 100,
    })
  }

  qualityBonus = qualityBonus / Math.max(1, memberIds.length)

  currentStage.assignedMembers = memberIds
  currentStage.qualityContribution = qualityBonus
  production.currentQuality = clamp(production.currentQuality + qualityBonus, 0, 100)
  production.status = 'in_progress'
  production.stages = stages

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `👥 已分配成员参与【${currentStage.label}】：${assignedMembers.map((m) => m.name).join('、')}`,
    },
    {
      day: state.day,
      text: `📈 成员属性匹配贡献品质 +${(qualityBonus).toFixed(1)}，当前品质：${production.currentQuality.toFixed(1)}`,
    },
  ]

  const trainees = state.trainees.map((t) => {
    if (!memberIds.includes(t.id)) return t
    return { ...t, fatigue: clamp((t.fatigue || 0) + 5, 0, 100) }
  })

  return {
    success: true,
    state: {
      ...state,
      activeProduction: production,
      logs,
      trainees,
    },
    qualityGain: qualityBonus,
  }
}

export function triggerProductionEvent(state) {
  if (!state.activeProduction || state.activeProduction.status !== 'in_progress') {
    return null
  }

  if (state.activeProduction.pendingEvent) {
    return null
  }

  if (Math.random() > CFG.producers.productionEvents.dailyChance) {
    return null
  }

  const production = state.activeProduction
  const currentStage = production.stages[production.currentStageIndex]
  const stageKey = currentStage.key

  const availableEvents = CFG.producers.productionEvents.types.filter(
    (e) => e.stage.includes(stageKey)
  )

  if (availableEvents.length === 0) return null

  const event = availableEvents[Math.floor(Math.random() * availableEvents.length)]

  const assignedMembers = currentStage.assignedMembers
    .map((id) => state.trainees.find((t) => t.id === id))
    .filter(Boolean)

  const eventInstance = {
    ...event,
    triggeredDay: state.day,
    stageKey,
    assignedMembers: assignedMembers.map((m) => ({ id: m.id, name: m.name })),
  }

  return {
    event: eventInstance,
    members: assignedMembers,
  }
}

export function resolveProductionEvent(state, choiceIndex) {
  if (!state.activeProduction || !state.activeProduction.pendingEvent) {
    return { success: false, message: '没有待处理的制作事件' }
  }

  const production = { ...state.activeProduction }
  const event = production.pendingEvent
  const choice = event.choices[choiceIndex]

  if (!choice) {
    return { success: false, message: '无效的选择' }
  }

  const qualityEffect = randFloat(choice.qualityEffect[0], choice.qualityEffect[1])
  const synergyEffect = randInt(choice.synergyEffect[0], choice.synergyEffect[1])
  const stressEffect = randInt(choice.stressEffect[0], choice.stressEffect[1])
  const fatigueEffect = choice.fatigueEffect ? randInt(choice.fatigueEffect[0], choice.fatigueEffect[1]) : 0
  const fansEffect = choice.fansEffect ? randInt(choice.fansEffect[0], choice.fansEffect[1]) : 0
  const extraCost = choice.extraCost ? randInt(choice.extraCost[0], choice.extraCost[1]) : 0
  const extraDays = choice.extraDays || 0

  production.currentQuality = clamp(production.currentQuality * (1 + qualityEffect), 0, 100)
  production.decisionScore += qualityEffect > 0 ? 1 : qualityEffect < 0 ? -1 : 0

  let producerSynergy = { ...state.producerSynergy }
  if (production.producerId) {
    const current = producerSynergy[production.producerId] || 0
    producerSynergy[production.producerId] = clamp(current + synergyEffect, 0, CFG.producers.synergy.max)
  }

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `⚡ 【${event.label}】${choice.resultText}`,
    },
  ]

  const qualityText = qualityEffect > 0 ? `品质 +${Math.round(qualityEffect * 100)}%` :
                      qualityEffect < 0 ? `品质 ${Math.round(qualityEffect * 100)}%` : '品质不变'
  logs.push({
    day: state.day,
    text: `📊 结果：${qualityText}，当前品质：${production.currentQuality.toFixed(1)}`,
  })

  if (synergyEffect !== 0) {
    logs.push({
      day: state.day,
      text: `🤝 与制作人磨合度 ${synergyEffect > 0 ? '+' : ''}${synergyEffect}`,
    })
  }

  const currentStage = production.stages[production.currentStageIndex]
  const eventAssignedIds = event.assignedMembers.map((m) => m.id)

  const trainees = state.trainees.map((t) => {
    if (!eventAssignedIds.includes(t.id)) return t
    return {
      ...t,
      stress: clamp((t.stress || 0) + stressEffect, 0, 100),
      fatigue: clamp((t.fatigue || 0) + fatigueEffect, 0, 100),
      fans: (t.fans || 0) + (fansEffect > 0 ? Math.round(fansEffect / eventAssignedIds.length) : 0),
    }
  })

  production.eventHistory.push({
    eventId: event.id,
    choiceIndex,
    qualityEffect,
    synergyEffect,
    stressEffect,
    fatigueEffect,
    fansEffect,
    day: state.day,
    stageKey: event.stageKey,
  })

  if (extraDays > 0) {
    currentStage.daysLeft += extraDays
    logs.push({
      day: state.day,
      text: `⏰ 制作进度延迟 ${extraDays} 天`,
    })
  }

  production.pendingEvent = null
  production.totalCost += extraCost
  production.stages = production.stages.map((s, i) =>
    i === production.currentStageIndex ? currentStage : s
  )

  let newState = {
    ...state,
    activeProduction: production,
    logs,
    trainees,
    producerSynergy,
    money: state.money - extraCost,
    totalExpenses: state.totalExpenses + extraCost,
    fans: state.fans + fansEffect,
  }

  if (extraDays > 0) {
    newState.activeProduction = { ...production }
  }

  return {
    success: true,
    state: newState,
    effects: {
      qualityEffect,
      synergyEffect,
      stressEffect,
      fatigueEffect,
      fansEffect,
      extraCost,
      extraDays,
    },
  }
}

export function processProductionDay(state) {
  if (!state.activeProduction) {
    return state
  }

  if (state.activeProduction.status !== 'in_progress') {
    return state
  }

  if (state.activeProduction.pendingEvent) {
    return state
  }

  const production = { ...state.activeProduction }
  const stages = production.stages.map((s) => ({ ...s }))
  const logs = [...state.logs]

  if (production.reworkPending) {
    return { ...state, logs }
  }

  production.totalDays += 1

  const currentStage = stages[production.currentStageIndex]
  if (currentStage && !currentStage.completed) {
    currentStage.daysLeft -= 1

    if (currentStage.daysLeft <= 0) {
      currentStage.completed = true
      logs.push({
        day: state.day,
        text: `🎹 单曲制作「${currentStage.label}」阶段完成。`,
      })

      const avgContribution = stages.slice(0, production.currentStageIndex + 1)
        .reduce((s, st) => s + st.qualityContribution, 0) / (production.currentStageIndex + 1)
      logs.push({
        day: state.day,
        text: `✨ 阶段品质贡献：${currentStage.qualityContribution.toFixed(1)}，累计平均：${avgContribution.toFixed(1)}`,
      })

      production.currentStageIndex += 1

      if (production.currentStageIndex < stages.length) {
        const nextStage = stages[production.currentStageIndex]
        if (nextStage.requiredMembers > 0) {
          production.status = 'assigning_resources'
          logs.push({
            day: state.day,
            text: `📋 【${nextStage.label}】阶段需要 ${nextStage.requiredMembers} 名成员参与，请分配作曲资源。`,
          })
        }
      }
    } else {
      const dailyDecay = 0.001
      const assignedCount = currentStage.assignedMembers?.length || 0
      if (assignedCount > 0) {
        const dailyGain = (currentStage.qualityContribution / currentStage.days) * (1 - dailyDecay * currentStage.daysLeft)
        production.currentQuality = clamp(production.currentQuality + dailyGain * 0.2, 0, 100)
      }
    }
  }

  const allStagesDone = stages.every((s) => s.completed)

  if (allStagesDone && !production.reworkPending) {
    const producer = production.producerId ? getProducer(production.producerId) : null

    let reworkChance = CFG.producers.rework.baseThreshold

    const goodDecisions = production.eventHistory.filter((e) => e.qualityEffect > 0.02).length
    const badDecisions = production.eventHistory.filter((e) => e.qualityEffect < -0.02).length
    reworkChance += (badDecisions - goodDecisions) * 0.1

    reworkChance -= production.decisionScore * 0.05

    if (producer) {
      reworkChance += producer.reworkRisk * 0.5
    }

    const avgQualityContribution = stages.reduce((s, st) => s + st.qualityContribution, 0) / stages.length
    reworkChance -= avgQualityContribution * 0.005

    reworkChance = clamp(reworkChance, 0.05, 0.7)

    if (Math.random() < reworkChance && production.reworkCount < 2) {
      production.reworkPending = true
      production.reworkCount += 1

      const qualityGap = 80 - production.currentQuality
      const potentialGain = Math.max(5, qualityGap * 0.3)

      logs.push({
        day: state.day,
        text: `⚠️ 单曲制作完成，但制作人不满意，需要返工！`,
      })
      logs.push({
        day: state.day,
        text: `💡 当前品质：${production.currentQuality.toFixed(1)}，返工有望提升约 ${potentialGain.toFixed(1)} 点品质。`,
      })
      logs.push({
        day: state.day,
        text: `📊 决策评价：${goodDecisions}次优 / ${badDecisions}次劣 / ${production.eventHistory.length - goodDecisions - badDecisions}次中性`,
      })
    } else {
      production.finalQuality = production.currentQuality
      return finalizeProduction({ ...state, activeProduction: production, logs })
    }
  }

  production.stages = stages

  let newState = {
    ...state,
    activeProduction: production,
    logs,
  }

  if (production.status === 'in_progress' && !production.pendingEvent) {
    const eventResult = triggerProductionEvent(newState)
    if (eventResult) {
      newState = {
        ...newState,
        activeProduction: {
          ...newState.activeProduction,
          pendingEvent: eventResult.event,
        },
      }
    }
  }

  return newState
}

export function confirmRework(state) {
  if (!state.activeProduction || !state.activeProduction.reworkPending) {
    return { success: false, message: '没有待处理的返工' }
  }

  const production = { ...state.activeProduction }
  const reworkCost = Math.round(production.totalCost * CFG.producers.rework.extraCostPercent)

  if (state.money < reworkCost) {
    return { success: false, message: '返工资金不足' }
  }

  const stages = CFG.producers.stages.map((s) => ({
    ...s,
    daysLeft: Math.ceil(s.days * 0.5),
    completed: false,
    assignedMembers: [],
    qualityContribution: 0,
    eventResults: [],
  }))

  const qualityGain = randFloat(CFG.producers.rework.qualityGain[0], CFG.producers.rework.qualityGain[1])

  production.stages = stages
  production.currentStageIndex = 0
  production.reworkPending = false
  production.currentQuality = clamp(production.currentQuality * (1 + qualityGain), 0, 100)
  production.baseQuality = production.currentQuality
  production.totalCost += reworkCost
  production.status = 'assigning_resources'

  const firstStage = stages[0]
  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `🔧 开始返工，追加投入 ¥${reworkCost.toLocaleString()}，基础品质提升至 ${production.currentQuality.toFixed(1)}。`,
    },
  ]

  if (firstStage.requiredMembers > 0) {
    logs.push({
      day: state.day,
      text: `📋 返工【${firstStage.label}】阶段需要 ${firstStage.requiredMembers} 名成员参与，请重新分配作曲资源。`,
    })
  }

  return {
    success: true,
    state: {
      ...state,
      money: state.money - reworkCost,
      totalExpenses: state.totalExpenses + reworkCost,
      activeProduction: production,
      logs,
    },
  }
}

export function skipRework(state) {
  if (!state.activeProduction || !state.activeProduction.reworkPending) {
    return { success: false, message: '没有待处理的返工' }
  }

  const production = { ...state.activeProduction }
  production.reworkPending = false
  production.finalQuality = production.currentQuality

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `📤 你选择跳过返工，直接发行当前版本。`,
    },
  ]

  return finalizeProduction({
    ...state,
    activeProduction: production,
    logs,
  })
}

function finalizeProduction(state) {
  const production = state.activeProduction
  const group = state.groups.find((g) => g.id === production.groupId)
  if (!group) return state

  const quality = production.finalQuality || production.currentQuality
  const qualityLevel = getQualityLevel(quality)

  const members = state.trainees.filter((t) => group.memberIds.includes(t.id))
  const popularity = state.fans + members.reduce((s, m) => s + m.fans, 0)

  const baseSales =
    CFG.single.baseSales +
    quality * CFG.single.statWeight * 30 +
    popularity * CFG.single.fansWeight * 0.08 +
    group.avgStats.charm * CFG.single.charmWeight * 20

  const sales = Math.round(baseSales * qualityLevel.salesMult + randInt(-150, 300))
  const revenue = sales * CFG.single.revenuePerSale
  const fansGain = Math.round(sales * 0.02 * qualityLevel.fansMult)

  const goodDecisions = production.eventHistory?.filter((e) => e.qualityEffect > 0.02).length || 0
  const badDecisions = production.eventHistory?.filter((e) => e.qualityEffect < -0.02).length || 0
  const totalEvents = production.eventHistory?.length || 0

  const groups = state.groups.map((g) => {
    if (g.id !== group.id) return g
    return {
      ...g,
      totalSales: g.totalSales + sales,
      singles: [
        ...g.singles,
        {
          day: state.day,
          sales,
          revenue,
          title: `单曲 Vol.${g.singles.length + 1}`,
          quality: quality,
          qualityLevel: qualityLevel.key,
          producerName: production.producerName,
          totalCost: production.totalCost,
          productionDays: production.totalDays,
          reworkCount: production.reworkCount,
          goodDecisions,
          badDecisions,
          totalEvents,
        },
      ],
    }
  })

  const trainees = state.trainees.map((t) => {
    if (!group.memberIds.includes(t.id)) return t
    return {
      ...t,
      singlesReleased: t.singlesReleased + 1,
      fans: t.fans + Math.round(sales * 0.05 * qualityLevel.fansMult),
    }
  })

  let producerSynergy = { ...state.producerSynergy }
  if (production.producerId) {
    const current = producerSynergy[production.producerId] || 0
    const eventBonus = production.eventHistory?.length > 0
      ? randInt(CFG.producers.synergy.eventBonus[0], CFG.producers.synergy.eventBonus[1])
      : 0
    const baseGain = randInt(CFG.producers.synergy.perCollaboration[0], CFG.producers.synergy.perCollaboration[1])
    producerSynergy[production.producerId] = clamp(
      current + baseGain + eventBonus,
      0,
      CFG.producers.synergy.max
    )
  }

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `🎉 单曲制作完成！耗时 ${production.totalDays} 天，总投入 ¥${production.totalCost.toLocaleString()}`,
    },
    {
      day: state.day,
      text: `📊 制作评价：${goodDecisions}次优决策 / ${badDecisions}次劣决策 / ${totalEvents - goodDecisions - badDecisions}次中性`,
    },
    {
      day: state.day,
      text: `💿 ${group.name} 发行新单曲【${qualityLevel.label}】，品质 ${quality.toFixed(1)}，销量 ${sales.toLocaleString()}，收入 ¥${revenue.toLocaleString()}，粉丝 +${fansGain}！`,
    },
  ]

  return {
    ...state,
    money: state.money + revenue,
    totalRevenue: state.totalRevenue + revenue,
    fans: state.fans + fansGain,
    groups,
    trainees,
    producerSynergy,
    logs,
    activeProduction: null,
    lastSingleDay: { ...state.lastSingleDay, [group.id]: state.day },
  }
}
