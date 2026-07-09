<template>
  <div class="space-y-3">
    <div class="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
      <h3 class="text-[var(--accent)] font-bold mb-3">🐾 宠物</h3>
      <div v-if="pets.length === 0" class="text-center text-[var(--text2)] py-6">还没有宠物，战斗中有概率遭遇野生宠物</div>
      <div v-else class="space-y-2">
        <div
          v-for="(pet, idx) in pets"
          :key="idx"
          class="bg-white/5 rounded-lg p-3 flex justify-between items-center"
          :class="idx === activePetIdx ? 'border border-[var(--accent)]' : ''"
        >
          <div>
            <div class="font-bold">{{ idx === activePetIdx ? '👑 ' : '' }}{{ petInfo(pet).icon }} {{ petInfo(pet).name }} Lv.{{ pet.level }}</div>
            <div class="text-xs text-[var(--text2)]">被动：{{ petInfo(pet).passive }} +{{ petInfo(pet).passive_val }}</div>
          </div>
          <div class="flex gap-2">
            <button v-if="idx !== activePetIdx" class="px-2 py-1 rounded bg-[var(--accent)] text-[var(--bg)] text-xs" @click="store.switchPet(idx)">出战</button>
            <button class="px-2 py-1 rounded bg-white/10 text-xs" @click="store.upgradePet(idx)">升级</button>
            <button class="px-2 py-1 rounded bg-[var(--danger)]/80 text-white text-xs" @click="store.releasePet(idx)">放生</button>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
      <h3 class="text-[var(--accent)] font-bold mb-3">🥚 宠物蛋</h3>
      <div class="space-y-2">
        <div
          v-for="(egg, key) in eggShop"
          :key="key"
          class="flex justify-between items-center bg-white/5 rounded-lg p-3"
        >
          <div>
            <div class="font-bold text-sm">{{ egg.name }}</div>
            <div class="text-xs text-[var(--text2)]">{{ egg.price }}G</div>
          </div>
          <button class="px-3 py-1 rounded bg-[var(--accent)] text-[var(--bg)] text-xs font-bold" @click="store.hatchEgg(key)">购买孵化</button>
        </div>
      </div>
    </div>

    <button class="w-full py-2 rounded-xl bg-white/5 border border-[var(--border)] text-sm" @click="store.catchPet">
      🎣 尝试驯服野生宠物
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { PET_TEMPLATES, PET_EGG_SHOP } from '../data/pets.js'

const store = useGameStore()
const pets = computed(() => store.pets)
const activePetIdx = computed(() => store.activePetIdx)
const eggShop = PET_EGG_SHOP

function petInfo(pet) {
  return PET_TEMPLATES[pet.template] || {}
}
</script>
