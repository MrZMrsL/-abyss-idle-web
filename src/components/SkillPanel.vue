<template>
  <div class="space-y-3">
    <div class="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-[var(--accent)] font-bold">📖 技能树</h3>
        <span class="text-sm text-[var(--text2)]">技能点：{{ store.save.skill_points || 0 }}</span>
      </div>
      <div class="space-y-2 max-h-[60vh] overflow-y-auto">
        <div
          v-for="(skill, key) in skillTree"
          :key="key"
          class="bg-white/5 rounded-lg p-3"
          :class="learned(key) ? 'border border-[var(--accent)]' : ''"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="font-bold text-sm">{{ skill.name }}</div>
              <div class="text-xs text-[var(--text2)]">{{ skill.desc }}</div>
              <div class="text-xs text-[var(--text2)] mt-1">
                消耗：{{ skill.cost }}点
                <span v-if="skill.requires.length"> | 前置：{{ skill.requires.map(k => skillTree[k]?.name).join(', ') }}</span>
              </div>
            </div>
            <button
              class="px-3 py-1 rounded text-xs font-bold"
              :class="canLearn(key) ? 'bg-[var(--accent)] text-[var(--bg)]' : 'bg-white/10 text-[var(--text2)]'"
              :disabled="!canLearn(key)"
              @click="store.learnSkill(key)"
            >
              {{ learned(key) ? '已学' : '学习' }}
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
</script>
