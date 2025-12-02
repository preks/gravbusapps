import React, { useState, useMemo } from 'react'
import { PageLayout, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { PiChartLine } from 'react-icons/pi'
import { BarChartOutlined, TeamOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { OverviewView, TeamsView } from './views'

type SalesPerformanceProps = BusinessAppContextProps

type TabKey = 'overview' | 'teams'

const DATA_TEST_ID_PREFIX = 'sales-performance'

/**
 * Sales Performance App
 * Provides sales performance analytics with views for:
 * - Overview: KPIs, Revenue Trends, Top Performers, Top Teams
 * - Teams: Team comparison with revenue trends chart
 */
export const SalesPerformance: React.FC<SalesPerformanceProps> = ({ accessToken, userInfo }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const tabs = useMemo(
    () => [
      {
        key: 'overview' as const,
        label: 'Overview',
        icon: <BarChartOutlined className="gba:mr-2" />,
        content: <OverviewView accessToken={accessToken} userInfo={userInfo} />
      },
      {
        key: 'teams' as const,
        label: 'Teams',
        icon: <TeamOutlined className="gba:mr-2" />,
        content: <TeamsView accessToken={accessToken} userInfo={userInfo} />
      }
    ],
    [accessToken, userInfo]
  )

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabKey)
  }

  return (
    <div data-testid={DATA_TEST_ID_PREFIX}>
      <PageLayout
        headerIcon={PiChartLine}
        headerTitle="Sales Performance"
        headerDescription="Analyze sales performance, revenue trends, and top performers"
        variant={MODULE_COLORS.CRM}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto gba:p-6">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="gba:h-full"
            data-testid={`${DATA_TEST_ID_PREFIX}-tabs`}
          >
            <TabsList className="gba:mb-6" data-testid={`${DATA_TEST_ID_PREFIX}-tabs-list`}>
              {tabs.map(tab => (
                <TabsTrigger key={tab.key} value={tab.key} data-testid={`${DATA_TEST_ID_PREFIX}-tab-${tab.key}`}>
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map(tab => (
              <TabsContent key={tab.key} value={tab.key} className="gba:h-full gba:overflow-auto">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </PageLayout>
    </div>
  )
}

export default SalesPerformance
