import React from 'react'
import type { BenefitDisplayItem } from '../types'

interface BenefitDetailsListProps {
  items: BenefitDisplayItem[]
  dataTestIdPrefix: string
  t: (key: string, options?: { defaultValue?: string }) => string
}

/**
 * Display component for benefit request details
 * Shows the benefit information in a clear, readable format for review
 * Hierarchy: Benefit Type (hero) → Provider/Start Date → Financial Details → Contributions
 */
export const BenefitDetailsList: React.FC<BenefitDetailsListProps> = ({ items, dataTestIdPrefix, t }) => {
  // Extract items by key for organized display
  const benefitTypeItem = items.find(item => item.key === 'benefitType')
  const providerItem = items.find(item => item.key === 'provider')
  const startDateItem = items.find(item => item.key === 'startDate')
  const yearlyValueItem = items.find(item => item.key === 'yearlyValue')
  const monthlyValueItem = items.find(item => item.key === 'monthlyValue')
  const periodItem = items.find(item => item.key === 'period')
  const employeeYearlyContItem = items.find(item => item.key === 'employeeYearlyContribution')
  const employeeMonthlyContItem = items.find(item => item.key === 'employeeMonthlyContribution')

  return (
    <div className="gba:space-y-6" data-testid={`${dataTestIdPrefix}-list`}>
      {/* Hero: Benefit Type - Most prominent */}
      {benefitTypeItem && (
        <div data-testid={`${dataTestIdPrefix}-${benefitTypeItem.key}`}>
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">
            {t('request-benefit-review-benefit-type', { defaultValue: 'Benefit Type' })}
          </div>
          <div className="gba:text-2xl gba:font-bold">{benefitTypeItem.value || '-'}</div>
        </div>
      )}

      {/* Secondary Info Grid: Provider and Start Date */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-6">
        {providerItem && (
          <div data-testid={`${dataTestIdPrefix}-${providerItem.key}`}>
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{providerItem.label}</div>
            <div className="gba:font-semibold gba:text-base">{providerItem.value || '-'}</div>
          </div>
        )}
        {startDateItem && (
          <div data-testid={`${dataTestIdPrefix}-${startDateItem.key}`}>
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{startDateItem.label}</div>
            <div className="gba:font-semibold gba:text-base">{startDateItem.value || '-'}</div>
          </div>
        )}
      </div>

      {/* Financial Details */}
      {(yearlyValueItem || monthlyValueItem) && (
        <div className="gba:grid gba:grid-cols-2 gba:gap-6" data-testid={`${dataTestIdPrefix}-financial-details`}>
          {yearlyValueItem && (
            <div data-testid={`${dataTestIdPrefix}-${yearlyValueItem.key}`}>
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{yearlyValueItem.label}</div>
              <div className="gba:text-xl gba:font-bold">{yearlyValueItem.value || '-'}</div>
            </div>
          )}
          {monthlyValueItem && (
            <div data-testid={`${dataTestIdPrefix}-${monthlyValueItem.key}`}>
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{monthlyValueItem.label}</div>
              <div className="gba:text-xl gba:font-bold">{monthlyValueItem.value || '-'}</div>
            </div>
          )}
        </div>
      )}

      {/* Period - if available */}
      {periodItem && (
        <div data-testid={`${dataTestIdPrefix}-${periodItem.key}`}>
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{periodItem.label}</div>
          <div className="gba:font-medium">{periodItem.value || '-'}</div>
        </div>
      )}

      {/* Employee Contributions - if applicable */}
      {(employeeYearlyContItem || employeeMonthlyContItem) && (
        <div className="gba:pt-2">
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-3">
            {t('request-benefit-review-employee-contributions', { defaultValue: 'Employee Contributions' })}
          </div>
          <div className="gba:grid gba:grid-cols-2 gba:gap-6">
            {employeeYearlyContItem && (
              <div data-testid={`${dataTestIdPrefix}-${employeeYearlyContItem.key}`}>
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{employeeYearlyContItem.label}</div>
                <div className="gba:font-semibold">{employeeYearlyContItem.value || '-'}</div>
              </div>
            )}
            {employeeMonthlyContItem && (
              <div data-testid={`${dataTestIdPrefix}-${employeeMonthlyContItem.key}`}>
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{employeeMonthlyContItem.label}</div>
                <div className="gba:font-semibold">{employeeMonthlyContItem.value || '-'}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
