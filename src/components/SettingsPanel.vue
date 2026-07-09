<template>
  <div class="space-y-3">
    <!-- 自动设置 -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-3">⚙️ 自动设置</h3>
      <div class="space-y-3">
        <div
          v-for="s in autoSettings"
          :key="s.key"
          class="flex items-center justify-between py-1"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm">{{ s.icon }}</span>
            <span class="text-sm text-[var(--text)]">{{ s.label }}</span>
          </div>
          <button
            class="w-11 h-6 rounded-full transition-all relative"
            :class="settings[s.key] ? 'bg-[var(--accent)]' : 'bg-white/10'"
            @click="toggleSetting(s.key)"
          >
            <div
              class="w-5 h-5 rounded-full bg-white shadow transition-transform absolute top-0.5"
              :class="settings[s.key] ? 'translate-x-5' : 'translate-x-0.5'"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- 存档管理 -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-3">💾 存档管理</h3>
      <div class="space-y-2">
        <button class="btn-secondary w-full justify-center" @click="handleExport">
          📤 导出存档
        </button>
        <button class="btn-secondary w-full justify-center" @click="showImport = true">
          📥 导入存档
        </button>
        <button
          class="w-full py-2.5 rounded-xl border font-bold text-sm transition-all active:scale-95"
          style="border-color: rgba(231,76,60,0.3); background: rgba(231,76,60,0.08); color: var(--danger);"
          @click="showReset = true"
        >
          🗑️ 重置游戏
        </button>
      </div>
      <!-- 导出结果 -->
      <div v-if="exportResult" class="mt-3 p-2 rounded-lg bg-white/5 text-[10px] text-[var(--text2)] break-all">
        {{ exportResult.substring(0, 80) }}...
      </div>
    </div>

    <!-- 关于 -->
    <div class="card p-3 text-center">
      <div class="text-lg font-bold text-[var(--accent)] mb-1">深渊挂机</div>
      <div class="text-xs text-[var(--text3)]">v1.0.0 | 放置RPG</div>
    </div>

    <!-- 导入弹窗 -->
    <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
      <div class="modal-content">
        <h3 class="text-lg font-bold text-[var(--accent)] mb-3">📥 导入存档</h3>
        <p class="text-sm text-[var(--text2)] mb-3">粘贴存档代码：</p>
        <textarea
          v-model="importCode"
          class="w-full h-24 rounded-lg bg-black/30 border border-[var(--border)] p-3 text-xs text-[var(--text)] resize-none focus:outline-none focus:border-[var(--accent)]/50"
          placeholder="粘贴存档代码..."
        />
        <div class="flex gap-2 mt-3">
          <button class="flex-1 btn-secondary" @click="showImport = false">取消</button>
          <button class="flex-1 btn-primary" @click="handleImport">导入</button>
        </div>
      </div>
    </div>

    <!-- 重置确认弹窗 -->
    <div v-if="showReset" class="modal-overlay" @click.self="showReset = false">
      <div class="modal-content text-center">
        <div class="text-3xl mb-2">⚠️</div>
        <h3 class="text-lg font-bold text-[var(--danger)] mb-2">确认重置？</h3>
        <p class="text-sm text-[var(--text2)] mb-4">所有进度将被清除，此操作不可撤销！</p>
        <div class="flex gap-2">
          <button class="flex-1 btn-secondary" @click="showReset = false">取消</button>
          <button class="flex-1 btn-primary" style="background: var(--danger); color: white;" @click="handleReset">
            确认重置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'

const store = useGameStore()
const settings = computed(() => store.save?.settings || {})

const showImport = ref(false)
const showReset = ref(false)
const importCode = ref('')
const exportResult = ref('')

const autoSettings = [
  { key: 'auto_sell_white', label: '自动出售白装', icon: '💰' },
  { key: 'auto_equip_better', label: '自动装备更好', icon: '🛡️' },
  { key: 'auto_use_potion', label: '自动喝药', icon: '🧪' },
  { key: 'auto_dismantle_low_level', label: '自动分解低级装备', icon: '🔨' },
]

function toggleSetting(key) {
  if (store.save?.settings) {
    store.save.settings[key] = !store.save.settings[key]
    store.commit()
  }
}

async function handleExport() {
  try {
    const code = await store.exportSave()
    exportResult.value = code
    navigator.clipboard?.writeText(code)
  } catch (e) {
    exportResult.value = '导出失败: ' + e.message
  }
}

async function handleImport() {
  if (!importCode.value.trim()) return
  try {
    await store.importSave(importCode.value.trim())
    showImport.value = false
    importCode.value = ''
  } catch (e) {
    alert('导入失败: ' + e.message)
  }
}

async function handleReset() {
  await store.resetGame()
  showReset.value = false
}
</script>
