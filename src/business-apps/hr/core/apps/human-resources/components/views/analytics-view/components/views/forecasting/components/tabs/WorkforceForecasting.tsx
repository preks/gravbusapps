import React, { useMemo } from 'react'
import { Typography } from 'antd'
import { SectionKpiCards, KpiCardData } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WorkingConditionKpi } from '../../../../../hooks/useWorkingConditionForecast'
import { useWorkingConditionForecast } from '../../../../../hooks/useWorkingConditionForecast'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { useState, useEffect, useCallback } from 'react'
import HeadcountChangesChart from '../HeadcountChangesChart'

const { Title, Text } = Typography

interface WorkforceForecastingProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const WorkforceForecasting: React.FC<WorkforceForecastingProps> = props => {
  const { prefixDataTestId = 'WorkforceForecasting' } = props
  const kpiData = useWorkingConditionForecast(props)

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
    const { loading, data } = kpiData
    const employees: WorkingConditionKpi[] = data as WorkingConditionKpi[]

    if (loading || isLoadingEmployeeCount) {
      return [
        {
          id: 'current-headcount',
          title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_headcount', 'Current Headcount'),
          value: 'Loading...',
          icon: 'users',
          iconColor: '#722ed1'
        },
        {
          id: 'ytd-hires',
          title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_ytd_hires', 'YTD Hires'),
          value: 'Loading...',
          icon: 'users',
          iconColor: '#52c41a'
        },
        {
          id: 'ytd-departures',
          title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_ytd_departures', 'YTD Departures'),
          value: 'Loading...',
          icon: 'users',
          iconColor: '#ff4d4f'
        },
        {
          id: 'net-change',
          title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_net_change', 'Net Change (YTD)'),
          value: 'Loading...',
          icon: 'users',
          iconColor: '#1890ff'
        },
        {
          id: 'turnover-rate',
          title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_turnover_rate', 'Turnover Rate'),
          value: 'Loading...',
          icon: 'calendar',
          iconColor: '#fa8c16'
        },
        {
          id: 'growth-rate',
          title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_growth_rate', 'Growth Rate'),
          value: 'Loading...',
          icon: 'calendar',
          iconColor: '#13c2c2'
        }
      ]
    }

    // Calculate metrics using working condition data for hire/departure calculations
    const today = new Date()
    const startOfYear = new Date(today.getFullYear(), 0, 1)

    const ytdHires = employees.filter(
      wc => wc.hireDate && new Date(wc.hireDate) >= startOfYear && new Date(wc.hireDate) <= today
    ).length

    const ytdDepartures = employees.filter(
      wc => wc.exitDate && new Date(wc.exitDate) >= startOfYear && new Date(wc.exitDate) <= today
    ).length

    const netChange = ytdHires - ytdDepartures

    // Use authoritative total employee count for headcount and calculations
    const headcount = totalEmployeeCount
    const turnoverRate = headcount > 0 ? (ytdDepartures / headcount) * 100 : 0
    const growthRate = headcount > 0 ? (netChange / headcount) * 100 : 0

    return [
      {
        id: 'current-headcount',
        title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_headcount', 'Current Headcount'),
        value: headcount,
        icon: 'users',
        iconColor: '#722ed1',
        footer: 'Active employees (authoritative count)'
      },
      {
        id: 'ytd-hires',
        title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_ytd_hires', 'YTD Hires'),
        value: `+${ytdHires}`,
        icon: 'users',
        iconColor: '#52c41a',
        footer: 'Year-to-date new hires'
      },
      {
        id: 'ytd-departures',
        title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_ytd_departures', 'YTD Departures'),
        value: `-${ytdDepartures}`,
        icon: 'users',
        iconColor: '#ff4d4f',
        footer: 'Year-to-date departures'
      },
      {
        id: 'net-change',
        title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_net_change', 'Net Change (YTD)'),
        value: netChange > 0 ? `+${netChange}` : netChange.toString(),
        icon: 'users',
        iconColor: netChange >= 0 ? '#52c41a' : '#ff4d4f',
        footer: 'Net headcount change'
      },
      {
        id: 'turnover-rate',
        title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_turnover_rate', 'Turnover Rate'),
        value: `${turnoverRate.toFixed(1)}%`,
        icon: 'calendar',
        iconColor: turnoverRate > 15 ? '#ff4d4f' : turnoverRate > 10 ? '#fa8c16' : '#52c41a',
        footer: 'Year-to-date turnover'
      },
      {
        id: 'growth-rate',
        title: getTranslationFromI18nKeyAndLabel('forecasting_kpi_growth_rate', 'Growth Rate'),
        value: `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
        icon: 'calendar',
        iconColor: growthRate >= 0 ? '#52c41a' : '#ff4d4f',
        footer: 'Year-to-date growth'
      }
    ]
  }, [kpiData, isLoadingEmployeeCount, totalEmployeeCount])

  return (
    <div data-testid={prefixDataTestId} className="gba:flex gba:flex-col gba:gap-6">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <Title level={4} className="gba:m-0 gba:text-gray-800">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_workforce_forecasting', 'Workforce Forecasting')}
          </Title>
          <Text className="gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_workforce_forecasting_description',
              'Headcount trends, hiring projections, and workforce analytics'
            )}
          </Text>
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
