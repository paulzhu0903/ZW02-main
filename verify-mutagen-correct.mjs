/**
 * 驗証流月四化修復 - 正確的紫微斗數十干四化表
 */

const mutagenMap = {
  '甲': ['廉貞', '破軍', '武曲', '太陽'],
  '乙': ['天機', '天梁', '紫微', '太陰'],
  '丙': ['天同', '天機', '文昌', '廉貞'],
  '丁': ['太陰', '天同', '天機', '巨門'],
  '戊': ['貪狼', '太陰', '右弼', '天機'],
  '己': ['武曲', '貪狼', '天梁', '文曲'],
  '庚': ['太陽', '武曲', '太陰', '天同'],
  '辛': ['巨門', '太陽', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左輔', '武曲'],
  '癸': ['破軍', '巨門', '太陰', '貪狼'],
}

const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

function getYearGan(year) {
  return ganList[(year - 1900 + 6) % 10]
}

function getFirstMonthGan(year) {
  const firstMonthMap = {
    '甲': '丙', '己': '丙',
    '乙': '戊', '庚': '戊',
    '丙': '庚', '辛': '庚',
    '丁': '壬', '壬': '壬',
    '戊': '甲', '癸': '甲',
  }
  const yearGan = getYearGan(year)
  return firstMonthMap[yearGan] || '甲'
}

function getMonthlyGan(year, lunarMonth) {
  const firstGan = getFirstMonthGan(year)
  const index = ganList.indexOf(firstGan)
  const monthIndex = (index + lunarMonth - 1) % 10
  return ganList[monthIndex]
}

// 測試 2026 年
const year = 2026
const yearGan = getYearGan(year)
console.log(`\n【2026年 (${yearGan}午年) 流月四化驗証】`)
console.log('===============================================')

const monthNames = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

for (let month = 1; month <= 12; month++) {
  const gan = getMonthlyGan(year, month)
  const mutagens = mutagenMap[gan]
  const [lu, quan, ke, ji] = mutagens
  console.log(`${monthNames[month - 1]}月 天干:${gan} - 祿:${lu} 權:${quan} 科:${ke} 忌:${ji}`)
}

console.log('\n✅ 修復驗証：')
const testGan = getMonthlyGan(year, 1)
const testMutagens = mutagenMap[testGan]
console.log(`正月天干: ${testGan} → 四化: ${testMutagens.join('、')}`)
console.log(`預期: 太陽、武曲、太陰、天同`)
console.log(testMutagens.join('、') === '太陽、武曲、太陰、天同' ? '✅ 正確！' : '❌ 錯誤')
