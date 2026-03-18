import React from 'react'
import { ActivitySquare, ShieldCheck, TrendingUp } from 'lucide-react'
import type {
  FlowSuccessGovernanceView,
  FlowSuccessOperationsView,
  FlowSuccessPerformanceView,
  FlowSuccessPrimaryView
} from '../shellState'

interface NavigationOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

export const getFlowSuccessPrimaryViewOptions = (
  t: (key: string) => string
): NavigationOption<FlowSuccessPrimaryView>[] => [
  { value: 'operations', label: t('nav-operations'), icon: <ActivitySquare className="gba:h-4 gba:w-4" /> },
  { value: 'performance', label: t('nav-analytics'), icon: <TrendingUp className="gba:h-4 gba:w-4" /> },
  { value: 'governance', label: t('nav-analysis'), icon: <ShieldCheck className="gba:h-4 gba:w-4" /> }
]

export const getFlowSuccessSecondaryViewOptions = (
  t: (key: string) => string
): {
  performance: NavigationOption<FlowSuccessPerformanceView>[]
  operations: NavigationOption<FlowSuccessOperationsView>[]
  governance: NavigationOption<FlowSuccessGovernanceView>[]
} => ({
  performance: [
    { value: 'trends', label: t('analytics-subview-trends') },
    { value: 'portfolio', label: t('analytics-subview-performance') },
    { value: 'tasks', label: t('analytics-subview-tasks') }
  ],
  operations: [
    { value: 'overview', label: t('operations-subview-overview') },
    { value: 'activity', label: t('operations-subview-activity') },
    { value: 'dashboard', label: t('templates-subview-dashboard') },
    { value: 'reliability', label: t('operations-subview-reliability') }
  ],
  governance: [
    { value: 'sla', label: t('governance-subview-sla') },
    { value: 'decisions', label: t('governance-subview-decisions') },
    { value: 'audit', label: t('governance-subview-audit') }
  ]
})

export const getFlowSuccessSectionLabel = (section?: string | null) =>
  section
    ? String(section)
        .split('-')
        .filter(Boolean)
        .map(token => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ')
    : null
