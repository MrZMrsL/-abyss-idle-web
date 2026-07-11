<template>
  <nav
    class="shrink-0 w-full border-t z-30"
    style="background: rgba(13, 13, 26, 0.85); border-color: var(--border); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); min-height: 56px;"
  >
    <div class="flex items-center justify-around h-full py-2">
      <button
        v-for="item in tabs"
        :key="item.key"
        class="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-all"
        :class="store.activeTab === item.key ? 'text-[var(--accent)]' : 'text-[var(--text3)]'"
        @click="store.setActiveTab(item.key)"
      >
        <span class="text-xl">{{ item.icon }}</span>
        <span class="text-xs font-medium">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { useGameStore } from '../stores/gameStore.js'

const store = useGameStore()

const tabs = [
  { key: 'battle', icon: '⚔️', label: '战斗' },
  { key: 'inventory', icon: '🎒', label: '背包' },
  { key: 'pets', icon: '🐾', label: '宠物' },
  { key: 'skills', icon: '💎', label: '技能' },
  { key: 'shop', icon: '🏪', label: '商店' },
  { key: 'achievements', icon: '🏆', label: '成就' },
  { key: 'settings', icon: '⚙️', label: '设置' },
]
</script>
