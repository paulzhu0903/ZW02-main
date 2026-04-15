/* ============================================================
   生辰输入表单 - 高级玻璃态设计
   ============================================================ */

import { useState, useEffect } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { generateChart, type BirthInfo, type Gender } from '@/lib/astro'
import { userDB, type UserRecord } from '@/lib/db'
import { UserDatabaseModal } from './UserDatabaseModal'
import { useChartStore, useSettingsStore } from '@/stores'
import { t } from '@/lib/i18n'

const currentYear = new Date().getFullYear()

const YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) => ({
  value: currentYear - i,
  label: `${currentYear - i}年`,
}))

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}月`,
}))

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}日`,
}))

const HOUR_SELECT_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: String(i).padStart(2, '0'),
}))

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: i,
  label: String(i).padStart(2, '0'),
}))

const GENDER_OPTIONS = [
  { value: 'male', labelKey: 'form.male', icon: '♂' },
  { value: 'female', labelKey: 'form.female', icon: '♀' },
]

export function BirthForm() {
  const { setBirthInfo, setChart, recordToLoad, setRecordToLoad } = useChartStore()
  const { language } = useSettingsStore()

  const [name, setName] = useState('')
  const [birthLocation, setBirthLocation] = useState('')
  const [remark, setRemark] = useState('')
  const [year, setYear] = useState(1970)
  const [month, setMonth] = useState(9)
  const [day, setDay] = useState(3)
  const [hour, setHour] = useState(13)
  const [minute, setMinute] = useState(30)
  const [gender, setGender] = useState<Gender>('male')
  const [loading, setLoading] = useState(false)
  const [isDbModalOpen, setIsDbModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)  // 編輯模式
  const [recordId, setRecordId] = useState<string | null>(null)  // 编辑时保存记录 ID

  // 当 recordToLoad 改变时，用其数据初始化表单
  useEffect(() => {
    if (recordToLoad) {
      setRecordId(recordToLoad.id)  // 保存编辑记录的 ID
      setName(recordToLoad.name)
      setBirthLocation(recordToLoad.birthLocation || '')  // 加载出生地
      setYear(recordToLoad.year)
      setMonth(recordToLoad.month)
      setDay(recordToLoad.day)
      setHour(recordToLoad.hour)
      setMinute(recordToLoad.minute || 0)  // 确保分钟被正确设置
      setGender(recordToLoad.gender)
      setRemark(recordToLoad.remark || '')
      setIsEditing(true)  // 进入编辑模式
    }
  }, [recordToLoad])

  // 提取圖表生成邏輯為獨立函數
  const submitChart = (birthInfo: BirthInfo) => {
    setLoading(true)
    try {
      // 儲存到資料庫（如果提供了名字）
      if (birthInfo.name?.trim()) {
        // 如果在编辑模式且有 recordId，使用 updateById 更新记录
        if (isEditing && recordId) {
          userDB.updateById(recordId, {
            name: birthInfo.name.trim(),
            year: birthInfo.year,
            month: birthInfo.month,
            day: birthInfo.day,
            hour: birthInfo.hour,
            minute: birthInfo.minute,
            gender: birthInfo.gender,
            remark: remark || undefined,
            birthLocation: birthLocation || undefined,
          })
        } else {
          // 否则使用 save 方法（新增或按名字更新）
          userDB.save({
            name: birthInfo.name.trim(),
            year: birthInfo.year,
            month: birthInfo.month,
            day: birthInfo.day,
            hour: birthInfo.hour,
            minute: birthInfo.minute,
            gender: birthInfo.gender,
            remark: remark || undefined,
            birthLocation: birthLocation || undefined,
          })
        }
      }

      const chart = generateChart(birthInfo)
      setBirthInfo(birthInfo)
      setChart(chart)
      // 清除 recordToLoad，避免下次表單初始化時重複加載
      if (recordToLoad) {
        setRecordToLoad(null)
      }
      // 編輯完成，退出編輯模式
      if (isEditing) {
        setIsEditing(false)
        setRecordId(null)  // 清除 recordId
      }
    } catch (error) {
      console.error('排盤失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const birthInfo: BirthInfo = {
      year,
      month,
      day,
      hour,
      minute,
      gender,
      name: name || undefined,
      birthLocation: birthLocation || undefined,
    }
    submitChart(birthInfo)
  }

  // "新增" 按鈕：清空表單到預設值
  const handleAdd = () => {
    setName('')
    setBirthLocation('')
    setRemark('')
    setYear(1970)
    setMonth(9)
    setDay(3)
    setHour(13)
    setMinute(30)
    setGender('male')
    setRecordId(null)
    setIsDbModalOpen(false)
  }

  // "修改" 按鈕：只加載資料，進入編輯模式
  const handleEdit = (record: UserRecord) => {
    setName(record.name)
    setBirthLocation(record.birthLocation || '')
    setRemark(record.remark || '')
    setYear(record.year)
    setMonth(record.month)
    setDay(record.day)
    setHour(record.hour)
    setMinute(record.minute || 0)
    setGender(record.gender)
    setRecordId(record.id)  // 保存記錄 ID 用於更新
    setIsDbModalOpen(false)
    setIsEditing(true)  // 進入編輯模式
  }

  // 編輯模式取消
  const handleEditCancel = () => {
    setIsEditing(false)
    setRecordId(null)
    // 重置表單
    setName('')
    setBirthLocation('')
    setRemark('')
    setYear(currentYear)
    setMonth(1)
    setDay(1)
    setHour(9)
    setMinute(0)
    setGender('male')
  }

  const handleSelectFromDbAndSubmit = (record: UserRecord) => {
    setName(record.name)
    setBirthLocation(record.birthLocation || '')
    setYear(record.year)
    setMonth(record.month)
    setDay(record.day)
    setHour(record.hour)
    setMinute(record.minute || 0)
    setGender(record.gender)
    setIsDbModalOpen(false)
    
    // 立即生成圖表
    const birthInfo: BirthInfo = {
      year: record.year,
      month: record.month,
      day: record.day,
      hour: record.hour,
      minute: record.minute || 0,
      gender: record.gender,
      name: record.name,
      birthLocation: record.birthLocation || undefined,
    }
    submitChart(birthInfo)
  }

  return (
    <>
    <form
      onSubmit={handleSubmit}
      className="
        relative w-full max-w-full sm:max-w-[25.5rem] lg:max-w-[26rem] p-2.5 sm:p-3.5 lg:p-5 mx-auto
        bg-gradient-to-br from-white/[0.06] to-white/[0.02]
        backdrop-blur-xl border border-white/[0.08] rounded-lg sm:rounded-xl
        shadow-[0_8px_40px_rgba(0,0,0,0.3)]
      "
    >
      {/* 顶部发光线 */}
      <div
        className="
          absolute top-0 left-1/2 -translate-x-1/2
          w-1/2 h-px
          bg-gradient-to-r from-transparent via-star/40 to-transparent
        "
      />

      {/* 标题区域 */}
      <div className="space-y-1 sm:space-y-1.5 mb-2.5 sm:mb-4">
 

        {/* 数据库按銭 */}
        <button
          type="button"
          onClick={() => setIsDbModalOpen(true)}
          className="
            text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full
            bg-gradient-to-r from-gold/20 to-gold/10
            text-gold border border-gold/20
            hover:border-gold/40 transition-colors
          "
        >
          {t('form.viewCases', language)}
        </button>
      </div>


      <div className="space-y-2 sm:space-y-3">
        {/* 姓名 - 最前面 */}
        <Input
          label={t('form.name', language)}
          placeholder={t('form.namePlaceholder', language)}
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint={t('form.nameHint', language)}
        />

        {/* 出生地 */}
        <Input
          label={t('form.birthLocation', language)}
          placeholder={t('form.birthLocationPlaceholder', language)}
          value={birthLocation}
          onChange={(e) => setBirthLocation(e.target.value)}
          hint={t('form.birthLocationHint', language)}
        />

        {/* 備註 */}
        <Input
          label={t('form.remark', language) || '備註'}
          placeholder={t('form.remarkPlaceholder', language) || '可選填，不作計算用'}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          hint={t('form.remarkHint', language) || '此欄位不影響排盤結果'}
        />

        {/* 出生日期区块 */}
        <div className="space-y-1 sm:space-y-1.5">
      
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
            <Select
              options={YEAR_OPTIONS}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
            <Select
              options={MONTH_OPTIONS}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
            <Select
              options={DAY_OPTIONS}
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            />
          </div>
          {/* 提示文字 */}
          <p className="text-[9px] sm:text-[10px] text-text-muted mt-0.5 sm:mt-1">
            {t('form.dateHint', language)}
          </p>
        </div>

        {/* 出生时间 - 时和分 */}
        <div className="space-y-1 sm:space-y-1.5">
          <span className="text-[11px] sm:text-[12px] text-text-secondary font-medium">{t('form.birthTime', language)}</span>
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
            <Select
              options={HOUR_SELECT_OPTIONS}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
            />
            <Select
              options={MINUTE_OPTIONS}
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
            />
          </div>
        </div>

        {/* 性别选择 - 胶囊按钮组 */}
        <div className="space-y-1 sm:space-y-1.5">
          <span className="text-[11px] sm:text-[12px] text-text-secondary font-medium">{t('form.gender', language)}</span>
          <div className="flex gap-1 sm:gap-1.5">
            {GENDER_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`
                  group relative flex-1 py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-lg sm:rounded-xl
                  flex items-center justify-center gap-0.5 sm:gap-1
                  text-[12px] sm:text-[13px]
                  cursor-pointer transition-all duration-200
                  ${gender === opt.value
                    ? 'bg-gradient-to-r from-star to-star-dark text-white shadow-[0_4px_20px_rgba(124,58,237,0.3)]'
                    : 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12]'
                  }
                `}
              >
                <input
                  type="radio"
                  name="gender"
                  value={opt.value}
                  checked={gender === opt.value}
                  onChange={() => setGender(opt.value as Gender)}
                  className="sr-only"
                />
                <span
                  className={`
                    text-xs sm:text-sm transition-transform duration-200
                    ${gender === opt.value ? 'scale-110' : 'opacity-60 group-hover:opacity-80'}
                  `}
                >
                  {opt.icon}
                </span>
                <span className="font-medium leading-none">{t(opt.labelKey, language)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.06]" />
          </div>
        </div>

        {/* 按钮组 */}
        {isEditing ? (
          <div className="flex gap-1.5 sm:gap-2">
            {/* 編輯模式：確認和取消按鈕 */}
            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="flex-1 group text-[11px] sm:text-[12px]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('form.submitting', language)}
                </>
              ) : (
                t('form.confirm', language)
              )}
            </Button>
            <button
              type="button"
              onClick={handleEditCancel}
              className="flex-1 py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-lg text-[11px] sm:text-[12px] font-medium transition-all bg-white/[0.06] hover:bg-white/[0.1] text-text-secondary hover:text-text border border-white/[0.1]"
            >
              {t('form.cancel', language)}
            </button>
          </div>
        ) : (
          /* 正常模式：提交按鈕 */
          <div className="flex justify-center">
            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-auto px-8 sm:px-12 group text-[11px] sm:text-[12px]"
              disabled={loading}
            >
              {loading ? (
                <>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('form.submitting', language)}
              </>
            ) : (
              <>
                <span>{t('form.submit', language)}</span>
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </Button>
          </div>
        )}
      </div>

      {/* 角落装饰 */}
      <div className="absolute -bottom-2 -right-2 w-16 h-16 opacity-20">
        <div className="absolute inset-0 rounded-full border border-star/30" />
        <div className="absolute inset-2 rounded-full border border-gold/20" />
        <div className="absolute inset-4 rounded-full border border-star/10" />
      </div>
    </form>

    {/* 数据库 Modal */}
    <UserDatabaseModal
      isOpen={isDbModalOpen}
      onClose={() => setIsDbModalOpen(false)}
      onSelect={handleSelectFromDbAndSubmit}
      onAdd={handleAdd}
      onEdit={handleEdit}
    />
  </>
  )
}
