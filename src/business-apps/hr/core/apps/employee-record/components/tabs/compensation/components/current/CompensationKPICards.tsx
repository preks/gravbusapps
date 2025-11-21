'use client'

import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { CompensationData } from '../../types/compensationTypes'
import { PiCurrencyEur, PiGift, PiHeartbeat, PiPencilSimple } from 'react-icons/pi'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface CompensationKPICardsProps {
  t: (key: string, params?: any) => string
  compensationData: CompensationData
  loading: boolean
  employeeId: string
  accessToken?: string
  locale: string
  isSelfView: boolean
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
  isSelfView,
  hasPermissionToGrantBonus
}) => {
  const { currentCompensation, totalBonusesYTD, activeBenefitsCount, bonuses } = compensationData

  const baseSalary = currentCompensation?.baseSalary || 0
  const currencyCode = currentCompensation?.currency?.code || 'EUR'

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
      {/* Base Salary Card */}
      <Card className="gba:p-6 gba:relative" data-testid="compensation-base-salary-card">
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
          <div className="gba:mt-auto gba:pt-4">
            <div className="gba:p-3 gba:rounded-lg gba:bg-muted">
              <PiCurrencyEur className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
          </div>
        </div>
      </Card>

      {/* Total Bonuses Card */}
      <Card className="gba:p-6 gba:relative" data-testid="compensation-bonuses-card">
        {/* Show pencil icon only if user has permission to grant bonuses (managers/HR admins) */}
        {hasPermissionToGrantBonus && (
          <div className="gba:absolute gba:top-4 gba:right-4">
            <AppAction
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
              emptyState="enable"
              lazyLoad
            >
              <PiPencilSimple
                className="gba:w-4 gba:h-4 gba:text-muted-foreground hover:gba:text-primary gba:cursor-pointer"
                data-testid="grant-employee-bonus-action-button"
              />
            </AppAction>
          </div>
        )}
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
          <div className="gba:mt-auto gba:pt-4">
            <div className="gba:p-3 gba:rounded-lg gba:bg-muted">
              <PiGift className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
          </div>
        </div>
      </Card>

      {/* Benefits Value Card */}
      <Card className="gba:p-6 gba:relative" data-testid="compensation-benefits-card">
        {isSelfView && (
          <div className="gba:absolute gba:top-4 gba:right-4">
            <div className="gba:w-4 gba:h-4" />
          </div>
        )}
        <div className="gba:flex gba:items-start gba:justify-between">
          <div className="gba:flex-1">
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{t('current-benefits-value')}</div>
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">{activeBenefitsCount}</div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{t('current-active-benefits')}</div>
          </div>
          <div className="gba:mt-auto gba:pt-4">
            <div className="gba:p-3 gba:rounded-lg gba:bg-muted">
              <PiHeartbeat className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default CompensationKPICards
