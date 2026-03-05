import React, { useState, useEffect } from 'react'
import { Tabs, Card, Row, Col, Typography, Space, Spin, Alert, Button } from 'antd'
import { CalendarIcon, ChartBarIcon, TableIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAbsenceDataIntegration } from '../../../hooks/useAbsenceDataIntegration'
import AbsenceStatisticsDashboard from './components/AbsenceStatisticsDashboard'
import AbsenceChartsView from './components/AbsenceChartsView'
import AbsenceDetailsTable from './components/AbsenceDetailsTable'

const { TabPane } = Tabs
const { Text, Title } = Typography

const AbsenceReport: React.FC<BusinessAppContextProps> = context => {
  // Define valid tabs
  const validTabs = ['overview', 'charts', 'details']
  const defaultTab = 'overview'

  // Get content from URL query parameter or use default
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const contentFromUrl = urlParams.get('content')

    if (validTabs.includes(contentFromUrl ?? '')) {
      return contentFromUrl!
    } else {
      // No valid content in URL, set default content in URL
      const url = new URL(window.location.href)
      url.searchParams.set('content', defaultTab)
      window.history.replaceState({}, '', url.toString())
      return defaultTab
    }
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialTab)

  const {
    absenceData,
    balanceData,
    absenceTypes,
    absenceGroups,
    statistics,
    chartData,
    tableData,
    isLoading,
    error,
    refetch
  } = useAbsenceDataIntegration(context)

  const prefixDataTestId = 'AbsenceReport'

  // Update URL when content changes
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    const url = new URL(window.location.href)
    url.searchParams.set('content', key)
    window.history.pushState({}, '', url.toString())
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const contentFromUrl = urlParams.get('content')
      const newTab = validTabs.includes(contentFromUrl ?? '') ? contentFromUrl! : defaultTab
      setActiveTab(newTab)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-error`} className="gba:bg-muted gba:min-h-full gba:p-6 gba:rounded-lg">
        <Alert
          message="Failed to Load Absence Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={refetch} icon={<ArrowsClockwiseIcon size={16} />}>
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId}-loading`}
        className="gba:bg-muted gba:min-h-full gba:p-6 gba:rounded-lg gba:flex gba:justify-center gba:items-center gba:flex-col"
      >
        <Spin size="large" />
        <Text className="gba:mt-4 gba:text-muted-foreground">Loading absence data and analytics...</Text>
      </div>
    )
  }

  // Safe access to array properties with fallbacks
  const safeAbsenceTypes = absenceTypes || []
  const safeAbsenceGroups = absenceGroups || []
  const safeAbsenceData = absenceData || []
  const safeBalanceData = balanceData || []

  return (
    <div data-testid={prefixDataTestId} className="gba:bg-muted gba:min-h-full gba:p-6 gba:rounded-lg">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Title level={3} className="gba:m-0 gba:text-foreground">
            Absence Report & Analytics
          </Title>
          <div className="gba:flex gba:gap-2">
            <Card size="small" className="gba:py-1 gba:px-2">
              <Text strong className="gba:text-info">
                {statistics?.totalEmployees || 0} Employees
              </Text>
            </Card>
            <Card size="small" className="gba:py-1 gba:px-2">
              <Text strong className="gba:text-info">
                {safeAbsenceTypes.length} Absence Types
              </Text>
            </Card>
            <Card size="small" className="gba:py-1 gba:px-2">
              <Text strong className="gba:text-success">
                {statistics?.totalAbsenceDays || 0} Total Days
              </Text>
            </Card>
          </div>
        </div>
        <Button
          type="primary"
          icon={<ArrowsClockwiseIcon size={16} />}
          onClick={refetch}
          data-testid={`${prefixDataTestId}-refresh-button`}
        >
          Refresh Data
        </Button>
      </div>

      {/* Main Content */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        type="card"
        size="large"
        className="gba:bg-primary-foreground gba:rounded-lg gba:p-4"
      >
        <TabPane
          tab={
            <Space>
              <CalendarIcon size={16} />
              <span data-testid={`${prefixDataTestId}-overview-tab`}>Overview & Statistics</span>
            </Space>
          }
          key="overview"
        >
          <AbsenceStatisticsDashboard statistics={statistics as any} isLoading={isLoading} />
        </TabPane>

        <TabPane
          tab={
            <Space>
              <ChartBarIcon size={16} />
              <span data-testid={`${prefixDataTestId}-charts-tab`}>Charts & Trends</span>
            </Space>
          }
          key="charts"
        >
          <AbsenceChartsView chartData={chartData as any} isLoading={isLoading} dataTestId={prefixDataTestId} />
        </TabPane>

        <TabPane
          tab={
            <Space>
              <TableIcon size={16} />
              <span data-testid={`${prefixDataTestId}-details-tab`}>Detailed Analysis</span>
            </Space>
          }
          key="details"
        >
          <AbsenceDetailsTable tableData={tableData as any} dataTestId={prefixDataTestId} />
        </TabPane>
      </Tabs>

      {/* Footer Summary */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card size="small" className="gba:bg-muted">
            <Row gutter={[16, 8]} justify="space-between" align="middle">
              <Col>
                <Text type="secondary">
                  Last Updated: {new Date().toLocaleDateString()} • Data includes {safeAbsenceData.length} absence
                  records and {safeBalanceData.length} balance entries
                </Text>
              </Col>
              <Col>
                <Space>
                  {safeAbsenceGroups.length > 0 ? (
                    safeAbsenceGroups.map((group, index: number) => (
                      <div key={group?.code || `group-${index}`} className="gba:text-center">
                        <div className="gba:text-xs gba:text-info">{group?.value || 'Unknown'}</div>
                        <div className="gba:text-sm gba:font-bold">
                          {statistics?.groupStats?.find(s => s.groupCode === group?.code)?.totalDays || 0} days
                        </div>
                      </div>
                    ))
                  ) : (
                    <Text type="secondary">No absence group data available</Text>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AbsenceReport
