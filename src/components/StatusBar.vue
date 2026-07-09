<template>
  <div
    class="shrink-0 w-full border-b z-20"
    style="background: rgba(13, 13, 26, 0.9); border-color: var(--border); backdrop-filter: blur(8px);"
  >
    <!-- Row 1: Core Info (Level, Gold, AP) -->
    <div class="flex items-center justify-between px-4 py-2">
      <div class="flex items-center gap-2">
        <!-- Level -->
        <div class="flex items-center gap-1">
          <span class="text-sm">📊</span>
          <span class="text-sm font-bold text-[var(--accent)]">Lv.{{ stats.level || 1 }}</span>
        </div>
        <!-- Divider -->
        <div class="w-px h-3.5 bg-white/10" />
        <!-- Gold -->
        <div class="flex items-center gap-1">
          <span class="text-sm">💰</span>
          <span class="text-sm font-bold text-[var(--accent)]">{{ formatNumber(stats.gold || 0) }}</span>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-sm">💎</span>
        <span class="text-sm font-bold text-[var(--accent)]">{{ stats.ap || 0 }} AP</span>
      </div>
    </div>

    <!-- Row 2: HP + EXP Bars -->
    <div class="px-4 pb-2 space-y-1.5">
      <!-- HP Bar -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-red-400 font-medium w-6">HP</span>
        <div class="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            style="background: linear-gradient(90deg, #c0392b, #e74c3c);"
            :style="{ width: hpPercent + '%' }"
          />
        </div>
        <span class="text-xs text-[var(--text2)] tabular-nums w-24 text-right">
          {{ formatNumber(stats.hp || 0) }} / {{ formatNumber(stats.max_hp || 100) }}
        </span>
      </div>
      <!-- EXP Bar -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-blue-400 font-medium w-6">EXP</span>
        <div class="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            style="background: linear-gradient(90deg, #2980b9, #3498db);"
            :style="{ width: expPercent + '%' }"
          />
        </div>
        <span class="text-xs text-[var(--text2)] tabular-nums w-24 text-right">
          {{ formatNumber(stats.exp || 0) }} / {{ formatNumber(expToNext) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { formatNumber } from '../core/utils/formatters.js'

const store = useGameStore()
const stats = computed(() => store.stats || {})

const hpPercent = computed(() => {
  const max = stats.value.max_hp || 100
  return max > 0 ? Math.min(100, ((stats.value.hp || 0) / max) * 100) : 100
})

const expToNext = computed(() => {
  const level = stats.value.level || 1
  return Math.floor(100 * Math.pow(1.15, level - 1))
})

const expPercent = computed(() => {
  const target = expToNext.value
  return target > 0 ? Math.min(100, ((stats.value.exp || 0) / target) * 100) : 0
})
</script>
