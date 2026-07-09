<template>
  <div class="space-y-6 animate-fade-in pb-4">
    <!-- ===== Skill Points Header ===== -->
    <div class="card p-5 flex items-center justify-center gap-3">
      <span class="text-3xl">💎</span>
      <div class="text-center">
        <div class="text-xs text-[var(--text2)]">可用技能点</div>
        <div class="text-2xl font-bold text-[var(--accent)]">{{ skillPoints }}</div>
      </div>
    </div>

    <!-- ===== Learned Skills ===== -->
    <div v-if="learnedList.length > 0" class="card p-5">
      <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-base">
        ✅ 已学技能 ({{ learnedList.length }})
      </h3>
      <div class="grid grid-cols-1 gap-3">
        <div
          v-for="{ skill, key } in learnedList"
          :key="key"
          class="rounded-xl p-4 border-2 card-press"
          :class="getSkillBranchColor(key)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-lg">{{ branchIcon(key) }}</span>
              <div class="min-w-0">
                <div class="font-bold text-base truncate">{{ skill.name }}</div>
                <div class="text-xs text-[var(--text2)]">{{ skill.desc }}</div>
              </div>
            </div>
            <span class="text-xs font-bold text-[var(--accent)] shrink-0 ml-2">✅ 已学</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Available Skills ===== -->
    <div v-if="availableList.length > 0" class="card p-5">
      <h3 class="text-[var(--success)] font-bold mb-3 flex items-center gap-1.5 text-base">
        📖 可学习 ({{ availableList.length }})
      </h3>
      <div class="grid grid-cols-1 gap-3">
        <div
          v-for="{ skill, key } in availableList"
          :key="key"
          class="rounded-xl p-4 border border-[var(--border)] bg-white/[0.03] card-press"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="text-lg">{{ branchIcon(key) }}</span>
              <div class="min-w-0 flex-1">
                <div class="font-bold text-base truncate">{{ skill.name }}</div>
                <div class="text-xs text-[var(--text2)]">{{ skill.desc }}</div>
                <div class="text-xs text-[var(--accent)] mt-0.5">
                  💎 消耗 {{ skill.cost }} 技能点
                  <span v-if="skill.requires.length">
                    | 前置：{{ skill.requires.map(r => skillTree[r]?.name).join(', ') }}
                  </span>
                </div>
              </div>
            </div>
            <button
              class="btn-primary text-xs py-2 px-3 min-h-[36px] shrink-0"
              @click="store.learnSkill(key)"
            >
              学习
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Locked Skills ===== -->
    <div v-if="lockedList.length > 0" class="card p-5">
      <h3 class="text-[var(--text3)] font-bold mb-3 flex items-center gap-1.5 text-base">
        🔒 未解锁 ({{ lockedList.length }})
      </h3>
      <div class="grid grid-cols-1 gap-3">
        <div
          v-for="{ skill, key, reason } in lockedList"
          :key="key"
          class="rounded-xl p-4 border border-[var(--border)] bg-white/[0.02] opacity-60"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-lg grayscale">{{ branchIcon(key) }}</span>
            <div class="min-w-0 flex-1">
              <div class="font-bold text-base truncate text-[var(--text3)]">{{ skill.name }}</div>
              <div class="text-xs text-[var(--text3)]">{{ skill.desc }}</div>
              <div class="text-xs text-[var(--danger)] mt-0.5">
                {{ reason }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Empty State ===== -->
    <div v-if="learnedList.length === 0 && availableList.length === 0" class="card p-6 text-center">
      <div class="text-4xl mb-3">📖</div>
      <div class="text-base text-[var(--text2)]">暂无可用技能</div>
      <div class="text-xs text-[var(--text3)] mt-1">升级可获得技能点</div>
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

function getLockReason(key) {
  const skill = skillTree[key]
  if (skillPoints.value < skill.cost) {
    return `技能点不足（需 ${skill.cost} 点）`
  }
  if (skill.requires.some((r) => !learned(r))) {
    const missing = skill.requires.filter((r) => !learned(r)).map((r) => skillTree[r]?.name)
    return `前置技能未学习：${missing.join(', ')}`
  }
  return ''
}

// ===== Skill Lists =====
const learnedList = computed(() => {
  return Object.entries(skillTree)
    .filter(([, , key]) => learned(key))
    .map(([key, skill]) => ({ key, skill }))
})

const availableList = computed(() => {
  return Object.entries(skillTree)
    .filter(([key]) => canLearn(key))
    .map(([key, skill]) => ({ key, skill }))
})

const lockedList = computed(() => {
  return Object.entries(skillTree)
    .filter(([key]) => !learned(key) && !canLearn(key))
    .map(([key, skill]) => ({ key, skill, reason: getLockReason(key) }))
})

// ===== Branch Icons & Colors =====
function branchIcon(key) {
  if (key.startsWith('str')) return '💪'
  if (key.startsWith('vit')) return '❤️'
  if (key.startsWith('agi')) return '⚡'
  if (key.startsWith('int') || key === 'exp_boost') return '🧠'
  if (key === 'gold_boost') return '💰'
  if (key === 'berserk') return '😤'
  if (key === 'iron_skin') return '🛡️'
  if (key === 'crit_master') return '🎯'
  if (key === 'lifesteal') return '🧛'
  return '📖'
}

function getSkillBranchColor(key) {
  if (key.startsWith('str')) return 'border-amber-700/60 bg-amber-950/20'
  if (key.startsWith('vit')) return 'border-emerald-700/60 bg-emerald-950/20'
  if (key.startsWith('agi')) return 'border-cyan-700/60 bg-cyan-950/20'
  if (key.startsWith('int') || key === 'exp_boost') return 'border-indigo-700/60 bg-indigo-950/20'
  return 'border-[var(--accent)]/40 bg-[var(--accent)]/10'
}
</script>
