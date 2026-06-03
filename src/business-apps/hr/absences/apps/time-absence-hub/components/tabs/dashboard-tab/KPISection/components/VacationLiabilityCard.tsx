import React from 'react'
import { Badge, Card, Progress } from '@newwork/nw-design-system'
import { ChartBarIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DashboardData } from '../../../../../types'
import { formatCurrency } from '../../../../../utils'

interface VacationLiabilityCardProps {
  entitlements: DashboardData['entitlements']
}

const formatDayValue = (value: number): string => {
  const rounded = Number(value.toFixed(1))

  if (Number.isInteger(rounded)) {
    return String(rounded)
  }

  return rounded.toFixed(1)
}

export const VacationLiabilityCard: React.FC<VacationLiabilityCardProps> = ({ entitlements }) => {
  const averageRemainingPerEmployee =
    entitlements.totalActiveEmployees > 0 ? entitlements.totalVacationLiability / entitlements.totalActiveEmployees : 0

  const multipleCurrenciesMessage = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.dashboard.multiple_currencies_cannot_sum',
    'Multiple currencies, cannot sum.'
  )

  const hasCostData = !entitlements.hasMultipleCurrencies && entitlements.estimatedCostPerDay > 0
  const noDataLabel = getTranslationFromI18nKeyAndLabel('lowcoder:common.no_data', 'No data')

  let financialImpactLabel = noDataLabel
  if (entitlements.hasMultipleCurrencies) {
    financialImpactLabel = multipleCurrenciesMessage
  } else if (hasCostData) {
    financialImpactLabel = formatCurrency(entitlements.totalLiabilityEstimate, entitlements.currencyCode)
  }

  let estimatedCostPerDayLabel = noDataLabel
  if (entitlements.hasMultipleCurrencies) {
    estimatedCostPerDayLabel = multipleCurrenciesMessage
  } else if (hasCostData) {
    estimatedCostPerDayLabel = formatCurrency(entitlements.estimatedCostPerDay, entitlements.currencyCode)
  }
  const remainingShare =
    entitlements.totalVacationEntitlement > 0
      ? Math.min((entitlements.totalVacationLiability / entitlements.totalVacationEntitlement) * 100, 100)
      : 0
  const daysLabel = getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')
  const liabilityExposureLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.dashboard.liability_exposure',
    'Liability Exposure'
  )
  let liabilityDescription = getTranslationFromI18nKeyAndLabel(
    'lowcoder:time_absence_hub.dashboard.liability_financial_hint_missing',
    'Financial impact is currently unavailable'
  )
  if (entitlements.hasMultipleCurrencies) {
    liabilityDescription = multipleCurrenciesMessage
  } else if (hasCostData) {
    liabilityDescription = getTranslationFromI18nKeyAndLabel(
      'lowcoder:time_absence_hub.dashboard.liability_financial_hint',
      `${financialImpactLabel} estimated financial impact`
    )
  }

  return (
    <Card
      className="gba:flex gba:min-h-[24rem] gba:cursor-default gba:flex-col gba:p-5 gba:transition-shadow gba:hover:shadow-md"
      data-testid="vacation-liability-card"
    >
      <div className="gba:flex gba:h-full gba:flex-col gba:gap-5">
        <div className="gba:flex gba:items-start gba:gap-3">
          <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
            <ChartBarIcon size={20} className="gba:text-muted-foreground" />
          </div>

          <div className="gba:min-w-0">
            <Badge variant="secondary" className="gba:mb-2">
              {liabilityExposureLabel}
            </Badge>

            <h5 className="gba:m-0 gba:text-sm gba:font-medium">
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

        <div className="gba:flex gba:flex-1 gba:flex-col gba:gap-5">
          <div className="gba:grid gba:gap-4 lg:gba:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="gba:space-y-2">
              <div className="gba:flex gba:items-baseline gba:gap-2">
                <span className="gba:text-4xl gba:font-semibold gba:text-foreground">
                  {formatDayValue(entitlements.totalVacationLiability)}
                </span>
                <span className="gba:text-lg gba:text-muted-foreground">{daysLabel}</span>
              </div>

              <p className="gba:text-sm gba:text-muted-foreground">{liabilityDescription}</p>
            </div>

            <div className="gba:grid gba:grid-cols-1 gba:gap-3 sm:gba:grid-cols-2 lg:gba:grid-cols-1">
              <LiabilitySnapshot
                label={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.financial_impact',
                  'Financial Impact'
                )}
                value={financialImpactLabel}
              />
              <LiabilitySnapshot
                label={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.estimated_cost_per_day',
                  'Estimated Cost per Day'
                )}
                value={estimatedCostPerDayLabel}
              />
            </div>
          </div>

          <div className="gba:mt-auto gba:space-y-3">
            <Progress value={remainingShare} className="gba:h-2" />

            <div className="gba:grid gba:grid-cols-2 gba:gap-3">
              <LiabilityLegendItem
                dotClassName="gba:bg-warning"
                label={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.avg_remaining_per_employee',
                  'Avg Remaining per Employee'
                )}
                value={`${formatDayValue(averageRemainingPerEmployee)} ${daysLabel}`}
              />
              <LiabilityLegendItem
                dotClassName="gba:bg-info"
                label={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.total_active_employees',
                  'Total Active Employees'
                )}
                value={String(entitlements.totalActiveEmployees)}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

interface LiabilitySnapshotProps {
  label: string
  value: string
}

const LiabilitySnapshot: React.FC<LiabilitySnapshotProps> = ({ label, value }) => (
  <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-3">
    <p className="gba:text-xs gba:text-muted-foreground">{label}</p>
    <p className="gba:mt-1 gba:text-base gba:font-semibold gba:text-foreground">{value}</p>
  </div>
)

interface LiabilityLegendItemProps {
  dotClassName: string
  label: string
  value: string
}

const LiabilityLegendItem: React.FC<LiabilityLegendItemProps> = ({ dotClassName, label, value }) => (
  <div className="gba:space-y-1">
    <div className="gba:flex gba:items-center gba:gap-2">
      <span className={`gba:h-2 gba:w-2 gba:rounded-full ${dotClassName}`} />
      <span className="gba:text-xs gba:text-muted-foreground">{label}</span>
    </div>
    <p className="gba:text-sm gba:font-medium gba:text-foreground">{value}</p>
  </div>
)
