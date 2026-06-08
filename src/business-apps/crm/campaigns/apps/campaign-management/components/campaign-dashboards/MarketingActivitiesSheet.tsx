import React from 'react'
import {
  Badge,
  type BadgeProps,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system'
import type { MarketingActivity } from '@/common/data/customer/queries/campaignDashboardQueries'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getBadgeVariantFromCatalog } from '@/common/utils/badgeUtils'
import dayjs from 'dayjs'

interface MarketingActivitiesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateLabel: string
  activities: MarketingActivity[]
  t: (key: string, args?: any) => string
}

const formatActivityDate = (activity: MarketingActivity) => {
  const start = dayjs(activity.date).format('DD MMM YYYY')
  if (!activity.endDate) return start
  return `${start} - ${dayjs(activity.endDate).format('DD MMM YYYY')}`
}

const getStatusBadgeVariant = (activity: MarketingActivity): BadgeProps['variant'] => {
  const catalogVariant = getBadgeVariantFromCatalog(activity.statusEntry)
  if (catalogVariant && catalogVariant !== 'default') return catalogVariant

  const status = (activity.status || '').toLowerCase()
  if (status.includes('active') || status.includes('won') || status.includes('completed')) return 'success'
  if (status.includes('planned') || status.includes('draft')) return 'secondary'
  if (status.includes('paused') || status.includes('pending')) return 'warning'
  if (status.includes('cancel') || status.includes('lost')) return 'destructive'
  return activity.status ? 'default' : 'outline'
}

const navigateToRelatedCampaign = (campaignId?: string) => {
  if (!campaignId) return
  navigateTo(buildPlatformUrl('/platform/crm/campaign-record', { campaignId }))
}

interface DetailSectionProps {
  label: string
  children: React.ReactNode
}

const DetailSection: React.FC<DetailSectionProps> = ({ label, children }) => (
  <div className="gba:min-w-0 gba:space-y-1">
    <p className="gba:text-xs gba:font-medium gba:text-muted-foreground">{label}</p>
    <div className="gba:min-w-0">{children}</div>
  </div>
)

export const MarketingActivitiesSheet: React.FC<MarketingActivitiesSheetProps> = ({
  open,
  onOpenChange,
  dateLabel,
  activities,
  t
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
      <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
        <SheetTitle>{dateLabel}</SheetTitle>
        <SheetDescription>{t('dashboard-activities-sheet-description', { count: activities.length })}</SheetDescription>
      </SheetHeader>

      <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
        <ScrollArea className="gba:h-full">
          <div className="gba:flex gba:flex-col gba:gap-3 gba:py-6">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-3"
                data-testid={`marketing-activity-sheet-item-${activity.id}`}
              >
                <div className="gba:space-y-3">
                  <div className="gba:min-w-0 gba:space-y-2">
                    <div className="gba:min-w-0">
                      <p className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">{activity.title}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">{formatActivityDate(activity)}</p>
                    </div>
                  </div>

                  <DetailSection label={t('dashboard-activities-owner')}>
                    <p className="gba:truncate gba:text-sm gba:text-foreground">
                      {activity.ownerName || t('dashboard-activities-not-available')}
                    </p>
                  </DetailSection>

                  <DetailSection label={t('dashboard-activities-relatedEntity')}>
                    {activity.relatedEntityId && (activity.relatedEntityName || activity.campaignName) ? (
                      <button
                        type="button"
                        onClick={() => navigateToRelatedCampaign(activity.relatedEntityId)}
                        className="gba:max-w-full gba:truncate gba:border-0 gba:bg-transparent gba:p-0 gba:text-left gba:text-sm gba:font-medium gba:text-primary hover:gba:underline"
                        data-testid={`marketing-activity-related-entity-${activity.id}`}
                      >
                        {activity.relatedEntityName || activity.campaignName}
                      </button>
                    ) : (
                      <p className="gba:text-sm gba:text-foreground">{t('dashboard-activities-not-available')}</p>
                    )}
                  </DetailSection>

                  <DetailSection label={t('dashboard-activities-status')}>
                    <Badge variant={getStatusBadgeVariant(activity)}>
                      {activity.status || t('dashboard-activities-not-available')}
                    </Badge>
                  </DetailSection>

                  <DetailSection label={t('dashboard-activities-channel')}>
                    <div className="gba:flex gba:flex-wrap gba:gap-2">
                      {activity.channel && (
                        <Badge variant={getBadgeVariantFromCatalog(activity.channelEntry)}>{activity.channel}</Badge>
                      )}
                      {activity.segment && (
                        <Badge variant={getBadgeVariantFromCatalog(activity.segmentEntry)}>{activity.segment}</Badge>
                      )}
                      {!activity.channel && !activity.segment && (
                        <Badge variant="outline">{t('dashboard-activities-not-available')}</Badge>
                      )}
                    </div>
                  </DetailSection>
                </div>
              </div>
            ))}

            {activities.length === 0 && (
              <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8">
                {t('dashboard-activities-emptyDay')}
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </SheetContent>
  </Sheet>
)

export default MarketingActivitiesSheet
