<template>
  <div class="space-y-3">
    <!-- 进度概览 -->
    <div class="card p-3">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-bold text-[var(--accent)]">🏆 成就</h3>
        <span class="text-sm text-[var(--text2)]">
          <span class="text-[var(--accent2)] font-bold">{{ completedCount }}</span>
          <span> / {{ totalCount }}</span>
        </span>
      </div>
      <!-- 进度条 -->
      <div class="h-2 bg-black/30 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] rounded-full transition-all duration-500"
          :style="{ width: progressPercent + '%' }"
        />
      </div>
      <div class="text-center text-[10px] text-[var(--text3)] mt-1">
        完成度 {{ progressPercent }}%
      </div>
    </div>

    <!-- 分类标签 -->
    <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all"
        :class="activeCategory === cat.key 
          ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30'
          : 'bg-white/5 text-[var(--text3)] border border-transparent'"
        @click="activeCategory = cat.key"
      >
        {{ cat.icon }} {{ cat.label }} ({{ catCount(cat.key) }})
      </button>
    </div>

    <!-- 成就列表 -->
    <div class="space-y-2">
      <div
        v-for="ach in filteredAchievements"
        :key="ach.key"
        class="rounded-lg p-3 border transition-all flex items-start gap-3"
        :class="ach.completed
          ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5'
          : 'border-[var(--border)] bg-white/[0.03] opacity-60'"
      >
        <!-- 状态图标 -->
        <div class="text-lg shrink-0 mt-0.5">
          {{ ach.completed ? '✅' : '🔒' }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm" :class="ach.completed ? 'text-[var(--accent)]' : 'text-[var(--text)]'">
              {{ ach.name }}
            </span>
            <span class="text-xs text-[var(--accent2)] flex items-center gap-0.5">
              <span>💰</span>
              <span>{{ formatNumber(ach.reward_gold) }}</span>
            </span>
          </div>
          <div class="text-xs text-[var(--text2)] mt-0.5">{{ ach.desc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { ACHIEVEMENTS } from '../data/achievements.js'
import { formatNumber } from '../core/utils/formatters.js'

const store = useGameStore()
const achievements = computed(() => store.achievements || {})
const totalCount = Object.keys(ACHIEVEMENTS).length
const completedCount = computed(() => Object.keys(achievements.value).length)
const progressPercent = computed(() => Math.floor((completedCount.value / totalCount) * 100))

const activeCategory = ref('all')

const categories = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'combat', label: '战斗', icon: '⚔️' },
  { key: 'growth', label: '成长', icon: '📈' },
  { key: 'wealth', label: '财富', icon: '💰' },
  { key: 'equip', label: '装备', icon: '🛡️' },
  { key: 'explore', label: '探索', icon: '🗺️' },
  { key: 'pet', label: '宠物', icon: '🐾' },
]

function getCategory(key) {
  if (key.match(/^(kill_|boss_|streak_|first_blood|first_death|die_)/)) return 'combat'
  if (key.match(/^(level_|hp_|dmg_|armor_|crit_)/)) return 'growth'
  if (key.match(/^(gold_|earn_total_|first_shop|shop_)/)) return 'wealth'
  if (key.match(/^(floor_|first_potion|potion_)/)) return 'explore'
  if (key.match(/^(pet_|divine_pet|abyssal_pet)/)) return 'pet'
  return 'equip'
}

function catCount(catKey) {
  if (catKey === 'all') return totalCount
  return Object.keys(ACHIEVEMENTS).filter(k => getCategory(k) === catKey).length
}

const filteredAchievements = computed(() => {
  const list = Object.entries(ACHIEVEMENTS).map(([key, ach]) => ({
    key,
    ...ach,
    completed: key in achievements.value,
    category: getCategory(key),
  }))
  if (activeCategory.value === 'all') return list
  return list.filter(a => a.category === activeCategory.value)
})
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
