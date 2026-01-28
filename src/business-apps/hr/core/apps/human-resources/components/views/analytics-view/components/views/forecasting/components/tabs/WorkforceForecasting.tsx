import React, { useMemo } from 'react'
import { Typography } from 'antd'
import { SectionKpiCards, KpiCardData, useTranslation, Icon } from '@newwork/nw-design-system'
import { UsersIcon, CalendarIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { useState, useEffect, useCallback } from 'react'
import HeadcountChangesChart from '../HeadcountChangesChart'
import { useMonthlyHeadcountChanges } from '../../../../../hooks/useMonthlyHeadcountChanges'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

interface WorkforceForecastingProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const WorkforceForecasting: React.FC<WorkforceForecastingProps> = props => {
  const { prefixDataTestId = 'WorkforceForecasting' } = props
  const { t } = useTranslation(hrTranslations)
  const currentYear = new Date().getFullYear()
  const { data: monthlyChanges, loading: monthlyChangesLoading } = useMonthlyHeadcountChanges(props, currentYear)

  // Add authoritative employee count hook
  const [totalEmployeeCount, setTotalEmployeeCount] = useState<number>(0)
  const [isLoadingEmployeeCount, setIsLoadingEmployeeCount] = useState(true)
  const queryClient = useQueryExecutionClient(props.accessToken, Services.EMPLOYEE)

  const loadTotalEmployeeCount = useCallback(async () => {
    if (!props.accessToken) return

    setIsLoadingEmployeeCount(true)
    try {
      // Use the same authoritative source as Demographics and Workforce views
      const totalEmployeeData = await queryClient.executeQuery('totalEmployeeCount', QueryType.DATASET, {})
      const count = totalEmployeeData.data.length > 0 ? totalEmployeeData.data[0].value : 0
      setTotalEmployeeCount(count)
    } catch (error) {
      console.error('Error fetching total employee count:', error)
      setTotalEmployeeCount(0)
    } finally {
      setIsLoadingEmployeeCount(false)
    }
  }, [queryClient, props.accessToken])

  useEffect(() => {
    if (props.accessToken) {
      loadTotalEmployeeCount()
    }
  }, [props.accessToken, loadTotalEmployeeCount])

  // Calculate Workforce-related KPI metrics
  const workforceKpiCards: KpiCardData[] = useMemo(() => {
    if (monthlyChangesLoading || isLoadingEmployeeCount) {
      return [
        {
          id: 'current-headcount',
          title: t('hr-analytics-forecasting-kpi-headcount'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-1)'
        },
        {
          id: 'ytd-hires',
          title: t('hr-analytics-forecasting-kpi-ytd-hires'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-2)'
        },
        {
          id: 'ytd-departures',
          title: t('hr-analytics-forecasting-kpi-ytd-departures'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-3)'
        },
        {
          id: 'net-change',
          title: t('hr-analytics-forecasting-kpi-net-change'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-4)'
        },
        {
          id: 'turnover-rate',
          title: t('hr-analytics-forecasting-kpi-turnover-rate'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={CalendarIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-5)'
        },
        {
          id: 'growth-rate',
          title: t('hr-analytics-forecasting-kpi-growth-rate'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={CalendarIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-6)'
        }
      ]
    }

    // KPI semantics: YTD = from Jan 1 to today (not end-of-year)
    const now = new Date()
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const ytdRows = monthlyChanges.filter(r => r.month >= `${currentYear}-01` && r.month <= currentYm)
    const ytdHires = ytdRows.reduce((sum, r) => sum + (Number(r.newHires) || 0), 0)
    const ytdDepartures = ytdRows.reduce((sum, r) => sum + (Number(r.departures) || 0), 0)
    const netChange = ytdHires - ytdDepartures

    // Use authoritative total employee count for headcount and calculations
    const headcount = totalEmployeeCount
    const turnoverRate = headcount > 0 ? (ytdDepartures / headcount) * 100 : 0
    const growthRate = headcount > 0 ? (netChange / headcount) * 100 : 0

    return [
      {
        id: 'current-headcount',
        title: t('hr-analytics-forecasting-kpi-headcount'),
        value: headcount,
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-1)',
        footer: t('hr-analytics-active-employees-authoritative')
      },
      {
        id: 'ytd-hires',
        title: t('hr-analytics-forecasting-kpi-ytd-hires'),
        value: `+${ytdHires}`,
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-2)',
        footer: t('hr-analytics-year-to-date-hires')
      },
      {
        id: 'ytd-departures',
        title: t('hr-analytics-forecasting-kpi-ytd-departures'),
        value: `-${ytdDepartures}`,
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-3)',
        footer: t('hr-analytics-year-to-date-departures')
      },
      {
        id: 'net-change',
        title: t('hr-analytics-forecasting-kpi-net-change'),
        value: netChange > 0 ? `+${netChange}` : netChange.toString(),
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: netChange >= 0 ? 'var(--nw-chart-2)' : 'var(--nw-chart-3)',
        footer: t('hr-analytics-net-headcount-change')
      },
      {
        id: 'turnover-rate',
        title: t('hr-analytics-forecasting-kpi-turnover-rate'),
        value: `${turnoverRate.toFixed(1)}%`,
        icon: <Icon icon={CalendarIcon} size="sm" decorative />,
        iconColor:
          turnoverRate > 15 ? 'var(--nw-chart-3)' : turnoverRate > 10 ? 'var(--nw-chart-5)' : 'var(--nw-chart-2)',
        footer: t('hr-analytics-year-to-date-turnover')
      },
      {
        id: 'growth-rate',
        title: t('hr-analytics-forecasting-kpi-growth-rate'),
        value: `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
        icon: <Icon icon={CalendarIcon} size="sm" decorative />,
        iconColor: growthRate >= 0 ? 'var(--nw-chart-2)' : 'var(--nw-chart-3)',
        footer: t('hr-analytics-year-to-date-growth')
      }
    ]
  }, [monthlyChanges, monthlyChangesLoading, isLoadingEmployeeCount, totalEmployeeCount, t, currentYear])

  return (
    <div data-testid={prefixDataTestId} className="gba:flex gba:flex-col gba:gap-6">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <Title level={4} className="gba:m-0 gba:text-foreground">
            {t('hr-analytics-workforce-forecasting')}
          </Title>
          <Text className="gba:text-muted-foreground">{t('hr-analytics-workforce-forecasting-description')}</Text>
        </div>
      </div>

      {/* Workforce KPI Cards Section */}
      <div data-testid={`${prefixDataTestId}-kpi-cards`}>
        <SectionKpiCards cards={workforceKpiCards} />
      </div>

      {/* Workforce Charts */}
      <div className="gba:space-y-6">
        <HeadcountChangesChart {...props} />
        {/* Future workforce-related charts can be added here */}
      </div>
    </div>
  )
}

export default WorkforceForecasting
