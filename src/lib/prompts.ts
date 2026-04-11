/* ============================================================
   AI 提示词管理
   集中管理系统提示、用户提示模板
   ============================================================ */

import { t } from './i18n'
import type { Language } from './i18n'

/**
 * 简化版系统提示词 - 核心原则 + 输出格式
 * 移除冗长重复，保留关键指路
 */
export const SYSTEM_PROMPT_ZH_TW = `# 北派紫微四化命理師

## 分析框架
**依序推進**：來因宮 → 生年四化 → 自化 → 飛星串聯

## 核心要求
1. **建立座標系**：宮干、地支、生年四化、自化、我宮/他宮
2. **交代能量流向**：「A宮 → B宮」因果清晰
3. **結構優先**：先分析四化邏輯，再白話解釋
4. **自化觀察**：代表質變、反覆、消散，影響結局
5. **心理層次**：不只斷吉凶，解釋根源與課題
6. **運限推演**：大限+流年疊回本命，找出焦點

## 禁止
- 空泛話術
- 資料不足時模糊帶過（需明說）

## 輸出結構
- 盤面依據（四化、自化、宮干地支）
- 白話解釋（心理根源、人生課題）
- 運限焦點（當前大限/流年影響）`

export const SYSTEM_PROMPT_ZH_CN = `# 北派紫微四化命理师

## 分析框架
**依序推进**：来因宫 → 生年四化 → 自化 → 飞星串联

## 核心要求
1. **建立座标系**：宫干、地支、生年四化、自化、我宫/他宫
2. **交代能量流向**：「A宫 → B宫」因果清晰
3. **结构优先**：先分析四化逻辑，再白话解释
4. **自化观察**：代表质变、反复、消散，影响结局
5. **心理层次**：不只断吉凶，解释根源与课题
6. **运限推演**：大限+流年叠回本命，找出焦点

## 禁止
- 空泛话术
- 资料不足时模糊带过（需明说）

## 输出结构
- 盘面依据（四化、自化、宫干地支）
- 白话解释（心理根源、人生课题）
- 运限焦点（当前大限/流年影响）`

/**
 * 获取系统提示词
 */
export function getSystemPrompt(language: Language): string {
  const isTraditional = language === 'zh-TW'
  const basePrompt = isTraditional ? SYSTEM_PROMPT_ZH_TW : SYSTEM_PROMPT_ZH_CN
  const langHint = isTraditional ? '請使用繁體中文輸出全部內容。' : '请使用简体中文输出全部内容。'
  return `${basePrompt}\n\n${langHint}`
}

/**
 * 用户提示词构建
 */
export interface UserPromptParams {
  language: Language
  indicatorsJson: string
  contextStr: string
}

export function buildUserPrompt(params: UserPromptParams): string {
  const {
    language,
    indicatorsJson,
    contextStr,
  } = params

  const prefix = t('ai.prompt.readChart', language)
  const jsonLabel = t('ai.prompt.keyIndicators', language)
  const jsonHint = t('ai.prompt.indicatorsHint', language)
  const contextLabel = t('ai.prompt.supplementContext', language)
  const sopHint = t('ai.prompt.analyzeOrder', language)

  // 是否包含補充上下文和大限信息
  const includeContext = false

  return `${prefix}

## ${jsonLabel}
${jsonHint}
${indicatorsJson}

${includeContext ? `## ${contextLabel} ${contextStr}` : ''}

**【論盤順序】** ${sopHint}`
}
