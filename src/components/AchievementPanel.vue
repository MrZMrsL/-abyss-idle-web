<template>
  <div class="space-y-3">
    <div class="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-[var(--accent)] font-bold">🏆 成就</h3>
        <span class="text-sm text-[var(--text2)]">{{ unlockedCount }}/{{ totalCount }}</span>
      </div>
      <div class="grid grid-cols-1 gap-2 max-h-[65vh] overflow-y-auto">
        <div
          v-for="(ach, key) in achievements"
          :key="key"
          class="rounded-lg p-3 flex justify-between items-center"
          :class="isUnlocked(key) ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' : 'bg-white/5 border border-transparent'"
        >
          <div>
            <div class="font-bold text-sm" :class="isUnlocked(key) ? 'text-[var(--accent)]' : 'text-[var(--text2)]'">
              {{ isUnlocked(key) ? '✅' : '🔒' }} {{ ach.name }}
            </div>
            <div class="text-xs text-[var(--text2)]">{{ ach.desc }}</div>
          </div>
          <div class="text-xs text-[var(--accent)] whitespace-nowrap">{{ ach.reward_gold }}G</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { ACHIEVEMENTS } from '../data/achievements.js'

const store = useGameStore()
const achievements = ACHIEVEMENTS
const unlocked = computed(() => store.achievements)
const unlockedCount = computed(() => Object.keys(unlocked.value).length)
const totalCount = computed(() => Object.keys(achievements).length)

function isUnlocked(key) {
  return !!unlocked.value[key]
}
</script>
