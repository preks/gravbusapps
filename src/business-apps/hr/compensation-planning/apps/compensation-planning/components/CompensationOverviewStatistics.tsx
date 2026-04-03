import React, { useMemo, memo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ChartLineIcon, CurrencyCircleDollarIcon, GiftIcon, UsersIcon } from '@phosphor-icons/react'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import { extractCurrencyCode, formatCurrencyString } from '@/common/utils/numberFormatter'
import { formatDate, formatNumberFunction } from '@/common/utils/windowUtils'
import translations from '../_i18n'

const KPI_COLORS = {
  employees: 'var(--nw-color-primary-500)',
  salaryCost: 'var(--nw-color-success-500)',
  avgSalary: 'var(--nw-color-info-500)',
  bonusesYtd: 'var(--nw-color-warning-500)'
} as const

export interface CompensationOverviewStatisticsProps {
  employeeCount: number
  annualSalaryCost: number
  averageSalary: number
  bonusesYtd: number
  currency: string
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const CompensationOverviewStatisticsComponent: React.FC<CompensationOverviewStatisticsProps> = ({
  employeeCount,
  annualSalaryCost,
  averageSalary,
  bonusesYtd,
  currency,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const { t } = useTranslation(translations)

  const bonusesYtdDescription = useMemo(
    () => t('overview-kpi-bonuses-ytd-desc', { date: formatDate(new Date(), 'date.medium') ?? '—' }),
    [t]
  )

  const widgets: WidgetItem[] = useMemo(() => {
    const kpiMoney = {
      currency: extractCurrencyCode(currency),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
    return [
      {
        key: 'overview-employees',
        title: t('overview-kpi-employees-title'),
        value: formatNumberFunction(String(employeeCount), '0,0'),
        valueIsString: true,
        prefix: <UsersIcon size={24} />,
        color: KPI_COLORS.employees,
        span: { xs: 24, sm: 12, lg: 6 },
        description: t('overview-kpi-employees-desc')
      },
      {
        key: 'overview-salary-cost',
        title: t('overview-kpi-salary-cost-title'),
        value: formatCurrencyString(annualSalaryCost, kpiMoney),
        valueIsString: true,
        prefix: <CurrencyCircleDollarIcon size={24} />,
        color: KPI_COLORS.salaryCost,
        span: { xs: 24, sm: 12, lg: 6 },
        description: t('overview-kpi-salary-cost-desc')
      },
      {
        key: 'overview-avg-salary',
        title: t('overview-kpi-avg-salary-title'),
        value: formatCurrencyString(averageSalary, kpiMoney),
        valueIsString: true,
        prefix: <ChartLineIcon size={24} />,
        color: KPI_COLORS.avgSalary,
        span: { xs: 24, sm: 12, lg: 6 },
        description: t('overview-kpi-avg-salary-desc')
      },
      {
        key: 'overview-bonuses-ytd',
        title: t('overview-kpi-bonuses-ytd-title'),
        value: formatCurrencyString(bonusesYtd, kpiMoney),
        valueIsString: true,
        prefix: <GiftIcon size={24} />,
        color: KPI_COLORS.bonusesYtd,
        span: { xs: 24, sm: 12, lg: 6 },
        description: bonusesYtdDescription
      }
    ]
  }, [employeeCount, annualSalaryCost, averageSalary, bonusesYtd, currency, t, bonusesYtdDescription])

  return (
    <div data-testid="compensation-overview-statistics">
      <WidgetGroup
        className="gba:py-0"
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        cardsClassName="gba:lg:grid-cols-4"
        emptyText={t('overview-kpi-empty')}
        data-testid="compensation-overview-kpi-cards"
      />
    </div>
  )
}

export const CompensationOverviewStatistics = memo(CompensationOverviewStatisticsComponent)
