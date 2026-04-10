/* ============================================================
   设置面板组件
   配置 API Key、模型选择等
   ============================================================ */

import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/stores'
import { Button, Input, Select } from '@/components/ui'
import type { ModelProvider } from '@/lib/llm'
import { PROVIDER_CONFIGS } from '@/lib/llm'
import { t } from '@/lib/i18n'

/* ------------------------------------------------------------
   厂商选项
   ------------------------------------------------------------ */

const API_DOCS: Record<ModelProvider, string> = {
  kimi: 'https://platform.moonshot.cn',
  gemini: 'https://aistudio.google.com/apikey',
  claude: 'https://console.anthropic.com',
  deepseek: 'https://platform.deepseek.com',
  custom: '',
}

/* ------------------------------------------------------------
   设置面板
   ------------------------------------------------------------ */

interface SettingsPanelProps {
  onClose?: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const {
    provider,
    providerSettings,
    enableThinking,
    enableWebSearch,
    searchApiKey,
    language,
    defaultChartType,
    starPlacementMethod,
    // 四化盤面設定
    transformationShowGods,
    transformationShowDailyMutagen,
    transformationShowTriremeEnlightenment,
    transformationUseColorMutagen,
    transformationShowAnnualAge,
    transformationShowCentralEightCharacters,
    transformationShowCentralFixBoard,
    transformationShowCausePalace,
    // 飛星盤面設定
    flyingShowGods,
    flyingShowMinorStars,
    flyingShowBodyPalace,
    flyingShowCausePalace,
    flyingShowCommandMutagen,
    flyingShowCentralFixBoard,
    flyingShowCentralEightCharacters,
    flyingUseColorMultiArrow,
    flyingShowTripleQuaternaryLine,
    // 方法
    setProvider,
    updateCurrentProvider,
    setEnableThinking,
    setEnableWebSearch,
    setSearchApiKey,
    setLanguage,
    setDefaultChartType,
    setStarPlacementMethod,
    // 四化盤面相關的setter
    setTransformationShowGods,
    setTransformationShowDailyMutagen,
    setTransformationShowTriremeEnlightenment,
    setTransformationUseColorMutagen,
    setTransformationShowAnnualAge,
    setTransformationShowCentralEightCharacters,
    setTransformationShowCentralFixBoard,
    setTransformationShowCausePalace,
    // 飛星盤面相關的setter
    setFlyingShowGods,
    setFlyingShowMinorStars,
    setFlyingShowBodyPalace,
    setFlyingShowCausePalace,
    setFlyingShowCommandMutagen,
    setFlyingShowCentralFixBoard,
    setFlyingShowCentralEightCharacters,
    setFlyingUseColorMultiArrow,
    setFlyingShowTripleQuaternaryLine,
  } = useSettingsStore()

  // 当前厂商的配置
  const currentSettings = providerSettings[provider]
  const [localApiKey, setLocalApiKey] = useState(currentSettings.apiKey)
  const [localBaseUrl, setLocalBaseUrl] = useState(currentSettings.customBaseUrl)
  const [localModel, setLocalModel] = useState(currentSettings.customModel)
  const [localSearchApiKey, setLocalSearchApiKey] = useState(searchApiKey)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pendingProvider, setPendingProvider] = useState<ModelProvider | null>(null)

  // 当 provider 改变时，重新同步本地状态
  useEffect(() => {
    setLocalApiKey(currentSettings.apiKey)
    setLocalBaseUrl(currentSettings.customBaseUrl)
    setLocalModel(currentSettings.customModel)
    setSaved(false)
  }, [provider, currentSettings])

  // 检查是否有未保存的修改
  const hasUnsavedChanges =
    localApiKey !== currentSettings.apiKey ||
    localBaseUrl !== currentSettings.customBaseUrl ||
    localModel !== currentSettings.customModel ||
    localSearchApiKey !== searchApiKey

  // 切换厂商时，检查是否有未保存修改
  const handleProviderChange = (newProvider: ModelProvider) => {
    if (newProvider === provider) return

    if (hasUnsavedChanges) {
      setPendingProvider(newProvider)
    } else {
      switchToProvider(newProvider)
    }
  }

  // 实际切换厂商
  const switchToProvider = (newProvider: ModelProvider) => {
    setProvider(newProvider)
    const newSettings = providerSettings[newProvider]
    setLocalApiKey(newSettings.apiKey)
    setLocalBaseUrl(newSettings.customBaseUrl)
    setLocalModel(newSettings.customModel)
    setPendingProvider(null)
  }

  // 保存并切换
  const handleSaveAndSwitch = () => {
    updateCurrentProvider({
      apiKey: localApiKey,
      customBaseUrl: localBaseUrl,
      customModel: localModel,
    })
    setSearchApiKey(localSearchApiKey)
    if (pendingProvider) {
      switchToProvider(pendingProvider)
    }
    onClose?.()
  }

  // 放弃修改并切换
  const handleDiscardAndSwitch = () => {
    if (pendingProvider) {
      switchToProvider(pendingProvider)
    }
  }

  // 当前厂商的默认配置
  const defaultConfig = PROVIDER_CONFIGS[provider]
  const docUrl = API_DOCS[provider]

  const handleSave = () => {
    updateCurrentProvider({
      apiKey: localApiKey,
      customBaseUrl: localBaseUrl,
      customModel: localModel,
    })
    setSearchApiKey(localSearchApiKey)
    setSaved(true)

    if (onClose) {
      onClose()
      return
    }

    setTimeout(() => setSaved(false), 2000)
  }

  // 判断是否有自定义值（用于高亮显示）
  const hasCustomBaseUrl = localBaseUrl.trim() !== ''
  const hasCustomModel = localModel.trim() !== ''

  return (
    <div className="glass p-4 sm:p-5 w-full max-w-[24rem] sm:max-w-[25.5rem] relative flex flex-col max-h-[85vh]">
      {/* 未保存修改确认对话框 */}
      {pendingProvider && (
        <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center z-10 p-4">
          <div className="bg-surface p-5 rounded-xl max-w-sm w-full space-y-4">
            <p className="text-text-secondary text-sm">
              {t('settings.unsavedChanges', language)}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleDiscardAndSwitch}
                className="flex-1 !bg-white/10 hover:!bg-white/20"
              >
                {t('settings.discardChanges', language)}
              </Button>
              <Button onClick={handleSaveAndSwitch} className="flex-1">
                {t('settings.saveAndSwitch', language)}
              </Button>
            </div>
            <button
              onClick={() => setPendingProvider(null)}
              className="w-full text-sm text-text-muted hover:text-text transition-colors"
            >
              {t('settings.cancel', language)}
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 sm:mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold">{t('settings.title', language)}</h2>
      </div>

      <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1 sm:pr-2 settings-scrollable flex-1">
        {/* 新增设置部分 */}
        <div className="border-t border-white/10 pt-3 space-y-3">
          {/* ① 介面語言 */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">{t('settings.language', language)}</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`
                    w-10 h-6 rounded-full relative transition-colors
                    ${language === 'zh-TW' ? 'bg-star' : 'bg-white/10'}
                  `}
                  onClick={() => setLanguage('zh-TW')}
                >
                  <div
                    className={`
                      absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white transition-transform
                      ${language === 'zh-TW' ? 'left-6' : 'left-1'}
                    `}
                  />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                  {t('settings.traditionalChinese', language)}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`
                    w-10 h-6 rounded-full relative transition-colors
                    ${language === 'zh-CN' ? 'bg-star' : 'bg-white/10'}
                  `}
                  onClick={() => setLanguage('zh-CN')}
                >
                  <div
                    className={`
                      absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white transition-transform
                      ${language === 'zh-CN' ? 'left-6' : 'left-1'}
                    `}
                  />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                  {t('settings.simplifiedChinese', language)}
                </span>
              </label>
            </div>
          </div>

          {/* 預設盤面 */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">② {t('settings.defaultChart', language).replace('② ', '')}</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`
                    w-10 h-6 rounded-full relative transition-colors
                    ${defaultChartType === 'flying' ? 'bg-star' : 'bg-white/10'}
                  `}
                  onClick={() => setDefaultChartType('flying')}
                >
                  <div
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${defaultChartType === 'flying' ? 'left-5' : 'left-1'}
                    `}
                  />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                  {t('settings.flyingChart', language)}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`
                    w-10 h-6 rounded-full relative transition-colors
                    ${defaultChartType === 'trireme' ? 'bg-star' : 'bg-white/10'}
                  `}
                  onClick={() => setDefaultChartType('trireme')}
                >
                  <div
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${defaultChartType === 'trireme' ? 'left-5' : 'left-1'}
                    `}
                  />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                  {t('settings.triremeChart', language)}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`
                    w-10 h-6 rounded-full relative transition-colors
                    ${defaultChartType === 'transformation' ? 'bg-star' : 'bg-white/10'}
                  `}
                  onClick={() => setDefaultChartType('transformation')}
                >
                  <div
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${defaultChartType === 'transformation' ? 'left-5' : 'left-1'}
                    `}
                  />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                  {t('settings.transformationChart', language)}
                </span>
              </label>
            </div>
          </div>

          {/* 安星法 */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">③ {t('settings.starPlacement', language).replace('③ ', '')}</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`
                    w-10 h-6 rounded-full relative transition-colors
                    ${starPlacementMethod === 'yearBranch' ? 'bg-star' : 'bg-white/10'}
                  `}
                  onClick={() => setStarPlacementMethod('yearBranch')}
                >
                  <div
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${starPlacementMethod === 'yearBranch' ? 'left-5' : 'left-1'}
                    `}
                  />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                  {t('settings.yearBranch', language)}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`
                    w-10 h-6 rounded-full relative transition-colors
                    ${starPlacementMethod === 'lunarMonth' ? 'bg-star' : 'bg-white/10'}
                  `}
                  onClick={() => setStarPlacementMethod('lunarMonth')}
                >
                  <div
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${starPlacementMethod === 'lunarMonth' ? 'left-5' : 'left-1'}
                    `}
                  />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                  {t('settings.lunarMonth', language)}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`
                    w-10 h-6 rounded-full relative transition-colors
                    ${starPlacementMethod === 'standardArrangement' ? 'bg-star' : 'bg-white/10'}
                  `}
                  onClick={() => setStarPlacementMethod('standardArrangement')}
                >
                  <div
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${starPlacementMethod === 'standardArrangement' ? 'left-5' : 'left-1'}
                    `}
                  />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                  {t('settings.standardArrangement', language)}
                </span>
              </label>
            </div>
          </div>

          {/* 四化盤面設定 */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">④ {t('settings.transformation', language)}</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${transformationShowGods ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setTransformationShowGods(!transformationShowGods)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${transformationShowGods ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showGods', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${transformationShowDailyMutagen ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setTransformationShowDailyMutagen(!transformationShowDailyMutagen)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${transformationShowDailyMutagen ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showDailyMutagen', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${transformationShowTriremeEnlightenment ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setTransformationShowTriremeEnlightenment(!transformationShowTriremeEnlightenment)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${transformationShowTriremeEnlightenment ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showCentralEightCharacters', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${transformationUseColorMutagen ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setTransformationUseColorMutagen(!transformationUseColorMutagen)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${transformationUseColorMutagen ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.useColorMutagen', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${transformationShowAnnualAge ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setTransformationShowAnnualAge(!transformationShowAnnualAge)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${transformationShowAnnualAge ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showAnnualAge', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${transformationShowCentralEightCharacters ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setTransformationShowCentralEightCharacters(!transformationShowCentralEightCharacters)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${transformationShowCentralEightCharacters ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showCentralEightCharacters', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${transformationShowCentralFixBoard ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setTransformationShowCentralFixBoard(!transformationShowCentralFixBoard)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${transformationShowCentralFixBoard ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showCentralFixBoard', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${transformationShowCausePalace ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setTransformationShowCausePalace(!transformationShowCausePalace)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${transformationShowCausePalace ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showCausePalace', language)}</span>
              </label>
            </div>
          </div>

          {/* 飛星盤面設定 */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">⑤ {t('settings.flying', language)}</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${flyingShowGods ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setFlyingShowGods(!flyingShowGods)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${flyingShowGods ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showGods', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${flyingShowMinorStars ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setFlyingShowMinorStars(!flyingShowMinorStars)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${flyingShowMinorStars ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showMinorStars', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${flyingShowBodyPalace ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setFlyingShowBodyPalace(!flyingShowBodyPalace)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${flyingShowBodyPalace ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showBodyPalace', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${flyingShowCausePalace ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setFlyingShowCausePalace(!flyingShowCausePalace)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${flyingShowCausePalace ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showCausePalace', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${flyingShowCommandMutagen ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setFlyingShowCommandMutagen(!flyingShowCommandMutagen)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${flyingShowCommandMutagen ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showCommandMutagen', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${flyingShowCentralFixBoard ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setFlyingShowCentralFixBoard(!flyingShowCentralFixBoard)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${flyingShowCentralFixBoard ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showCentralFixBoard', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${flyingShowCentralEightCharacters ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setFlyingShowCentralEightCharacters(!flyingShowCentralEightCharacters)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${flyingShowCentralEightCharacters ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showCentralEightCharacters', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${flyingUseColorMultiArrow ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setFlyingUseColorMultiArrow(!flyingUseColorMultiArrow)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${flyingUseColorMultiArrow ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.useColorMultiArrow', language)}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${flyingShowTripleQuaternaryLine ? 'bg-star' : 'bg-white/10'}`}
                  onClick={() => setFlyingShowTripleQuaternaryLine(!flyingShowTripleQuaternaryLine)}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${flyingShowTripleQuaternaryLine ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">{t('settings.showTripleQuaternaryLine', language)}</span>
              </label>
            </div>
          </div>
        </div>

        {/* AI 提供廠商 */}
        <div className="border-t border-white/10 pt-3 space-y-3">
          <h3 className="text-sm font-medium text-text-secondary mb-2">⑥ {t('settings.aiProvider', language)}</h3>
          
          {/* 供應商選擇 */}
          <Select
            label={t('settings.provider', language)}
            options={[
              { value: 'kimi', label: t('settings.providerKimi', language) },
              { value: 'gemini', label: t('settings.providerGemini', language) },
              { value: 'claude', label: t('settings.providerClaude', language) },
              { value: 'deepseek', label: t('settings.providerDeepseek', language) },
              { value: 'custom', label: t('settings.providerCustom', language) },
            ]}
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as ModelProvider)}
          />

          {/* API Key */}
          <Input
            label={t('settings.apiKey', language)}
            type="password"
            placeholder={t('settings.apiKeyPlaceholder', language)}
            value={localApiKey}
            onChange={(e) => setLocalApiKey(e.target.value)}
          />

          {/* API 文档链接 */}
          {docUrl && (
            <p className="text-sm text-text-muted">
              {t('settings.getApiKey', language)}:{' '}
              <a href={docUrl} target="_blank" rel="noopener" className="text-star hover:underline">
                {docUrl.replace('https://', '')}
              </a>
            </p>
          )}
          
          {/* 當前供應商顯示 */}
          <p className="text-sm text-text-secondary px-3 py-2 rounded bg-white/5 border border-white/10">
            {t('settings.current', language)}: <span className="text-star font-medium">{(() => {
              const providerKeyMap: Record<ModelProvider, string> = {
                'kimi': 'settings.providerKimi',
                'gemini': 'settings.providerGemini',
                'claude': 'settings.providerClaude',
                'deepseek': 'settings.providerDeepseek',
                'custom': 'settings.providerCustom',
              };
              return t(providerKeyMap[provider] || 'settings.providerKimi', language);
            })()}</span>
          </p>
        </div>

        {/* 高级设置 */}
        <div className="border-t border-white/10 pt-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors w-full"
          >
            <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
            {t('settings.advanced', language)}
            {(hasCustomBaseUrl || hasCustomModel) && (
              <span className="text-sm text-amber px-1.5 py-0.5 rounded bg-amber/10">{t('settings.modified', language)}</span>
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4">
              {/* BaseURL */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  {t('settings.baseUrl', language)}
                  {hasCustomBaseUrl && <span className="text-amber ml-2 text-sm">{t('settings.baseUrlOverride', language)}</span>}
                </label>
                <input
                  type="text"
                  placeholder={defaultConfig.baseUrl}
                  value={localBaseUrl}
                  onChange={(e) => setLocalBaseUrl(e.target.value)}
                  className={`
                    w-full px-3 py-2 rounded-lg text-sm
                    bg-white/5 border transition-colors
                    placeholder:text-text-muted/50
                    focus:outline-none focus:ring-1
                    ${hasCustomBaseUrl
                      ? 'border-amber/50 focus:border-amber focus:ring-amber/30 text-text'
                      : 'border-white/10 focus:border-star focus:ring-star/30 text-text-secondary'
                    }
                  `}
                />
                <p className="text-sm text-text-muted mt-1">
                  {t('settings.default', language)}: {defaultConfig.baseUrl}
                </p>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  {t('settings.model', language)}
                  {hasCustomModel && <span className="text-amber ml-2 text-sm">{t('settings.modelOverride', language)}</span>}
                </label>
                <input
                  type="text"
                  placeholder={defaultConfig.defaultModel}
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  className={`
                    w-full px-3 py-2 rounded-lg text-sm
                    bg-white/5 border transition-colors
                    placeholder:text-text-muted/50
                    focus:outline-none focus:ring-1
                    ${hasCustomModel
                      ? 'border-amber/50 focus:border-amber focus:ring-amber/30 text-text'
                      : 'border-white/10 focus:border-star focus:ring-star/30 text-text-secondary'
                    }
                  `}
                />
                <p className="text-sm text-text-muted mt-1">
                  {t('settings.default', language)}: {defaultConfig.defaultModel}
                </p>
              </div>

              {/* 思考模式开关 */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`
                    w-10 h-6 rounded-full relative transition-colors
                    ${enableThinking ? 'bg-star' : 'bg-white/10'}
                  `}
                  onClick={() => setEnableThinking(!enableThinking)}
                >
                  <div
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${enableThinking ? 'left-5' : 'left-1'}
                    `}
                  />
                </div>
                <div>
                  <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                    {t('settings.thinking', language)}
                  </span>
                  <p className="text-sm text-text-muted">
                    {t('settings.thinkingHint', language)}
                  </p>
                </div>
              </label>

              {/* 联网搜索开关 */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`
                    w-10 h-6 rounded-full relative transition-colors
                    ${enableWebSearch ? 'bg-star' : 'bg-white/10'}
                  `}
                  onClick={() => setEnableWebSearch(!enableWebSearch)}
                >
                  <div
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${enableWebSearch ? 'left-5' : 'left-1'}
                    `}
                  />
                </div>
                <div>
                  <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                    {t('settings.webSearch', language)}
                  </span>
                  <p className="text-sm text-text-muted">
                    {provider === 'kimi' || provider === 'gemini'
                      ? t('settings.webSearchHint', language)
                      : t('settings.webSearchHintTavily', language)}
                  </p>
                </div>
              </label>

              {/* Tavily API Key (非 Kimi/Gemini 显示) */}
              {enableWebSearch && provider !== 'kimi' && provider !== 'gemini' && (
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">
                    {t('settings.searchApiKey', language)}
                    {localSearchApiKey.trim() && <span className="text-amber ml-2 text-sm">{t('settings.configured', language)}</span>}
                  </label>
                  <input
                    type="password"
                    placeholder={t('settings.tavilyApiKeyPlaceholder', language)}
                    value={localSearchApiKey}
                    onChange={(e) => setLocalSearchApiKey(e.target.value)}
                    className={`
                      w-full px-3 py-2 rounded-lg text-sm
                      bg-white/5 border transition-colors
                      placeholder:text-text-muted/50
                      focus:outline-none focus:ring-1
                      ${localSearchApiKey.trim()
                        ? 'border-amber/50 focus:border-amber focus:ring-amber/30 text-text'
                        : 'border-white/10 focus:border-star focus:ring-star/30 text-text-secondary'
                      }
                    `}
                  />
                  <p className="text-sm text-text-muted mt-1">
                    {t('settings.getApiKey', language)}:{' '}
                    <a
                      href="https://tavily.com"
                      target="_blank"
                      rel="noopener"
                      className="text-star hover:underline"
                    >
                      tavily.com
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 隐私提示 */}
        <p className="text-sm text-text-muted text-center">
          {t('settings.privacyHint', language)}
        </p>
      </div>

      {/* 保存/取消按钮 - 在容器外 */}
      <div className="flex gap-2.5 mt-3 pt-3 border-t border-white/10">
        <Button 
          onClick={handleSave} 
          variant="gold"
          size="md"
          className="flex-1"
        >
          {saved ? t('settings.saved', language) : hasUnsavedChanges ? t('settings.saveAsterisk', language) : t('settings.save', language)}
        </Button>
        <button
          onClick={() => onClose?.()}
          className="flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all bg-white/[0.06] hover:bg-white/[0.1] text-text-secondary hover:text-text border border-white/[0.1]"
        >
          {t('settings.cancel', language)}
        </button>
      </div>
    </div>
  )
}
