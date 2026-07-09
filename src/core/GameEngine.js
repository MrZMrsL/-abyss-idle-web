import {
  PREFIX_POOL,
  QUALITY_NAMES,
  QUALITY_EMOJI,
  QUALITY_RANK,
  ITEM_TYPES,
  BASE_ITEMS,
  SET_NAMES,
  SET_BONUSES,
} from '../data/items.js'
import { MONSTER_TEMPLATES, BOSS_TEMPLATES } from '../data/monsters.js'
import { SKILL_TREE } from '../data/skills.js'
import {
  PET_TEMPLATES,
  PET_UPGRADE_COST,
  PET_EGG_SHOP,
  WILD_PET_CHANCE,
  WILD_PET_TURN_LIMIT,
} from '../data/pets.js'
import { GEM_TYPES, GEM_SOCKETS, getGemName, calcGemValue } from '../data/gems.js'
import { SHOP_ITEMS, ENCHANT_POOL, MAX_ENCHANTS } from '../data/shop.js'
import { ACHIEVEMENTS } from '../data/achievements.js'
import { DAILY_QUEST_TEMPLATES } from '../data/dailyQuests.js'
import { randomInt, weightedRandom, todayISO, nowISO, calcItemPrice, calcItemScore, randomId } from './utils/helpers.js'

/**
 * Browser-friendly JavaScript port of the Python idle RPG game engine.
 *
 * The engine owns a `save` object whose structure is kept identical to the
 * Python save.json so old saves can be imported. No file-system operations are
 * performed; callers persist the returned save object themselves.
 */
export class GameEngine {
  /**
   * @param {string} [playerName='冒险者'] Name used when creating a new save.
   * @param {object|null} [saveData=null] Existing save object (will be migrated).
   */
  constructor(playerName = '冒险者', saveData = null) {
    this.playerName = playerName
    this.save = saveData ? this._migrateSave(saveData) : this._createNewSave()
  }

  /**
   * Create an engine instance from a raw JSON save object.
   * @param {object} saveData
   * @param {string} [playerName='冒险者']
   * @returns {GameEngine}
   */
  static fromSave(saveData, playerName = '冒险者') {
    return new GameEngine(playerName, saveData)
  }

  /**
   * Return the current save object for external persistence.
   * @returns {object}
   */
  getSave() {
    return this.save
  }

  /**
   * Replace the active save with an external one and run migrations.
   * @param {object} saveData
   */
  setSave(saveData) {
    this.save = this._migrateSave(saveData)
  }

  /**
   * Return the save object as a JSON string.
   * @returns {string}
   */
  toJSON() {
    return JSON.stringify(this.save)
  }

  /**
   * No-op in browser context. Persistence is handled by the caller via getSave().
   */
  saveGame() {
    // Browser-only engine: the caller persists getSave() however it wants.
  }

  // ============================================================
  // Save management
  // ============================================================

  /**
   * Migrate an old save object to the current schema.
   * @param {object} data
   * @returns {object}
   */
  _migrateSave(data) {
    // Deep clone to avoid mutating the caller's object unexpectedly.
    const save = JSON.parse(JSON.stringify(data))

    // 单宠物 -> 宠物列表
    if ('pet' in save && save.pet != null && !('pets' in save)) {
      save.pets = [save.pet]
      save.active_pet_idx = 0
      delete save.pet
    }
    if (!('pets' in save)) save.pets = []
    if (!('active_pet_idx' in save)) save.active_pet_idx = 0

    if (!('storage' in save)) save.storage = []
    if (!('materials' in save)) {
      save.materials = { enhance_stone: 0, set_fragments: {} }
    }
    if (!('daily_quests' in save)) {
      save.daily_quests = {
        reset_at: save.created_at || nowISO(),
        quests: {},
        completed: [],
      }
    }
    if (!('settings' in save)) save.settings = {}
    if (!('auto_use_potion' in save.settings)) save.settings.auto_use_potion = true

    if (!('stats' in save)) save.stats = {}
    for (const statKey of ['total_enhances', 'total_dismantles']) {
      if (!(statKey in save.stats)) save.stats[statKey] = 0
    }

    // 给已有装备加上 enhance_level 字段
    const allItems = [...(save.inventory || []), ...Object.values(save.equipped || {})]
    for (const item of allItems) {
      if (!('enhance_level' in item)) item.enhance_level = 0
    }

    return save
  }

  /**
   * Create a brand-new save object.
   * @returns {object}
   */
  _createNewSave() {
    const now = nowISO()
    return {
      player_name: this.playerName,
      created_at: now,
      last_tick: now,
      stats: {
        level: 1,
        exp: 0,
        exp_to_next: 100,
        str: 10,
        agi: 10,
        int: 10,
        vit: 10,
        hp: 100,
        max_hp: 100,
        mp: 50,
        max_mp: 50,
        gold: 0,
        total_kills: 0,
        total_gold_earned: 0,
        deaths: 0,
        boss_kills: 0,
        consecutive_wins: 0,
        max_consecutive_wins: 0,
        total_potions_used: 0,
        total_shop_buys: 0,
        total_fuses: 0,
        total_gems_inserted: 0,
        total_gems_fused: 0,
        total_enchants: 0,
        total_skill_points_earned: 0,
        total_enhances: 0,
        total_dismantles: 0,
      },
      floor: 1,
      stage: 1,
      mode: 'idle',
      inventory: [],
      equipped: {},
      achievements: {},
      log: [],
      settings: {
        auto_sell_white: true,
        auto_equip_better: true,
        auto_use_potion: true,
        auto_dismantle_low_level: true,
        dismantle_level_threshold: 30,
      },
      skills: {},
      skill_points: 0,
      consumables: {},
      gems: {},
      pets: [],
      active_pet_idx: 0,
      pet_eggs: [],
      pending_pet: null,
      storage: [],
      materials: {
        enhance_stone: 0,
        set_fragments: {},
      },
      daily_quests: {
        reset_at: now,
        quests: {},
        completed: [],
      },
    }
  }

  // ============================================================
  // Internal helpers
  // ============================================================

  /**
   * Auto dismantle an item into materials.
   * @param {object} item
   * @returns {string} Dismantle report message.
   */
  _autoDismantle(item) {
    const quality = item.quality || '普通'
    const level = item.level || 1
    const setName = item.set_name || ''

    let stoneGain = 0
    let fragmentGain = 0

    switch (quality) {
      case '普通':
        stoneGain = 1
        break
      case '精制':
        stoneGain = 2
        break
      case '稀有':
        stoneGain = 3
        break
      case '史诗':
        stoneGain = 5
        fragmentGain = 1
        break
      case '传说':
        stoneGain = 10
        fragmentGain = 3
        break
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

  /**
   * Automatically equip a new item if it scores higher than the current one.
   * @param {object} item
   * @returns {boolean} Whether the item was equipped.
   */
  _autoEquipIfBetter(item) {
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

      // 继承强化
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

      // 继承宝石
      const oldGems = current.gems || []
      const newSockets = item.sockets || 1
      if (oldGems.length && newSockets > (item.gems || []).length) {
        const transferred = []
        for (const gem of oldGems) {
          if (transferred.length < newSockets) transferred.push(gem)
        }
        item.gems = transferred
      }

      // 继承附魔
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

  /**
   * Use the best available healing potion automatically.
   * @returns {string} Empty string if no potion was used.
   */
  _autoUsePotion() {
    const inv = this.save.consumables || {}
    const s = this.save.stats
    const combat = this._calcCombatStats()
    const maxHp = combat.max_hp
    const missing = maxHp - s.hp

    if (missing <= 0) return ''

    const potionOrder = [
      ['hp_potion_l', 1500],
      ['hp_potion_m', 600],
      ['hp_potion_s', 200],
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

  /**
   * Calculate the player's actual combat stats.
   * @returns {object}
   */
  _calcCombatStats() {
    const s = this.save.stats
    const base = {
      damage: s.str * 2 + s.level * 3,
      armor: s.vit * 1 + s.level * 1,
      max_hp: s.max_hp + s.vit * 10,
      max_mp: s.max_mp + s.int * 5,
      crit_rate: 5,
      crit_dmg: 0.5,
      lifesteal: 0,
      exp_bonus: 0,
      gold_bonus: 0,
      damage_mult: 1.0,
      armor_flat: 0,
      armor_penalty: 0,
    }

    // 装备属性
    for (const slot of Object.keys(this.save.equipped || {})) {
      const item = this.save.equipped[slot]

      // 宝石
      for (const gem of item.gems || []) {
        const gemType = gem.type
        const gemLevel = gem.level || 1
        const effectKey = (GEM_TYPES[gemType] || {}).effect
        if (effectKey) {
          const val = calcGemValue(gemType, gemLevel)
          if (gemType === 'diamond') {
            base.damage_bonus = (base.damage_bonus || 0) + val
            base.armor = (base.armor || 0) + val
            base.max_hp = (base.max_hp || 0) + val * 3
            base.crit_rate = (base.crit_rate || 0) + Math.floor(val / 2)
            base.lifesteal = (base.lifesteal || 0) + Math.floor(val / 3)
          } else {
            base[effectKey] = (base[effectKey] || 0) + val
          }
        }
      }

      // 装备附加属性
      for (const [k, v] of Object.entries(item.stats || {})) {
        if (k in base) base[k] += v
        else if (k === 'damage_bonus') base.damage += v
        else if (k === 'hp_bonus') base.max_hp += v
      }

      // 装备基础属性
      for (const [k, v] of Object.entries(item.base || {})) {
        if (k === 'damage') base.damage += v
        else if (k === 'armor') base.armor += v
        else if (k === 'hp') base.max_hp += v
      }
    }

    // 技能属性
    for (const skillId of Object.keys(this.save.skills || {})) {
      if (skillId in SKILL_TREE) {
        const effect = SKILL_TREE[skillId].effect
        for (const [k, v] of Object.entries(effect)) {
          if (k in base) base[k] += v
        }
      }
    }

    // 附魔属性
    for (const slot of Object.keys(this.save.equipped || {})) {
      const item = this.save.equipped[slot]
      for (const enchant of item.enchants || []) {
        const k = enchant.stat
        const v = enchant.value || 0
        if (k in base) base[k] += v
        else if (k === 'damage_bonus') base.damage += v
        else if (k === 'hp_bonus') base.max_hp += v
      }
    }

    // 套装加成
    const setCounts = {}
    for (const slot of Object.keys(this.save.equipped || {})) {
      const item = this.save.equipped[slot]
      const sname = item.set_name
      if (sname) setCounts[sname] = (setCounts[sname] || 0) + 1
    }

    for (const [sname, count] of Object.entries(setCounts)) {
      if (sname in SET_BONUSES) {
        const bonuses = SET_BONUSES[sname]
        const thresholds = Object.keys(bonuses)
          .map(Number)
          .sort((a, b) => b - a)
        for (const threshold of thresholds) {
          if (count >= threshold) {
            for (const [k, v] of Object.entries(bonuses[threshold])) {
              if (k in base) {
                if (typeof v === 'number' && v < 2 && v > 0) {
                  base[k] = Math.floor(base[k] * v)
                } else {
                  base[k] += v
                }
              } else if (k === 'damage_mult') {
                base.damage = Math.floor(base.damage * v)
              } else if (k === 'hp_bonus') {
                base.max_hp += v
              }
            }
            break
          }
        }
      }
    }

    // 连杀奖励
    const streak = s.consecutive_wins || 0
    if (streak >= 50) {
      const streakCrit = Math.floor(streak / 50)
      base.crit_rate += streakCrit
      base.streak_bonus_desc = `连杀${streak} (+${streakCrit}%暴击)`
    }
    if (streak >= 100) {
      const streakMult = 1 + Math.floor(streak / 100) * 0.05
      base.damage_mult *= streakMult
      base.gold_bonus = (base.gold_bonus || 0) + Math.floor(streak / 100) * 5
      base.exp_bonus = (base.exp_bonus || 0) + Math.floor(streak / 100) * 5
    }

    // 宠物加成
    const pets = this.save.pets || []
    const activeIdx = this.save.active_pet_idx || 0
    const pet = pets.length && activeIdx >= 0 && activeIdx < pets.length ? pets[activeIdx] : null
    if (pet) {
      const petLevel = pet.level || 1
      const petTemplate = PET_TEMPLATES[pet.template] || {}
      const baseGrowth = petTemplate.growth || 2
      const baseDmg = petTemplate.base_dmg || 3
      const petDmg = Math.floor(baseDmg + baseGrowth * (petLevel - 1))
      base.damage += petDmg

      const passive = petTemplate.passive || ''
      const pval = petTemplate.passive_val || 0
      if (passive) {
        base[passive] = (base[passive] || 0) + pval * petLevel
      }
      base.pet_desc = `${petTemplate.icon || '🐾'}${petTemplate.name || '宠物'} Lv.${petLevel} (+${petDmg}攻)`
    }

    // 应用乘数和修正
    base.damage = Math.floor(base.damage * base.damage_mult)
    base.armor = base.armor + base.armor_flat - base.armor_penalty
    base.armor = Math.max(0, base.armor)
    base.hp = Math.min(s.hp, base.max_hp)

    return base
  }
  // ============================================================
  // Generation
  // ============================================================

  /**
   * Generate a piece of equipment.
   * @param {number} floor
   * @param {string|null} [qualityOverride=null]
   * @param {boolean} [onlineBonus=false]
   * @returns {object}
   */
  generateItem(floor, qualityOverride = null, onlineBonus = false) {
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

    const item = {
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
    return item
  }

  /**
   * Generate a monster for the given floor.
   * @param {number} floor
   * @param {boolean} [isBoss=false]
   * @returns {object}
   */
  generateMonster(floor, isBoss = false) {
    if (isBoss && floor <= 1) isBoss = false

    if (isBoss) {
      const eligible = BOSS_TEMPLATES.filter(
        (b) => (b.floor_min || 0) <= floor && floor <= (b.floor_max || 9999)
      )
      const template = eligible.length ? eligible[Math.floor(Math.random() * eligible.length)] : BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)]
      const base = MONSTER_TEMPLATES[Math.floor(Math.random() * MONSTER_TEMPLATES.length)]
      const name = (template.icon || '👑') + ' ' + template.name
      const hp = Math.floor(base.base_hp * template.hp_mult * (1 + floor * 0.18))
      const dmg = Math.floor(base.base_dmg * template.dmg_mult * (1 + floor * 0.15))
      const exp = Math.floor(base.exp * template.exp_mult * (1 + floor * 0.2))
      const gold = Math.floor(base.gold * template.gold_mult * (1 + floor * 0.15))
      return { name, hp, max_hp: hp, damage: dmg, exp, gold, is_boss: true }
    } else {
      const available = MONSTER_TEMPLATES.slice(0, Math.min(floor + 2, MONSTER_TEMPLATES.length))
      const template = available[Math.floor(Math.random() * available.length)]
      const hp = Math.floor(template.base_hp * (1 + floor * 0.15))
      const dmg = Math.floor(template.base_dmg * (1 + floor * 0.12))
      const exp = Math.floor(template.exp * (1 + floor * 0.12))
      const gold = Math.floor(template.gold * (1 + floor * 0.1))
      return { name: template.name, hp, max_hp: hp, damage: dmg, exp, gold, is_boss: false }
    }
  }

  // ============================================================
  // Battle
  // ============================================================

  /**
   * Fight a single monster.
   * @param {object} monster
   * @returns {[boolean, string]} [won, log message]
   */
  _doBattle(monster) {
    const combat = this._calcCombatStats()
    let playerHp = combat.hp
    let monsterHp = monster.hp
    const logLines = []

    let roundNum = 0
    while (playerHp > 0 && monsterHp > 0 && roundNum < 100) {
      roundNum += 1

      // 玩家攻击
      let dmg = combat.damage + randomInt(-Math.floor(combat.damage / 10), Math.floor(combat.damage / 10))
      dmg = Math.max(1, dmg)

      const crit = Math.random() * 100 < combat.crit_rate
      if (crit) {
        dmg = Math.floor(dmg * (1.5 + (combat.crit_dmg || 0.5)))
      }

      monsterHp -= dmg

      // 吸血
      const heal = Math.floor((dmg * (combat.lifesteal || 0)) / 100)
      playerHp = Math.min(playerHp + heal, combat.max_hp)

      let action = `⚔️ 你攻击${crit ? '暴击!' : ''}造成${dmg}伤害`
      if (heal > 0) action += `(吸血+${heal})`

      if (monsterHp <= 0) {
        logLines.push(action)
        break
      }

      // 怪物攻击
      let mDmg = monster.damage + randomInt(-Math.floor(monster.damage / 10), Math.floor(monster.damage / 10))
      mDmg = Math.max(1, mDmg)
      const reduction = combat.armor / (combat.armor + 50 + (monster.level || 0) * 5)
      mDmg = Math.floor(mDmg * (1 - reduction))
      playerHp -= mDmg

      logLines.push(`${action} | ${monster.name}反击造成${mDmg}伤害`)
    }

    // 自动喝药（战斗中）
    if (playerHp > 0 && playerHp <= combat.max_hp * 0.25) {
      if (this.save.settings.auto_use_potion) {
        const potionMsg = this._autoUsePotion()
        if (potionMsg) {
          playerHp = this.save.stats.hp
        }
      }
    }

    this.save.stats.hp = Math.max(0, playerHp)

    if (playerHp > 0) {
      // 胜利
      const expGain = Math.floor(monster.exp * (1 + (combat.exp_bonus || 0) / 100))
      const goldGain = Math.floor(monster.gold * (1 + (combat.gold_bonus || 0) / 100))
      const s = this.save.stats
      s.exp += expGain
      s.gold += goldGain
      s.total_gold_earned += goldGain
      s.total_kills += 1
      s.consecutive_wins += 1
      if (s.consecutive_wins > s.max_consecutive_wins) s.max_consecutive_wins = s.consecutive_wins
      if (monster.is_boss) s.boss_kills += 1

      // 宠物遭遇判定
      const petEncounter = this._tryPetEncounter()

      // 掉落装备
      const drops = []
      const online = this.save.online_mode || false
      if (monster.is_boss) {
        if (online) {
          drops.push(this.generateItem(this.save.floor, '史诗', true))
          if (Math.random() < 0.4) drops.push(this.generateItem(this.save.floor, '传说', true))
        } else {
          drops.push(this.generateItem(this.save.floor, '稀有'))
          if (Math.random() < 0.3) drops.push(this.generateItem(this.save.floor, '史诗'))
        }
      } else {
        const dropChance = online ? 0.5 : 0.3
        if (Math.random() < dropChance) {
          drops.push(this.generateItem(this.save.floor, null, online))
        }
      }

      // 自动卖白装 + 自动装备更好的
      const kept = []
      const autoEquipped = []
      for (const d of drops) {
        if (this.save.settings.auto_sell_white && d.quality === '普通') {
          this.save.stats.gold += 10
        } else {
          if (this._autoEquipIfBetter(d)) {
            autoEquipped.push(d.name)
          } else {
            const settings = this.save.settings || {}
            const autoDismantle = settings.auto_dismantle_low_level || false
            const threshold = settings.dismantle_level_threshold || 30

            if (autoDismantle && (d.quality === '史诗' || d.quality === '传说')) {
              const equippedItem = this.save.equipped[d.type]
              const equippedLevel = equippedItem ? equippedItem.level : this.save.floor
              if (d.level < equippedLevel - threshold) {
                const dismantleMsg = this._autoDismantle(d)
                kept.push({ _dismantle: dismantleMsg })
                continue
              }
            }

            if ((this.save.inventory || []).length < 50) {
              kept.push(d)
            } else {
              this.save.stats.gold += calcItemPrice(d, 5)
            }
          }
        }
      }

      this.save.inventory.push(...kept)

      // 升级检查
      const levelUpLog = this._checkLevelUp()

      let result = `✅ 击败 ${monster.name}! +${expGain}EXP +${monster.gold}G`
      if (kept.length || autoEquipped.length) {
        const parts = []
        if (autoEquipped.length) parts.push(`自动装备: ${autoEquipped.join(', ')}`)
        const realDrops = kept.filter((d) => !('_dismantle' in d))
        const dismantleMsgs = kept.filter((d) => '_dismantle' in d).map((d) => d._dismantle)
        if (realDrops.length) parts.push(`掉落: ${realDrops.map((d) => d.name).join(', ')}`)
        if (dismantleMsgs.length) parts.push(dismantleMsgs.join('\n'))
        result += `\n🎁 ${parts.join(' | ')}`
      }
      if (levelUpLog) result += `\n${levelUpLog}`

      if (petEncounter) {
        result += `\n🐾 遭遇野生宠物 [${petEncounter.icon}${petEncounter.name}]! 使用 catch 命令尝试驯服`
      }

      const achLogs = this._checkAchievements()
      if (achLogs.length) result += '\n' + achLogs.join('\n')

      // 追踪每日任务
      this._checkDailyReset()
      this._trackQuest('kill_50', 1)
      if (monster.is_boss) this._trackQuest('kill_10_boss', 1)
      if ((this.save.stats.consecutive_wins || 0) >= 50) this._trackQuest('streak_50', 1)
      const dq = this.save.daily_quests || {}
      const startFloor = dq.start_floor || this.save.floor
      if (this.save.floor - startFloor >= 10) {
        this._trackQuest('reach_floor', this.save.floor - startFloor)
      }

      this._addBattleLog(true, monster.name, `+${monster.exp}EXP +${monster.gold}G`)
      return [true, result]
    } else {
      // 死亡
      const s = this.save.stats
      s.deaths += 1
      const oldStreak = s.consecutive_wins
      s.consecutive_wins = 0
      const goldLoss = Math.floor(s.gold * 0.1)
      s.gold -= goldLoss
      s.hp = Math.floor(s.max_hp / 2)

      let unequipMsg = ''
      const equippedKeys = Object.keys(this.save.equipped || {})
      if (equippedKeys.length) {
        const slot = equippedKeys[Math.floor(Math.random() * equippedKeys.length)]
        const dropped = this.save.equipped[slot]
        delete this.save.equipped[slot]
        this.save.inventory.push(dropped)
        unequipMsg = `，${slot}「${dropped.name}」被击落到背包`
      }

      let expPenalty = 0
      if (oldStreak >= 100) {
        expPenalty = Math.floor(s.exp * 0.05)
        s.exp = Math.max(0, s.exp - expPenalty)
      }

      let deathMsg = `💀 你被${monster.name}击败！损失${goldLoss}G${unequipMsg}`
      if (expPenalty) deathMsg += `，连杀${oldStreak}清零(-${expPenalty}EXP)`
      else deathMsg += `，连杀清零`
      deathMsg += '，回城恢复中...'

      this._addBattleLog(false, monster.name, `死亡(连杀${oldStreak})`)
      return [false, deathMsg]
    }
  }

  /**
   * Check and apply level-ups.
   * @returns {string} Level-up log (may contain multiple lines).
   */
  _checkLevelUp() {
    const s = this.save.stats
    let log = ''
    while (s.exp >= s.exp_to_next) {
      s.exp -= s.exp_to_next
      s.level += 1
      s.exp_to_next = Math.floor(100 * 1.2 ** s.level)
      s.str += randomInt(1, 3)
      s.agi += randomInt(1, 3)
      s.int += randomInt(1, 3)
      s.vit += randomInt(1, 3)
      s.max_hp += s.vit * 2 + 10
      s.max_mp += s.int * 2 + 5
      s.hp = s.max_hp
      s.mp = s.max_mp
      if (s.level % 5 === 0) {
        this.save.skill_points = (this.save.skill_points || 0) + 1
        s.total_skill_points_earned = (s.total_skill_points_earned || 0) + 1
        log += `🆙 升级了！Lv.${s.level} (STR+ AGI+ INT+ VIT+) 🧠 技能点+1\n`
      } else {
        log += `🆙 升级了！Lv.${s.level} (STR+ AGI+ INT+ VIT+)\n`
      }
    }
    return log.trim()
  }

  /**
   * Check all achievements and unlock newly met ones.
   * @returns {string[]} Array of unlock messages.
   */
  _checkAchievements() {
    const s = this.save.stats
    const combat = this._calcCombatStats()
    const achLogs = []

    const unlock = (key) => {
      if (!(key in this.save.achievements)) {
        this.save.achievements[key] = true
        const ach = ACHIEVEMENTS[key]
        this.save.stats.gold += ach.reward_gold
        achLogs.push(`🏆 解锁成就「${ach.name}」! ${ach.desc} +${ach.reward_gold}G`)
      }
    }

    // 战斗类
    if (s.total_kills >= 1) unlock('first_blood')
    if (s.total_kills >= 10) unlock('kill_10')
    if (s.total_kills >= 50) unlock('kill_50')
    if (s.total_kills >= 100) unlock('kill_100')
    if (s.total_kills >= 500) unlock('kill_500')
    if (s.total_kills >= 1000) unlock('kill_1000')
    if (s.total_kills >= 5000) unlock('kill_5000')
    if (s.boss_kills >= 1) unlock('first_boss')
    if (s.boss_kills >= 5) unlock('boss_5')
    if (s.boss_kills >= 20) unlock('boss_20')
    if (s.boss_kills >= 100) unlock('boss_100')
    if (s.max_consecutive_wins >= 10) unlock('streak_10')
    if (s.max_consecutive_wins >= 50) unlock('streak_50')
    if (s.max_consecutive_wins >= 100) unlock('streak_100')
    if (s.deaths >= 1) unlock('first_death')
    if (s.deaths >= 10) unlock('die_10')

    // 等级成长类
    if (s.level >= 10) unlock('level_10')
    if (s.level >= 25) unlock('level_25')
    if (s.level >= 50) unlock('level_50')
    if (s.level >= 75) unlock('level_75')
    if (s.level >= 100) unlock('level_100')
    if (s.level >= 150) unlock('level_150')
    if (s.level >= 200) unlock('level_200')

    // 属性成长类
    if (combat.max_hp >= 500) unlock('hp_500')
    if (combat.max_hp >= 1000) unlock('hp_1000')
    if (combat.max_hp >= 2000) unlock('hp_2000')
    if (combat.max_hp >= 5000) unlock('hp_5000')
    if (combat.damage >= 100) unlock('dmg_100')
    if (combat.damage >= 300) unlock('dmg_300')
    if (combat.damage >= 500) unlock('dmg_500')
    if (combat.damage >= 1000) unlock('dmg_1000')
    if (combat.armor >= 50) unlock('armor_50')
    if (combat.armor >= 100) unlock('armor_100')
    if (combat.armor >= 200) unlock('armor_200')
    if (combat.armor >= 500) unlock('armor_500')
    if (combat.crit_rate >= 30) unlock('crit_30')
    if (combat.crit_rate >= 50) unlock('crit_50')
    if (combat.crit_rate >= 70) unlock('crit_70')
    if (combat.crit_rate >= 90) unlock('crit_90')

    // 探索类
    if (this.save.floor >= 5) unlock('floor_5')
    if (this.save.floor >= 10) unlock('floor_10')
    if (this.save.floor >= 20) unlock('floor_20')
    if (this.save.floor >= 30) unlock('floor_30')
    if (this.save.floor >= 50) unlock('floor_50')
    if (this.save.floor >= 80) unlock('floor_80')
    if (this.save.floor >= 100) unlock('floor_100')

    // 财富类
    if (s.gold >= 1000) unlock('gold_1k')
    if (s.gold >= 10000) unlock('gold_10k')
    if (s.gold >= 50000) unlock('gold_50k')
    if (s.gold >= 100000) unlock('gold_100k')
    if (s.gold >= 500000) unlock('gold_500k')
    if (s.gold >= 1000000) unlock('gold_1m')
    if (s.total_gold_earned >= 10000) unlock('earn_total_10k')
    if (s.total_gold_earned >= 100000) unlock('earn_total_100k')
    if (s.total_gold_earned >= 1000000) unlock('earn_total_1m')

    // 装备类
    const allInvAndEq = [...(this.save.inventory || []), ...Object.values(this.save.equipped || {})]
    if (allInvAndEq.some((i) => i.quality === '稀有')) unlock('first_blue')
    if (allInvAndEq.some((i) => i.quality === '史诗')) unlock('first_purple')
    if (allInvAndEq.some((i) => i.quality === '传说')) unlock('first_orange')

    const equipped = this.save.equipped || {}
    const equippedItems = Object.values(equipped)
    if (equippedItems.length >= 7) unlock('equip_full')

    if (equippedItems.length >= 7 && equippedItems.every((i) => i.quality === '史诗' || i.quality === '传说')) {
      unlock('full_epic')
    }
    if (equippedItems.length >= 7 && equippedItems.every((i) => i.quality === '传说')) {
      unlock('full_legend')
    }

    if ((s.total_gems_inserted || 0) >= 1) unlock('insert_gem_1')
    if ((s.total_gems_inserted || 0) >= 10) unlock('insert_gem_10')
    if ((s.total_gems_inserted || 0) >= 50) unlock('insert_gem_50')
    if ((s.total_gems_fused || 0) >= 10) unlock('fuse_gem_10')
    if ((s.total_gems_fused || 0) >= 50) unlock('fuse_gem_50')
    if ((s.total_enchants || 0) >= 1) unlock('enchant_1')
    if ((s.total_enchants || 0) >= 10) unlock('enchant_10')
    if ((s.total_enchants || 0) >= 30) unlock('enchant_30')

    // 生活类
    if ((s.total_potions_used || 0) >= 1) unlock('first_potion')
    if ((s.total_potions_used || 0) >= 10) unlock('potion_10')
    if ((s.total_potions_used || 0) >= 100) unlock('potion_100')
    if ((s.total_shop_buys || 0) >= 1) unlock('first_shop')
    if ((s.total_shop_buys || 0) >= 10) unlock('shop_10')
    if ((s.total_shop_buys || 0) >= 100) unlock('shop_100')
    if ((s.total_fuses || 0) >= 1) unlock('first_fuse')
    if ((s.total_fuses || 0) >= 10) unlock('fuse_10')
    if ((s.total_fuses || 0) >= 50) unlock('fuse_50')

    const skills = this.save.skills || {}
    if (Object.keys(skills).length >= 1) unlock('first_skill')
    if (Object.keys(skills).length >= 5) unlock('skill_5')
    if (Object.keys(skills).length >= Object.keys(SKILL_TREE).length) unlock('skill_all')
    if ((s.total_skill_points_earned || 0) >= 10) unlock('skill_point_10')

    // 套装类
    const setCounts = {}
    for (const item of equippedItems) {
      const sname = item.set_name
      if (sname) setCounts[sname] = (setCounts[sname] || 0) + 1
    }
    if (Object.values(setCounts).some((c) => c >= 2)) unlock('activate_2set')
    if (Object.values(setCounts).some((c) => c >= 4)) unlock('activate_4set')
    const fourSetCount = Object.values(setCounts).filter((c) => c >= 4).length
    if (fourSetCount >= 2) unlock('activate_4set_x2')

    // 宠物类
    const pets = this.save.pets || []
    if (pets.length > 0) unlock('pet_1')
    if (pets.length) {
      const maxLv = Math.max(...pets.map((p) => p.level || 1))
      if (maxLv >= 10) unlock('pet_level_10')
      if (maxLv >= 50) unlock('pet_level_50')
      if (pets.some((p) => (p.extra_passives || []).length > 0)) unlock('pet_dual_passive')
    }

    const totalPetFuses = this.save.total_pet_fuses || 0
    if (totalPetFuses >= 1) unlock('pet_fuse_1')
    if (totalPetFuses >= 10) unlock('pet_fuse_10')

    // 终局成就
    if (allInvAndEq.some((i) => i.quality === '神话')) unlock('first_mythic')
    if (equippedItems.length >= 7 && equippedItems.every((i) => i.quality === '神话')) unlock('full_mythic')

    const mythicSetCounts = {}
    for (const item of equippedItems) {
      const sname = item.set_name
      if (sname) mythicSetCounts[sname] = (mythicSetCounts[sname] || 0) + 1
    }
    for (const [sname, count] of Object.entries(mythicSetCounts)) {
      if ((sname === '龙王' || sname === '神谕' || sname === '虚空') && count >= 6) {
        unlock('mythic_6set')
      }
    }

    const gems = this.save.gems || {}
    if (Object.keys(gems).some((g) => g.split('_')[0] === 'diamond')) unlock('first_diamond')

    if (this.save.floor >= 300) unlock('floor_300')
    if (this.save.floor >= 500) unlock('floor_500')

    for (const p of pets) {
      const tmpl = PET_TEMPLATES[p.template] || {}
      if ((tmpl.tier || 1) >= 4) unlock('divine_pet')
      if ((tmpl.tier || 1) >= 5) unlock('abyssal_pet')
    }

    return achLogs
  }
  // ============================================================
  // Processing loops
  // ============================================================

  /**
   * Process offline rewards for a number of minutes.
   * @param {number} minutes
   * @returns {string} Report message.
   */
  processOffline(minutes) {
    if (minutes <= 0) return ''

    const startFloor = this.save.floor
    const report = [`⏱️ 离线${minutes}分钟，自动战斗报告：`]
    const milestones = []

    const s = this.save.stats
    let combat = this._calcCombatStats()
    let currentHp = s.hp
    const maxHp = combat.max_hp

    let restMinutes = 0
    if (currentHp < maxHp * 0.5) {
      const needed = maxHp - currentHp
      const healPerMin = maxHp * 0.15
      restMinutes = Math.min(Math.floor(needed / healPerMin) + 1, Math.floor(minutes / 2))
      restMinutes = Math.max(0, restMinutes)
      if (restMinutes > 0) {
        const actualHeal = Math.min(Math.floor(healPerMin * restMinutes), needed)
        s.hp = Math.min(currentHp + actualHeal, maxHp)
        report.push(`😴 先休息了${restMinutes}分钟回血 +${actualHeal}HP`)
        minutes -= restMinutes
      }
    }

    if (minutes <= 0) {
      report.push('💤 全部时间用来休息了')
      return report.join('\n')
    }

    let battles = 0
    let wins = 0
    let totalExp = 0
    let totalGold = 0
    let lastReportedFloor = startFloor

    for (let i = 0; i < minutes * 2; i++) {
      combat = this._calcCombatStats()

      if (s.hp <= combat.max_hp * 0.3) {
        s.hp = Math.min(s.hp + combat.max_hp * 0.1, combat.max_hp)
        continue
      }

      const isBoss = this.save.stage >= 10
      const monster = this.generateMonster(this.save.floor, isBoss)
      const [won] = this._doBattle(monster)
      battles += 1

      if (won) {
        wins += 1
        totalExp += monster.exp
        totalGold += monster.gold
        this.save.stage += 1

        if (isBoss) {
          this.save.floor += 1
          this.save.stage = 1
          const f = this.save.floor
          if (f % 100 === 0) {
            milestones.push(`🎉 突破第${f}层！`)
            lastReportedFloor = f
          } else if (f % 50 === 0 && f - lastReportedFloor >= 10) {
            milestones.push(`🎉 到达第${f}层`)
            lastReportedFloor = f
          } else if (f % 10 === 0 && f - lastReportedFloor >= 10) {
            milestones.push(`📈 第${f}层`)
            lastReportedFloor = f
          }
        }
      } else {
        s.consecutive_wins = 0
        this.save.stage = Math.max(1, this.save.stage - 2)
        report.push('💀 战斗中断：被击败')
        break
      }
    }

    if (milestones.length) {
      if (milestones.length > 15) {
        report.push(`📈 里程碑: ${milestones[0]} ... ${milestones[milestones.length - 1]} (共${milestones.length}个)`)
      } else {
        report.push(...milestones)
      }
    }

    const floorsGained = this.save.floor - startFloor
    report.push(`⚔️ 战斗${battles}场，胜${wins}场 | 推进${floorsGained}层`)
    report.push(`💰 +${totalGold}G | 📈 +${totalExp}EXP`)
    report.push(`📍 当前：第${this.save.floor}层 第${this.save.stage}/10关`)

    return report.join('\n')
  }

  /**
   * Process online rewards for a number of minutes.
   * @param {number} minutes
   * @returns {string} Report message.
   */
  processOnline(minutes) {
    if (minutes <= 0) return ''

    this.save.online_mode = true

    const startFloor = this.save.floor
    const report = [`🔥 在线挂机${minutes}分钟，双倍效率战斗报告：`]
    const milestones = []

    const s = this.save.stats
    let combat = this._calcCombatStats()
    let currentHp = s.hp
    const maxHp = combat.max_hp

    let restMinutes = 0
    if (currentHp < maxHp * 0.5) {
      const needed = maxHp - currentHp
      const healPerMin = maxHp * 0.25
      restMinutes = Math.min(Math.floor(needed / healPerMin) + 1, Math.floor(minutes / 3))
      restMinutes = Math.max(0, restMinutes)
      if (restMinutes > 0) {
        const actualHeal = Math.min(Math.floor(healPerMin * restMinutes), needed)
        s.hp = Math.min(currentHp + actualHeal, maxHp)
        report.push(`😴 在线回血${restMinutes}分钟 +${actualHeal}HP`)
        minutes -= restMinutes
      }
    }

    if (minutes <= 0) {
      report.push('💤 全部时间用来回血了')
      this.save.online_mode = false
      return report.join('\n')
    }

    let battles = 0
    let wins = 0
    let totalExp = 0
    let totalGold = 0
    let lastReportedFloor = startFloor

    for (let i = 0; i < minutes * 4; i++) {
      combat = this._calcCombatStats()

      if (s.hp <= combat.max_hp * 0.2) {
        s.hp = Math.min(s.hp + combat.max_hp * 0.15, combat.max_hp)
        continue
      }

      const isBoss = this.save.stage >= 10
      const monster = this.generateMonster(this.save.floor, isBoss)
      const [won] = this._doBattle(monster)
      battles += 1

      if (won) {
        wins += 1
        totalExp += monster.exp
        totalGold += monster.gold
        this.save.stage += 1

        if (isBoss) {
          this.save.floor += 1
          this.save.stage = 1
          const f = this.save.floor
          if (f % 100 === 0) {
            milestones.push(`🎉 突破第${f}层！`)
            lastReportedFloor = f
          } else if (f % 50 === 0 && f - lastReportedFloor >= 10) {
            milestones.push(`🎉 到达第${f}层`)
            lastReportedFloor = f
          } else if (f % 10 === 0 && f - lastReportedFloor >= 10) {
            milestones.push(`📈 第${f}层`)
            lastReportedFloor = f
          }
        }
      } else {
        s.consecutive_wins = 0
        this.save.stage = Math.max(1, this.save.stage - 2)
        report.push('💀 战斗中断：被击败')
        break
      }
    }

    if (milestones.length) {
      if (milestones.length > 15) {
        report.push(`📈 里程碑: ${milestones[0]} ... ${milestones[milestones.length - 1]} (共${milestones.length}个)`)
      } else {
        report.push(...milestones)
      }
    }

    const floorsGained = this.save.floor - startFloor
    report.push(`⚔️ 战斗${battles}场，胜${wins}场 | 推进${floorsGained}层`)
    report.push(`💰 金币已加成(+30%) | 📈 经验已加成(+50%)`)
    report.push(`📍 当前：第${this.save.floor}层 第${this.save.stage}/10关`)

    this.save.online_mode = false
    return report.join('\n')
  }

  /**
   * Quickly fight a number of battles in a row.
   * @param {number} count
   * @returns {string} Report message.
   */
  rushBattles(count) {
    if (count <= 0) return ''
    if (count > 100) return '❌ 一次最多推100场'

    this.save.online_mode = true
    const reports = [`🚀 快速推图 x${count}场：`]

    for (let i = 0; i < count; i++) {
      const s = this.save.stats
      const combat = this._calcCombatStats()

      if (s.hp <= combat.max_hp * 0.2) {
        reports.push(`⏹️ 第${i + 1}场：血量过低，暂停`)
        break
      }

      const isBoss = this.save.stage >= 10
      const monster = this.generateMonster(this.save.floor, isBoss)
      const [won] = this._doBattle(monster)

      if (won) {
        this.save.stage += 1
        if (isBoss) {
          this.save.floor += 1
          this.save.stage = 1
          reports.push(`✅ 第${i + 1}场：击败BOSS ${monster.name}！→ 第${this.save.floor}层`)
        } else if ((i + 1) % 5 === 0 || i === count - 1) {
          reports.push(`✅ 第${i + 1}场：击败${monster.name} (+${monster.exp}EXP)`)
        }
      } else {
        s.consecutive_wins = 0
        this.save.stage = Math.max(1, this.save.stage - 2)
        reports.push(`💀 第${i + 1}场：被${monster.name}击败`)
        break
      }
    }

    this.save.online_mode = false
    reports.push(`📍 当前：第${this.save.floor}层 第${this.save.stage}/10关`)
    return reports.join('\n')
  }

  /**
   * Transfer enhance level, gems and enchants from an old item to a new item.
   * @param {string} oldId
   * @param {string} newId
   * @returns {string}
   */
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

  // ============================================================
  // Logs & status
  // ============================================================

  /**
   * Add a battle log entry.
   * @param {boolean} won
   * @param {string} enemy
   * @param {string} detail
   */
  _addBattleLog(won, enemy, detail) {
    const log = this.save.log || []
    const entry = {
      time: nowISO().slice(0, 19),
      result: won ? '✅胜利' : '💀死亡',
      enemy,
      detail,
      floor: this.save.floor,
      streak: this.save.stats.consecutive_wins,
    }
    log.unshift(entry)
    this.save.log = log.slice(0, 10)
  }

  /**
   * Get recent battle log as a string.
   * @returns {string}
   */
  getBattleLog() {
    const log = this.save.log || []
    if (!log.length) return '📜 暂无战斗记录'
    const lines = ['📜 最近战斗记录：']
    for (const entry of log.slice(0, 10)) {
      lines.push(
        `  [${entry.time}] ${entry.result} ${entry.enemy} | ${entry.detail} | 层${entry.floor} 连杀${entry.streak}`
      )
    }
    return lines.join('\n')
  }

  /**
   * Get a summary of the player's current status.
   * @returns {string}
   */
  getStatus() {
    const s = this.save.stats
    const combat = this._calcCombatStats()
    const streak = s.consecutive_wins || 0

    let streakBuff = ''
    if (streak >= 100) {
      streakBuff = ` 🔥连杀${streak}(+${Math.floor(streak / 50)}%暴击 +${Math.floor(streak / 100) * 5}%伤害/金币)`
    } else if (streak >= 50) {
      streakBuff = ` 🔥连杀${streak}(+${Math.floor(streak / 50)}%暴击)`
    }

    const lines = [
      `═══ ${this.save.player_name} 状态 ═══`,
      `📊 Lv.${s.level} | EXP: ${s.exp}/${s.exp_to_next}`,
      `❤️ HP: ${s.hp}/${combat.max_hp} | 🔵 MP: ${s.mp}/${combat.max_mp}`,
      `⚔️ 攻击: ${combat.damage} | 🛡️ 护甲: ${combat.armor} | 💥 暴击: ${combat.crit_rate}%`,
      `💰 金币: ${s.gold} | 💀 死亡: ${s.deaths} | 🗡️ 击杀: ${s.total_kills}${streakBuff}`,
      `📍 第${this.save.floor}层 第${this.save.stage}/10关`,
      `🎒 背包: ${(this.save.inventory || []).length}/50`,
    ]

    const pets = this.save.pets || []
    const activeIdx = this.save.active_pet_idx || 0
    if (pets.length) {
      const pet = activeIdx >= 0 && activeIdx < pets.length ? pets[activeIdx] : pets[0]
      const tmpl = PET_TEMPLATES[pet.template] || {}
      const petDesc = combat.pet_desc || `${tmpl.icon || '🐾'}${tmpl.name || '宠物'} Lv.${pet.level || 1}`
      const extraCount = pets.length - 1
      const extraInfo = extraCount > 0 ? ` (+${extraCount}只待战)` : ''
      lines.push(`🐾 出战: ${petDesc}${extraInfo}`)
    }
    const pending = this.save.pending_pet
    if (pending) {
      lines.push(`🐾 野生宠物待驯服: ${pending.icon}${pending.name} (HP:${pending.hp}) — 使用 catch`)
    }

    if (Object.keys(this.save.equipped || {}).length) {
      lines.push('\n🛠️ 已装备:')
      for (const [slot, item] of Object.entries(this.save.equipped)) {
        const enh = item.enhance_level ? `+${item.enhance_level}` : ''
        lines.push(`  ${slot}: ${item.name}${enh}`)
      }
    }

    const materials = this.save.materials || {}
    lines.push(`\n💎 强化石x${materials.enhance_stone || 0}`)
    lines.push(`\n🏆 成就: ${Object.keys(this.save.achievements || {}).length}/${Object.keys(ACHIEVEMENTS).length}`)

    return lines.join('\n')
  }
  // ============================================================
  // Inventory & equipment
  // ============================================================

  /**
   * Equip an item from the inventory.
   * @param {string} itemId
   * @returns {string}
   */
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

  /**
   * Sell an item from the inventory.
   * @param {string} itemId
   * @returns {string}
   */
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

  /**
   * Sell all items of a given quality or lower.
   * @param {string} [maxQuality='普通']
   * @returns {string}
   */
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

  /**
   * Get a string listing the inventory contents.
   * @returns {string}
   */
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

  /**
   * Force a full achievement re-check.
   * @returns {string}
   */
  forceCheckAchievements() {
    const logs = this._checkAchievements()
    return logs.join('\n')
  }

  // ============================================================
  // Pets
  // ============================================================

  /**
   * Try to trigger a wild pet encounter after a battle.
   * @returns {object|null}
   */
  _tryPetEncounter() {
    if ((this.save.pets || []).length >= 3) return null
    if (this.save.pending_pet != null) return null
    if (Math.random() >= WILD_PET_CHANCE) return null

    const floor = this.save.floor
    const available = []
    for (const [key, tmpl] of Object.entries(PET_TEMPLATES)) {
      const tier = tmpl.tier || 1
      if (tier === 1 && floor >= 1) available.push([key, tmpl])
      else if (tier === 2 && floor >= 50) available.push([key, tmpl])
      else if (tier === 3 && floor >= 100) available.push([key, tmpl])
    }
    if (!available.length) available.push(['wolf', PET_TEMPLATES.wolf])

    const [key, tmpl] = available[Math.floor(Math.random() * available.length)]
    const petHp = floor * 20 + randomInt(50, 150)

    this.save.pending_pet = {
      template: key,
      name: tmpl.name,
      icon: tmpl.icon,
      hp: petHp,
      max_hp: petHp,
      turn_limit: WILD_PET_TURN_LIMIT,
    }
    return this.save.pending_pet
  }

  /**
   * Attempt to catch the pending wild pet.
   * @returns {string}
   */
  catchPet() {
    const pending = this.save.pending_pet
    if (!pending) return '🐾 当前没有可驯服的野生宠物，继续战斗吧！'
    if ((this.save.pets || []).length >= 3) {
      return '🐾 宠物背包已满（最多3只）！先用 release_pet 放生一只。'
    }

    const combat = this._calcCombatStats()
    let petHp = pending.hp
    const turnLimit = pending.turn_limit

    for (let turn = 1; turn <= turnLimit; turn++) {
      let dmg = combat.damage + randomInt(-Math.floor(combat.damage / 10), Math.floor(combat.damage / 10))
      dmg = Math.max(1, dmg)

      const crit = Math.random() * 100 < combat.crit_rate
      if (crit) dmg = Math.floor(dmg * (1.5 + (combat.crit_dmg || 0.5)))
      petHp -= dmg

      if (petHp <= 0) {
        const tmplKey = pending.template
        const newPet = {
          template: tmplKey,
          level: 1,
          exp: 0,
          extra_passives: [],
        }
        this.save.pets = [...(this.save.pets || []), newPet]
        if (this.save.active_pet_idx == null) this.save.active_pet_idx = 0
        this.save.pending_pet = null
        const tmpl = PET_TEMPLATES[tmplKey] || {}
        const idx = this.save.pets.length - 1
        return `🎉 驯服成功！${tmpl.icon || ''}${tmpl.name || '宠物'} 成为了你的伙伴！（位置${idx}）\n   被动: ${tmpl.passive || '无'} +${tmpl.passive_val || 0}/级`
      }
    }

    this.save.pending_pet = null
    return `😢 驯服失败... ${pending.icon}${pending.name} 逃跑了。继续战斗或许还能遇到！`
  }

  /**
   * Release a pet at the given index.
   * @param {number} [idx=0]
   * @returns {string}
   */
  releasePet(idx = 0) {
    const pets = this.save.pets || []
    if (!pets.length || idx < 0 || idx >= pets.length) return `🐾 位置${idx}没有宠物`
    const pet = pets[idx]
    const tmpl = PET_TEMPLATES[pet.template] || {}
    pets.splice(idx, 1)
    this.save.pets = pets

    this.save.total_pet_fuses = (this.save.total_pet_fuses || 0) + 1

    const active = this.save.active_pet_idx || 0
    if (active >= pets.length && pets.length) this.save.active_pet_idx = pets.length - 1
    else if (!pets.length) this.save.active_pet_idx = 0

    return `🌿 你放生了 ${tmpl.icon || ''}${tmpl.name || '宠物'}，祝它一路顺风。`
  }

  /**
   * Hatch a pet egg.
   * @param {string} eggKey
   * @returns {string}
   */
  hatchEgg(eggKey) {
    const eggs = this.save.pet_eggs || []
    const foundIdx = eggs.indexOf(eggKey)
    if (foundIdx === -1) {
      return `❌ 你没有 ${(PET_EGG_SHOP[eggKey] || {}).name || eggKey}`
    }
    if ((this.save.pets || []).length >= 3) {
      return '🐾 宠物背包已满（最多3只）！先放生才能孵化新的。'
    }

    const eggInfo = PET_EGG_SHOP[eggKey]
    const weights = eggInfo.tier_weights
    const numTiers = weights.length
    const tier = weightedRandom(
      Array.from({ length: numTiers }, (_, i) => i + 1),
      weights
    )

    const candidates = Object.keys(PET_TEMPLATES).filter((k) => (PET_TEMPLATES[k].tier || 1) === tier)
    const chosen = candidates[Math.floor(Math.random() * candidates.length)]
    const tmpl = PET_TEMPLATES[chosen]

    const newPet = {
      template: chosen,
      level: 1,
      exp: 0,
      extra_passives: [],
    }
    this.save.pets = [...(this.save.pets || []), newPet]
    if (this.save.active_pet_idx == null) this.save.active_pet_idx = 0
    eggs.splice(foundIdx, 1)
    this.save.pet_eggs = eggs
    const idx = this.save.pets.length - 1
    return `🎉 孵化成功！从 ${eggInfo.name} 中获得了 ${tmpl.icon}${tmpl.name}！（位置${idx}）\n   被动: ${tmpl.passive || '无'} +${tmpl.passive_val || 0}/级`
  }

  /**
   * Upgrade a pet by spending gold.
   * @param {number|null} [idx=null] Defaults to the active pet.
   * @returns {string}
   */
  upgradePet(idx = null) {
    const pets = this.save.pets || []
    if (!pets.length) return '🐾 你没有宠物'
    if (idx == null) idx = this.save.active_pet_idx || 0
    if (idx < 0 || idx >= pets.length) return `🐾 位置${idx}没有宠物`

    const pet = pets[idx]
    const level = pet.level || 1
    const cost = PET_UPGRADE_COST(level)

    if (this.save.stats.gold < cost) {
      return `❌ 金币不足！升级需要 ${cost}G，你只有 ${this.save.stats.gold}G`
    }

    this.save.stats.gold -= cost
    pet.level = level + 1
    pet.exp = (pet.exp || 0) + Math.floor(cost / 2)

    const tmpl = PET_TEMPLATES[pet.template] || {}
    return `✨ ${tmpl.icon || ''}${tmpl.name || '宠物'} 升级了！Lv.${level} → Lv.${level + 1}\n   下次升级需要 ${PET_UPGRADE_COST(level + 1)}G`
  }

  /**
   * Fuse two pets together.
   * @param {number} mainIdx
   * @param {number} subIdx
   * @returns {string}
   */
  fusePets(mainIdx, subIdx) {
    const pets = this.save.pets || []
    if (pets.length < 2) return '🐾 需要至少两只宠物才能融合'
    if (
      mainIdx < 0 ||
      mainIdx >= pets.length ||
      subIdx < 0 ||
      subIdx >= pets.length
    ) {
      return '🐾 指定的宠物位置无效'
    }
    if (mainIdx === subIdx) return '🐾 不能把自己和自己融合'

    const main = pets[mainIdx]
    const sub = pets[subIdx]
    const mainTmpl = PET_TEMPLATES[main.template] || {}
    const subTmpl = PET_TEMPLATES[sub.template] || {}

    const fuseCost = (sub.level || 1) * 500
    if (this.save.stats.gold < fuseCost) {
      return `❌ 融合需要 ${fuseCost}G，你只有 ${this.save.stats.gold}G`
    }

    this.save.stats.gold -= fuseCost

    const expGain = Math.floor(((sub.level || 1) * 100 + (sub.exp || 0)) * 0.5)
    main.exp = (main.exp || 0) + expGain

    let levelsGained = 0
    while (main.exp >= (main.level || 1) * 200) {
      main.exp -= (main.level || 1) * 200
      main.level = (main.level || 1) + 1
      levelsGained += 1
    }

    let inheritMsg = ''
    const mainPassive = mainTmpl.passive || ''
    const subPassive = subTmpl.passive || ''
    const subPval = subTmpl.passive_val || 0

    if (subPassive && subPassive !== mainPassive) {
      let inheritChance = 0.3
      const subTier = subTmpl.tier || 1
      if (subTier >= 2) inheritChance += 0.1

      if (Math.random() < inheritChance) {
        const extra = main.extra_passives || []
        const existing = extra.map((p) => p.passive)
        if (!existing.includes(subPassive)) {
          extra.push({
            passive: subPassive,
            val: subPval,
            from: subTmpl.name || '',
          })
          main.extra_passives = extra
          inheritMsg = `\n🌟 **觉醒！** 继承了 [${subTmpl.icon || ''}${subTmpl.name || ''}] 的被动「${subPassive}」！`
        } else {
          inheritMsg = `\n💫 融合强化了「${subPassive}」的效果！`
        }
      } else {
        inheritMsg = `\n💨 未能继承被动（${Math.floor(inheritChance * 100)}%概率）`
      }
    }

    pets.splice(subIdx, 1)
    this.save.pets = pets

    const active = this.save.active_pet_idx || 0
    if (active >= pets.length) this.save.active_pet_idx = Math.max(0, pets.length - 1)
    else if (subIdx < active) this.save.active_pet_idx = active - 1

    const levelMsg = levelsGained > 0 ? ` (+${levelsGained}级)` : ''
    return `🔥 融合成功！${mainTmpl.icon || ''}${mainTmpl.name || ''} 吸收了 ${subTmpl.icon || ''}${subTmpl.name || ''} 的精华！\n   获得经验 +${expGain}${levelMsg}${inheritMsg}`
  }

  /**
   * Switch the active pet.
   * @param {number} idx
   * @returns {string}
   */
  switchPet(idx) {
    const pets = this.save.pets || []
    if (!pets.length) return '🐾 没有宠物可以切换'
    if (idx < 0 || idx >= pets.length) return `🐾 位置${idx}没有宠物（当前有${pets.length}只）`
    this.save.active_pet_idx = idx
    const pet = pets[idx]
    const tmpl = PET_TEMPLATES[pet.template] || {}
    return `🐾 出战宠物切换为 ${tmpl.icon || ''}${tmpl.name || ''} Lv.${pet.level || 1}`
  }

  /**
   * Get a string listing pet eggs.
   * @returns {string}
   */
  getPetEggs() {
    const eggs = this.save.pet_eggs || []
    if (!eggs.length) return '🥚 宠物蛋背包是空的，去商店看看吧！'
    const counts = {}
    for (const egg of eggs) counts[egg] = (counts[egg] || 0) + 1
    const lines = ['🥚 宠物蛋背包：']
    for (const [eggKey, count] of Object.entries(counts)) {
      const name = (PET_EGG_SHOP[eggKey] || {}).name || eggKey
      lines.push(`  [${eggKey}] ${name} x${count}`)
    }
    return lines.join('\n')
  }

  /**
   * Get a string listing all achievements.
   * @returns {string}
   */
  getAchievements() {
    const lines = ['🏆 成就列表：']
    for (const [key, ach] of Object.entries(ACHIEVEMENTS)) {
      const status = key in this.save.achievements ? '✅' : '⬜'
      lines.push(`  ${status} ${ach.name}: ${ach.desc} (奖励:${ach.reward_gold}G)`)
    }
    return lines.join('\n')
  }

  // ============================================================
  // Shop
  // ============================================================

  /**
   * Get the shop listing.
   * @returns {string}
   */
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

  /**
   * Buy an item or pet egg from the shop.
   * @param {string} itemKey
   * @returns {string}
   */
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

  /**
   * Use a consumable item.
   * @param {string} itemKey
   * @returns {string}
   */
  useItem(itemKey) {
    const inv = this.save.consumables || {}
    if (!inv[itemKey] || inv[itemKey] <= 0) return `❌ 你没有 ${itemKey}`

    const item = SHOP_ITEMS[itemKey]
    if (!item) return `❌ 未知物品 ${itemKey}`

    inv[itemKey] -= 1
    if (inv[itemKey] <= 0) delete inv[itemKey]
    this.save.consumables = inv

    const s = this.save.stats
    if (item.effect === 'heal') {
      s.total_potions_used = (s.total_potions_used || 0) + 1
      const oldHp = s.hp
      s.hp = Math.min(s.hp + item.value, this._calcCombatStats().max_hp)
      const healed = s.hp - oldHp
      this._checkDailyReset()
      this._trackQuest('use_potion_5', 1)
      return `🍷 使用 ${item.name}，恢复 ${healed} HP (当前 ${s.hp}/${this._calcCombatStats().max_hp})`
    } else if (item.effect === 'mana') {
      s.total_potions_used = (s.total_potions_used || 0) + 1
      const oldMp = s.mp
      s.mp = Math.min(s.mp + item.value, this._calcCombatStats().max_mp)
      const restored = s.mp - oldMp
      return `🔵 使用 ${item.name}，恢复 ${restored} MP`
    } else if (item.effect === 'enchant') {
      return `⚡ 使用 ${item.name}，请配合装备命令使用`
    } else if (item.effect === 'reroll') {
      return `🔄 使用 ${item.name}，请配合装备命令使用`
    }
    return `✅ 使用 ${item.name}`
  }
  // ============================================================
  // Item fusion
  // ============================================================

  /**
   * Fuse 3 items of the same quality into one higher-quality item.
   * @param {string[]} itemIds
   * @returns {string}
   */
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

    const newItem = this.generateItem(maxLevel + 2, newQuality)
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

  // ============================================================
  // Skills
  // ============================================================

  /**
   * Get the skill tree listing.
   * @returns {string}
   */
  getSkills() {
    const lines = [`🧠 技能树 | 可用技能点: ${this.save.skill_points || 0}`, '═'.repeat(30)]
    for (const [key, skill] of Object.entries(SKILL_TREE)) {
      const learned = key in (this.save.skills || {}) ? '✅' : '⬜'
      let reqStr = ''
      if (skill.requires.length) {
        const met = skill.requires.every((r) => r in (this.save.skills || {}))
        reqStr = ` [前置: ${skill.requires.join(', ')}]${met ? '✅' : '❌'}`
      }
      lines.push(`  ${learned} [${key}] ${skill.name} (消耗${skill.cost}点) - ${skill.desc}${reqStr}`)
    }
    return lines.join('\n')
  }

  /**
   * Learn a skill.
   * @param {string} skillKey
   * @returns {string}
   */
  learnSkill(skillKey) {
    if (!(skillKey in SKILL_TREE)) return `❌ 没有这个技能: ${skillKey}`
    if (skillKey in (this.save.skills || {})) return `❌ 你已经学过 ${SKILL_TREE[skillKey].name}`

    const skill = SKILL_TREE[skillKey]
    const sp = this.save.skill_points || 0
    if (sp < skill.cost) return `❌ 技能点不够！需要${skill.cost}点，你有${sp}点`

    for (const req of skill.requires) {
      if (!(req in (this.save.skills || {}))) return `❌ 前置技能未学习: ${req}`
    }

    this.save.skill_points = sp - skill.cost
    if (!this.save.skills) this.save.skills = {}
    this.save.skills[skillKey] = true

    return `✅ 学会 ${skill.name}! ${skill.desc}`
  }

  // ============================================================
  // Equipment optimization
  // ============================================================

  /**
   * Calculate the best equipment combination and return a recommendation.
   * @returns {string}
   */
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
      let currentTotal = this._calcComboScore(bestCombo)

      for (const [slot, items] of Object.entries(bySlot)) {
        for (const item of items) {
          if (item.id === bestCombo[slot].id) continue
          const testCombo = { ...bestCombo, [slot]: item }
          const testScore = this._calcComboScore(testCombo)
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

    const totalScore = this._calcComboScore(bestCombo)
    lines.push(`\n📊 组合评分: ${totalScore}`)
    if (changes.length) lines.push(`💡 建议更换: ${changes.join(', ')}`)
    else lines.push('✅ 当前已是最佳配装')

    return lines.join('\n')
  }

  /**
   * Calculate the total score of an equipment combination.
   * @param {Record<string, object>} combo
   * @returns {number}
   */
  _calcComboScore(combo) {
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

  /**
   * Apply the optimal equipment combination.
   * @returns {string}
   */
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
    this.saveGame()

    return '✅ 已应用最优配装！'
  }

  // ============================================================
  // Daily quests
  // ============================================================

  /**
   * Check if daily quests need a reset.
   */
  _checkDailyReset() {
    const dq = this.save.daily_quests || {}
    const lastReset = dq.reset_at || ''
    const today = todayISO()

    if (!lastReset.startsWith(today)) {
      const quests = {}
      const selected = []
      const templates = [...DAILY_QUEST_TEMPLATES]
      for (let i = 0; i < Math.min(3, templates.length); i++) {
        const idx = Math.floor(Math.random() * templates.length)
        selected.push(templates.splice(idx, 1)[0])
      }
      for (const q of selected) {
        quests[q.id] = {
          name: q.name,
          desc: q.desc,
          target: q.target,
          progress: 0,
          reward_gold: q.reward_gold,
          reward_stone: q.reward_stone,
        }
      }
      this.save.daily_quests = {
        reset_at: nowISO(),
        quests,
        completed: [],
        start_floor: this.save.floor,
      }
    }
  }

  /**
   * Track progress for a daily quest.
   * @param {string} questId
   * @param {number} [amount=1]
   */
  _trackQuest(questId, amount = 1) {
    const dq = this.save.daily_quests || {}
    const quests = dq.quests || {}
    const completed = dq.completed || []

    if (questId in quests && !completed.includes(questId)) {
      quests[questId].progress = (quests[questId].progress || 0) + amount
      if (quests[questId].progress >= quests[questId].target) {
        this._completeQuest(questId)
      }
    }
  }

  /**
   * Complete a daily quest and grant rewards.
   * @param {string} questId
   */
  _completeQuest(questId) {
    const dq = this.save.daily_quests || {}
    const quests = dq.quests || {}
    const completed = dq.completed || []

    if (questId in quests && !completed.includes(questId)) {
      const q = quests[questId]
      this.save.stats.gold += q.reward_gold
      const materials = this.save.materials || { enhance_stone: 0, set_fragments: {} }
      materials.enhance_stone = (materials.enhance_stone || 0) + q.reward_stone
      this.save.materials = materials
      completed.push(questId)
      dq.completed = completed

      const log = this.save.log || []
      log.unshift({
        time: nowISO().slice(0, 19),
        result: '📋每日',
        enemy: q.name,
        detail: `完成! +${q.reward_gold}G +${q.reward_stone}强化石`,
        floor: this.save.floor,
        streak: this.save.stats.consecutive_wins,
      })
      this.save.log = log.slice(0, 10)
    }
  }

  /**
   * Get the current daily quests as a string.
   * @returns {string}
   */
  getDailyQuests() {
    this._checkDailyReset()
    const dq = this.save.daily_quests || {}
    const quests = dq.quests || {}
    const completed = dq.completed || []

    const lines = ['📋 每日任务：']
    for (const [qid, q] of Object.entries(quests)) {
      const status = completed.includes(qid) ? '✅' : '⏳'
      const prog = q.progress || 0
      const target = q.target
      lines.push(`  ${status} ${q.name}: ${q.desc} (${prog}/${target}) | 奖励:${q.reward_gold}G +${q.reward_stone}强化石`)
    }

    const materials = this.save.materials || {}
    lines.push(`\n💎 材料: 强化石x${materials.enhance_stone || 0}`)
    return lines.join('\n')
  }
  // ============================================================
  // Storage, sets, bag
  // ============================================================

  /**
   * Get the set status as a string.
   * @returns {string}
   */
  getSetStatus() {
    const setCounts = {}
    const setItems = {}
    for (const item of Object.values(this.save.equipped || {})) {
      const sname = item.set_name
      if (sname) {
        setCounts[sname] = (setCounts[sname] || 0) + 1
        if (!setItems[sname]) setItems[sname] = []
        setItems[sname].push(item.name)
      }
    }

    if (!Object.keys(setCounts).length) return '🛡️ 没有套装效果（装备不足7件或无套装）'

    const lines = ['🛡️ 套装状态：']
    for (const [sname, count] of Object.entries(setCounts).sort((a, b) => b[1] - a[1])) {
      const icon = SET_COLORS[sname] || '📦'
      lines.push(`\n  ${icon} ${sname}套装 (${count}件)`)

      if (sname in SET_BONUSES) {
        const bonuses = SET_BONUSES[sname]
        for (const threshold of Object.keys(bonuses).map(Number).sort((a, b) => a - b)) {
          const effectStr = Object.entries(bonuses[threshold])
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')
          if (count >= threshold) {
            lines.push(`  ✅ ${threshold}件套 - ${effectStr}`)
          } else {
            lines.push(`  ⬜ ${threshold}件套 - ${effectStr} (还差${threshold - count}件)`)
          }
        }
      }
      lines.push(`    装备: ${setItems[sname].join(', ')}`)
    }
    return lines.join('\n')
  }

  /**
   * Organize the bag by selling low quality and dismantling low-level items.
   * @returns {string}
   */
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
        const dismantleMsg = this._autoDismantle(item)
        dismantled.push(dismantleMsg)
        continue
      }

      const totalSetCount = (equippedSets[setName] || 0) + (bagSetCounts[setName] || 0)
      if (totalSetCount >= 4 && quality === '史诗' && level < equippedLevel - 10) {
        const dismantleMsg = this._autoDismantle(item)
        dismantled.push(dismantleMsg)
        continue
      }

      kept.push(item)
    }

    this.save.inventory = kept

    const lines = ['🧹 背包整理完成！']
    if (sold.length) lines.push(`💰 卖出 ${sold.length} 件装备`)
    if (dismantled.length) lines.push(`🔨 分解 ${dismantled.length} 件装备`)
    lines.push(`🎒 剩余 ${kept.length}/50`)
    return lines.join('\n')
  }

  /**
   * Move potentially valuable epic/legendary items into storage.
   * @returns {string}
   */
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
        if (storage.length < 200) {
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
          if (storage.length < 200) {
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
    lines.push(`🎒 背包: ${kept.length}/50 | 📦 仓库: ${storage.length}/200`)
    return lines.join('\n')
  }

  /**
   * Get storage listing.
   * @returns {string}
   */
  getStorage() {
    const storage = this.save.storage || []
    if (!storage.length) return '📦 仓库是空的 (容量: 0/200)'
    const lines = [`📦 仓库物品 (${storage.length}/200)：`]
    for (const item of storage) {
      const enh = item.enhance_level ? `+${item.enhance_level}` : ''
      lines.push(`  [${item.id}] ${item.name}${enh} Lv.${item.level}`)
    }
    return lines.join('\n')
  }

  /**
   * Move an item from inventory to storage.
   * @param {string} itemId
   * @returns {string}
   */
  toStorage(itemId) {
    const storage = this.save.storage || []
    if (storage.length >= 200) return '❌ 仓库已满 (200/200)'

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

  /**
   * Move an item from storage to inventory.
   * @param {string} itemId
   * @returns {string}
   */
  fromStorage(itemId) {
    const storage = this.save.storage || []
    if ((this.save.inventory || []).length >= 50) return '❌ 背包已满 (50/50)'

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

  /**
   * Get consumables listing.
   * @returns {string}
   */
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
  // ============================================================
  // Gems
  // ============================================================

  /**
   * Get the gem inventory as a string.
   * @returns {string}
   */
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

  /**
   * Get equipped item details.
   * @returns {string}
   */
  getEquippedDetail() {
    const lines = ['🛠️ 已装备详情：']
    for (const [slot, item] of Object.entries(this.save.equipped || {})) {
      lines.push(`\n  📌 ${slot}: ${item.name} (Lv.${item.level})`)
      const sockets = item.sockets || 1
      const gems = item.gems || []
      lines.push(`     孔位: ${gems.length}/${sockets}`)
      for (let i = 0; i < gems.length; i++) {
        const gem = gems[i]
        lines.push(`     💎 孔${i + 1}: ${getGemName(gem.type, gem.level || 1)}`)
      }
      for (let i = gems.length; i < sockets; i++) {
        lines.push(`     ⬜ 孔${i + 1}: [空]`)
      }
    }
    return lines.join('\n')
  }

  /**
   * Insert a gem into an equipment socket.
   * @param {string} itemId
   * @param {number} slotIdx 1-based socket index
   * @param {string} gemType
   * @param {number} gemLevel
   * @returns {string}
   */
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

  /**
   * Remove a gem from an equipment socket.
   * @param {string} itemId
   * @param {number} slotIdx 1-based socket index
   * @returns {string}
   */
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

    const gem = currentGems.pop(slotIdx - 1)
    const gemKey = `${gem.type}_${gem.level}`
    const gemsInv = this.save.gems || {}
    gemsInv[gemKey] = (gemsInv[gemKey] || 0) + 1
    this.save.gems = gemsInv

    return `✅ 从 ${targetItem.name} 拆除了 ${getGemName(gem.type, gem.level)}`
  }

  /**
   * Fuse multiple gems of the same level into a higher-level gem.
   * @param {string} gemType
   * @param {number} gemLevel
   * @returns {string}
   */
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

  // ============================================================
  // Enchant, enhance, dismantle
  // ============================================================

  /**
   * Enchant an item using a scroll.
   * @param {string} itemId
   * @returns {string}
   */
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
    const value = randomInt(mn, mx)

    enchants.push({ stat, value })
    targetItem.enchants = enchants
    this.save.stats.total_enchants = (this.save.stats.total_enchants || 0) + 1

    this._checkDailyReset()
    this._trackQuest('enchant_2', 1)

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

  /**
   * Enhance an item by +1.
   * @param {string} itemId
   * @returns {string}
   */
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
    if (el >= 15) return '❌ 装备已达到最大强化等级 (+15)'

    const stoneCost = el + 1
    const materials = this.save.materials || { enhance_stone: 0, set_fragments: {} }
    if ((materials.enhance_stone || 0) < stoneCost) {
      return `❌ 强化石不足！需要${stoneCost}个，你有${materials.enhance_stone || 0}个`
    }

    const goldCost = Math.floor(100 * 2 ** el)
    if (this.save.stats.gold < goldCost) {
      return `❌ 金币不足！需要${goldCost}G，你有${this.save.stats.gold}G`
    }

    materials.enhance_stone -= stoneCost
    this.save.materials = materials
    this.save.stats.gold -= goldCost
    this.save.stats.total_enhances = (this.save.stats.total_enhances || 0) + 1

    const successRate = Math.max(5, 100 - el * 7)
    const roll = randomInt(1, 100)

    if (roll <= successRate) {
      targetItem.enhance_level = el + 1
      for (const key of Object.keys(targetItem.base || {})) {
        targetItem.base[key] = Math.floor(targetItem.base[key] * 1.1)
      }
      for (const key of Object.keys(targetItem.stats || {})) {
        targetItem.stats[key] = Math.floor(targetItem.stats[key] * 1.1)
      }

      this._checkDailyReset()
      this._trackQuest('enhance_3', 1)

      return `✨ 强化成功！${targetItem.name} → +${el + 1} (成功率${successRate}%)`
    } else {
      if (el >= 5) {
        targetItem.enhance_level = Math.max(0, el - 1)
        for (const key of Object.keys(targetItem.base || {})) {
          targetItem.base[key] = Math.floor(targetItem.base[key] / 1.1)
        }
        for (const key of Object.keys(targetItem.stats || {})) {
          targetItem.stats[key] = Math.floor(targetItem.stats[key] / 1.1)
        }
        return `💥 强化失败！${targetItem.name} 从+${el}降级到+${el - 1} (成功率${successRate}%)`
      } else {
        return `💥 强化失败！${targetItem.name} 保持+${el} (成功率${successRate}%)`
      }
    }
  }

  /**
   * Dismantle an inventory item into materials.
   * @param {string} itemId
   * @returns {string}
   */
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
          case '普通':
            stoneGain = 1
            break
          case '精制':
            stoneGain = 2
            break
          case '稀有':
            stoneGain = 3
            break
          case '史诗':
            stoneGain = 5
            fragmentGain = 1
            break
          case '传说':
            stoneGain = 10
            fragmentGain = 3
            break
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

        this._checkDailyReset()
        this._trackQuest('dismantle_10', 1)

        const fragMsg = fragmentGain > 0 && setName ? ` + ${setName}碎片x${fragmentGain}` : ''
        return `🔨 分解 ${item.name} → 强化石x${stoneGain}${fragMsg}`
      }
    }
    return `❌ 背包里没有 ${itemId}`
  }

  /**
   * Get the materials listing.
   * @returns {string}
   */
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

  /**
   * Get detailed info for a single item.
   * @param {string} itemId
   * @returns {string}
   */
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
}
