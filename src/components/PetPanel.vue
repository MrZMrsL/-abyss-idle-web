<template>
  <div class="space-y-3">
    <!-- 宠物列表 -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-3">🐾 宠物</h3>

      <!-- 无宠物提示 -->
      <div v-if="!pets.length" class="text-center text-[var(--text3)] text-sm py-6">
        <div class="text-3xl mb-2">🐾</div>
        <div>还没有宠物</div>
        <div class="text-xs mt-1">战斗中有概率遭遇野生宠物</div>
      </div>

      <!-- 宠物卡片 -->
      <div v-else class="space-y-2">
        <div
          v-for="(pet, idx) in pets"
          :key="idx"
          class="rounded-lg p-3 border transition-all"
          :class="idx === activePetIdx 
            ? 'border-[var(--accent)]/60 bg-[var(--accent)]/5 shadow-lg shadow-[var(--accent)]/5' 
            : 'border-[var(--border)] bg-white/[0.03]'"
        >
          <div class="flex items-center gap-3">
            <!-- 宠物图标 -->
            <div class="text-3xl shrink-0">{{ petInfo(pet).icon || '🐾' }}</div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 mb-0.5">
                <span v-if="idx === activePetIdx" class="text-xs">👑</span>
                <span class="font-bold text-sm truncate">{{ petInfo(pet).name || '未知' }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-[var(--text2)]">
                  Lv.{{ pet.level || 1 }}
                </span>
              </div>
              <div class="text-[10px] text-[var(--text2)]">
                被动: {{ petInfo(pet).passive || '无' }} +{{ (petInfo(pet).passive_val || 0) * (pet.level || 1) }}
              </div>
              <div v-if="idx === activePetIdx" class="text-[10px] text-[var(--accent)] mt-0.5">
                🗡️ 攻击加成: +{{ petAttackBonus(pet) }}
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-2 mt-2">
            <button
              v-if="idx !== activePetIdx"
              class="flex-1 btn-secondary text-[11px] py-1.5"
              @click="store.switchPet(idx)"
            >
              🛡️ 出战
            </button>
            <button
              v-else
              class="flex-1 btn-secondary text-[11px] py-1.5 opacity-50 cursor-default"
              disabled
            >
              👑 出战中
            </button>
            <button class="btn-secondary text-[11px] py-1.5 px-2" @click="store.upgradePet(idx)">
              ⬆️ 升级
            </button>
            <button
              class="btn-secondary text-[11px] py-1.5 px-2"
              style="color: var(--danger);"
              @click="store.releasePet(idx)"
            >
              🌿 放生
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 宠物蛋 -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-3">🥚 宠物蛋商店</h3>
      <div class="space-y-2">
        <div
          v-for="(egg, key) in eggShop"
          :key="key"
          class="flex justify-between items-center bg-white/[0.04] rounded-lg p-3"
        >
          <div>
            <div class="font-bold text-sm">{{ egg.name }}</div>
            <div class="text-[10px] text-[var(--text2)]">
              可开出 T1-T{{ egg.tier_weights?.length || 3 }} 宠物
            </div>
          </div>
          <button
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            :class="canAfford(egg.price)
              ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] text-[var(--bg)] active:scale-95'
              : 'bg-white/5 text-[var(--text3)] cursor-not-allowed'"
            :disabled="!canAfford(egg.price)"
            @click="store.buyItem(key)"
          >
            {{ egg.price }}G
          </button>
        </div>
      </div>
    </div>

    <!-- 已拥有的蛋 -->
    <div v-if="(save?.pet_eggs || []).length" class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-3">🥚 我的宠物蛋</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(egg, idx) in save?.pet_eggs"
          :key="idx"
          class="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-[var(--border)] text-xs active:scale-95 transition-transform"
          @click="store.hatchEgg(egg)"
        >
          {{ eggShop[egg]?.name || egg }} 🥚
        </button>
      </div>
    </div>

    <!-- 驯服按钮 -->
    <button class="btn-primary w-full" @click="store.catchPet">
      🎣 尝试驯服野生宠物
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { PET_TEMPLATES, PET_EGG_SHOP } from '../data/pets.js'
import { formatNumber } from '../core/utils/formatters.js'

const store = useGameStore()
const save = computed(() => store.save)
const pets = computed(() => store.pets)
const activePetIdx = computed(() => store.activePetIdx)
const eggShop = PET_EGG_SHOP
const gold = computed(() => store.stats?.gold || 0)

function petInfo(pet) {
  return PET_TEMPLATES[pet.template] || {}
}

function petAttackBonus(pet) {
  const tmpl = petInfo(pet)
  const baseDmg = tmpl.base_dmg || 3
  const growth = tmpl.growth || 2
  return Math.floor(baseDmg + growth * ((pet.level || 1) - 1))
}

function canAfford(price) {
  return gold.value >= price
}
</script>
