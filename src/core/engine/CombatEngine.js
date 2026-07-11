import {
  PREFIX_POOL, QUALITY_NAMES, QUALITY_EMOJI, QUALITY_RANK,
  ITEM_TYPES, BASE_ITEMS, SET_NAMES, SET_BONUSES
} from '../../data/items.js'
import { MONSTER_TEMPLATES, BOSS_TEMPLATES } from '../../data/monsters.js'
import { GEM_TYPES, GEM_SOCKETS, getGemName, calcGemValue } from '../../data/gems.js'
import { PET_TEMPLATES } from '../../data/pets.js'
import { SHOP_ITEMS, MAX_ENCHANTS } from '../../data/shop.js'
import { randomInt, weightedRandom, calcItemPrice, calcItemScore, randomId, nowISO } from '../utils/helpers.js'
import {
  MAX_BATTLE_ROUNDS, BOSS_STAGE_INTERVAL,
  DAMAGE_PER_STR, DAMAGE_PER_LEVEL, ARMOR_PER_VIT, ARMOR_PER_LEVEL,
  HP_PER_VIT, MP_PER_INT, BASE_CRIT_RATE, BASE_CRIT_DMG,
  BASE_CRIT_MULTIPLIER, ARMOR_REDUCTION_DENOMINATOR, ARMOR_REDUCTION_PER_LEVEL,
  MONSTER_HP_GROWTH, MONSTER_DMG_GROWTH, MONSTER_EXP_GROWTH, MONSTER_GOLD_GROWTH,
  BOSS_HP_MULT, BOSS_DMG_MULT, BOSS_EXP_MULT, BOSS_GOLD_MULT,
  EXP_BASE, EXP_GROWTH_RATE,
  LEVELUP_STAT_MIN, LEVELUP_STAT_MAX, LEVELUP_HP_BONUS, LEVELUP_MP_BONUS,
  SKILL_POINT_EVERY, ENHANCE_STAT_BOOST
} from '../utils/constants.js'

/**
 * 战斗引擎 - 游戏最核心的模块
 * 负责战斗属性计算、战斗循环、怪物生成、装备生成、升级检查
 */
export class CombatEngine {
  constructor(deps) {
    this.save = deps.save
  }

  calcCombatStats() {
    const s = this.save.stats
    const base = {
      damage: s.str * DAMAGE_PER_STR + s.level * DAMAGE_PER_LEVEL,
      armor: s.vit * ARMOR_PER_VIT + s.level * ARMOR_PER_LEVEL,
      max_hp: s.max_hp + s.vit * HP_PER_VIT,
      max_mp: s.max_mp + s.int * MP_PER_INT,
      crit_rate: BASE_CRIT_RATE,
      crit_dmg: BASE_CRIT_DMG,
      lifesteal: 0,
      exp_bonus: 0,
      gold_bonus: 0,
      damage_mult: 1.0,
      armor_flat: 0,
      armor_penalty: 0,
    }
    for (const slot of Object.keys(this.save.equipped || {})) {
      const item = this.save.equipped[slot]
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
      for (const [k, v] of Object.entries(item.stats || {})) {
        if (k in base) base[k] += v
        else if (k === 'damage_bonus') base.damage += v
        else if (k === 'hp_bonus') base.max_hp += v
      }
      for (const [k, v] of Object.entries(item.base || {})) {
        if (k === 'damage') base.damage += v
        else if (k === 'armor') base.armor += v
        else if (k === 'hp') base.max_hp += v
      }
    }
    for (const skillId of Object.keys(this.save.skills || {})) {
      if (skillId in SKILL_TREE) {
        const effect = SKILL_TREE[skillId].effect
        for (const [k, v] of Object.entries(effect)) {
          if (k in base) base[k] += v
        }
      }
    }
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
    const setCounts = {}
    for (const slot of Object.keys(this.save.equipped || {})) {
      const item = this.save.equipped[slot]
      const sname = item.set_name
      if (sname) setCounts[sname] = (setCounts[sname] || 0) + 1
    }
    for (const [sname, count] of Object.entries(setCounts)) {
      if (sname in SET_BONUSES) {
        const bonuses = SET_BONUSES[sname]
        const thresholds = Object.keys(bonuses).map(Number).sort((a, b) => b - a)
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
    base.damage = Math.floor(base.damage * base.damage_mult)
    base.armor = base.armor + base.armor_flat - base.armor_penalty
    base.armor = Math.max(0, base.armor)
    base.hp = Math.min(s.hp, base.max_hp)
    return base
  }

  generateMonster(floor, isBoss = false) {
    if (isBoss && floor <= 1) isBoss = false
    if (isBoss) {
      const eligible = BOSS_TEMPLATES.filter(
        (b) => (b.floor_min || 0) <= floor && floor <= (b.floor_max || 9999)
      )
      const template = eligible.length
        ? eligible[Math.floor(Math.random() * eligible.length)]
        : BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)]
      const base = MONSTER_TEMPLATES[Math.floor(Math.random() * MONSTER_TEMPLATES.length)]
      const name = (template.icon || '👑') + ' ' + template.name
      const hp = Math.floor(base.base_hp * template.hp_mult * (1 + floor * BOSS_HP_MULT))
      const dmg = Math.floor(base.base_dmg * template.dmg_mult * (1 + floor * BOSS_DMG_MULT))
      const exp = Math.floor(base.exp * template.exp_mult * (1 + floor * BOSS_EXP_MULT))
      const gold = Math.floor(base.gold * template.gold_mult * (1 + floor * BOSS_GOLD_MULT))
      return { name, hp, max_hp: hp, damage: dmg, exp, gold, is_boss: true }
    } else {
      const available = MONSTER_TEMPLATES.slice(0, Math.min(floor + 2, MONSTER_TEMPLATES.length))
      const template = available[Math.floor(Math.random() * available.length)]
      const hp = Math.floor(template.base_hp * (1 + floor * MONSTER_HP_GROWTH))
      const dmg = Math.floor(template.base_dmg * (1 + floor * MONSTER_DMG_GROWTH))
      const exp = Math.floor(template.exp * (1 + floor * MONSTER_EXP_GROWTH))
      const gold = Math.floor(template.gold * (1 + floor * MONSTER_GOLD_GROWTH))
      return { name: template.name, hp, max_hp: hp, damage: dmg, exp, gold, is_boss: false }
    }
  }

  doBattle(monster) {
    const combat = this.calcCombatStats()
    let playerHp = combat.hp
    let monsterHp = monster.hp
    const logLines = []
    let roundNum = 0
    while (playerHp > 0 && monsterHp > 0 && roundNum < MAX_BATTLE_ROUNDS) {
      roundNum += 1
      let dmg = combat.damage + randomInt(-Math.floor(combat.damage / 10), Math.floor(combat.damage / 10))
      dmg = Math.max(1, dmg)
      const crit = Math.random() * 100 < combat.crit_rate
      if (crit) {
        dmg = Math.floor(dmg * (BASE_CRIT_MULTIPLIER + (combat.crit_dmg || BASE_CRIT_DMG)))
      }
      monsterHp -= dmg
      const heal = Math.floor((dmg * (combat.lifesteal || 0)) / 100)
      playerHp = Math.min(playerHp + heal, combat.max_hp)
      let action = `⚔️ 你攻击${crit ? '暴击!' : ''}造成${dmg}伤害`
      if (heal > 0) action += `(吸血+${heal})`
      if (monsterHp <= 0) {
        logLines.push(action)
        break
      }
      let mDmg = monster.damage + randomInt(-Math.floor(monster.damage / 10), Math.floor(monster.damage / 10))
      mDmg = Math.max(1, mDmg)
      const reduction = combat.armor / (combat.armor + ARMOR_REDUCTION_DENOMINATOR + (monster.level || 0) * ARMOR_REDUCTION_PER_LEVEL)
      mDmg = Math.floor(mDmg * (1 - reduction))
      playerHp -= mDmg
      logLines.push(`${action} | ${monster.name}反击造成${mDmg}伤害`)
    }
    if (playerHp > 0 && playerHp <= combat.max_hp * 0.25) {
      if (this.save.settings.auto_use_potion) {
        this._autoUsePotionInline(combat)
        playerHp = this.save.stats.hp
      }
    }
    this.save.stats.hp = Math.max(0, playerHp)
    if (playerHp > 0) {
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
      const petEncounter = this._tryPetEncounterInline()
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
      const kept = []
      const autoEquipped = []
      for (const d of drops) {
        if (this.save.settings.auto_sell_white && d.quality === '普通') {
          this.save.stats.gold += 10
        } else {
          if (this._autoEquipIfBetterInline(d)) {
            autoEquipped.push(d.name)
          } else {
            const settings = this.save.settings || {}
            const autoDismantle = settings.auto_dismantle_low_level || false
            const threshold = settings.dismantle_level_threshold || 30
            if (autoDismantle && (d.quality === '史诗' || d.quality === '传说')) {
              const equippedItem = this.save.equipped[d.type]
              const equippedLevel = equippedItem ? equippedItem.level : this.save.floor
              if (d.level < equippedLevel - threshold) {
                const dismantleMsg = this._autoDismantleInline(d)
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
      const levelUpLog = this.checkLevelUp()
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
      this._addBattleLogInline(true, monster.name, `+${monster.exp}EXP +${monster.gold}G`)
      return [true, result]
    } else {
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
      this._addBattleLogInline(false, monster.name, `死亡(连杀${oldStreak})`)
      return [false, deathMsg]
    }
  }

  checkLevelUp() {
    const s = this.save.stats
    let log = ''
    while (s.exp >= s.exp_to_next) {
      s.exp -= s.exp_to_next
      s.level += 1
      s.exp_to_next = Math.floor(EXP_BASE * EXP_GROWTH_RATE ** s.level)
      s.str += randomInt(LEVELUP_STAT_MIN, LEVELUP_STAT_MAX)
      s.agi += randomInt(LEVELUP_STAT_MIN, LEVELUP_STAT_MAX)
      s.int += randomInt(LEVELUP_STAT_MIN, LEVELUP_STAT_MAX)
      s.vit += randomInt(LEVELUP_STAT_MIN, LEVELUP_STAT_MAX)
      s.max_hp += s.vit * LEVELUP_HP_PER_VIT + LEVELUP_HP_BONUS
      s.max_mp += s.int * LEVELUP_MP_PER_INT + LEVELUP_MP_BONUS
      s.hp = s.max_hp
      s.mp = s.max_mp
      if (s.level % SKILL_POINT_EVERY === 0) {
        this.save.skill_points = (this.save.skill_points || 0) + 1
        s.total_skill_points_earned = (s.total_skill_points_earned || 0) + 1
        log += `🆙 升级了！Lv.${s.level} (STR+ AGI+ INT+ VIT+) 🧠 技能点+1\n`
      } else {
        log += `🆙 升级了！Lv.${s.level} (STR+ AGI+ INT+ VIT+)\n`
      }
    }
    return log.trim()
  }

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

  _autoUsePotionInline(combat) {
    const inv = this.save.consumables || {}
    const s = this.save.stats
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
        return `🍷 自动使用${SHOP_ITEMS[key].name} +${s.hp - oldHp}HP`
      }
    }
    return ''
  }

  _autoEquipIfBetterInline(item) {
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

  _tryPetEncounterInline() {
    if ((this.save.pets || []).length >= 3) return null
    if (this.save.pending_pet != null) return null
    if (Math.random() >= 0.15) return null
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
      turn_limit: 5,
    }
    return this.save.pending_pet
  }

  _addBattleLogInline(won, enemy, detail) {
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
}
