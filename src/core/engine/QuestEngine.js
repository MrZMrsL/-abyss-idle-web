import { ACHIEVEMENTS } from '../../data/achievements.js'
import { DAILY_QUEST_TEMPLATES } from '../../data/dailyQuests.js'
import { SET_BONUSES } from '../../data/items.js'
import { PET_TEMPLATES } from '../../data/pets.js'
import { GEM_TYPES } from '../../data/gems.js'
import { SKILL_TREE } from '../../data/skills.js'
import { nowISO, todayISO } from '../utils/helpers.js'

/**
 * 任务引擎 - 管理每日任务和成就系统
 */
export class QuestEngine {
  constructor(deps) {
    this.save = deps.save
  }

  checkDailyReset() {
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

  trackQuest(questId, amount = 1) {
    const dq = this.save.daily_quests || {}
    const quests = dq.quests || {}
    const completed = dq.completed || []

    if (questId in quests && !completed.includes(questId)) {
      quests[questId].progress = (quests[questId].progress || 0) + amount
      if (quests[questId].progress >= quests[questId].target) {
        this.completeQuest(questId)
      }
    }
  }

  completeQuest(questId) {
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

  getDailyQuests() {
    this.checkDailyReset()
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

  checkAchievements(combatStats) {
    const s = this.save.stats
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
    if (combatStats.max_hp >= 500) unlock('hp_500')
    if (combatStats.max_hp >= 1000) unlock('hp_1000')
    if (combatStats.max_hp >= 2000) unlock('hp_2000')
    if (combatStats.max_hp >= 5000) unlock('hp_5000')
    if (combatStats.damage >= 100) unlock('dmg_100')
    if (combatStats.damage >= 300) unlock('dmg_300')
    if (combatStats.damage >= 500) unlock('dmg_500')
    if (combatStats.damage >= 1000) unlock('dmg_1000')
    if (combatStats.armor >= 50) unlock('armor_50')
    if (combatStats.armor >= 100) unlock('armor_100')
    if (combatStats.armor >= 200) unlock('armor_200')
    if (combatStats.armor >= 500) unlock('armor_500')
    if (combatStats.crit_rate >= 30) unlock('crit_30')
    if (combatStats.crit_rate >= 50) unlock('crit_50')
    if (combatStats.crit_rate >= 70) unlock('crit_70')
    if (combatStats.crit_rate >= 90) unlock('crit_90')

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

    const equippedItems = Object.values(this.save.equipped || {})
    if (equippedItems.length >= 7) unlock('equip_full')
    if (equippedItems.length >= 7 && equippedItems.every((i) => i.quality === '史诗' || i.quality === '传说')) unlock('full_epic')
    if (equippedItems.length >= 7 && equippedItems.every((i) => i.quality === '传说')) unlock('full_legend')

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

  forceCheckAchievements(combatStats) {
    const logs = this.checkAchievements(combatStats)
    return logs.join('\n')
  }

  getAchievements() {
    const lines = ['🏆 成就列表：']
    for (const [key, ach] of Object.entries(ACHIEVEMENTS)) {
      const status = key in this.save.achievements ? '✅' : '⬜'
      lines.push(`  ${status} ${ach.name}: ${ach.desc} (奖励:${ach.reward_gold}G)`)
    }
    return lines.join('\n')
  }
}
