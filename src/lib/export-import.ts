/* ============================================================
   Excel 導出/匯入工具
   ============================================================ */

import type { UserRecord } from './db'
import { userDB } from './db'

/**
 * 將 UserRecord 陣列轉換為 CSV 格式
 */
export function convertToCSV(records: UserRecord[]): string {
  // CSV 標題行
  const headers = [
    '姓名',
    '出生年',
    '出生月',
    '出生日',
    '出生時',
    '出生分',
    '性別',
    '出生地',
    '備註',
    '創建時間',
    '修改時間',
  ]

  // 轉換記錄為 CSV 行
  const rows = records.map(record => [
    escapeCsvField(record.name),
    record.year.toString(),
    record.month.toString(),
    record.day.toString(),
    record.hour.toString(),
    (record.minute || 0).toString(),
    record.gender === 'male' ? '男' : '女',
    escapeCsvField(record.birthLocation || ''),
    escapeCsvField(record.remark || ''),
    new Date(record.createdAt).toISOString(),
    new Date(record.updatedAt).toISOString(),
  ])

  // 組合標題和行
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n')

  return csvContent
}

/**
 * 轉義 CSV 字段中的特殊字符
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"` // 雙引號要雙倍
  }
  return field
}

/**
 * 導出記錄為 Excel（使用 CSV 格式）
 */
export function exportToExcel(): void {
  const records = userDB.getAll()
  if (records.length === 0) {
    alert('沒有記錄可導出')
    return
  }

  const csvContent = convertToCSV(records)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `命盤記錄_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 從 CSV 內容解析記錄
 */
function parseCSVContent(csvContent: string): Partial<UserRecord>[] {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) return [] // 至少需要標題行和一行數據

  // 使用正則表達式解析 CSV（處理帶引號的字段）
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let insideQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          // 雙引號表示一個引號
          current += '"'
          i++
        } else {
          // 切換引號狀態
          insideQuotes = !insideQuotes
        }
      } else if (char === ',' && !insideQuotes) {
        // 逗號作為分隔符（不在引號內時）
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  // 跳過標題行，解析數據行
  const records: Partial<UserRecord>[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])

    if (fields.length < 7) continue // 跳過不完整的行

    const record: Partial<UserRecord> = {
      name: fields[0],
      year: parseInt(fields[1]),
      month: parseInt(fields[2]),
      day: parseInt(fields[3]),
      hour: parseInt(fields[4]),
      minute: parseInt(fields[5]) || 0,
      gender: (fields[6] === '男' ? 'male' : 'female') as 'male' | 'female',
      birthLocation: fields[7] || undefined,
      remark: fields[8] || undefined,
    }

    // 驗證必需字段
    if (record.name && record.year && record.month && record.day && record.hour !== undefined && record.gender) {
      records.push(record)
    }
  }

  return records
}

/**
 * 從文件導入記錄
 */
export async function importFromFile(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string
        const records = parseCSVContent(csvContent)

        if (records.length === 0) {
          reject(new Error('沒有找到有效的記錄'))
          return
        }

        // 確認導入
        const confirmed = window.confirm(`確認導入 ${records.length} 筆記錄嗎？\n\n注意：同名記錄將被覆蓋。`)
        if (!confirmed) {
          reject(new Error('用戶取消導入'))
          return
        }

        // 保存記錄
        let importedCount = 0
        records.forEach(record => {
          if (record.name) {
            userDB.save({
              name: record.name,
              year: record.year!,
              month: record.month!,
              day: record.day!,
              hour: record.hour!,
              minute: record.minute,
              gender: record.gender!,
              remark: record.remark,
              birthLocation: record.birthLocation,
            })
            importedCount++
          }
        })

        resolve(importedCount)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('讀取文件失敗'))
    }

    reader.readAsText(file, 'utf-8')
  })
}

/**
 * 觸發文件選擇並導入
 */
export function triggerImportDialog(): Promise<number> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.xlsx,.xls'
    input.style.display = 'none'

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const count = await importFromFile(file)
          resolve(count)
        } catch (error) {
          reject(error)
        }
      } else {
        reject(new Error('未選擇文件'))
      }
    }

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  })
}
