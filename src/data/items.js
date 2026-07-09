export const PREFIX_POOL = {
  普通: {},
  精制: { damage_bonus: [1, 3], armor: [1, 2] },
  稀有: { damage_bonus: [3, 7], armor: [2, 4], crit_rate: [2, 5], hp_bonus: [10, 25] },
  史诗: { damage_bonus: [7, 15], armor: [4, 8], crit_rate: [5, 10], hp_bonus: [25, 60], lifesteal: [2, 5] },
  传说: { damage_bonus: [15, 30], armor: [8, 15], crit_rate: [10, 20], hp_bonus: [60, 120], lifesteal: [5, 10], exp_bonus: [10, 20] },
  神话: { damage_bonus: [25, 50], armor: [15, 30], crit_rate: [15, 30], hp_bonus: [100, 200], lifesteal: [8, 15], exp_bonus: [15, 30], gold_bonus: [10, 20] },
}

export const QUALITY_NAMES = ['普通', '精制', '稀有', '史诗', '传说', '神话']

export const QUALITY_COLORS = {
  普通: '#a0a0a0',
  精制: '#2ecc71',
  稀有: '#3498db',
  史诗: '#9b59b6',
  传说: '#e67e22',
  神话: '#e74c3c',
}

export const QUALITY_EMOJI = {
  普通: '⚪',
  精制: '🟢',
  稀有: '🔵',
  史诗: '🟣',
  传说: '🟠',
  神话: '🔴',
}

export const QUALITY_RANK = {
  普通: 0,
  精制: 1,
  稀有: 2,
  史诗: 3,
  传说: 4,
  神话: 5,
}

export const ITEM_TYPES = ['武器', '头盔', '胸甲', '护腿', '靴子', '戒指', '项链']

export const BASE_ITEMS = {
  武器: { damage: 10, armor: 0, hp: 0 },
  头盔: { damage: 0, armor: 5, hp: 20 },
  胸甲: { damage: 0, armor: 10, hp: 40 },
  护腿: { damage: 0, armor: 7, hp: 30 },
  靴子: { damage: 0, armor: 4, hp: 15 },
  戒指: { damage: 2, armor: 1, hp: 10 },
  项链: { damage: 1, armor: 2, hp: 25 },
}

export const SET_NAMES = ['烈焰', '冰霜', '暗影', '圣光', '风暴', '大地', '龙王', '神谕', '虚空']

export const SET_COLORS = {
  烈焰: '🔥',
  冰霜: '❄️',
  暗影: '🌑',
  圣光: '✨',
  风暴: '⚡',
  大地: '🌿',
  龙王: '🐲',
  神谕: '🔮',
  虚空: '🌌',
}

export const SET_BONUSES = {
  烈焰: { 2: { damage_mult: 1.05 }, 4: { damage_mult: 1.15 } },
  冰霜: { 2: { armor_flat: 15 }, 4: { armor_flat: 40 } },
  暗影: { 2: { crit_rate: 3 }, 4: { crit_rate: 8, crit_dmg: 0.2 } },
  圣光: { 2: { max_hp: 100 }, 4: { max_hp: 250, lifesteal: 3 } },
  风暴: { 2: { exp_bonus: 10 }, 4: { exp_bonus: 25, gold_bonus: 15 } },
  大地: { 2: { hp_bonus: 30 }, 4: { hp_bonus: 80, armor: 10 } },
  龙王: {
    2: { damage_bonus: 30, crit_rate: 10 },
    4: { damage_mult: 1.25, crit_dmg: 0.3, lifesteal: 5 },
    6: { damage_mult: 1.5, crit_rate: 25, hp_bonus: 200 },
  },
  神谕: {
    2: { max_hp: 300, max_mp: 100 },
    4: { armor_flat: 50, lifesteal: 10, exp_bonus: 20 },
    6: { max_hp: 800, damage_mult: 1.2, gold_bonus: 30 },
  },
  虚空: {
    2: { str: 10, agi: 10 },
    4: { damage_mult: 1.3, crit_rate: 20 },
    6: { damage_mult: 1.6, armor_penalty: -20, lifesteal: 15 },
  },
}
