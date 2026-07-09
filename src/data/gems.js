export const GEM_TYPES = {
  ruby: { name: '红宝石', color: '🔴', effect: 'damage', value: 3 },
  sapphire: { name: '蓝宝石', color: '🔵', effect: 'armor', value: 2 },
  emerald: { name: '绿宝石', color: '🟢', effect: 'max_hp', value: 15 },
  topaz: { name: '黄宝石', color: '🟡', effect: 'crit_rate', value: 1 },
  amethyst: { name: '紫宝石', color: '🟣', effect: 'lifesteal', value: 1 },
  diamond: { name: '💎钻石', color: '💎', effect: 'all_stats', value: 5 },
}

export const GEM_SOCKETS = {
  普通: 1,
  精制: 1,
  稀有: 2,
  史诗: 3,
  传说: 4,
  神话: 6,
}

export function getGemName(gemType, level) {
  const gem = GEM_TYPES[gemType]
  if (!gem) return `未知宝石Lv.${level}`
  return `${gem.color}${gem.name}Lv.${level}`
}

export function calcGemValue(gemType, level) {
  if (gemType === 'diamond') {
    return Math.floor(5 * (1.8 ** (level - 1)))
  }
  const base = GEM_TYPES[gemType]?.value || 0
  return Math.floor(base * (1.5 ** (level - 1)))
}
