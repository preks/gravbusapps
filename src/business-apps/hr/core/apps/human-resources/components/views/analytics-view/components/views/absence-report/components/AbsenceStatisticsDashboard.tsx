import React from 'react'
import { Badge, Card, Spinner } from '@newwork/nw-design-system'
import {
  UserIcon,
  CalendarIcon,
  TrophyIcon,
  UsersIcon,
  ChartBarIcon,
  CheckCircleIcon
} from '@phosphor-icons/react'
import { AbsenceStatistics } from '../types/absenceTypes'

interface AbsenceStatisticsDashboardProps {
  statistics: AbsenceStatistics
  isLoading: boolean
}

const AbsenceStatisticsDashboard: React.FC<AbsenceStatisticsDashboardProps> = ({ statistics, isLoading }) => {
  // Get top 4 groups by usage for main display
  const topGroups = statistics.groupStats.sort((a, b) => b.totalDays - a.totalDays).slice(0, 4)

  // Get top 8 absence types for detailed breakdown
  const topTypes = statistics.typeStats.sort((a, b) => b.totalDays - a.totalDays).slice(0, 8)

  const renderStatisticCard = (title: string, value: React.ReactNode, icon: React.ReactNode) => (
    <Card className="gba:p-4">
      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
        {isLoading ? <Spinner size="sm" /> : value}
      </div>
    </Card>
  )

  const renderProgress = (value: number) => (
    <progress className="gba:h-2 gba:w-full gba:rounded-full" max={100} value={value} />
  )

  return (
    <div data-testid="absence-statistics-dashboard">
      {/* Main Statistics Row */}
      <div className="gba:mb-6 gba:grid gba:grid-cols-1 gba:gap-4 sm:gba:grid-cols-2 md:gba:grid-cols-4">
        {renderStatisticCard('Total Employees', statistics.totalEmployees, <UserIcon size={16} />)}
        {renderStatisticCard('Total Absence Days', statistics.totalAbsenceDays, <CalendarIcon size={16} />)}
        {renderStatisticCard('Average Days per Employee', statistics.averageDaysUsed.toFixed(1), <TrophyIcon size={16} />)}
        {renderStatisticCard('Top Group Usage', `${topGroups[0]?.usagePercentage || 0}%`, <ChartBarIcon size={16} />)}
      </div>

      {/* Absence Group Breakdown */}
      <div className="gba:mb-6 gba:grid gba:grid-cols-1 gba:gap-4 lg:gba:grid-cols-2">
          <Card className="gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
              <UsersIcon size={16} />
              <span>Absence by Group</span>
            </div>
            <div className="gba:py-4">
              {topGroups.map((group, index) => (
                <div key={group.groupCode} className="gba:mb-4">
                  <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                    <span className="gba:font-medium">{group.groupName}</span>
                    <div className="gba:flex gba:gap-3 gba:items-center">
                      <Badge variant="secondary">{group.totalDays} days</Badge>
                      <span className="gba:text-sm gba:text-muted-foreground">{group.usagePercentage}%</span>
                    </div>
                  </div>
                  {renderProgress(group.usagePercentage)}
                  <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{group.employeeCount} employees</div>
                </div>
              ))}
            </div>
          </Card>

        {/* Top Usage Percentages */}
          <Card className="gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
              <CheckCircleIcon size={16} />
              <span>Usage Overview</span>
            </div>
            <div className="gba:py-4">
              {topGroups.length >= 2 && (
                <>
                  <div className="gba:mb-6">
                    <div className="gba:flex gba:justify-between gba:mb-2">
                      <span>{topGroups[0].groupName} Usage</span>
                      <span className="gba:font-semibold">{statistics.vacationUsagePercentage}%</span>
                    </div>
                    {renderProgress(statistics.vacationUsagePercentage)}
                  </div>

                  <div className="gba:mb-6">
                    <div className="gba:flex gba:justify-between gba:mb-2">
                      <span>{topGroups[1].groupName} Usage</span>
                      <span className="gba:font-semibold">{statistics.sickUsagePercentage}%</span>
                    </div>
                    {renderProgress(statistics.sickUsagePercentage)}
                  </div>
                </>
              )}

              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-4">
                {topGroups.map(group => (
                  <Badge key={group.groupCode} variant="secondary">
                    {group.groupName}: {group.totalDays}d
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
      </div>

      {/* Individual Absence Types Breakdown */}
          <Card className="gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
              <ChartBarIcon size={16} />
              <span>Top Absence Types</span>
              <Badge variant="secondary">{statistics.typeStats.length} types</Badge>
            </div>
            <div className="gba:mt-4 gba:grid gba:grid-cols-1 gba:gap-4 sm:gba:grid-cols-2 md:gba:grid-cols-3 lg:gba:grid-cols-4">
              {topTypes.map(type => (
                <div key={type.typeCode}>
                  <div className="gba:p-4 gba:border gba:border-border gba:rounded-lg gba:bg-muted">
                    <div className="gba:font-medium gba:mb-1">{type.typeName}</div>
                    <Badge variant="outline">{type.groupCode}</Badge>
                  </div>

                  <div className="gba:flex gba:justify-between gba:mb-2">
                    <span className="gba:text-2xl gba:font-semibold gba:text-info">{type.totalDays}</span>
                    <span className="gba:text-sm gba:text-muted-foreground">{type.usagePercentage}%</span>
                  </div>

                  <div className="gba:text-xs gba:text-muted-foreground">{type.employeeCount} employees</div>
                </div>
              ))}
            </div>
          </Card>
    </div>
  )
}

export default AbsenceStatisticsDashboard
