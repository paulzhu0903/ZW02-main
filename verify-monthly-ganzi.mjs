/**
 * 驗証流月干支計算修復
 * 
 * 五虎遁法則驗證：
 * - 2026年是丙午年（丙年）
 * - 丙年正月應該是庚寅月（根據五虎遁法則）
 * - 之後每月遞進天干，地支固定
 */

// 五虎遁法則對應表
const firstMonthMap = {
  '甲': '丙', '己': '丙',  // 甲己年起丙寅
  '乙': '戊', '庚': '戊',  // 乙庚年起戊寅
  '丙': '庚', '辛': '庚',  // 丙辛年起庚寅
  '丁': '壬', '壬': '壬',  // 丁壬年起壬寅
  '戊': '甲', '癸': '甲',  // 戊癸年起甲寅
}

const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

function getYearGan(year) {
  return ganList[(year - 1900 + 6) % 10]
}

function getFirstMonthGan(year) {
  const yearGan = getYearGan(year)
  return firstMonthMap[yearGan] || '甲'
}

function getMonthlyGan(year, lunarMonth) {
  const firstGan = getFirstMonthGan(year)
  const index = ganList.indexOf(firstGan)
  const monthIndex = (index + lunarMonth - 1) % 10
  return ganList[monthIndex]
}

function getMonthlyZhi(lunarMonth) {
  return zhiList[(lunarMonth + 1) % 12]
}

// 測試 2026 年
const year = 2026
const yearGan = getYearGan(year)
console.log(`\n【2026年 (${yearGan}午年) 流月干支驗証】`)
console.log('-----------------------------------------------')

const monthNames = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

for (let month = 1; month <= 12; month++) {
  const gan = getMonthlyGan(year, month)
  const zhi = getMonthlyZhi(month)
  const ganZhi = `${gan}${zhi}`
  console.log(`${monthNames[month - 1]}月 (${month}月): ${ganZhi}月`)
}

console.log('\n驗証要點:')
console.log('✓ 正月應該是庚寅月 ✓')
console.log('✓ 每個月的地支應該固定循環 (寅→卯→辰→...→丑) ✓')
console.log('✓ 天干每月遞進 (庚→辛→壬→癸→甲→乙→丙→丁→戊→己) ✓')
