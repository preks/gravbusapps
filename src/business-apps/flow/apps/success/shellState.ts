import type { DecisionTimeframe } from './hooks/useDecisionData'
import type { SuccessTimeframe } from './utils/timeframe'

export type FlowSuccessPrimaryView = 'operations' | 'performance' | 'governance'
export type FlowSuccessPerformanceView = 'trends' | 'dashboard' | 'portfolio' | 'tasks'
export type FlowSuccessOperationsView = 'overview' | 'activity' | 'dashboard' | 'reliability'
export type FlowSuccessGovernanceView = 'sla' | 'decisions' | 'audit'
export type FlowSuccessSubview = FlowSuccessOperationsView | FlowSuccessPerformanceView | FlowSuccessGovernanceView

type FlowSuccessLegacyOverviewView = 'summary' | 'dashboard'
type FlowSuccessLegacyTemplatesView = 'portfolio' | 'dashboard' | 'comparison' | 'preview'
type FlowSuccessLegacyAnalysisView = 'trends' | 'decisions' | 'audit' | 'capacity'
type FlowSuccessLegacyOperationsView = 'tasks' | 'sla' | 'capacity' | 'dynamic'

export type FlowSuccessAuditScope = 'all' | 'user' | 'system'
export type FlowSuccessDecisionFilter = 'all' | 'ai-direct' | 'ai-escalated' | 'human-overrides' | 'branch-agreement'

export interface FlowSuccessShellState {
  primaryView: FlowSuccessPrimaryView
  performanceView: FlowSuccessPerformanceView
  operationsView: FlowSuccessOperationsView
  governanceView: FlowSuccessGovernanceView
  timeframe: SuccessTimeframe
  templateId: string
  section?: string
  decisionFilter?: FlowSuccessDecisionFilter
  auditScope?: FlowSuccessAuditScope
}

export interface FlowSuccessDrilldownTarget {
  primaryView?: FlowSuccessPrimaryView
  performanceView?: FlowSuccessPerformanceView
  operationsView?: FlowSuccessOperationsView
  governanceView?: FlowSuccessGovernanceView
  timeframe?: SuccessTimeframe
  templateId?: string
  section?: string
  decisionFilter?: FlowSuccessDecisionFilter
  auditScope?: FlowSuccessAuditScope
}

export const FLOW_SUCCESS_PRIMARY_VIEWS: FlowSuccessPrimaryView[] = ['operations', 'performance', 'governance']

export const FLOW_SUCCESS_PERFORMANCE_VIEWS: FlowSuccessPerformanceView[] = [
  'trends',
  'dashboard',
  'portfolio',
  'tasks'
]

export const FLOW_SUCCESS_OPERATIONS_VIEWS: FlowSuccessOperationsView[] = [
  'overview',
  'activity',
  'dashboard',
  'reliability'
]

export const FLOW_SUCCESS_GOVERNANCE_VIEWS: FlowSuccessGovernanceView[] = ['sla', 'decisions', 'audit']

export const DEFAULT_FLOW_SUCCESS_SHELL_STATE: FlowSuccessShellState = {
  primaryView: 'operations',
  performanceView: 'trends',
  operationsView: 'overview',
  governanceView: 'sla',
  timeframe: 'mtd',
  templateId: 'ALL'
}

const LEGACY_TEMPLATES_VIEWS: FlowSuccessLegacyTemplatesView[] = ['portfolio', 'dashboard', 'comparison', 'preview']
const LEGACY_ANALYSIS_VIEWS: FlowSuccessLegacyAnalysisView[] = ['trends', 'decisions', 'audit', 'capacity']
const SUCCESS_TIMEFRAMES: Array<SuccessTimeframe | DecisionTimeframe> = ['last24h', 'wtd', 'mtd', 'qtd', 'ytd']

const isIncluded = <T extends string>(values: readonly T[], value?: string | null): value is T =>
  Boolean(value && values.includes(value as T))

const normalizeLegacyPrimaryView = (
  hashValue: string,
  legacyAnalysisView?: FlowSuccessLegacyAnalysisView,
  legacyOperationsView?: FlowSuccessLegacyOperationsView
): FlowSuccessPrimaryView | null => {
  if (hashValue === 'overview') return 'operations'
  if (hashValue === 'templates') return 'performance'
  if (hashValue !== 'analysis') return null

  if (legacyAnalysisView === 'trends') return 'performance'
  if (legacyAnalysisView === 'capacity') return 'operations'
  if (legacyOperationsView === 'tasks') return 'performance'
  if (legacyOperationsView === 'sla') return 'governance'
  return 'governance'
}

const resolvePrimaryView = (
  hashValue: string,
  rawOverviewView?: FlowSuccessLegacyOverviewView,
  rawPerformanceView?: string | null,
  rawOperationsView?: string | null,
  rawGovernanceView?: FlowSuccessGovernanceView,
  legacyTemplatesView?: FlowSuccessLegacyTemplatesView,
  legacyAnalysisView?: FlowSuccessLegacyAnalysisView,
  legacyOperationsView?: FlowSuccessLegacyOperationsView
): FlowSuccessPrimaryView => {
  if (isIncluded(FLOW_SUCCESS_PRIMARY_VIEWS, hashValue)) {
    if (hashValue === 'operations' && legacyOperationsView === 'tasks') return 'performance'
    if (hashValue === 'operations' && legacyOperationsView === 'sla') return 'governance'
    return hashValue
  }

  const normalizedLegacyPrimaryView = normalizeLegacyPrimaryView(hashValue, legacyAnalysisView, legacyOperationsView)
  if (normalizedLegacyPrimaryView) return normalizedLegacyPrimaryView

  if (rawOverviewView) return 'operations'
  if (rawOperationsView === 'tasks') return 'performance'
  if (rawOperationsView === 'sla') return 'governance'
  if (rawOperationsView) return 'operations'
  if (rawPerformanceView === 'dashboard' || rawPerformanceView === 'preview') return 'operations'
  if (rawPerformanceView || legacyTemplatesView) return 'performance'
  if (legacyOperationsView === 'tasks') return 'performance'
  if (legacyAnalysisView === 'capacity') return 'operations'
  if (
    rawGovernanceView ||
    (legacyAnalysisView && legacyAnalysisView !== 'trends' && legacyAnalysisView !== 'capacity')
  ) {
    return 'governance'
  }

  return DEFAULT_FLOW_SUCCESS_SHELL_STATE.primaryView
}

const resolveOperationsView = (
  hashValue: string,
  _overviewView?: string | null,
  performanceView?: string | null,
  operationsView?: string | null,
  legacyOverviewView?: FlowSuccessLegacyOverviewView,
  legacyTemplatesView?: FlowSuccessLegacyTemplatesView,
  legacyAnalysisView?: FlowSuccessLegacyAnalysisView,
  legacyOperationsView?: FlowSuccessLegacyOperationsView
): FlowSuccessOperationsView => {
  if (isIncluded(FLOW_SUCCESS_OPERATIONS_VIEWS, operationsView)) return operationsView
  if (hashValue === 'overview') return legacyOverviewView === 'dashboard' ? 'dashboard' : 'activity'
  if (legacyOverviewView === 'dashboard') return 'dashboard'
  if (legacyOverviewView === 'summary') return 'activity'
  if (performanceView === 'dashboard' || performanceView === 'preview') return 'dashboard'
  if (legacyTemplatesView === 'dashboard' || legacyTemplatesView === 'preview') return 'dashboard'
  if (legacyAnalysisView === 'capacity' || legacyOperationsView === 'capacity' || legacyOperationsView === 'dynamic') {
    return 'overview'
  }
  if (hashValue === 'operations' && !operationsView) return 'reliability'
  if (legacyOperationsView === 'tasks' || legacyOperationsView === 'sla')
    return DEFAULT_FLOW_SUCCESS_SHELL_STATE.operationsView
  return DEFAULT_FLOW_SUCCESS_SHELL_STATE.operationsView
}

const resolvePerformanceView = (
  performanceView?: string | null,
  legacyTemplatesView?: FlowSuccessLegacyTemplatesView,
  legacyAnalysisView?: FlowSuccessLegacyAnalysisView,
  legacyOperationsView?: FlowSuccessLegacyOperationsView
): FlowSuccessPerformanceView => {
  if (performanceView === 'dashboard' || performanceView === 'preview') {
    return DEFAULT_FLOW_SUCCESS_SHELL_STATE.performanceView
  }
  if (performanceView === 'comparison') return 'portfolio'
  if (isIncluded(FLOW_SUCCESS_PERFORMANCE_VIEWS, performanceView)) return performanceView
  if (legacyTemplatesView === 'preview' || legacyTemplatesView === 'dashboard') {
    return DEFAULT_FLOW_SUCCESS_SHELL_STATE.performanceView
  }
  if (legacyTemplatesView === 'comparison') return 'portfolio'
  if (
    legacyTemplatesView &&
    legacyTemplatesView !== 'preview' &&
    legacyTemplatesView !== 'dashboard' &&
    legacyTemplatesView !== 'comparison'
  ) {
    return legacyTemplatesView
  }
  if (legacyAnalysisView === 'trends') return 'trends'
  if (legacyOperationsView === 'tasks') return 'tasks'
  return DEFAULT_FLOW_SUCCESS_SHELL_STATE.performanceView
}

const resolveGovernanceView = (
  governanceView?: FlowSuccessGovernanceView,
  legacyAnalysisView?: FlowSuccessLegacyAnalysisView,
  legacyOperationsView?: FlowSuccessLegacyOperationsView
): FlowSuccessGovernanceView => {
  if (governanceView) return governanceView
  if (legacyOperationsView === 'sla') return 'sla'
  if (legacyAnalysisView === 'decisions' || legacyAnalysisView === 'audit') return legacyAnalysisView
  return DEFAULT_FLOW_SUCCESS_SHELL_STATE.governanceView
}

export const parseFlowSuccessShellState = (location: Location = window.location): FlowSuccessShellState => {
  const params = new URLSearchParams(location.search)
  const hashValue = location.hash.replace('#', '')
  const rawOverviewView = params.get('overviewView')
  const rawPerformanceView = params.get('performanceView')
  const rawOperationsView = params.get('operationsView')
  const governanceView = isIncluded(FLOW_SUCCESS_GOVERNANCE_VIEWS, params.get('governanceView'))
    ? params.get('governanceView')!
    : undefined
  const legacyOverviewView: FlowSuccessLegacyOverviewView | undefined =
    rawOverviewView === 'summary' || rawOverviewView === 'dashboard' ? rawOverviewView : undefined
  const legacyTemplatesView = isIncluded(LEGACY_TEMPLATES_VIEWS, params.get('templatesView'))
    ? params.get('templatesView')!
    : undefined
  const legacyAnalysisView = isIncluded(LEGACY_ANALYSIS_VIEWS, params.get('analysisView'))
    ? params.get('analysisView')!
    : undefined
  const legacyOperationsView: FlowSuccessLegacyOperationsView | undefined =
    rawOperationsView === 'tasks' ||
    rawOperationsView === 'sla' ||
    rawOperationsView === 'capacity' ||
    rawOperationsView === 'dynamic'
      ? rawOperationsView
      : undefined
  const performanceView = resolvePerformanceView(
    rawPerformanceView,
    legacyTemplatesView,
    legacyAnalysisView,
    legacyOperationsView
  )
  const operationsView = resolveOperationsView(
    hashValue,
    rawOverviewView,
    rawPerformanceView,
    rawOperationsView,
    legacyOverviewView,
    legacyTemplatesView,
    legacyAnalysisView,
    legacyOperationsView
  )

  return {
    primaryView: resolvePrimaryView(
      hashValue,
      legacyOverviewView,
      rawPerformanceView,
      rawOperationsView,
      governanceView,
      legacyTemplatesView,
      legacyAnalysisView,
      legacyOperationsView
    ),
    performanceView,
    operationsView,
    governanceView: resolveGovernanceView(governanceView, legacyAnalysisView, legacyOperationsView),
    timeframe: isIncluded(SUCCESS_TIMEFRAMES, params.get('timeframe'))
      ? (params.get('timeframe') as SuccessTimeframe)
      : DEFAULT_FLOW_SUCCESS_SHELL_STATE.timeframe,
    templateId: params.get('templateId') || DEFAULT_FLOW_SUCCESS_SHELL_STATE.templateId,
    section: params.get('section') || undefined,
    decisionFilter: (params.get('decisionFilter') as FlowSuccessDecisionFilter | null) || undefined,
    auditScope: (params.get('auditScope') as FlowSuccessAuditScope | null) || undefined
  }
}

export const updateFlowSuccessShellUrl = (state: FlowSuccessShellState) => {
  const url = new URL(window.location.href)
  url.hash = state.primaryView

  url.searchParams.set('performanceView', state.performanceView)
  url.searchParams.set('operationsView', state.operationsView)
  url.searchParams.set('governanceView', state.governanceView)
  url.searchParams.set('timeframe', state.timeframe)
  url.searchParams.set('templateId', state.templateId)
  url.searchParams.delete('templatesView')
  url.searchParams.delete('analysisView')
  url.searchParams.delete('overviewView')

  if (state.decisionFilter) url.searchParams.set('decisionFilter', state.decisionFilter)
  else url.searchParams.delete('decisionFilter')
  if (state.auditScope) url.searchParams.set('auditScope', state.auditScope)
  else url.searchParams.delete('auditScope')

  if (state.section) url.searchParams.set('section', state.section)
  else url.searchParams.delete('section')

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

export const applyFlowSuccessDrilldown = (
  state: FlowSuccessShellState,
  target: FlowSuccessDrilldownTarget
): FlowSuccessShellState => ({
  ...state,
  primaryView: target.primaryView ?? state.primaryView,
  performanceView: target.performanceView ?? state.performanceView,
  operationsView: target.operationsView ?? state.operationsView,
  governanceView: target.governanceView ?? state.governanceView,
  timeframe: target.timeframe ?? state.timeframe,
  templateId: target.templateId ?? state.templateId,
  section: target.section,
  decisionFilter: target.decisionFilter,
  auditScope: target.auditScope
})

export const clearFlowSuccessDrilldown = (state: FlowSuccessShellState): FlowSuccessShellState => ({
  ...state,
  section: undefined,
  decisionFilter: undefined,
  auditScope: undefined
})

export const getFlowSuccessActiveSubview = (state: FlowSuccessShellState): FlowSuccessSubview | null => {
  switch (state.primaryView) {
    case 'operations':
      return state.operationsView
    case 'performance':
      return state.performanceView
    case 'governance':
      return state.governanceView
    default:
      return null
  }
}
