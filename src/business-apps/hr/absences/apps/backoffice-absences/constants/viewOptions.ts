import React from 'react'
import { GaugeIcon, ListBulletsIcon, ChartBarIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ViewOption {
  key: string
  label: string
  icon: React.ReactElement
}

export const BACKOFFICE_VIEW_OPTIONS: ViewOption[] = [
  {
    key: 'dashboard',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.dashboard_btn', 'Dashboard'),
    icon: React.createElement(GaugeIcon, { className: 'w-5 h-5' })
  },
  {
    key: 'absence-list',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.absence_list', 'Absence List'),
    icon: React.createElement(ListBulletsIcon, { className: 'w-5 h-5' })
  },
  {
    key: 'calendar',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_backoffice.team_calendar_btn',
      'Team Calendar'
    ),
    icon: React.createElement(CalendarBlankIcon, { className: 'w-5 h-5' })
  },
  {
    key: 'statistics',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.statistics', 'Statistics'),
    icon: React.createElement(ChartBarIcon, { className: 'w-5 h-5' })
  },
  {
    key: 'reports',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.reports', 'Reports'),
    icon: React.createElement(ChartBarIcon, { className: 'w-5 h-5' })
  }
]
