/**
 * 格式化工具函数
 * 放置游戏标配的大数字显示、时间格式化等
 */

// ============================================================
// 数字格式化
// ============================================================

/**
 * 大数字格式化 - 放置游戏标配
 * 15000 → "1.5万" | 580000000 → "5.8亿" | 1200000000000 → "1.2兆"
 */
export function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '0'
  const num = Number(n)
  if (num < 10000) return Math.floor(num).toLocaleString()
  if (num < 1e8) return (num / 1e4).toFixed(1).replace(/\.0$/, '') + '万'
  if (num < 1e12) return (num / 1e8).toFixed(1).replace(/\.0$/, '') + '亿'
  return (num / 1e12).toFixed(1).replace(/\.0$/, '') + '兆'
}

/**
 * 精确大数字格式化（保留更多精度）
 */
export function formatNumberPrecise(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '0'
  const num = Number(n)
  if (num < 10000) return num.toFixed(decimals).replace(/\.0+$/, '')
  if (num < 1e8) return (num / 1e4).toFixed(decimals) + '万'
  if (num < 1e12) return (num / 1e8).toFixed(decimals) + '亿'
  return (num / 1e12).toFixed(decimals) + '兆'
}

/**
 * 简短数字（用于紧凑显示）
 * 12345 → "12.3k" | 5800000 → "5.8M"
 */
export function formatNumberShort(n) {
  if (n === null || n === undefined || isNaN(n)) return '0'
  const num = Number(n)
  if (num < 1e3) return String(Math.floor(num))
  if (num < 1e6) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  if (num < 1e9) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (num < 1e12) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  return (num / 1e12).toFixed(1).replace(/\.0$/, '') + 'T'
}

// ============================================================
// 时间格式化
// ============================================================

/**
 * 时长格式化
 * 150 → "2小时30分钟" | 45 → "45分钟"
 */
export function formatDuration(minutes) {
  if (minutes <= 0) return '0分钟'
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}小时`
  return `${hours}小时${mins}分钟`
}

/**
 * 简洁时长
 * 150 → "2h30m" | 45 → "45m"
 */
export function formatDurationShort(minutes) {
  if (minutes <= 0) return '0m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h${mins}m`
}

// ============================================================
// 品质与颜色
// ============================================================

export const QUALITY_COLORS = {
  '普通': '#9e9e9e',
  '精制': '#4caf50',
  '稀有': '#2196f3',
  '史诗': '#9c27b0',
  '传说': '#ff9800',
  '神话': '#f44336',
}

export const QUALITY_BG_COLORS = {
  '普通': 'rgba(158,158,158,0.1)',
  '精制': 'rgba(76,175,80,0.1)',
  '稀有': 'rgba(33,150,243,0.1)',
  '史诗': 'rgba(156,39,176,0.1)',
  '传说': 'rgba(255,152,0,0.1)',
  '神话': 'rgba(244,67,54,0.1)',
}

/**
 * 获取品质对应的颜色
 */
export function qualityColor(q) {
  return QUALITY_COLORS[q] || '#9e9e9e'
}

/**
 * 获取品质对应的背景色
 */
export function qualityBgColor(q) {
  return QUALITY_BG_COLORS[q] || 'rgba(158,158,158,0.1)'
}

// ============================================================
// 百分比格式化
// ============================================================

/**
 * 百分比显示
 */
export function formatPercent(n, decimals = 1) {
  return (Number(n) || 0).toFixed(decimals) + '%'
}

// ============================================================
// 战斗相关格式化
// ============================================================

/**
 * 伤害数字格式化（带暴击标记）
 */
export function formatDamage(dmg, isCrit = false) {
  const num = formatNumber(dmg)
  return isCrit ? `${num} !` : num
}

/**
 * 战斗属性面板格式化
 */
export function formatCombatStat(label, value, unit = '') {
  return `${label}: ${formatNumber(value)}${unit}`
}

// ============================================================
// 文本工具
// ============================================================

/**
 * 截断文本
 */
export function truncate(str, maxLen = 20) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

/**
 * 重复字符
 */
export function repeat(char, times) {
  return char.repeat(Math.max(0, times))
}

/**
 * 进度条文本（用于命令行显示）
 */
export function progressBar(current, max, width = 20, fill = '█', empty = '░') {
  const ratio = Math.min(current / max, 1)
  const filled = Math.floor(ratio * width)
  return fill.repeat(filled) + empty.repeat(width - filled)
}

// ============================================================
// 装备相关格式化
// ============================================================

/**
 * 装备名称格式化（带品质颜色标记）
 */
export function formatItemName(item) {
  const { quality, name, enhance_level } = item
  const enh = enhance_level ? ` +${enhance_level}` : ''
  return { quality, fullName: `${name}${enh}`, color: qualityColor(quality) }
}

/**
 * 装备评分格式化
 */
export function formatItemScore(score) {
  if (score >= 100000) return formatNumber(score)
  return Math.floor(score).toLocaleString()
}
