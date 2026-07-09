<template>
  <div class="h-full w-full flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
    <div class="absolute inset-0 opacity-20">
      <div class="absolute top-10 left-10 w-32 h-32 bg-[var(--accent)] rounded-full blur-[80px]"></div>
      <div class="absolute bottom-10 right-10 w-40 h-40 bg-[var(--info)] rounded-full blur-[80px]"></div>
    </div>

    <div class="relative z-10">
      <h1 class="text-4xl md:text-5xl font-bold tracking-widest animate-float mb-2"
          style="background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 50%, var(--accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        深渊挂机
      </h1>
      <p class="text-[var(--text2)] text-sm tracking-widest mb-8">异步放置RPG · 装备无限刷</p>

      <div class="bg-white/5 border border-[var(--border)] rounded-2xl p-5 max-w-sm mb-6 text-left">
        <p class="text-sm leading-relaxed mb-3">🌑 <strong>深渊探险</strong>：自动战斗、离线收益、层层推进</p>
        <p class="text-sm leading-relaxed mb-3">⚔️ <strong>装备锻造</strong>：强化、附魔、镶嵌、套装组合</p>
        <p class="text-sm leading-relaxed mb-3">🐾 <strong>宠物养成</strong>：捕捉、升级、融合、觉醒</p>
        <p class="text-sm leading-relaxed">🏆 <strong>成就殿堂</strong>：挑战极限，收集全部荣耀</p>
      </div>

      <button
        class="relative z-10 px-10 py-3 rounded-full font-bold text-lg tracking-wider animate-pulse-glow"
        style="background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%); color: var(--bg);"
        @click="$emit('start')"
      >
        开始冒险
      </button>
      <p class="text-[var(--text2)] text-xs mt-4">本地存档 · 浏览器 IndexedDB 存储</p>
    </div>
  </div>
</template>

<script setup>
defineEmits(['start'])
</script>
