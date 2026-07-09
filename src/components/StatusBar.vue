<template>
  <div class="bg-[var(--card)] border-b border-[var(--border)] p-3 shrink-0">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <span class="text-[var(--accent)] font-bold">{{ save?.player_name || '冒险者' }}</span>
        <span class="text-xs text-[var(--text2)]">Lv.{{ stats.level }}</span>
      </div>
      <div class="text-xs text-[var(--text2)]">
        📍 {{ floor }}层 {{ stage }}/10
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="bg-white/5 rounded-lg p-2">
        <div class="flex justify-between text-[var(--text2)] mb-1">
          <span>❤️ HP</span>
          <span>{{ Math.floor(stats.hp) }}/{{ combat.max_hp || stats.max_hp }}</span>
        </div>
        <div class="h-2 bg-black/30 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300" :style="{ width: hpPercent + '%' }"></div>
        </div>
      </div>

      <div class="bg-white/5 rounded-lg p-2">
        <div class="flex justify-between text-[var(--text2)] mb-1">
          <span>✨ EXP</span>
          <span>{{ stats.exp }}/{{ stats.exp_to_next }}</span>
        </div>
        <div class="h-2 bg-black/30 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] transition-all duration-300" :style="{ width: expPercent + '%' }"></div>
        </div>
      </div>
    </div>

    <div class="flex justify-between mt-2 text-xs text-[var(--text2)]">
      <span>💰 {{ formatNumber(stats.gold) }}</span>
      <span>⚔️ {{ combat.damage || 0 }} | 🛡️ {{ combat.armor || 0 }}</span>
      <span>🎒 {{ inventory.length }}/50</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'

const store = useGameStore()
const save = computed(() => store.save)
const stats = computed(() => store.stats)
const combat = computed(() => store.combat)
const floor = computed(() => store.floor)
const stage = computed(() => store.stage)
const inventory = computed(() => store.inventory)

const hpPercent = computed(() => {
  const max = combat.value.max_hp || stats.value.max_hp || 1
  return Math.min(100, Math.max(0, (stats.value.hp / max) * 100))
})

const expPercent = computed(() => {
  return Math.min(100, Math.max(0, (stats.value.exp / stats.value.exp_to_next) * 100))
})

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n
}
</script>
