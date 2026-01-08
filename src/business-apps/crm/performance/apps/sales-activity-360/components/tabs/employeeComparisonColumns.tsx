import React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { TrendUpIcon, TrendDownIcon, MinusIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { EmployeeComparison } from './hooks/useEmployeeComparisonData'

dayjs.extend(relativeTime)

// Helper to get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

// Helper to format trend
const formatTrend = (trend: number): string => {
  if (trend === 0) return '0%'
  const sign = trend > 0 ? '+' : ''
  return `${sign}${trend.toFixed(1)}%`
}

// Helper to get trend icon and color
const getTrendDisplay = (trend: number) => {
  if (trend > 0) {
    return {
      icon: <TrendUpIcon className="gba:w-4 gba:h-4" />,
      variant: 'success' as const,
      color: 'gba:text-success'
    }
  } else if (trend < 0) {
    return {
      icon: <TrendDownIcon className="gba:w-4 gba:h-4" />,
      variant: 'destructive' as const,
      color: 'gba:text-destructive'
    }
  }
  return {
    icon: <MinusIcon className="gba:w-4 gba:h-4" />,
    variant: 'secondary' as const,
    color: 'gba:text-muted-foreground'
  }
}

export const createEmployeeComparisonColumns = (): ColumnDef<EmployeeComparison>[] => [
  {
    id: 'employee',
    accessorKey: 'displayName',
    header: 'Employee',
    size: 280,
    cell: ({ row }) => {
      const employee = row.original
      return (
        <div
          className="gba:flex gba:items-center gba:gap-3"
          data-testid={`employee-comparison-employee-${employee.id}`}
        >
          <Avatar size="sm">
            {employee.pictureThumbnail && (
              <AvatarImage src={`data:image/jpeg;base64,${employee.pictureThumbnail}`} alt={employee.displayName} />
            )}
            <AvatarFallback className="gba:text-xs">{getInitials(employee.displayName)}</AvatarFallback>
          </Avatar>
          <div className="gba:flex gba:flex-col gba:min-w-0">
            <div className="gba:font-medium gba:truncate" title={employee.displayName}>
              {employee.displayName}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:truncate" title={employee.jobPosition}>
              {employee.jobPosition || 'No position'}
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: 'department',
    accessorKey: 'organizationalUnit',
    header: 'Department',
    size: 180,
    cell: ({ row }) => {
      const department = row.original.organizationalUnit
      return (
        <div className="gba:text-sm" data-testid={`employee-comparison-department-${row.original.id}`}>
          {department || <span className="gba:text-muted-foreground">No department</span>}
        </div>
      )
    }
  },
  {
    id: 'totalActivities',
    accessorKey: 'totalActivities',
    header: 'Total Activities',
    size: 140,
    cell: ({ row }) => {
      const total = row.original.totalActivities
      return (
        <div
          className="gba:text-sm gba:font-semibold gba:tabular-nums"
          data-testid={`employee-comparison-total-${row.original.id}`}
        >
          {total.toLocaleString()}
        </div>
      )
    }
  },
  {
    id: 'thisWeek',
    accessorKey: 'thisWeekActivities',
    header: 'This Week',
    size: 120,
    cell: ({ row }) => {
      const count = row.original.thisWeekActivities
      return (
        <div className="gba:text-sm gba:tabular-nums" data-testid={`employee-comparison-week-${row.original.id}`}>
          {count.toLocaleString()}
        </div>
      )
    }
  },
  {
    id: 'thisMonth',
    accessorKey: 'thisMonthActivities',
    header: 'This Month',
    size: 120,
    cell: ({ row }) => {
      const count = row.original.thisMonthActivities
      return (
        <div className="gba:text-sm gba:tabular-nums" data-testid={`employee-comparison-month-${row.original.id}`}>
          {count.toLocaleString()}
        </div>
      )
    }
  },
  {
    id: 'last30Days',
    accessorKey: 'last30DaysActivities',
    header: 'Last 30 Days',
    size: 130,
    cell: ({ row }) => {
      const count = row.original.last30DaysActivities
      return (
        <div className="gba:text-sm gba:tabular-nums" data-testid={`employee-comparison-30days-${row.original.id}`}>
          {count.toLocaleString()}
        </div>
      )
    }
  },
  {
    id: 'trend',
    accessorKey: 'trend',
    header: '30-Day Trend',
    size: 150,
    cell: ({ row }) => {
      const trend = row.original.trend
      const display = getTrendDisplay(trend)
      return (
        <div
          className="gba:flex gba:items-center gba:gap-2"
          data-testid={`employee-comparison-trend-${row.original.id}`}
        >
          <Badge variant={display.variant} className="gba:gap-1">
            {display.icon}
            <span className="gba:tabular-nums">{formatTrend(trend)}</span>
          </Badge>
        </div>
      )
    }
  },
  {
    id: 'lastActivity',
    accessorKey: 'lastActivityDate',
    header: 'Last Activity',
    size: 150,
    cell: ({ row }) => {
      const date = row.original.lastActivityDate
      if (!date) {
        return <span className="gba:text-xs gba:text-muted-foreground">No activities</span>
      }
      return (
        <div
          className="gba:text-sm gba:text-muted-foreground"
          data-testid={`employee-comparison-last-${row.original.id}`}
          title={dayjs(date).format('YYYY-MM-DD HH:mm')}
        >
          {dayjs(date).fromNow()}
        </div>
      )
    }
  }
]
