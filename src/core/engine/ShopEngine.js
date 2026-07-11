import { SHOP_ITEMS } from '../../data/shop.js'
import { PET_EGG_SHOP } from '../../data/pets.js'
import {
  SHOP_POTION_HEAL_S, SHOP_POTION_HEAL_M, SHOP_POTION_HEAL_L
} from '../utils/constants.js'

/**
 * 商店引擎 - 管理商店购买、消耗品使用、自动喝药
 */
export class ShopEngine {
  constructor(deps) {
    this.save = deps.save
    this.combat = deps.combatEngine
  }

  getShop() {
    const lines = ['🏪 杂货铺（金币消费）', '═'.repeat(30)]
    for (const [key, item] of Object.entries(SHOP_ITEMS)) {
      lines.push(`  [${key}] ${item.name} - ${item.price}G | ${item.effect}+${item.value}`)
    }
    lines.push('\n🥚 宠物蛋专区：')
    for (const [key, item] of Object.entries(PET_EGG_SHOP)) {
      lines.push(`  [${key}] ${item.name} - ${item.price}G`)
    }
    lines.push(`\n💰 你当前有 ${this.save.stats.gold}G`)
    return lines.join('\n')
  }

  buyItem(itemKey) {
    if (itemKey in PET_EGG_SHOP) {
      const egg = PET_EGG_SHOP[itemKey]
      if (this.save.stats.gold < egg.price) {
        return `❌ 金币不够！需要${egg.price}G，你只有${this.save.stats.gold}G`
      }
      this.save.stats.gold -= egg.price
      this.save.stats.total_shop_buys = (this.save.stats.total_shop_buys || 0) + 1
      const eggs = this.save.pet_eggs || []
      eggs.push(itemKey)
      this.save.pet_eggs = eggs
      return `✅ 购买 ${egg.name} x1，剩余 ${this.save.stats.gold}G\n   使用 hatch ${itemKey} 孵化`
    }

    if (!(itemKey in SHOP_ITEMS)) return `❌ 商店里没有 ${itemKey}`
    const item = SHOP_ITEMS[itemKey]
    if (this.save.stats.gold < item.price) {
      return `❌ 金币不够！需要${item.price}G，你只有${this.save.stats.gold}G`
    }

    this.save.stats.gold -= item.price
    this.save.stats.total_shop_buys = (this.save.stats.total_shop_buys || 0) + 1

    if (item.type === 'consumable') {
      const inv = this.save.consumables || {}
      inv[itemKey] = (inv[itemKey] || 0) + 1
      this.save.consumables = inv
    }

    return `✅ 购买 ${item.name} x1，剩余 ${this.save.stats.gold}G`
  }

  useItem(itemKey) {
    const inv = this.save.consumables || {}
    if (!inv[itemKey] || inv[itemKey] <= 0) return `❌ 你没有 ${itemKey}`

    const item = SHOP_ITEMS[itemKey]
    if (!item) return `❌ 未知物品 ${itemKey}`

    inv[itemKey] -= 1
    if (inv[itemKey] <= 0) delete inv[itemKey]
    this.save.consumables = inv

    const s = this.save.stats
    const combat = this.combat.calcCombatStats()

    if (item.effect === 'heal') {
      s.total_potions_used = (s.total_potions_used || 0) + 1
      const oldHp = s.hp
      s.hp = Math.min(s.hp + item.value, combat.max_hp)
      const healed = s.hp - oldHp
      return `🍷 使用 ${item.name}，恢复 ${healed} HP (当前 ${s.hp}/${combat.max_hp})`
    } else if (item.effect === 'mana') {
      s.total_potions_used = (s.total_potions_used || 0) + 1
      const oldMp = s.mp
      s.mp = Math.min(s.mp + item.value, combat.max_mp)
      const restored = s.mp - oldMp
      return `🔵 使用 ${item.name}，恢复 ${restored} MP`
    } else if (item.effect === 'enchant') {
      return `⚡ 使用 ${item.name}，请配合装备命令使用`
    } else if (item.effect === 'reroll') {
      return `🔄 使用 ${item.name}，请配合装备命令使用`
    }
    return `✅ 使用 ${item.name}`
  }

  autoUsePotion() {
    const inv = this.save.consumables || {}
    const s = this.save.stats
    const combat = this.combat.calcCombatStats()
    const maxHp = combat.max_hp
    const missing = maxHp - s.hp

    if (missing <= 0) return ''

    const potionOrder = [
      ['hp_potion_l', SHOP_POTION_HEAL_L],
      ['hp_potion_m', SHOP_POTION_HEAL_M],
      ['hp_potion_s', SHOP_POTION_HEAL_S],
    ]

    for (const [key, healVal] of potionOrder) {
      if ((inv[key] || 0) > 0) {
        if (key === 'hp_potion_l' && missing < 500) continue
        if (key === 'hp_potion_m' && missing < 150) continue

        inv[key] -= 1
        if (inv[key] <= 0) delete inv[key]
        this.save.consumables = inv

        const oldHp = s.hp
        s.hp = Math.min(s.hp + healVal, maxHp)
        s.total_potions_used = (s.total_potions_used || 0) + 1
        const healed = s.hp - oldHp
        return `🍷 自动使用${SHOP_ITEMS[key].name} +${healed}HP`
      }
    }

    return ''
  }
}
