/* ============================================================
   用户数据库 - localStorage 存储层
   ============================================================ */

export interface UserRecord {
  id: string
  name: string
  year: number
  month: number
  day: number
  hour: number
  minute?: number
  gender: 'male' | 'female'
  remark?: string
  birthLocation?: string  // 出生地
  createdAt: number
  updatedAt: number
}

const DB_KEY = 'ziwei-user-records'

export const userDB = {
  /**
   * 添加或更新用户记录
   */
  save: (user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): UserRecord => {
    const records = userDB.getAll()
    
    // 检查是否已存在（按名字）
    const existing = records.find(r => r.name === user.name)
    
    const record: UserRecord = {
      ...user,
      id: existing?.id || Date.now().toString(),
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    }
    
    const updatedRecords = existing
      ? records.map(r => r.id === existing.id ? record : r)
      : [...records, record]
    
    localStorage.setItem(DB_KEY, JSON.stringify(updatedRecords))
    return record
  },

  /**
   * 按 ID 更新用户记录
   */
  updateById: (id: string, user: Partial<Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>>): UserRecord | undefined => {
    const records = userDB.getAll()
    const existing = records.find(r => r.id === id)
    
    if (!existing) return undefined
    
    const record: UserRecord = {
      ...existing,
      ...user,
      id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    }
    
    const updatedRecords = records.map(r => r.id === id ? record : r)
    localStorage.setItem(DB_KEY, JSON.stringify(updatedRecords))
    return record
  },

  /**
   * 获取所有记录
   */
  getAll: (): UserRecord[] => {
    try {
      const data = localStorage.getItem(DB_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  },

  /**
   * 按名字查询
   */
  getByName: (name: string): UserRecord | undefined => {
    return userDB.getAll().find(r => r.name === name)
  },

  /**
   * 按ID查询
   */
  getById: (id: string): UserRecord | undefined => {
    return userDB.getAll().find(r => r.id === id)
  },

  /**
   * 删除记录
   */
  delete: (id: string): void => {
    const records = userDB.getAll().filter(r => r.id !== id)
    localStorage.setItem(DB_KEY, JSON.stringify(records))
  },

  /**
   * 清空所有记录
   */
  clear: (): void => {
    localStorage.removeItem(DB_KEY)
  },
}
