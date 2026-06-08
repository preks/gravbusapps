import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Accordion,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_ABM_CAMPAIGN_DETAILS,
  GET_ABM_CAMPAIGN_KPIS,
  type ABMSegmentFilter,
  type EnterpriseABMCampaign
} from '@/common/data/customer/queries/campaignDashboardQueries'
import { getCustomerEngagementLevelBadgeVariant } from '@/common/utils/badgeUtils'
import translations from '../../../../_i18n'

type EnterpriseABMDashboardProps = BusinessAppContextProps

interface ABMAccountRow {
  id: string
  accountId: string
  accountName: string
  industry: string
  engagementLevel: string
  engagementEntry?: { code?: string; objectValue?: any }
  campaignName: string
  campaignId: string
  meetings: number
  pipeline: number
}

interface ABMSummaryStats {
  totalAccounts: number
  totalMeetings: number
  totalPipeline: number
  activeCampaigns: number
}

const EMPTY_SUMMARY_STATS: ABMSummaryStats = {
  totalAccounts: 0,
  totalMeetings: 0,
  totalPipeline: 0,
  activeCampaigns: 0
}

const EnterpriseABMDashboard: React.FC<EnterpriseABMDashboardProps> = context => {
  const { t } = useTranslation(translations)
  const [campaigns, setCampaigns] = useState<EnterpriseABMCampaign[]>([])
  const [summaryStats, setSummaryStats] = useState<ABMSummaryStats>(EMPTY_SUMMARY_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [segmentFilter, setSegmentFilter] = useState<ABMSegmentFilter>('enterprise')

  const graphqlClient = useGraphQLClient(context.accessToken)

  const loadData = useCallback(async () => {
    if (!context.accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const [kpiResult, detailsResult] = await Promise.all([
        graphqlClient.request<{ SalesCampaign: EnterpriseABMCampaign[] }>(GET_ABM_CAMPAIGN_KPIS(segmentFilter)),
        graphqlClient.request<{ SalesCampaign: EnterpriseABMCampaign[] }>(GET_ABM_CAMPAIGN_DETAILS(segmentFilter))
      ])

      const kpiCampaigns = kpiResult?.SalesCampaign || []
      const detailsCampaigns = detailsResult?.SalesCampaign || []

      const totalAccounts = kpiCampaigns.reduce(
        (sum, campaign) => sum + (campaign.customerCampaignAccountsAggregate?.aggregate?.count || 0),
        0
      )
      const totalMeetings = kpiCampaigns.reduce(
        (sum, campaign) => sum + (Number(campaign.customerCampaignEventsAggregate?.aggregate?.sum?.meetingsHeld) || 0),
        0
      )
      const totalPipeline = kpiCampaigns.reduce(
        (sum, campaign) =>
          sum + (Number(campaign.customerCampaignEventsAggregate?.aggregate?.sum?.pipelineGenerated) || 0),
        0
      )

      setSummaryStats({
        totalAccounts,
        totalMeetings,
        totalPipeline,
        activeCampaigns: kpiCampaigns.length
      })
      setCampaigns(detailsCampaigns)
    } catch (err) {
      setSummaryStats(EMPTY_SUMMARY_STATS)
      setCampaigns([])
      setError(err instanceof Error ? err.message : 'Failed to load ABM data')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient, segmentFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const accountRows = useMemo(() => {
    const rows: ABMAccountRow[] = []
    campaigns.forEach(campaign => {
      const totalMeetings = Number(campaign.customerCampaignEventsAggregate?.aggregate?.sum?.meetingsHeld) || 0
      const totalPipeline = Number(campaign.customerCampaignEventsAggregate?.aggregate?.sum?.pipelineGenerated) || 0
      ;(campaign.customerCampaignAccounts || []).forEach(ta => {
        if (ta.customerAccount) {
          rows.push({
            id: `${ta.customerAccount.id}-${campaign.id}`,
            accountId: ta.customerAccount.id,
            accountName: ta.customerAccount.name,
            industry: ta.customerAccount.industry?.value || '-',
            engagementLevel: ta.customerEngagementLevel?.value || '-',
            engagementEntry: ta.customerEngagementLevel,
            campaignName: campaign.name,
            campaignId: campaign.id,
            meetings: totalMeetings,
            pipeline: totalPipeline
          })
        }
      })
    })
    return rows
  }, [campaigns])

  const getEngagementVariant = getCustomerEngagementLevelBadgeVariant

  if (isLoading) {
    return (
      <Card>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="enterprise-abm-dashboard">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <CardTitle>{t('dashboard-abm-title')}</CardTitle>
          <Tabs value={segmentFilter} onValueChange={v => setSegmentFilter(v as ABMSegmentFilter)}>
            <TabsList data-testid="abm-segment-filter">
              <TabsTrigger value="enterprise" data-testid="abm-segment-enterprise">
                {t('dashboard-abm-segmentEnterprise')}
              </TabsTrigger>
              <TabsTrigger value="mid-market" data-testid="abm-segment-mid-market">
                {t('dashboard-abm-segmentMidMarket')}
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="abm-segment-all">
                {t('dashboard-abm-segmentAll')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-6">
        {error && <p className="gba:text-destructive gba:text-sm gba:mb-4">{error}</p>}

        <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
          <Card data-testid="abm-stat-accounts">
            <CardContent className="gba:pt-4 gba:text-center">
              <p className="gba:text-2xl gba:font-bold">{summaryStats.totalAccounts}</p>
              <p className="gba:text-sm gba:text-muted-foreground">{t('dashboard-abm-targetAccounts')}</p>
            </CardContent>
          </Card>
          <Card data-testid="abm-stat-campaigns">
            <CardContent className="gba:pt-4 gba:text-center">
              <p className="gba:text-2xl gba:font-bold">{summaryStats.activeCampaigns}</p>
              <p className="gba:text-sm gba:text-muted-foreground">{t('dashboard-abm-activeCampaigns')}</p>
            </CardContent>
          </Card>
          <Card data-testid="abm-stat-meetings">
            <CardContent className="gba:pt-4 gba:text-center">
              <p className="gba:text-2xl gba:font-bold">{summaryStats.totalMeetings}</p>
              <p className="gba:text-sm gba:text-muted-foreground">{t('dashboard-abm-totalMeetings')}</p>
            </CardContent>
          </Card>
          <Card data-testid="abm-stat-pipeline">
            <CardContent className="gba:pt-4 gba:text-center">
              <p className="gba:text-2xl gba:font-bold">${summaryStats.totalPipeline.toLocaleString()}</p>
              <p className="gba:text-sm gba:text-muted-foreground">{t('dashboard-abm-totalPipeline')}</p>
            </CardContent>
          </Card>
        </div>

        {campaigns.length > 0 ? (
          <Accordion
            type="single"
            collapsible
            defaultValue={campaigns[0]?.id}
            items={campaigns.map(campaign => ({
              id: campaign.id,
              title: campaign.name,
              badgeText: `${campaign.customerCampaignAccounts?.length || 0} ${t('dashboard-abm-accounts')}`,
              badgeVariant: 'success' as const,
              content: (
                <Table data-testid={`abm-accounts-table-${campaign.id}`}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('dashboard-abm-account')}</TableHead>
                      <TableHead>{t('dashboard-abm-industry')}</TableHead>
                      <TableHead>{t('dashboard-abm-engagement')}</TableHead>
                      <TableHead>{t('dashboard-abm-meetings')}</TableHead>
                      <TableHead>{t('dashboard-abm-pipeline')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountRows
                      .filter(r => r.campaignId === campaign.id)
                      .map(row => (
                        <TableRow key={row.id}>
                          <TableCell className="gba:font-medium">{row.accountName}</TableCell>
                          <TableCell>{row.industry}</TableCell>
                          <TableCell>
                            <Badge
                              variant={getEngagementVariant(row.engagementEntry)}
                              data-testid={`abm-engagement-${row.accountId}`}
                            >
                              {row.engagementLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.meetings}</TableCell>
                          <TableCell>${row.pipeline.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    {accountRows.filter(r => r.campaignId === campaign.id).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="gba:text-center gba:text-muted-foreground gba:py-4">
                          {t('dashboard-abm-noAccounts')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )
            }))}
          />
        ) : (
          <p className="gba:text-muted-foreground gba:text-sm gba:text-center gba:py-8">{t('dashboard-abm-empty')}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default EnterpriseABMDashboard
