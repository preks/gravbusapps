import React from 'react'
import { Card, Row, Col, Statistic, Tag, Progress } from 'antd'
import {
  UserOutlined,
  CalendarOutlined,
  TrophyOutlined,
  TeamOutlined,
  BarChartOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { AbsenceStatistics } from '../types/absenceTypes'

interface AbsenceStatisticsDashboardProps {
  statistics: AbsenceStatistics
  isLoading: boolean
}

const AbsenceStatisticsDashboard: React.FC<AbsenceStatisticsDashboardProps> = ({ statistics, isLoading }) => {
  // Dynamic color assignment for groups - using design system chart tokens
  const getGroupColor = (index: number): string => {
    const colors = [
      'var(--nw-chart-1)',
      'var(--nw-chart-2)',
      'var(--nw-chart-3)',
      'var(--nw-chart-4)',
      'var(--nw-chart-5)',
      'var(--nw-chart-6)',
      'var(--nw-chart-7)',
      'var(--nw-chart-8)'
    ]
    return colors[index % colors.length]
  }

  // Get top 4 groups by usage for main display
  const topGroups = statistics.groupStats.sort((a, b) => b.totalDays - a.totalDays).slice(0, 4)

  // Get top 8 absence types for detailed breakdown
  const topTypes = statistics.typeStats.sort((a, b) => b.totalDays - a.totalDays).slice(0, 8)

  return (
    <div data-testid="absence-statistics-dashboard">
      {/* Main Statistics Row */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={statistics.totalEmployees}
              prefix={<UserOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Absence Days"
              value={statistics.totalAbsenceDays}
              prefix={<CalendarOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Average Days per Employee"
              value={statistics.averageDaysUsed}
              precision={1}
              prefix={<TrophyOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Top Group Usage"
              value={`${topGroups[0]?.usagePercentage || 0}%`}
              prefix={<BarChartOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Absence Group Breakdown */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="gba:flex gba:items-center gba:gap-2">
                <TeamOutlined />
                <span>Absence by Group</span>
              </div>
            }
            loading={isLoading}
          >
            <div className="gba:py-4">
              {topGroups.map((group, index) => (
                <div key={group.groupCode} className="gba:mb-4">
                  <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                    <span className="gba:font-medium">{group.groupName}</span>
                    <div className="gba:flex gba:gap-3 gba:items-center">
                      <Tag color={getGroupColor(index)}>{group.totalDays} days</Tag>
                      <span className="gba:text-sm gba:text-muted-foreground">{group.usagePercentage}%</span>
                    </div>
                  </div>
                  <Progress
                    percent={group.usagePercentage}
                    size="small"
                    strokeColor={
                      index === 0
                        ? 'var(--nw-chart-1)'
                        : index === 1
                          ? 'var(--nw-chart-2)'
                          : index === 2
                            ? 'var(--nw-chart-3)'
                            : 'var(--nw-chart-4)'
                    }
                    showInfo={false}
                  />
                  <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{group.employeeCount} employees</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Top Usage Percentages */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="gba:flex gba:items-center gba:gap-2">
                <CheckCircleOutlined />
                <span>Usage Overview</span>
              </div>
            }
            loading={isLoading}
          >
            <div className="gba:py-4">
              {topGroups.length >= 2 && (
                <>
                  <div className="gba:mb-6">
                    <div className="gba:flex gba:justify-between gba:mb-2">
                      <span>{topGroups[0].groupName} Usage</span>
                      <span className="gba:font-semibold">{statistics.vacationUsagePercentage}%</span>
                    </div>
                    <Progress
                      percent={statistics.vacationUsagePercentage}
                      strokeColor="var(--nw-chart-1)"
                      size="small"
                    />
                  </div>

                  <div className="gba:mb-6">
                    <div className="gba:flex gba:justify-between gba:mb-2">
                      <span>{topGroups[1].groupName} Usage</span>
                      <span className="gba:font-semibold">{statistics.sickUsagePercentage}%</span>
                    </div>
                    <Progress percent={statistics.sickUsagePercentage} strokeColor="var(--nw-chart-2)" size="small" />
                  </div>
                </>
              )}

              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-4">
                {topGroups.map((group, index) => (
                  <Tag key={group.groupCode} color={getGroupColor(index)}>
                    {group.groupName}: {group.totalDays}d
                  </Tag>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Individual Absence Types Breakdown */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={
              <div className="gba:flex gba:items-center gba:gap-2">
                <BarChartOutlined />
                <span>Top Absence Types</span>
                <Tag color="var(--nw-info)">{statistics.typeStats.length} types</Tag>
              </div>
            }
            loading={isLoading}
          >
            <Row gutter={[16, 16]}>
              {topTypes.map((type, index) => (
                <Col xs={24} sm={12} md={8} lg={6} key={type.typeCode}>
                  <div className="gba:p-4 gba:border gba:border-border gba:rounded-lg gba:bg-muted">
                    <div className="gba:font-medium gba:mb-1">{type.typeName}</div>
                    <Tag color={getGroupColor(index)}>{type.groupCode}</Tag>
                  </div>

                  <div className="gba:flex gba:justify-between gba:mb-2">
                    <span className="gba:text-2xl gba:font-semibold" style={{ color: 'var(--nw-chart-1)' }}>
                      {type.totalDays}
                    </span>
                    <span className="gba:text-sm gba:text-muted-foreground">{type.usagePercentage}%</span>
                  </div>

                  <div className="gba:text-xs gba:text-muted-foreground">{type.employeeCount} employees</div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AbsenceStatisticsDashboard
