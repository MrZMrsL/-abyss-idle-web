<template>
  <div class="space-y-6 pb-4 animate-fade-in">
    <!-- ===== 进度概览 ===== -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-[var(--accent)] font-bold text-base flex items-center gap-2">
          🏆 成就
        </h3>
        <span class="text-sm text-[var(--text2)] font-medium">
          {{ completedCount }}/{{ totalCount }}
        </span>
      </div>

      <!-- 进度条 -->
      <div class="w-full h-3 rounded-full bg-white/5 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          style="background: linear-gradient(90deg, var(--accent), var(--accent2));"
          :style="{ width: totalCount > 0 ? (completedCount / totalCount * 100) + '%' : '0%' }"
        />
      </div>
      <div class="text-sm text-[var(--text3)] mt-1.5 text-center">
        {{ totalCount > 0 ? Math.floor(completedCount / totalCount * 100) : 0 }}% 已完成
      </div>
    </div>

    <!-- ===== 分类标签栏 ===== -->
    <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="btn-secondary flex-shrink-0 text-base whitespace-nowrap"
        style="min-height: 44px; padding: 10px 18px;"
        :style="activeCategory === cat.key
          ? 'background: var(--accent); color: #1a1a2e; font-weight: 700; border-color: var(--accent);'
          : ''"
        @click="activeCategory = cat.key"
      >
        {{ cat.icon }} {{ cat.label }}
        <span class="text-sm opacity-70 ml-1">
          {{ categoryCompleted(cat.key) }}/{{ categoryTotal(cat.key) }}
        </span>
      </button>
    </div>

    <!-- ===== 成就列表 ===== -->
    <div class="space-y-3">
      <div
        v-for="(ach, key) in filteredAchievements"
        :key="key"
        class="card-press rounded-xl p-5 transition-all duration-200"
        :class="isUnlocked(key)
          ? 'bg-[var(--card2)] border border-[var(--accent)]/40'
          : 'bg-white/[0.03] border border-[var(--border)] opacity-60'"
      >
        <div class="flex items-center gap-3">
          <!-- 状态图标 -->
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            :class="isUnlocked(key)
              ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/30'
              : 'bg-white/5'"
          >
            {{ isUnlocked(key) ? '✅' : '🔒' }}
          </div>

          <!-- 成就信息 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span
                class="font-bold text-base"
                :class="isUnlocked(key) ? 'text-[var(--accent)]' : 'text-[var(--text2)]'"
              >
                {{ ach.name }}
              </span>
            </div>
            <div class="text-sm text-[var(--text2)] mb-1">
              {{ ach.desc }}
            </div>
          </div>

          <!-- 奖励 -->
          <div
            class="text-sm font-bold whitespace-nowrap flex items-center gap-1 px-2 py-1 rounded-full"
            :class="isUnlocked(key)
              ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
              : 'bg-white/5 text-[var(--text3)]'"
          >
            🪙 {{ formatNumber(ach.reward_gold) }}
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="Object.keys(filteredAchievements).length === 0" class="text-center text-[var(--text3)] py-10">
        该分类下暂无成就
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { ACHIEVEMENTS } from '../data/achievements.js'
import { formatNumber } from '../core/utils/formatters.js'

const store = useGameStore()
const achievements = computed(() => store.achievements || {})
const completedCount = computed(() => Object.keys(achievements.value).length)
const totalCount = Object.keys(ACHIEVEMENTS).length

// 分类定义
const categories = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'combat', label: '战斗', icon: '⚔️' },
  { key: 'growth', label: '成长', icon: '📈' },
  { key: 'wealth', label: '财富', icon: '💰' },
  { key: 'equip', label: '装备', icon: '🛡️' },
  { key: 'explore', label: '探索', icon: '🗺️' },
  { key: 'pet', label: '宠物', icon: '🐾' },
]

const activeCategory = ref('all')

// 判断成就是否已完成
function isUnlocked(key) {
  return !!achievements.value[key]
}

// 分类映射规则
function getCategory(key) {
  if (key.startsWith('kill_') || key.startsWith('boss_') || key.startsWith('streak_') || key.startsWith('first_blood') || key.startsWith('first_death') || key.startsWith('die_')) return 'combat'
  if (key.startsWith('level_') || key.startsWith('hp_') || key.startsWith('dmg_') || key.startsWith('armor_') || key.startsWith('crit_')) return 'growth'
  if (key.startsWith('gold_') || key.startsWith('earn_total_') || key.startsWith('first_shop') || key.startsWith('shop_')) return 'wealth'
  if (key.startsWith('floor_') || key.startsWith('first_potion') || key.startsWith('potion_')) return 'explore'
  if (key.startsWith('pet_') || key === 'divine_pet' || key === 'abyssal_pet') return 'pet'
  return 'equip'
}

// 按分类过滤
const filteredAchievements = computed(() => {
  if (activeCategory.value === 'all') return ACHIEVEMENTS
  const result = {}
  for (const [key, ach] of Object.entries(ACHIEVEMENTS)) {
    if (getCategory(key) === activeCategory.value) {
      result[key] = ach
    }
  }
  return result
})

// 分类完成数
function categoryCompleted(catKey) {
  if (catKey === 'all') return completedCount.value
  let count = 0
  for (const key of Object.keys(achievements.value)) {
    if (getCategory(key) === catKey) count++
  }
  return count
}

// 分类总数
function categoryTotal(catKey) {
  if (catKey === 'all') return totalCount
  let count = 0
  for (const key of Object.keys(ACHIEVEMENTS)) {
    if (getCategory(key) === catKey) count++
  }
  return count
}
</script>
