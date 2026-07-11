import { SaveManager } from './engine/SaveManager.js'
import { CombatEngine } from './engine/CombatEngine.js'
import { ItemManager } from './engine/ItemManager.js'
import { CraftingEngine } from './engine/CraftingEngine.js'
import { PetEngine } from './engine/PetEngine.js'
import { SkillEngine } from './engine/SkillEngine.js'
import { ShopEngine } from './engine/ShopEngine.js'
import { QuestEngine } from './engine/QuestEngine.js'
import { ProgressEngine } from './engine/ProgressEngine.js'
import { LogEngine } from './engine/LogEngine.js'

/**
 * GameEngine - 统一门面类（Facade）
 *
 * 对外 API 100% 保持向后兼容。内部将所有调用委托给对应的子模块：
 *
 *   SaveManager    - 存档管理
 *   CombatEngine   - 战斗循环 + 属性计算 + 怪物/装备生成
 *   ItemManager    - 背包管理 + 装备穿脱/买卖
 *   CraftingEngine - 强化/附魔/宝石/分解/继承/优化
 *   PetEngine      - 宠物系统
 *   SkillEngine    - 技能树
 *   ShopEngine     - 商店 + 消耗品
 *   QuestEngine    - 每日任务 + 成就
 *   ProgressEngine - 离线/在线/快速推图
 *   LogEngine      - 战斗日志 + 状态格式化
 */
export class GameEngine {
  constructor(playerName = '冒险者', saveData = null) {
    this.saveManager = new SaveManager(playerName, saveData)
    this.save = this.saveManager.save
    this.playerName = playerName

    const deps = { save: this.save }

    this.combatEngine = new CombatEngine(deps)
    this.skillEngine = new SkillEngine(deps)
    this.questEngine = new QuestEngine(deps)
    this.logEngine = new LogEngine(deps)

    const depsWithCombat = { ...deps, combatEngine: this.combatEngine }
    this.itemManager = new ItemManager(depsWithCombat)
    this.craftingEngine = new CraftingEngine(depsWithCombat)
    this.petEngine = new PetEngine(depsWithCombat)
    this.shopEngine = new ShopEngine(depsWithCombat)

    this.progressEngine = new ProgressEngine({
      ...deps,
      combatEngine: this.combatEngine,
      questEngine: this.questEngine,
      logEngine: this.logEngine,
    })
  }

  // SaveManager
  static fromSave(saveData, playerName = '冒险者') {
    return new GameEngine(playerName, saveData)
  }
  getSave() { return this.saveManager.getSave() }
  setSave(saveData) {
    this.saveManager.setSave(saveData)
    this.save = this.saveManager.save
  }
  toJSON() { return this.saveManager.toJSON() }
  saveGame() { this.saveManager.saveGame() }

  // CombatEngine
  generateMonster(floor, isBoss = false) { return this.combatEngine.generateMonster(floor, isBoss) }
  _doBattle(monster) { return this.combatEngine.doBattle(monster) }
  _calcCombatStats() { return this.combatEngine.calcCombatStats() }
  _checkLevelUp() { return this.combatEngine.checkLevelUp() }
  generateItem(floor, qualityOverride = null, onlineBonus = false) {
    return this.combatEngine.generateItem(floor, qualityOverride, onlineBonus)
  }

  // ItemManager
  equipItem(itemId) { return this.itemManager.equipItem(itemId) }
  sellItem(itemId) { return this.itemManager.sellItem(itemId) }
  sellAll(maxQuality = '普通') { return this.itemManager.sellAll(maxQuality) }
  getInventory() { return this.itemManager.getInventory() }
  fuseItems(itemIds) { return this.itemManager.fuseItems(itemIds) }
  organizeBag() { return this.itemManager.organizeBag() }
  smartStore() { return this.itemManager.smartStore() }
  getStorage() { return this.itemManager.getStorage() }
  toStorage(itemId) { return this.itemManager.toStorage(itemId) }
  fromStorage(itemId) { return this.itemManager.fromStorage(itemId) }
  getInventoryConsumables() { return this.itemManager.getInventoryConsumables() }
  _autoEquipIfBetter(item) { return this.itemManager.autoEquipIfBetter(item) }

  // CraftingEngine
  enhanceItem(itemId) { return this.craftingEngine.enhanceItem(itemId) }
  enchantItem(itemId) { return this.craftingEngine.enchantItem(itemId) }
  dismantleItem(itemId) { return this.craftingEngine.dismantleItem(itemId) }
  insertGem(itemId, slotIdx, gemType, gemLevel) { return this.craftingEngine.insertGem(itemId, slotIdx, gemType, gemLevel) }
  removeGem(itemId, slotIdx) { return this.craftingEngine.removeGem(itemId, slotIdx) }
  gemFuse(gemType, gemLevel) { return this.craftingEngine.gemFuse(gemType, gemLevel) }
  transferEnhance(oldId, newId) { return this.craftingEngine.transferEnhance(oldId, newId) }
  optimizeEquipment() { return this.craftingEngine.optimizeEquipment() }
  _calcComboScore(combo) { return this.craftingEngine.calcComboScore(combo) }
  applyOptimal() { return this.craftingEngine.applyOptimal() }
  getGems() { return this.craftingEngine.getGems() }
  getEquippedDetail() { return this.craftingEngine.getEquippedDetail() }
  getMaterials() { return this.craftingEngine.getMaterials() }
  getItemDetail(itemId) { return this.craftingEngine.getItemDetail(itemId) }
  _autoDismantle(item) { return this.craftingEngine.autoDismantle(item) }

  // PetEngine
  _tryPetEncounter() { return this.petEngine.tryPetEncounter() }
  catchPet() { return this.petEngine.catchPet() }
  releasePet(idx = 0) { return this.petEngine.releasePet(idx) }
  hatchEgg(eggKey) { return this.petEngine.hatchEgg(eggKey) }
  upgradePet(idx = null) { return this.petEngine.upgradePet(idx) }
  fusePets(mainIdx, subIdx) { return this.petEngine.fusePets(mainIdx, subIdx) }
  switchPet(idx) { return this.petEngine.switchPet(idx) }
  getPetEggs() { return this.petEngine.getPetEggs() }

  // SkillEngine
  getSkills() { return this.skillEngine.getSkills() }
  learnSkill(skillKey) { return this.skillEngine.learnSkill(skillKey) }

  // ShopEngine
  getShop() { return this.shopEngine.getShop() }
  buyItem(itemKey) { return this.shopEngine.buyItem(itemKey) }
  useItem(itemKey) { return this.shopEngine.useItem(itemKey) }
  _autoUsePotion() { return this.shopEngine.autoUsePotion() }

  // QuestEngine
  _checkDailyReset() { this.questEngine.checkDailyReset() }
  _trackQuest(questId, amount = 1) { this.questEngine.trackQuest(questId, amount) }
  _completeQuest(questId) { this.questEngine.completeQuest(questId) }
  getDailyQuests() { return this.questEngine.getDailyQuests() }
  _checkAchievements() { return this.questEngine.checkAchievements(this._calcCombatStats()) }
  forceCheckAchievements() { return this.questEngine.forceCheckAchievements(this._calcCombatStats()) }
  getAchievements() { return this.questEngine.getAchievements() }

  // ProgressEngine
  processOffline(minutes) { return this.progressEngine.processOffline(minutes) }
  processOnline(minutes) { return this.progressEngine.processOnline(minutes) }
  rushBattles(count) { return this.progressEngine.rushBattles(count) }

  // LogEngine
  _addBattleLog(won, enemy, detail) { this.logEngine.addBattleLog(won, enemy, detail) }
  getBattleLog() { return this.logEngine.getBattleLog() }
  getStatus() {
    return this.logEngine.getStatus(this.save.player_name || this.playerName, this._calcCombatStats())
  }
  getSetStatus() { return this.logEngine.getSetStatus() }
}
