import React from 'react'
import { Badge, Card, Progress } from '@newwork/nw-design-system'
import { ChartBarIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DashboardData } from '../../../../../types'

interface VacationEntitlementsCardProps {
  entitlements: DashboardData['entitlements']
  onNavigateToEntitlements?: () => void
}

const toTitleCase = (value: string): string =>
  value
    .split(' ')
    .map(word => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(' ')

const formatDayValue = (value: number): string => {
  const rounded = Number(value.toFixed(1))

  if (Number.isInteger(rounded)) {
    return String(rounded)
  }

  return rounded.toFixed(1)
}

export const VacationEntitlementsCard: React.FC<VacationEntitlementsCardProps> = ({
  entitlements,
  onNavigateToEntitlements
}) => {
  const activeEmployees = Math.max(entitlements.totalActiveEmployees, 0)
  const averageEntitlementPerEmployee =
    activeEmployees > 0 ? entitlements.totalVacationEntitlement / activeEmployees : 0
  const averagePendingPerEmployee = Math.max(
    averageEntitlementPerEmployee - entitlements.averageAvailable - entitlements.averageUsed,
    0
  )
  const availablePercentage =
    averageEntitlementPerEmployee > 0
      ? Math.min((entitlements.averageAvailable / averageEntitlementPerEmployee) * 100, 100)
      : 0
  const daysLabel = getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')
  const totalVacationDaysLabel = toTitleCase(
    getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_backoffice.total_vacation_days',
      'Total vacation days'
    )
  )
  const activeEmployeesLabel = toTitleCase(
    getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.active_employees', 'Active Employees')
  )
  const availableBalanceLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.dashboard.available_balance',
    'Available Balance'
  )
  const pendingBalanceDescription =
    averagePendingPerEmployee > 0
      ? getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_absence_hub.dashboard.pending_balance_average',
          `${formatDayValue(averagePendingPerEmployee)} days awaiting approval per employee`
        )
      : getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_absence_hub.dashboard.ready_to_use_average',
          'Ready to use on average'
        )

  return (
    <Card
      className="gba:flex gba:min-h-[24rem] gba:cursor-pointer gba:flex-col gba:p-5 gba:transition-shadow gba:hover:shadow-md"
      data-testid="entitlements-card"
      onClick={onNavigateToEntitlements}
    >
      <div className="gba:flex gba:h-full gba:flex-col gba:gap-5">
        <div className="gba:flex gba:items-start gba:gap-3">
          <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
            <ChartBarIcon size={20} className="gba:text-muted-foreground" />
          </div>

          <div className="gba:min-w-0">
            <Badge variant="secondary" className="gba:mb-2">
              {availableBalanceLabel}
            </Badge>

            <h5 className="gba:m-0 gba:text-sm gba:font-medium">
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

        <div className="gba:flex gba:flex-1 gba:flex-col gba:gap-5">
          <div className="gba:grid gba:gap-4 lg:gba:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="gba:space-y-2">
              <div className="gba:flex gba:items-baseline gba:gap-2">
                <span className="gba:text-4xl gba:font-semibold gba:text-foreground">
                  {formatDayValue(entitlements.averageAvailable)}
                </span>
                <span className="gba:text-lg gba:text-muted-foreground">{daysLabel}</span>
              </div>

              <p className="gba:text-sm gba:text-muted-foreground">{pendingBalanceDescription}</p>
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-3">
              <BalanceSnapshot
                label={totalVacationDaysLabel}
                value={`${formatDayValue(entitlements.totalVacationEntitlement)} ${daysLabel}`}
              />
              <BalanceSnapshot label={activeEmployeesLabel} value={String(entitlements.totalActiveEmployees)} />
            </div>
          </div>

          <div className="gba:mt-auto gba:space-y-3">
            <Progress value={availablePercentage} className="gba:h-2" />

            <div className="gba:grid gba:grid-cols-3 gba:gap-3">
              <BalanceLegendItem
                dotClassName="gba:bg-info"
                label={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.avg_used_per_employee',
                  'Avg Used per Employee'
                )}
                value={`${formatDayValue(entitlements.averageUsed)} ${daysLabel}`}
              />
              <BalanceLegendItem
                dotClassName="gba:bg-warning"
                label={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:time_absence_hub.dashboard.avg_pending_approval',
                  'Avg Pending Approval'
                )}
                value={`${formatDayValue(averagePendingPerEmployee)} ${daysLabel}`}
              />
              <BalanceLegendItem
                dotClassName="gba:bg-success"
                label={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.avg_available_per_employee',
                  'Avg Available per Employee'
                )}
                value={`${formatDayValue(entitlements.averageAvailable)} ${daysLabel}`}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

interface BalanceSnapshotProps {
  label: string
  value: string
}

const BalanceSnapshot: React.FC<BalanceSnapshotProps> = ({ label, value }) => (
  <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-3">
    <p className="gba:text-xs gba:text-muted-foreground">{label}</p>
    <p className="gba:mt-1 gba:text-base gba:font-semibold gba:text-foreground">{value}</p>
  </div>
)

interface BalanceLegendItemProps {
  dotClassName: string
  label: string
  value: string
}

const BalanceLegendItem: React.FC<BalanceLegendItemProps> = ({ dotClassName, label, value }) => (
  <div className="gba:space-y-1">
    <div className="gba:flex gba:items-center gba:gap-2">
      <span className={`gba:h-2 gba:w-2 gba:rounded-full ${dotClassName}`} />
      <span className="gba:text-xs gba:text-muted-foreground">{label}</span>
    </div>
    <p className="gba:text-sm gba:font-medium gba:text-foreground">{value}</p>
  </div>
)
