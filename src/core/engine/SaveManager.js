import { nowISO } from '../utils/helpers.js'
import { SAVE_VERSION } from '../utils/constants.js'

/**
 * 存档管理器
 * 负责存档的创建、迁移、读写
 * 所有子模块通过引用共享同一个 save 对象
 */
export class SaveManager {
  constructor(playerName = '冒险者', saveData = null) {
    this.playerName = playerName
    this.save = saveData ? this._migrateSave(saveData) : this._createNewSave()
    this.save._version = SAVE_VERSION
  }

  static fromSave(saveData, playerName = '冒险者') {
    return new SaveManager(playerName, saveData)
  }

  getSave() {
    return this.save
  }

  setSave(saveData) {
    this.save = this._migrateSave(saveData)
  }

  toJSON() {
    return JSON.stringify(this.save)
  }

  saveGame() {
    // Browser-only: persistence handled by caller via getSave()
  }

  // ============================================================
  // 存档迁移 - 将旧版本存档升级到新版本
  // ============================================================
  _migrateSave(data) {
    const save = JSON.parse(JSON.stringify(data))

    // 单宠物 -> 宠物列表
    if ('pet' in save && save.pet != null && !('pets' in save)) {
      save.pets = [save.pet]
      save.active_pet_idx = 0
      delete save.pet
    }
    if (!('pets' in save)) save.pets = []
    if (!('active_pet_idx' in save)) save.active_pet_idx = 0

    if (!('storage' in save)) save.storage = []
    if (!('materials' in save)) {
      save.materials = { enhance_stone: 0, set_fragments: {} }
    }
    if (!('daily_quests' in save)) {
      save.daily_quests = {
        reset_at: save.created_at || nowISO(),
        quests: {},
        completed: [],
      }
    }
    if (!('settings' in save)) save.settings = {}
    if (!('auto_use_potion' in save.settings)) save.settings.auto_use_potion = true

    if (!('stats' in save)) save.stats = {}
    for (const statKey of ['total_enhances', 'total_dismantles']) {
      if (!(statKey in save.stats)) save.stats[statKey] = 0
    }

    // 给已有装备加上 enhance_level 字段
    const allItems = [...(save.inventory || []), ...Object.values(save.equipped || {})]
    for (const item of allItems) {
      if (!('enhance_level' in item)) item.enhance_level = 0
    }

    return save
  }

  // ============================================================
  // 创建新存档
  // ============================================================
  _createNewSave() {
    const now = nowISO()
    return {
      _version: SAVE_VERSION,
      player_name: this.playerName,
      created_at: now,
      last_tick: now,
      stats: {
        level: 1,
        exp: 0,
        exp_to_next: 100,
        str: 10,
        agi: 10,
        int: 10,
        vit: 10,
        hp: 100,
        max_hp: 100,
        mp: 50,
        max_mp: 50,
        gold: 0,
        total_kills: 0,
        total_gold_earned: 0,
        deaths: 0,
        boss_kills: 0,
        consecutive_wins: 0,
        max_consecutive_wins: 0,
        total_potions_used: 0,
        total_shop_buys: 0,
        total_fuses: 0,
        total_gems_inserted: 0,
        total_gems_fused: 0,
        total_enchants: 0,
        total_skill_points_earned: 0,
        total_enhances: 0,
        total_dismantles: 0,
      },
      floor: 1,
      stage: 1,
      mode: 'idle',
      inventory: [],
      equipped: {},
      achievements: {},
      log: [],
      settings: {
        auto_sell_white: true,
        auto_equip_better: true,
        auto_use_potion: true,
        auto_dismantle_low_level: true,
        dismantle_level_threshold: 30,
      },
      skills: {},
      skill_points: 0,
      consumables: {},
      gems: {},
      pets: [],
      active_pet_idx: 0,
      pet_eggs: [],
      pending_pet: null,
      storage: [],
      materials: {
        enhance_stone: 0,
        set_fragments: {},
      },
      daily_quests: {
        reset_at: now,
        quests: {},
        completed: [],
      },
    }
  }
}
