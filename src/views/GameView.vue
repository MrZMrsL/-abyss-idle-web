<template>
  <div class="h-full w-full relative">
    <!-- Loading overlay -->
    <div
      v-if="loading"
      class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg)]"
    >
      <div class="text-4xl animate-spin mb-4">⚔️</div>
      <div class="text-[var(--text2)] text-sm">正在加载冒险数据...</div>
    </div>

    <!-- Init error -->
    <div
      v-else-if="initError"
      class="h-full w-full flex flex-col items-center justify-center p-6 text-center"
    >
      <div class="text-4xl mb-4">⚠️</div>
      <h2 class="text-lg font-bold text-[var(--danger)] mb-2">加载失败</h2>
      <p class="text-[var(--text2)] text-sm mb-4">{{ initError }}</p>
      <button
        class="px-6 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-bold"
        @click="retryInit"
      >
        重试
      </button>
    </div>

    <!-- Title screen -->
    <div v-else-if="!started" class="h-full w-full">
      <TitleScreen @start="started = true" />
    </div>

    <!-- Main game -->
    <div v-else class="flex flex-col h-full w-full">
      <StatusBar />
      <main class="flex-1 overflow-y-auto p-3 pb-20">
        <BattlePanel v-if="store.activeTab === 'battle'" />
        <InventoryPanel v-else-if="store.activeTab === 'inventory'" />
        <PetPanel v-else-if="store.activeTab === 'pets'" />
        <SkillPanel v-else-if="store.activeTab === 'skills'" />
        <ShopPanel v-else-if="store.activeTab === 'shop'" />
        <AchievementPanel v-else-if="store.activeTab === 'achievements'" />
        <SettingsPanel v-else-if="store.activeTab === 'settings'" />
      </main>
      <BottomNav />

      <!-- Offline Report Modal -->
      <div
        v-if="store.pendingOffline"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      >
        <div class="bg-[var(--card)] rounded-xl p-5 max-w-sm w-full border border-[var(--border)] animate-fade-in">
          <h3 class="text-lg font-bold text-[var(--accent)] mb-3">📥 离线收益</h3>
          <pre class="whitespace-pre-wrap text-sm text-[var(--text)] max-h-[60vh] overflow-y-auto leading-relaxed">{{ store.pendingOffline }}</pre>
          <button
            class="mt-4 w-full py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-bold"
            @click="store.dismissOffline"
          >
            领取
          </button>
        </div>
      </div>

      <!-- Toast Notifications -->
      <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        <TransitionGroup name="toast">
          <div
            v-for="toast in store.toastQueue"
            :key="toast.id"
            class="px-4 py-2 rounded-lg text-sm font-medium shadow-lg border pointer-events-auto"
            :class="toastClass(toast.type)"
          >
            {{ toast.message }}
          </div>
        </TransitionGroup>
      </div>
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
    console.error('Game init failed:', e)
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

function toastClass(type) {
  switch (type) {
    case 'success': return 'bg-[var(--success)]/90 text-white border-white/10'
    case 'danger': return 'bg-[var(--danger)]/90 text-white border-white/10'
    case 'warning': return 'bg-yellow-500/90 text-black border-white/10'
    default: return 'bg-[var(--info)]/90 text-white border-white/10'
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
