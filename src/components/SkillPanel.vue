<template>
  <div class="space-y-3">
    <!-- 技能点 -->
    <div class="card p-3 flex items-center justify-between">
      <span class="text-sm text-[var(--text2)]">🧠 可用技能点</span>
      <span class="text-2xl font-bold text-[var(--accent2)]">{{ skillPoints }}</span>
    </div>

    <!-- 技能列表 -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-3">📖 技能树</h3>
      <div class="space-y-2 max-h-[60vh] overflow-y-auto">
        <div
          v-for="(skill, key) in skillTree"
          :key="key"
          class="rounded-lg p-3 border transition-all"
          :class="learned(key) 
            ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5' 
            : 'border-[var(--border)] bg-white/[0.03]'"
        >
          <div class="flex justify-between items-start gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg">{{ skillIcon(skill.effect) }}</span>
                <span class="font-bold text-sm" :class="learned(key) ? 'text-[var(--accent)]' : 'text-[var(--text)]'">
                  {{ skill.name }}
                </span>
                <span v-if="learned(key)" class="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-bold">
                  ✅ 已学
                </span>
              </div>
              <div class="text-xs text-[var(--text2)] mb-1">{{ skill.desc }}</div>
              <div class="text-[10px] text-[var(--text3)]">
                <span>消耗: {{ skill.cost }}点</span>
                <span v-if="skill.requires.length" class="ml-2">
                  前置: {{ skill.requires.map(k => skillTree[k]?.name).join(', ') }}
                </span>
              </div>
            </div>
            <button
              v-if="!learned(key)"
              class="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all"
              :class="canLearn(key) 
                ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] text-[var(--bg)] active:scale-95' 
                : 'bg-white/5 text-[var(--text3)] cursor-not-allowed'"
              :disabled="!canLearn(key)"
              @click="store.learnSkill(key)"
            >
              {{ canLearn(key) ? '学习' : '未解锁' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { SKILL_TREE } from '../data/skills.js'

const store = useGameStore()
const skillTree = SKILL_TREE
const learnedSkills = computed(() => store.save?.skills || {})
const skillPoints = computed(() => store.save?.skill_points || 0)

function learned(key) {
  return !!learnedSkills.value[key]
}

function canLearn(key) {
  if (learned(key)) return false
  const skill = skillTree[key]
  if (skillPoints.value < skill.cost) return false
  if (skill.requires.some((r) => !learned(r))) return false
  return true
}

function skillIcon(effect) {
  if (effect.damage_bonus) return '⚔️'
  if (effect.hp_bonus || effect.max_hp) return '❤️'
  if (effect.armor) return '🛡️'
  if (effect.crit_rate) return '💥'
  if (effect.lifesteal) return '🩸'
  if (effect.exp_bonus) return '⭐'
  if (effect.gold_bonus) return '💰'
  if (effect.mp_bonus || effect.max_mp) return '🔵'
  return '📖'
}
</script>
