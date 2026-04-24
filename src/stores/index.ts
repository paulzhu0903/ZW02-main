/* ============================================================
   全局状态管理
   ============================================================ */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FunctionalAstrolabe } from '@/lib/astro'
import type { BirthInfo } from '@/lib/astro'
import type { LifetimeKLinePoint } from '@/lib/fortune-score'
import type { UserRecord } from '@/lib/db'

/* ------------------------------------------------------------
   命盘状态
   ------------------------------------------------------------ */

interface ChartState {
  birthInfo: BirthInfo | null
  chart: FunctionalAstrolabe | null
  // 从数据库加载的记录信息，用于表单初始化
  recordToLoad: UserRecord | null
  setBirthInfo: (info: BirthInfo) => void
  setChart: (chart: FunctionalAstrolabe | null) => void
  setRecordToLoad: (record: UserRecord | null) => void
  clear: () => void
}

export const useChartStore = create<ChartState>()((set) => ({
  birthInfo: null,
  chart: null,
  recordToLoad: null,
  setBirthInfo: (info) => set({ birthInfo: info }),
  setChart: (chart) => set({ chart }),
  setRecordToLoad: (record) => set({ recordToLoad: record }),
  clear: () => {
    set({ birthInfo: null, chart: null, recordToLoad: null })
    // 同时清除内容缓存
    useContentCacheStore.getState().clearAll()
  },
}))

/* ------------------------------------------------------------
   内容缓存状态 (AI解读、K线等)
   ------------------------------------------------------------ */

interface KLineCache {
  lifetime: LifetimeKLinePoint[]  // 1-100 岁完整数据
  isGenerating: boolean           // 是否正在生成 reason
}

interface ContentCacheState {
  // AI 命盤解讀
  aiInterpretation: string | null
  setAiInterpretation: (content: string) => void

  // 年度運勢解讀 (按年份緩存)
  yearlyFortune: Record<number, string>
  setYearlyFortune: (year: number, content: string) => void

  // 年度運勢 Prompt 顯示狀態
  showYearlyFortunePrompt: boolean
  setShowYearlyFortunePrompt: (show: boolean) => void

  // K 線數據
  klineCache: KLineCache | null
  setKlineCache: (cache: KLineCache) => void
  updateKlineReasons: (reasons: { age: number; reason: string }[]) => void
  setKlineGenerating: (isGenerating: boolean) => void

  // 清除所有緩存
  clearAll: () => void
}

export const useContentCacheStore = create<ContentCacheState>()((set) => ({
  aiInterpretation: null,
  yearlyFortune: {},
  showYearlyFortunePrompt: false,
  klineCache: null,

  setAiInterpretation: (content) => set({ aiInterpretation: content }),

  setYearlyFortune: (year, content) => set((state) => ({
    yearlyFortune: { ...state.yearlyFortune, [year]: content },
  })),

  setShowYearlyFortunePrompt: (show) => set({ showYearlyFortunePrompt: show }),

  setKlineCache: (cache) => set({ klineCache: cache }),

  updateKlineReasons: (reasons) => set((state) => {
    if (!state.klineCache) return state
    const updatedLifetime = state.klineCache.lifetime.map(point => {
      const found = reasons.find(r => r.age === point.age)
      return found ? { ...point, reason: found.reason } : point
    })
    return {
      klineCache: {
        ...state.klineCache,
        lifetime: updatedLifetime,
        isGenerating: false,
      },
    }
  }),

  setKlineGenerating: (isGenerating) => set((state) => {
    if (!state.klineCache) return state
    return {
      klineCache: { ...state.klineCache, isGenerating },
    }
  }),

  clearAll: () => set({
    aiInterpretation: null,
    yearlyFortune: {},
    showYearlyFortunePrompt: false,
    klineCache: null,
  }),
}))

/* ------------------------------------------------------------
   设置状态
   ------------------------------------------------------------ */

type ModelProvider = 'kimi' | 'gemini' | 'claude' | 'deepseek' | 'custom'

interface ProviderSettings {
  apiKey: string
  customBaseUrl: string
  customModel: string
}

const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  apiKey: '',
  customBaseUrl: '',
  customModel: '',
}

interface SettingsState {
  provider: ModelProvider
  providerSettings: Record<ModelProvider, ProviderSettings>
  enableThinking: boolean
  enableWebSearch: boolean   // 启用联网搜索
  searchApiKey: string       // 第三方搜索 API (Tavily)
  
  // 新设置选项
  language: 'zh-CN' | 'zh-TW'   // 介面語言: 简体中文 | 繁體中文
  defaultChartType: 'flying' | 'trireme' | 'transformation'  // 預設盤面: 飛星 | 三合 | 四化
  currentChartType: 'flying' | 'trireme' | 'transformation'  // 當前選中的盤面類型（動態改變）
  starPlacementMethod: 'yearBranch' | 'lunarMonth' | 'standardArrangement'  // 安星法
  monthlyArrangementMethod: 'yuanYuePositioning' | 'douJun'  // 排流月: 正月定位法 | 斗君法

  // 四化盤面設定
  transformationShowGods: boolean
  transformationShowDailyMutagen: boolean
  transformationShowTriremeEnlightenment: boolean
  transformationUseColorMutagen: boolean
  transformationShowAnnualAge: boolean
  transformationShowCentralEightCharacters: boolean
  transformationShowCentralFixBoard: boolean
  transformationShowCausePalace: boolean
  transformationHideMinorStars: boolean  // 隱藏輔星和雜曜（左輔、右弼、文昌、文曲除外）

  // 飛星盤面設定
  flyingShowGods: boolean
  flyingShowMinorStars: boolean
  flyingShowBodyPalace: boolean
  flyingShowCausePalace: boolean
  flyingShowCommandMutagen: boolean
  flyingShowCentralFixBoard: boolean
  flyingShowCentralEightCharacters: boolean
  flyingUseColorMultiArrow: boolean
  flyingShowTripleQuaternaryLine: boolean

  // 三合盤面設定
  triremeShowStarBrightness: boolean

  setProvider: (provider: ModelProvider) => void
  updateCurrentProvider: (settings: Partial<ProviderSettings>) => void
  setEnableThinking: (enable: boolean) => void
  setEnableWebSearch: (enable: boolean) => void
  setSearchApiKey: (key: string) => void
  setLanguage: (language: 'zh-CN' | 'zh-TW') => void
  setDefaultChartType: (type: 'flying' | 'trireme' | 'transformation') => void
  setCurrentChartType: (type: 'flying' | 'trireme' | 'transformation') => void
  setStarPlacementMethod: (method: 'yearBranch' | 'lunarMonth' | 'standardArrangement') => void
  setMonthlyArrangementMethod: (method: 'yuanYuePositioning' | 'douJun') => void

  // 四化盤面相關的setter
  setTransformationShowGods: (value: boolean) => void
  setTransformationShowDailyMutagen: (value: boolean) => void
  setTransformationShowTriremeEnlightenment: (value: boolean) => void
  setTransformationUseColorMutagen: (value: boolean) => void
  setTransformationShowAnnualAge: (value: boolean) => void
  setTransformationShowCentralEightCharacters: (value: boolean) => void
  setTransformationShowCentralFixBoard: (value: boolean) => void
  setTransformationShowCausePalace: (value: boolean) => void
  setTransformationHideMinorStars: (value: boolean) => void

  // 飛星盤面相關的setter
  setFlyingShowGods: (value: boolean) => void
  setFlyingShowMinorStars: (value: boolean) => void
  setFlyingShowBodyPalace: (value: boolean) => void
  setFlyingShowCausePalace: (value: boolean) => void
  setFlyingShowCommandMutagen: (value: boolean) => void
  setFlyingShowCentralFixBoard: (value: boolean) => void
  setFlyingShowCentralEightCharacters: (value: boolean) => void
  setFlyingUseColorMultiArrow: (value: boolean) => void
  setFlyingShowTripleQuaternaryLine: (value: boolean) => void

  // 三合盤面相關的setter
  setTriremeShowStarBrightness: (value: boolean) => void

  // 便捷访问当前厂商配置
  getCurrentSettings: () => ProviderSettings
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      provider: 'kimi',
      providerSettings: {
        kimi: { ...DEFAULT_PROVIDER_SETTINGS },
        gemini: { ...DEFAULT_PROVIDER_SETTINGS },
        claude: { ...DEFAULT_PROVIDER_SETTINGS },
        deepseek: { ...DEFAULT_PROVIDER_SETTINGS },
        custom: { ...DEFAULT_PROVIDER_SETTINGS },
      },
      enableThinking: false,
      enableWebSearch: false,
      searchApiKey: '',
      language: 'zh-TW',
      defaultChartType: 'flying',
      currentChartType: 'flying',
      starPlacementMethod: 'yearBranch',
      monthlyArrangementMethod: 'douJun',

      // 四化盤面設定
      transformationShowGods: false,
      transformationShowDailyMutagen: false,
      transformationShowTriremeEnlightenment: false,
      transformationUseColorMutagen: false,
      transformationShowAnnualAge: true,
      transformationShowCentralEightCharacters: true,
      transformationShowCentralFixBoard: true,
      transformationShowCausePalace: true,
      transformationHideMinorStars: false,

      // 飛星盤面設定
      flyingShowGods: true,
      flyingShowMinorStars: false,
      flyingShowBodyPalace: false,
      flyingShowCausePalace: true,
      flyingShowCommandMutagen: true,
      flyingShowCentralFixBoard: false,
      flyingShowCentralEightCharacters: true,
      flyingUseColorMultiArrow: true,
      flyingShowTripleQuaternaryLine: true,

      // 三合盤面設定
      triremeShowStarBrightness: true,

      setProvider: (provider) => set({ provider }),

      updateCurrentProvider: (settings) => set((state) => ({
        providerSettings: {
          ...state.providerSettings,
          [state.provider]: {
            ...state.providerSettings[state.provider],
            ...settings,
          },
        },
      })),

      setEnableThinking: (enable) => set({ enableThinking: enable }),
      setEnableWebSearch: (enable) => set({ enableWebSearch: enable }),
      setSearchApiKey: (key) => set({ searchApiKey: key }),
      setLanguage: (language) => set({ language }),
      setDefaultChartType: (type) => set({ defaultChartType: type }),
      setCurrentChartType: (type) => set({ currentChartType: type }),
      setStarPlacementMethod: (method) => set({ starPlacementMethod: method }),
      setMonthlyArrangementMethod: (method) => set({ monthlyArrangementMethod: method }),

      // 四化盤面相關的setter
      setTransformationShowGods: (value) => set({ transformationShowGods: value }),
      setTransformationShowDailyMutagen: (value) => set({ transformationShowDailyMutagen: value }),
      setTransformationShowTriremeEnlightenment: (value) => set({ transformationShowTriremeEnlightenment: value }),
      setTransformationUseColorMutagen: (value) => set({ transformationUseColorMutagen: value }),
      setTransformationShowAnnualAge: (value) => set({ transformationShowAnnualAge: value }),
      setTransformationShowCentralEightCharacters: (value) => set({ transformationShowCentralEightCharacters: value }),
      setTransformationShowCentralFixBoard: (value) => set({ transformationShowCentralFixBoard: value }),
      setTransformationShowCausePalace: (value) => set({ transformationShowCausePalace: value }),
      setTransformationHideMinorStars: (value) => set({ transformationHideMinorStars: value }),

      // 飛星盤面相關的setter
      setFlyingShowGods: (value) => set({ flyingShowGods: value }),
      setFlyingShowMinorStars: (value) => set({ flyingShowMinorStars: value }),
      setFlyingShowBodyPalace: (value) => set({ flyingShowBodyPalace: value }),
      setFlyingShowCausePalace: (value) => set({ flyingShowCausePalace: value }),
      setFlyingShowCommandMutagen: (value) => set({ flyingShowCommandMutagen: value }),
      setFlyingShowCentralFixBoard: (value) => set({ flyingShowCentralFixBoard: value }),
      setFlyingShowCentralEightCharacters: (value) => set({ flyingShowCentralEightCharacters: value }),
      setFlyingUseColorMultiArrow: (value) => set({ flyingUseColorMultiArrow: value }),
      setFlyingShowTripleQuaternaryLine: (value) => set({ flyingShowTripleQuaternaryLine: value }),

      // 三合盤面相關的setter
      setTriremeShowStarBrightness: (value) => set({ triremeShowStarBrightness: value }),

      getCurrentSettings: () => {
        const state = get()
        return state.providerSettings[state.provider]
      },
    }),
    {
      name: 'ziwei-settings',
    }
  )
)
