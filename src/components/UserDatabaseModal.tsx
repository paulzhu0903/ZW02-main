/* ============================================================
   用户数据库管理 Modal - 表格式界面
   ============================================================ */

import { useState, useEffect } from 'react'
import { userDB, type UserRecord } from '@/lib/db'
import { useSettingsStore } from '@/stores'
import { t } from '@/lib/i18n'
import { exportToExcel, importFromFile } from '@/lib/export-import'
import { localizeChineseText } from '@/lib/localize-knowledge'

interface UserDatabaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (record: UserRecord) => void
  onAdd: () => void
  onEdit: (record: UserRecord) => void
}

export function UserDatabaseModal({ isOpen, onClose, onSelect, onAdd, onEdit }: UserDatabaseModalProps) {
  const { language } = useSettingsStore()
  const [records, setRecords] = useState<UserRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'gender' | 'category' | 'birthDate' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // 分類翻譯映射表
  const categoryTranslationMap: Record<string, string> = {
    '家人': 'form.category.family',
    '朋友': 'form.category.friend',
    '同學': 'form.category.classmate',
    '同事': 'form.category.colleague',
    '客戶': 'form.category.client',
    '名人': 'form.category.celebrity',
    '其他': 'form.category.other',
    '紫占': 'form.category.zodiac',
    '分類_1': 'form.category.custom1',
    '分類_2': 'form.category.custom2',
    '分類_3': 'form.category.custom3',
  }

  // 獲取本地化分類名稱
  const getCategoryDisplayName = (category: string): string => {
    const translationKey = categoryTranslationMap[category]
    if (translationKey) {
      return t(translationKey, language)
    }
    // 如果是自定義分類（被用戶編輯過），直接返回存儲值
    return category
  }

  useEffect(() => {
    if (isOpen) {
      setRecords(userDB.getAll())
      setSelectedId(null)
      setSortBy(null)
    }
  }, [isOpen])

  // 提取所有不同的分類
  const categories = Array.from(
    new Set(records.map(r => r.category).filter((c): c is string => Boolean(c)))
  ).sort()

  const filteredRecords = records.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || r.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // 排序邏輯
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (!sortBy) return 0

    let compareValue = 0
    if (sortBy === 'name') {
      compareValue = a.name.localeCompare(b.name, 'zh-TW')
    } else if (sortBy === 'gender') {
      compareValue = a.gender.localeCompare(b.gender)
    } else if (sortBy === 'category') {
      compareValue = (a.category || '').localeCompare(b.category || '', 'zh-TW')
    } else if (sortBy === 'birthDate') {
      const dateA = new Date(a.year, a.month - 1, a.day, a.hour, a.minute || 0).getTime()
      const dateB = new Date(b.year, b.month - 1, b.day, b.hour, b.minute || 0).getTime()
      compareValue = dateA - dateB
    }

    return sortOrder === 'asc' ? compareValue : -compareValue
  })

  // 處理排序按鈕點擊
  const handleSort = (field: 'name' | 'gender' | 'category' | 'birthDate') => {
    if (sortBy === field) {
      // 切換升冪/降冪
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 設置新的排序欄位，預設升冪
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleDelete = () => {
    if (!selectedId) {
      alert(t('modal.selectToDelete', language))
      return
    }
    if (confirm(t('modal.confirmDelete', language))) {
      userDB.delete(selectedId)
      setRecords(records.filter((r) => r.id !== selectedId))
      setSelectedId(null)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* 背景覆盖层 */}
      <div
        className="fixed inset-0 bg-black/40 z-[99998] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal 对话框 */}
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4">
        <div
          className="
            bg-white rounded-xl sm:rounded-2xl shadow-2xl
            max-h-[90vh] w-full max-w-full sm:max-w-[24rem] md:max-w-[32rem] lg:max-w-[32rem]
            overflow-hidden border border-black/[0.08] flex flex-col
          "
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-star to-gold px-2 sm:px-4 py-2 sm:py-2 flex items-center justify-between">
            <h2 className="text-[12px] sm:text-[14pt] font-bold text-white">{t('modal.cases', language)}</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-0.5 sm:p-1 transition-colors"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 搜索框 */}
            <div className="px-2 sm:px-4 py-2 sm:py-4 border-b border-black/[0.08]">
              <div className="flex gap-2">
                {/* 搜尋輸入框 */}
                <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-lg px-1.5 sm:px-2 py-1.5 sm:py-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t('modal.search', language)}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[11px] sm:text-[11px]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* 分類下拉選單 */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-lg text-[11px] sm:text-[11px] text-text-primary focus:border-star focus:outline-none min-w-[90px] sm:min-w-[110px]"
                >
                  <option value="">{t('modal.categoryAll', language)}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {getCategoryDisplayName(category)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 表格 */}
            <div className="flex-1 overflow-y-auto overflow-x-auto">
              {filteredRecords.length > 0 ? (
                <table className="w-full border-collapse min-w-full">
                  <thead className="bg-star text-white sticky top-0">
                    <tr>
                      <th className="px-1.5 sm:px-3 py-2 sm:py-3 text-left font-medium w-14 sm:w-20 text-[10px] sm:text-[11px]">
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                        >
                          {t('modal.name', language)}
                          <span className="text-[8px] sm:text-[10px]">
                            {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '△'}
                          </span>
                        </button>
                      </th>
                      <th className="px-1.5 sm:px-3 py-2 sm:py-3 text-left font-medium w-14 text-[10px] sm:text-[11px] whitespace-nowrap">
                        <button
                          onClick={() => handleSort('gender')}
                          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                        >
                          {t('modal.gender', language)}
                          <span className="text-[8px] sm:text-[10px]">
                            {sortBy === 'gender' ? (sortOrder === 'asc' ? '▲' : '▼') : '△'}
                          </span>
                        </button>
                      </th>
                      <th className="px-1.5 sm:px-3 py-2 sm:py-3 text-left font-medium w-16 sm:w-20 text-[10px] sm:text-[11px] whitespace-nowrap">
                        <button
                          onClick={() => handleSort('category')}
                          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                        >
                          {t('modal.category', language)}
                          <span className="text-[8px] sm:text-[10px]">
                            {sortBy === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : '△'}
                          </span>
                        </button>
                      </th>
                      <th className="hidden sm:table-cell px-1.5 sm:px-3 py-2 sm:py-3 text-left font-medium w-14 sm:w-18 lg:w-24 text-[10px] sm:text-[11px] lg:text-[10px]">{t('modal.birthLocation', language)}</th>
                      <th className="px-1.5 sm:px-3 py-2 sm:py-3 text-left font-medium flex-1 text-[10px] sm:text-[11px]">
                        <button
                          onClick={() => handleSort('birthDate')}
                          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                        >
                          {t('modal.birthDate', language)}
                          <span className="text-[8px] sm:text-[10px]">
                            {sortBy === 'birthDate' ? (sortOrder === 'asc' ? '▲' : '▼') : '△'}
                          </span>
                        </button>
                      </th>
                      <th className="hidden lg:table-cell px-1.5 sm:px-3 py-2 sm:py-3 text-left font-medium w-12 text-[10px] sm:text-[11px]">{t('modal.remarks', language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map((record, idx) => (
                      <tr
                        key={record.id}
                        onClick={() => setSelectedId(record.id)}
                        className={`
                          border-b border-gray-200 cursor-pointer transition-colors
                          ${selectedId === record.id
                            ? 'bg-star/10'
                            : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }
                          hover:bg-star/5
                        `}
                      >
                        <td className="px-1.5 sm:px-3 py-2 sm:py-3 font-medium text-text-primary text-[10px] sm:text-[11px]">
                          {localizeChineseText(record.name, language as 'zh-TW' | 'zh-CN')}
                        </td>
                        <td className="px-1.5 sm:px-3 py-2 sm:py-3 text-text-secondary text-[10px] sm:text-[11px] whitespace-nowrap">
                          {record.gender === 'male' ? t('modal.male', language) : t('modal.female', language)}
                        </td>
                        <td className="px-1.5 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-[11px] text-text-secondary">
                          {record.category ? localizeChineseText(getCategoryDisplayName(record.category), language as 'zh-TW' | 'zh-CN') : '-'}
                        </td>
                        <td className="hidden sm:table-cell px-1.5 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-[11px] lg:text-[10px] text-text-secondary">
                          {record.birthLocation ? localizeChineseText(record.birthLocation, language as 'zh-TW' | 'zh-CN') : '-'}
                        </td>
                        <td className="px-1.5 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-[11px] text-text-secondary whitespace-nowrap">
                          {record.year}年{record.month}月{record.day}日 {String(record.hour).padStart(2, '0')}:{String(record.minute || 0).padStart(2, '0')}
                        </td>
                        <td className="hidden lg:table-cell px-1.5 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-[10px] text-text-muted">
                          {record.remark ? localizeChineseText(record.remark, language as 'zh-TW' | 'zh-CN') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-text-muted text-[11px] sm:text-[11px]">{t('modal.noRecords', language)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 px-2 sm:px-3 py-2.5 sm:py-3 border-t border-black/[0.08]">
            {/* 匯入/匯出按鈕 */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2.5">
              {/* 輸入命例按鈕 */}
              <button
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = '.csv'
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) {
                      try {
                        const count = await importFromFile(file)
                        setRecords(userDB.getAll())
                        alert(`成功匯入 ${count} 筆命例`)
                      } catch (error) {
                        alert(`匯入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
                      }
                    }
                  }
                  input.click()
                }}
                className="
                  flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 sm:py-2 rounded-lg
                  bg-blue-500/10 border border-blue-300
                  text-blue-600 font-medium text-[10px] sm:text-[11px]
                  hover:bg-blue-500/20 transition-colors
                "
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4v4m0 0H8m4 0h4M4 12a8 8 0 1116 0 8 8 0 01-16 0z" />
                </svg>
                <span className="truncate">{t('modal.importExamples', language)}</span>
              </button>

              {/* 輸出命例按鈕 */}
              <button
                onClick={() => {
                  try {
                    exportToExcel()
                  } catch (error) {
                    alert(`匯出失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
                  }
                }}
                className="
                  flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 sm:py-2 rounded-lg
                  bg-green-500/10 border border-green-300
                  text-green-600 font-medium text-[10px] sm:text-[11px]
                  hover:bg-green-500/20 transition-colors
                "
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="truncate">{t('modal.exportExamples', language)}</span>
              </button>
            </div>

            {/* 其他操作按鈕 */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {/* 新增按钮 */}
              <button
                onClick={() => {
                  onClose()
                  setTimeout(() => onAdd(), 100)
                }}
                className="
                  flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 sm:py-2 rounded-lg
                  bg-white border border-gray-300
                  text-text-primary font-medium text-[10px] sm:text-[11px]
                  hover:bg-gray-50 transition-colors
                "
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="truncate">{t('modal.add', language)}</span>
              </button>

              {/* 修改按钮 */}
              <button
                onClick={() => {
                  if (!selectedId) {
                    alert(t('modal.selectToEdit', language))
                    return
                  }
                  const record = records.find((r) => r.id === selectedId)
                  if (record) {
                    onClose()
                    setTimeout(() => onEdit(record), 100)
                  }
                }}
                className="
                  flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 sm:py-2 rounded-lg
                  bg-white border border-gray-300
                  text-text-primary font-medium text-[10px] sm:text-[11px]
                  hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={!selectedId}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="truncate">{t('modal.edit', language)}</span>
              </button>

              {/* 删除按钮 */}
              <button
                onClick={handleDelete}
                className="
                  flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 sm:py-2 rounded-lg
                  bg-red-500/10 border border-red-300
                  text-red-600 font-medium text-[10px] sm:text-[11px]
                  hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={!selectedId}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="truncate">{t('modal.delete', language)}</span>
              </button>

              {/* 排盤按钮 */}
              <button
                onClick={() => {
                  if (!selectedId) {
                    alert(t('modal.selectToArrange', language))
                    return
                  }
                  const record = records.find((r) => r.id === selectedId)
                  if (record) {
                    onSelect(record)
                    onClose()
                  }
                }}
                className="
                  flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 sm:py-2 rounded-lg
                  bg-gradient-to-r from-star to-star-dark text-white
                  font-medium text-[10px] sm:text-[11px] hover:shadow-lg transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={!selectedId}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="truncate">{t('modal.arrange', language)}</span>
              </button>

              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="
                  flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 sm:py-2 rounded-lg
                  bg-white border border-gray-300
                  text-text-primary font-medium text-[10px] sm:text-[11px]
                  hover:bg-gray-50 transition-colors
                "
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="truncate">{t('modal.close', language)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
