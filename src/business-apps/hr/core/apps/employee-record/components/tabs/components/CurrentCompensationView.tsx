'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { CompensationData } from '../../../types/compensationTypes'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../common/utils/windowUtils'
import { PiCurrencyEur, PiGift, PiHeartbeat } from 'react-icons/pi'
import TotalRewardsCard from './TotalRewardsCard'
import BenefitsPerksSection from './BenefitsPerksSection'

interface CurrentCompensationViewProps {
  compensationData: CompensationData
  loading: boolean
  employeeId: string
  accessToken: string
}

/**
 * Current Compensation View Component
 * Displays base salary, bonuses YTD, and benefits information
 */
const CurrentCompensationView: React.FC<CurrentCompensationViewProps> = ({
  compensationData,
  loading,
  employeeId,
  accessToken
}) => {
  // Format currency for display
  const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const { currentCompensation, totalBonusesYTD, activeBenefitsCount, bonuses } = compensationData

  const baseSalary = currentCompensation?.baseSalary || 0
  const currencyCode = currentCompensation?.currency?.code || 'EUR'

  return (
    <div className="gba:space-y-6" data-testid="current-compensation-view">
      {/* KPI Cards Row */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
        {/* Base Salary Card */}
        <Card className="gba:p-6" data-testid="compensation-base-salary-card">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:flex-1">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">
                {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.base_salary', 'Base Salary')}
              </div>
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                {loading ? '-' : formatCurrency(baseSalary, currencyCode)}
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
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">
                {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.total_bonuses_ytd', 'Total Bonuses (YTD)')}
              </div>
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                {loading ? '-' : formatCurrency(totalBonusesYTD, currencyCode)}
              </div>
              <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                {bonuses.length} {bonuses.length === 1 ? 'bonus' : 'bonuses'}
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
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">
                {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.benefits_value', 'Benefits Value')}
              </div>
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">{activeBenefitsCount}</div>
              <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">Active Benefits</div>
            </div>
            <div className="gba:p-3 gba:rounded-lg gba:bg-muted">
              <PiHeartbeat className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Total Rewards 360° View */}
      <TotalRewardsCard compensationData={compensationData} loading={loading} />

      {/* Benefits & Perks Section */}
      <BenefitsPerksSection
        employeeId={employeeId}
        accessToken={accessToken}
        loading={loading}
        currencyCode={currencyCode}
      />

      {/* Compensation Band Info */}
      <Card data-testid="compensation-band-section">
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.compensation_band', 'Compensation Band')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="gba:text-center gba:text-muted-foreground gba:py-8">Loading compensation band...</div>
          ) : currentCompensation?.compensationBand ? (
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
              <div>
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">Band Name</div>
                <div className="gba:font-medium gba:text-foreground">{currentCompensation.compensationBand.name}</div>
              </div>
              <div>
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">Salary Range</div>
                <div className="gba:font-medium gba:text-foreground">
                  {formatCurrency(currentCompensation.compensationBand.minSalary, currencyCode)} -{' '}
                  {formatCurrency(currentCompensation.compensationBand.maxSalary, currencyCode)}
                </div>
              </div>
              <div>
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">Pay Grade</div>
                <div className="gba:font-medium gba:text-foreground">
                  Level {currentCompensation.compensationBand.payGrade}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="gba:text-center gba:text-muted-foreground gba:py-8"
              data-testid="compensation-band-empty-state"
            >
              No compensation band assigned. Compensation bands are linked through job levels.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CurrentCompensationView
