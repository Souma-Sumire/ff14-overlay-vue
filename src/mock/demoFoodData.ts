import type { Players } from '@/types/food'

const demoFoodData: Players[] = [
  {
    id: '1',
    name: '1',
    jobName: '白魔',
    food: {
      durationSeconds: 14,
      expiredMillisecond: 1753140603605,
      name: '奶酪莫雷特',
      level: 740,
      params: [
        {
          'Params': 'Critical Hit',
          'Value': '8',
          'Max': '113',
          'Value{HQ}': '10',
          'Max{HQ}': '142',
        },
        {
          'Params': 'Vitality',
          'Value': '8',
          'Max': '196',
          'Value{HQ}': '10',
          'Max{HQ}': '246',
        },
        {
          'Params': 'Spell Speed',
          'Value': '8',
          'Max': '68',
          'Value{HQ}': '10',
          'Max{HQ}': '85',
        },
      ],
      hq: !true,
    },
    medicine: [
      {
        name: '8级意力之幻药',
        hq: true,
        grade: '8',
        shortName: '意',
        type: '意',
      },
      {
        name: '5级意力之幻药',
        hq: true,
        grade: '5',
        shortName: '意',
        type: '意',
      },
    ],
  },
  {
    id: '2',
    name: '1',
    jobName: '战士',
    food: {
      durationSeconds: 2594,
      expiredMillisecond: 1753140603605,
      name: '洛夫坦山羊臀肉排',
      level: 610,
      hq: true,
      params: [
        {
          'Params': 'Spell Speed',
          'Value': '8',
          'Max': '78',
          'Value{HQ}': '10',
          'Max{HQ}': '97',
        },
        {
          'Params': 'Vitality',
          'Value': '8',
          'Max': '94',
          'Value{HQ}': '10',
          'Max{HQ}': '118',
        },
        {
          'Params': 'Piety',
          'Value': '8',
          'Max': '46',
          'Value{HQ}': '10',
          'Max{HQ}': '58',
        },
      ],
    },
    medicine: [
      {
        name: '7级刚力之幻药',
        hq: false,
        grade: '7',
        shortName: '刚',
        type: '刚',
      },
      {
        name: '8级刚力之幻药',
        hq: true,
        grade: '8',
        shortName: '刚',
        type: '刚',
      },
    ],
  },
  {
    id: '3',
    name: '1',
    jobName: '画家',
    food: {
      durationSeconds: 1594,
      expiredMillisecond: 1753140603605,
      name: '芦荟水果冻',
      level: 680,
      hq: false,
      params: [
        {
          'Params': 'Determination',
          'Value': '8',
          'Max': '90',
          'Value{HQ}': '10',
          'Max{HQ}': '113',
        },
        {
          'Params': 'Vitality',
          'Value': '8',
          'Max': '132',
          'Value{HQ}': '10',
          'Max{HQ}': '166',
        },
        {
          'Params': 'Critical Hit',
          'Value': '8',
          'Max': '54',
          'Value{HQ}': '10',
          'Max{HQ}': '68',
        },
      ],
    },
    medicine: [
      {
        name: '8级智力之幻药',
        hq: true,
        grade: '8',
        shortName: '智',
        type: '智',
      },
    ],
  },
  {
    id: '4',
    name: '1',
    jobName: '武士',
    food: {
      durationSeconds: 594,
      expiredMillisecond: 1753140603605,
      name: '咖啡可可甜脆',
      hq: true,
      level: 710,
      params: [
        {
          'Params': 'Spell Speed',
          'Value': '8',
          'Max': '105',
          'Value{HQ}': '10',
          'Max{HQ}': '132',
        },
        {
          'Params': 'Vitality',
          'Value': '8',
          'Max': '162',
          'Value{HQ}': '10',
          'Max{HQ}': '203',
        },
        {
          'Params': 'Piety',
          'Value': '8',
          'Max': '63',
          'Value{HQ}': '10',
          'Max{HQ}': '79',
        },
      ],
    },
    medicine: [
      {
        name: '8级巧力之幻药',
        hq: true,
        grade: '8',
        shortName: '巧',
        type: '巧',
      },
    ],
  },
  {
    id: '5',
    name: '1',
    jobName: '诗人',
    food: {
      durationSeconds: 94,
      expiredMillisecond: 1753140603605,
      name: '鬃背兽肉排',
      hq: true,
      level: 740,
      params: [
        {
          'Params': 'Determination',
          'Value': '8',
          'Max': '113',
          'Value{HQ}': '10',
          'Max{HQ}': '142',
        },
        {
          'Params': 'Vitality',
          'Value': '8',
          'Max': '196',
          'Value{HQ}': '10',
          'Max{HQ}': '246',
        },
        {
          'Params': 'Tenacity',
          'Value': '8',
          'Max': '68',
          'Value{HQ}': '10',
          'Max{HQ}': '85',
        },
      ],
    },
    medicine: [
      {
        name: '8级巧力之幻药',
        hq: false,
        grade: '8',
        shortName: '巧',
        type: '巧',
      },
    ],
  },
  {
    id: '6',
    name: '1',
    jobName: '召唤',
    food: undefined,
    medicine: [
      {
        name: '8级智力之幻药',
        hq: true,
        grade: '8',
        shortName: '智',
        type: '智',
      },
    ],
  },
  {
    id: '7',
    name: '1',
    jobName: '猎人',
    food: {
      durationSeconds: 6594,
      expiredMillisecond: 1753140603605,
      name: '酱汁蘸虾',
      level: 650,
      params: [
        {
          'Params': 'Tenacity',
          'Value': '8',
          'Max': '84',
          'Value{HQ}': '10',
          'Max{HQ}': '105',
        },
        {
          'Params': 'Vitality',
          'Value': '8',
          'Max': '121',
          'Value{HQ}': '10',
          'Max{HQ}': '152',
        },
      ],
      hq: true,
    },
    medicine: [
      {
        name: '7级巧力之幻药',
        hq: true,
        grade: '7',
        shortName: '巧',
        type: '巧',
      },
    ],
  },
  {
    id: '8',
    name: '1',
    jobName: '黑骑',
    food: {
      durationSeconds: 6594,
      expiredMillisecond: 1753140603605,
      name: '蛋包饭',
      level: 650,
      params: [
        {
          'Params': 'Piety',
          'Value': '8',
          'Max': '84',
          'Value{HQ}': '10',
          'Max{HQ}': '105',
        },
        {
          'Params': 'Vitality',
          'Value': '8',
          'Max': '121',
          'Value{HQ}': '10',
          'Max{HQ}': '152',
        },
      ],
      hq: true,
    },
    medicine: [
      {
        name: '8级耐力之幻药',
        hq: true,
        grade: '8',
        shortName: '耐',
        type: '耐',
      },
    ],
  },
].sort(
  (a, b) => (a.food?.durationSeconds ?? 0) - (b.food?.durationSeconds ?? 0),
)

export { demoFoodData }
