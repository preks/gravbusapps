import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DashboardData } from '../../../../../types'

interface VacationLiabilityCardProps {
  entitlements: DashboardData['entitlements']
}

export const VacationLiabilityCard: React.FC<VacationLiabilityCardProps> = ({ entitlements }) => {
  return (
    <Card className="gba:hover:shadow-md gba:transition-shadow gba:p-4" data-testid="vacation-liability-card">
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        <div className="gba:text-orange-600 gba:text-lg">📊</div>
        <div>
          <h5 className="gba:text-sm gba:font-medium gba:m-0">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.vacation_liability_financial_impact',
              'Vacation Liability & Financial Impact'
            )}
          </h5>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.outstanding_vacation_days_financial_implications',
              'Outstanding vacation days and financial implications'
            )}
          </p>
        </div>
      </div>

      <div className="gba:space-y-4">
        {/* Top metrics grid */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
          <div className="gba:text-center gba:p-3 gba:bg-red-50 gba:rounded">
            <div className="gba:text-xl gba:font-bold gba:text-red-600">
              {entitlements.totalVacationLiability.toFixed(0)}
            </div>
            <div className="gba:text-xs gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.remaining_days_total',
                'Remaining Days Total'
              )}
            </div>
          </div>
          <div className="gba:text-center gba:p-3 gba:bg-amber-50 gba:rounded">
            <div className="gba:text-xl gba:font-bold gba:text-amber-600">TBD</div>
            <div className="gba:text-xs gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.financial_impact',
                'Financial Impact'
              )}
            </div>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className="gba:space-y-2">
          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.avg_remaining_per_employee',
                'Avg Remaining per Employee'
              )}
            </span>
            <span className="gba:font-medium gba:text-red-600">
              {(entitlements.totalVacationLiability / entitlements.totalActiveEmployees).toFixed(1)}{' '}
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')}
            </span>
          </div>

          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.total_active_employees',
                'Total Active Employees'
              )}
            </span>
            <span className="gba:font-medium gba:text-blue-600">{entitlements.totalActiveEmployees}</span>
          </div>

          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.estimated_cost_per_day',
                'Estimated Cost per Day'
              )}
            </span>
            <span className="gba:font-medium gba:text-amber-600">TBD</span>
          </div>

          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.total_liability_estimate',
                'Total Liability Estimate'
              )}
            </span>
            <span className="gba:font-medium gba:text-amber-600">TBD</span>
          </div>
        </div>

        {/* Calculation note */}
        <div className="gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded gba:p-3">
          <div className="gba:text-xs gba:text-amber-800">
            💰{' '}
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.financial_calculations_coming_soon',
              'Financial calculations coming soon - will include average salary costs and vacation liability estimates'
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
