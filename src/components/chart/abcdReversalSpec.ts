/* ============================================================
   ABCD 反背前端規格
   將反背定義、判定規則與顯示文案集中管理，避免 ChartDisplay 持續膨脹
   ============================================================ */

import type { MutagenLine } from './types'

export type ABCDCode = 'A' | 'B' | 'C' | 'D'
export type ReversalSeverity = 'weak' | 'medium' | 'strong'
export type ReversalMechanism =
  | 'gainThenLoss'
  | 'counterpartyConflict'
  | 'centrifugalDissipation'
  | 'mixed'

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
}

export interface ReversalDetectionInput {
  lines: MutagenLine[]
  language?: 'zh-TW' | 'zh-CN'
}

/**
 * 僅以四化飛線判定「反背」的最小規則：
 * 1) 先有承接：A/B/C 向心線化入某宮
 * 2) 後有反向：該宮出現離心（自化外放）或對待沖突（對宮/他宮 D 化入）
 * 3) 反向成立時才標記為反背，避免把所有凶象都視為反背
 */
export function detectABCDReversals(input: ReversalDetectionInput): ABCDReversalSignal[] {
  const { lines, language = 'zh-TW' } = input

  const inboundABC = lines.filter((line) => {
    const code = getCodeFromLine(line)
    return !!line.isCounterMutagen && (code === 'A' || code === 'B' || code === 'C')
  })

  const signals: ABCDReversalSignal[] = []

  inboundABC.forEach((ingress) => {
    const palace = ingress.toPalace

    const reverseLine = lines.find((line) => {
      if (line.fromPalace !== palace) return false
      if (!line.isSelfCentrifugal) return false
      return true
    })

    const conflictLine = lines.find((line) => {
      if (!line.isCounterMutagen) return false
      if (line.toPalace !== palace) return false
      return getCodeFromLine(line) === 'D'
    })

    if (!reverseLine && !conflictLine) return

    const ingressCode = getCodeFromLine(ingress) || 'A'
    const reverseCode = reverseLine ? getCodeFromLine(reverseLine) : null

    let score = 0
    score += 2 // 先有承接
    if (reverseLine) score += 2
    if (conflictLine) score += 2
    if (reverseCode === 'D') score += 2
    if (reverseLine && conflictLine) score += 1

    const severity =
      score >= 7 ? 'strong' :
      score >= 5 ? 'medium' :
      'weak'

    const mechanism = inferMechanism(reverseLine, conflictLine)
    const title = buildTitle(ingressCode, mechanism, language)
    const summary = buildSummary({
      language,
      palace,
      ingressCode,
      reverseCode,
      hasConflict: !!conflictLine,
      mechanism,
    })

    signals.push({
      id: `${palace}-${ingressCode}-${reverseCode ?? 'N'}-${conflictLine ? 'C' : 'N'}`,
      code: ingressCode,
      palace,
      severity,
      score,
      mechanism,
      title,
      summary,
      evidence: {
        ingressLine: ingress,
        reverseLine,
        conflictLine,
      },
    })
  })

  return dedupeById(signals)
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
  const labels = {
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

  const classMap: Record<ReversalSeverity, string> = {
    weak: 'bg-amber-500/15 text-amber-300 border border-amber-400/30',
    medium: 'bg-rose-500/15 text-rose-300 border border-rose-400/30',
    strong: 'bg-red-500/20 text-red-300 border border-red-400/40',
  }

  return {
    severity,
    label: labels[language][severity],
    className: classMap[severity],
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

function inferMechanism(
  reverseLine?: MutagenLine,
  conflictLine?: MutagenLine
): ReversalMechanism {
  if (reverseLine && conflictLine) return 'mixed'
  if (conflictLine) return 'counterpartyConflict'
  if (reverseLine && getCodeFromLine(reverseLine) === 'D') return 'gainThenLoss'
  return 'centrifugalDissipation'
}

function buildTitle(
  code: ABCDCode,
  mechanism: ReversalMechanism,
  language: 'zh-TW' | 'zh-CN'
): string {
  const zhTW: Record<ABCDCode, string> = {
    A: 'A 反背：祿入而不守',
    B: 'B 反背：權到反爭',
    C: 'C 反背：科至失衡',
    D: 'D 反背：忌回沖本位',
  }

  const zhCN: Record<ABCDCode, string> = {
    A: 'A 反背：禄入而不守',
    B: 'B 反背：权到反争',
    C: 'C 反背：科至失衡',
    D: 'D 反背：忌回冲本位',
  }

  const base = language === 'zh-TW' ? zhTW[code] : zhCN[code]

  if (mechanism === 'mixed') {
    return language === 'zh-TW' ? `${base}（混合）` : `${base}（混合）`
  }

  return base
}

function buildSummary(args: {
  language: 'zh-TW' | 'zh-CN'
  palace: string
  ingressCode: ABCDCode
  reverseCode: ABCDCode | null
  hasConflict: boolean
  mechanism: ReversalMechanism
}): string {
  const { language, palace, ingressCode, reverseCode, hasConflict, mechanism } = args

  if (language === 'zh-TW') {
    const reversePart = reverseCode ? `後續轉為 ${reverseCode}` : '後續出現能量外放'
    const conflictPart = hasConflict ? '並伴隨對待沖突' : '但尚未見明顯對待沖突'
    const mechanismPart = mechanism === 'gainThenLoss'
      ? '呈現得而復失'
      : mechanism === 'counterpartyConflict'
      ? '呈現對宮互耗'
      : mechanism === 'mixed'
      ? '呈現混合反背'
      : '呈現離心消散'

    return `${palace}宮先承接 ${ingressCode}，${reversePart}，${conflictPart}，${mechanismPart}。`
  }

  const reversePart = reverseCode ? `后续转为 ${reverseCode}` : '后续出现能量外放'
  const conflictPart = hasConflict ? '并伴随对待冲突' : '但尚未见明显对待冲突'
  const mechanismPart = mechanism === 'gainThenLoss'
    ? '呈现得而复失'
    : mechanism === 'counterpartyConflict'
    ? '呈现对宫互耗'
    : mechanism === 'mixed'
    ? '呈现混合反背'
    : '呈现离心消散'

  return `${palace}宫先承接 ${ingressCode}，${reversePart}，${conflictPart}，${mechanismPart}。`
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
