<template>
  <div class="space-y-3">
    <!-- 金币显示 -->
    <div class="card p-3 flex items-center justify-between">
      <span class="text-sm text-[var(--text2)]">💰 当前金币</span>
      <span class="text-xl font-bold text-[var(--accent2)]">{{ formatNumber(gold) }}</span>
    </div>

    <!-- 商品列表 -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-3">🏪 商店</h3>
      <div class="grid grid-cols-2 gap-2">
        <div
          v-for="(item, key) in shopItems"
          :key="key"
          class="rounded-lg p-2.5 border border-[var(--border)] bg-white/[0.03] flex flex-col justify-between"
        >
          <div>
            <div class="font-bold text-sm mb-0.5">{{ item.name }}</div>
            <div class="text-[10px] text-[var(--text2)]">{{ item.effect }}+{{ item.value }}</div>
          </div>
          <button
            class="mt-2 w-full py-1.5 rounded-lg text-xs font-bold transition-all"
            :class="canAfford(item.price) 
              ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] text-[var(--bg)] active:scale-95' 
              : 'bg-white/5 text-[var(--text3)] cursor-not-allowed'"
            :disabled="!canAfford(item.price)"
            @click="store.buyItem(key)"
          >
            {{ canAfford(item.price) ? item.price + 'G' : '金币不足' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 消耗品 -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-3">🧪 消耗品</h3>
      <div v-if="!Object.keys(consumables).length" class="text-center text-[var(--text3)] text-sm py-4">
        暂无消耗品
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="(count, key) in consumables"
          :key="key"
          v-if="count > 0"
          class="flex justify-between items-center bg-white/[0.04] rounded-lg p-3"
        >
          <div class="flex items-center gap-2">
            <span class="font-bold text-sm">{{ shopItems[key]?.name || key }}</span>
            <span class="text-xs text-[var(--text2)]">x{{ count }}</span>
          </div>
          <button
            class="px-3 py-1.5 rounded-lg bg-[var(--success)]/20 text-[var(--success)] text-xs font-bold active:scale-95 transition-transform"
            @click="store.useItem(key)"
          >
            使用
          </button>
        </div>
      </div>
    </div>

    <!-- 宠物蛋 -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-3">🥚 宠物蛋</h3>
      <div class="space-y-2">
        <div
          v-for="(egg, key) in eggShop"
          :key="key"
          class="flex justify-between items-center bg-white/[0.04] rounded-lg p-3"
        >
          <div>
            <div class="font-bold text-sm">{{ egg.name }}</div>
            <div class="text-[10px] text-[var(--text2)]">{{ egg.price }}G</div>
          </div>
          <button
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            :class="canAfford(egg.price)
              ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] text-[var(--bg)] active:scale-95'
              : 'bg-white/5 text-[var(--text3)] cursor-not-allowed'"
            :disabled="!canAfford(egg.price)"
            @click="store.buyItem(key)"
          >
            购买
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
</script>
