/* ============================================================
   四化飛行線邏輯
   ============================================================ */

import { SIHUA_BY_GAN } from '@/knowledge/sihua'
import { 
  type MutagenLine, 
  type PalaceData, 
  PALACE_POSITIONS, 
  OPPOSITE_PALACE, 
  MUTAGEN_COLORS,
  MUTAGEN_LABEL_MAP,
  STAR_NAME_MAP,
  MUTAGEN_SIMPLIFIED_TO_TRADITIONAL,
  NAYIN_TABLE
} from './types'

/* ============================================================
   輔助函數
   ============================================================ */

/**
 * 提取簡化版的四化類型（去掉「化」字）- 支持簡體和繁體
 */
export function getMutagenType(mutagen: string): string {
  if (mutagen.startsWith('化')) {
    return mutagen.substring(1)  // 去掉「化」字，留下簡體或繁體字符
  }
  return mutagen
}

/**
 * 獲取納音值
 */
export function getNayin(ganZhi: string): string {
  return NAYIN_TABLE[ganZhi] || ''
}

/**
 * 檢查是否為主星
 */
export function isMajorStarName(starName: string): boolean {
  const MAJOR_STARS_LIST = [
    '紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府',
    '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
  ]
  const MAJOR_STARS_LIST_SIMPLIFIED = [
    '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府',
    '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
  ]
  return MAJOR_STARS_LIST.includes(starName) || MAJOR_STARS_LIST_SIMPLIFIED.includes(starName)
}

/**
 * 根據年天干計算來因宮所在的地支（五虎遁訣）
 * 甲→戌、乙→酉、丙→申、丁→未、戊→午、己→巳、庚→辰、辛→卯、壬→寅、癸→亥
 */
export function getCausePalaceBranch(yearGan: string): string {
  const causePalaceMap: Record<string, string> = {
    '甲': '戌', '乙': '酉', '丙': '申', '丁': '未',
    '戊': '午', '己': '巳', '庚': '辰', '辛': '卯',
    '壬': '寅', '癸': '亥'
  }
  return causePalaceMap[yearGan] || ''
}

/* ============================================================
   宮位邊界計算
   ============================================================ */

/**
 * 計算宮位靠近中心盤面那一邊的中間點 - 使用中央區域邊界和固定百分比點
 */
export function getPalaceEdgePointTowardCenterWithDOM(palace: string, gridElement: HTMLElement | null): { x: number; y: number } | null {
  const pos = PALACE_POSITIONS[palace]
  if (!pos || !gridElement) return null

  // 直接從 DOM 中獲取中央區域的實際位置
  const centerElement = gridElement.querySelector('[data-centerinfo]') as HTMLElement
  let centerLeft: number, centerRight: number, centerTop: number, centerBottom: number
  
  if (centerElement) {
    // 找到中央信息區域的實際位置
    const centerRect = centerElement.getBoundingClientRect()
    const gridRect = gridElement.getBoundingClientRect()
    
    centerLeft = centerRect.left - gridRect.left
    centerRight = centerRect.right - gridRect.left
    centerTop = centerRect.top - gridRect.top
    centerBottom = centerRect.bottom - gridRect.top
  } else {
    // 降級：使用計算方式（動態讀取 gap）
    const gridRect = gridElement.getBoundingClientRect()
    const gridWidth = gridRect.width
    
    // 動態讀取 gap 值
    const gapSize = parseFloat(window.getComputedStyle(gridElement).gap) || 6
    const cellSize = (gridWidth - 3 * gapSize) / 4
    
    centerLeft = cellSize + gapSize
    centerRight = centerLeft + cellSize + gapSize + cellSize
    centerTop = cellSize + gapSize
    centerBottom = centerTop + cellSize + gapSize + cellSize
  }
  
  const col = pos.col
  const row = pos.row
  
  let x: number
  let y: number
  
  // 根據宮位所在的邊，使用百分比點進行定位
  if (row === 0) {
    // 上方邊界：巳(0%) → 午(25%) → 未(75%) → 申(100%)
    y = centerTop
    const percent = col / 3
    x = centerLeft + (centerRight - centerLeft) * percent
  } else if (row === 3) {
    // 下方邊界：寅(0%) → 丑(25%) → 子(75%) → 亥(100%)
    y = centerBottom
    const percent = (3 - col) / 3
    x = centerLeft + (centerRight - centerLeft) * (1 - percent)
  } else if (col === 0) {
    // 左方邊界：寅(100%) → 卯(75%) → 辰(25%) → 巳(0%)
    x = centerLeft
    const percent = (3 - row) / 3
    y = centerTop + (centerBottom - centerTop) * (1 - percent)
  } else if (col === 3) {
    // 右方邊界：申(0%) → 酉(25%) → 戌(75%) → 亥(100%)
    x = centerRight
    const percent = row / 3
    y = centerTop + (centerBottom - centerTop) * percent
  } else {
   
    return null
  }
  
  return { x, y }
}

/* ============================================================
   四化飛行線收集
   ============================================================ */

/**
 * 收集所有四化線（根據標準四化飛行表）
 * - 向心自化：本宮天干四化指向對宮
 * - 離心自化：本宮星耀根據天干四化生成
 */
export function collectMutagenLines(palaceData: PalaceData[]): MutagenLine[] {
  const lines: MutagenLine[] = []
  const processedCounterLines = new Set<string>()

  // 創建宮位Map以快速查詢
  const palaceMap = new Map<string, PalaceData>()
  palaceData.forEach(p => palaceMap.set(p.branch, p))

  // === 收集所有向心自化（本宮天干四化指向對宮） ===
  palaceData.forEach((palace) => {
    const oppositeBranch = OPPOSITE_PALACE[palace.branch]
    const oppositePalace = oppositeBranch ? palaceMap.get(oppositeBranch) : null

    if (!oppositePalace) return

    // 獲取本宮天干的四化表
    const sihuaMap = SIHUA_BY_GAN[palace.stem]
    if (!sihuaMap) {
      return
    }

    // 遍歷四化表中的每個四化類型
    Object.entries(sihuaMap).forEach(([mutagenKey, mutagenStar]) => {
      // 轉換簡體星名為繁體以匹配命盤數據
      const mutagenStarChinese = STAR_NAME_MAP[mutagenStar] || mutagenStar
      
      // 雙向匹配：檢查繁體名稱 AND 簡體名稱
      const inOppositePalace =
        oppositePalace.majorStars.some(s => s.name === mutagenStarChinese || s.name === mutagenStar) ||
        oppositePalace.minorStars.some(s => s.name === mutagenStarChinese || s.name === mutagenStar)
      
      if (inOppositePalace) {
        // 使用對宮天干+四化類型作為 key，避免重複
        const lineKey = `${palace.branch}->${oppositePalace.branch}-${mutagenKey}`
        if (!processedCounterLines.has(lineKey)) {
          processedCounterLines.add(lineKey)
          
          // 提取四化類型（去掉「化」字）以獲得顏色
          const mutagenType = getMutagenType(mutagenKey)
          
          // 按照化禄、化権、化科、化忌定義標籤 A、B、C、D
          const label = MUTAGEN_LABEL_MAP[mutagenType] || '?'
          
          const colorInfo = MUTAGEN_COLORS[mutagenType] || MUTAGEN_COLORS[mutagenKey]

          lines.push({
            fromPalace: palace.branch,
            toPalace: oppositePalace.branch,
            type: mutagenType as '禄' | '权' | '科' | '忌',
            color: colorInfo.color,
            markerColor: colorInfo.marker,
            isCounterMutagen: true,
            label,
          })
        }
      }
    })
  })

  // === 收集所有離心自化（本宮星耀根據天干四化生成） ===
  palaceData.forEach((palace) => {
    // 獲取本宮天干的四化表
    const sihuaMap = SIHUA_BY_GAN[palace.stem]
    if (!sihuaMap) {
      return
    }

    // 遍歷四化表中的每個四化類型
    Object.entries(sihuaMap).forEach(([mutagenKey, mutagenStar]) => {
      // 轉換簡體星名為繁體以匹配命盤數據
      const mutagenStarChinese = STAR_NAME_MAP[mutagenStar] || mutagenStar
      
      // 檢查本宮中是否有該四化星耀 - 同時檢查繁體和簡體
      const hasMutagenStarInThisPalace =
        palace.majorStars.some(s => s.name === mutagenStarChinese || s.name === mutagenStar) ||
        palace.minorStars.some(s => s.name === mutagenStarChinese || s.name === mutagenStar)

      if (hasMutagenStarInThisPalace) {
        // 提取四化類型（去掉「化」字）以獲得顏色
        const mutagenType = getMutagenType(mutagenKey)
        
        // 按照化禄、化権、化科、化忌定義標籤 A、B、C、D
        const label = MUTAGEN_LABEL_MAP[mutagenType] || '?'
        
        const colorInfo = MUTAGEN_COLORS[mutagenType] || MUTAGEN_COLORS[mutagenKey]
        
        // 對宮是離心自化的終點
        const oppositeBranch = OPPOSITE_PALACE[palace.branch]
        if (!oppositeBranch) {
          return
        }
        
        // 獲取palace的位置信息
        const palacePos = PALACE_POSITIONS[palace.branch]

        const centrifugalLine: MutagenLine = {
          fromPalace: palace.branch,
          toPalace: oppositeBranch,
          type: mutagenType as '禄' | '权' | '科' | '忌',
          color: colorInfo.color,
          markerColor: colorInfo.marker,
          isCounterMutagen: false,
          isSelfCentrifugal: true,
          label,
          starName: mutagenStarChinese,
          palaceRow: palacePos?.row,
          palaceCol: palacePos?.col,
        }
        
        lines.push(centrifugalLine)
      }
    })
  })

  return lines
}

/* ============================================================
   四化計算
   ============================================================ */

/**
 * 根據天干計算四化飛行的星曜（而非宮位）
 */
export function calculateMutagenDestination(stem: string, mutagen: string): string | null {
  // 從知識庫獲取該天干的四化表
  let sihuaMap = SIHUA_BY_GAN[stem]
  if (!sihuaMap) return null
  
  // 標準化 mutagen 為四化表格式（'化X' 格式）
  let mutagenKey = mutagen
  if (!mutagenKey.startsWith('化')) {
    // 如果沒有「化」字前綴，則添加
    mutagenKey = `化${mutagenKey}`
  }
  
  // 嘗試在簡體表中查找
  let mutagenStar = sihuaMap[mutagenKey]
  
  // 如果簡體表中沒有找到，嘗試繁體轉換後查找
  if (!mutagenStar && MUTAGEN_SIMPLIFIED_TO_TRADITIONAL[mutagenKey]) {
    const traditionalKey = MUTAGEN_SIMPLIFIED_TO_TRADITIONAL[mutagenKey]
    mutagenStar = sihuaMap[traditionalKey]
  }
  
  // 返回原始星名（簡體），不轉換
  return mutagenStar || null
}

/* ============================================================
   宮位變換
   ============================================================ */

/**
 * 根據大限索引和性別計算宮位轉移
 */
export function getDecadalPalaceIndex(originIndex: number, selectedDecadal: number | null, gender: 'male' | 'female', yearGan: string): number {
  if (selectedDecadal === null || selectedDecadal === undefined || selectedDecadal === 0) {
    // 第一大限在本命宫
    return originIndex
  }

  // 判斷是否順時針轉移
  // 陽男（天干為陽：甲丙戊庚壬）+ 陰女（女性且天干為陰：乙丁己辛癸）= 順時針
  const yangGanList = ['甲', '丙', '戊', '庚', '壬']
  const isYangGan = yangGanList.includes(yearGan)
  const shouldClockwise = (gender === 'male' && !isYangGan) || (gender === 'female' && isYangGan)

  if (shouldClockwise) {
    // 順時針：向後轉移
    return (originIndex + selectedDecadal) % 12
  } else {
    // 逆時針：向前轉移
    return (originIndex - selectedDecadal + 12 * selectedDecadal) % 12
  }
}

/* ============================================================
   自化標記
   ============================================================ */

/**
 * 根據天干四化標記本宮所有星耀的自化和對宮化
 */
export function markSelfMutagens(palaceData: PalaceData[]): PalaceData[] {
  const palaceMap = new Map<string, PalaceData>()
  palaceData.forEach(p => palaceMap.set(p.branch, p))

  return palaceData.map((palace) => {
    const oppositeBranch = OPPOSITE_PALACE[palace.branch]
    const oppositePalace = oppositeBranch ? palaceMap.get(oppositeBranch) : null

    const updatedMajorStars = palace.majorStars.map((star) => {
      let isSelfMutagen = false
      let isCounterMutagen = false

      const selfMutagenStar = calculateMutagenDestination(palace.stem, star.mutagen || '')
      if (selfMutagenStar === star.name) {
        isSelfMutagen = true
      }

      if (oppositePalace) {
        const counterMutagenStar = calculateMutagenDestination(oppositePalace.stem, star.mutagen || '')
        if (counterMutagenStar === star.name) {
          isCounterMutagen = true
        }
      }

      return {
        ...star,
        isSelfMutagen: isSelfMutagen || undefined,
        isCounterMutagen: isCounterMutagen || undefined,
      }
    })

    const updatedMinorStars = palace.minorStars.map((star) => {
      let isSelfMutagen = false
      let isCounterMutagen = false

      const selfMutagenStar = calculateMutagenDestination(palace.stem, star.mutagen || '')
      if (selfMutagenStar === star.name) {
        isSelfMutagen = true
      }

      if (oppositePalace) {
        const counterMutagenStar = calculateMutagenDestination(oppositePalace.stem, star.mutagen || '')
        if (counterMutagenStar === star.name) {
          isCounterMutagen = true
        }
      }

      return {
        ...star,
        isSelfMutagen: isSelfMutagen || undefined,
        isCounterMutagen: isCounterMutagen || undefined,
      }
    })

    return {
      ...palace,
      majorStars: updatedMajorStars,
      minorStars: updatedMinorStars,
    }
  })
}

/**
 * 根據生年天干標記來因宮
 * 五虎遁訣：甲→戌、乙→酉、丙→申、丁→未、戊→午、己→巳、庚→辰、辛→卯、壬→寅、癸→亥
 */
export function markCausePalace(palaceData: PalaceData[], yearGan: string): PalaceData[] {
  const causePalaceBranch = getCausePalaceBranch(yearGan)
  
  return palaceData.map((palace) => {
    return {
      ...palace,
      isCausePalace: palace.branch === causePalaceBranch,
    }
  })
}
