'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { CompensationData } from '../../types/compensationTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'

interface CompensationBandSectionProps {
  t: (key: string, params?: any) => string
  compensationData: CompensationData
  loading: boolean
  locale: string
}

/**
 * Compensation Band Section Component
 * Displays compensation band information including name, salary range, and pay grade
 */
const CompensationBandSection: React.FC<CompensationBandSectionProps> = ({ t, compensationData, loading, locale }) => {
  const { currentCompensation } = compensationData
  const currencyCode = currentCompensation?.currency?.code || 'EUR'

  /**
   * Render compensation band content based on loading state and data availability
   */
  const renderCompensationBandContent = () => {
    // Loading state
    if (loading) {
      return <div className="gba:text-center gba:text-muted-foreground gba:py-8">{t('band-loading')}</div>
    }

    // Empty state - no compensation band assigned
    if (!currentCompensation?.compensationBand) {
      return (
        <div className="gba:text-center gba:text-muted-foreground gba:py-8" data-testid="compensation-band-empty-state">
          {t('band-no-band-assigned')}
        </div>
      )
    }

    // Content - display compensation band details
    const { compensationBand } = currentCompensation
    return (
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
        <div>
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{t('band-name')}</div>
          <div className="gba:font-medium gba:text-foreground">{compensationBand.name}</div>
        </div>
        <div>
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{t('band-salary-range')}</div>
          <div className="gba:font-medium gba:text-foreground">
            {formatCurrencyString(compensationBand.minSalary, {
              currency: currencyCode,
              locale: locale,
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}{' '}
            -{' '}
            {formatCurrencyString(compensationBand.maxSalary, {
              currency: currencyCode,
              locale: locale,
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </div>
        </div>
        <div>
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{t('band-pay-grade')}</div>
          <div className="gba:font-medium gba:text-foreground">
            {t('band-level')} {compensationBand.payGrade}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card data-testid="compensation-band-section">
      <CardHeader>
        <CardTitle>{t('band-title')}</CardTitle>
      </CardHeader>
      <CardContent>{renderCompensationBandContent()}</CardContent>
    </Card>
  )
}

export default CompensationBandSection
