import React, { useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import { UserIcon, ChartBarIcon } from '@phosphor-icons/react'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  buildCampaignStats,
  buildPerformerStats,
  EmptyState,
  mapEmployeeToPerformer,
  PerformanceCard,
  type PerformerData
} from './TopPerformersCards'

const CampaignsTopPerformers: React.FC<CampaignsAnalyticsComponentProps> = ({
  topCampaigns = [],
  topEmployees = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [activeTab, setActiveTab] = useState('campaigns')

  if (isLoading) {
    return (
      <div className="gba:p-8 gba:text-center" data-testid="campaigns-top-performers-loading">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary gba:mx-auto gba:mb-4" />
        <p className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.loading', 'Loading top performers...')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <Card data-testid="campaigns-top-performers-error">
        <CardContent className="gba:p-6">
          <Alert variant="destructive">
            <AlertDescription>
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <div className="gba:font-semibold gba:mb-1">
                    {getTranslationFromI18nKeyAndLabel(
                      'campaigns.analytics.topPerformers.errorTitle',
                      'Error Loading Top Performers'
                    )}
                  </div>
                  <div>{error}</div>
                </div>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // UI matching record view with tabs
  const performers = (topEmployees || []).slice(0, 5).map(mapEmployeeToPerformer)

  // Build tabs for Top Campaigns and Top Employees
  return (
    <div data-testid="campaigns-top-performers-tabs">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="gba:mb-4">
          <TabsTrigger value="campaigns" startIcon={<ChartBarIcon />}>
            {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.campaigns', 'Top Campaigns')}
          </TabsTrigger>
          <TabsTrigger value="employees" startIcon={<UserIcon />}>
            {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.employees', 'Top Employees')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <div
            className="gba:space-y-4 gba:bg-muted gba:rounded-lg gba:p-4 gba:max-h-120 gba:overflow-y-auto gba:overflow-x-hidden"
            data-testid="top-campaigns-list"
          >
            {topCampaigns && topCampaigns.length > 0 ? (
              topCampaigns
                .slice(0, 5)
                .map((c, index) => (
                  <PerformanceCard
                    key={c.campaignId}
                    name={c.campaignName}
                    subtitle={`${c.campaignType} • ${c.status}`}
                    index={index}
                    stats={buildCampaignStats(c)}
                    revenue={c.totalRevenue || 0}
                    revenueLabel="Revenue"
                    testIdPrefix="analytics-top-campaign"
                  />
                ))
            ) : (
              <EmptyState
                icon={<ChartBarIcon />}
                message={getTranslationFromI18nKeyAndLabel(
                  'campaigns.analytics.topPerformers.noCampaigns',
                  'No campaign performance data available'
                )}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="employees">
          <div
            className="gba:space-y-4 gba:bg-muted gba:rounded-lg gba:p-4 gba:max-h-120 gba:overflow-y-auto gba:overflow-x-hidden"
            data-testid="top-employees-list"
          >
            {performers && performers.length > 0 ? (
              performers.map((performer: PerformerData, index: number) => (
                <PerformanceCard
                  key={performer.employeeId}
                  name={performer.employeeName}
                  index={index}
                  stats={buildPerformerStats(performer)}
                  revenue={performer.revenue}
                  revenueLabel="Won Revenue"
                  testIdPrefix="analytics-top-performer"
                />
              ))
            ) : (
              <EmptyState
                icon={<UserIcon />}
                message={getTranslationFromI18nKeyAndLabel(
                  'campaigns.analytics.topPerformers.noEmployees',
                  'No employee performance data available'
                )}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CampaignsTopPerformers
