import { Icon as PhosphorIcon } from '@phosphor-icons/react'

export interface HrArea {
  id: string
  title: string
  description: string
  icon: PhosphorIcon
  category: 'core' | 'management' | 'analytics' | 'settings' | 'time-off'
  // Additional features
  links?: Array<{
    label: string
    action: string
  }>
  buttonLabel?: string
  buttonAction?: string
  kpiType?: 'employees' | 'jobs' | 'absences' | 'analytics' | 'settings'
}

export interface HrQuickAction {
  id: string
  label: string
  icon: PhosphorIcon
  action: string
}

export interface HrNavigationCardProps {
  area: HrArea
  onClick: (area: HrArea) => void
  stats: any
}

export interface HrQuickActionButtonProps {
  action: HrQuickAction
  onClick: (action: HrQuickAction) => void
}
