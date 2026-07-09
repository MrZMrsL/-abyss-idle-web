/**
 * 游戏核心常量
 * 集中管理所有游戏数值常量，避免魔法数字散落在各处
 */

// ============================================================
// 存档与系统版本
// ============================================================
export const SAVE_VERSION = '2.0'
export const ENGINE_VERSION = '2.0.0'

// ============================================================
// 容量限制
// ============================================================
export const MAX_INVENTORY = 50
export const MAX_STORAGE = 200
export const MAX_ENHANCE_LEVEL = 15
export const MAX_PET_COUNT = 3
export const MAX_PET_LEVEL = 999
export const MAX_SKILL_POINTS = 999
export const MAX_LOG_ENTRIES = 10

// ============================================================
// 战斗常量
// ============================================================
export const BOSS_STAGE_INTERVAL = 10 // 每10关一个Boss
export const MAX_BATTLE_ROUNDS = 100 // 单场战斗最大回合数
export const OFFLINE_BATTLES_PER_MINUTE = 2
export const ONLINE_BATTLES_PER_MINUTE = 4
export const MAX_OFFLINE_MINUTES = 720 // 12小时离线上限
export const MAX_RUSH_COUNT = 100

// 战斗公式常量
export const ARMOR_REDUCTION_DENOMINATOR = 50 // 护甲减免分母
export const ARMOR_REDUCTION_PER_LEVEL = 5 // 每级怪物增加的护甲分母
export const BASE_CRIT_MULTIPLIER = 1.5 // 基础暴击倍率
export const BASE_CRIT_RATE = 5 // 基础暴击率(%)
export const BASE_CRIT_DMG = 0.5 // 基础暴击额外伤害

// 连杀奖励阈值
export const STREAK_CRIT_THRESHOLD = 50 // 连杀50开始加暴击
export const STREAK_BUFF_THRESHOLD = 100 // 连杀100开始加伤害/金币
export const STREAK_CRIT_PER = 50 // 每50连杀加1%暴击
export const STREAK_DMG_PER = 100 // 每100连杀加5%伤害
export const STREAK_GOLD_PER = 100 // 每100连杀加5%金币
export const STREAK_EXP_PER = 100 // 每100连杀加5%经验

// ============================================================
// 成长常量
// ============================================================
export const EXP_BASE = 100
export const EXP_GROWTH_RATE = 1.2
export const LEVELUP_STAT_MIN = 1
export const LEVELUP_STAT_MAX = 3
export const LEVELUP_HP_BONUS = 10
export const LEVELUP_MP_BONUS = 5
export const LEVELUP_HP_PER_VIT = 2
export const LEVELUP_MP_PER_INT = 2
export const SKILL_POINT_EVERY = 5 // 每5级获得技能点

// 属性成长公式
export const DAMAGE_PER_STR = 2
export const DAMAGE_PER_LEVEL = 3
export const ARMOR_PER_VIT = 1
export const ARMOR_PER_LEVEL = 1
export const HP_PER_VIT = 10
export const MP_PER_INT = 5

// ============================================================
// 装备生成常量
// ============================================================
export const ITEM_LEVEL_VARIANCE = 2 // 装备等级相对层数的浮动范围
export const ITEM_STAT_PER_LEVEL = 5 // 每5级增加的属性值
export const ITEM_BASE_SCALING = 0.1 // 装备基础属性每级增长10%

// 品质权重基础值
export const QUALITY_WEIGHT_COMMON = 50
export const QUALITY_WEIGHT_MAGIC = 40
export const QUALITY_WEIGHT_RARE = 5
export const QUALITY_WEIGHT_EPIC = 1
export const QUALITY_WEIGHT_LEGEND = 0
export const QUALITY_WEIGHT_MYTHIC = 0

// 在线奖励品质偏移
export const ONLINE_QUALITY_SHIFT = true

// 神话装备特殊设定
export const MYTHIC_SOCKETS = 6
export const MYTHIC_SETS = ['龙王', '神谕', '虚空']

// ============================================================
// 强化常量
// ============================================================
export const ENHANCE_SUCCESS_BASE = 100 // 基础成功率
export const ENHANCE_SUCCESS_DECAY = 7 // 每级降低7%
export const ENHANCE_SUCCESS_MIN = 5 // 最低成功率
export const ENHANCE_STAT_BOOST = 1.1 // 每次强化属性*1.1
export const ENHANCE_GOLD_BASE = 100 // 强化基础金币
export const ENHANCE_GOLD_MULTIPLIER = 2 // 每级金币翻倍
export const ENHANCE_DEGRADE_THRESHOLD = 5 // +5以上失败降级
export const ENHANCE_REFUND_RATE = 0.5 // 继承时返还50%强化石

// ============================================================
// 宠物常量
// ============================================================
export const WILD_PET_CHANCE = 0.15 // 15%遭遇概率
export const WILD_PET_TURN_LIMIT = 5 // 捕捉回合限制
export const PET_BASE_GROWTH = 2
export const PET_BASE_DMG = 3
export const PET_UPGRADE_COST_BASE = 100
export const PET_UPGRADE_COST_MULTIPLIER = 1.5
export const PET_FUSE_COST_PER_LEVEL = 500
export const PET_EXP_PER_LEVEL = 200
export const PET_FUSE_EXP_RATE = 0.5
export const PET_PASSIVE_INHERIT_CHANCE = 0.3
export const PET_PASSIVE_INHERIT_TIER_BONUS = 0.1
export const PET_MAX_PASSIVES = 3

// 宠物 tiers 解锁层数
export const PET_TIER_UNLOCK = {
  1: 1,
  2: 50,
  3: 100,
  4: 200,
  5: 300,
}

// ============================================================
// 经济常量
// ============================================================
export const DEATH_GOLD_LOSS = 0.1 // 死亡损失10%金币
export const DEATH_HP_RECOVERY = 0.5 // 死亡后恢复50%HP
export const DEATH_EXP_PENALTY_THRESHOLD = 100 // 连杀100以上死亡扣经验
export const DEATH_EXP_PENALTY_RATE = 0.05 // 死亡扣5%经验
export const STAGE_REGRESS_ON_DEATH = 2 // 死亡后退2关

// 商店
export const SHOP_POTION_HEAL_S = 200
export const SHOP_POTION_HEAL_M = 600
export const SHOP_POTION_HEAL_L = 1500

// 怪物属性成长
export const MONSTER_HP_GROWTH = 0.15
export const MONSTER_DMG_GROWTH = 0.12
export const MONSTER_EXP_GROWTH = 0.12
export const MONSTER_GOLD_GROWTH = 0.10

// Boss 乘数
export const BOSS_HP_MULT = 0.18
export const BOSS_DMG_MULT = 0.15
export const BOSS_EXP_MULT = 0.20
export const BOSS_GOLD_MULT = 0.15

// ============================================================
// 挂机恢复常量
// ============================================================
export const OFFLINE_HEAL_PER_MINUTE = 0.15 // 离线每分钟恢复15%HP
export const ONLINE_HEAL_PER_MINUTE = 0.25 // 在线每分钟恢复25%HP
export const OFFLINE_HEAL_THRESHOLD = 0.5 // 低于50%HP开始恢复
export const ONLINE_HEAL_THRESHOLD = 0.5
export const OFFLINE_MIN_REST_RATIO = 0.5 // 最多用50%时间恢复
export const ONLINE_MIN_REST_RATIO = 0.33
export const OFFLINE_CONTINUE_HP_THRESHOLD = 0.3 // 低于30%跳过战斗继续恢复
export const ONLINE_CONTINUE_HP_THRESHOLD = 0.2
export const OFFLINE_CONTINUE_HEAL = 0.1 // 跳过时恢复10%
export const ONLINE_CONTINUE_HEAL = 0.15

// ============================================================
// 在线奖励加成
// ============================================================
export const ONLINE_GOLD_BONUS = 0.30 // +30%金币
export const ONLINE_EXP_BONUS = 0.50 // +50%经验

// ============================================================
// 每日任务
// ============================================================
export const DAILY_QUEST_COUNT = 3
export const DAILY_QUEST_FLOOR_TRACKING = true
export const DAILY_QUEST_FLOOR_THRESHOLD = 10

// ============================================================
// 装备评分权重（用于优化配装）
// ============================================================
export const SET_BONUS_2P_SCORE = 3000
export const SET_BONUS_4P_SCORE = 8000
