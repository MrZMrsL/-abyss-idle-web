<template>
  <div class="space-y-6">
    <!-- ===== Equipped Items Section ===== -->
    <div class="card p-5">
      <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-base">
        🛡️ 已装备
      </h3>
      <div v-if="equippedCount === 0" class="text-center text-[var(--text2)] text-base py-4">
        未装备任何物品
      </div>
      <div v-else class="grid grid-cols-3 gap-3">
        <div
          v-for="(item, slot) in equipped"
          :key="slot"
          class="rounded-lg p-2 border text-center"
          :class="['border-q-' + qualityClass(item.quality), 'bg-q-' + qualityClass(item.quality)]"
        >
          <div class="text-xs text-[var(--text2)]">{{ slot }}</div>
          <div class="text-xs font-bold truncate" :class="'text-q-' + qualityClass(item.quality)">
            {{ item.name }}
          </div>
          <div v-if="item.enhance_level" class="text-xs text-[var(--accent)]">
            +{{ item.enhance_level }}
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Action Buttons ===== -->
    <div class="grid grid-cols-2 gap-3">
      <button class="btn-secondary text-xs" @click="store.organizeBag">
        🧹 整理背包
      </button>
      <button class="btn-secondary text-xs" @click="showSellMenu = true">
        💰 一键卖出
      </button>
      <button class="btn-secondary text-xs" @click="store.toStorage(selectedItemId)">
        📦 智能存仓
      </button>
      <button class="btn-secondary text-xs" @click="store.applyOptimal">
        🎯 最优配装
      </button>
    </div>

    <!-- ===== Inventory Grid ===== -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-[var(--accent)] font-bold flex items-center gap-1.5 text-base">
          🎒 背包
        </h3>
        <span class="text-xs text-[var(--text2)]">{{ inventory.length }}/50</span>
      </div>

      <!-- Empty State -->
      <div v-if="inventory.length === 0" class="text-center text-[var(--text2)] py-8 text-base">
        🎒 背包空空如也
      </div>

      <!-- Item Grid -->
      <div v-else class="grid grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-1">
        <div
          v-for="item in inventory"
          :key="item.id"
          class="rounded-xl p-4 border card-press cursor-pointer relative"
          :class="['border-q-' + qualityClass(item.quality), 'bg-q-' + qualityClass(item.quality)]"
          @click="openItemMenu(item)"
        >
          <!-- Quality Badge -->
          <div class="absolute -top-1 -right-1 text-xs">
            {{ qualityEmoji(item.quality) }}
          </div>

          <!-- Item Name -->
          <div class="font-bold text-base truncate pr-3" :class="'text-q-' + qualityClass(item.quality)">
            {{ item.name }}
          </div>

          <!-- Level & Type -->
          <div class="text-xs text-[var(--text2)] mt-0.5">
            Lv.{{ item.level }} {{ item.type }}
          </div>

          <!-- Stats -->
          <div class="text-xs text-[var(--text2)] mt-1 leading-tight">
            {{ formatStats(item) }}
          </div>

          <!-- Enhance / Enchant / Gems indicators -->
          <div class="flex gap-1 mt-1.5 flex-wrap">
            <span v-if="item.enhance_level" class="text-xs px-1 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)]">
              +{{ item.enhance_level }}
            </span>
            <span v-if="(item.enchants || []).length" class="text-xs px-1 py-0.5 rounded bg-purple-500/20 text-purple-400">
              附魔×{{ item.enchants.length }}
            </span>
            <span v-if="(item.gems || []).length" class="text-xs px-1 py-0.5 rounded bg-blue-500/20 text-blue-400">
              💎×{{ item.gems.length }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Materials Section ===== -->
    <div class="card p-5">
      <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-base">
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

    <!-- ===== Item Action Modal ===== -->
    <div v-if="selectedItem" class="modal-overlay" @click.self="selectedItem = null">
      <div class="modal-content">
        <!-- Item Header -->
        <div class="flex items-start gap-3 mb-4">
          <div
            class="w-12 h-12 rounded-xl border flex items-center justify-center text-xl shrink-0"
            :class="['border-q-' + qualityClass(selectedItem.quality), 'bg-q-' + qualityClass(selectedItem.quality)]"
          >
            {{ qualityEmoji(selectedItem.quality) }}
          </div>
          <div class="min-w-0">
            <div class="font-bold" :class="'text-q-' + qualityClass(selectedItem.quality)">
              {{ selectedItem.name }}
            </div>
            <div class="text-xs text-[var(--text2)]">
              Lv.{{ selectedItem.level }} {{ selectedItem.type }}
            </div>
            <div class="text-xs text-[var(--text2)] mt-0.5">
              {{ formatStats(selectedItem) }}
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-2 gap-2">
          <button class="btn-primary" @click="equip(selectedItem.id)">
            🛡️ 装备
          </button>
          <button class="btn-primary" @click="enhance(selectedItem.id)">
            ⬆️ 强化
          </button>
          <button class="btn-secondary" @click="enchant(selectedItem.id)">
            ✨ 附魔
          </button>
          <button class="btn-secondary text-[var(--danger)]" @click="dismantle(selectedItem.id)">
            🔨 分解
          </button>
          <button class="btn-secondary col-span-2" @click="storage(selectedItem.id)">
            📦 存入仓库
          </button>
        </div>

        <button class="btn-secondary w-full mt-2" @click="selectedItem = null">
          取消
        </button>
      </div>
    </div>

    <!-- ===== Sell Menu Modal ===== -->
    <div v-if="showSellMenu" class="modal-overlay" @click.self="showSellMenu = false">
      <div class="modal-content">
        <h3 class="text-lg font-bold text-[var(--accent)] mb-4 flex items-center gap-2">
          💰 一键卖出
        </h3>
        <p class="text-base text-[var(--text2)] mb-4">选择要卖出的最高品质，该品质及以下的装备将被全部出售。</p>
        <div class="grid grid-cols-1 gap-2">
          <button class="btn-secondary justify-between" @click="sellAllConfirm('普通')">
            <span class="flex items-center gap-2">⚪ 卖出普通品质</span>
            <span class="text-[var(--text2)] text-xs">只留精制以上</span>
          </button>
          <button class="btn-secondary justify-between" @click="sellAllConfirm('精制')">
            <span class="flex items-center gap-2">🟢 卖出精制及以下</span>
            <span class="text-[var(--text2)] text-xs">只留稀有以上</span>
          </button>
          <button class="btn-secondary justify-between" @click="sellAllConfirm('稀有')">
            <span class="flex items-center gap-2">🔵 卖出稀有及以下</span>
            <span class="text-[var(--text2)] text-xs">只留史诗以上</span>
          </button>
          <button class="btn-secondary justify-between" @click="sellAllConfirm('史诗')">
            <span class="flex items-center gap-2">🟣 卖出史诗及以下</span>
            <span class="text-[var(--text2)] text-xs">只留传说以上</span>
          </button>
          <button class="btn-secondary justify-between text-[var(--danger)]" @click="sellAllConfirm('传说')">
            <span class="flex items-center gap-2">🟠 卖出传说及以下</span>
            <span class="text-[var(--text2)] text-xs">只留神话</span>
          </button>
        </div>
        <button class="btn-secondary w-full mt-3" @click="showSellMenu = false">
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { QUALITY_COLORS, QUALITY_EMOJI, QUALITY_RANK } from '../data/items.js'
import { formatNumber } from '../core/utils/formatters.js'

const store = useGameStore()
const inventory = computed(() => store.inventory)
const equipped = computed(() => store.equipped)
const materials = computed(() => store.materials)

const selectedItem = ref(null)
const selectedItemId = ref(null)
const showSellMenu = ref(false)

// Quality name → CSS class name mapping
const qualityMap = {
  '普通': 'common',
  '精制': 'magic',
  '稀有': 'rare',
  '史诗': 'epic',
  '传说': 'legend',
  '神话': 'mythic',
}

const equippedCount = computed(() => Object.keys(equipped.value).length)

const setFragments = computed(() => {
  return materials.value?.set_fragments || {}
})

const materialCount = computed(() => {
  const sf = Object.keys(setFragments.value).length
  return (materials.value?.enhance_stone || 0) > 0 ? sf + 1 : sf
})

function qualityClass(q) {
  return qualityMap[q] || 'common'
}

function qualityColor(q) {
  return QUALITY_COLORS[q] || '#9e9e9e'
}

function qualityEmoji(q) {
  return QUALITY_EMOJI[q] || '⚪'
}

function openItemMenu(item) {
  selectedItem.value = item
  selectedItemId.value = item.id
}

function equip(itemId) {
  store.equipItem(itemId)
  selectedItem.value = null
}

function enhance(itemId) {
  store.enhanceItem(itemId)
  selectedItem.value = null
}

function enchant(itemId) {
  store.enchantItem(itemId)
  selectedItem.value = null
}

function dismantle(itemId) {
  store.dismantleItem(itemId)
  selectedItem.value = null
}

function storage(itemId) {
  if (itemId) {
    store.toStorage(itemId)
  }
  selectedItem.value = null
}

function sellAllConfirm(maxQuality) {
  store.sellAll(maxQuality)
  showSellMenu.value = false
}

function formatStats(item) {
  const parts = []
  const base = item.base || {}
  const stats = item.stats || {}
  const enchants = item.enchants || []

  if (base.damage) parts.push(`攻+${formatNumber(base.damage)}`)
  if (base.armor) parts.push(`甲+${formatNumber(base.armor)}`)
  if (base.hp) parts.push(`血+${formatNumber(base.hp)}`)

  if (stats.damage_bonus) parts.push(`攻+${formatNumber(stats.damage_bonus)}`)
  if (stats.armor) parts.push(`甲+${formatNumber(stats.armor)}`)
  if (stats.hp_bonus) parts.push(`血+${formatNumber(stats.hp_bonus)}`)
  if (stats.damage_mult) parts.push(`攻×${stats.damage_mult}`)
  if (stats.crit_rate) parts.push(`暴+${stats.crit_rate}%`)
  if (stats.crit_dmg) parts.push(`暴伤+${Math.round(stats.crit_dmg * 100)}%`)
  if (stats.lifesteal) parts.push(`吸+${stats.lifesteal}%`)
  if (stats.exp_bonus) parts.push(`经+${stats.exp_bonus}%`)
  if (stats.gold_bonus) parts.push(`金+${stats.gold_bonus}%`)

  if (enchants.length) {
    const enchTexts = enchants.map((e) => `${e.stat}+${e.value}`)
    parts.push(enchTexts.join(' '))
  }

  return parts.join(' | ') || '无额外属性'
}
</script>
