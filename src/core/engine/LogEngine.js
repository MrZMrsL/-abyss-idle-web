import { ACHIEVEMENTS } from '../../data/achievements.js'
import { SET_COLORS, SET_BONUSES } from '../../data/items.js'
import { PET_TEMPLATES } from '../../data/pets.js'
import { nowISO } from '../utils/helpers.js'
import { MAX_LOG_ENTRIES } from '../utils/constants.js'

/**
 * 日志引擎 - 管理战斗日志和玩家状态格式化输出
 */
export class LogEngine {
  constructor(deps) {
    this.save = deps.save
  }

  addBattleLog(won, enemy, detail) {
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
    this.save.log = log.slice(0, MAX_LOG_ENTRIES)
  }

  getBattleLog() {
    const log = this.save.log || []
    if (!log.length) return '📜 暂无战斗记录'
    const lines = ['📜 最近战斗记录：']
    for (const entry of log.slice(0, MAX_LOG_ENTRIES)) {
      lines.push(
        `  [${entry.time}] ${entry.result} ${entry.enemy} | ${entry.detail} | 层${entry.floor} 连杀${entry.streak}`
      )
    }
    return lines.join('\n')
  }

  getStatus(playerName, combatStats) {
    const s = this.save.stats
    const streak = s.consecutive_wins || 0

    let streakBuff = ''
    if (streak >= 100) {
      streakBuff = ` 🔥连杀${streak}(+${Math.floor(streak / 50)}%暴击 +${Math.floor(streak / 100) * 5}%伤害/金币)`
    } else if (streak >= 50) {
      streakBuff = ` 🔥连杀${streak}(+${Math.floor(streak / 50)}%暴击)`
    }

    const lines = [
      `═══ ${playerName} 状态 ═══`,
      `📊 Lv.${s.level} | EXP: ${s.exp}/${s.exp_to_next}`,
      `❤️ HP: ${s.hp}/${combatStats.max_hp} | 🔵 MP: ${s.mp}/${combatStats.max_mp}`,
      `⚔️ 攻击: ${combatStats.damage} | 🛡️ 护甲: ${combatStats.armor} | 💥 暴击: ${combatStats.crit_rate}%`,
      `💰 金币: ${s.gold} | 💀 死亡: ${s.deaths} | 🗡️ 击杀: ${s.total_kills}${streakBuff}`,
      `📍 第${this.save.floor}层 第${this.save.stage}/10关`,
      `🎒 背包: ${(this.save.inventory || []).length}/50`,
    ]

    const pets = this.save.pets || []
    const activeIdx = this.save.active_pet_idx || 0
    if (pets.length) {
      const pet = activeIdx >= 0 && activeIdx < pets.length ? pets[activeIdx] : pets[0]
      const tmpl = PET_TEMPLATES[pet.template] || {}
      const petDesc = combatStats.pet_desc || `${tmpl.icon || '🐾'}${tmpl.name || '宠物'} Lv.${pet.level || 1}`
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
}
