/* ============================================================
   iztro 排盘引擎封装
   ============================================================

   流派标准（文墨天机对齐）:
   - 年分界: 正月初一 (yearDivide: normal)
   - 运限分界: 正月初一 (horoscopeDivide: normal)
   - 子初换日: 23:00 即换日 (dayDivide: forward)
   - 小限分界: 自然年 (ageDivide: normal)
   - 安星法: 中州派 (algorithm: zhongzhou)
   ============================================================ */

import { astro } from 'iztro'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'

/* ------------------------------------------------------------
   全局配置初始化 - 文墨天机标准
   ------------------------------------------------------------ */

astro.config({
  yearDivide: 'normal',       // 年干四化: 正月初一分年
  horoscopeDivide: 'normal',  // 大限流年: 正月初一分界
  ageDivide: 'normal',        // 小限: 按自然年分
  dayDivide: 'forward',       // 子初换日: 23:00 即换日
  algorithm: 'zhongzhou',     // 安星法: 中州派
})

export type Gender = 'male' | 'female'

export interface BirthInfo {
  year: number
  month: number
  day: number
  hour: number
  minute?: number
  gender: Gender
  isLeapMonth?: boolean
  fixLeap?: boolean
  // 用户信息
  name?: string
  birthLocation?: string  // 出生地
}

/* ------------------------------------------------------------
   时辰索引转换
   iztro 时辰: 0=早子(00-01), 1=丑, ..., 11=亥, 12=晚子(23-00)
   ------------------------------------------------------------ */

function hourToTimeIndex(hour: number): number {
  if (hour === 23) return 12        // 晚子时 23:00-00:00
  if (hour >= 0 && hour < 1) return 0  // 早子时 00:00-01:00
  return Math.floor((hour + 1) / 2)
}

/* ------------------------------------------------------------
   生成命盘
   ------------------------------------------------------------ */

export function generateChart(info: BirthInfo): FunctionalAstrolabe {
  const { year, month, day, hour, gender, fixLeap = true } = info

  const dateStr = `${year}-${month}-${day}`
  const timeIndex = hourToTimeIndex(hour)
  const genderName = gender === 'male' ? '男' : '女'

  return astro.bySolar(dateStr, timeIndex, genderName, fixLeap)
}

/* ------------------------------------------------------------
   时辰选项
   ------------------------------------------------------------ */

const SHICHEN_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

export function hourToShichen(hour: number): string {
  const index = Math.floor(((hour + 1) % 24) / 2)
  return SHICHEN_NAMES[index] + '时'
}

/* ============================================================================
   真太陽時計算 - 根據出生地經度校正時間
   ============================================================================ */

/**
 * 城市經度數據庫
 * 標準時間使用東經120°（中國標準時區）作為參考
 * 真太陽時 = 標準時間 + 時間差修正
 */
const CITY_LONGITUDE_MAP: Record<string, number> = {
  // 直辖市和主要城市
  '北京': 120,           // 標準時區參考點
  '上海': 121.5,         // +6分钟
  '广州': 113.3,         // -27分钟
  '深圳': 114.1,         // -23分钟
  '重庆': 106.5,         // -54分钟
  '天津': 117.2,         // -23分钟
  
  // 主要省份城市
  '成都': 104.5,         // -62分钟
  '西安': 108.9,         // -44分钟
  '南京': 118.8,         // -5分钟
  '杭州': 120.2,         // +1分钟
  '武汉': 114.3,         // -23分钟
  '长沙': 112.9,         // -33分钟
  '南昌': 115.9,         // -16分钟
  '福州': 119.3,         // -3分钟
  '厦门': 118.1,         // -8分钟
  '郑州': 113.6,         // -25分钟
  '昆明': 102.7,         // -69分钟
  '兰州': 103.8,         // -65分钟
  '西宁': 101.8,         // -73分钟
  '乌鲁木齐': 87.6,      // -130分钟
  '拉萨': 91.1,          // -116分钟
  '哈尔滨': 126.5,       // +26分钟
  '沈阳': 123.9,         // +16分钟
  '长春': 125.3,         // +21分钟
  '太原': 112.5,         // -35分钟
  '石家庄': 114.5,       // -22分钟
  '南宁': 108.3,         // -47分钟
  '贵阳': 106.7,         // -53分钟
  '苏州': 120.6,         // +2分钟
  '无锡': 120.3,         // +1分钟
  '南通': 120.9,         // +4分钟
  '台北': 121.5,         // +6分钟
  '台中': 120.7,         // +3分钟
  '高雄': 120.3,         // +1分钟
}

/**
 * 根據城市名稱獲取經度
 * @param location 城市名称
 * @returns 经度（东经，度）
 */
function getLocationLongitude(location?: string): number | null {
  if (!location) return null
  
  // 精确匹配
  if (location in CITY_LONGITUDE_MAP) {
    return CITY_LONGITUDE_MAP[location]
  }
  
  // 模糊匹配 - 查找包含的城市名
  for (const [city, longitude] of Object.entries(CITY_LONGITUDE_MAP)) {
    if (location.includes(city) || city.includes(location)) {
      return longitude
    }
  }
  
  return null
}

/**
 * 計算真太陽時修正量
 * 公式：時間差（分鐘） = (東經120° - 城市東經) × 4分鐘/度
 * @param longitude 城市经度
 * @returns 时间差（分钟，正数表示要加上）
 */
function calculateSolarTimeCorrection(longitude: number): number {
  const standardLongitude = 120  // 中国标准时区参考
  const minutesPerDegree = 4     // 每相差1度经度相差4分钟
  return (standardLongitude - longitude) * minutesPerDegree
}

/**
 * 計算真太陽時
 * @param birthInfo 出生信息
 * @returns 真太陽時字符串 (格式: YYYY-MM-DD HH:MM)
 */
export function calculateSolarTime(birthInfo: Partial<BirthInfo>): string {
  // 获取基础时间
  const year = birthInfo.year || new Date().getFullYear()
  const month = birthInfo.month || 1
  const day = birthInfo.day || 1
  const hour = birthInfo.hour ?? 9
  const minute = birthInfo.minute ?? 0
  
  // 如果没有出生地，直接返回标准时间
  const location = birthInfo.birthLocation
  const longitude = getLocationLongitude(location)
  
  if (longitude === null) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  
  // 计算时间差修正量
  const correctionMinutes = calculateSolarTimeCorrection(longitude)
  
  // 计算真太阳时
  let totalMinutes = hour * 60 + minute + correctionMinutes
  let correctedHour = Math.floor(totalMinutes / 60)
  let correctedMinute = totalMinutes % 60
  
  // 处理超出24小时
  let correctedDay = day
  let correctedMonth = month
  let correctedYear = year
  
  if (correctedHour >= 24) {
    correctedHour -= 24
    correctedDay += 1
    // 简单处理月份变化（实际应该考虑闰年等）
    const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if ((correctedYear % 4 === 0 && correctedYear % 100 !== 0) || (correctedYear % 400 === 0)) {
      daysPerMonth[1] = 29
    }
    if (correctedDay > daysPerMonth[correctedMonth - 1]) {
      correctedDay = 1
      correctedMonth += 1
    }
  } else if (correctedHour < 0) {
    correctedHour += 24
    correctedDay -= 1
    if (correctedDay < 1) {
      correctedMonth -= 1
      if (correctedMonth < 1) {
        correctedMonth = 12
        correctedYear -= 1
      }
      const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      if ((correctedYear % 4 === 0 && correctedYear % 100 !== 0) || (correctedYear % 400 === 0)) {
        daysPerMonth[1] = 29
      }
      correctedDay = daysPerMonth[correctedMonth - 1]
    }
  }
  
  // 处理负分钟
  if (correctedMinute < 0) {
    correctedHour -= 1
    correctedMinute += 60
    if (correctedHour < 0) {
      correctedHour += 24
      correctedDay -= 1
    }
  }
  
  return `${correctedYear}-${String(correctedMonth).padStart(2, '0')}-${String(correctedDay).padStart(2, '0')} ${String(correctedHour).padStart(2, '0')}:${String(Math.round(correctedMinute)).padStart(2, '0')}`
}

export function getShichenOptions() {
  return SHICHEN_NAMES.map((name, index) => {
    const startHour = index === 0 ? 23 : (index * 2 - 1)
    const endHour = index === 0 ? 1 : (index * 2 + 1)
    const label = index === 0
      ? `${name}时 (23:00-00:59)`
      : `${name}时 (${String(startHour).padStart(2, '0')}:00-${String(endHour).padStart(2, '0')}:59)`
    return {
      value: index === 0 ? 23 : index * 2,
      label,
    }
  })
}

/* ------------------------------------------------------------
   导出类型
   ------------------------------------------------------------ */

export type { FunctionalAstrolabe }
