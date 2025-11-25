import React from 'react'
import { Spinner, Badge } from '@newwork/nw-design-system'
import { CalendarOutlined, TagOutlined } from '@ant-design/icons'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { CampaignHeaderProps } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useShareAction } from '@/components/share-entity'
import dayjs from 'dayjs'

interface ExtendedCampaignHeaderProps extends CampaignHeaderProps {
  currentUserId?: string
}

const CampaignHeader: React.FC<ExtendedCampaignHeaderProps> = ({ campaign, isLoading, accessToken, currentUserId, campaignId }) => {
  // (no single-date display in header)

  // Helper function to calculate campaign duration
  const calculateDuration = (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return '-'
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    const duration = end.diff(start, 'day')
    return `${duration} days`
  }

  // Helper to format date range
  const formatDateRange = (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return '-'
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    const left = start.format('DD MMM')
    const right = end.format('DD MMM YYYY')
    return `${left} – ${right}`
  }

  // Helper function to get campaign status
  const getCampaignStatus = (startDate?: string, endDate?: string): { status: string; color: string } => {
    if (!startDate || !endDate) return { status: 'Unknown', color: '#6B7280' }

    const now = dayjs()
    const start = dayjs(startDate)
    const end = dayjs(endDate)

    if (now.isBefore(start)) {
      return { status: 'Upcoming', color: '#F59E0B' }
    } else if (now.isAfter(end)) {
      return { status: 'Completed', color: '#10B981' }
    } else {
      return { status: 'Active', color: '#3B82F6' }
    }
  }

  if (isLoading) {
    return (
      <div className="gba:p-6 gba:bg-card gba:rounded-lg" data-testid="campaign-header-loading">
        <div className="gba:flex gba:justify-center gba:items-center gba:h-32">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="gba:p-6 gba:bg-card gba:rounded-lg" data-testid="campaign-header-error">
        <div className="gba:text-center" style={{ color: 'var(--color-text-secondary)' }}>
          {getTranslationFromI18nKeyAndLabel('campaign.header.notFound', 'Campaign not found')}
        </div>
      </div>
    )
  }

  const statusInfo = getCampaignStatus(campaign.startDate, campaign.endDate)

  const getStatusBadgeVariant = (status: string): 'success' | 'pending' | 'default' | 'secondary' => {
    if (status === 'Active') return 'success'
    if (status === 'Upcoming') return 'pending'
    if (status === 'Completed') return 'default'
    return 'secondary'
  }

  // Use the reusable share action hook
  const { shareAction, ShareDialog } = useShareAction({
    accessToken: accessToken || '',
    currentUserId: currentUserId || '',
    entity: {
      entityType: 'campaign',
      entityId: campaign.id,
      entityName: campaign.name,
      entityUrl: `/platform/crm/campaign-record?campaignId=${campaign.id}`
    }
  })

  return (
    <div className="gba:account-header gba:mb-6 gba:bg-card gba:rounded-lg gba:p-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div
              style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}
              data-testid="campaign-header-title"
            >
              {campaign.name}
            </div>
            <div className="gba:text-muted-foreground gba:text-sm gba:flex gba:flex-row gba:items-center gba:gap-3 gba:flex-nowrap">
              <span className="gba:flex gba:items-center gba:gap-2">
                <TagOutlined />
                {campaign.type?.value || 'Unknown Type'}
              </span>
              <span className="gba:flex gba:items-center gba:gap-2">
                <CalendarOutlined />
                {calculateDuration(campaign.startDate, campaign.endDate)}
              </span>
              <span className="gba:flex gba:items-center gba:gap-2">
                <CalendarOutlined />
                {formatDateRange(campaign.startDate, campaign.endDate)}
              </span>
              <Badge variant={getStatusBadgeVariant(statusInfo.status)} data-testid="campaign-header-status-badge">
                {statusInfo.status}
              </Badge>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {accessToken && campaignId && (
            <AppAction
              variant="header"
              data-testid="campaign-record-action-button"
              contexts={[
                {
                  context: FlowContextName.customerCampaignEntity,
                  contextData: { campaignId }
                }
              ]}
              prefixDataTestId="campaign-record-action"
              accessToken={accessToken}
              emptyState="enable"
              lazyLoad
              onClick={e => e.stopPropagation()}
              customActions={[shareAction]}
            />
          )}
        </div>
      </div>

      {/* Share Dialog */}
      {ShareDialog}
    </div>
  )
}

export default CampaignHeader
