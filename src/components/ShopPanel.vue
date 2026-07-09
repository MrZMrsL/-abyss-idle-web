<template>
  <div class="space-y-3">
    <div class="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
      <h3 class="text-[var(--accent)] font-bold mb-3">🏪 商店</h3>
      <div class="space-y-2">
        <div
          v-for="(item, key) in shopItems"
          :key="key"
          class="flex justify-between items-center bg-white/5 rounded-lg p-3"
        >
          <div>
            <div class="font-bold text-sm">{{ item.name }}</div>
            <div class="text-xs text-[var(--text2)]">{{ item.price }}G</div>
          </div>
          <button
            class="px-3 py-1 rounded text-xs font-bold"
            :class="canAfford(item.price) ? 'bg-[var(--accent)] text-[var(--bg)]' : 'bg-white/10 text-[var(--text2)]'"
            :disabled="!canAfford(item.price)"
            @click="store.buyItem(key)"
          >
            购买
          </button>
        </div>
      </div>
    </div>

    <div class="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
      <h3 class="text-[var(--accent)] font-bold mb-3">🧪 消耗品</h3>
      <div v-if="Object.keys(consumables).length === 0" class="text-center text-[var(--text2)] py-4">暂无消耗品</div>
      <div v-else class="space-y-2">
        <div
          v-for="(count, key) in consumables"
          :key="key"
          class="flex justify-between items-center bg-white/5 rounded-lg p-3"
        >
          <div>
            <div class="font-bold text-sm">{{ shopItems[key]?.name || key }}</div>
            <div class="text-xs text-[var(--text2)]">持有：{{ count }}</div>
          </div>
          <button class="px-3 py-1 rounded bg-[var(--success)] text-white text-xs font-bold" @click="store.useItem(key)">使用</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { SHOP_ITEMS } from '../data/shop.js'

const store = useGameStore()
const shopItems = SHOP_ITEMS
const consumables = computed(() => store.save?.consumables || {})
const gold = computed(() => store.stats?.gold || 0)

function canAfford(price) {
  return gold.value >= price
}
</script>
