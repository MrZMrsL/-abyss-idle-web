<template>
  <nav
    class="shrink-0 z-30 border-t border-[var(--border)]"
    style="background: rgba(26,26,46,0.95); backdrop-filter: blur(10px); padding-bottom: env(safe-area-inset-bottom, 0);"
  >
    <div class="flex justify-around items-center max-w-[520px] mx-auto">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 min-h-[52px] transition-colors relative"
        :class="store.activeTab === tab.key ? 'text-[var(--accent)]' : 'text-[var(--text3)] hover:text-[var(--text2)]'"
        @click="store.setActiveTab(tab.key)"
      >
        <span class="text-xl leading-none">{{ tab.icon }}</span>
        <span class="text-[10px] leading-none mt-0.5">{{ tab.label }}</span>
        <!-- 激活指示器 -->
        <div
          v-if="store.activeTab === tab.key"
          class="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-[var(--accent)]"
        />
      </button>
    </div>
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
