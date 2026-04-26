/**
 * 幫助函數
 */

import { PALACE_BRANCH_INDEX } from '../types'

/**
 * 檢查標記是否包含特定方向（得或失）
 */
export function hasDirection(mark: '得' | '失' | '得失' | undefined, target: '得' | '失'): boolean {
  if (!mark) return false
  if (mark === '得失') return true
  return mark === target
}

/**
 * 根據選中的地支獲取三方和四正宮位
 */
export function getSanFangSiZhengBranches(selectedBranch: string): {
  sanFang: string[]
  siZheng: string[]
} {
  const indexToBranch = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']
  const branchIndex = PALACE_BRANCH_INDEX[selectedBranch]

  if (branchIndex === undefined) {
    return { sanFang: [], siZheng: [] }
  }

  const trine1 = indexToBranch[(branchIndex + 4) % 12]
  const trine2 = indexToBranch[(branchIndex + 8) % 12]
  const opposite = indexToBranch[(branchIndex + 6) % 12]
  const forward3 = indexToBranch[(branchIndex + 3) % 12]
  const backward3 = indexToBranch[(branchIndex + 9) % 12]

  return {
    sanFang: [selectedBranch, trine1, trine2],
    siZheng: [selectedBranch, opposite, forward3, backward3],
  }
}
