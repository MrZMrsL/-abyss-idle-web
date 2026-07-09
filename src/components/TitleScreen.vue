<template>
  <div class="h-full w-full flex flex-col items-center justify-center relative overflow-hidden" style="background: linear-gradient(180deg, #0a0a1a 0%, #0d0d1a 50%, #0a0829 100%);">
    <!-- 背景装饰 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- 光晕 -->
      <div class="absolute top-[20%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-20" style="background: radial-gradient(circle, rgba(212,168,83,0.4) 0%, transparent 70%);" />
      <div class="absolute bottom-[30%] left-[20%] w-32 h-32 rounded-full opacity-10" style="background: radial-gradient(circle, rgba(52,152,219,0.4) 0%, transparent 70%);" />
      <!-- 浮动粒子 -->
      <div
        v-for="i in 12"
        :key="i"
        class="absolute w-1 h-1 rounded-full bg-[var(--accent)]/30"
        :style="{
          left: Math.random() * 100 + '%',
          top: Math.random() * 100 + '%',
          animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }"
      />
    </div>

    <!-- 内容 -->
    <div class="relative z-10 flex flex-col items-center gap-6 px-6 animate-fade-in">
      <!-- 图标 -->
      <div class="text-6xl animate-float">⚔️</div>

      <!-- 标题 -->
      <div class="text-center">
        <h1
          class="text-4xl font-black tracking-wider"
          style="background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"
        >
          深渊挂机
        </h1>
        <p class="text-sm text-[var(--text2)] mt-2 tracking-widest">放置RPG</p>
      </div>

      <!-- 副标题 -->
      <p class="text-xs text-[var(--text3)] text-center leading-relaxed max-w-[240px]">
        无尽深渊，层层递进<br>收集装备，培养宠物，挑战极限
      </p>

      <!-- 开始按钮 -->
      <button
        v-if="store.initialized"
        class="btn-primary mt-4 animate-pulse-glow"
        style="min-height: 56px; padding: 14px 48px; font-size: 18px;"
        @click="$emit('start')"
      >
        🗡️ 开始冒险
      </button>

      <!-- 加载中 -->
      <div v-else class="flex flex-col items-center gap-2 mt-4">
        <div class="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <span class="text-xs text-[var(--text2)]">加载中...</span>
      </div>
    </div>

    <!-- 版本号 -->
    <div class="absolute bottom-6 text-[10px] text-[var(--text3)]">
      v1.0.0
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from '../stores/gameStore.js'

const store = useGameStore()

defineEmits(['start'])
</script>
