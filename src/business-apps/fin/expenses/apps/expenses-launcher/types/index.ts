import { Icon as PhosphorIcon } from '@phosphor-icons/react'

export interface ExpenseArea {
  id: string
  title: string
  description: string
  icon: PhosphorIcon // Changed from string to PhosphorIcon
  category: 'core' | 'planning' | 'reporting' | 'manager'
  // Manager-specific features
  links?: Array<{
    label: string
    action: string
  }>
  buttonLabel?: string
  buttonAction?: string
  kpiType?: 'personal' | 'team' | 'analytics' | 'settings' | 'calendar' // Added 'settings' and 'calendar'
}

export interface QuickAction {
  id: string
  label: string
  icon: PhosphorIcon // Changed from string to PhosphorIcon
  action: string
}

export interface NavigationCardProps {
  area: ExpenseArea
  onClick: (area: ExpenseArea) => void
  stats: any // Using any since ExpenseDashboardStats is now in the hook file
  showManagerView: boolean
  showFinanceView: boolean
}

export interface QuickActionButtonProps {
  action: QuickAction
  onClick: (action: QuickAction) => void
}
