import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

/** Bump when verifying a published bundle loaded the latest group-selection logic. */
export const INVESTMENT_GROUP_CONTEXT_IMPL_VERSION = '2026-05-26-v3'

export type InvestmentGroupSelectionMode = 'manual' | 'auto'

export interface ResolvedInvestmentGroupLaunch {
  selectionMode: InvestmentGroupSelectionMode
  investmentGroupId?: string
  fromSubView?: string
  fromView?: string
  sourceKeys: string[]
}

type LaunchContextRecord = Record<string, unknown>

const MANUAL_SELECTION_SUB_VIEWS = new Set(['overview', 'all'])

const toLaunchContextRecord = (value: unknown): LaunchContextRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as LaunchContextRecord
}

const getLaunchContextSources = (additionalData?: BusinessAppContextProps['additionalData']): LaunchContextRecord[] => {
  if (!additionalData) return []

  const taskPayload = toLaunchContextRecord(additionalData.psi_taskPayload)
  const candidates: unknown[] = [
    additionalData,
    additionalData.externalContextData,
    additionalData.contextData,
    additionalData.flowContext,
    additionalData.psi_initialParameters,
    additionalData.startProcessBody,
    taskPayload?.psi_initialParameters,
    taskPayload?.initialParameters,
    taskPayload
  ]

  const sources: LaunchContextRecord[] = []
  for (const candidate of candidates) {
    const record = toLaunchContextRecord(candidate)
    if (record) {
      sources.push(record)
    }
  }

  return sources
}

const pickLaunchString = (sources: LaunchContextRecord[], key: string): string | undefined => {
  for (const source of sources) {
    const value = source[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

const isManualSelectionSubView = (value: string | undefined): boolean => {
  if (!value) return false
  return MANUAL_SELECTION_SUB_VIEWS.has(value.toLowerCase())
}

const parseSelectionMode = (value: string | undefined): InvestmentGroupSelectionMode | undefined => {
  if (!value) return undefined
  const normalized = value.toLowerCase()
  if (normalized === 'manual' || normalized === 'auto') {
    return normalized
  }
  return undefined
}

/**
 * Resolves how the investment create form should pick a group.
 *
 * Only `selectionMode: 'auto'` together with a catalog group id may skip the picker.
 * URL, referrer, and href are intentionally ignored — they caused stale-tab mismatches.
 */
export const resolveInvestmentGroupLaunchContext = (
  additionalData?: BusinessAppContextProps['additionalData']
): ResolvedInvestmentGroupLaunch => {
  const sources = getLaunchContextSources(additionalData)
  const sourceKeys = sources.map((source, index) => {
    const keys = Object.keys(source).filter(key => {
      const value = source[key]
      return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    })
    return `source[${index}]:${keys.join(',') || '(empty)'}`
  })

  const explicitMode =
    parseSelectionMode(pickLaunchString(sources, 'investmentGroupSelection')) ||
    parseSelectionMode(pickLaunchString(sources, 'groupSelectionMode'))

  const investmentGroupId = pickLaunchString(sources, 'investmentGroup')
  const fromSubView = pickLaunchString(sources, 'fromSubView')
  const subView = pickLaunchString(sources, 'subView')
  const fromView = pickLaunchString(sources, 'fromView')
  const effectiveSubView = fromSubView || subView

  if (explicitMode === 'manual' || isManualSelectionSubView(effectiveSubView)) {
    return {
      selectionMode: 'manual',
      fromSubView: effectiveSubView,
      fromView,
      sourceKeys
    }
  }

  if (explicitMode === 'auto' && investmentGroupId) {
    return {
      selectionMode: 'auto',
      investmentGroupId,
      fromSubView: effectiveSubView,
      fromView,
      sourceKeys
    }
  }

  if (investmentGroupId) {
    return {
      selectionMode: 'auto',
      investmentGroupId,
      fromSubView: effectiveSubView,
      fromView,
      sourceKeys
    }
  }

  return {
    selectionMode: 'manual',
    fromSubView: effectiveSubView,
    fromView,
    sourceKeys
  }
}

export const summarizeInvestmentGroupLaunchContext = (launch: ResolvedInvestmentGroupLaunch) => ({
  implVersion: INVESTMENT_GROUP_CONTEXT_IMPL_VERSION,
  selectionMode: launch.selectionMode,
  investmentGroupId: launch.investmentGroupId ?? null,
  fromSubView: launch.fromSubView ?? null,
  fromView: launch.fromView ?? null,
  sourceKeys: launch.sourceKeys
})
