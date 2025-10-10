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
  // Dynamic color assignment for groups
  const getGroupColor = (index: number): string => {
    const colors = ['blue', 'red', 'purple', 'green', 'orange', 'cyan', 'magenta', 'gold']
    return colors[index % colors.length]
  }

  // Get top 4 groups by usage for main display
  const topGroups = statistics.groupStats.sort((a, b) => b.totalDays - a.totalDays).slice(0, 4)

  // Get top 8 absence types for detailed breakdown
  const topTypes = statistics.typeStats.sort((a, b) => b.totalDays - a.totalDays).slice(0, 8)

  return (
    <div data-testid="absence-statistics-dashboard">
      {/* Main Statistics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
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
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TeamOutlined />
                <span>Absence by Group</span>
              </div>
            }
            loading={isLoading}
          >
            <div style={{ padding: '16px 0' }}>
              {topGroups.map((group, index) => (
                <div key={group.groupCode} style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{group.groupName}</span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <Tag color={getGroupColor(index)}>{group.totalDays} days</Tag>
                      <span style={{ fontSize: '14px', color: '#666' }}>{group.usagePercentage}%</span>
                    </div>
                  </div>
                  <Progress
                    percent={group.usagePercentage}
                    size="small"
                    strokeColor={
                      index === 0 ? '#1890ff' : index === 1 ? '#ff4d4f' : index === 2 ? '#722ed1' : '#52c41a'
                    }
                    showInfo={false}
                  />
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    {group.employeeCount} employees
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Top Usage Percentages */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircleOutlined />
                <span>Usage Overview</span>
              </div>
            }
            loading={isLoading}
          >
            <div style={{ padding: '16px 0' }}>
              {topGroups.length >= 2 && (
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>{topGroups[0].groupName} Usage</span>
                      <span style={{ fontWeight: 600 }}>{statistics.vacationUsagePercentage}%</span>
                    </div>
                    <Progress percent={statistics.vacationUsagePercentage} strokeColor="#1890ff" size="small" />
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>{topGroups[1].groupName} Usage</span>
                      <span style={{ fontWeight: 600 }}>{statistics.sickUsagePercentage}%</span>
                    </div>
                    <Progress percent={statistics.sickUsagePercentage} strokeColor="#ff4d4f" size="small" />
                  </div>
                </>
              )}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '16px'
                }}
              >
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChartOutlined />
                <span>Top Absence Types</span>
                <Tag color="blue">{statistics.typeStats.length} types</Tag>
              </div>
            }
            loading={isLoading}
          >
            <Row gutter={[16, 16]}>
              {topTypes.map((type, index) => (
                <Col xs={24} sm={12} md={8} lg={6} key={type.typeCode}>
                  <div
                    style={{
                      padding: '16px',
                      border: '1px solid #f0f0f0',
                      borderRadius: '8px',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>{type.typeName}</div>
                      <Tag color={getGroupColor(index)}>{type.groupCode}</Tag>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '24px', fontWeight: 600, color: '#1890ff' }}>{type.totalDays}</span>
                      <span style={{ fontSize: '14px', color: '#666' }}>{type.usagePercentage}%</span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#999' }}>{type.employeeCount} employees</div>
                  </div>
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
