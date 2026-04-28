'use client'

import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { CompensationData } from '../../types/compensationTypes'
import { CurrencyEurIcon, GiftIcon, HeartbeatIcon } from '@phosphor-icons/react'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { normalizeSalaryData, hasAnySalaryData } from '../../utils/salaryCalculations'
import { CompaRatioBar } from '@/business-apps/hr/compensation-planning/apps/manager-compensation-planning/components/CompaRatioBar'

interface CompensationKPICardsProps {
  t: (key: string, params?: any) => string
  compensationData: CompensationData
  loading: boolean
  employeeId: string
  accessToken?: string
  locale: string
  hasPermissionToAdjustSalary: boolean
  hasPermissionToGrantBonus: boolean
}

/**
 * Compensation KPI Cards Component
 * Displays three key metrics: Base Salary, Total Bonuses YTD, and Benefits Value
 */
const CompensationKPICards: React.FC<CompensationKPICardsProps> = ({
  t,
  compensationData,
  loading,
  employeeId,
  accessToken,
  locale,
  hasPermissionToAdjustSalary,
  hasPermissionToGrantBonus
}) => {
  const { currentCompensation, totalBonusesYTD, activeBonusesCount, activeBenefitsCount } = compensationData

  const currencyCode = currentCompensation?.currency?.code || 'EUR'
  const compensationBand = currentCompensation?.compensationBand ?? null

  // Normalize salary data: calculate missing values and determine what to display
  const normalizedSalary = normalizeSalaryData(
    currentCompensation?.baseSalary,
    currentCompensation?.monthlyGrossSalary,
    currentCompensation?.hourlyGrossSalary,
    currencyCode
  )

  // Check if any salary data exists (for new employees with null salary)
  const hasSalaryData = hasAnySalaryData(normalizedSalary)

  // Currency formatting options (reused across all salary displays)
  const currencyFormatOptions = {
    currency: normalizedSalary.currencyCode,
    locale: locale,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }

  const hourlyFormatOptions = {
    currency: normalizedSalary.currencyCode,
    locale: locale,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
      {/* Base Salary Card */}
      <Card className="gba:relative" data-testid="compensation-base-salary-card">
        <CardContent className="gba:p-6">
          {/* Show pencil icon only for managers/HR admins (permission already excludes self-view) */}
          {hasPermissionToAdjustSalary && (
            <div className="gba:absolute gba:top-4 gba:right-4">
              <AppAction
                variant="update-secondary"
                contexts={[
                  {
                    context: FlowContextName.adjustEmployeeSalary,
                    contextData: { employeeId: employeeId }
                  }
                ]}
                prefixDataTestId="adjust-employee-salary-action"
                accessToken={accessToken}
                data-testid="adjust-employee-salary-action-button"
              />
            </div>
          )}
          <div className="gba:min-h-[120px]">
            <div className="gba:pr-20">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{t('current-base-salary')}</div>
              {hasSalaryData ? (
                <>
                  {/* Hourly-only mode: Show hourly as main display if it's the only data */}
                  {normalizedSalary.isHourlyOnly ? (
                    <div className="gba:flex gba:items-baseline gba:gap-2">
                      <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                        {loading ? '-' : formatCurrencyString(normalizedSalary.hourly, hourlyFormatOptions)}
                      </div>
                      <div className="gba:text-sm gba:text-muted-foreground">{t('current-hourly')}</div>
                    </div>
                  ) : (
                    <>
                      {/* Standard mode: Show yearly/monthly with hierarchy, hourly if available */}
                      {normalizedSalary.hasYearly && (
                        <div className="gba:flex gba:items-baseline gba:gap-2">
                          <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                            {loading ? '-' : formatCurrencyString(normalizedSalary.yearly, currencyFormatOptions)}
                          </div>
                          <div className="gba:text-sm gba:text-muted-foreground">{t('current-annually')}</div>
                        </div>
                      )}
                      {normalizedSalary.hasMonthly && (
                        <div className="gba:text-sm gba:text-muted-foreground gba:mt-2">
                          {formatCurrencyString(normalizedSalary.monthly, currencyFormatOptions)} /{' '}
                          {t('current-monthly')}
                        </div>
                      )}
                      {/* Hourly rate - show if provided AND we also have yearly/monthly (mixed mode) */}
                      {normalizedSalary.hourlyWasProvided && !normalizedSalary.isHourlyOnly && (
                        <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                          {formatCurrencyString(normalizedSalary.hourly, hourlyFormatOptions)} / {t('current-hourly')}
                        </div>
                      )}
                    </>
                  )}
                  {normalizedSalary.yearly != null && compensationBand && (
                    <div className="gba:mt-4">
                      <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
                        {t('band-position-label', 'Position in compensation band')}
                      </div>
                      <CompaRatioBar
                        band={compensationBand}
                        currentSalary={normalizedSalary.yearly}
                        currencyCode={currencyCode}
                        align="start"
                        fullWidth
                      />
                      <div className="gba:mt-2 gba:text-sm gba:text-muted-foreground gba:tabular-nums">
                        <span className="gba:font-medium gba:text-foreground">{t('band-short-label', 'Band')}:</span>{' '}
                        {formatCurrencyString(compensationBand.minSalary, currencyFormatOptions)} -{' '}
                        {formatCurrencyString(compensationBand.maxSalary, currencyFormatOptions)}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                  {t('no-salary-record', 'No salary record')}
                </div>
              )}
            </div>
          </div>
          {/* Icon container - fixed position at bottom right of card */}
          <div className="gba:absolute gba:bottom-4 gba:right-4">
            <div className="gba:p-3 gba:rounded-lg gba:bg-muted">
              <CurrencyEurIcon className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Bonuses Card */}
      <Card className="gba:relative" data-testid="compensation-bonuses-card">
        <CardContent className="gba:p-6">
          {/* Show pencil icon only for managers/HR admins (permission already excludes self-view) */}
          {hasPermissionToGrantBonus && (
            <div className="gba:absolute gba:top-4 gba:right-4">
              <AppAction
                variant="update-secondary"
                contexts={[
                  {
                    context: FlowContextName.grantEmployeeBonus,
                    contextData: {
                      employeeId: employeeId
                    }
                  }
                ]}
                prefixDataTestId="grant-employee-bonus-action"
                accessToken={accessToken}
                data-testid="grant-employee-bonus-action-button"
              />
            </div>
          )}
          <div className="gba:min-h-[120px]">
            <div className="gba:pr-20">
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
                {activeBonusesCount} {activeBonusesCount === 1 ? t('current-bonus') : t('current-bonuses')}
              </div>
            </div>
          </div>
          {/* Icon container - fixed position at bottom right of card */}
          <div className="gba:absolute gba:bottom-4 gba:right-4">
            <div className="gba:p-3 gba:rounded-lg gba:bg-muted">
              <GiftIcon className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Value Card */}
      <Card className="gba:relative" data-testid="compensation-benefits-card">
        <CardContent className="gba:p-6">
          <div className="gba:min-h-[120px]">
            <div className="gba:pr-20">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{t('current-benefits-value')}</div>
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">{activeBenefitsCount}</div>
              <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{t('current-active-benefits')}</div>
            </div>
          </div>
          {/* Icon container - fixed position at bottom right of card */}
          <div className="gba:absolute gba:bottom-4 gba:right-4">
            <div className="gba:p-3 gba:rounded-lg gba:bg-muted">
              <HeartbeatIcon className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CompensationKPICards
