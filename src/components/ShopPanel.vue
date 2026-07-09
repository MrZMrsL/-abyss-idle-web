<template>
  <div class="space-y-6 animate-fade-in pb-4">
    <!-- ===== Gold Header ===== -->
    <div class="card p-5 flex items-center justify-center gap-3">
      <span class="text-3xl">💰</span>
      <div class="text-center">
        <div class="text-xs text-[var(--text2)]">持有金币</div>
        <div class="text-2xl font-bold text-[var(--accent)]">{{ formatNumber(gold) }}</div>
      </div>
    </div>

    <!-- ===== Shop Items Grid ===== -->
    <div class="card p-5">
      <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-base">
        🏪 商品
      </h3>
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="(item, key) in shopItems"
          :key="key"
          class="rounded-xl p-4 border card-press flex flex-col gap-1.5"
          :class="[
            canAfford(item.price)
              ? 'border-[var(--border)] bg-white/[0.03]'
              : 'border-[var(--border)] bg-white/[0.02] opacity-70'
          ]"
        >
          <!-- Item Name -->
          <div class="font-bold text-base truncate">{{ item.name }}</div>

          <!-- Effect Description -->
          <div class="text-xs text-[var(--text2)] leading-tight">
            {{ formatItemEffect(item) }}
          </div>

          <!-- Price & Buy Button -->
          <div class="flex items-center justify-between mt-1">
            <span class="text-xs text-[var(--accent)] font-bold">
              💰 {{ formatNumber(item.price) }}
            </span>
          </div>

          <!-- Buy Button -->
          <button
            class="w-full text-xs font-bold rounded-lg min-h-[40px] flex items-center justify-center gap-1 transition-all"
            :class="canAfford(item.price)
              ? 'btn-primary text-[10px] py-2 px-0 min-h-0'
              : 'bg-white/10 text-[var(--text3)] cursor-not-allowed'
            "
            :disabled="!canAfford(item.price)"
            @click="store.buyItem(key)"
          >
            {{ canAfford(item.price) ? '购买' : '金币不足' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===== Consumables Section ===== -->
    <div class="card p-5">
      <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-base">
        🧪 消耗品
      </h3>
      <div v-if="Object.keys(consumables).length === 0" class="text-center text-[var(--text2)] text-base py-6">
        🫙 暂无消耗品
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="(count, key) in consumables"
          :key="key"
          class="flex items-center justify-between rounded-xl p-3 border border-[var(--border)] bg-white/[0.03] card-press"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-lg">{{ itemIcon(key) }}</span>
            <div class="min-w-0">
              <div class="font-bold text-base truncate">{{ shopItems[key]?.name || key }}</div>
              <div class="text-xs text-[var(--text2)]">
                {{ formatItemEffect(shopItems[key]) }} | 持有：{{ count }}个
              </div>
            </div>
          </div>
          <button
            class="btn-primary text-xs py-2 px-3 min-h-[36px] shrink-0"
            @click="store.useItem(key)"
          >
            使用
          </button>
        </div>
      </div>
    </div>

    <!-- ===== Pet Eggs Section ===== -->
    <div class="card p-5">
      <h3 class="text-[var(--accent)] font-bold mb-3 flex items-center gap-1.5 text-base">
        🥚 宠物蛋
      </h3>
      <div class="space-y-3">
        <div
          v-for="(egg, key) in eggShop"
          :key="key"
          class="rounded-xl p-4 border card-press flex flex-col gap-1.5"
          :class="[
            canAfford(egg.price)
              ? 'border-[var(--border)] bg-white/[0.03]'
              : 'border-[var(--border)] bg-white/[0.02] opacity-70'
          ]"
        >
          <!-- Egg Name -->
          <div class="font-bold text-base">{{ egg.name }}</div>

          <!-- Tier Weights -->
          <div class="text-xs text-[var(--text2)] leading-tight">
            出率：{{ formatTierWeights(egg.tier_weights) }}
          </div>

          <!-- Price & Hatch Button -->
          <div class="flex items-center justify-between mt-1">
            <span class="text-xs text-[var(--accent)] font-bold">
              💰 {{ formatNumber(egg.price) }}
            </span>
          </div>

          <button
            class="w-full text-xs font-bold rounded-lg min-h-[40px] flex items-center justify-center gap-1 transition-all"
            :class="canAfford(egg.price)
              ? 'btn-primary text-[10px] py-2 px-0 min-h-0'
              : 'bg-white/10 text-[var(--text3)] cursor-not-allowed'
            "
            :disabled="!canAfford(egg.price)"
            @click="store.hatchEgg(key)"
          >
            {{ canAfford(egg.price) ? '🔮 孵化' : '金币不足' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { SHOP_ITEMS } from '../data/shop.js'
import { PET_EGG_SHOP } from '../data/pets.js'
import { formatNumber } from '../core/utils/formatters.js'

const store = useGameStore()
const shopItems = SHOP_ITEMS
const eggShop = PET_EGG_SHOP
const consumables = computed(() => store.save?.consumables || {})
const gold = computed(() => store.stats?.gold || 0)

function canAfford(price) {
  return gold.value >= price
}

function formatItemEffect(item) {
  if (!item) return ''
  switch (item.effect) {
    case 'heal':
      return `恢复 ${formatNumber(item.value)} 生命值`
    case 'mana':
      return `恢复 ${formatNumber(item.value)} 魔法值`
    case 'enchant':
      return `为装备附加一条随机附魔`
    case 'reroll':
      return `重新roll一件装备的所有属性`
    default:
      return ''
  }
}

function itemIcon(key) {
  const icons = {
    hp_potion_s: '🧪',
    hp_potion_m: '🧪',
    hp_potion_l: '🧪',
    mp_potion: '💧',
    scroll_enchant: '📜',
    scroll_reroll: '🔄',
  }
  return icons[key] || '📦'
}

function formatTierWeights(weights) {
  const tierNames = ['T1', 'T2', 'T3', 'T4', 'T5']
  const parts = []
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] > 0) {
      parts.push(`${tierNames[i]} ${weights[i]}%`)
    }
  }
  return parts.join(' / ')
}
</script>
