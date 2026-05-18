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
   共用設定元件
   ------------------------------------------------------------ */

function SettingToggle({ children, checked, onChange }: { children: React.ReactNode, checked: boolean, onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 cursor-pointer group" onClick={onChange}>
      <div className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${checked ? 'bg-star' : 'bg-white/10'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-5' : 'left-1'}`} />
      </div>
      <div className="text-sm text-text-secondary group-hover:text-text transition-colors select-none">
        {children}
      </div>
    </div>
  )
}

function SettingRadio({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <div className="flex items-center gap-3 cursor-pointer group" onClick={onClick}>
      <div className={`w-5 h-5 rounded-full relative transition-colors shrink-0 border-2 ${active ? 'border-star bg-star/10' : 'border-white/30'}`}>
        {active && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-star" />
        )}
      </div>
      <div className="text-sm text-text-secondary group-hover:text-text transition-colors select-none">
        {children}
      </div>
    </div>
  )
}

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
    transformationShowCausePalace,
    transformationShowMinorStars,
    showPalaceTransformation,
    // 飛星盤面設定
    flyingShowGods,
    flyingShowMinorStars,
    flyingShowBodyPalace,
    flyingShowCausePalace,
    // 三合盤面設定
    triremeShowStarBrightness,
    triremeShowMinorStars,
    // 動畫設定
    arcFlowAnimationEnabled,
    lineExtensionAnimationEnabled,
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
    setTransformationShowCausePalace,
    setTransformationShowMinorStars,
    setShowPalaceTransformation,
    // 飛星盤面相關的setter
    setFlyingShowGods,
    setFlyingShowMinorStars,
    setFlyingShowBodyPalace,
    setFlyingShowCausePalace,
    // 三合盤面相關的setter
    setTriremeShowStarBrightness,
    setTriremeShowMinorStars,
    // 動畫設定相關的setter
    setArcFlowAnimationEnabled,
    setLineExtensionAnimationEnabled,
    // 中宮顯示相關
    showCenterInfo,
    setShowCenterInfo,
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
    <div className="glass p-4 sm:p-5 w-full max-w-[24rem] md:max-w-[48rem] relative flex flex-col max-h-[85vh]">
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

      <div className="max-h-[68vh] overflow-y-auto pr-1 sm:pr-2 settings-scrollable flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* 左側欄：一般設定與系統 */}
          <div className="space-y-4">
            <div className="border-t border-white/10 pt-3 space-y-3">
              {/* 1. 介面語言 */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">{t('settings.language', language)}</h3>
            <div className="space-y-2">
              <SettingRadio active={language === 'zh-TW'} onClick={() => setLanguage('zh-TW')}>
                {t('settings.traditionalChinese', language)}
              </SettingRadio>
              <SettingRadio active={language === 'zh-CN'} onClick={() => setLanguage('zh-CN')}>
                {t('settings.simplifiedChinese', language)}
              </SettingRadio>
            </div>
          </div>

          {/* 2. 預設盤面 */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2"> {t('settings.defaultChart', language)}</h3>
            <div className="space-y-2">
              <SettingRadio active={defaultChartType === 'flying'} onClick={() => setDefaultChartType('flying')}>
                {t('settings.flyingChart', language)}
              </SettingRadio>
              <SettingRadio active={defaultChartType === 'trireme'} onClick={() => setDefaultChartType('trireme')}>
                {t('settings.triremeChart', language)}
              </SettingRadio>
              <SettingRadio active={defaultChartType === 'transformation'} onClick={() => setDefaultChartType('transformation')}>
                {t('settings.transformationChart', language)}
              </SettingRadio>
            </div>
          </div>

          {/* 安星法 */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">{t('settings.starPlacement', language)}</h3>
            <div className="space-y-2">
              <SettingRadio active={starPlacementMethod === 'yearBranch'} onClick={() => setStarPlacementMethod('yearBranch')}>
                {t('settings.yearBranch', language)}
              </SettingRadio>
              <SettingRadio active={starPlacementMethod === 'lunarMonth'} onClick={() => setStarPlacementMethod('lunarMonth')}>
                {t('settings.lunarMonth', language)}
              </SettingRadio>
              <SettingRadio active={starPlacementMethod === 'standardArrangement'} onClick={() => setStarPlacementMethod('standardArrangement')}>
                {t('settings.standardArrangement', language)}
              </SettingRadio>
            </div>
          </div>
        </div>

    {/* 右側欄：各盤面詳細設定 */}
      <div className="space-y-4">
        <div className="border-t border-white/10 pt-1 space-y-4">

        {/* 中宮顯示設定 */}
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-2">{language === 'zh-TW' ? '中宮顯示' : '中宫显示'}</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-10 h-6 rounded-full relative transition-colors ${showCenterInfo ? 'bg-star' : 'bg-white/10'}`}
                onClick={() => setShowCenterInfo(!showCenterInfo)}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${showCenterInfo ? 'left-5' : 'left-1'}`} />
              </div>
              <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                {language === 'zh-TW' ? '顯示中宮資訊' : '显示中宫信息'}
              </span>
            </label>
          </div>
        </div>

        {/* 四化盤面設定 */}
        <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">{t('settings.transformation', language)}</h3>
            <div className="space-y-2">
              <SettingToggle checked={transformationShowGods} onChange={() => setTransformationShowGods(!transformationShowGods)}>
                {t('settings.showGods', language)}
              </SettingToggle>

              <SettingToggle checked={transformationShowMinorStars} onChange={() => setTransformationShowMinorStars(!transformationShowMinorStars)}>
                {t('settings.showMinorStars', language)}
              </SettingToggle>

              <SettingToggle checked={transformationShowCausePalace} onChange={() => setTransformationShowCausePalace(!transformationShowCausePalace)}>
                {t('settings.showCausePalace', language)}
              </SettingToggle>

              <SettingToggle checked={showPalaceTransformation} onChange={() => setShowPalaceTransformation(!showPalaceTransformation)}>
                {t('settings.showPalaceTransformation', language)}
              </SettingToggle>

            </div>
          </div>

     

          {/* 飛星盤面設定 */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">{t('settings.flying', language)}</h3>
            <div className="space-y-2">
              <SettingToggle checked={flyingShowGods} onChange={() => setFlyingShowGods(!flyingShowGods)}>
                {t('settings.showGods', language)}
              </SettingToggle>

              <SettingToggle checked={flyingShowMinorStars} onChange={() => setFlyingShowMinorStars(!flyingShowMinorStars)}>
                {t('settings.showMinorStars', language)}
              </SettingToggle>

              <SettingToggle checked={flyingShowBodyPalace} onChange={() => setFlyingShowBodyPalace(!flyingShowBodyPalace)}>
                {t('settings.showBodyPalace', language)}
              </SettingToggle>

              <SettingToggle checked={flyingShowCausePalace} onChange={() => setFlyingShowCausePalace(!flyingShowCausePalace)}>
                {t('settings.showCausePalace', language)}
              </SettingToggle>
            </div>
          </div>

          {/* 三合盤面設定 */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">{t('settings.trireme', language)}</h3>
            <div className="space-y-2">
              <SettingToggle checked={triremeShowStarBrightness} onChange={() => setTriremeShowStarBrightness(!triremeShowStarBrightness)}>
                {t('settings.showStarBrightness', language)}
              </SettingToggle>
              <SettingToggle checked={triremeShowMinorStars} onChange={() => setTriremeShowMinorStars(!triremeShowMinorStars)}>
                {t('settings.showMinorStars', language)}
              </SettingToggle>
            </div>
          </div>
        </div>
      </div>

        {/* 動畫效果設定 */}
        <div className="border-t border-white/10 pt-3 space-y-3">
          <h3 className="text-sm font-medium text-text-secondary mb-2">{language === 'zh-TW' ? '動畫效果' : '动画效果'}</h3>
          <div className="space-y-2">
            {/* 弧線流動效果 */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-10 h-6 rounded-full relative transition-colors ${arcFlowAnimationEnabled ? 'bg-star' : 'bg-white/10'}`}
                onClick={() => setArcFlowAnimationEnabled(!arcFlowAnimationEnabled)}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${arcFlowAnimationEnabled ? 'left-5' : 'left-1'}`} />
              </div>
              <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                {language === 'zh-TW' ? '弧線的流動效果' : '弧线的流动效果'}
              </span>
            </label>
            {/* 動畫延伸效果 */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-10 h-6 rounded-full relative transition-colors ${lineExtensionAnimationEnabled ? 'bg-star' : 'bg-white/10'}`}
                onClick={() => setLineExtensionAnimationEnabled(!lineExtensionAnimationEnabled)}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${lineExtensionAnimationEnabled ? 'left-5' : 'left-1'}`} />
              </div>
              <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                {language === 'zh-TW' ? '弧線及實線的動畫延伸效果' : '弧线及实线的动画延伸效果'}
              </span>
            </label>
          </div>
        </div>

        

        {/* AI 提供廠商 */}
        <div className="border-t border-white/10 pt-3 space-y-3">
          <h3 className="text-sm font-medium text-text-secondary mb-2">{t('settings.aiProvider', language)}</h3>
          
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
      </div>

     
    </div>

    {/* 隐私提示 */}
    <p className="text-sm text-text-muted text-center mt-6 border-t border-white/10 pt-4">
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
