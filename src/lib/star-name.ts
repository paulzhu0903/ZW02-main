import { getChineseVariantCandidates } from '@/lib/localize-knowledge'

const STAR_SIMPLIFIED_TO_TRADITIONAL: Record<string, string> = {
  '廉贞': '廉貞', '破军': '破軍', '太阳': '太陽', '天机': '天機',
  '太阴': '太陰', '贪狼': '貪狼', '巨门': '巨門', '七杀': '七殺',
  '左辅': '左輔', '龙池': '龍池', '凤阁': '鳳閣', '华盖': '華蓋',
  '阴煞': '陰煞', '封诰': '封誥', '天贵': '天貴', '天寿': '天壽',
  '天伤': '天傷', '龙德': '龍德', '天钺': '天鑰', '天虚': '天虛',
  '陀罗': '陀羅', '铃星': '鈴星', '禄存': '祿存', '红鸾': '紅鸞',
  '天马': '天馬',
}

const STAR_NAME_TO_ENGLISH_PARAM: Record<string, string> = {
  // 14 主星
  '紫微': 'ziwei',
  '天機': 'tianji', '天机': 'tianji',
  '太陽': 'taiyang', '太阳': 'taiyang',
  '武曲': 'wuqu',
  '天同': 'tiantong',
  '廉貞': 'lianzhen', '廉贞': 'lianzhen',
  '天府': 'tianfu',
  '太陰': 'taiyin', '太阴': 'taiyin',
  '貪狼': 'tanlang', '贪狼': 'tanlang',
  '巨門': 'jumen', '巨门': 'jumen',
  '天相': 'tianxiang',
  '天梁': 'tiangliang',
  '七殺': 'qisha', '七杀': 'qisha',
  '破軍': 'pojun', '破军': 'pojun',

  // 關鍵輔星
  '左輔': 'zuofu', '左辅': 'zuofu',
  '右弼': 'youbi',
  '文昌': 'wenchang',
  '文曲': 'wenqu',

  // 其餘常見
  '擎羊': 'qingyang',
  '陀羅': 'tuoluo', '陀罗': 'tuoluo',
  '火星': 'huoxing',
  '鈴星': 'lingxing', '铃星': 'lingxing',
  '地空': 'dikong',
  '地劫': 'dijie',
  '祿存': 'lucun', '禄存': 'lucun',
  '天馬': 'tianma', '天马': 'tianma',
  '紅鸞': 'hongluan', '红鸾': 'hongluan',
  '天喜': 'tianxi',
  '天刑': 'tianxing',
  '天姚': 'tianyao',
  '天哭': 'tiankue',
  '天虛': 'tianxu', '天虚': 'tianxu',
  '龍池': 'longchi', '龙池': 'longchi',
  '鳳閣': 'fengge', '凤阁': 'fengge',
  '華蓋': 'huagai', '华盖': 'huagai',
  '咸池': 'xianchi',
  '天德': 'tiande',
  '月德': 'yuede',
  '天官': 'tianguan',
  '天福': 'tianfu2',
  '解神': 'jieshen',
  '天巫': 'tianwu',
  '天月': 'tianyue',
  '陰煞': 'yinsha', '阴煞': 'yinsha',
  '台輔': 'taifu',
  '封誥': 'fenggao', '封诰': 'fenggao',
  '三台': 'santai',
  '八座': 'bazuo',
  '恩光': 'enguang',
  '天貴': 'tiangui', '天贵': 'tiangui',
  '天壽': 'tianshou', '天寿': 'tianshou',
  '天傷': 'tianshang', '天伤': 'tianshang',
  '龍德': 'longde', '龙德': 'longde',
  '天鑰': 'youyue', '天钺': 'youyue',
  '天魁': 'tiankui',
}

export function stripMutagenSuffix(name: string): string {
  return String(name || '').replace(/化[祿禄權权科忌]/g, '').trim()
}

export function normalizeStarName(name: string): string {
  const baseName = stripMutagenSuffix(name)
  return STAR_SIMPLIFIED_TO_TRADITIONAL[baseName] || baseName
}

export function getStarEnglishParam(name: string): string | undefined {
  const normalized = normalizeStarName(name)
  const candidates = getChineseVariantCandidates(normalized)

  for (const candidate of [name, normalized, ...candidates]) {
    const english = STAR_NAME_TO_ENGLISH_PARAM[candidate]
    if (english) return english
  }

  return undefined
}

export function getStarLookupKey(name: string): string {
  return getStarEnglishParam(name) || normalizeStarName(name)
}