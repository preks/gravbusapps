import React from 'react'
import { Card, useTranslation } from '@newwork/nw-design-system'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { CatalogEntry } from '../types'
import translations from '../../../apps/employee-record/_i18n'

interface NewSalaryPreviewProps {
  currentSalary: number
  newSalary: number
  amountIncrease: number | null
  percentageIncrease: number | null
  currentCurrency: CatalogEntry | null
  locale: string
}

const NewSalaryPreview: React.FC<NewSalaryPreviewProps> = ({
  currentSalary,
  newSalary,
  amountIncrease,
  percentageIncrease,
  currentCurrency,
  locale
}) => {
  const { t } = useTranslation(translations)
  const currencyCode = (currentCurrency as any)?.code || 'EUR'

  if (!amountIncrease && !percentageIncrease) return null
  if ((amountIncrease || 0) <= 0 && (percentageIncrease || 0) <= 0) return null

  return (
    <Card className="gba:p-4 gba:border-2 gba:border-primary" data-testid="adjust-employee-salary-new-salary-preview">
      <div className="gba:space-y-2">
        <div className="gba:text-sm gba:text-muted-foreground">{t('adjust-salary-new-salary')}</div>
        <div className="gba:text-2xl gba:font-bold gba:text-primary">
          {formatCurrencyString(newSalary, {
            currency: currencyCode,
            locale: locale,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </div>
        <div className="gba:text-xs gba:text-muted-foreground">
          {formatCurrencyString(currentSalary, {
            currency: currencyCode,
            locale: locale,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}{' '}
          +{' '}
          {amountIncrease && amountIncrease > 0
            ? formatCurrencyString(amountIncrease, {
                currency: currencyCode,
                locale: locale,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })
            : percentageIncrease && percentageIncrease > 0
              ? `${percentageIncrease.toFixed(2)}%`
              : ''}{' '}
          ={' '}
          {formatCurrencyString(newSalary, {
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

export default NewSalaryPreview
