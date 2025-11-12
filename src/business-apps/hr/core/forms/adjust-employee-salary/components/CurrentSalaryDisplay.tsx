import React from 'react'
import { Card, useTranslation } from '@newwork/nw-design-system'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { CatalogEntry } from '../types'
import translations from '../../../apps/employee-record/_i18n'

interface CurrentSalaryDisplayProps {
  currentSalary: number
  currentCurrency: CatalogEntry | null
  locale: string
}

const CurrentSalaryDisplay: React.FC<CurrentSalaryDisplayProps> = ({ currentSalary, currentCurrency, locale }) => {
  const { t } = useTranslation(translations)
  const currencyCode = (currentCurrency as any)?.code || 'EUR'

  return (
    <Card className="gba:p-4 gba:bg-muted" data-testid="adjust-employee-salary-current-salary-display">
      <div className="gba:space-y-2">
        <div className="gba:text-sm gba:text-muted-foreground">{t('adjust-salary-current-salary')}</div>
        <div className="gba:text-2xl gba:font-bold gba:text-foreground">
          {formatCurrencyString(currentSalary, {
            currency: currencyCode,
            locale: locale,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </div>
      </div>
    </Card>
  )
}

export default CurrentSalaryDisplay
