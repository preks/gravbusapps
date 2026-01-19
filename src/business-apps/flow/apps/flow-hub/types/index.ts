import { RemixiconComponentType } from '@remixicon/react'

export interface FlowArea {
  id: string
  title: string
  description: string
  icon: RemixiconComponentType
  category: 'core' | 'management' | 'analytics' | 'admin'
  // Manager-specific features
  links?: Array<{
    label: string
    action: string
  }>
  buttonLabel?: string
  buttonAction?: string
  kpiType?: 'personal' | 'team' | 'analytics' | 'admin' | 'processes'
}

export interface FlowQuickAction {
  id: string
  label: string
  icon: RemixiconComponentType
  action: string
}

export interface NavigationCardProps {
  area: FlowArea
  onClick: (area: FlowArea) => void
  stats: any // Using any since FlowDashboardStats is now in the hook file
  showManagerView: boolean
  showAdminView: boolean
}

export interface QuickActionButtonProps {
  action: FlowQuickAction
  onClick: (action: FlowQuickAction) => void
}
