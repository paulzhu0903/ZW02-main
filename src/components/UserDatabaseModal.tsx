/* ============================================================
   用户数据库管理 Modal - 表格式界面
   ============================================================ */

import { useState, useEffect } from 'react'
import { userDB, type UserRecord } from '@/lib/db'
import { useSettingsStore } from '@/stores'
import { t } from '@/lib/i18n'

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
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setRecords(userDB.getAll())
      setSelectedId(null)
    }
  }, [isOpen])

  const filteredRecords = records.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal 对话框 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div
          className="
            bg-white rounded-xl sm:rounded-2xl shadow-2xl
            max-h-[90vh] w-full max-w-full sm:max-w-[28rem] md:max-w-[36rem] lg:max-w-[36rem]
            overflow-hidden border border-black/[0.08] flex flex-col
          "
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-star to-gold px-3 sm:px-6 py-2 sm:py-2 flex items-center justify-between">
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
            <div className="px-3 sm:px-6 py-2 sm:py-4 border-b border-black/[0.08]">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={t('modal.search', language)}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-[11px] sm:text-[12pt]"
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
            </div>

            {/* 表格 */}
            <div className="flex-1 overflow-y-auto overflow-x-auto">
              {filteredRecords.length > 0 ? (
                <table className="w-full border-collapse min-w-full">
                  <thead className="bg-star text-white sticky top-0">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium w-10 text-[10px] sm:text-[12pt]">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          disabled
                        />
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium w-16 sm:w-24 text-[10px] sm:text-[12pt]">{t('modal.name', language)}</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium w-10 text-[10px] sm:text-[12pt]">{t('modal.gender', language)}</th>
                      <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left font-medium w-16 sm:w-20 text-[10px] sm:text-[12pt]">{t('modal.birthLocation', language)}</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium flex-1 text-[10px] sm:text-[12pt]">{t('modal.birthDate', language)}</th>
                      <th className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left font-medium w-16 text-[10px] sm:text-[12pt]">{t('modal.remarks', language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, idx) => (
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
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <input
                            type="checkbox"
                            checked={selectedId === record.id}
                            onChange={() => setSelectedId(record.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-text-primary text-[10px] sm:text-[12pt]">
                          {record.name}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-text-secondary text-[10px] sm:text-[12pt]">
                          {record.gender === 'male' ? t('modal.male', language) : t('modal.female', language)}
                        </td>
                        <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-[12pt] text-text-secondary">
                          {record.birthLocation || '-'}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-[12pt] text-text-secondary whitespace-nowrap">
                          {record.year}年{record.month}月{record.day}日 {String(record.hour).padStart(2, '0')}:{String(record.minute || 0).padStart(2, '0')}
                        </td>
                        <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-[11pt] text-text-muted">
                          {record.remark || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-text-muted text-[11px] sm:text-[12pt]">{t('modal.noRecords', language)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-black/[0.08]">
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
