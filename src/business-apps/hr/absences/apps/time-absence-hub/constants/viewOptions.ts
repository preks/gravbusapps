import React from 'react'
import {
  GaugeIcon,
  ListBulletsIcon,
  ClockIcon,
  CalendarBlankIcon,
  LightbulbIcon,
  FileTextIcon
} from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { HubView } from './routes'

export interface ViewOption {
  key: string
  label: string
  icon: React.ReactElement
}

export const HUB_VIEW_OPTIONS: ViewOption[] = [
  {
    key: 'dashboard' satisfies HubView,
    label: getTranslationFromI18nKeyAndLabel('lowcoder:time_absence_hub.tab_dashboard', 'Dashboard'),
    icon: React.createElement(GaugeIcon, { className: 'gba:h-5 gba:w-5' })
  },
  {
    key: 'absences' satisfies HubView,
    label: getTranslationFromI18nKeyAndLabel('lowcoder:time_absence_hub.tab_absences', 'Absences'),
    icon: React.createElement(ListBulletsIcon, { className: 'gba:h-5 gba:w-5' })
  },
  {
    key: 'attendance' satisfies HubView,
    label: getTranslationFromI18nKeyAndLabel('lowcoder:time_absence_hub.tab_attendance', 'Attendance'),
    icon: React.createElement(ClockIcon, { className: 'gba:h-5 gba:w-5' })
  },
  {
    key: 'entitlements' satisfies HubView,
    label: getTranslationFromI18nKeyAndLabel('lowcoder:time_absence_hub.tab_entitlements', 'Entitlements'),
    icon: React.createElement(CalendarBlankIcon, { className: 'gba:h-5 gba:w-5' })
  },
  {
    key: 'insights' satisfies HubView,
    label: getTranslationFromI18nKeyAndLabel('lowcoder:time_absence_hub.tab_insights', 'Insights'),
    icon: React.createElement(LightbulbIcon, { className: 'gba:h-5 gba:w-5' })
  },
  {
    key: 'reports' satisfies HubView,
    label: getTranslationFromI18nKeyAndLabel('lowcoder:time_absence_hub.tab_reports', 'Reports'),
    icon: React.createElement(FileTextIcon, { className: 'gba:h-5 gba:w-5' })
  }
]
