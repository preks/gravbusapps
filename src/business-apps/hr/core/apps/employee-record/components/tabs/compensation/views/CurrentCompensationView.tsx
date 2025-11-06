'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { CompensationData } from '../types/compensationTypes'
import { PiCurrencyEur, PiGift, PiHeartbeat } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import TotalRewardsCard from '../components/current/TotalRewardsCard'
import BenefitsPerksSection from '../components/current/BenefitsPerksSection'
import { formatCurrencyString } from '@/common/utils/numberFormatter'

interface CurrentCompensationViewProps extends BusinessAppContextProps {
  t: (key: string, params?: any) => string
  compensationData?: CompensationData | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
  employeeId: string
  locale: string
}

/**
 * Current Compensation View Component
 * Displays base salary, bonuses YTD, and benefits information
 */
const CurrentCompensationView: React.FC<CurrentCompensationViewProps> = ({
  t,
  compensationData,
  loading,
  error,
  onRetry,
  employeeId,
  accessToken,
  userInfo,
  additionalData,
  locale
}) => {
  // Handle loading state - show loading indicators when data is not yet available
  if (loading && !compensationData) {
    return (
      <div className="gba:space-y-6" data-testid="current-compensation-view-loading">
        <div className="gba:text-center gba:text-muted-foreground gba:py-12">
          <div className="gba:text-lg">{t('loading-compensation-data')}</div>
        </div>
      </div>
    )
  }

  // Handle error state with retry option
  if (error) {
    return (
      <div className="gba:space-y-6" data-testid="current-compensation-view-error">
        <Card className="gba:p-8">
          <div className="gba:text-center gba:space-y-4">
            <div className="gba:text-destructive gba:text-lg gba:font-semibold">{t('compensation-error-title')}</div>
            <div className="gba:text-muted-foreground">{error}</div>
            {onRetry && (
              <div className="gba:mt-4">
                <button
                  onClick={onRetry}
                  className="gba:px-4 gba:py-2 gba:bg-primary gba:text-primary-foreground gba:rounded-md gba:hover:bg-primary/90"
                  data-testid="current-compensation-retry-button"
                >
                  {t('compensation-error-retry')}
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // Handle empty state (no error, but no data either)
  if (!compensationData) {
    return (
      <div className="gba:space-y-6" data-testid="current-compensation-view-empty">
        <div className="gba:text-center gba:text-muted-foreground gba:py-12">
          <div className="gba:text-lg">{t('rewards-no-data')}</div>
          <div className="gba:text-sm gba:mt-2">No compensation records have been created yet.</div>
        </div>
      </div>
    )
  }

  const { currentCompensation, totalBonusesYTD, activeBenefitsCount, bonuses } = compensationData

  const baseSalary = currentCompensation?.baseSalary || 0
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
    <div className="gba:space-y-6" data-testid="current-compensation-view">
      {/* KPI Cards Row */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
        {/* Base Salary Card */}
        <Card className="gba:p-6" data-testid="compensation-base-salary-card">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:flex-1">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{t('current-base-salary')}</div>
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                {loading
                  ? '-'
                  : formatCurrencyString(baseSalary, {
                      currency: currencyCode,
                      locale: locale,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
              </div>
              {currentCompensation?.payFrequency && (
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  {currentCompensation.payFrequency.value}
                </div>
              )}
            </div>
            <div className="gba:p-3 gba:rounded-lg gba:bg-muted">
              <PiCurrencyEur className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
          </div>
        </Card>

        {/* Total Bonuses Card */}
        <Card className="gba:p-6" data-testid="compensation-bonuses-card">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:flex-1">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{t('current-total-bonuses-ytd')}</div>
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                {loading
                  ? '-'
                  : formatCurrencyString(totalBonusesYTD, {
                      currency: currencyCode,
                      locale: locale,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
              </div>
              <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                {bonuses.length} {bonuses.length === 1 ? t('current-bonus') : t('current-bonuses')}
              </div>
            </div>
            <div className="gba:p-3 gba:rounded-lg gba:bg-muted">
              <PiGift className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
          </div>
        </Card>

        {/* Benefits Value Card */}
        <Card className="gba:p-6" data-testid="compensation-benefits-card">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:flex-1">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{t('current-benefits-value')}</div>
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">{activeBenefitsCount}</div>
              <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{t('current-active-benefits')}</div>
            </div>
            <div className="gba:p-3 gba:rounded-lg gba:bg-muted">
              <PiHeartbeat className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Total Rewards 360° View */}
      <TotalRewardsCard t={t} compensationData={compensationData} loading={loading} locale={locale} />

      {/* Benefits & Perks Section */}
      <BenefitsPerksSection
        t={t}
        employeeId={employeeId}
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        loading={loading}
        currencyCode={currencyCode}
        locale={locale}
      />

      {/* Compensation Band Info */}
      <Card data-testid="compensation-band-section">
        <CardHeader>
          <CardTitle>{t('band-title')}</CardTitle>
        </CardHeader>
        <CardContent>{renderCompensationBandContent()}</CardContent>
      </Card>
    </div>
  )
}

export default CurrentCompensationView
