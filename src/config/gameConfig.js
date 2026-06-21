/**
 * 偶像养成事务所 — 全部数值规则集中配置
 * 调整平衡性时只需修改此文件
 */
export const GAME_CONFIG = {
  // ── 胜利 / 失败条件 ──
  victory: {
    targetGroups: 3,        // 需培养出道组合数
    totalDays: 1095,        // 3 年（天）
    requirePositiveProfit: true,
  },

  // ── 初始资源 ──
  initial: {
    money: 80000,
    fans: 200,
    traineeCount: 5,
    statMin: 18,
    statMax: 42,
    fatigue: 10,
    stress: 8,
  },

  // ── 五维属性键名 ──
  stats: ['vocal', 'dance', 'rap', 'looks', 'charm'],
  statLabels: {
    vocal: '唱功',
    dance: '舞蹈',
    rap: '说唱',
    looks: '颜值',
    charm: '魅力',
  },

  // ── 日程活动 ──
  activities: {
    vocal: {
      label: '声乐课',
      icon: '🎤',
      statGain: { vocal: [4, 7] },
      fatigue: [10, 14],
      stress: [2, 4],
      moneyCost: 400,
      requiresTraining: true,
    },
    dance: {
      label: '舞蹈课',
      icon: '💃',
      statGain: { dance: [4, 7] },
      fatigue: [12, 16],
      stress: [2, 4],
      moneyCost: 400,
      requiresTraining: true,
    },
    rap: {
      label: '说唱课',
      icon: '🎧',
      statGain: { rap: [4, 7] },
      fatigue: [10, 14],
      stress: [3, 5],
      moneyCost: 400,
      requiresTraining: true,
    },
    physical: {
      label: '体能训练',
      icon: '🏋️',
      statGain: { dance: [1, 3], looks: [0, 1] },
      fatigue: [6, 10],
      stress: [-2, 0],
      moneyCost: 250,
      requiresTraining: true,
    },
    rest: {
      label: '休息',
      icon: '😴',
      statGain: {},
      fatigue: [-28, -18],
      stress: [-10, -5],
      moneyCost: 0,
      requiresTraining: false,
    },
    pr: {
      label: '公关活动',
      icon: '📸',
      statGain: { charm: [2, 4], looks: [1, 3] },
      fatigue: [5, 8],
      stress: [6, 14],
      fansGain: [80, 250],
      moneyCost: 1200,
      requiresTraining: false,
    },
  },

  // ── 疲劳 / 压力阈值 ──
  thresholds: {
    fatigueExhausted: 75,   // 训练效果减半
    fatigueCollapse: 92,    // 强制休息
    stressHigh: 65,         // 训练效果 -20%
    stressBreakdown: 88,    // 当天无法训练
    statCap: 100,
  },

  // ── 每日运营成本 ──
  dailyCosts: {
    baseOperatingCost: 600,
    perTraineeCost: 250,
    perDebutedCost: 800,
    perGroupCost: 500,
  },

  // ── 周末内部评级 ──
  rating: {
    interval: 7,
    debutScoreThreshold: 58,  // 综合评分达标可出道
    minGroupSize: 2,
    maxGroupSize: 5,
    scoreWeights: {
      vocal: 0.22,
      dance: 0.22,
      rap: 0.16,
      looks: 0.2,
      charm: 0.2,
    },
  },

  // ── 单曲发行 ──
  single: {
    creationCost: 15000,
    baseSales: 800,
    statWeight: 0.45,
    fansWeight: 0.35,
    charmWeight: 0.2,
    revenuePerSale: 6,
    cooldownDays: 30,
  },

  // ── 练习生关系 ──
  relationships: {
    min: -100,
    max: 100,
    synergyThreshold: 55,       // 默契线
    competitionThreshold: -35,    // 竞争线
    synergyBonus: 0.25,           // 默契训练加成
    competitionStress: [12, 22],
    dailyDrift: [-3, 3],
    trainingTogether: [4, 9],
    statGapCompetition: 18,
    initialRange: [-15, 25],
  },

  // ── 随机事件 ──
  events: {
    dailyChance: 0.18,
    types: {
      negative_news: {
        label: '负面新闻',
        weight: 22,
        fansLoss: [150, 600],
        stressGain: [8, 18],
        description: '媒体曝出练习生训练期间发生冲突，粉丝舆论下滑。',
      },
      poaching: {
        label: '挖角危机',
        weight: 14,
        successChance: 0.28,
        description: '竞争对手试图挖走你旗下最有潜力的练习生！',
      },
      illness: {
        label: '生病',
        weight: 20,
        duration: [2, 4],
        statDecay: [1, 3],
        stressGain: [5, 10],
        description: '一名练习生身体不适，需要休养。',
      },
      inspiration: {
        label: '灵感爆发',
        weight: 22,
        statBoost: [6, 14],
        description: '一名练习生突然迸发出创作灵感，能力大幅提升！',
      },
      fan_surge: {
        label: '粉丝暴涨',
        weight: 22,
        fansGain: [300, 900],
        description: '一段练习室花絮意外走红，粉丝数激增！',
      },
    },
  },

  // ── 练习生名字池 ──
  names: [
    '林星遥', '苏晚晴', '陈予安', '顾念初', '沈知夏',
    '江月白', '陆清欢', '唐小满', '许未央', '韩鹿鸣',
    '方念慈', '宋时雨', '叶知秋', '周慕青', '赵星河',
  ],

  // ── 制作人协作系统 ──
  producers: {
    pool: [
      {
        id: 'p_001',
        name: '周逸辰',
        title: '新锐制作人',
        tier: 'common',
        specialty: 'vocal',
        cost: 8000,
        qualityBonus: 0.05,
        reworkRisk: 0.25,
        description: '刚入行的年轻制作人，潜力十足但经验尚浅。',
      },
      {
        id: 'p_002',
        name: '林婉清',
        title: '词曲才女',
        tier: 'common',
        specialty: 'charm',
        cost: 8000,
        qualityBonus: 0.05,
        reworkRisk: 0.28,
        description: '擅长创作抓耳旋律的独立音乐人。',
      },
      {
        id: 'p_003',
        name: '陈浩然',
        title: '知名制作人',
        tier: 'rare',
        specialty: 'dance',
        cost: 18000,
        qualityBonus: 0.12,
        reworkRisk: 0.18,
        description: '曾打造多首热门舞曲，舞台表现力十足。',
      },
      {
        id: 'p_004',
        name: '苏梦瑶',
        title: '金牌制作人',
        tier: 'epic',
        specialty: 'vocal',
        cost: 35000,
        qualityBonus: 0.22,
        reworkRisk: 0.1,
        description: '业内公认的金耳朵，对唱功要求极为严苛。',
      },
      {
        id: 'p_005',
        name: '顾承宇',
        title: '传奇制作人',
        tier: 'legendary',
        specialty: 'all',
        cost: 60000,
        qualityBonus: 0.35,
        reworkRisk: 0.03,
        description: '出道即巅峰的音乐鬼才，作品无一不是爆款。',
      },
    ],
    tierLabels: {
      common: '普通',
      rare: '稀有',
      epic: '史诗',
      legendary: '传奇',
    },
    tierColors: {
      common: '#9ca3af',
      rare: '#3b82f6',
      epic: '#a855f7',
      legendary: '#f59e0b',
    },
    specialtyLabels: {
      vocal: '唱功向',
      dance: '舞蹈向',
      rap: '说唱向',
      charm: '魅力向',
      all: '全能型',
    },
    stages: [
      {
        key: 'composition',
        label: '作曲',
        days: 3,
        requiredMembers: 2,
        primaryStat: 'vocal',
        secondaryStat: 'charm',
        statWeight: 0.8,
        description: '需要唱功好、有魅力的成员参与创作',
      },
      {
        key: 'arrangement',
        label: '编曲',
        days: 2,
        requiredMembers: 1,
        primaryStat: 'dance',
        secondaryStat: 'rap',
        statWeight: 0.6,
        description: '需要节奏感强的成员参与编曲讨论',
      },
      {
        key: 'recording',
        label: '录制',
        days: 3,
        requiredMembers: 3,
        primaryStat: 'vocal',
        secondaryStat: 'charm',
        statWeight: 1.0,
        description: '核心录制阶段，需要全体成员配合',
      },
      {
        key: 'mixing',
        label: '混音',
        days: 2,
        requiredMembers: 1,
        primaryStat: 'rap',
        secondaryStat: 'dance',
        statWeight: 0.5,
        description: '需要对音乐有独特理解的成员监棚',
      },
      {
        key: 'mastering',
        label: '母带',
        days: 1,
        requiredMembers: 0,
        primaryStat: null,
        secondaryStat: null,
        statWeight: 0,
        description: '制作人独立完成，无需成员参与',
      },
    ],
    qualityLevels: {
      S: { min: 90, label: 'S级神作', salesMult: 1.8, fansMult: 1.6 },
      A: { min: 75, label: 'A级佳作', salesMult: 1.4, fansMult: 1.3 },
      B: { min: 60, label: 'B级良品', salesMult: 1.1, fansMult: 1.1 },
      C: { min: 40, label: 'C级一般', salesMult: 0.9, fansMult: 0.9 },
      D: { min: 0, label: 'D级平庸', salesMult: 0.6, fansMult: 0.5 },
    },
    synergy: {
      max: 100,
      perCollaboration: [5, 12],
      qualityPerPoint: 0.002,
      eventBonus: [3, 8],
    },
    rework: {
      extraCostPercent: 0.3,
      extraDays: 2,
      qualityGain: [0.05, 0.1],
      decisionWeight: 0.4,
      baseThreshold: 0.3,
    },
    productionEvents: {
      dailyChance: 0.45,
      types: [
        {
          id: 'creative_disagreement',
          label: '创作分歧',
          stage: ['composition', 'arrangement'],
          description: '成员与制作人在音乐风格上产生分歧，需要你做出决定。',
          choices: [
            {
              label: '支持制作人',
              qualityEffect: [0.02, 0.05],
              synergyEffect: [-5, -2],
              stressEffect: [3, 6],
              resultText: '你选择相信制作人的专业判断，成员们有些失落但表示理解。',
            },
            {
              label: '支持成员',
              qualityEffect: [-0.03, 0.01],
              synergyEffect: [2, 6],
              stressEffect: [1, 4],
              resultText: '你采纳了成员的创意，制作人虽然犹豫但最终表示认可。',
            },
            {
              label: '双方协商',
              qualityEffect: [0, 0.03],
              synergyEffect: [4, 8],
              stressEffect: [-1, 2],
              resultText: '你组织双方深入沟通，找到了创意的平衡点。',
            },
          ],
        },
        {
          id: 'recording_mistake',
          label: '录制失误',
          stage: ['recording'],
          description: '主唱在录制关键段落时连续失误，制作人要求重录。',
          choices: [
            {
              label: '坚持重录',
              qualityEffect: [0.03, 0.06],
              synergyEffect: [-2, 1],
              stressEffect: [5, 10],
              fatigueEffect: [6, 12],
              resultText: '经过多次重录，终于录到了完美的版本，但成员们都很疲惫。',
            },
            {
              label: '后期修音',
              qualityEffect: [-0.04, -0.01],
              synergyEffect: [1, 3],
              stressEffect: [2, 5],
              resultText: '你选择用后期处理弥补瑕疵，制作人有些遗憾但尊重你的决定。',
            },
            {
              label: '换成员录',
              qualityEffect: [-0.02, 0.02],
              synergyEffect: [-4, -1],
              stressEffect: [4, 8],
              resultText: '你临时更换了主唱，虽然效果不错但原主唱心情低落。',
            },
          ],
        },
        {
          id: 'inspiration_strike',
          label: '灵感迸发',
          stage: ['composition', 'recording'],
          description: '一位成员在创作中突然迸发灵感，提出了绝妙的想法！',
          choices: [
            {
              label: '采纳并扩展',
              qualityEffect: [0.05, 0.1],
              synergyEffect: [5, 10],
              stressEffect: [-3, 0],
              resultText: '团队围绕这个灵感深入创作，整首歌的品质大幅提升！',
            },
            {
              label: '保留为彩蛋',
              qualityEffect: [0.02, 0.04],
              synergyEffect: [3, 6],
              stressEffect: [-2, 1],
              resultText: '你将这个灵感作为隐藏彩蛋放在歌曲中，成员们很开心。',
            },
            {
              label: '本次先不用',
              qualityEffect: [-0.02, 0],
              synergyEffect: [-6, -3],
              stressEffect: [3, 6],
              resultText: '你决定留到下次再用，提出灵感的成员有些失望。',
            },
          ],
        },
        {
          id: 'producer_demand',
          label: '制作人高要求',
          stage: ['recording', 'mixing'],
          description: '制作人提出了一个非常苛刻的要求，成员们认为难以达到。',
          choices: [
            {
              label: '严格执行',
              qualityEffect: [0.04, 0.08],
              synergyEffect: [-3, 1],
              stressEffect: [6, 12],
              fatigueEffect: [8, 15],
              resultText: '在制作人的严格要求下，作品达到了新高度，但成员们压力山大。',
            },
            {
              label: '适当放宽',
              qualityEffect: [0, 0.03],
              synergyEffect: [2, 5],
              stressEffect: [-2, 3],
              resultText: '你与制作人协商后适当降低了难度，大家都松了一口气。',
            },
            {
              label: '分组竞争',
              qualityEffect: [0.02, 0.05],
              synergyEffect: [-5, -1],
              stressEffect: [4, 8],
              resultText: '你让成员分组完成，内部竞争激发了潜力但也产生了摩擦。',
            },
          ],
        },
        {
          id: 'chemistry_click',
          label: '化学反应',
          stage: ['recording', 'mixing'],
          description: '成员们在合作中产生了奇妙的化学反应，录制气氛极佳！',
          choices: [
            {
              label: '趁热打铁',
              qualityEffect: [0.03, 0.07],
              synergyEffect: [6, 12],
              stressEffect: [-4, -1],
              fatigueEffect: [-2, 3],
              resultText: '你决定延长录制时间，大家状态奇佳，超额完成了任务！',
            },
            {
              label: '保持节奏',
              qualityEffect: [0.01, 0.03],
              synergyEffect: [3, 7],
              stressEffect: [-2, 1],
              resultText: '你按照原计划进行，顺利完成了当天的录制任务。',
            },
            {
              label: '录制花絮',
              qualityEffect: [0, 0.02],
              synergyEffect: [8, 14],
              stressEffect: [-3, 0],
              fansEffect: [50, 150],
              resultText: '你让工作人员录制了制作花絮，发布后粉丝反响热烈！',
            },
          ],
        },
        {
          id: 'equipment_failure',
          label: '设备故障',
          stage: ['recording', 'mixing'],
          description: '录音设备突然出现故障，可能影响制作进度。',
          choices: [
            {
              label: '紧急维修',
              qualityEffect: [-0.02, 0],
              synergyEffect: [-2, 2],
              stressEffect: [5, 10],
              extraCost: [2000, 5000],
              resultText: '你花钱紧急维修设备，虽然花了钱但没有耽误太多进度。',
            },
            {
              label: '改用备用设备',
              qualityEffect: [-0.05, -0.02],
              synergyEffect: [0, 3],
              stressEffect: [3, 6],
              resultText: '你决定使用备用设备，音质略有下降但节省了成本。',
            },
            {
              label: '放假一天',
              qualityEffect: [-0.01, 0.01],
              synergyEffect: [4, 8],
              stressEffect: [-8, -4],
              extraDays: 1,
              resultText: '你给大家放了一天假，回来后士气高涨，效率反而提高了。',
            },
          ],
        },
      ],
    },
  },

  // ── 存档 ──
  storage: {
    savesKey: 'idol-agency-saves-v1',
    themeKey: 'idol-agency-theme',
    maxSlots: 5,
  },
}
