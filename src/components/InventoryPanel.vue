<template>
  <div class="space-y-5">
    <!-- ===== Equipped Items Section ===== -->
    <div class="card p-4">
      <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-sm">
        🛡️ 已装备
      </h3>
      <div v-if="equippedCount === 0" class="text-center text-[var(--text2)] text-sm py-4">
        未装备任何物品
      </div>
      <div v-else class="grid grid-cols-3 gap-3">
        <div
          v-for="(item, slot) in equipped"
          :key="slot"
          class="rounded-lg p-2 border text-center"
          :class="['border-q-' + qualityClass(item.quality), 'bg-q-' + qualityClass(item.quality)]"
          @click="selectItem(item)"
        >
          <div class="text-[10px] text-[var(--text3)]">{{ slot }}</div>
          <div class="text-[10px] font-bold truncate" :class="'text-q-' + qualityClass(item.quality)">{{ item.name }}</div>
          <div v-if="item.enhance_level" class="text-[10px] text-[var(--accent)]">+{{ item.enhance_level }}</div>
        </div>
      </div>
    </div>

    <!-- ===== Action Buttons ===== -->
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

    <!-- ===== Inventory Grid ===== -->
    <div class="card p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-[var(--accent)] font-bold flex items-center gap-1.5 text-sm">
          🎒 背包
        </h3>
        <span class="text-xs text-[var(--text2)]">{{ inventory.length }}/50</span>
      </div>

      <!-- Empty State -->
      <div v-if="inventory.length === 0" class="text-center text-[var(--text2)] py-8 text-sm">
        🎒 背包空空如也
      </div>

      <!-- Item Grid -->
      <div v-else class="grid grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
        <div
          v-for="item in inventory"
          :key="item.id"
          class="rounded-xl p-3 border card-press cursor-pointer relative"
          :class="['border-q-' + qualityClass(item.quality), 'bg-q-' + qualityClass(item.quality)]"
          @click="openItemMenu(item)"
        >
          <!-- Quality Badge -->
          <div
            class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border"
            :style="{ background: qualityColor(item.quality) + '20', borderColor: qualityColor(item.quality) + '40', color: qualityColor(item.quality) }"
          >
            {{ item.quality[0] }}
          </div>

          <!-- Item Name -->
          <div class="font-bold text-xs mb-1 pr-3 truncate" :style="{ color: qualityColor(item.quality) }">
            {{ item.name }}
          </div>

          <!-- Item Level & Enhance -->
          <div class="flex items-center gap-1 mb-1">
            <span class="text-[10px] text-[var(--text2)]">Lv.{{ item.level }}</span>
            <span v-if="item.enhance_level > 0" class="text-[10px] text-[var(--accent)]">+{{ item.enhance_level }}</span>
          </div>

          <!-- Item Stats -->
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(val, key) in itemStats(item)"
              :key="key"
              v-if="val !== 0"
              class="text-[9px] px-1 py-0.5 rounded bg-black/20 text-[var(--text2)]"
            >
              {{ statAbbreviation(key) }}:{{ val }}
            </span>
          </div>

          <!-- Gems -->
          <div v-if="item.gems && item.gems.length > 0" class="flex gap-0.5 mt-1">
            <span v-for="(gem, i) in item.gems" :key="i" class="text-[10px]">💎</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Materials Section ===== -->
    <div class="card p-4">
      <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-sm">
        💎 材料
      </h3>
      <div class="flex flex-wrap gap-3">
        <div class="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-2 text-xs">
          <span>🔷</span>
          <span class="text-[var(--text2)]">强化石</span>
          <span class="font-bold">{{ formatNumber(materials.enhance_stone || 0) }}</span>
        </div>
        <div
          v-for="(count, name) in setFragments"
          :key="name"
          class="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-2 text-xs"
        >
          <span>🧩</span>
          <span class="text-[var(--text2)]">{{ name }}</span>
          <span class="font-bold">{{ formatNumber(count) }}</span>
        </div>
        <div v-if="materialCount === 0" class="text-[var(--text2)] text-xs py-1">
          暂无材料
        </div>
      </div>
    </div>

    <!-- ===== Item Detail Modal ===== -->
    <div v-if="selectedItem" class="modal-overlay" @click.self="selectedItem = null">
      <div class="modal-content">
        <h3 class="text-lg font-bold text-[var(--accent)] mb-2">{{ selectedItem.name }}</h3>
        <div class="text-sm text-[var(--text2)] space-y-1 mb-4">
          <p>类型: {{ selectedItem.type }} | 等级: Lv.{{ selectedItem.level }}</p>
          <p>品质: <span :style="{ color: qualityColor(selectedItem.quality) }">{{ selectedItem.quality }}</span></p>
          <p v-if="selectedItem.enhance_level > 0">强化: +{{ selectedItem.enhance_level }}</p>
          <p>属性: {{ formatStats(selectedItem) }}</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button class="btn-primary text-sm" @click="equipSelected">🛡️ 装备</button>
          <button class="btn-secondary text-sm" @click="enhanceSelected">⬆️ 强化</button>
          <button class="btn-secondary text-sm" @click="enchantSelected">✨ 附魔</button>
          <button class="btn-secondary text-sm text-red-400" @click="dismantleSelected">🔨 分解</button>
          <button class="btn-secondary text-sm col-span-2" @click="storeSelected">📦 存入仓库</button>
        </div>
        <button class="mt-3 w-full py-2 text-sm text-[var(--text3)]" @click="selectedItem = null">取消</button>
      </div>
    </div>

    <!-- ===== Sell Menu Modal ===== -->
    <div v-if="showSellMenu" class="modal-overlay" @click.self="showSellMenu = false">
      <div class="modal-content">
        <h3 class="text-lg font-bold text-[var(--accent)] mb-2">💰 卖出装备</h3>
        <p class="text-sm text-[var(--text2)] mb-4">选择要卖出的最高品质</p>
        <div class="grid grid-cols-1 gap-2">
          <button class="btn-secondary justify-between" @click="sellAll('普通')">
            <span class="flex items-center gap-2">⚪ 卖出普通品质</span>
          </button>
          <button class="btn-secondary justify-between" @click="sellAll('精制')">
            <span class="flex items-center gap-2">🟢 卖出精制及以下</span>
          </button>
          <button class="btn-secondary justify-between" @click="sellAll('稀有')">
            <span class="flex items-center gap-2">🔵 卖出稀有及以下</span>
          </button>
          <button class="btn-secondary justify-between" @click="sellAll('史诗')">
            <span class="flex items-center gap-2">🟣 卖出史诗及以下</span>
          </button>
          <button class="btn-secondary justify-between" @click="sellAll('传说')">
            <span class="flex items-center gap-2">🟠 卖出传说及以下</span>
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

const equippedCount = computed(() => Object.keys(equipped.value).length)
const setFragments = computed(() => materials.value.set_fragments || {})
const materialCount = computed(() => {
  let count = materials.value.enhance_stone || 0
  count += Object.values(setFragments.value).reduce((a, b) => a + b, 0)
  return count
})

const selectedItem = ref(null)
const showSellMenu = ref(false)

function qualityColor(q) {
  return QUALITY_COLORS[q] || '#9e9e9e'
}

function qualityClass(q) {
  const map = { '普通': 'common', '精制': 'magic', '稀有': 'rare', '史诗': 'epic', '传说': 'legend', '神话': 'mythic' }
  return map[q] || 'common'
}

function itemStats(item) {
  return { ...item.base, ...item.stats }
}

function statAbbreviation(key) {
  const map = {
    damage: '攻', armor: '甲', hp: '血', mp: '蓝',
    crit_rate: '暴', lifesteal: '吸', exp_bonus: '经', gold_bonus: '金'
  }
  return map[key] || key
}

function formatStats(item) {
  const stats = itemStats(item)
  return Object.entries(stats)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ') || '无'
}

function selectItem(item) {
  selectedItem.value = item
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
