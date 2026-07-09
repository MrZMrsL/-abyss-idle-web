<template>
  <div class="space-y-3">
    <!-- ========== 已装备 ========== -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-2">🛡️ 已装备</h3>
      <div v-if="!Object.keys(equipped).length" class="text-center text-[var(--text3)] text-sm py-4">
        暂无装备
      </div>
      <div v-else class="grid grid-cols-3 gap-1.5">
        <div
          v-for="(item, slot) in equipped"
          :key="slot"
          class="rounded-lg p-1.5 text-center border"
          :class="qualityBgClass(item.quality)"
          :style="{ borderColor: qualityColor(item.quality) + '40' }"
          @click="openItemMenu(item)"
        >
          <div class="text-[10px] text-[var(--text3)]">{{ slot }}</div>
          <div class="text-[10px] font-bold truncate" :style="{ color: qualityColor(item.quality) }">{{ item.name }}</div>
          <div v-if="item.enhance_level" class="text-[10px] text-[var(--accent)]">+{{ item.enhance_level }}</div>
        </div>
      </div>
    </div>

    <!-- ========== 操作按钮 ========== -->
    <div class="grid grid-cols-4 gap-2">
      <button class="btn-secondary text-[11px] px-1" @click="store.organizeBag">
        🧹 整理
      </button>
      <button class="btn-secondary text-[11px] px-1" @click="showSellMenu = true">
        💰 卖出
      </button>
      <button class="btn-secondary text-[11px] px-1" @click="store.toStorage(selectedItem?.id)">
        📦 存仓
      </button>
      <button class="btn-secondary text-[11px] px-1" @click="store.applyOptimal">
        🎯 最优
      </button>
    </div>

    <!-- ========== 装备列表 ========== -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-2">
        🎒 背包 ({{ inventory.length }}/50)
      </h3>
      <div v-if="!inventory.length" class="text-center text-[var(--text3)] text-sm py-6">
        背包是空的
      </div>
      <div v-else class="grid grid-cols-2 gap-2">
        <div
          v-for="item in inventory"
          :key="item.id"
          class="rounded-lg p-2 border cursor-pointer card-press"
          :class="qualityBgClass(item.quality)"
          :style="{ borderColor: qualityColor(item.quality) + '50' }"
          @click="openItemMenu(item)"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-bold truncate flex-1" :style="{ color: qualityColor(item.quality) }">
              {{ item.name }}
            </span>
            <span v-if="item.enhance_level" class="text-[10px] text-[var(--accent)] ml-1">+{{ item.enhance_level }}</span>
          </div>
          <div class="text-[10px] text-[var(--text2)]">Lv.{{ item.level }}</div>
          <div class="flex flex-wrap gap-1 mt-1">
            <span v-for="(val, key) in itemStats(item)" :key="key" class="text-[9px] px-1 py-0.5 rounded bg-white/5 text-[var(--text2)]">
              {{ key }}:{{ val }}
            </span>
          </div>
          <div v-if="(item.gems || []).length" class="flex gap-0.5 mt-1">
            <span v-for="(gem, i) in item.gems" :key="i" class="text-[9px]">💎</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 材料 ========== -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-2">💎 材料</h3>
      <div class="flex items-center gap-4 text-sm">
        <span class="text-[var(--text2)]">强化石: <span class="text-[var(--text)] font-bold">{{ formatNumber(materials.enhance_stone || 0) }}</span></span>
        <span v-if="Object.keys(materials.set_fragments || {}).length" class="text-[var(--text2)]">
          套装碎片: <span class="text-[var(--text)] font-bold">{{ Object.keys(materials.set_fragments).length }}种</span>
        </span>
      </div>
    </div>

    <!-- ========== 装备操作弹窗 ========== -->
    <div v-if="selectedItem" class="modal-overlay" @click.self="selectedItem = null">
      <div class="modal-content">
        <h3 class="text-lg font-bold text-[var(--accent)] mb-3">{{ selectedItem.name }}</h3>
        <div class="text-sm text-[var(--text2)] mb-4 space-y-1">
          <div>类型: {{ selectedItem.type }} | 等级: Lv.{{ selectedItem.level }}</div>
          <div>品质: <span :style="{ color: qualityColor(selectedItem.quality) }">{{ selectedItem.quality }}</span></div>
          <div v-if="selectedItem.enhance_level">强化: +{{ selectedItem.enhance_level }}</div>
          <div>属性: {{ formatItemStats(selectedItem) }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button class="btn-primary text-sm" @click="equipSelected">🛡️ 装备</button>
          <button class="btn-secondary text-sm" @click="enhanceSelected">⬆️ 强化</button>
          <button class="btn-secondary text-sm" @click="enchantSelected">✨ 附魔</button>
          <button class="btn-secondary text-sm" @click="dismantleSelected" style="color: var(--danger);">🔨 分解</button>
          <button class="btn-secondary text-sm col-span-2" @click="storeSelected">📦 存入仓库</button>
        </div>
        <button class="mt-3 w-full py-2 text-sm text-[var(--text3)]" @click="selectedItem = null">取消</button>
      </div>
    </div>

    <!-- ========== 卖出弹窗 ========== -->
    <div v-if="showSellMenu" class="modal-overlay" @click.self="showSellMenu = false">
      <div class="modal-content">
        <h3 class="text-lg font-bold text-[var(--accent)] mb-3">💰 一键卖出</h3>
        <p class="text-sm text-[var(--text2)] mb-4">选择最高保留品质，低于该品质的装备将被卖出</p>
        <div class="space-y-2">
          <button v-for="q in sellQualities" :key="q.value" class="w-full btn-secondary justify-between" @click="sellAll(q.value)">
            <span :style="{ color: qualityColor(q.value) }">{{ q.label }}</span>
            <span class="text-[var(--text3)] text-xs">卖出{{ q.value }}及以下</span>
          </button>
        </div>
        <button class="mt-3 w-full py-2 text-sm text-[var(--text3)]" @click="showSellMenu = false">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { QUALITY_COLORS } from '../data/items.js'
import { formatNumber } from '../core/utils/formatters.js'

const store = useGameStore()
const inventory = computed(() => store.inventory)
const equipped = computed(() => store.equipped)
const materials = computed(() => store.materials)

const selectedItem = ref(null)
const showSellMenu = ref(false)

const sellQualities = [
  { value: '普通', label: '普通' },
  { value: '精制', label: '精制' },
  { value: '稀有', label: '稀有' },
  { value: '史诗', label: '史诗' },
  { value: '传说', label: '传说' },
]

function qualityColor(q) {
  return QUALITY_COLORS[q] || '#9e9e9e'
}

function qualityBgClass(q) {
  const map = { '普通': 'bg-q-common', '精制': 'bg-q-magic', '稀有': 'bg-q-rare', '史诗': 'bg-q-epic', '传说': 'bg-q-legend', '神话': 'bg-q-mythic' }
  return map[q] || ''
}

function itemStats(item) {
  return { ...item.base, ...item.stats }
}

function formatItemStats(item) {
  const stats = itemStats(item)
  return Object.entries(stats).filter(([, v]) => v !== 0).map(([k, v]) => `${k}:${v}`).join(', ') || '无'
}

function openItemMenu(item) {
  selectedItem.value = item
}

function equipSelected() {
  if (!selectedItem.value) return
  store.equipItem(selectedItem.value.id)
  selectedItem.value = null
}

function enhanceSelected() {
  if (!selectedItem.value) return
  store.enhanceItem(selectedItem.value.id)
  selectedItem.value = null
}

function enchantSelected() {
  if (!selectedItem.value) return
  store.enchantItem(selectedItem.value.id)
  selectedItem.value = null
}

function dismantleSelected() {
  if (!selectedItem.value) return
  store.dismantleItem(selectedItem.value.id)
  selectedItem.value = null
}

function storeSelected() {
  if (!selectedItem.value) return
  store.toStorage(selectedItem.value.id)
  selectedItem.value = null
}

function sellAll(quality) {
  store.sellAll(quality)
  showSellMenu.value = false
}
</script>
