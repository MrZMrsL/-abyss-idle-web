# 深渊挂机 · Web 版

一个可部署在静态托管平台的工程化网页放置 RPG，完整移植自 Python CLI 版本。

## 特性

- ⚔️ 自动战斗、离线收益、Boss 推进
- 🛡️ 装备生成、强化、附魔、镶嵌、套装组合
- 🐾 宠物捕捉、升级、融合、觉醒
- 📖 技能树系统
- 🏆 成就系统
- 🏪 商店与每日任务
- 💾 本地 IndexedDB 存档 + 导出/导入码
- 📱 移动端优先的响应式 UI

## 技术栈

- Vue 3 + Vite
- Pinia
- Tailwind CSS v4
- Dexie.js (IndexedDB)

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建产物在 `dist/` 目录。

## 部署到 Vercel

```bash
npx vercel --prod
```

## 存档说明

- 游戏存档自动保存在浏览器 IndexedDB 中
- 可通过「设置 → 导出存档」生成可复制的存档码
- 在另一台设备通过「设置 → 导入存档」粘贴恢复
- 兼容 Python 旧版本的原始 JSON 存档
