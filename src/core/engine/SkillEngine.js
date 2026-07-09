import { SKILL_TREE } from '../../data/skills.js'

/**
 * 技能引擎 - 管理技能树的学习和查询
 */
export class SkillEngine {
  constructor(deps) {
    this.save = deps.save
  }

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
}
