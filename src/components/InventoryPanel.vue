<template>
  <div class="space-y-3">
    <!-- Bulk Actions -->
    <div class="flex gap-2 overflow-x-auto pb-1">
      <button class="px-3 py-1.5 rounded-lg bg-white/5 text-xs whitespace-nowrap border border-[var(--border)]" @click="store.organizeBag">整理</button>
      <button class="px-3 py-1.5 rounded-lg bg-white/5 text-xs whitespace-nowrap border border-[var(--border)]" @click="store.applyOptimal">一键最优</button>
      <button class="px-3 py-1.5 rounded-lg bg-white/5 text-xs whitespace-nowrap border border-[var(--border)]" @click="store.sellAll('普通')">卖白装</button>
      <button class="px-3 py-1.5 rounded-lg bg-white/5 text-xs whitespace-nowrap border border-[var(--border)]" @click="store.sellAll('稀有')">卖稀有及以下</button>
    </div>

    <!-- Inventory Grid -->
    <div class="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
      <h3 class="text-[var(--accent)] font-bold mb-3">🎒 背包 {{ inventory.length }}/50</h3>
      <div v-if="inventory.length === 0" class="text-center text-[var(--text2)] py-8">背包空空如也</div>
      <div v-else class="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto">
        <div
          v-for="item in inventory"
          :key="item.id"
          class="bg-white/5 rounded-lg p-3 border flex flex-col gap-1"
          :style="{ borderColor: qualityColor(item.quality) + '40' }"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="font-bold text-sm" :style="{ color: qualityColor(item.quality) }">{{ item.name }}</div>
              <div class="text-xs text-[var(--text2)]">Lv.{{ item.level }} {{ item.type }}</div>
            </div>
            <div class="text-xs text-[var(--text2)]" v-if="item.set_name">{{ item.set_name }}</div>
          </div>
          <div class="text-xs text-[var(--text2)]">
            {{ formatStats(item) }}
          </div>
          <div class="flex gap-2 mt-1">
            <button class="flex-1 py-1 rounded bg-[var(--accent)] text-[var(--bg)] text-xs font-bold" @click="store.equipItem(item.id)">装备</button>
            <button class="px-2 py-1 rounded bg-white/10 text-xs" @click="store.sellItem(item.id)">卖</button>
            <button class="px-2 py-1 rounded bg-white/10 text-xs" @click="store.dismantleItem(item.id)">分</button>
            <button class="px-2 py-1 rounded bg-white/10 text-xs" @click="store.enhanceItem(item.id)">强</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Materials -->
    <div class="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
      <h3 class="text-[var(--accent)] font-bold mb-2">💎 材料</h3>
      <div class="text-sm">强化石：{{ materials.enhance_stone || 0 }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { QUALITY_COLORS } from '../data/items.js'

const store = useGameStore()
const inventory = computed(() => store.inventory)
const materials = computed(() => store.materials)

function qualityColor(q) {
  return QUALITY_COLORS[q] || '#a0a0a0'
}

function formatStats(item) {
  const parts = []
  const base = item.base || {}
  const stats = item.stats || {}
  const enchants = item.enchants || []
  if (base.damage) parts.push(`攻+${base.damage}`)
  if (base.armor) parts.push(`甲+${base.armor}`)
  if (base.hp) parts.push(`血+${base.hp}`)
  if (stats.damage_bonus) parts.push(`攻加成+${stats.damage_bonus}`)
  if (stats.armor) parts.push(`甲+${stats.armor}`)
  if (stats.hp_bonus) parts.push(`血+${stats.hp_bonus}`)
  if (stats.crit_rate) parts.push(`暴击+${stats.crit_rate}%`)
  if (stats.lifesteal) parts.push(`吸血+${stats.lifesteal}%`)
  if (stats.exp_bonus) parts.push(`经验+${stats.exp_bonus}%`)
  if (stats.gold_bonus) parts.push(`金币+${stats.gold_bonus}%`)
  if (item.enhance_level) parts.push(`强化+${item.enhance_level}`)
  if (enchants.length) parts.push(`附魔×${enchants.length}`)
  if ((item.gems || []).length) parts.push(`宝石×${item.gems.length}`)
  return parts.join(' | ') || '无额外属性'
}
</script>
