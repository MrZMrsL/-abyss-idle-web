import {
  QUALITY_RANK, ITEM_TYPES, SET_BONUSES,
  QUALITY_NAMES, QUALITY_EMOJI, BASE_ITEMS, PREFIX_POOL, SET_NAMES,
} from '../../data/items.js'
import { GEM_SOCKETS } from '../../data/gems.js'
import { SHOP_ITEMS, MAX_ENCHANTS } from '../../data/shop.js'
import { calcItemPrice, calcItemScore, randomId, randomInt } from '../utils/helpers.js'
import { MAX_INVENTORY, MAX_STORAGE } from '../utils/constants.js'

/**
 * 物品管理器 —— 负责装备生成、背包管理、装备穿脱、买卖、合成、整理。
 */
export class ItemManager {
  constructor(deps) {
    this.save = deps.save
    this.combat = deps.combatEngine
  }

  equipItem(itemId) {
    let item = null
    let idx = -1
    for (let i = 0; i < (this.save.inventory || []).length; i++) {
      if (this.save.inventory[i].id === itemId) {
        item = this.save.inventory[i]
        idx = i
        break
      }
    }
    if (!item) return '❌ 找不到该物品'
    const slot = item.type
    if (slot in this.save.equipped) {
      const old = this.save.equipped[slot]
      this.save.inventory.push(old)
    }
    this.save.equipped[slot] = item
    this.save.inventory.splice(idx, 1)
    return `✅ 装备上了 ${item.name}`
  }

  sellItem(itemId) {
    for (let i = 0; i < (this.save.inventory || []).length; i++) {
      const inv = this.save.inventory[i]
      if (inv.id === itemId) {
        const price = calcItemPrice(inv)
        this.save.stats.gold += price
        this.save.inventory.splice(i, 1)
        return `💰 卖出 ${inv.name} 获得 ${price}G`
      }
    }
    return '❌ 找不到该物品'
  }

  sellAll(maxQuality = '普通') {
    const maxRank = QUALITY_RANK[maxQuality] || 0
    const toSell = []
    const kept = []
    let totalGold = 0
    for (const item of this.save.inventory || []) {
      const itemRank = QUALITY_RANK[item.quality] || 0
      if (itemRank <= maxRank) {
        const price = calcItemPrice(item)
        totalGold += price
        toSell.push(item.name)
      } else {
        kept.push(item)
      }
    }
    this.save.inventory = kept
    this.save.stats.gold += totalGold
    if (toSell.length) {
      return `💰 卖出 ${toSell.length} 件装备 (最高${maxQuality})，共获得 ${totalGold}G`
    }
    return '📭 没有符合条件的装备可卖'
  }

  getInventory() {
    if (!(this.save.inventory || []).length) return '🎒 背包是空的'
    const lines = ['🎒 背包物品：']
    for (const item of this.save.inventory) {
      const stats = Object.entries({ ...item.base, ...item.stats })
        .filter(([, v]) => v !== 0)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ')
      lines.push(`  [${item.id}] ${item.name} (Lv.${item.level}) ${stats}`)
    }
    return lines.join('\n')
  }

  getInventoryConsumables() {
    const inv = this.save.consumables || {}
    if (!Object.keys(inv).length) return '🎒 没有消耗品'
    const lines = ['🎒 消耗品：']
    for (const [key, count] of Object.entries(inv)) {
      if (count > 0 && key in SHOP_ITEMS) {
        const item = SHOP_ITEMS[key]
        lines.push(`  [${key}] ${item.name} x${count} | ${item.effect}+${item.value}`)
      }
    }
    return lines.join('\n')
  }

  fuseItems(itemIds) {
    if (itemIds.length !== 3) return '❌ 合成需要恰好3件装备'
    const items = []
    for (const iid of itemIds) {
      let found = null
      for (let idx = 0; idx < (this.save.inventory || []).length; idx++) {
        if (this.save.inventory[idx].id === iid) {
          found = [idx, this.save.inventory[idx]]
          break
        }
      }
      if (!found) return `❌ 背包里没有 ${iid}`
      items.push(found)
    }
    const qualities = items.map((i) => i[1].quality)
    if (new Set(qualities).size !== 1) return `❌ 三件装备品质不同: ${qualities.join(', ')}`
    const q = qualities[0]
    if (q === '传说') return '❌ 传说装备已经是最高品质，无法合成'
    const qIdx = QUALITY_NAMES.indexOf(q)
    const newQuality = QUALITY_NAMES[qIdx + 1]
    const maxLevel = Math.max(...items.map((i) => i[1].level))
    const itemType = items[0][1].type
    for (const [idx] of items.sort((a, b) => b[0] - a[0])) {
      this.save.inventory.splice(idx, 1)
    }
    const newItem = this._generateItemInline(maxLevel + 2, newQuality)
    newItem.type = itemType
    newItem.name = `${newQuality}${QUALITY_EMOJI[newQuality]} ${itemType}`
    const base = { ...BASE_ITEMS[itemType] }
    for (const k of Object.keys(base)) {
      base[k] = Math.floor(base[k] * (1 + newItem.level * 0.1))
    }
    newItem.base = base
    this.save.inventory.push(newItem)
    this.save.stats.total_fuses = (this.save.stats.total_fuses || 0) + 1
    return `✨ 合成成功！${q}x3 → ${newQuality}！获得 ${newItem.name} (Lv.${newItem.level})`
  }

  organizeBag() {
    const inventory = this.save.inventory || []
    if (!inventory.length) return '🎒 背包是空的，无需整理'
    const settings = this.save.settings || {}
    const autoDismantle = settings.auto_dismantle_low_level !== false
    const threshold = settings.dismantle_level_threshold || 30
    const equippedSets = {}
    for (const item of Object.values(this.save.equipped || {})) {
      const sname = item.set_name
      if (sname) equippedSets[sname] = (equippedSets[sname] || 0) + 1
    }
    const bagSetCounts = {}
    for (const item of inventory) {
      const sname = item.set_name
      if (sname) bagSetCounts[sname] = (bagSetCounts[sname] || 0) + 1
    }
    const sold = []
    const dismantled = []
    const kept = []
    for (const item of inventory) {
      const quality = item.quality || '普通'
      const level = item.level || 1
      const itemType = item.type || ''
      const setName = item.set_name || ''
      if (quality === '普通' || quality === '精制') {
        const price = calcItemPrice(item)
        this.save.stats.gold += price
        sold.push(`${item.name} Lv.${level}`)
        continue
      }
      const equippedItem = this.save.equipped[itemType]
      const equippedLevel = equippedItem ? equippedItem.level : this.save.floor
      if (autoDismantle && level < equippedLevel - threshold) {
        const dismantleMsg = this._autoDismantleInline(item)
        dismantled.push(dismantleMsg)
        continue
      }
      const totalSetCount = (equippedSets[setName] || 0) + (bagSetCounts[setName] || 0)
      if (totalSetCount >= 4 && quality === '史诗' && level < equippedLevel - 10) {
        const dismantleMsg = this._autoDismantleInline(item)
        dismantled.push(dismantleMsg)
        continue
      }
      kept.push(item)
    }
    this.save.inventory = kept
    const lines = ['🧹 背包整理完成！']
    if (sold.length) lines.push(`💰 卖出 ${sold.length} 件装备`)
    if (dismantled.length) lines.push(`🔨 分解 ${dismantled.length} 件装备`)
    lines.push(`🎒 剩余 ${kept.length}/${MAX_INVENTORY}`)
    return lines.join('\n')
  }

  smartStore() {
    const inventory = this.save.inventory || []
    const storage = this.save.storage || []
    if (!inventory.length) return '🎒 背包是空的'
    const equippedLevels = {}
    for (const [slot, item] of Object.entries(this.save.equipped || {})) {
      equippedLevels[slot] = item.level || 1
    }
    const storageSetCounts = {}
    for (const item of storage) {
      const sname = item.set_name
      if (sname) storageSetCounts[sname] = (storageSetCounts[sname] || 0) + 1
    }
    const stored = []
    const kept = []
    for (const item of inventory) {
      const quality = item.quality || '普通'
      const level = item.level || 1
      const itemType = item.type || ''
      const setName = item.set_name || ''
      if (quality !== '史诗' && quality !== '传说') {
        kept.push(item)
        continue
      }
      const equippedLevel = equippedLevels[itemType] || 0
      if (quality === '传说' && level >= equippedLevel - 20) {
        if (storage.length < MAX_STORAGE) {
          storage.push(item)
          stored.push(`${item.name} Lv.${level} (${setName}套装)`)
          continue
        }
      }
      if (quality === '史诗' && setName) {
        const hasSetInEquipped = Object.values(this.save.equipped || {}).some(
          (eq) => eq.set_name === setName
        )
        const hasSetInStorage = setName in storageSetCounts
        if (hasSetInEquipped || hasSetInStorage) {
          if (storage.length < MAX_STORAGE) {
            storage.push(item)
            stored.push(`${item.name} Lv.${level} (${setName}套装)`)
            continue
          }
        }
      }
      kept.push(item)
    }
    this.save.inventory = kept
    this.save.storage = storage
    const lines = ['📦 智能存仓完成！']
    if (stored.length) {
      lines.push(`存入 ${stored.length} 件装备:`)
      for (const s of stored.slice(0, 10)) lines.push(`  ${s}`)
      if (stored.length > 10) lines.push(`  ... 等共${stored.length}件`)
    } else {
      lines.push('没有需要存仓的装备')
    }
    lines.push(`🎒 背包: ${kept.length}/${MAX_INVENTORY} | 📦 仓库: ${storage.length}/${MAX_STORAGE}`)
    return lines.join('\n')
  }

  getStorage() {
    const storage = this.save.storage || []
    if (!storage.length) return '📦 仓库是空的 (容量: 0/200)'
    const lines = [`📦 仓库物品 (${storage.length}/${MAX_STORAGE})：`]
    for (const item of storage) {
      const enh = item.enhance_level ? `+${item.enhance_level}` : ''
      lines.push(`  [${item.id}] ${item.name}${enh} Lv.${item.level}`)
    }
    return lines.join('\n')
  }

  toStorage(itemId) {
    const storage = this.save.storage || []
    if (storage.length >= MAX_STORAGE) return `❌ 仓库已满 (${MAX_STORAGE}/${MAX_STORAGE})`
    for (let i = 0; i < (this.save.inventory || []).length; i++) {
      const item = this.save.inventory[i]
      if (item.id === itemId) {
        storage.push(item)
        this.save.inventory.splice(i, 1)
        this.save.storage = storage
        return `📦 已将 ${item.name} 存入仓库`
      }
    }
    return `❌ 背包里没有 ${itemId}`
  }

  fromStorage(itemId) {
    const storage = this.save.storage || []
    if ((this.save.inventory || []).length >= MAX_INVENTORY) return `❌ 背包已满 (${MAX_INVENTORY}/${MAX_INVENTORY})`
    for (let i = 0; i < storage.length; i++) {
      const item = storage[i]
      if (item.id === itemId) {
        this.save.inventory.push(item)
        storage.splice(i, 1)
        this.save.storage = storage
        return `🎒 已从仓库取出 ${item.name}`
      }
    }
    return `❌ 仓库里没有 ${itemId}`
  }

  autoEquipIfBetter(item) {
    if (!this.save.settings.auto_equip_better) return false
    const slot = item.type
    const current = this.save.equipped[slot]
    if (!current) {
      this.save.equipped[slot] = item
      return true
    }
    const newScore = calcItemScore(item, this.save.equipped, SET_BONUSES)
    const oldScore = calcItemScore(current, this.save.equipped, SET_BONUSES)
    if (newScore > oldScore) {
      this.save.inventory.push(current)
      const oldEl = current.enhance_level || 0
      const newEl = item.enhance_level || 0
      if (oldEl > newEl) {
        item.enhance_level = oldEl
        if (newEl > 0) {
          const refund = Math.floor((newEl * (newEl + 1)) / 2 / 2)
          if (refund > 0) {
            const mats = this.save.materials || { enhance_stone: 0, set_fragments: {} }
            mats.enhance_stone = (mats.enhance_stone || 0) + refund
            this.save.materials = mats
          }
        }
      }
      const oldGems = current.gems || []
      const newSockets = item.sockets || 1
      if (oldGems.length && newSockets > (item.gems || []).length) {
        const transferred = []
        for (const gem of oldGems) {
          if (transferred.length < newSockets) transferred.push(gem)
        }
        item.gems = transferred
      }
      const oldEnchants = current.enchants || []
      const maxE = MAX_ENCHANTS
      const currentEnchants = item.enchants || []
      if (oldEnchants.length && currentEnchants.length < maxE) {
        const combined = [...currentEnchants]
        for (const enchant of oldEnchants) {
          if (combined.length < maxE) combined.push(enchant)
        }
        item.enchants = combined
      }
      this.save.equipped[slot] = item
      return true
    }
    return false
  }

  _generateItemInline(floor, qualityOverride = null, onlineBonus = false) {
    const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)]
    const base = { ...BASE_ITEMS[itemType] }
    let quality
    if (qualityOverride) {
      quality = qualityOverride
    } else {
      let weights = [
        Math.max(0, 50 - floor * 2),
        Math.max(0, 40 - floor),
        Math.max(5, floor * 2),
        Math.max(1, floor),
        Math.max(0, floor - 20),
        0,
      ]
      if (onlineBonus) {
        const shifted = [0, 0, 0, 0, 0, 0]
        for (let i = 5; i > 0; i--) {
          shifted[i] = weights[i - 1]
        }
        shifted[0] = Math.max(1, Math.floor(weights[0] / 2))
        weights = shifted
        if (floor >= 200) weights[5] = Math.max(weights[5], Math.floor((floor - 200) / 15))
        if (floor >= 300) weights[5] += Math.floor((floor - 300) / 10)
        if (floor >= 500) weights[5] += Math.floor((floor - 500) / 5)
      } else {
        if (floor >= 300) weights[5] = Math.max(0, Math.floor((floor - 300) / 10))
        if (floor >= 500) weights[5] += Math.floor((floor - 500) / 5)
      }
      weights = weights.map((w) => Math.max(1, w))
      quality = weightedRandom(QUALITY_NAMES, weights)
    }
    const itemLevel = Math.max(1, floor + randomInt(-2, 3))
    const stats = {}
    if (quality in PREFIX_POOL) {
      for (const [stat, [mn, mx]] of Object.entries(PREFIX_POOL[quality])) {
        stats[stat] = randomInt(mn, mx) + Math.floor(itemLevel / 5)
      }
    }
    for (const k of Object.keys(base)) {
      base[k] = Math.floor(base[k] * (1 + itemLevel * 0.1))
    }
    let sockets = GEM_SOCKETS[quality] || 1
    let setName
    if (quality === '神话') {
      sockets = 6
      const mythicSets = ['龙王', '神谕', '虚空']
      setName = mythicSets[Math.floor(Math.random() * mythicSets.length)]
    } else {
      setName = SET_NAMES[Math.floor(Math.random() * SET_NAMES.length)]
    }
    return {
      id: randomId(),
      name: `${quality}${QUALITY_EMOJI[quality]} ${itemType}`,
      type: itemType,
      quality,
      level: itemLevel,
      enhance_level: 0,
      base,
      stats,
      sockets,
      gems: [],
      enchants: [],
      set_name: setName,
    }
  }

  _autoDismantleInline(item) {
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
