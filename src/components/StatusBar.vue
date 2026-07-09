<template>
  <div class="shrink-0 border-b border-[var(--border)]" style="background: linear-gradient(180deg, var(--card2) 0%, var(--card) 100%);">
    <!-- 第一行：玩家信息 + 层数 + 金币 -->
    <div class="flex items-center justify-between px-3 pt-2 pb-1">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="text-sm font-bold text-[var(--accent)] truncate max-w-[80px]">{{ save?.player_name || '冒险者' }}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-bold">Lv.{{ stats.level }}</span>
      </div>
      <div class="flex items-center gap-2 text-xs text-[var(--text2)]">
        <span class="flex items-center gap-1">
          <span>🏰</span>
          <span class="font-medium text-[var(--text)]">{{ floor }}层</span>
          <span>{{ stage }}/10</span>
        </span>
        <span v-if="stats.consecutive_wins > 0" class="flex items-center gap-0.5 text-orange-400">
          <span class="animate-pulse">🔥</span>
          <span class="font-bold">{{ stats.consecutive_wins }}</span>
        </span>
      </div>
      <div class="flex items-center gap-1 text-xs font-bold text-[var(--accent2)]">
        <span>💰</span>
        <span>{{ formatNumber(stats.gold || 0) }}</span>
      </div>
    </div>

    <!-- 第二行：HP条 + EXP条 -->
    <div class="grid grid-cols-2 gap-2 px-3 py-1.5">
      <!-- HP -->
      <div class="bg-white/[0.04] rounded-lg p-1.5">
        <div class="flex justify-between text-[10px] text-[var(--text2)] mb-1">
          <span>❤️ HP</span>
          <span class="text-[var(--text)]">{{ Math.floor(stats.hp) }}/{{ formatNumber(maxHp) }}</span>
        </div>
        <div class="h-1.5 bg-black/40 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="hpPercent < 25 ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-green-600 to-green-400'"
            :style="{ width: hpPercent + '%' }"
          />
        </div>
      </div>
      <!-- EXP -->
      <div class="bg-white/[0.04] rounded-lg p-1.5">
        <div class="flex justify-between text-[10px] text-[var(--text2)] mb-1">
          <span>✨ EXP</span>
          <span class="text-[var(--text)]">{{ formatNumber(stats.exp) }}/{{ formatNumber(stats.exp_to_next) }}</span>
        </div>
        <div class="h-1.5 bg-black/40 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] rounded-full transition-all duration-500"
            :style="{ width: expPercent + '%' }"
          />
        </div>
      </div>
    </div>

    <!-- 第三行：战斗属性 -->
    <div class="flex items-center justify-between px-3 pb-2 text-[10px]">
      <div class="flex items-center gap-2.5">
        <span class="flex items-center gap-0.5">
          <span class="text-red-400">⚔️</span>
          <span class="text-[var(--text)] font-medium">{{ formatNumber(combat.damage || 0) }}</span>
        </span>
        <span class="flex items-center gap-0.5">
          <span class="text-blue-400">🛡️</span>
          <span class="text-[var(--text)] font-medium">{{ formatNumber(combat.armor || 0) }}</span>
        </span>
        <span class="flex items-center gap-0.5">
          <span class="text-yellow-400">💥</span>
          <span class="text-[var(--text)] font-medium">{{ combat.crit_rate || 0 }}%</span>
        </span>
        <span class="flex items-center gap-0.5">
          <span class="text-purple-400">🩸</span>
          <span class="text-[var(--text)] font-medium">{{ combat.lifesteal || 0 }}%</span>
        </span>
      </div>
      <span class="text-[var(--text3)]">🎒 {{ (inventory || []).length }}/50</span>
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
const combat = computed(() => store.combat)
const floor = computed(() => store.floor)
const stage = computed(() => store.stage)
const inventory = computed(() => store.inventory)

const maxHp = computed(() => combat.value.max_hp || stats.value.max_hp || 1)

const hpPercent = computed(() => {
  const max = maxHp.value
  return Math.min(100, Math.max(0, (stats.value.hp / max) * 100))
})

const expPercent = computed(() => {
  return Math.min(100, Math.max(0, (stats.value.exp / stats.value.exp_to_next) * 100))
})
</script>
