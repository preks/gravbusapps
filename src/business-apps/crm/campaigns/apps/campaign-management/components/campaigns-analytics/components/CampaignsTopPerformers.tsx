import React from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { ChartBarIcon } from '@phosphor-icons/react'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import translations from '../../../../../_i18n'
import { buildCampaignStats, EmptyState, PerformanceCard } from './TopPerformersCards'

const CampaignsTopPerformers: React.FC<CampaignsAnalyticsComponentProps> = ({
  topCampaigns = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const { t } = useTranslation(translations)

  if (isLoading) {
    return (
      <div className="gba:p-8 gba:text-center" data-testid="campaigns-top-performers-loading">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary gba:mx-auto gba:mb-4" />
        <p className="gba:text-sm gba:text-muted-foreground">{t('campaigns-analytics-topPerformers-loading')}</p>
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
                  <div className="gba:font-semibold gba:mb-1">{t('campaigns-analytics-topPerformers-errorTitle')}</div>
                  <div>{error}</div>
                </div>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    {t('common-retry')}
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="campaigns-top-performers">
      <CardHeader>
        <CardTitle>{t('campaigns-analytics-topPerformers-campaigns')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="gba:space-y-4 gba:max-h-120 gba:overflow-y-auto gba:overflow-x-hidden"
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
            <EmptyState icon={<ChartBarIcon />} message={t('campaigns-analytics-topPerformers-noCampaigns')} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default CampaignsTopPerformers
