import Dexie from 'dexie'

export const db = new Dexie('AbyssIdleDB')

db.version(1).stores({
  saves: '++id, name, updatedAt',
  settings: 'key',
})

const SAVE_KEY = 'abyss_idle_save'

export async function loadSave() {
  try {
    const row = await db.settings.get(SAVE_KEY)
    if (row && row.data) {
      return row.data
    }
  } catch (e) {
    console.warn('IndexedDB load failed, falling back to localStorage', e)
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    console.warn('localStorage load failed', e)
  }
  return null
}

export async function saveSave(data) {
  const payload = { key: SAVE_KEY, data, updatedAt: Date.now() }
  try {
    await db.settings.put(payload)
  } catch (e) {
    console.warn('IndexedDB save failed, falling back to localStorage', e)
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch (err) {
      console.error('Failed to save game', err)
    }
  }
}

export async function exportSaveToString() {
  const save = await loadSave()
  if (!save) return ''
  return btoa(unescape(encodeURIComponent(JSON.stringify(save))))
}

export async function importSaveFromString(str) {
  try {
    const decoded = decodeURIComponent(escape(atob(str)))
    const save = JSON.parse(decoded)
    await saveSave(save)
    return save
  } catch (e) {
    // Try plain JSON
    try {
      const save = JSON.parse(str)
      await saveSave(save)
      return save
    } catch (err) {
      throw new Error('存档格式无效')
    }
  }
}
