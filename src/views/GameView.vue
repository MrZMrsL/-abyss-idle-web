<template>
  <div v-if="!started" class="h-full w-full">
    <TitleScreen @start="started = true" />
  </div>
  <div v-else class="flex flex-col h-full w-full">
    <!-- 顶部状态栏 -->
    <StatusBar />

    <!-- 主内容区 -->
    <main class="flex-1 overflow-y-auto p-3 pb-20">
      <Transition name="fade" mode="out-in">
        <BattlePanel v-if="store.activeTab === 'battle'" key="battle" />
        <InventoryPanel v-else-if="store.activeTab === 'inventory'" key="inventory" />
        <PetPanel v-else-if="store.activeTab === 'pets'" key="pets" />
        <SkillPanel v-else-if="store.activeTab === 'skills'" key="skills" />
        <ShopPanel v-else-if="store.activeTab === 'shop'" key="shop" />
        <AchievementPanel v-else-if="store.activeTab === 'achievements'" key="achievements" />
        <SettingsPanel v-else-if="store.activeTab === 'settings'" key="settings" />
      </Transition>
    </main>

    <!-- 底部导航 -->
    <BottomNav />

    <!-- 离线收益弹窗 -->
    <div
      v-if="store.pendingOffline"
      class="modal-overlay"
      @click.self="store.dismissOffline"
    >
      <div class="modal-content">
        <h3 class="text-lg font-bold text-[var(--accent)] mb-3 flex items-center gap-2">
          <span>📥</span>
          <span>离线收益</span>
        </h3>
        <pre class="whitespace-pre-wrap text-sm text-[var(--text)] max-h-[50vh] overflow-y-auto leading-relaxed">{{ store.pendingOffline }}</pre>
        <button
          class="btn-primary w-full mt-4"
          @click="store.dismissOffline"
        >
          领取收益
        </button>
      </div>
    </div>

    <!-- Toast 通知 -->
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-[90%] max-w-sm">
      <TransitionGroup name="toast">
        <div
          v-for="toast in store.toastQueue"
          :key="toast.id"
          class="px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg border pointer-events-auto flex items-center gap-2"
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
import { ref } from 'vue'
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

store.init()

function toastClass(type) {
  switch (type) {
    case 'success': return 'bg-[var(--success)]/90 text-white border-white/10 backdrop-blur-sm'
    case 'danger': return 'bg-[var(--danger)]/90 text-white border-white/10 backdrop-blur-sm'
    case 'warning': return 'bg-yellow-500/90 text-black border-white/10 backdrop-blur-sm'
    default: return 'bg-[var(--info)]/90 text-white border-white/10 backdrop-blur-sm'
  }
}

function toastIcon(type) {
  switch (type) {
    case 'success': return '✅'
    case 'danger': return '❌'
    case 'warning': return '⚠️'
    default: return 'ℹ️'
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

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
