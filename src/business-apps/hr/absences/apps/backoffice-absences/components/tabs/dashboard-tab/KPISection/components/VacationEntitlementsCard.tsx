import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { RiBarChart2Line } from '@remixicon/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DashboardData } from '../../../../../types'

interface VacationEntitlementsCardProps {
  entitlements: DashboardData['entitlements']
  onNavigateToEntitlements?: () => void
}

export const VacationEntitlementsCard: React.FC<VacationEntitlementsCardProps> = ({
  entitlements,
  onNavigateToEntitlements
}) => {
  return (
    <Card
      className="gba:hover:shadow-md gba:transition-shadow gba:p-4 gba:cursor-pointer"
      data-testid="entitlements-card"
      onClick={onNavigateToEntitlements}
    >
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        <RiBarChart2Line className="gba:text-purple-600" size={20} />
        <div>
          <h5 className="gba:text-sm gba:font-medium gba:m-0">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.vacation_entitlements_analytics',
              'Vacation Entitlements Analytics'
            )}
          </h5>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.current_year_vacation_data_from',
              'Current year vacation data from'
            )}{' '}
            {entitlements.totalActiveEmployees}{' '}
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.active_employees',
              'active employees'
            )}
          </p>
        </div>
      </div>

      <div className="gba:space-y-3">
        {/* Key Metrics */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:mb-4">
          <div className="gba:text-center gba:p-2 gba:bg-blue-50 gba:rounded">
            <div className="gba:text-lg gba:font-bold gba:text-blue-600">
              {entitlements.totalVacationEntitlement.toFixed(0)}
            </div>
            <div className="gba:text-xs gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.total_vacation_days',
                'Total vacation days'
              )}
            </div>
          </div>
          <div className="gba:text-center gba:p-2 gba:bg-green-50 gba:rounded">
            <div className="gba:text-lg gba:font-bold gba:text-green-600">{entitlements.totalActiveEmployees}</div>
            <div className="gba:text-xs gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.active_employees',
                'Active Employees'
              )}
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="gba:flex gba:justify-between gba:items-center">
          <span className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.avg_available_per_employee',
              'Avg Available per Employee'
            )}
          </span>
          <span className="gba:font-medium gba:text-blue-600">
            {entitlements.averageAvailable.toFixed(1)}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')}
          </span>
        </div>

        <div className="gba:flex gba:justify-between gba:items-center">
          <span className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.avg_used_per_employee',
              'Avg Used per Employee'
            )}
          </span>
          <span className="gba:font-medium gba:text-orange-600">
            {entitlements.averageUsed.toFixed(1)}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')}
          </span>
        </div>

        <div className="gba:flex gba:justify-between gba:items-center">
          <span className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.total_vacation_entitlement',
              'Total Vacation Entitlement'
            )}
          </span>
          <span className="gba:font-medium gba:text-purple-600">
            {entitlements.totalVacationEntitlement}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')}
          </span>
        </div>

        {/* Real data indicator */}
        <div className="gba:text-xs gba:text-center gba:text-gray-500 gba:border-t gba:pt-2">
          ✅{' '}
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.real_vacation_data_indicator',
            'Real vacation data from active employees (current year only)'
          )}
        </div>
      </div>
    </Card>
  )
}
