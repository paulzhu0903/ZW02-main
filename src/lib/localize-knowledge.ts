const SIMPLIFIED_TO_TRADITIONAL_PHRASES: Array<[string, string]> = [
    ['宫位', '宮位'],
    ['命盘', '命盤'],
    ['对宫', '對宮'],
    ['关系', '關係'],
    ['事业', '事業'],
    ['财富', '財富'],
    ['财运', '財運'],
    ['收入', '收入'],
    ['赚钱', '賺錢'],
    ['赚钱能力', '賺錢能力'],
    ['理财', '理財'],
    ['财库', '財庫'],
    ['房产', '房產'],
    ['不动产', '不動產'],
    ['迁移', '遷移'],
    ['社交', '社交'],
    ['工作', '工作'],
    ['职业', '職業'],
    ['地位', '地位'],
    ['长辈', '長輩'],
    ['学业', '學業'],
    ['晚辈', '晚輩'],
    ['状况', '狀況'],
    ['倾向', '傾向'],
    ['总结', '總結'],
    ['总体', '總體'],
    ['总体格局', '總體格局'],
    ['系统', '系統'],
    ['气质', '氣質'],
    ['领导', '領導'],
    ['权威', '權威'],
    ['权力', '權力'],
    ['复杂', '複雜'],
    ['感情', '感情'],
    ['贵人', '貴人'],
    ['动', '動'],
    ['说', '說'],
]

const SIMPLIFIED_TO_TRADITIONAL_CHARS: Record<string, string> = {
    '宫': '宮',
    '体': '體',
    '总': '總',
    '为': '為',
    '关': '關',
    '业': '業',
    '财': '財',
    '运': '運',
    '赚': '賺',
    '钱': '錢',
    '产': '產',
    '动': '動',
    '迁': '遷',
    '职': '職',
    '长': '長',
    '学': '學',
    '晚': '晚',
    '况': '況',
    '倾': '傾',
    '势': '勢',
    '气': '氣',
    '领': '領',
    '导': '導',
    '权': '權',
    '复': '複',
    '贵': '貴',
    '时': '時',
    '门': '門',
    '贞': '貞',
    '禄': '祿',
    '庙': '廟',
    '马': '馬',
    '龙': '龍',
    '凤': '鳳',
    '阴': '陰',
}

const TRADITIONAL_TO_SIMPLIFIED_PHRASES: Array<[string, string]> = SIMPLIFIED_TO_TRADITIONAL_PHRASES
  .map(([from, to]): [string, string] => [to, from])
  // longer phrases first to avoid partial replacement conflicts
  .sort((a, b) => b[0].length - a[0].length)

const TRADITIONAL_TO_SIMPLIFIED_CHARS: Record<string, string> = Object.fromEntries(
  Object.entries(SIMPLIFIED_TO_TRADITIONAL_CHARS).map(([from, to]) => [to, from])
)

function applyPhraseAndCharMap(
  text: string,
  phrases: Array<[string, string]>,
  charMap: Record<string, string>
): string {
  let output = text
  for (const [from, to] of phrases) {
    output = output.replaceAll(from, to)
  }

  const charPattern = new RegExp(`[${Object.keys(charMap).join('')}]`, 'g')
  return output.replace(charPattern, (ch) => charMap[ch] || ch)
}

export function toTraditionalChinese(text: string): string {
  return applyPhraseAndCharMap(text, SIMPLIFIED_TO_TRADITIONAL_PHRASES, SIMPLIFIED_TO_TRADITIONAL_CHARS)
}

export function toSimplifiedChinese(text: string): string {
  return applyPhraseAndCharMap(text, TRADITIONAL_TO_SIMPLIFIED_PHRASES, TRADITIONAL_TO_SIMPLIFIED_CHARS)
}

export function localizeChineseText(text: string, language: 'zh-CN' | 'zh-TW'): string {
  return language === 'zh-TW' ? toTraditionalChinese(text) : toSimplifiedChinese(text)
}

export function getChineseVariantCandidates(text: string): string[] {
  const raw = String(text || '')
  const variants = new Set<string>()
  variants.add(raw)
  variants.add(toTraditionalChinese(raw))
  variants.add(toSimplifiedChinese(raw))
  return Array.from(variants).filter(Boolean)
}

export function localizeKnowledgeText(text: string, isTW: boolean): string {
  if (!isTW) return text
  return toTraditionalChinese(text)
}