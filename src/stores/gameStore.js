import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GameEngine } from '../core/GameEngine.js'
import { loadSave, saveSave, exportSaveToString, importSaveFromString } from '../db/index.js'
import { nowISO } from '../core/utils/helpers.js'

const SAVE_DEBOUNCE_MS = 800

export const useGameStore = defineStore('game', () => {
  const engine = ref(null)
  const initialized = ref(false)
  const lastReport = ref('')
  const activeTab = ref('battle')
  const toastQueue = ref([])
  const pendingOffline = ref(null)

  const save = computed(() => engine.value?.getSave() || null)
  const stats = computed(() => save.value?.stats || {})
  const combat = computed(() => engine.value?._calcCombatStats() || {})
  const floor = computed(() => save.value?.floor || 1)
  const stage = computed(() => save.value?.stage || 1)
  const inventory = computed(() => save.value?.inventory || [])
  const equipped = computed(() => save.value?.equipped || {})
  const pets = computed(() => save.value?.pets || [])
  const activePetIdx = computed(() => save.value?.active_pet_idx || 0)
  const achievements = computed(() => save.value?.achievements || {})
  const materials = computed(() => save.value?.materials || { enhance_stone: 0, set_fragments: {} })
  const gems = computed(() => save.value?.gems || {})
  const dailyQuests = computed(() => save.value?.daily_quests || { quests: {}, completed: [] })

  let saveTimer = null

  async function init() {
    const existing = await loadSave()
    engine.value = existing ? GameEngine.fromSave(existing) : new GameEngine()
    initialized.value = true

    // Process offline progress on first load
    const lastTick = new Date(engine.value.save.last_tick || Date.now())
    const now = new Date()
    const minutes = Math.min(Math.floor((now - lastTick) / 60000), 720)

    if (minutes > 0) {
      const report = engine.value.processOffline(minutes)
      pendingOffline.value = report
      engine.value.save.last_tick = nowISO()
      queueSave()
    } else {
      engine.value.save.last_tick = nowISO()
      queueSave()
    }
  }

  function queueSave() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      if (engine.value) {
        await saveSave(engine.value.getSave())
      }
    }, SAVE_DEBOUNCE_MS)
  }

  function commit() {
    engine.value.save.last_tick = nowISO()
    queueSave()
  }

  function showToast(message, type = 'info', duration = 3000) {
    const id = Date.now() + Math.random()
    toastQueue.value.push({ id, message, type, duration })
    setTimeout(() => {
      toastQueue.value = toastQueue.value.filter((t) => t.id !== id)
    }, duration)
  }

  function dismissOffline() {
    pendingOffline.value = null
  }

  function doTick() {
    const report = engine.value.processOffline(1)
    lastReport.value = report
    commit()
    return report
  }

  function doOnline(minutes) {
    const report = engine.value.processOnline(minutes)
    lastReport.value = report
    commit()
    showToast('在线挂机完成', 'success')
    return report
  }

  function doRush(count) {
    const report = engine.value.rushBattles(count)
    lastReport.value = report
    commit()
    return report
  }

  function doFight() {
    const isBoss = engine.value.save.stage >= 10
    const monster = engine.value.generateMonster(engine.value.save.floor, isBoss)
    const [won, result] = engine.value._doBattle(monster)
    if (won && isBoss) {
      engine.value.save.floor += 1
      engine.value.save.stage = 1
    } else if (won) {
      engine.value.save.stage += 1
    }
    lastReport.value = result
    commit()
    return result
  }

  function generateMonsterPreview(floor, isBoss) {
    try {
      return engine.value?.generateMonster(floor, isBoss) || null
    } catch (e) {
      return null
    }
  }

  function equipItem(itemId) {
    const msg = engine.value.equipItem(itemId)
    lastReport.value = msg
    commit()
    return msg
  }

  function sellItem(itemId) {
    const msg = engine.value.sellItem(itemId)
    lastReport.value = msg
    commit()
    return msg
  }

  function sellAll(maxQuality = '普通') {
    const msg = engine.value.sellAll(maxQuality)
    lastReport.value = msg
    commit()
    return msg
  }

  function dismantleItem(itemId) {
    const msg = engine.value.dismantleItem(itemId)
    lastReport.value = msg
    commit()
    return msg
  }

  function enhanceItem(itemId) {
    const msg = engine.value.enhanceItem(itemId)
    lastReport.value = msg
    commit()
    return msg
  }

  function buyItem(key) {
    const msg = engine.value.buyItem(key)
    lastReport.value = msg
    commit()
    return msg
  }

  function useItem(key) {
    const msg = engine.value.useItem(key)
    lastReport.value = msg
    commit()
    return msg
  }

  function learnSkill(key) {
    const msg = engine.value.learnSkill(key)
    lastReport.value = msg
    commit()
    return msg
  }

  function catchPet() {
    const msg = engine.value.catchPet()
    lastReport.value = msg
    commit()
    return msg
  }

  function switchPet(idx) {
    const msg = engine.value.switchPet(idx)
    lastReport.value = msg
    commit()
    return msg
  }

  function upgradePet(idx) {
    const msg = engine.value.upgradePet(idx)
    lastReport.value = msg
    commit()
    return msg
  }

  function releasePet(idx) {
    const msg = engine.value.releasePet(idx)
    lastReport.value = msg
    commit()
    return msg
  }

  function hatchEgg(key) {
    const msg = engine.value.hatchEgg(key)
    lastReport.value = msg
    commit()
    return msg
  }

  function fusePets(mainIdx, subIdx) {
    const msg = engine.value.fusePets(mainIdx, subIdx)
    lastReport.value = msg
    commit()
    return msg
  }

  function insertGem(itemId, slotIdx, gemType, gemLevel) {
    const msg = engine.value.insertGem(itemId, slotIdx, gemType, gemLevel)
    lastReport.value = msg
    commit()
    return msg
  }

  function removeGem(itemId, slotIdx) {
    const msg = engine.value.removeGem(itemId, slotIdx)
    lastReport.value = msg
    commit()
    return msg
  }

  function gemFuse(gemType, gemLevel) {
    const msg = engine.value.gemFuse(gemType, gemLevel)
    lastReport.value = msg
    commit()
    return msg
  }

  function enchantItem(itemId) {
    const msg = engine.value.enchantItem(itemId)
    lastReport.value = msg
    commit()
    return msg
  }

  function toStorage(itemId) {
    const msg = engine.value.toStorage(itemId)
    lastReport.value = msg
    commit()
    return msg
  }

  function fromStorage(itemId) {
    const msg = engine.value.fromStorage(itemId)
    lastReport.value = msg
    commit()
    return msg
  }

  function organizeBag() {
    const msg = engine.value.organizeBag()
    lastReport.value = msg
    commit()
    return msg
  }

  function applyOptimal() {
    const msg = engine.value.applyOptimal()
    lastReport.value = msg
    commit()
    return msg
  }

  async function exportSave() {
    return await exportSaveToString()
  }

  async function importSave(str) {
    const save = await importSaveFromString(str)
    engine.value = GameEngine.fromSave(save)
    lastReport.value = '✅ 存档导入成功'
    return lastReport.value
  }

  async function resetGame() {
    engine.value = new GameEngine()
    await saveSave(engine.value.getSave())
    lastReport.value = '🗑️ 存档已重置'
  }

  function setActiveTab(tab) {
    activeTab.value = tab
  }

  return {
    engine,
    save,
    stats,
    combat,
    floor,
    stage,
    inventory,
    equipped,
    pets,
    activePetIdx,
    achievements,
    materials,
    gems,
    dailyQuests,
    initialized,
    lastReport,
    activeTab,
    toastQueue,
    pendingOffline,
    init,
    commit,
    showToast,
    dismissOffline,
    doTick,
    doOnline,
    doRush,
    doFight,
    generateMonsterPreview,
    equipItem,
    sellItem,
    sellAll,
    dismantleItem,
    enhanceItem,
    buyItem,
    useItem,
    learnSkill,
    catchPet,
    switchPet,
    upgradePet,
    releasePet,
    hatchEgg,
    fusePets,
    insertGem,
    removeGem,
    gemFuse,
    enchantItem,
    toStorage,
    fromStorage,
    organizeBag,
    applyOptimal,
    exportSave,
    importSave,
    resetGame,
    setActiveTab,
  }
})
