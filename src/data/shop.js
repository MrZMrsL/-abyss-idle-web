export const SHOP_ITEMS = {
  hp_potion_s: { name: '小血瓶', price: 50, type: 'consumable', effect: 'heal', value: 200 },
  hp_potion_m: { name: '中血瓶', price: 150, type: 'consumable', effect: 'heal', value: 600 },
  hp_potion_l: { name: '大血瓶', price: 400, type: 'consumable', effect: 'heal', value: 1500 },
  mp_potion: { name: '蓝瓶', price: 100, type: 'consumable', effect: 'mana', value: 100 },
  scroll_enchant: { name: '附魔卷轴', price: 500, type: 'consumable', effect: 'enchant', value: 1 },
  scroll_reroll: { name: '洗练石', price: 800, type: 'consumable', effect: 'reroll', value: 1 },
}

export const ENCHANT_POOL = {
  damage_bonus: [2, 8],
  hp_bonus: [10, 40],
  armor: [2, 6],
  crit_rate: [1, 4],
  lifesteal: [1, 3],
  exp_bonus: [3, 8],
  gold_bonus: [3, 8],
}

export const MAX_ENCHANTS = 3
