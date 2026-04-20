import { Icon as PhosphorIcon } from '@phosphor-icons/react'

export type HrAreaTone = 'core' | 'payroll' | 'time' | 'insights' | 'talent' | 'performance'

export interface HrAreaLink {
  label: string
  path?: string
}

export interface HrArea {
  id: string
  title: string
  description: string
  icon: PhosphorIcon
  badgeLabel: string
  badgeTone: HrAreaTone
  links: HrAreaLink[]
  explorePath?: string
}
