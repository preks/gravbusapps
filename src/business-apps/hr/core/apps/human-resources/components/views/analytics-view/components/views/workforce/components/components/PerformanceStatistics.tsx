import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserOutlined, CalendarOutlined, TeamOutlined, BarChartOutlined } from '@ant-design/icons'
import { PerformanceStatistics as PerformanceStatsType } from '../../../../../hooks/usePerformanceData'

interface PerformanceStatisticsProps {
  statistics: PerformanceStatsType
  isLoading: boolean
  dataTestId: string
}

const PerformanceStatistics: React.FC<PerformanceStatisticsProps> = ({ statistics, isLoading, dataTestId }) => {
  // Transform statistics into widget format
  const widgets: WidgetItem[] = [
    {
      key: 'total-workdays',
      title: 'Total Workdays',
      value: statistics.totalWorkdays,
      prefix: <CalendarOutlined />,
      color: 'var(--nw-info)',
      description: 'Cumulative workdays across all entities',
      precision: 0
    },
    {
      key: 'average-workdays',
      title: 'Avg Workdays/Entity',
      value: statistics.averageWorkdaysPerEntity,
      prefix: <BarChartOutlined />,
      color: 'var(--nw-success)',
      description: 'Average workdays per organizational entity',
      precision: 1
    },
    {
      key: 'total-entities',
      title: 'Active Entities',
      value: statistics.totalEntities,
      prefix: <TeamOutlined />,
      color: 'var(--nw-warning)',
      description: 'Number of organizational entities tracked',
      precision: 0
    },
    {
      key: 'total-employees',
      title: 'Total Employees',
      value: statistics.totalEmployees,
      prefix: <UserOutlined />,
      color: 'var(--nw-info)',
      description: 'Employees across all tracked entities',
      precision: 0
    }
  ]

  return (
    <div data-testid={dataTestId}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={null}
        skeletonCount={4}
        emptyText="No performance statistics available."
        data-testid={`${dataTestId}-widgets`}
      />
    </div>
  )
}

export default PerformanceStatistics
