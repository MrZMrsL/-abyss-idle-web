<template>
  <div class="space-y-5 pb-4">
    <!-- ========== 自动设置区域 ========== -->
    <div class="card p-5">
      <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-base">
        <span>🤖</span> 自动设置
      </h3>
      <div class="space-y-3">
        <!-- 自动卖白装 -->
        <div
          class="card-press flex items-center justify-between bg-white/[0.04] rounded-lg p-4 cursor-pointer"
          @click="toggleSetting('auto_sell_white')"
        >
          <div class="flex items-center gap-2">
            <span class="text-lg">💰</span>
            <div>
              <div class="text-base font-medium">自动出售白装</div>
              <div class="text-xs text-[var(--text3)]">自动卖出普通品质装备</div>
            </div>
          </div>
          <div
            class="w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0"
            :class="settings.auto_sell_white ? 'bg-[var(--accent)]' : 'bg-white/10'"
          >
            <div
              class="w-4.5 h-4.5 rounded-full bg-white shadow-md absolute top-[3px] transition-all duration-200"
              :class="settings.auto_sell_white ? 'left-[22px]' : 'left-[3px]'"
            />
          </div>
        </div>

        <!-- 自动装备更好 -->
        <div
          class="card-press flex items-center justify-between bg-white/[0.04] rounded-lg p-4 cursor-pointer"
          @click="toggleSetting('auto_equip_better')"
        >
          <div class="flex items-center gap-2">
            <span class="text-lg">🛡️</span>
            <div>
              <div class="text-base font-medium">自动装备更好</div>
              <div class="text-xs text-[var(--text3)]">拾取时自动替换更强的装备</div>
            </div>
          </div>
          <div
            class="w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0"
            :class="settings.auto_equip_better ? 'bg-[var(--accent)]' : 'bg-white/10'"
          >
            <div
              class="w-4.5 h-4.5 rounded-full bg-white shadow-md absolute top-[3px] transition-all duration-200"
              :class="settings.auto_equip_better ? 'left-[22px]' : 'left-[3px]'"
            />
          </div>
        </div>

        <!-- 自动喝药 -->
        <div
          class="card-press flex items-center justify-between bg-white/[0.04] rounded-lg p-4 cursor-pointer"
          @click="toggleSetting('auto_use_potion')"
        >
          <div class="flex items-center gap-2">
            <span class="text-lg">🧪</span>
            <div>
              <div class="text-base font-medium">自动喝药</div>
              <div class="text-xs text-[var(--text3)]">低血量时自动使用药水</div>
            </div>
          </div>
          <div
            class="w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0"
            :class="settings.auto_use_potion ? 'bg-[var(--accent)]' : 'bg-white/10'"
          >
            <div
              class="w-4.5 h-4.5 rounded-full bg-white shadow-md absolute top-[3px] transition-all duration-200"
              :class="settings.auto_use_potion ? 'left-[22px]' : 'left-[3px]'"
            />
          </div>
        </div>

        <!-- 自动分解低级装备 -->
        <div
          class="card-press flex items-center justify-between bg-white/[0.04] rounded-lg p-4 cursor-pointer"
          @click="toggleSetting('auto_dismantle_low_level')"
        >
          <div class="flex items-center gap-2">
            <span class="text-lg">🔨</span>
            <div>
              <div class="text-base font-medium">自动分解低级装备</div>
              <div class="text-xs text-[var(--text3)]">自动分解远低于等级的装备</div>
            </div>
          </div>
          <div
            class="w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0"
            :class="settings.auto_dismantle_low_level ? 'bg-[var(--accent)]' : 'bg-white/10'"
          >
            <div
              class="w-4.5 h-4.5 rounded-full bg-white shadow-md absolute top-[3px] transition-all duration-200"
              :class="settings.auto_dismantle_low_level ? 'left-[22px]' : 'left-[3px]'"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 存档管理区域 ========== -->
    <div class="card p-5">
      <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-base">
        <span>💾</span> 存档管理
      </h3>
      <div class="space-y-2.5">
        <button class="btn-secondary w-full" @click="exportSave">
          <span>📤</span>
          <span>导出存档</span>
        </button>

        <button class="btn-secondary w-full" @click="showImport = true">
          <span>📥</span>
          <span>导入存档</span>
        </button>

        <!-- 导出结果显示区域 -->
        <div v-if="exported" class="animate-fade-in">
          <div class="text-xs text-[var(--text3)] mb-1">📋 存档数据（长按复制）：</div>
          <textarea
            v-model="exported"
            readonly
            class="w-full p-2.5 rounded-lg bg-black/40 text-xs text-[var(--text2)] border border-[var(--border)] font-mono leading-relaxed"
            rows="4"
            @focus="$event.target.select()"
          />
        </div>

        <hr class="border-[var(--border)] my-2" />

        <button
          class="w-full py-2.5 rounded-xl font-bold text-base flex items-center justify-center gap-1.5 transition-all active:scale-[0.96]"
          style="background: rgba(231, 76, 60, 0.15); color: var(--danger); border: 1px solid rgba(231, 76, 60, 0.25); min-height: 44px;"
          @click="resetGame"
        >
          <span>🗑️</span>
          <span>重置游戏</span>
        </button>
        <p class="text-xs text-[var(--text3)] text-center">⚠️ 此操作将清除所有进度，不可恢复</p>
      </div>
    </div>

    <!-- ========== 关于区域 ========== -->
    <div class="card p-5">
      <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-base">
        <span>ℹ️</span> 关于
      </h3>
      <div class="text-center space-y-2">
        <div class="text-lg font-bold" style="background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          🏰 深渊挂机
        </div>
        <div class="text-base text-[var(--text2)]">异步放置RPG · 装备无限刷</div>
        <div class="text-xs text-[var(--text3)]">版本 {{ GAME_VERSION }}</div>
      </div>
    </div>

    <!-- ========== 导入存档弹窗 ========== -->
    <div v-if="showImport" class="modal-overlay">
      <div class="modal-content">
        <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-base">
          <span>📥</span> 导入存档
        </h3>
        <p class="text-base text-[var(--text2)] mb-2">将之前导出的存档字符串粘贴到下方：</p>
        <textarea
          v-model="importText"
          class="w-full p-3 rounded-lg bg-black/40 text-base border border-[var(--border)] text-[var(--text)] font-mono leading-relaxed"
          rows="6"
          placeholder="粘贴存档字符串或原始 JSON 数据..."
        />
        <div class="flex gap-2.5 mt-4">
          <button class="flex-1 btn-secondary" @click="cancelImport">
            <span>❌</span>
            <span>取消</span>
          </button>
          <button class="flex-1 btn-primary" @click="doImport">
            <span>✅</span>
            <span>确认导入</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'

const GAME_VERSION = '1.0.0'

const store = useGameStore()
const exported = ref('')
const showImport = ref(false)
const importText = ref('')

const settings = computed(() => store.save?.settings || {})

// ========== 切换设置 ==========
function toggleSetting(key) {
  if (store.save.settings) {
    store.save.settings[key] = !store.save.settings[key]
    store.commit()
  }
}

// ========== 导出存档 ==========
async function exportSave() {
  exported.value = await store.exportSave()
  store.showToast('存档已导出，请复制保存', 'success')
}

// ========== 导入存档 ==========
async function doImport() {
  if (!importText.value.trim()) {
    store.showToast('请输入存档字符串', 'warning')
    return
  }
  try {
    await store.importSave(importText.value.trim())
    store.showToast('存档导入成功', 'success')
    cancelImport()
  } catch (e) {
    store.showToast('导入失败：' + e.message, 'danger')
  }
}

function cancelImport() {
  showImport.value = false
  importText.value = ''
}

// ========== 重置游戏 ==========
function resetGame() {
  if (confirm('⚠️ 确定要重置游戏？\n\n所有进度将被清除，此操作不可恢复！')) {
    store.resetGame()
    exported.value = ''
    store.showToast('游戏已重置', 'warning')
  }
}
</script>
