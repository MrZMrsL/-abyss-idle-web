import {
  MAX_OFFLINE_MINUTES, OFFLINE_BATTLES_PER_MINUTE, ONLINE_BATTLES_PER_MINUTE,
  MAX_RUSH_COUNT,
  OFFLINE_HEAL_PER_MINUTE, ONLINE_HEAL_PER_MINUTE,
  OFFLINE_HEAL_THRESHOLD, ONLINE_HEAL_THRESHOLD,
  OFFLINE_MIN_REST_RATIO, ONLINE_MIN_REST_RATIO,
  OFFLINE_CONTINUE_HP_THRESHOLD, ONLINE_CONTINUE_HP_THRESHOLD,
  OFFLINE_CONTINUE_HEAL, ONLINE_CONTINUE_HEAL,
  ONLINE_GOLD_BONUS, ONLINE_EXP_BONUS,
  BOSS_STAGE_INTERVAL
} from '../utils/constants.js'

/**
 * 进度引擎 —— 管理离线挂机、在线挂机、快速推图三种进度模式。
 */
export class ProgressEngine {
  constructor(deps) {
    this.save = deps.save
    this.combat = deps.combatEngine
    this.quest = deps.questEngine
    this.log = deps.logEngine
  }

  processOffline(minutes) {
    if (minutes <= 0) return ''
    minutes = Math.min(minutes, MAX_OFFLINE_MINUTES)
    const startFloor = this.save.floor
    const report = [`⏱️ 离线${minutes}分钟，自动战斗报告：`]
    const milestones = []
    const s = this.save.stats
    let combat = this.combat.calcCombatStats()
    let currentHp = s.hp
    const maxHp = combat.max_hp

    let restMinutes = 0
    if (currentHp < maxHp * OFFLINE_HEAL_THRESHOLD) {
      const needed = maxHp - currentHp
      const healPerMin = maxHp * OFFLINE_HEAL_PER_MINUTE
      restMinutes = Math.min(Math.floor(needed / healPerMin) + 1, Math.floor(minutes * OFFLINE_MIN_REST_RATIO))
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

    for (let i = 0; i < minutes * OFFLINE_BATTLES_PER_MINUTE; i++) {
      combat = this.combat.calcCombatStats()
      if (s.hp <= combat.max_hp * OFFLINE_CONTINUE_HP_THRESHOLD) {
        s.hp = Math.min(s.hp + combat.max_hp * OFFLINE_CONTINUE_HEAL, combat.max_hp)
        continue
      }
      const isBoss = this.save.stage >= BOSS_STAGE_INTERVAL
      const monster = this.combat.generateMonster(this.save.floor, isBoss)
      const [won] = this.combat.doBattle(monster)
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
        this.save.stage = Math.max(1, this.save.stage - STAGE_REGRESS_ON_DEATH)
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

  processOnline(minutes) {
    if (minutes <= 0) return ''
    this.save.online_mode = true
    const startFloor = this.save.floor
    const report = [`🔥 在线挂机${minutes}分钟，双倍效率战斗报告：`]
    const milestones = []
    const s = this.save.stats
    let combat = this.combat.calcCombatStats()
    let currentHp = s.hp
    const maxHp = combat.max_hp

    let restMinutes = 0
    if (currentHp < maxHp * ONLINE_HEAL_THRESHOLD) {
      const needed = maxHp - currentHp
      const healPerMin = maxHp * ONLINE_HEAL_PER_MINUTE
      restMinutes = Math.min(Math.floor(needed / healPerMin) + 1, Math.floor(minutes * ONLINE_MIN_REST_RATIO))
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

    for (let i = 0; i < minutes * ONLINE_BATTLES_PER_MINUTE; i++) {
      combat = this.combat.calcCombatStats()
      if (s.hp <= combat.max_hp * ONLINE_CONTINUE_HP_THRESHOLD) {
        s.hp = Math.min(s.hp + combat.max_hp * ONLINE_CONTINUE_HEAL, combat.max_hp)
        continue
      }
      const isBoss = this.save.stage >= BOSS_STAGE_INTERVAL
      const monster = this.combat.generateMonster(this.save.floor, isBoss)
      const [won] = this.combat.doBattle(monster)
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
        this.save.stage = Math.max(1, this.save.stage - STAGE_REGRESS_ON_DEATH)
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
    report.push(`💰 金币已加成(+${Math.floor(ONLINE_GOLD_BONUS * 100)}%) | 📈 经验已加成(+${Math.floor(ONLINE_EXP_BONUS * 100)}%)`)
    report.push(`📍 当前：第${this.save.floor}层 第${this.save.stage}/10关`)
    this.save.online_mode = false
    return report.join('\n')
  }

  rushBattles(count) {
    if (count <= 0) return ''
    if (count > MAX_RUSH_COUNT) return `❌ 一次最多推${MAX_RUSH_COUNT}场`

    this.save.online_mode = true
    const reports = [`🚀 快速推图 x${count}场：`]

    for (let i = 0; i < count; i++) {
      const s = this.save.stats
      const combat = this.combat.calcCombatStats()

      if (s.hp <= combat.max_hp * ONLINE_CONTINUE_HP_THRESHOLD) {
        reports.push(`⏹️ 第${i + 1}场：血量过低，暂停`)
        break
      }

      const isBoss = this.save.stage >= BOSS_STAGE_INTERVAL
      const monster = this.combat.generateMonster(this.save.floor, isBoss)
      const [won] = this.combat.doBattle(monster)

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
        this.save.stage = Math.max(1, this.save.stage - STAGE_REGRESS_ON_DEATH)
        reports.push(`💀 第${i + 1}场：被${monster.name}击败`)
        break
      }
    }

    this.save.online_mode = false
    reports.push(`📍 当前：第${this.save.floor}层 第${this.save.stage}/10关`)
    return reports.join('\n')
  }
}
