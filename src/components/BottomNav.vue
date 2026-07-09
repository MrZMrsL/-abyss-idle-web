<template>
  <nav class="bg-[var(--card)] border-t border-[var(--border)] flex justify-around items-center py-2 px-1 shrink-0 z-20">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors"
      :class="store.activeTab === tab.key ? 'text-[var(--accent)]' : 'text-[var(--text2)]'"
      @click="store.setActiveTab(tab.key)"
    >
      <span class="text-xl">{{ tab.icon }}</span>
      <span class="text-[10px]">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { useGameStore } from '../stores/gameStore.js'

const store = useGameStore()

const tabs = [
  { key: 'battle', label: '战斗', icon: '⚔️' },
  { key: 'inventory', label: '背包', icon: '🎒' },
  { key: 'pets', label: '宠物', icon: '🐾' },
  { key: 'skills', label: '技能', icon: '📖' },
  { key: 'shop', label: '商店', icon: '🏪' },
  { key: 'achievements', label: '成就', icon: '🏆' },
  { key: 'settings', label: '设置', icon: '⚙️' },
]
</script>
