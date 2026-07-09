export const MONSTER_TEMPLATES = [
  { name: '腐化骷髅', base_hp: 30, base_dmg: 8, exp: 15, gold: 5 },
  { name: '剧毒蜘蛛', base_hp: 25, base_dmg: 10, exp: 18, gold: 6 },
  { name: '暗影狼', base_hp: 40, base_dmg: 12, exp: 25, gold: 8 },
  { name: '熔岩史莱姆', base_hp: 60, base_dmg: 8, exp: 30, gold: 10 },
  { name: '堕落骑士', base_hp: 80, base_dmg: 15, exp: 50, gold: 20 },
  { name: '深渊凝视者', base_hp: 120, base_dmg: 20, exp: 80, gold: 35 },
  { name: '虚空行者', base_hp: 200, base_dmg: 30, exp: 150, gold: 60 },
  { name: '混沌领主', base_hp: 500, base_dmg: 50, exp: 500, gold: 200 },
]

export const BOSS_TEMPLATES = [
  { name: '墓穴守护者', hp_mult: 3, dmg_mult: 2, exp_mult: 5, gold_mult: 4, floor_min: 0, floor_max: 49, icon: '🪦' },
  { name: '沼泽之主', hp_mult: 3.5, dmg_mult: 2.2, exp_mult: 6, gold_mult: 5, floor_min: 50, floor_max: 99, icon: '🐊' },
  { name: '熔岩巨龙', hp_mult: 4, dmg_mult: 2.5, exp_mult: 7, gold_mult: 6, floor_min: 100, floor_max: 149, icon: '🐉' },
  { name: '暗影君王', hp_mult: 5, dmg_mult: 3, exp_mult: 10, gold_mult: 10, floor_min: 150, floor_max: 199, icon: '👑' },
  { name: '深渊魔龙', hp_mult: 5.5, dmg_mult: 3.2, exp_mult: 11, gold_mult: 11, floor_min: 200, floor_max: 249, icon: '🐲' },
  { name: '混沌领主', hp_mult: 6, dmg_mult: 3.4, exp_mult: 12, gold_mult: 12, floor_min: 250, floor_max: 299, icon: '👹' },
  { name: '虚空吞噬者', hp_mult: 6.5, dmg_mult: 3.6, exp_mult: 13, gold_mult: 13, floor_min: 300, floor_max: 349, icon: '🌑' },
  { name: '远古泰坦', hp_mult: 7, dmg_mult: 3.8, exp_mult: 14, gold_mult: 14, floor_min: 350, floor_max: 399, icon: '🗿' },
  { name: '星河之主', hp_mult: 7.5, dmg_mult: 4, exp_mult: 15, gold_mult: 15, floor_min: 400, floor_max: 449, icon: '🌌' },
  { name: '时空行者', hp_mult: 8, dmg_mult: 4.2, exp_mult: 16, gold_mult: 16, floor_min: 450, floor_max: 499, icon: '⏳' },
  { name: '创世神', hp_mult: 8.5, dmg_mult: 4.4, exp_mult: 17, gold_mult: 17, floor_min: 500, floor_max: 599, icon: '✨' },
  { name: '毁灭魔神', hp_mult: 9, dmg_mult: 4.6, exp_mult: 18, gold_mult: 18, floor_min: 600, floor_max: 699, icon: '💀' },
  { name: '终极深渊', hp_mult: 9.5, dmg_mult: 4.8, exp_mult: 19, gold_mult: 19, floor_min: 700, floor_max: 799, icon: '🔥' },
  { name: '永恒主宰', hp_mult: 10, dmg_mult: 5, exp_mult: 20, gold_mult: 20, floor_min: 800, floor_max: 9999, icon: '⚡' },
]
