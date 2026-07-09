<template>
  <div class="space-y-3" :class="{ 'animate-screen-shake': screenShaking }">
    <!-- ========== 怪物战斗区域 ========== -->
    <div class="card relative overflow-hidden" style="background: linear-gradient(180deg, var(--card) 0%, var(--card2) 100%);">
      <!-- Boss 闪烁遮罩 -->
      <div
        v-if="currentMonster?.is_boss"
        class="absolute inset-0 pointer-events-none"
        style="animation: pulse-glow 2s ease-in-out infinite; background: radial-gradient(ellipse at center, rgba(231,76,60,0.08) 0%, transparent 70%);"
      />

      <!-- 层数/阶段信息 -->
      <div class="flex items-center justify-between px-4 pt-3 pb-1">
        <div class="flex items-center gap-2">
          <span class="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-bold">
            🏰 第 {{ store.floor }} 层
          </span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[var(--text2)]">
            阶段 {{ store.stage }}/10
          </span>
        </div>
        <div v-if="store.stage >= 10" class="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold animate-pulse">
          ⚠️ BOSS战
        </div>
      </div>

      <!-- 怪物展示 -->
      <div class="flex flex-col items-center py-4 relative">
        <!-- 怪物 Emoji -->
        <div
          class="text-6xl mb-2 select-none transition-transform"
          :class="{ 'animate-shake': screenShaking }"
        >
          {{ currentMonster?.is_boss ? '👹' : '👾' }}
        </div>
        <!-- 怪物名称 -->
        <div class="text-lg font-bold mb-1" :class="currentMonster?.is_boss ? 'text-red-400' : 'text-[var(--text)]'">
          {{ currentMonster?.name || '未知怪物' }}
        </div>
        <!-- 怪物属性 -->
        <div class="flex items-center gap-3 text-xs text-[var(--text2)] mb-3">
          <span>❤️ {{ formatNumber(currentMonster?.hp || 0) }}</span>
          <span>⚔️ {{ formatNumber(currentMonster?.damage || 0) }}</span>
          <span>💰 {{ formatNumber(currentMonster?.gold || 0) }}</span>
          <span>⭐ {{ formatNumber(currentMonster?.exp || 0) }}</span>
        </div>

        <!-- 怪物 HP 条 -->
        <div class="w-[85%] max-w-[280px]">
          <div class="flex justify-between text-[10px] text-[var(--text2)] mb-1">
            <span>怪物 HP</span>
            <span>{{ formatNumber(currentMonster?.hp || 0) }} / {{ formatNumber(currentMonster?.max_hp || 0) }}</span>
          </div>
          <div class="h-2.5 bg-black/40 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="currentMonster?.is_boss 
                ? 'bg-gradient-to-r from-red-700 via-red-500 to-red-400' 
                : 'bg-gradient-to-r from-purple-700 via-purple-500 to-pink-400'"
              :style="{ width: monsterHpPercent + '%' }"
            />
          </div>
        </div>

        <!-- 伤害飘字区域 -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            v-for="pop in damagePops"
            :key="pop.id"
            class="damage-pop"
            :class="{ crit: pop.isCrit }"
            :style="{ left: pop.x + '%', top: '30%' }"
          >
            {{ pop.isCrit ? '💥' : '⚔️' }} {{ formatNumber(pop.value) }}
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 操作按钮 ========== -->
    <div class="grid grid-cols-2 gap-3">
      <button class="btn-primary" style="min-height: 52px; font-size: 16px;" @click="handleFight">
        ⚔️ 立即战斗
      </button>
      <button
        class="btn-secondary"
        style="min-height: 52px; font-size: 15px; border-color: rgba(231,76,60,0.3); color: var(--danger);"
        @click="handleRush"
      >
        🔥 Rush×10
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button class="btn-secondary" @click="handleOnline">
        ⏱️ 在线10分钟
      </button>
      <button class="btn-secondary" @click="handleOffline">
        🌙 离线1分钟
      </button>
    </div>

    <!-- ========== 战斗属性 ========== -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-2">⚔️ 战斗属性</h3>
      <div class="grid grid-cols-4 gap-2">
        <div class="bg-white/[0.04] rounded-lg p-2 text-center">
          <div class="text-xs text-red-400 mb-0.5">⚔️</div>
          <div class="text-sm font-bold text-red-400 truncate">{{ formatNumber(combat.damage || 0) }}</div>
          <div class="text-[10px] text-[var(--text3)]">攻击</div>
        </div>
        <div class="bg-white/[0.04] rounded-lg p-2 text-center">
          <div class="text-xs text-blue-400 mb-0.5">🛡️</div>
          <div class="text-sm font-bold text-blue-400 truncate">{{ formatNumber(combat.armor || 0) }}</div>
          <div class="text-[10px] text-[var(--text3)]">护甲</div>
        </div>
        <div class="bg-white/[0.04] rounded-lg p-2 text-center">
          <div class="text-xs text-yellow-400 mb-0.5">💥</div>
          <div class="text-sm font-bold text-yellow-400">{{ combat.crit_rate || 0 }}%</div>
          <div class="text-[10px] text-[var(--text3)]">暴击</div>
        </div>
        <div class="bg-white/[0.04] rounded-lg p-2 text-center">
          <div class="text-xs text-purple-400 mb-0.5">🩸</div>
          <div class="text-sm font-bold text-purple-400">{{ combat.lifesteal || 0 }}%</div>
          <div class="text-[10px] text-[var(--text3)]">吸血</div>
        </div>
      </div>

      <!-- 额外信息 -->
      <div v-if="combat.streak_bonus_desc || combat.pet_desc" class="mt-2 pt-2 border-t border-[var(--border)] text-[10px] text-[var(--text2)] space-y-0.5">
        <div v-if="combat.streak_bonus_desc">🔥 {{ combat.streak_bonus_desc }}</div>
        <div v-if="combat.pet_desc">🐾 {{ combat.pet_desc }}</div>
      </div>
    </div>

    <!-- ========== 已装备 ========== -->
    <div class="card p-3">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-2">🛡️ 已装备</h3>
      <div class="grid grid-cols-3 gap-1.5">
        <div
          v-for="(item, slot) in equipped"
          :key="slot"
          class="rounded-lg p-1.5 text-center border"
          :class="`border-q-${item.quality} bg-q-${item.quality}`"
        >
          <div class="text-[10px] text-[var(--text3)]">{{ slot }}</div>
          <div class="text-[10px] font-bold truncate" :class="`text-q-${item.quality}`">{{ item.name }}</div>
          <div v-if="item.enhance_level" class="text-[10px] text-[var(--accent)]">+{{ item.enhance_level }}</div>
        </div>
        <div
          v-for="slot in emptySlots"
          :key="slot"
          class="rounded-lg p-1.5 text-center border border-dashed border-[var(--border)] bg-white/[0.02]"
        >
          <div class="text-[10px] text-[var(--text3)]">{{ slot }}</div>
          <div class="text-[10px] text-[var(--text3)]">空</div>
        </div>
      </div>
    </div>

    <!-- ========== 战斗报告 ========== -->
    <div v-if="store.lastReport" class="card p-3 animate-fade-in">
      <h3 class="text-xs font-bold text-[var(--accent)] mb-2">📜 战斗报告</h3>
      <div class="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">{{ store.lastReport }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { ITEM_TYPES, QUALITY_COLORS } from '../data/items.js'
import { formatNumber } from '../core/utils/formatters.js'

const store = useGameStore()
const combat = computed(() => store.combat)
const equipped = computed(() => store.equipped)
const emptySlots = computed(() => ITEM_TYPES.filter(t => !equipped.value[t]))

// 伤害飘字
const damagePops = ref([])
const screenShaking = ref(false)

// 怪物预览
const currentMonster = ref(null)
const monsterHpPercent = ref(100)

function generatePreviewMonster() {
  try {
    const isBoss = store.stage >= 10
    const m = store.engine.generateMonster(store.floor, isBoss)
    currentMonster.value = m
    monsterHpPercent.value = 100
  } catch (e) {
    currentMonster.value = null
  }
}

// 初始生成 + 监听变化
generatePreviewMonster()
watch([() => store.floor, () => store.stage], () => {
  generatePreviewMonster()
})

async function handleFight() {
  try {
    // 伤害飘字
    const isCrit = Math.random() < ((combat.value.crit_rate || 0) / 100)
    const baseDmg = combat.value.damage || 10
    const dmg = Math.floor(baseDmg * (isCrit ? 1.5 + Math.random() * 0.5 : 0.8 + Math.random() * 0.4))
    const pop = {
      id: Date.now(),
      value: dmg,
      isCrit,
      x: 25 + Math.random() * 40,
    }
    damagePops.value.push(pop)
    setTimeout(() => {
      damagePops.value = damagePops.value.filter(p => p.id !== pop.id)
    }, 800)

    // 屏幕震动
    screenShaking.value = true
    setTimeout(() => screenShaking.value = false, 400)

    // 执行战斗
    store.doFight()

    // 刷新怪物
    setTimeout(() => generatePreviewMonster(), 100)
  } catch (e) {
    console.error('Fight error:', e)
  }
}

function handleRush() {
  try {
    screenShaking.value = true
    setTimeout(() => screenShaking.value = false, 400)
    store.doRush(10)
    setTimeout(() => generatePreviewMonster(), 100)
  } catch (e) {
    console.error('Rush error:', e)
  }
}

function handleOnline() {
  try {
    store.doOnline(10)
    setTimeout(() => generatePreviewMonster(), 100)
  } catch (e) {
    console.error('Online error:', e)
  }
}

function handleOffline() {
  try {
    store.doTick()
    setTimeout(() => generatePreviewMonster(), 100)
  } catch (e) {
    console.error('Offline error:', e)
  }
}
</script>
