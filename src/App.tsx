/* ============================================================
   紫微斗数 App - 主入口
   高级玻璃态设计 + 精致导航交互
   ============================================================ */

import { useState } from 'react'
import { BirthForm } from '@/components/BirthForm'
import { ChartDisplay } from '@/components/chart'
import { AIInterpretation } from '@/components/AIInterpretation'
import { SettingsPanel } from '@/components/SettingsPanel'
import { YearlyFortune } from '@/components/fortune'
import { LifeKLine } from '@/components/kline'
import { MatchAnalysis } from '@/components/match'
import { ShareCard } from '@/components/share'
import { UserDatabaseModal } from '@/components/UserDatabaseModal'
import { useChartStore, useSettingsStore } from '@/stores'
import type { UserRecord } from '@/lib/db'
import { generateChart } from '@/lib/astro'
import { t } from '@/lib/i18n'

type TabType = 'chart' | 'fortune' | 'kline' | 'match' | 'share'

const TABS_CONFIG: Array<{ key: TabType; labelKey: string; icon: string }> = [
  { key: 'chart', labelKey: 'nav.chart', icon: '☰' },
  { key: 'fortune', labelKey: 'nav.fortune', icon: '◎' },
  { key: 'kline', labelKey: 'nav.kline', icon: '⊹' },
  { key: 'match', labelKey: 'nav.match', icon: '⚭' },
  { key: 'share', labelKey: 'nav.share', icon: '◈' },
]

export default function App() {
  const { chart, setBirthInfo, setChart, setRecordToLoad } = useChartStore()
  const { language } = useSettingsStore()
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('chart')
  const [isDbModalOpen, setIsDbModalOpen] = useState(false)

  // 动态生成翻译后的标签
  const TABS = TABS_CONFIG.map(tab => ({
    ...tab,
    label: t(tab.labelKey, language)
  }))

  const handleSelectExample = (record: UserRecord) => {
    setBirthInfo({
      year: record.year,
      month: record.month,
      day: record.day,
      hour: record.hour,
      gender: record.gender,
      name: record.name,
    })
    const newChart = generateChart({
      year: record.year,
      month: record.month,
      day: record.day,
      hour: record.hour,
      gender: record.gender,
      name: record.name,
    })
    setChart(newChart)
    setActiveTab('chart')
    setIsDbModalOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Aurora 极光背景 */}
      <div className="aurora-bg" />
      {/* 星点背景 */}
      <div className="star-bg" />

      {/* 头部 - 毛玻璃导航 */}
      <header
        className="
          hidden md:block sticky top-0 z-40
          py-4 px-6 lg:px-12
          bg-night/80 backdrop-blur-xl
          border-b border-white/[0.06]
        "
      >
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          {/* Logo + 导航 */}
          <div className="flex items-center gap-4 sm:gap-10">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {/* Logo 图标 */}
              <div
                className="
                  relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl
                  bg-gradient-to-br from-star/20 to-gold/20
                  border border-white/[0.1]
                  flex items-center justify-center
                  shadow-[0_0_20px_rgba(124,58,237,0.2)]
                "
              >
                <span className="text-lg text-gold">☆</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-star/10 to-transparent animate-pulse" />
              </div>
              {/* Logo 文字 */}
              <div>
                <h1
                  className="
                    text-[12pt] sm:text-[13pt] md:text-[14pt] font-bold
                    bg-gradient-to-r from-star-light via-gold to-star-light
                    bg-clip-text text-transparent
                    bg-[length:200%_auto] animate-[shimmer_4s_ease-in-out_infinite]
                  "
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {t('app.title', language)}
                </h1>
                <p className="text-text-muted text-[10pt] md:text-[12pt] hidden sm:block">
                  {t('app.subtitle', language)}
                </p>
              </div>
            </div>

            {/* 桌面端导航 */}
            <nav className="hidden md:flex items-center gap-1">
              {/* 命例按钮 */}
              <button
                onClick={() => setIsDbModalOpen(true)}
                className="
                  group relative px-4 py-2 rounded-lg
                  text-[14pt] font-medium transition-all duration-200
                  text-text-muted hover:text-text-secondary
                "
              >
                {/* 背景 */}
                <span className="absolute inset-0 rounded-lg transition-all duration-200 group-hover:bg-white/[0.04]" />
                {/* 内容 */}
                <span className="relative flex items-center gap-2">
                  <span className="text-[10pt] opacity-50 group-hover:opacity-70">◆</span>
                  {t('nav.cases', language)}
                </span>
              </button>

              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    group relative px-4 py-2 rounded-lg
                    text-[14pt] font-medium transition-all duration-200
                    ${activeTab === tab.key
                      ? 'text-text'
                      : 'text-text-muted hover:text-text-secondary'
                    }
                  `}
                >
                  {/* 背景 */}
                  <span
                    className={`
                      absolute inset-0 rounded-lg transition-all duration-200
                      ${activeTab === tab.key
                        ? 'bg-white/[0.08]'
                        : 'group-hover:bg-white/[0.04]'
                      }
                    `}
                  />
                  {/* 内容 */}
                  <span className="relative flex items-center gap-2">
                    <span className={`
                      text-[10pt] transition-all duration-200
                      ${activeTab === tab.key ? 'text-gold' : 'opacity-50 group-hover:opacity-70'}
                    `}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </span>
                  {/* 下划线指示器 */}
                  <span
                    className={`
                      absolute -bottom-1 left-1/2 -translate-x-1/2
                      h-0.5 rounded-full
                      bg-gradient-to-r from-star via-gold to-star
                      transition-all duration-300
                      ${activeTab === tab.key ? 'w-2/3 opacity-100' : 'w-0 opacity-0'}
                    `}
                  />
                </button>
              ))}
            </nav>
          </div>

          {/* 设置按钮 */}
          <button
            onClick={() => setShowSettings(true)}
            className="
              group relative p-2.5 rounded-xl
              bg-white/[0.04] border border-white/[0.08]
              hover:bg-white/[0.08] hover:border-white/[0.12]
              transition-all duration-200
            "
            title="设置"
          >
            <svg
              className="w-5 h-5 text-text-muted group-hover:text-text transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* 移动端底部导航 */}
      <nav
        className="
          md:hidden fixed bottom-0 left-0 right-0 z-40
          px-3 py-2.5
          bg-night/90 backdrop-blur-xl
          border-t border-white/[0.06]
        "
      >
        <div className="flex items-center justify-between gap-1 max-w-md mx-auto">
          <button
            onClick={() => setIsDbModalOpen(true)}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1.5 rounded-lg text-text-muted transition-all duration-200 hover:text-text"
          >
            <span className="text-[10pt]">◆</span>
            <span className="text-[8pt] leading-none">{t('nav.cases', language)}</span>
          </button>

          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1.5 rounded-lg
                transition-all duration-200
                ${activeTab === tab.key
                  ? 'text-gold'
                  : 'text-text-muted'
                }
              `}
            >
              <span className="text-[10pt]">{tab.icon}</span>
              <span className="text-[8pt] leading-none">{tab.label}</span>
              {/* 选中指示点 */}
              {activeTab === tab.key && (
                <span className="absolute -top-1 w-1 h-1 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.6)]" />
              )}
            </button>
          ))}

          <button
            onClick={() => setShowSettings(true)}
            className="
              relative flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg
              text-text-muted transition-all duration-200 hover:text-text
            "
            title="设置"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-[8pt] leading-none">设置</span>
          </button>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="flex-1 px-3 sm:px-4 lg:px-12 pt-4 sm:pt-6 lg:pt-8 pb-24 md:pb-8">
        <div className="max-w-[1600px] mx-auto">
          {/* 命盘解读标签 */}
          {activeTab === 'chart' && (
            !chart ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <BirthForm />
              </div>
            ) : (
              <div className="animate-fade-in space-y-8">
                {/* 命盘 - 横向展开 */}
                <div className="w-full">
                  <ChartDisplay />
                </div>

                {/* AI 解读 - 下方展示，与命盘等宽 */}
                <div className="w-full max-w-6xl mx-auto">
                  <AIInterpretation />
                </div>
              </div>
            )
          )}

          {/* 年度运势标签 */}
          {activeTab === 'fortune' && (
            !chart ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <EmptyState
                  message={t('empty.noChart', language)}
                  action={() => setActiveTab('chart')}
                  actionLabel={t('empty.goToInput', language)}
                />
              </div>
            ) : (
              <YearlyFortune />
            )
          )}

          {/* 人生K线标签 */}
          {activeTab === 'kline' && (
            !chart ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <EmptyState
                  message={t('empty.noChart', language)}
                  action={() => setActiveTab('chart')}
                  actionLabel={t('empty.goToInput', language)}
                />
              </div>
            ) : (
              <LifeKLine />
            )
          )}

          {/* 双人合盘标签 */}
          {activeTab === 'match' && <MatchAnalysis />}

          {/* 分享卡片标签 */}
          {activeTab === 'share' && (
            !chart ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <EmptyState
                  message={t('empty.noChart', language)}
                  action={() => setActiveTab('chart')}
                  actionLabel={t('empty.goToInput', language)}
                />
              </div>
            ) : (
              <div className="max-w-xl mx-auto">
                <ShareCard />
              </div>
            )
          )}
        </div>
      </main>

      {/* 设置弹窗 */}
      {showSettings && (
        <div
          className="
            fixed inset-0 z-50
            bg-black/40 backdrop-blur-sm
            flex items-center justify-center p-4
          "
          onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}
        >
          <div className="animate-fade-in">
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}

      {/* 数据库 Modal */}
      <UserDatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onSelect={handleSelectExample}
        onAdd={() => {
          // 新增：清空图表，显示空白表单
          setRecordToLoad(null)
          setChart(null)
          setIsDbModalOpen(false)
          setActiveTab('chart')
        }}
        onEdit={(record: UserRecord) => {
          // 修改：加载选中的记录到表单
          setRecordToLoad(record)
          setChart(null)
          setIsDbModalOpen(false)
          setActiveTab('chart')
        }}
      />

      {/* 底部 - 仅桌面端显示 */}
      {/* Footer removed */}
    </div>
  )
}

/* ------------------------------------------------------------
   空状态组件
   ------------------------------------------------------------ */

interface EmptyStateProps {
  message: string
  action: () => void
  actionLabel: string
}

function EmptyState({ message, action, actionLabel }: EmptyStateProps) {
  return (
    <div
      className="
        text-center p-8 rounded-2xl
        bg-white/[0.02] border border-white/[0.06]
      "
    >
      <div className="text-4xl mb-4 opacity-30">☆</div>
      <p className="text-text-muted mb-4">{message}</p>
      <button
        onClick={action}
        className="
          inline-flex items-center gap-2
          px-4 py-2 rounded-lg
          bg-star/20 text-star-light
          hover:bg-star/30 transition-colors
        "
      >
        {actionLabel}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </div>
  )
}
