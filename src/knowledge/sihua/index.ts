/* ============================================================
   四化飞星知识库
   来源：04-四化飞星/01-四化基础.md, 02-十干四化表.md
   ============================================================ */

export interface SihuaInfo {
  name: string
  nature: '吉' | '凶' | '中性'
  description: string
  effect: string
}

/* 簡體中文四化定義 */
export const SIHUA: Record<string, SihuaInfo> = {
  '化禄': {
    name: '化禄',
    nature: '吉',
    description: '禄主财禄、顺利、人缘。化禄入宫带来该宫事项的顺遂与财运。',
    effect: '增加财运、人缘、顺利度。所化之星的正面特质被放大。',
  },
  '化权': {
    name: '化权',
    nature: '吉',
    description: '权主权力、掌控、竞争。化权入宫增强该宫的主导性与竞争力。',
    effect: '增加权力、掌控力、竞争力。所化之星更具主导性和影响力。',
  },
  '化科': {
    name: '化科',
    nature: '吉',
    description: '科主名声、贵人、文才。化科入宫带来名誉与贵人助力。',
    effect: '增加名声、贵人运、文才。所化之星更具声望和学术气质。',
  },
  '化忌': {
    name: '化忌',
    nature: '凶',
    description: '忌主执着、阻碍、是非。化忌入宫带来该宫事项的困扰与阻碍。',
    effect: '带来执着、阻碍、损耗。所化之星的负面特质被强化，需特别关注。',
  },
}

/* 繁體中文四化定義 */
export const SIHUA_TRADITIONAL: Record<string, SihuaInfo> = {
  '化祿': {
    name: '化祿',
    nature: '吉',
    description: '祿主財祿、順利、人緣。化祿入宮帶來該宮事項的順遂與財運。',
    effect: '增加財運、人緣、順利度。所化之星的正面特質被放大。',
  },
  '化權': {
    name: '化權',
    nature: '吉',
    description: '權主權力、掌控、競爭。化權入宮增強該宮的主導性與競爭力。',
    effect: '增加權力、掌控力、競爭力。所化之星更具主導性和影響力。',
  },
  '化科': {
    name: '化科',
    nature: '吉',
    description: '科主名聲、貴人、文才。化科入宮帶來名譽與貴人助力。',
    effect: '增加名聲、貴人運、文才。所化之星更具聲望和學術氣質。',
  },
  '化忌': {
    name: '化忌',
    nature: '凶',
    description: '忌主執著、阻礙、是非。化忌入宮帶來該宮事項的困擾與阻礙。',
    effect: '帶來執著、阻礙、損耗。所化之星的負面特質被強化，需特別關注。',
  },
}

/* 簡體中文十干四化表 */
export const SIHUA_BY_GAN: Record<string, Record<string, string>> = {
  '甲': { '化禄': '廉贞', '化权': '破军', '化科': '武曲', '化忌': '太阳' },
  '乙': { '化禄': '天机', '化权': '天梁', '化科': '紫微', '化忌': '太阴' },
  '丙': { '化禄': '天同', '化权': '天机', '化科': '文昌', '化忌': '廉贞' },
  '丁': { '化禄': '太阴', '化权': '天同', '化科': '天机', '化忌': '巨门' },
  '戊': { '化禄': '贪狼', '化权': '太阴', '化科': '右弼', '化忌': '天机' },
  '己': { '化禄': '武曲', '化权': '贪狼', '化科': '天梁', '化忌': '文曲' },
  '庚': { '化禄': '太阳', '化权': '武曲', '化科': '太阴', '化忌': '天同' },
  '辛': { '化禄': '巨门', '化权': '太阳', '化科': '文曲', '化忌': '文昌' },
  '壬': { '化禄': '天梁', '化权': '紫微', '化科': '左辅', '化忌': '武曲' },
  '癸': { '化禄': '破军', '化权': '巨门', '化科': '太阴', '化忌': '贪狼' },
}

/* 繁體中文十干四化表 */
export const SIHUA_BY_GAN_TRADITIONAL: Record<string, Record<string, string>> = {
  '甲': { '化祿': '廉貞', '化權': '破軍', '化科': '武曲', '化忌': '太陽' },
  '乙': { '化祿': '天機', '化權': '天梁', '化科': '紫微', '化忌': '太陰' },
  '丙': { '化祿': '天同', '化權': '天機', '化科': '文昌', '化忌': '廉貞' },
  '丁': { '化祿': '太陰', '化權': '天同', '化科': '天機', '化忌': '巨門' },
  '戊': { '化祿': '貪狼', '化權': '太陰', '化科': '右弼', '化忌': '天機' },
  '己': { '化祿': '武曲', '化權': '貪狼', '化科': '天梁', '化忌': '文曲' },
  '庚': { '化祿': '太陽', '化權': '武曲', '化科': '太陰', '化忌': '天同' },
  '辛': { '化祿': '巨門', '化權': '太陽', '化科': '文曲', '化忌': '文昌' },
  '壬': { '化祿': '天梁', '化權': '紫微', '化科': '左輔', '化忌': '武曲' },
  '癸': { '化祿': '破軍', '化權': '巨門', '化科': '太陰', '化忌': '貪狼' },
}

/* ------------------------------------------------------------
   获取四化信息
   ------------------------------------------------------------ */

export function getSihuaInfo(sihuaName: string): SihuaInfo | undefined {
  return SIHUA[sihuaName] || SIHUA_TRADITIONAL[sihuaName]
}

export function getSihuaByGan(gan: string): Record<string, string> | undefined {
  return SIHUA_BY_GAN[gan] || SIHUA_BY_GAN_TRADITIONAL[gan]
}

/* 獲取指定語言的四化表 */
export function getSihuaByGanByLanguage(gan: string, isTraditional: boolean = false): Record<string, string> | undefined {
  return isTraditional ? SIHUA_BY_GAN_TRADITIONAL[gan] : SIHUA_BY_GAN[gan]
}

/* 獲取指定語言的四化信息 */
export function getSihuaInfoByLanguage(sihuaName: string, isTraditional: boolean = false): SihuaInfo | undefined {
  return isTraditional ? SIHUA_TRADITIONAL[sihuaName] : SIHUA[sihuaName]
}

/* ------------------------------------------------------------
   解析星曜的四化
   ------------------------------------------------------------ */

export function parseMutagen(starWithMutagen: string): { star: string; mutagen: string | null } {
  const match = starWithMutagen.match(/(.+?)(化[禄权科忌])$/)
  if (match) {
    return { star: match[1], mutagen: match[2] }
  }
  // 繁體版本
  const matchTraditional = starWithMutagen.match(/(.+?)(化[祿權科忌])$/)
  if (matchTraditional) {
    return { star: matchTraditional[1], mutagen: matchTraditional[2] }
  }
  return { star: starWithMutagen, mutagen: null }
}
