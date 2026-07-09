import {
  QUALITY_NAMES, QUALITY_EMOJI, QUALITY_RANK, ITEM_TYPES,
  BASE_ITEMS, SET_NAMES, SET_BONUSES
} from '../../data/items.js'
import { GEM_TYPES, GEM_SOCKETS, getGemName, calcGemValue } from '../../data/gems.js'
import { SHOP_ITEMS, ENCHANT_POOL, MAX_ENCHANTS } from '../../data/shop.js'
import { calcItemPrice, calcItemScore } from '../utils/helpers.js'
import {
  MAX_ENHANCE_LEVEL, ENHANCE_SUCCESS_BASE, ENHANCE_SUCCESS_DECAY,
  ENHANCE_SUCCESS_MIN, ENHANCE_STAT_BOOST, ENHANCE_GOLD_BASE,
  ENHANCE_GOLD_MULTIPLIER, ENHANCE_DEGRADE_THRESHOLD, ENHANCE_REFUND_RATE
} from '../utils/constants.js'

/**
 * 锻造引擎 —— 负责装备强化、附魔、宝石镶嵌/拆除/合成、分解、熔炼继承、装备优化配装。
 */
export class CraftingEngine {
  constructor(deps) {
    this.save = deps.save
    this.combat = deps.combatEngine
  }

  enhanceItem(itemId) {
    let targetItem = null
    for (const item of Object.values(this.save.equipped || {})) {
      if (item.id === itemId) {
        targetItem = item
        break
      }
    }
    if (!targetItem) {
      for (const item of this.save.inventory || []) {
        if (item.id === itemId) {
          targetItem = item
          break
        }
      }
    }
    if (!targetItem) return `❌ 找不到装备 ${itemId}`

    const el = targetItem.enhance_level || 0
    if (el >= MAX_ENHANCE_LEVEL) return '❌ 装备已达到最大强化等级 (+15)'

    const stoneCost = el + 1
    const materials = this.save.materials || { enhance_stone: 0, set_fragments: {} }
    if ((materials.enhance_stone || 0) < stoneCost) {
      return `❌ 强化石不足！需要${stoneCost}个，你有${materials.enhance_stone || 0}个`
    }

    const goldCost = Math.floor(ENHANCE_GOLD_BASE * ENHANCE_GOLD_MULTIPLIER ** el)
    if (this.save.stats.gold < goldCost) {
      return `❌ 金币不足！需要${goldCost}G，你有${this.save.stats.gold}G`
    }

    materials.enhance_stone -= stoneCost
    this.save.materials = materials
    this.save.stats.gold -= goldCost
    this.save.stats.total_enhances = (this.save.stats.total_enhances || 0) + 1

    const successRate = Math.max(ENHANCE_SUCCESS_MIN, ENHANCE_SUCCESS_BASE - el * ENHANCE_SUCCESS_DECAY)
    const roll = Math.floor(Math.random() * 100) + 1

    if (roll <= successRate) {
      targetItem.enhance_level = el + 1
      for (const key of Object.keys(targetItem.base || {})) {
        targetItem.base[key] = Math.floor(targetItem.base[key] * ENHANCE_STAT_BOOST)
      }
      for (const key of Object.keys(targetItem.stats || {})) {
        targetItem.stats[key] = Math.floor(targetItem.stats[key] * ENHANCE_STAT_BOOST)
      }
      return `✨ 强化成功！${targetItem.name} → +${el + 1} (成功率${successRate}%)`
    } else {
      if (el >= ENHANCE_DEGRADE_THRESHOLD) {
        targetItem.enhance_level = Math.max(0, el - 1)
        for (const key of Object.keys(targetItem.base || {})) {
          targetItem.base[key] = Math.floor(targetItem.base[key] / ENHANCE_STAT_BOOST)
        }
        for (const key of Object.keys(targetItem.stats || {})) {
          targetItem.stats[key] = Math.floor(targetItem.stats[key] / ENHANCE_STAT_BOOST)
        }
        return `💥 强化失败！${targetItem.name} 从+${el}降级到+${el - 1} (成功率${successRate}%)`
      } else {
        return `💥 强化失败！${targetItem.name} 保持+${el} (成功率${successRate}%)`
      }
    }
  }

  enchantItem(itemId) {
    const inv = this.save.consumables || {}
    if ((inv.scroll_enchant || 0) <= 0) return '❌ 你没有附魔卷轴，去商店买吧'

    let targetItem = null
    for (const item of Object.values(this.save.equipped || {})) {
      if (item.id === itemId) {
        targetItem = item
        break
      }
    }
    if (!targetItem) {
      for (const item of this.save.inventory || []) {
        if (item.id === itemId) {
          targetItem = item
          break
        }
      }
    }
    if (!targetItem) return `❌ 找不到装备 ${itemId}`

    const enchants = targetItem.enchants || []
    if (enchants.length >= MAX_ENCHANTS) {
      return `❌ ${targetItem.name} 已达到最大附魔次数 (${MAX_ENCHANTS})`
    }

    inv.scroll_enchant -= 1
    if (inv.scroll_enchant <= 0) delete inv.scroll_enchant
    this.save.consumables = inv

    const statKeys = Object.keys(ENCHANT_POOL)
    const stat = statKeys[Math.floor(Math.random() * statKeys.length)]
    const [mn, mx] = ENCHANT_POOL[stat]
    const value = mn + Math.floor(Math.random() * (mx - mn + 1))

    enchants.push({ stat, value })
    targetItem.enchants = enchants
    this.save.stats.total_enchants = (this.save.stats.total_enchants || 0) + 1

    const statNames = {
      damage_bonus: '攻击加成',
      hp_bonus: '生命加成',
      armor: '护甲',
      crit_rate: '暴击率',
      lifesteal: '吸血',
      exp_bonus: '经验加成',
      gold_bonus: '金币加成',
    }
    return `⚡ ${targetItem.name} 附魔成功！+${value} ${statNames[stat] || stat} (附魔${enchants.length}/${MAX_ENCHANTS})`
  }

  dismantleItem(itemId) {
    for (let i = 0; i < (this.save.inventory || []).length; i++) {
      const item = this.save.inventory[i]
      if (item.id === itemId) {
        const quality = item.quality || '普通'
        const level = item.level || 1
        const setName = item.set_name || ''
        let stoneGain = 0
        let fragmentGain = 0
        switch (quality) {
          case '普通': stoneGain = 1; break
          case '精制': stoneGain = 2; break
          case '稀有': stoneGain = 3; break
          case '史诗': stoneGain = 5; fragmentGain = 1; break
          case '传说': stoneGain = 10; fragmentGain = 3; break
        }
        stoneGain += Math.floor(level / 10)
        const materials = this.save.materials || { enhance_stone: 0, set_fragments: {} }
        materials.enhance_stone = (materials.enhance_stone || 0) + stoneGain
        if (fragmentGain > 0 && setName) {
          materials.set_fragments = materials.set_fragments || {}
          materials.set_fragments[setName] = (materials.set_fragments[setName] || 0) + fragmentGain
        }
        this.save.materials = materials
        this.save.stats.total_dismantles = (this.save.stats.total_dismantles || 0) + 1
        this.save.inventory.splice(i, 1)
        const fragMsg = fragmentGain > 0 && setName ? ` + ${setName}碎片x${fragmentGain}` : ''
        return `🔨 分解 ${item.name} → 强化石x${stoneGain}${fragMsg}`
      }
    }
    return `❌ 背包里没有 ${itemId}`
  }

  insertGem(itemId, slotIdx, gemType, gemLevel) {
    if (!(gemType in GEM_TYPES)) return `❌ 未知宝石类型: ${gemType}`
    const gemKey = `${gemType}_${gemLevel}`
    const gemsInv = this.save.gems || {}
    if ((gemsInv[gemKey] || 0) <= 0) return `❌ 你没有 ${getGemName(gemType, gemLevel)}`

    let targetItem = null
    for (const [slot, item] of Object.entries(this.save.equipped || {})) {
      if (item.id === itemId) {
        targetItem = item
        break
      }
    }
    if (!targetItem) {
      for (const item of this.save.inventory || []) {
        if (item.id === itemId) {
          targetItem = item
          break
        }
      }
    }
    if (!targetItem) return `❌ 找不到装备 ${itemId}`

    const sockets = targetItem.sockets || 1
    const currentGems = targetItem.gems || []
    if (slotIdx < 1 || slotIdx > sockets) return `❌ 孔位号必须在 1-${sockets} 之间`
    if (slotIdx <= currentGems.length) return `❌ 孔位${slotIdx}已有宝石，请先拆除`
    if (slotIdx !== currentGems.length + 1) return `❌ 必须按顺序镶嵌（下一个空位是${currentGems.length + 1}）`

    gemsInv[gemKey] -= 1
    if (gemsInv[gemKey] <= 0) delete gemsInv[gemKey]
    this.save.gems = gemsInv
    currentGems.push({ type: gemType, level: gemLevel })
    targetItem.gems = currentGems
    this.save.stats.total_gems_inserted = (this.save.stats.total_gems_inserted || 0) + 1
    return `✅ 在 ${targetItem.name} 的孔${slotIdx}镶嵌了 ${getGemName(gemType, gemLevel)}`
  }

  removeGem(itemId, slotIdx) {
    let targetItem = null
    for (const item of Object.values(this.save.equipped || {})) {
      if (item.id === itemId) {
        targetItem = item
        break
      }
    }
    if (!targetItem) {
      for (const item of this.save.inventory || []) {
        if (item.id === itemId) {
          targetItem = item
          break
        }
      }
    }
    if (!targetItem) return `❌ 找不到装备 ${itemId}`

    const currentGems = targetItem.gems || []
    if (slotIdx < 1 || slotIdx > currentGems.length) return `❌ 该装备孔位${slotIdx}没有宝石`
    if (slotIdx !== currentGems.length) return `❌ 只能从最后一个孔开始拆除`

    const gem = currentGems.pop()
    const gemKey = `${gem.type}_${gem.level}`
    const gemsInv = this.save.gems || {}
    gemsInv[gemKey] = (gemsInv[gemKey] || 0) + 1
    this.save.gems = gemsInv
    return `✅ 从 ${targetItem.name} 拆除了 ${getGemName(gem.type, gem.level)}`
  }

  gemFuse(gemType, gemLevel) {
    if (!(gemType in GEM_TYPES)) return '❌ 未知宝石类型'
    let required
    if (gemType === 'diamond') {
      if (gemLevel < 3) return '❌ 钻石只能从 Lv.3 开始合成，你需要先有 Lv.3 普通宝石'
      required = 5
    } else {
      required = 3
    }
    const gemKey = `${gemType}_${gemLevel}`
    const gemsInv = this.save.gems || {}
    if ((gemsInv[gemKey] || 0) < required) {
      return `❌ ${getGemName(gemType, gemLevel)} 不足${required}颗（你有${gemsInv[gemKey] || 0}颗）`
    }
    gemsInv[gemKey] -= required
    if (gemsInv[gemKey] <= 0) delete gemsInv[gemKey]
    const newKey = `${gemType}_${gemLevel + 1}`
    gemsInv[newKey] = (gemsInv[newKey] || 0) + 1
    this.save.gems = gemsInv
    this.save.stats.total_gems_fused = (this.save.stats.total_gems_fused || 0) + required
    const oldVal = calcGemValue(gemType, gemLevel)
    const newVal = calcGemValue(gemType, gemLevel + 1)
    return `✨ 合成成功！${required}颗${getGemName(gemType, gemLevel)}(${oldVal}) → 1颗${getGemName(gemType, gemLevel + 1)}(${newVal})`
  }

  transferEnhance(oldId, newId) {
    let oldItem = null
    let oldLocation = null
    for (const [slot, item] of Object.entries(this.save.equipped || {})) {
      if (item.id === oldId) {
        oldItem = item
        oldLocation = ['equipped', slot]
        break
      }
    }
    if (!oldItem) {
      for (let idx = 0; idx < (this.save.inventory || []).length; idx++) {
        const item = this.save.inventory[idx]
        if (item.id === oldId) {
          oldItem = item
          oldLocation = ['inventory', idx]
          break
        }
      }
    }

    let newItem = null
    let newLocation = null
    for (let idx = 0; idx < (this.save.inventory || []).length; idx++) {
      const item = this.save.inventory[idx]
      if (item.id === newId) {
        newItem = item
        newLocation = ['inventory', idx]
        break
      }
    }
    if (!newItem) {
      for (const [slot, item] of Object.entries(this.save.equipped || {})) {
        if (item.id === newId) {
          return `❌ 新装备 ${newId} 是身上穿的，先脱下来放背包`
        }
      }
    }

    if (!oldItem) return `❌ 找不到旧装备 ${oldId}`
    if (!newItem) return `❌ 找不到新装备 ${newId}（必须在背包中）`
    if (oldItem.type !== newItem.type) {
      return `❌ 部位不匹配！旧装备是「${oldItem.type}」，新装备是「${newItem.type}」`
    }

    const oldEl = oldItem.enhance_level || 0
    const newEl = newItem.enhance_level || 0
    if (
      newEl >= oldEl &&
      (newItem.gems || []).length >= (oldItem.gems || []).length &&
      (newItem.enchants || []).length >= (oldItem.enchants || []).length
    ) {
      return `❌ 新装备强化+${newEl}、宝石${(newItem.gems || []).length}孔、附魔${(newItem.enchants || []).length}条，不比旧装备差，无需继承`
    }

    let refund = 0
    for (let i = 1; i <= oldEl; i++) refund += i
    refund = Math.max(0, Math.floor(refund / 2))

    newItem.enhance_level = Math.max(oldEl, newEl)

    const oldGems = oldItem.gems || []
    const newSockets = newItem.sockets || 1
    const transferredGems = []
    const lostGems = []
    for (const gem of oldGems) {
      if (transferredGems.length < newSockets) transferredGems.push(gem)
      else lostGems.push(gem)
    }
    newItem.gems = transferredGems

    const oldEnchants = oldItem.enchants || []
    newItem.enchants = [...oldEnchants]

    if (oldLocation[0] === 'equipped') {
      delete this.save.equipped[oldLocation[1]]
      this.save.equipped[oldLocation[1]] = newItem
      if (newLocation && newLocation[0] === 'inventory') {
        this.save.inventory.splice(newLocation[1], 1)
      }
    } else {
      this.save.inventory.splice(oldLocation[1], 1)
    }

    if (refund > 0) {
      const materials = this.save.materials || { enhance_stone: 0, set_fragments: {} }
      materials.enhance_stone = (materials.enhance_stone || 0) + refund
      this.save.materials = materials
    }

    let result = `✨ 熔炼继承成功！\n`
    result += `  旧：${oldItem.name} Lv.${oldItem.level} +${oldEl}（已熔炼）\n`
    result += `  新：${newItem.name} Lv.${newItem.level} +${newItem.enhance_level}\n`
    if (transferredGems.length) {
      result += `  💎 转移宝石：${transferredGems.length}颗`
      if (lostGems.length) result += `（${lostGems.length}颗因孔位不足丢失）`
      result += '\n'
    }
    if (oldEnchants.length) result += `  ⚡ 转移附魔：${oldEnchants.length}条\n`
    if (refund > 0) result += `  🔨 熔炼返还：${refund}强化石`
    return result
  }

  optimizeEquipment() {
    const allItems = [...(this.save.inventory || []), ...Object.values(this.save.equipped || {})]
    const bySlot = {}
    for (const item of allItems) {
      const slot = item.type
      if (!bySlot[slot]) bySlot[slot] = []
      bySlot[slot].push(item)
    }

    const bestCombo = {}
    for (const [slot, items] of Object.entries(bySlot)) {
      items.sort((a, b) => calcItemScore(b, bestCombo, SET_BONUSES) - calcItemScore(a, bestCombo, SET_BONUSES))
      bestCombo[slot] = items[0]
    }

    let improved = true
    let iterations = 0
    while (improved && iterations < 50) {
      improved = false
      iterations += 1
      let currentTotal = this.calcComboScore(bestCombo)
      for (const [slot, items] of Object.entries(bySlot)) {
        for (const item of items) {
          if (item.id === bestCombo[slot].id) continue
          const testCombo = { ...bestCombo, [slot]: item }
          const testScore = this.calcComboScore(testCombo)
          if (testScore > currentTotal) {
            bestCombo[slot] = item
            currentTotal = testScore
            improved = true
            break
          }
        }
        if (improved) break
      }
    }

    const lines = ['🎯 最优配装方案：']
    const oldIds = {}
    for (const [slot, eq] of Object.entries(this.save.equipped || {})) oldIds[slot] = eq.id
    const changes = []
    for (const slot of ITEM_TYPES) {
      if (slot in bestCombo) {
        const item = bestCombo[slot]
        const marker = oldIds[slot] !== item.id ? '【换】' : '【留】'
        lines.push(`  ${marker} ${slot}: ${item.name} Lv.${item.level} (${item.set_name || '无套装'})`)
        if (marker === '【换】') changes.push(slot)
      }
    }

    const totalScore = this.calcComboScore(bestCombo)
    lines.push(`\n📊 组合评分: ${totalScore}`)
    if (changes.length) lines.push(`💡 建议更换: ${changes.join(', ')}`)
    else lines.push('✅ 当前已是最佳配装')
    return lines.join('\n')
  }

  calcComboScore(combo) {
    let total = 0
    const setCounts = {}
    for (const [slot, item] of Object.entries(combo)) {
      total += calcItemScore(item, combo, SET_BONUSES)
      const sname = item.set_name
      if (sname) setCounts[sname] = (setCounts[sname] || 0) + 1
    }
    for (const [sname, count] of Object.entries(setCounts)) {
      if (sname in SET_BONUSES) {
        if (count >= 4) total += 8000
        else if (count >= 2) total += 3000
      }
    }
    return total
  }

  applyOptimal() {
    const allItems = [...(this.save.inventory || []), ...Object.values(this.save.equipped || {})]
    const bySlot = {}
    for (const item of allItems) {
      const slot = item.type
      if (!bySlot[slot]) bySlot[slot] = []
      bySlot[slot].push(item)
    }

    const bestCombo = {}
    for (const [slot, items] of Object.entries(bySlot)) {
      items.sort((a, b) => calcItemScore(b, bestCombo, SET_BONUSES) - calcItemScore(a, bestCombo, SET_BONUSES))
      bestCombo[slot] = items[0]
    }

    this.save.equipped = bestCombo
    const equippedIds = new Set(Object.values(bestCombo).map((eq) => eq.id))
    this.save.inventory = allItems.filter((item) => !equippedIds.has(item.id))
    return '✅ 已应用最优配装！'
  }

  getGems() {
    const gems = this.save.gems || {}
    if (!Object.keys(gems).length) return '💎 宝石背包是空的'
    const lines = ['💎 宝石背包：']
    for (const key of Object.keys(gems).sort()) {
      const [gemType, levelStr] = key.split('_')
      const level = parseInt(levelStr, 10)
      const name = getGemName(gemType, level)
      const effect = GEM_TYPES[gemType] || {}
      const val = calcGemValue(gemType, level)
      lines.push(`  [${key}] ${name} x${gems[key]} | ${effect.effect || '?'}+${val}`)
    }
    return lines.join('\n')
  }

  getEquippedDetail() {
    const lines = ['🛠️ 已装备详情：']
    for (const [slot, item] of Object.entries(this.save.equipped || {})) {
      lines.push(`\n  📌 ${slot}: ${item.name} (Lv.${item.level})`)
      const sockets = item.sockets || 1
      const gems = item.gems || []
      lines.push(`     孔位: ${gems.length}/${sockets}`)
      for (let i = 0; i < gems.length; i++) {
        lines.push(`     💎 孔${i + 1}: ${getGemName(gems[i].type, gems[i].level || 1)}`)
      }
      for (let i = gems.length; i < sockets; i++) {
        lines.push(`     ⬜ 孔${i + 1}: [空]`)
      }
    }
    return lines.join('\n')
  }

  getMaterials() {
    const materials = this.save.materials || {}
    const lines = ['💎 材料背包：']
    lines.push(`  强化石: ${materials.enhance_stone || 0}`)
    const fragments = materials.set_fragments || {}
    if (Object.keys(fragments).length) {
      lines.push('  套装碎片:')
      for (const [sname, count] of Object.entries(fragments)) {
        lines.push(`    ${SET_COLORS[sname] || '📦'}${sname}: ${count}`)
      }
    }
    return lines.join('\n')
  }

  getItemDetail(itemId) {
    let targetItem = null
    for (const item of Object.values(this.save.equipped || {})) {
      if (item.id === itemId) {
        targetItem = item
        break
      }
    }
    if (!targetItem) {
      for (const item of this.save.inventory || []) {
        if (item.id === itemId) {
          targetItem = item
          break
        }
      }
    }
    if (!targetItem) return `❌ 找不到装备 ${itemId}`

    const lines = [`📋 ${targetItem.name} 详情：`]
    lines.push(`  类型: ${targetItem.type} | 等级: Lv.${targetItem.level}`)
    const stats = { ...targetItem.base, ...targetItem.stats }
    const statStr = Object.entries(stats)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ')
    if (statStr) lines.push(`  基础属性: ${statStr}`)

    const sockets = targetItem.sockets || 1
    const gems = targetItem.gems || []
    lines.push(`  孔位: ${gems.length}/${sockets}`)
    for (let i = 0; i < gems.length; i++) {
      lines.push(`    💎 孔${i + 1}: ${getGemName(gems[i].type, gems[i].level || 1)}`)
    }
    for (let i = gems.length; i < sockets; i++) {
      lines.push(`    ⬜ 孔${i + 1}: [空]`)
    }

    const enchants = targetItem.enchants || []
    lines.push(`  附魔: ${enchants.length}/${MAX_ENCHANTS}`)
    const statNames = {
      damage_bonus: '攻击加成',
      hp_bonus: '生命加成',
      armor: '护甲',
      crit_rate: '暴击率',
      lifesteal: '吸血',
      exp_bonus: '经验加成',
      gold_bonus: '金币加成',
    }
    for (const e of enchants) {
      lines.push(`    ⚡ +${e.value} ${statNames[e.stat] || e.stat}`)
    }
    return lines.join('\n')
  }

  autoDismantle(item) {
    const quality = item.quality || '普通'
    const level = item.level || 1
    const setName = item.set_name || ''
    let stoneGain = 0
    let fragmentGain = 0
    switch (quality) {
      case '普通': stoneGain = 1; break
      case '精制': stoneGain = 2; break
      case '稀有': stoneGain = 3; break
      case '史诗': stoneGain = 5; fragmentGain = 1; break
      case '传说': stoneGain = 10; fragmentGain = 3; break
    }
    stoneGain += Math.floor(level / 10)
    const materials = this.save.materials || { enhance_stone: 0, set_fragments: {} }
    materials.enhance_stone = (materials.enhance_stone || 0) + stoneGain
    if (fragmentGain > 0 && setName) {
      materials.set_fragments = materials.set_fragments || {}
      materials.set_fragments[setName] = (materials.set_fragments[setName] || 0) + fragmentGain
    }
    this.save.materials = materials
    this.save.stats.total_dismantles = (this.save.stats.total_dismantles || 0) + 1
    const fragMsg = fragmentGain > 0 && setName ? ` + ${setName}碎片x${fragmentGain}` : ''
    return `🔨 自动分解 ${item.name} → 强化石x${stoneGain}${fragMsg}`
  }
}
