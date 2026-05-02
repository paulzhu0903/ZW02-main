/* ============================================================
   亮度定義集中管理
   ============================================================ */

/**
 * 亮度等級：廟/庙(最吉) → 旺 → 得 → 利 → 平 → 不 → 陷(最凶)
 */

/**
 * 亮度名稱映射（中文 → 英文參數名）
 * 支持繁體和簡體
 */
export const BRIGHTNESS_MAP: Record<string, string> = {
  '廟': 'temple', '庙': 'temple',
  '旺': 'wang',
  '得': 'de',
  '利': 'li',
  '平': 'ping',
  '不': 'bu',
  '陷': 'xian',
}

/**
 * 亮度系數（用於運勢評分計算）
 * 支持繁體和簡體
 */
export const BRIGHTNESS_COEF: Record<string, number> = {
  '廟': 1.5, '庙': 1.5,
  '旺': 1.3,
  '得': 1.1,
  '利': 1.0,
  '平': 0.9,
  '不': 0.7,
  '陷': 0.5,
}

/**
 * 輔星標準亮度定義（iztro 未提供時補充）
 * 根據文墨天機標準
 * 支持繁體和簡體、以及各種別名
 * 
 * 说明：
 * - 主星的亮度已由 iztro 按地支提供，无需在此定义
 * - 此表仅用于 iztro 未提供亮度的辅星和次要星曜
 */
export const MINOR_STAR_STANDARD_BRIGHTNESS: Record<string, string> = {
  // 祿存（繁簡體）
  '祿存': '廟',
  '禄存': '庙',
  // 左輔（繁簡體）
  '左輔': '廟',
  '左辅': '庙',
  // 右弼（只有這一個寫法）
  '右弼': '廟',
  // 天魁（繁簡體 + 別名）
  '天魁': '廟',
  '天奎': '廟',
  // 天鉞（繁簡體 + 別名）- 文墨天機標準
  '天鉞': '旺',
  '天钺': '旺',
  // 天馬（繁簡體）- 文墨天機標準
  '天馬': '旺',
  '天马': '旺',
  // 地劫 - 文墨天機標準
  '地劫': '廟',
  // 地空
  '地空': '陷',
}

/**
 * 亮度樣式映射（UI 顯示用）
 * 支持簡體
 */
export const BRIGHTNESS_STYLE: Record<string, string> = {
  '廟': 'text-fortune',
  '庙': 'text-fortune',
  '旺': 'text-gold',
  '得': 'text-star-light',
  '利': 'text-star-light',
  '平': 'text-text-muted',
  '不': 'text-misfortune/70',
  '陷': 'text-misfortune',
}

/**
 * 根據星名獲取標準亮度
 * @param starName 星名（支持繁簡體）
 * @returns 亮度值（廟/庙 或 陷 等）
 */
export function getStandardBrightness(starName: string): string | undefined {
  return MINOR_STAR_STANDARD_BRIGHTNESS[starName]
}

/**
 * 根據亮度值獲取系數
 * @param brightness 亮度值（支持繁簡體）
 * @returns 系數值（1.5, 1.3 等）
 */
export function getBrightnessCoef(brightness: string | undefined): number {
  if (!brightness) return 0.9 // 默認為「平」
  return BRIGHTNESS_COEF[brightness] || 1.0
}
