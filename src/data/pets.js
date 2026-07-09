export const PET_TEMPLATES = {
  wolf: { name: '战狼', icon: '🐺', base_dmg: 5, growth: 3, passive: 'damage_bonus', passive_val: 2, tier: 1 },
  bear: { name: '棕熊', icon: '🐻', base_dmg: 3, growth: 2, passive: 'hp_bonus', passive_val: 15, tier: 1 },
  eagle: { name: '猎鹰', icon: '🦅', base_dmg: 4, growth: 2.5, passive: 'crit_rate', passive_val: 1, tier: 1 },
  fox: { name: '灵狐', icon: '🦊', base_dmg: 2, growth: 2, passive: 'exp_bonus', passive_val: 3, tier: 1 },
  cat: { name: '灵猫', icon: '🐱', base_dmg: 3, growth: 2, passive: 'gold_bonus', passive_val: 2, tier: 1 },
  turtle: { name: '玄龟', icon: '🐢', base_dmg: 2, growth: 1.5, passive: 'armor', passive_val: 3, tier: 1 },
  owl: { name: '夜枭', icon: '🦉', base_dmg: 3, growth: 2, passive: 'max_mp', passive_val: 20, tier: 2 },
  unicorn: { name: '独角兽', icon: '🦄', base_dmg: 4, growth: 2.5, passive: 'max_hp', passive_val: 25, tier: 2 },
  phoenix: { name: '凤凰', icon: '🔥', base_dmg: 5, growth: 3, passive: 'lifesteal', passive_val: 0.5, tier: 2 },
  dragon: { name: '神龙', icon: '🐲', base_dmg: 6, growth: 3.5, passive: 'damage_bonus', passive_val: 3, tier: 3 },
  divine_wolf: { name: '天狼', icon: '🐺✨', base_dmg: 8, growth: 4, passive: 'damage_bonus', passive_val: 5, tier: 4 },
  celestial_phoenix: { name: '不死凰', icon: '🔥✨', base_dmg: 7, growth: 3.8, passive: 'lifesteal', passive_val: 1, tier: 4 },
  abyssal_dragon: { name: '深渊龙', icon: '🐲🌌', base_dmg: 10, growth: 5, passive: 'crit_rate', passive_val: 2, tier: 5 },
  chaos_beast: { name: '混沌兽', icon: '👁️', base_dmg: 9, growth: 4.5, passive: 'damage_mult', passive_val: 0.05, tier: 5 },
}

export const PET_UPGRADE_COST = (lvl) => Math.floor(500 * (1.5 ** lvl))

export const PET_EGG_SHOP = {
  pet_egg_normal: { name: '🥚 普通宠物蛋', price: 5000, tier_weights: [60, 35, 5, 0, 0] },
  pet_egg_premium: { name: '🥚✨ 高级宠物蛋', price: 20000, tier_weights: [20, 50, 30, 0, 0] },
  pet_egg_divine: { name: '🥚👑 神话宠物蛋', price: 100000, tier_weights: [0, 10, 40, 35, 15] },
}

export const WILD_PET_CHANCE = 0.03
export const WILD_PET_TURN_LIMIT = 15
