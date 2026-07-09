<template>
  <div class="space-y-3">
    <div class="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
      <h3 class="text-[var(--accent)] font-bold mb-4">⚙️ 设置</h3>

      <div class="space-y-3">
        <label class="flex items-center justify-between bg-white/5 rounded-lg p-3">
          <span class="text-sm">自动出售普通装备</span>
          <input v-model="settings.auto_sell_white" type="checkbox" class="w-5 h-5 accent-[var(--accent)]" @change="commit">
        </label>
        <label class="flex items-center justify-between bg-white/5 rounded-lg p-3">
          <span class="text-sm">自动装备更好装备</span>
          <input v-model="settings.auto_equip_better" type="checkbox" class="w-5 h-5 accent-[var(--accent)]" @change="commit">
        </label>
        <label class="flex items-center justify-between bg-white/5 rounded-lg p-3">
          <span class="text-sm">自动使用血瓶</span>
          <input v-model="settings.auto_use_potion" type="checkbox" class="w-5 h-5 accent-[var(--accent)]" @change="commit">
        </label>
        <label class="flex items-center justify-between bg-white/5 rounded-lg p-3">
          <span class="text-sm">自动分解低等级装备</span>
          <input v-model="settings.auto_dismantle_low_level" type="checkbox" class="w-5 h-5 accent-[var(--accent)]" @change="commit">
        </label>
      </div>
    </div>

    <div class="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
      <h3 class="text-[var(--accent)] font-bold mb-3">💾 存档管理</h3>
      <div class="space-y-2">
        <button class="w-full py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-bold text-sm" @click="exportSave">
          导出存档
        </button>
        <button class="w-full py-2 rounded-lg bg-white/5 border border-[var(--border)] text-sm" @click="showImport = true">
          导入存档
        </button>
        <button class="w-full py-2 rounded-lg bg-[var(--danger)]/80 text-white text-sm" @click="resetGame">
          重置存档
        </button>
      </div>
      <textarea
        v-if="exported"
        v-model="exported"
        readonly
        class="w-full mt-3 p-2 rounded-lg bg-black/30 text-xs text-[var(--text2)] border border-[var(--border)]"
        rows="4"
      ></textarea>
    </div>

    <!-- Import Modal -->
    <div v-if="showImport" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div class="bg-[var(--card)] rounded-xl p-4 w-full max-w-sm border border-[var(--border)]">
        <h3 class="text-[var(--accent)] font-bold mb-3">导入存档</h3>
        <textarea
          v-model="importText"
          class="w-full p-2 rounded-lg bg-black/30 text-sm border border-[var(--border)] text-[var(--text)]"
          rows="6"
          placeholder="粘贴存档字符串或原始 JSON"
        ></textarea>
        <div class="flex gap-2 mt-3">
          <button class="flex-1 py-2 rounded-lg bg-white/10 text-sm" @click="showImport = false">取消</button>
          <button class="flex-1 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-bold text-sm" @click="doImport">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'

const store = useGameStore()
const exported = ref('')
const showImport = ref(false)
const importText = ref('')

const settings = computed(() => store.save?.settings || {})

function commit() {
  store.commit()
}

async function exportSave() {
  exported.value = await store.exportSave()
}

async function doImport() {
  if (!importText.value.trim()) return
  try {
    await store.importSave(importText.value.trim())
    showImport.value = false
    importText.value = ''
    store.showToast('存档导入成功', 'success')
  } catch (e) {
    store.showToast('导入失败：' + e.message, 'danger')
  }
}

function resetGame() {
  if (confirm('确定重置存档？此操作不可恢复。')) {
    store.resetGame()
    store.showToast('存档已重置', 'warning')
  }
}
</script>
