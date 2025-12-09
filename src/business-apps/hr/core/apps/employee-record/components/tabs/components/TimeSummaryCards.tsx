'use client'

import React from 'react'
import { Card, ItemMedia, useTranslation } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  FolderIcon,
  CurrencyDollarIcon,
  ClockIcon,
  SunIcon,
  CalculatorIcon,
  CalendarBlankIcon
} from '@phosphor-icons/react'
import hrI18n from './_i18n'

interface TimeSummaryCardsProps {
  monthlyRequiredMinutes: number
  monthlyRequiredUntilYesterdayMinutes: number
  monthlyWorkedUntilYesterdayMinutes: number
  dailyAverageWorkedMinutesUntilYesterday: number
  overtimeMinutesUntilYesterday: number
}

const TimeSummaryCards: React.FC<TimeSummaryCardsProps> = ({
  monthlyRequiredMinutes,
  monthlyRequiredUntilYesterdayMinutes,
  monthlyWorkedUntilYesterdayMinutes,
  dailyAverageWorkedMinutesUntilYesterday,
  overtimeMinutesUntilYesterday
}) => {
  const fmt = (m: number) => {
    const sign = m < 0 ? '-' : ''
    const abs = Math.abs(Math.round(m))
    const hours = Math.floor(abs / 60)
    const minutes = abs % 60
    return minutes === 0 ? `${sign}${hours}h` : `${sign}${hours}h ${minutes}m`
  }

  const { t } = useTranslation(hrI18n)

  const missingMinutes = Math.max(0, monthlyRequiredUntilYesterdayMinutes - monthlyWorkedUntilYesterdayMinutes)

  return (
    <div className="gba:mt-6">
      <div
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-4 gba:gap-4"
        data-testid="time-tracking-monthly-summary"
      >
        <Card className="gba:p-6 gba:gap-0">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:text-base gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.required_month',
                'Required this month'
              )}
            </div>
            <ItemMedia variant="icon" icon={CalendarBlankIcon} iconVariant="decorative" />
          </div>
          <div className="gba:text-4xl gba:font-bold">{fmt(monthlyRequiredMinutes)}</div>
          <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.summary.required_month_desc',
              'Total required hours'
            )}
          </div>
        </Card>

        <Card className="gba:p-6 gba:gap-0">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:text-base gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.required_until_today',
                'Required until today'
              )}
            </div>
            <ItemMedia variant="icon" icon={ClockIcon} iconVariant="decorative" />
          </div>
          <div className="gba:text-4xl gba:font-bold">{fmt(monthlyRequiredUntilYesterdayMinutes)}</div>
          <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.summary.required_until_today_desc',
              'Target up to yesterday'
            )}
          </div>
        </Card>

        <Card className="gba:p-6 gba:gap-0">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:text-base gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.worked_until_today',
                'Worked until today'
              )}
            </div>
            <ItemMedia variant="icon" icon={SunIcon} iconVariant="decorative" />
          </div>
          <div className="gba:text-4xl gba:font-bold">{fmt(monthlyWorkedUntilYesterdayMinutes)}</div>
          <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.summary.worked_until_today_desc',
              'Logged up to yesterday'
            )}
          </div>
        </Card>

        <Card className="gba:p-6 gba:gap-0">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:text-base gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.missing_vs_required',
                'Missing vs required'
              )}
            </div>
            <ItemMedia variant="icon" icon={CalculatorIcon} iconVariant="decorative" />
          </div>
          <div className="gba:text-4xl gba:font-bold">{fmt(missingMinutes)}</div>
          <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.summary.missing_vs_required_desc',
              'Hours needed to reach target'
            )}
          </div>
        </Card>
      </div>

      <div
        className="gba:mt-4 gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4"
        data-testid="time-tracking-monthly-secondary"
      >
        <Card className="gba:p-6 gba:gap-0">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:text-base gba:font-semibold">{t('daily_average')}</div>
            <ItemMedia variant="icon" icon={FolderIcon} iconVariant="decorative" />
          </div>
          <div className="gba:text-4xl gba:font-bold">{fmt(dailyAverageWorkedMinutesUntilYesterday)}</div>
        </Card>

        <Card className="gba:p-6 gba:gap-0">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:text-base gba:font-semibold">{t('overtime')}</div>
            <ItemMedia variant="icon" icon={CurrencyDollarIcon} iconVariant="decorative" />
          </div>
          <div className="gba:text-4xl gba:font-bold">{fmt(overtimeMinutesUntilYesterday)}</div>
        </Card>
      </div>
    </div>
  )
}

export default TimeSummaryCards
