/* ===================================
   ABCD 反背前端規格
   將反背定義、判定規則與顯示文案集中管理
   =================================== */

import type { MutagenLine } from './types'

export type ABCDCode = 'A' | 'B' | 'C' | 'D'
export type ReversalSeverity = 'weak' | 'medium' | 'strong'
export type ReversalMechanism = 'crossPalaceBidirectional'

export interface ReversalEvidence {
  ingressLine: MutagenLine
  reverseLine?: MutagenLine
  conflictLine?: MutagenLine
}

export interface ABCDReversalSignal {
  id: string
  code: ABCDCode
  palace: string
  severity: ReversalSeverity
  score: number
  mechanism: ReversalMechanism
  title: string
  summary: string
  evidence: ReversalEvidence
  centrifugalPalaces: string[]   // 離心宮位列表（外放方）
  centripetalPalaces: string[]   // 向心宮位列表（承接方）
}

export interface ReversalDetectionInput {
  lines: MutagenLine[]
  language?: 'zh-TW' | 'zh-CN'
}

/* ===================================
   常數與多語系字典提取
   避免函數內重複創建與分配記憶體
   =================================== */

const REVERSAL_BADGE_LABELS = {
  'zh-TW': {
    weak: '疑似反背',
    medium: '反背',
    strong: '強反背',
  },
  'zh-CN': {
    weak: '疑似反背',
    medium: '反背',
    strong: '强反背',
  },
} as const

const REVERSAL_BADGE_CLASS_MAP: Record<ReversalSeverity, string> = {
  weak: 'bg-amber-500/15 text-amber-300 border border-amber-400/30',
  medium: 'bg-rose-500/15 text-rose-300 border border-rose-400/30',
  strong: 'bg-red-500/20 text-red-300 border border-red-400/40',
}

const REVERSAL_TITLE_MAP = {
  'zh-TW': {
    A: 'A 反背：祿入而不守',
    B: 'B 反背：權到反爭',
    C: 'C 反背：科至失衡',
    D: 'D 反背：忌回沖本位',
  },
  'zh-CN': {
    A: 'A 反背：禄入而不守',
    B: 'B 反背：权到反争',
    C: 'C 反背：科至失衡',
    D: 'D 反背：忌回冲本位',
  },
} as const

const MECHANISM_TEXT_MAP = {
  'zh-TW': {
    crossPalaceBidirectional: '呈現同類跨宮雙向牴觸（不同宮位向性相反）',
  },
  'zh-CN': {
    crossPalaceBidirectional: '呈现同类跨宫双向抵触（不同宫位向性相反）',
  },
} as const

/**
 * ABCD 反背檢測：專注於跨宮同類雙向牴觸
 * 同一 ABCD 類型在不同宮位同時存在離心（外放）與向心（承接），
 * 整體方向性相互矛盾，形成跨宮反背。
 * 例：福德有 B 離心、兄弟有 B 向心 → B 跨宮雙向牴觸
 */
export function detectABCDReversals(input: ReversalDetectionInput): ABCDReversalSignal[] {
  const { lines, language = 'zh-TW' } = input
  return detectCrossPalaceBidirectional(lines, language)
}

export interface ReversalBadgeSpec {
  severity: ReversalSeverity
  label: string
  className: string
}

export function getReversalBadgeSpec(
  severity: ReversalSeverity,
  language: 'zh-TW' | 'zh-CN' = 'zh-TW'
): ReversalBadgeSpec {
  return {
    severity,
    label: REVERSAL_BADGE_LABELS[language][severity],
    className: REVERSAL_BADGE_CLASS_MAP[severity],
  }
}

function getCodeFromLine(line: MutagenLine): ABCDCode | null {
  if (line.label === 'A' || line.label === 'B' || line.label === 'C' || line.label === 'D') {
    return line.label
  }

  const typeText = String(line.type)
  if (typeText === '禄' || typeText === '祿') return 'A'
  if (typeText === '权' || typeText === '權') return 'B'
  if (typeText === '科') return 'C'
  if (typeText === '忌') return 'D'
  return null
}

function buildTitle(
  code: ABCDCode,
  mechanism: ReversalMechanism,
  language: 'zh-TW' | 'zh-CN'
): string {
  const base = REVERSAL_TITLE_MAP[language][code]
  return language === 'zh-TW' ? `${base}（跨宮雙向）` : `${base}（跨宫双向）`
}

function detectCrossPalaceBidirectional(
  lines: MutagenLine[],
  language: 'zh-TW' | 'zh-CN',
): ABCDReversalSignal[] {
  const CODES: ABCDCode[] = ['A', 'B', 'C', 'D']
  const signals: ABCDReversalSignal[] = []
  const isTW = language === 'zh-TW'

  for (const code of CODES) {
    const centripetalLines = lines.filter(
      (l) => !!l.isCounterMutagen && getCodeFromLine(l) === code,
    )
    const centrifugalLines = lines.filter(
      (l) => !!l.isSelfCentrifugal && getCodeFromLine(l) === code,
    )

    if (centripetalLines.length === 0 || centrifugalLines.length === 0) continue

    // 找第一組跨宮配對（離心宮 ≠ 向心宮）
    let ingress: MutagenLine | null = null
    let cfLine: MutagenLine | null = null
    outer: for (const cp of centripetalLines) {
      for (const cf of centrifugalLines) {
        if (cf.fromPalace === cp.toPalace) continue
        ingress = cp
        cfLine = cf
        break outer
      }
    }
    if (!ingress || !cfLine) continue

    const centripetalPalace = ingress.toPalace
    const centrifugalPalace = cfLine.fromPalace

    // 收集該 code 所有涉及的向心宮與離心宮，用於摘要
    const centripetalPalaces = [...new Set(
      centripetalLines
        .filter((cp) => centrifugalLines.some((cf) => cf.fromPalace !== cp.toPalace))
        .map((cp) => cp.toPalace)
    )]
    const centrifugalPalaces = [...new Set(
      centrifugalLines
        .filter((cf) => centripetalLines.some((cp) => cp.toPalace !== cf.fromPalace))
        .map((cf) => cf.fromPalace)
    )]

    const cfPart = centrifugalPalaces.join('、')
    const cpPart = centripetalPalaces.join('、')

    const summary = isTW
      ? `${cfPart}宮有 ${code} 離心外放，${cpPart}宮有 ${code} 向心承接，同類四化在不同宮位呈相反向性，${MECHANISM_TEXT_MAP['zh-TW'].crossPalaceBidirectional}。`
      : `${cfPart}宫有 ${code} 离心外放，${cpPart}宫有 ${code} 向心承接，同类四化在不同宫位呈相反向性，${MECHANISM_TEXT_MAP['zh-CN'].crossPalaceBidirectional}。`

    signals.push({
      id: `cross-palace-${code}-${centrifugalPalace}-${centripetalPalace}`,
      code,
      palace: centripetalPalace,
      severity: 'medium',
      score: 0,
      mechanism: 'crossPalaceBidirectional',
      title: buildTitle(code, 'crossPalaceBidirectional', language),
      summary,
      evidence: { ingressLine: ingress, reverseLine: cfLine },
      centrifugalPalaces,
      centripetalPalaces,
    })
  }

  return dedupeById(signals)
}

function dedupeById(signals: ABCDReversalSignal[]): ABCDReversalSignal[] {
  const seen = new Set<string>()
  const output: ABCDReversalSignal[] = []

  for (const signal of signals) {
    if (seen.has(signal.id)) continue
    seen.add(signal.id)
    output.push(signal)
  }

  return output
}