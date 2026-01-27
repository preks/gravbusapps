import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import {
  getAllAbsenceStatusConfigs,
  getAbsenceStatusBackgroundClass
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import translations from './_i18n'

interface CalendarLegendProps {
  customLegend?: React.ReactNode
}

export const CalendarLegend: React.FC<CalendarLegendProps> = ({ customLegend }) => {
  const { t } = useTranslation(translations)

  if (customLegend) {
    return (
      <div className="gba:calendar-legend gba:px-4 gba:py-3 gba:border-t gba:border-border gba:bg-muted">
        {customLegend}
      </div>
    )
  }

  return (
    <div className="gba:calendar-legend gba:px-4 gba:py-3 gba:border-t gba:border-border gba:bg-muted">
      <div className="gba:flex gba:items-center gba:gap-6 gba:flex-wrap">
        {getAllAbsenceStatusConfigs()
          .filter(statusConfig => ['APPROVED', 'PENDING', 'REJECTED', 'CANCELLED'].includes(statusConfig.status))
          .map(statusConfig => (
            <div key={statusConfig.status} className="gba:flex gba:items-center gba:gap-2">
              <div
                className={`gba:w-3 gba:h-3 gba:rounded-full ${getAbsenceStatusBackgroundClass(statusConfig.status)}`}
              />
              <span className="gba:text-xs">{statusConfig.label}</span>
            </div>
          ))}
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-warning-secondary" />
          <span className="gba:text-xs">{t('holiday')}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-info-secondary" />
          <span className="gba:text-xs">{t('today')}</span>
        </div>
      </div>
    </div>
  )
}
