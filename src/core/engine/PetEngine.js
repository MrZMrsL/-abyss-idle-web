import {
  PET_TEMPLATES, PET_UPGRADE_COST, PET_EGG_SHOP,
  WILD_PET_CHANCE, WILD_PET_TURN_LIMIT
} from '../../data/pets.js'
import { randomInt, weightedRandom } from '../utils/helpers.js'
import { MAX_PET_COUNT } from '../utils/constants.js'

/**
 * 宠物引擎 - 管理宠物的遭遇、捕捉、升级、融合、切换、放生、孵蛋
 */
export class PetEngine {
  constructor(deps) {
    this.save = deps.save
    this.combat = deps.combatEngine
  }

  tryPetEncounter() {
    if ((this.save.pets || []).length >= MAX_PET_COUNT) return null
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

  catchPet() {
    const pending = this.save.pending_pet
    if (!pending) return '🐾 当前没有可驯服的野生宠物，继续战斗吧！'
    if ((this.save.pets || []).length >= MAX_PET_COUNT) {
      return '🐾 宠物背包已满（最多3只）！先用 release_pet 放生一只。'
    }

    const combat = this.combat.calcCombatStats()
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

  hatchEgg(eggKey) {
    const eggs = this.save.pet_eggs || []
    const foundIdx = eggs.indexOf(eggKey)
    if (foundIdx === -1) {
      return `❌ 你没有 ${(PET_EGG_SHOP[eggKey] || {}).name || eggKey}`
    }
    if ((this.save.pets || []).length >= MAX_PET_COUNT) {
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

  fusePets(mainIdx, subIdx) {
    const pets = this.save.pets || []
    if (pets.length < 2) return '🐾 需要至少两只宠物才能融合'
    if (mainIdx < 0 || mainIdx >= pets.length || subIdx < 0 || subIdx >= pets.length) {
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
          extra.push({ passive: subPassive, val: subPval, from: subTmpl.name || '' })
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

  switchPet(idx) {
    const pets = this.save.pets || []
    if (!pets.length) return '🐾 没有宠物可以切换'
    if (idx < 0 || idx >= pets.length) return `🐾 位置${idx}没有宠物（当前有${pets.length}只）`
    this.save.active_pet_idx = idx
    const pet = pets[idx]
    const tmpl = PET_TEMPLATES[pet.template] || {}
    return `🐾 出战宠物切换为 ${tmpl.icon || ''}${tmpl.name || ''} Lv.${pet.level || 1}`
  }

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
}
