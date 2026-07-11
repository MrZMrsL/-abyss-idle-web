<template>
  <div class="space-y-6 pb-4 animate-fade-in">
    <!-- ===== 宠物列表 ===== -->
    <div class="card p-5">
      <h3 class="text-[var(--accent)] font-bold text-lg mb-4 flex items-center gap-2">
        🐾 宠物
        <span v-if="pets.length > 0" class="text-[var(--text2)] text-sm font-normal">
          ({{ pets.length }} 只)
        </span>
      </h3>

      <!-- 空状态 -->
      <div v-if="pets.length === 0" class="text-center text-[var(--text2)] py-10 flex flex-col items-center gap-3">
        <div class="text-4xl opacity-30">🐾</div>
        <div>还没有宠物</div>
        <div class="text-sm opacity-60">战斗中有概率遭遇野生宠物，或使用宠物蛋孵化</div>
      </div>

      <!-- 宠物列表 -->
      <div v-else class="space-y-4">
        <div
          v-for="(pet, idx) in enrichedPets"
          :key="idx"
          class="card-press rounded-xl p-5 transition-all duration-200"
          :class="idx === activePetIdx
            ? 'bg-[var(--card2)] border-2 border-[var(--accent)] shadow-lg shadow-[rgba(212,168,83,0.15)]'
            : 'bg-white/[0.03] border border-[var(--border)]'"
        >
          <!-- 出战标记 -->
          <div v-if="idx === activePetIdx" class="flex items-center gap-1 mb-2">
            <span class="text-lg">👑</span>
            <span class="text-[var(--accent)] text-sm font-bold tracking-wide">出战中</span>
          </div>

          <div class="flex items-center gap-3">
            <!-- 宠物图标 -->
            <div
              class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
              :class="idx === activePetIdx
                ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/30'
                : 'bg-white/5'"
            >
              {{ pet.info.icon }}
            </div>

            <!-- 宠物信息 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="font-bold text-lg">{{ pet.info.name }}</span>
                <span class="text-sm px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-bold">
                  Lv.{{ pet.level }}
                </span>
                <span class="text-sm px-2 py-0.5 rounded-full text-white/70 font-medium" :class="tierBg(pet.info.tier)">
                  {{ tierLabel(pet.info.tier) }}
                </span>
              </div>

              <!-- 被动技能 -->
              <div class="text-sm text-[var(--text2)] mb-1">
                被动：{{ passiveLabel(pet.info.passive) }} <span class="text-[var(--accent)]">+{{ pet.info.passive_val }}</span>
              </div>

              <!-- 属性预览 -->
              <div class="text-sm text-[var(--text3)] flex items-center gap-3">
                <span>攻击: {{ formatNumber(pet.damage) }}</span>
                <span>成长: {{ pet.info.growth }}</span>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-2 mt-3">
            <button
              v-if="idx !== activePetIdx"
              class="btn-secondary flex-1 text-base"
              style="min-height: 44px;"
              @click="store.switchPet(idx)"
            >
              ⚔️ 出战
            </button>
            <button
              class="btn-secondary flex-1 text-base"
              style="min-height: 44px;"
              @click="store.upgradePet(idx)"
            >
              ⬆️ 升级 <span class="text-[var(--accent)]">({{ formatNumber(upgradeCost(pet.level)) }}G)</span>
            </button>
            <button
              class="btn-secondary flex-1 text-base"
              style="min-height: 44px; color: var(--danger); border-color: rgba(231,76,60,0.3);"
              @click="store.releasePet(idx)"
            >
              🗑️ 放生
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 宠物蛋商店 ===== -->
    <div class="card p-5">
      <h3 class="text-[var(--accent)] font-bold text-lg mb-4 flex items-center gap-2">
        🥚 宠物蛋商店
      </h3>
      <div class="space-y-3">
        <div
          v-for="(egg, key) in eggShop"
          :key="key"
          class="card-press bg-white/[0.03] rounded-xl p-5 border border-[var(--border)] hover:border-[var(--border-hover)] transition-all"
        >
          <div class="flex items-center gap-3">
            <!-- 蛋图标 -->
            <div class="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-2xl flex-shrink-0">
              🥚
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-base mb-1">{{ egg.name }}</div>
              <div class="text-base text-[var(--text2)]">
                <span v-for="(weight, tier) in egg.tier_weights" :key="tier" class="mr-2">
                  <span :class="tierColor(tier)">{{ tierLabel(tier + 1) }}</span>
                  <span class="text-[var(--text3)]"> {{ weight }}%</span>
                </span>
              </div>
            </div>
            <button
              class="btn-primary text-base px-4"
              style="min-height: 44px;"
              @click="store.hatchEgg(key)"
            >
              🛒 {{ formatNumber(egg.price) }}G
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 驯服按钮 ===== -->
    <button
      class="btn-primary w-full text-base"
      style="min-height: 52px;"
      @click="store.catchPet()"
    >
      🎣 尝试驯服野生宠物
      <span class="text-sm opacity-70 font-normal ml-1">(战斗中概率遇到)</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { PET_TEMPLATES, PET_EGG_SHOP, PET_UPGRADE_COST } from '../data/pets.js'
import { formatNumber } from '../core/utils/formatters.js'

const store = useGameStore()
const pets = computed(() => store.pets)
const activePetIdx = computed(() => store.activePetIdx)
const eggShop = PET_EGG_SHOP

// 计算每只宠物的升级费用
function upgradeCost(level) {
  return PET_UPGRADE_COST(level)
}

// 计算每只宠物的伤害值
function petDamage(pet, info) {
  return Math.floor(info.base_dmg + info.growth * (pet.level - 1))
}

// 增强宠物数据
const enrichedPets = computed(() => {
  return pets.value.map((pet) => {
    const info = petInfo(pet)
    return {
      ...pet,
      info,
      damage: petDamage(pet, info),
    }
  })
})

// 获取宠物模板信息
function petInfo(pet) {
  return PET_TEMPLATES[pet.template] || {}
}

// 品质标签
function tierLabel(tier) {
  const labels = { 1: 'T1 普通', 2: 'T2 精英', 3: 'T3 稀有', 4: 'T4 史诗', 5: 'T5 传说' }
  return labels[tier] || 'T?'
}

// 品质背景
function tierBg(tier) {
  const bgs = {
    1: 'bg-gray-500/15 text-gray-400',
    2: 'bg-[var(--q-rare)]/15 text-[var(--q-rare)]',
    3: 'bg-[var(--q-epic)]/15 text-[var(--q-epic)]',
    4: 'bg-[var(--q-legend)]/15 text-[var(--q-legend)]',
    5: 'bg-[var(--q-mythic)]/15 text-[var(--q-mythic)]',
  }
  return bgs[tier] || 'bg-gray-500/15'
}

// 品质颜色
function tierColor(tier) {
  const colors = {
    1: 'text-q-common',
    2: 'text-q-rare',
    3: 'text-q-epic',
    4: 'text-q-legend',
    5: 'text-q-mythic',
  }
  return colors[tier] || 'text-q-common'
}

// 被动技能中文名称
function passiveLabel(passive) {
  const labels = {
    damage_bonus: '攻击加成',
    hp_bonus: '生命加成',
    crit_rate: '暴击率',
    exp_bonus: '经验加成',
    gold_bonus: '金币加成',
    armor: '护甲加成',
    max_mp: '法力加成',
    max_hp: '生命上限',
    lifesteal: '生命偷取',
    damage_mult: '伤害倍率',
  }
  return labels[passive] || passive
}
</script>
