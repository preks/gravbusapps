import React, { useMemo } from 'react'
import { Card, useTranslation } from '@newwork/nw-design-system'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { CatalogEntry } from '../types'
import { calculateMonthlyFromYearly } from '../../../apps/employee-record/components/tabs/compensation/utils/salaryCalculations'
import translations from '../../_i18n'

interface CurrentSalaryDisplayProps {
  currentSalaryAnnual: number
  currentSalaryMonthly: number | null
  currentSalaryHourly: number | null
  currentCurrency: CatalogEntry | null
  selectedFrequency: 'annually' | 'monthly' | 'hourly'
  locale: string
}

const CurrentSalaryDisplay: React.FC<CurrentSalaryDisplayProps> = ({
  currentSalaryAnnual,
  currentSalaryMonthly,
  currentSalaryHourly,
  currentCurrency,
  selectedFrequency,
  locale
}) => {
  const { t } = useTranslation(translations)
  const currencyCode = (currentCurrency as any)?.code || 'EUR'

  // Get current salary in selected frequency
  const currentSalaryInFrequency = useMemo(() => {
    if (selectedFrequency === 'hourly') {
      return currentSalaryHourly
    }
    if (selectedFrequency === 'monthly') {
      return currentSalaryMonthly ?? calculateMonthlyFromYearly(currentSalaryAnnual)
    }
    // annually
    return currentSalaryAnnual
  }, [selectedFrequency, currentSalaryAnnual, currentSalaryMonthly, currentSalaryHourly])

  // Get secondary frequency display (only for annually/monthly, not hourly)
  const secondaryFrequencyDisplay = useMemo(() => {
    if (selectedFrequency === 'hourly') {
      return null // Don't show conversions for hourly
    }
    if (selectedFrequency === 'annually' && currentSalaryMonthly != null) {
      return {
        label: t('adjust-salary-frequency-monthly'),
        value: currentSalaryMonthly
      }
    }
    if (selectedFrequency === 'monthly') {
      return {
        label: t('adjust-salary-frequency-annually'),
        value: currentSalaryAnnual
      }
    }
    return null
  }, [selectedFrequency, currentSalaryAnnual, currentSalaryMonthly, t])

  const frequencyLabels: Record<'annually' | 'monthly' | 'hourly', string> = {
    annually: t('adjust-salary-frequency-annually'),
    monthly: t('adjust-salary-frequency-monthly'),
    hourly: t('adjust-salary-frequency-hourly')
  }

  return (
    <Card className="gba:p-3 gba:bg-muted" data-testid="adjust-employee-salary-current-salary-display">
      <div className="gba:space-y-1">
        {/* Title and Amount on same row */}
        <div className="gba:flex gba:justify-between gba:items-baseline gba:gap-2">
          <div className="gba:text-sm gba:text-muted-foreground">{t('adjust-salary-current-salary')}</div>
          <div className="gba:flex gba:items-baseline gba:gap-2">
            <div className="gba:text-xl gba:font-bold gba:text-foreground">
              {currentSalaryInFrequency == null
                ? '-'
                : formatCurrencyString(currentSalaryInFrequency, {
                    currency: currencyCode,
                    locale: locale,
                    minimumFractionDigits: selectedFrequency === 'hourly' ? 2 : 0,
                    maximumFractionDigits: selectedFrequency === 'hourly' ? 2 : 0
                  })}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">{frequencyLabels[selectedFrequency]}</div>
          </div>
        </div>
        {/* Secondary frequency on second row if exists */}
        {secondaryFrequencyDisplay && (
          <div className="gba:text-xs gba:text-muted-foreground gba:text-right">
            {formatCurrencyString(secondaryFrequencyDisplay.value, {
              currency: currencyCode,
              locale: locale,
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}{' '}
            / {secondaryFrequencyDisplay.label}
          </div>
        )}
      </div>
    </Card>
  )
}

export default CurrentSalaryDisplay
