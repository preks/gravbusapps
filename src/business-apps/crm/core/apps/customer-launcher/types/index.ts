import { Icon as PhosphorIcon } from '@phosphor-icons/react'

export interface CrmArea {
  id: string
  title: string
  description: string
  icon: PhosphorIcon // Changed from string to PhosphorIcon
  category: 'sales' | 'customer' | 'intelligence'
  path: string
}

export interface QuickAction {
  id: string
  label: string
  icon: PhosphorIcon // Changed from string to PhosphorIcon
  action: string
}

export interface CrmDashboardStats {
  // CRM Stats (filtered by sourceApp and excluding deleted records)
  activeOpportunities: number
  pipelineValue: number
  totalLeads: number
  totalOpportunities: number
  totalAccounts: number
  totalContacts: number
}

export interface NavigationCardProps {
  area: CrmArea
  onClick: (area: CrmArea) => void
  stats?: CrmDashboardStats
}

export interface QuickActionButtonProps {
  action: QuickAction
  onClick: (action: QuickAction) => void
}

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  placeholder?: string
}

export interface CrmFrontpageProps {
  accessToken: string
  userInfo?: any
  employeeId?: string
}
