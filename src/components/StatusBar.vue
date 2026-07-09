<template>
  <div class="shrink-0 border-b border-[var(--border)]" style="background: linear-gradient(180deg, var(--card2) 0%, var(--card) 100%);">
    <!-- 第一行：核心信息 -->
    <div class="flex items-center justify-between px-4 py-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-sm font-bold text-[var(--accent)] truncate max-w-[80px]">{{ save?.player_name || '冒险者' }}</span>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-bold">Lv.{{ stats.level }}</span>
      </div>
      <div class="flex items-center gap-3 text-xs text-[var(--text2)]">
        <span class="flex items-center gap-1">
          <span>🏰</span>
          <span class="font-medium text-[var(--text)]">{{ floor }}层</span>
          <span class="text-[var(--text3)]">{{ stage }}/10</span>
        </span>
        <span v-if="stats.consecutive_wins > 0" class="flex items-center gap-0.5 text-orange-400">
          <span class="animate-pulse">🔥</span>
          <span class="font-bold">{{ stats.consecutive_wins }}</span>
        </span>
      </div>
      <div class="flex items-center gap-1 text-xs font-bold text-[var(--accent2)] shrink-0">
        <span>💰</span>
        <span>{{ formatNumber(stats.gold || 0) }}</span>
      </div>
    </div>

    <!-- 第二行：HP + EXP 条 -->
    <div class="grid grid-cols-2 gap-3 px-4 pb-2">
      <div class="flex items-center gap-2">
        <span class="text-xs">❤️</span>
        <div class="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="hpPercent < 25 ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-green-600 to-green-400'"
            :style="{ width: hpPercent + '%' }"
          />
        </div>
        <span class="text-[10px] text-[var(--text2)] w-14 text-right">{{ Math.floor(stats.hp) }}/{{ formatNumber(maxHp) }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs">✨</span>
        <div class="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] rounded-full transition-all duration-500"
            :style="{ width: expPercent + '%' }"
          />
        </div>
        <span class="text-[10px] text-[var(--text2)] w-14 text-right">{{ formatNumber(stats.exp) }}/{{ formatNumber(stats.exp_to_next) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { formatNumber } from '../core/utils/formatters.js'

const store = useGameStore()
const save = computed(() => store.save)
const stats = computed(() => store.stats)
const floor = computed(() => store.floor)
const stage = computed(() => store.stage)

const maxHp = computed(() => store.combat?.max_hp || stats.value.max_hp || 1)

const hpPercent = computed(() => {
  return Math.min(100, Math.max(0, (stats.value.hp / maxHp.value) * 100))
})

const expPercent = computed(() => {
  return Math.min(100, Math.max(0, (stats.value.exp / stats.value.exp_to_next) * 100))
})
</script>
