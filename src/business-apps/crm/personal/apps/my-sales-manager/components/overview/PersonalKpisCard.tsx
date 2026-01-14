import React from 'react'
import { Card, CardContent, Spinner } from '@newwork/nw-design-system'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserIcon, TargetIcon, CurrencyDollarIcon, ChartLineUpIcon } from '@phosphor-icons/react'
import type { PersonalKpis } from '../../types'

export interface PersonalKpisCardProps {
  kpis: PersonalKpis | null
  loading: boolean
}

export const PersonalKpisCard: React.FC<PersonalKpisCardProps> = ({ kpis, loading }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatTrend = (trend: number): string => {
    const sign = trend >= 0 ? '+' : ''
    return `${sign}${trend.toFixed(1)}%`
  }

  if (loading && !kpis) {
    return (
      <Card data-testid="personal-kpis-loading">
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (!kpis) {
    return null
  }

  const widgets: WidgetItem[] = [
    {
      key: 'leads',
      title: 'My Leads',
      value: kpis.leads.total,
      prefix: <UserIcon />,
      color: '#1677ff',
      description: `${kpis.leads.converted} converted this month`,
      trend: {
        value: formatTrend(kpis.leads.trend),
        positive: kpis.leads.trend >= 0,
        description: 'vs last month'
      }
    },
    {
      key: 'opportunities',
      title: 'Opportunities',
      value: kpis.opportunities.total,
      prefix: <TargetIcon />,
      color: '#52c41a',
      description: `${kpis.opportunities.won} won`,
      trend: {
        value: formatTrend(kpis.opportunities.trend),
        positive: kpis.opportunities.trend >= 0,
        description: 'vs last month'
      }
    },
    {
      key: 'pipeline-value',
      title: 'Pipeline Value',
      value: formatCurrency(kpis.opportunities.pipelineValue),
      prefix: <CurrencyDollarIcon />,
      color: '#faad14',
      description: 'From won deals',
      valueIsString: true
    },
    {
      key: 'activities',
      title: 'Activities',
      value: kpis.activities.thisMonth,
      prefix: <ChartLineUpIcon />,
      color: '#722ed1',
      description: 'This month',
      trend: {
        value: formatTrend(kpis.activities.trend),
        positive: kpis.activities.trend >= 0,
        description: 'vs last month'
      }
    }
  ]

  return (
    <div className="gba:space-y-4" data-testid="personal-kpis-card">
      <h3 className="gba:text-lg gba:font-semibold">My Performance</h3>
      <WidgetGroup widgets={widgets} isLoading={loading} />
    </div>
  )
}

export default PersonalKpisCard
