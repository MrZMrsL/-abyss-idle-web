<template>
  <div class="space-y-3">
    <!-- Quick Actions -->
    <div class="grid grid-cols-2 gap-3">
      <button
        class="py-3 rounded-xl font-bold text-[var(--bg)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] active:scale-95 transition-transform"
        @click="store.doFight"
      >
        ⚔️ 立即战斗
      </button>
      <button
        class="py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[var(--info)] to-blue-400 active:scale-95 transition-transform"
        @click="store.doRush(10)"
      >
        🔥 Rush×10
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button
        class="py-2 rounded-xl border border-[var(--border)] bg-white/5 text-sm active:scale-95 transition-transform"
        @click="store.doOnline(10)"
      >
        ⏱️ 在线10分钟
      </button>
      <button
        class="py-2 rounded-xl border border-[var(--border)] bg-white/5 text-sm active:scale-95 transition-transform"
        @click="store.doTick"
      >
        🌙 离线1分钟
      </button>
    </div>

    <!-- Combat Stats -->
    <div class="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
      <h3 class="text-[var(--accent)] font-bold mb-3">⚔️ 战斗属性</h3>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="flex justify-between bg-white/5 rounded px-3 py-2">
          <span class="text-[var(--text2)]">攻击</span>
          <span class="font-bold">{{ combat.damage || 0 }}</span>
        </div>
        <div class="flex justify-between bg-white/5 rounded px-3 py-2">
          <span class="text-[var(--text2)]">护甲</span>
          <span class="font-bold">{{ combat.armor || 0 }}</span>
        </div>
        <div class="flex justify-between bg-white/5 rounded px-3 py-2">
          <span class="text-[var(--text2)]">暴击</span>
          <span class="font-bold">{{ combat.crit_rate || 0 }}%</span>
        </div>
        <div class="flex justify-between bg-white/5 rounded px-3 py-2">
          <span class="text-[var(--text2)]">吸血</span>
          <span class="font-bold">{{ combat.lifesteal || 0 }}%</span>
        </div>
      </div>
    </div>

    <!-- Equipped -->
    <div class="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
      <h3 class="text-[var(--accent)] font-bold mb-3">🛡️ 已装备</h3>
      <div class="grid grid-cols-2 gap-2">
        <div
          v-for="(item, slot) in equipped"
          :key="slot"
          class="bg-white/5 rounded-lg p-2 text-xs border"
          :style="{ borderColor: qualityColor(item.quality) + '40' }"
        >
          <div class="font-bold" :style="{ color: qualityColor(item.quality) }">{{ slot }}</div>
          <div class="truncate">{{ item.name }}</div>
        </div>
        <div
          v-for="slot in emptySlots"
          :key="slot"
          class="bg-white/5 rounded-lg p-2 text-xs text-[var(--text2)] border border-dashed border-[var(--border)]"
        >
          <div>{{ slot }}</div>
          <div>未装备</div>
        </div>
      </div>
    </div>

    <!-- Battle Report -->
    <div class="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
      <h3 class="text-[var(--accent)] font-bold mb-2">📜 战斗报告</h3>
      <pre v-if="store.lastReport" class="whitespace-pre-wrap text-sm text-[var(--text)] leading-relaxed">{{ store.lastReport }}</pre>
      <div v-else class="text-center py-6 text-[var(--text2)] text-sm">
        <div class="text-2xl mb-2">🌑</div>
        <div>暂无战斗记录</div>
        <div class="text-xs mt-1 opacity-70">点击上方“立即战斗”开始第一场冒险</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { ITEM_TYPES } from '../data/items.js'
import { QUALITY_COLORS } from '../data/items.js'

const store = useGameStore()
const combat = computed(() => store.combat)
const equipped = computed(() => store.equipped)

const emptySlots = computed(() => {
  return ITEM_TYPES.filter((t) => !equipped.value[t])
})

function qualityColor(q) {
  return QUALITY_COLORS[q] || '#a0a0a0'
}
</script>
