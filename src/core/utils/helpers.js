/**
 * Shared helper functions for the idle RPG game engine.
 * Pure utilities that do not depend on engine state.
 */

/**
 * Return a random integer in [min, max] (inclusive).
 * Mirrors Python's random.randint().
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Weighted random choice. Mirrors Python's random.choices(..., weights=...)[0].
 * @template T
 * @param {T[]} items
 * @param {number[]} weights
 * @returns {T}
 */
export function weightedRandom(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return items[i]
  }
  return items[items.length - 1]
}

/**
 * Current local date as YYYY-MM-DD (mirrors Python date.today().isoformat()).
 * @returns {string}
 */
export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Current local ISO timestamp (mirrors Python's datetime.now().isoformat()).
 * @returns {string}
 */
export function nowISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

/**
 * Calculate the selling price of an item.
 * @param {object} item
 * @param {number} [baseMultiplier=10]
 * @returns {number}
 */
export function calcItemPrice(item, baseMultiplier = 10) {
  let price = item.level * baseMultiplier
  switch (item.quality) {
    case '精制':
      price *= 2
      break
    case '稀有':
      price *= 5
      break
    case '史诗':
      price *= 15
      break
    case '传说':
      price *= 50
      break
  }
  return Math.floor(price)
}

const QUALITY_SCORES = {
  普通: 1,
  精制: 2,
  稀有: 3,
  史诗: 4,
  传说: 5,
  神话: 15,
}

/**
 * Calculate an equipment score used for auto-equip and optimization decisions.
 * @param {object} item
 * @param {Record<string, object>} [contextEquipped={}]
 * @param {object} [setBonuses={}]
 * @returns {number}
 */
export function calcItemScore(item, contextEquipped = {}, setBonuses = {}) {
  const qScore = (QUALITY_SCORES[item.quality] || 0) * 10000
  const levelScore = (item.level || 1) * 100
  const allStats = { ...item.base, ...item.stats }
  const statScore = Object.values(allStats).reduce((sum, v) => {
    return typeof v === 'number' ? sum + v : sum
  }, 0)

  let setBonus = 0
  const setName = item.set_name
  if (setName && contextEquipped) {
    let count = 1
    for (const slot of Object.keys(contextEquipped)) {
      const eq = contextEquipped[slot]
      if (eq && eq.set_name === setName && eq.type !== item.type) {
        count += 1
      }
    }
    if (count >= 4 && setBonuses[setName]) {
      setBonus = 5000
    } else if (count >= 2 && setBonuses[setName]) {
      setBonus = 2000
    }
  }

  return qScore + levelScore + Math.floor(statScore) + setBonus
}

/**
 * Generate a short random id string (8 hex chars). Replaces Python's MD5-based id.
 * @returns {string}
 */
export function randomId() {
  return Math.random().toString(16).slice(2, 10)
}
