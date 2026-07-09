<template>
  <div class="space-y-4" :class="{ 'animate-screen-shake': screenShaking }">
    <!-- ========== 怪物战斗区 ========== -->
    <div
      class="rounded-2xl border overflow-hidden relative"
      style="background: linear-gradient(180deg, rgba(26,26,46,0.9) 0%, rgba(13,13,26,0.95) 100%); border-color: var(--border);"
      :style="currentMonster?.is_boss ? 'border-color: rgba(231,76,60,0.3);' : ''"
    >
      <!-- Boss 光效 -->
      <div
        v-if="currentMonster?.is_boss"
        class="absolute inset-0 pointer-events-none opacity-30"
        style="background: radial-gradient(ellipse at center, rgba(231,76,60,0.15) 0%, transparent 70%);"
      />

      <div class="px-5 pt-4 pb-5 flex flex-col items-center relative">
        <!-- 层数标签 -->
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-bold">
            🏰 第 {{ store.floor }} 层 · {{ store.stage }}/10
          </span>
          <span v-if="store.stage >= 10" class="text-xs px-3 py-1 rounded-full bg-red-500/15 text-red-400 font-bold animate-pulse">
            👹 BOSS
          </span>
        </div>

        <!-- 怪物图标 -->
        <div class="text-7xl mb-2 select-none" :class="{ 'animate-shake': screenShaking }">
          {{ currentMonster?.is_boss ? '👹' : '👾' }}
        </div>

        <!-- 怪物名 -->
        <div class="text-base font-bold mb-3" :class="currentMonster?.is_boss ? 'text-red-400' : 'text-[var(--text)]'">
          {{ currentMonster?.name || '???' }}
        </div>

        <!-- 怪物 HP 条 -->
        <div class="w-full max-w-[300px]">
          <div class="flex justify-between text-[11px] text-[var(--text2)] mb-1 px-1">
            <span>HP</span>
            <span>{{ formatNumber(currentMonster?.hp || 0) }}</span>
          </div>
          <div class="h-3 bg-black/40 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="currentMonster?.is_boss
                ? 'bg-gradient-to-r from-red-700 via-red-500 to-orange-400'
                : 'bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-400'"
              :style="{ width: monsterHpPercent + '%' }"
            />
          </div>
        </div>

        <!-- 伤害飘字 -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            v-for="pop in damagePops"
            :key="pop.id"
            class="damage-pop"
            :class="{ crit: pop.isCrit }"
            :style="{ left: pop.x + '%', top: '35%' }"
          >
            {{ pop.isCrit ? '💥' : '⚔️' }} {{ formatNumber(pop.value) }}
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 操作按钮 ========== -->
    <button class="btn-primary w-full" style="min-height: 56px; font-size: 17px;" @click="handleFight">
      <span class="text-xl">⚔️</span>
      <span>立即战斗</span>
    </button>

    <div class="grid grid-cols-3 gap-3">
      <button class="btn-secondary text-xs py-3" @click="handleRush">
        <span>🔥</span>
        <span>Rush×10</span>
      </button>
      <button class="btn-secondary text-xs py-3" @click="handleOnline">
        <span>⏱️</span>
        <span>在线10分</span>
      </button>
      <button class="btn-secondary text-xs py-3" @click="handleOffline">
        <span>🌙</span>
        <span>离线1分</span>
      </button>
    </div>

    <!-- ========== 战斗属性（紧凑横条） ========== -->
    <div class="flex items-center justify-around py-3 px-2 rounded-xl border" style="background: rgba(255,255,255,0.02); border-color: var(--border);">
      <div class="text-center">
        <div class="text-xs text-red-400 mb-0.5">⚔️ 攻击</div>
        <div class="text-sm font-bold text-red-400">{{ formatNumber(combat.damage || 0) }}</div>
      </div>
      <div class="w-px h-8 bg-white/5" />
      <div class="text-center">
        <div class="text-xs text-blue-400 mb-0.5">🛡️ 护甲</div>
        <div class="text-sm font-bold text-blue-400">{{ formatNumber(combat.armor || 0) }}</div>
      </div>
      <div class="w-px h-8 bg-white/5" />
      <div class="text-center">
        <div class="text-xs text-yellow-400 mb-0.5">💥 暴击</div>
        <div class="text-sm font-bold text-yellow-400">{{ combat.crit_rate || 0 }}%</div>
      </div>
      <div class="w-px h-8 bg-white/5" />
      <div class="text-center">
        <div class="text-xs text-purple-400 mb-0.5">🩸 吸血</div>
        <div class="text-sm font-bold text-purple-400">{{ combat.lifesteal || 0 }}%</div>
      </div>
    </div>

    <!-- 额外 Buff 信息 -->
    <div v-if="combat.streak_bonus_desc || combat.pet_desc" class="flex flex-wrap gap-2">
      <span v-if="combat.streak_bonus_desc" class="text-xs px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
        🔥 {{ combat.streak_bonus_desc }}
      </span>
      <span v-if="combat.pet_desc" class="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
        🐾 {{ combat.pet_desc }}
      </span>
    </div>

    <!-- ========== 战斗报告（可折叠） ========== -->
    <div v-if="store.lastReport" class="rounded-xl border overflow-hidden animate-fade-in" style="border-color: var(--border); background: rgba(255,255,255,0.02);">
      <button class="w-full flex items-center justify-between px-4 py-3" @click="showReport = !showReport">
        <span class="text-xs font-bold text-[var(--accent)]">📜 战斗报告</span>
        <span class="text-xs text-[var(--text3)]">{{ showReport ? '▲' : '▼' }}</span>
      </button>
      <div v-show="showReport" class="px-4 pb-4 text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">
        {{ store.lastReport }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { formatNumber } from '../core/utils/formatters.js'

const store = useGameStore()
const combat = computed(() => store.combat)

const damagePops = ref([])
const screenShaking = ref(false)
const showReport = ref(true)

const currentMonster = ref(null)
const monsterHpPercent = ref(100)

function generatePreviewMonster() {
  try {
    const m = store.engine.generateMonster(store.floor, store.stage >= 10)
    currentMonster.value = m
    monsterHpPercent.value = 100
  } catch (e) {
    currentMonster.value = null
  }
}

generatePreviewMonster()
watch([() => store.floor, () => store.stage], () => generatePreviewMonster())

async function handleFight() {
  try {
    const isCrit = Math.random() < ((combat.value.crit_rate || 0) / 100)
    const baseDmg = combat.value.damage || 10
    const dmg = Math.floor(baseDmg * (isCrit ? 1.5 + Math.random() * 0.5 : 0.8 + Math.random() * 0.4))
    const pop = { id: Date.now(), value: dmg, isCrit, x: 25 + Math.random() * 40 }
    damagePops.value.push(pop)
    setTimeout(() => { damagePops.value = damagePops.value.filter(p => p.id !== pop.id) }, 800)

    screenShaking.value = true
    setTimeout(() => screenShaking.value = false, 400)

    store.doFight()
    showReport.value = true
    setTimeout(() => generatePreviewMonster(), 100)
  } catch (e) { console.error('Fight error:', e) }
}

function handleRush() {
  try {
    screenShaking.value = true
    setTimeout(() => screenShaking.value = false, 400)
    store.doRush(10)
    showReport.value = true
    setTimeout(() => generatePreviewMonster(), 100)
  } catch (e) { console.error('Rush error:', e) }
}

function handleOnline() {
  try { store.doOnline(10); setTimeout(() => generatePreviewMonster(), 100) }
  catch (e) { console.error('Online error', e) }
}

function handleOffline() {
  try { store.doTick(); setTimeout(() => generatePreviewMonster(), 100) }
  catch (e) { console.error('Offline error', e) }
}
</script>
