<template>
  <!-- Loading State -->
  <div v-if="loading" class="h-full w-full flex flex-col items-center justify-center gap-4">
    <div class="text-6xl animate-pulse">🏰</div>
    <div class="text-lg text-[var(--accent)] font-bold">正在进入深渊...</div>
    <div class="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
      <div class="h-full bg-[var(--accent)] rounded-full animate-pulse" style="width: 60%"></div>
    </div>
  </div>

  <!-- Init Error -->
  <div v-else-if="initError" class="h-full w-full flex flex-col items-center justify-center p-6 text-center gap-4">
    <div class="text-5xl">⚠️</div>
    <h2 class="text-lg font-bold text-[var(--danger)]">加载失败</h2>
    <p class="text-sm text-[var(--text2)]">{{ initError }}</p>
    <button class="btn-primary" @click="retryInit">重试</button>
  </div>

  <!-- Title Screen -->
  <div v-else-if="!started" class="h-full w-full">
    <TitleScreen @start="started = true" />
  </div>

  <!-- Main Game UI -->
  <div v-else class="flex flex-col h-full w-full">
    <!-- Status Bar (always visible) -->
    <StatusBar />

    <!-- Main Content Area -->
    <main class="flex-1 overflow-y-auto p-4 pb-20">
      <BattlePanel v-if="store.activeTab === 'battle'" />
      <InventoryPanel v-else-if="store.activeTab === 'inventory'" />
      <PetPanel v-else-if="store.activeTab === 'pets'" />
      <SkillPanel v-else-if="store.activeTab === 'skills'" />
      <ShopPanel v-else-if="store.activeTab === 'shop'" />
      <AchievementPanel v-else-if="store.activeTab === 'achievements'" />
      <SettingsPanel v-else-if="store.activeTab === 'settings'" />
    </main>

    <!-- Bottom Navigation -->
    <BottomNav />

    <!-- Offline Earnings Modal -->
    <div v-if="store.pendingOffline" class="modal-overlay" @click.self="store.dismissOffline">
      <div class="modal-content">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-2xl">📥</span>
          <h3 class="text-lg font-bold text-[var(--accent)]">离线收益</h3>
        </div>
        <pre class="whitespace-pre-wrap text-sm text-[var(--text)] leading-relaxed max-h-[50vh] overflow-y-auto">{{ store.pendingOffline }}</pre>
        <button class="btn-primary w-full mt-5" @click="store.dismissOffline">
          ✨ 领取收益
        </button>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-[90%] max-w-sm">
      <TransitionGroup name="toast">
        <div
          v-for="toast in store.toastQueue"
          :key="toast.id"
          class="px-4 py-3 rounded-xl text-sm font-medium shadow-lg border pointer-events-auto flex items-center gap-2"
          :class="toastClass(toast.type)"
        >
          <span>{{ toastIcon(toast.type) }}</span>
          <span>{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGameStore } from '../stores/gameStore.js'

import TitleScreen from '../components/TitleScreen.vue'
import StatusBar from '../components/StatusBar.vue'
import BottomNav from '../components/BottomNav.vue'
import BattlePanel from '../components/BattlePanel.vue'
import InventoryPanel from '../components/InventoryPanel.vue'
import PetPanel from '../components/PetPanel.vue'
import SkillPanel from '../components/SkillPanel.vue'
import ShopPanel from '../components/ShopPanel.vue'
import AchievementPanel from '../components/AchievementPanel.vue'
import SettingsPanel from '../components/SettingsPanel.vue'

const store = useGameStore()
const started = ref(false)
const loading = ref(true)
const initError = ref('')

async function init() {
  loading.value = true
  initError.value = ''
  try {
    await store.init()
  } catch (e) {
    console.error('Game init error:', e)
    initError.value = '存档加载出错，请刷新页面或重置存档。'
  } finally {
    loading.value = false
  }
}

function retryInit() {
  init()
}

onMounted(() => {
  init()
})

// Toast styling
function toastClass(type) {
  switch (type) {
    case 'success':
      return 'bg-[rgba(46,204,113,0.9)] text-white border-white/10'
    case 'danger':
      return 'bg-[rgba(231,76,60,0.9)] text-white border-white/10'
    case 'warning':
      return 'bg-[rgba(243,156,18,0.9)] text-black border-white/10'
    case 'info':
    default:
      return 'bg-[rgba(52,152,219,0.9)] text-white border-white/10'
  }
}

function toastIcon(type) {
  switch (type) {
    case 'success': return '✅'
    case 'danger': return '❌'
    case 'warning': return '⚠️'
    case 'info': return 'ℹ️'
    default: return '🔔'
  }
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
