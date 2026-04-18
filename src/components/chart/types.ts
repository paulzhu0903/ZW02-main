/* ============================================================
   命盤可視化組件 - 類型定義與常數
   ============================================================ */

/* ============================================================
   星曜數據類型
   ============================================================ */

export interface StarData {
  name: string
  brightness?: string
  mutagen?: string
  isSelfMutagen?: boolean  // 離心自化（本宮自化）
  isCounterMutagen?: boolean  // 向心自化（對宮化入）
  mutagenCategory?: 'birth' | 'decadal' | 'annual'  // 四化類別：生年 | 大限 | 流年
  palaceStem?: string  // 宮位天干（用於判斷該星是否屬於該天干的四化）
}

export interface PalaceData {
  name: string
  stem: string
  branch: string
  majorStars: StarData[]
  minorStars: StarData[]
  adjectiveStars: string[]  // 杂曜
  decadal: { range: [number, number] }
  boshi12Deity: string
  longlifeDeity: string
  isLife: boolean
  isBody: boolean
  isCausePalace: boolean
}

/* ============================================================
   四化飛行線定義
   ============================================================ */

export interface MutagenLine {
  fromPalace: string
  toPalace: string
  type: '禄' | '权' | '科' | '忌'
  color: string
  markerColor: string
  isCounterMutagen?: boolean  // 向心自化：对宮化入本宮（盤中間）
  label?: string  // A/B/C/D標籤
  isSelfCentrifugal?: boolean  // 本宮自轉
  starName?: string  // star耀名称（用于查找DOM）
  palaceRow?: number  // palace行位置
  palaceCol?: number  // palace列位置
}

/* ============================================================
   UI 組件 Props
   ============================================================ */

export interface StarTagProps {
  star: StarData
  showBrightness?: boolean
  isMajorStar?: boolean
  forceTextColorClass?: string
  chartType?: 'flying' | 'trireme' | 'transformation'
  selectedDecadal?: number | null
  selectedAnnual?: number | null
  isCurrentDecadalPalace?: boolean
  isCurrentAnnualPalace?: boolean
  decadalLifePalaceStem?: string | null
  annualLifePalaceStem?: string | null
}

export interface PalaceCardProps extends PalaceData {
  isSelected?: boolean
  onClick?: () => void
  chartType?: 'flying' | 'trireme' | 'transformation'
  selectedDecadal?: number | null
  selectedAnnual?: number | null
  monthlySequenceLabels?: string[]
  selectedAnnualAge?: number | null
  selectedAnnualGanZhi?: string | null
  selectedAnnualLabel?: string
  selectedDecadalLabel?: string
  yearGan?: string
  gender?: 'male' | 'female'
  birthInfo?: any
  palaceData?: PalaceData[] | null
  decadalLifePalaceStem?: string | null
  annualLifePalaceStem?: string | null
}

export interface DecadalAnnualMonthlyTableProps {
  palaceData: PalaceData[]
  birthInfo: any
  selectedDecadal?: number | null
  setSelectedDecadal?: (index: number | null) => void
  selectedAnnual?: number | null
  setSelectedAnnual?: (index: number | null) => void
  selectedMonthly?: number | null
  setSelectedMonthly?: (index: number | null) => void
  isExpanded?: boolean
}

/* ============================================================
   十二宫位置映射
   ============================================================ */

export const PALACE_POSITIONS: Record<string, { row: number; col: number }> = {
  '巳': { row: 0, col: 0 }, '午': { row: 0, col: 1 },
  '未': { row: 0, col: 2 }, '申': { row: 0, col: 3 },
  '辰': { row: 1, col: 0 }, '酉': { row: 1, col: 3 },
  '卯': { row: 2, col: 0 }, '戌': { row: 2, col: 3 },
  '寅': { row: 3, col: 0 }, '丑': { row: 3, col: 1 },
  '子': { row: 3, col: 2 }, '亥': { row: 3, col: 3 },
}

/* ============================================================
   宫位顺序索引映射（用于大限计算）
   ============================================================ */

export const PALACE_BRANCH_INDEX: Record<string, number> = {
  '寅': 0,   // 命宫
  '卯': 1,   // 父母宫
  '辰': 2,   // 福德宫
  '巳': 3,   // 田宅宫
  '午': 4,   // 官禄宫
  '未': 5,   // 交友宫
  '申': 6,   // 迁移宫
  '酉': 7,   // 疾厄宫
  '戌': 8,   // 财帛宫
  '亥': 9,   // 子女宫
  '子': 10,  // 夫妻宫
  '丑': 11,  // 兄弟宫
}

/* ============================================================
   對宮對應表
   ============================================================ */

export const OPPOSITE_PALACE: Record<string, string> = {
  '巳': '亥', '午': '子', '未': '丑', '申': '寅',
  '辰': '戌', '酉': '卯',
  '卯': '酉', '戌': '辰',
  '寅': '申', '丑': '未', '子': '午', '亥': '巳',
}

/* ============================================================
   納音五行表（六十甲子）
   ============================================================ */

export const NAYIN_TABLE: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '劍鋒金', '癸酉': '劍鋒金', '甲戌': '山頭火', '乙亥': '山頭火',
  '丙子': '澗下水', '丁丑': '澗下水', '戊寅': '城頭土', '己卯': '城頭土',
  '庚辰': '白蜡金', '辛巳': '白蜡金', '壬午': '杨柳木', '癸未': '杨柳木',
  '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹靂火', '己丑': '霹靂火', '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '長流水', '癸巳': '長流水', '甲午': '砂中金', '乙未': '砂中金',
  '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆灯火', '乙巳': '覆灯火', '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土', '庚戌': '釵釧金', '辛亥': '釵釧金',
  '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土', '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水',
}

/* ============================================================
   四化顏色對應
   ============================================================ */

// 支持簡體、繁體和完整格式：'禄'、'化禄'、'祿'、'化祿'
export const MUTAGEN_COLORS: Record<string, { color: string; marker: string }> = {
  '禄': { color: '#34C759', marker: 'arrowFortune' },      // 綠色（簡體短）
  '权': { color: '#AF52DE', marker: 'arrowGold' },         // 紫色（簡體短）
  '科': { color: '#007AFF', marker: 'arrowStar' },         // 藍色（簡體短）
  '忌': { color: '#FF3B30', marker: 'arrowMisfortune' },   // 紅色（簡體短）
  '化禄': { color: '#34C759', marker: 'arrowFortune' },    // 綠色（簡體長）
  '化权': { color: '#AF52DE', marker: 'arrowGold' },       // 紫色（簡體長）
  '化科': { color: '#007AFF', marker: 'arrowStar' },       // 藍色（簡體長）
  '化忌': { color: '#FF3B30', marker: 'arrowMisfortune' }, // 紅色（簡體長）
  '祿': { color: '#34C759', marker: 'arrowFortune' },      // 綠色（繁體短）
  '權': { color: '#AF52DE', marker: 'arrowGold' },         // 紫色（繁體短）
  '化祿': { color: '#34C759', marker: 'arrowFortune' },    // 綠色（繁體長）
  '化權': { color: '#AF52DE', marker: 'arrowGold' },       // 紫色（繁體長）
}

/* ============================================================
   亮度映射
   ============================================================ */

export const BRIGHTNESS_MAP: Record<string, string> = {
  '庙': '庙', '旺': '旺', '得': '得', '利': '利',
  '平': '平', '不': '不', '陷': '陷',
}

export const BRIGHTNESS_STYLE: Record<string, string> = {
  '庙': 'text-fortune',
  '旺': 'text-gold',
  '得': 'text-star-light',
  '利': 'text-star-light',
  '平': 'text-text-muted',
  '不': 'text-misfortune/70',
  '陷': 'text-misfortune',
}

/* ============================================================
   主星列表
   ============================================================ */

/* 14个主星列表 */
export const MAJOR_STARS_LIST = [
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府',
  '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
]

// 简体版本
export const MAJOR_STARS_LIST_SIMPLIFIED = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府',
  '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
]

/* ============================================================
   宮位對應表
   ============================================================ */

// 12宫位排列顺序（按命宫开始的顺序）
export const PALACE_ORDER = [
  'life', 'parents', 'virtue', 'property', 'career', 'servants',
  'travel', 'health', 'wealth', 'children', 'spouse', 'siblings'
]

// 宫位名称映射表（英文参数名 → 中文名）
export const PALACE_NAME_MAP_ZH: Record<string, string> = {
  'life': '命宫', 'parents': '父母宫', 'virtue': '福德宫', 'property': '田宅宫',
  'career': '官禄宫', 'spouse': '夫妻宫', 'children': '子女宫', 'wealth': '财帛宫',
  'health': '疾厄宫', 'travel': '迁移宫', 'servants': '交友宫', 'siblings': '兄弟宫'
}

/* ============================================================
   四化標籤映射
   ============================================================ */

export const MUTAGEN_LABEL_MAP: Record<string, string> = {
  '禄': 'A', '祿': 'A',
  '权': 'B', '權': 'B',
  '科': 'C',
  '忌': 'D'
}

/* ============================================================
   來因宮計算表（五虎遁訣）
   ============================================================ */

export const CAUSE_PALACE_MAP: Record<string, string> = {
  '甲': '戌', '乙': '酉', '丙': '申', '丁': '未',
  '戊': '午', '己': '巳', '庚': '辰', '辛': '卯',
  '壬': '寅', '癸': '亥'
}

/* ============================================================
   大限宮位對應表
   ============================================================ */

export const DECADAL_PALACE_MAP: Record<string, string> = {
  'life': '大命',
  'siblings': '大兄',
  'spouse': '大夫',
  'children': '大子',
  'wealth': '大財',
  'health': '大疾',
  'travel': '大遷',
  'servants': '大友',
  'career': '大官',
  'property': '大田',
  'virtue': '大福',
  'parents': '大父',
}

/* ============================================================
   年宮位名稱映射（英文參數名 → "年"前缀中文名）
   ============================================================ */

export const ANNUAL_PALACE_MAP: Record<string, string> = {
  'life': '年命',
  'siblings': '年兄',
  'spouse': '年夫',
  'children': '年子',
  'wealth': '年財',
  'health': '年疾',
  'travel': '年遷',
  'servants': '年友',
  'career': '年官',
  'property': '年田',
  'virtue': '年福',
  'parents': '年父',
}

/* ============================================================
   宮位名稱映射（中文名 → 英文參數名）
   ============================================================ */

export const PALACE_NAME_TO_ENGLISH_MAP: Record<string, string> = {
  // 完整名称变体
  '命宫': 'life', '命宮': 'life',
  '父母宫': 'parents', '父母宮': 'parents', '父母': 'parents',
  '福德宫': 'virtue', '福德宮': 'virtue', '福德': 'virtue',
  '田宅宫': 'property', '田宅宮': 'property', '田宅': 'property',
  '官禄宫': 'career', '官祿宫': 'career', '官禄宮': 'career', '官祿宮': 'career', '官禄': 'career', '官祿': 'career',
  '夫妻宫': 'spouse', '夫妻宮': 'spouse', '夫妻': 'spouse',
  '子女宫': 'children', '子女宮': 'children', '子女': 'children',
  '财帛宫': 'wealth', '財帛宫': 'wealth', '财帛宮': 'wealth', '財帛宮': 'wealth', '财帛': 'wealth', '財帛': 'wealth',
  '疾厄宫': 'health', '疾厄宮': 'health', '疾厄': 'health',
  '迁移宫': 'travel', '遷移宫': 'travel', '迁移宮': 'travel', '遷移宮': 'travel', '迁移': 'travel', '遷移': 'travel',
  '交友宫': 'servants', '交友宮': 'servants', '交友': 'servants',
  '奴仆宫': 'servants', '奴僕宫': 'servants', '奴仆宮': 'servants', '奴僕宮': 'servants', '奴仆': 'servants', '奴僕': 'servants',
  '仆役宫': 'servants', '僕役宫': 'servants', '仆役宮': 'servants', '僕役宮': 'servants', '仆役': 'servants', '僕役': 'servants',
  '兄弟宫': 'siblings', '兄弟宮': 'siblings', '兄弟': 'siblings',
}

/* ============================================================
   簡體四化字符到繁體轉換
   ============================================================ */

export const MUTAGEN_SIMPLIFIED_TO_TRADITIONAL: Record<string, string> = {
  '禄': '祿', '权': '權', '科': '科', '忌': '忌',
  '化禄': '化祿', '化权': '化權', '化科': '化科', '化忌': '化忌',
}

/* ============================================================
   四化盤面類型
   ============================================================ */

export type ChartType = 'flying' | 'trireme' | 'transformation'

export type MutagenDisplayState = {
  A: boolean
  B: boolean
  C: boolean
  D: boolean
}
