import type { IconProps } from '@phosphor-icons/react'
import {
  CalendarBlankIcon,
  DesktopIcon,
  FileTextIcon,
  LightbulbIcon,
  PaperPlaneTiltIcon,
  UserIcon,
  WarningIcon
} from '@phosphor-icons/react'
import type { ComponentType } from 'react'

export const ABSENCE_TYPE_SETUP_ICON_KEYS = [
  'vacation',
  'sick',
  'home-office',
  'business-trip',
  'training',
  'family-care',
  'jury-duty'
] as const

export type AbsenceTypeSetupIconKey = (typeof ABSENCE_TYPE_SETUP_ICON_KEYS)[number]

export const absenceTypeSetupIconMap: Record<AbsenceTypeSetupIconKey, ComponentType<IconProps>> = {
  vacation: CalendarBlankIcon,
  sick: WarningIcon,
  'home-office': DesktopIcon,
  'business-trip': PaperPlaneTiltIcon,
  training: LightbulbIcon,
  'family-care': UserIcon,
  'jury-duty': FileTextIcon
}
