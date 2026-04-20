'use client'

import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
import { DotsThreeVerticalIcon } from '@phosphor-icons/react'
import { Activity } from './types'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ActivityDetailContent } from './ActivityDetailContent'
import type { ActivityRelatedEntityKind } from '@/common/components/common-relations/record-sections/activity-section/getActivityRelatedEntities'

interface ActivityDetailSheetProps {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  buildReferenceUrl?: (entityType: string, entityId: string) => string
  /** When set, takes precedence over {@link buildReferenceUrl} for related-record chip links. */
  getRelatedRecordUrl?: (kind: ActivityRelatedEntityKind, id: string) => string | undefined
  'data-testid'?: string
  accessToken?: string
  flowContext?: FlowContextName
}

const DATA_TEST_ID_PREFIX = 'ActivityDetailSheet'

/**
 * ActivityDetailSheet with integrated Sheet component
 * Displays detailed activity information in a slide-out panel
 */
export const ActivityDetailSheet: React.FC<ActivityDetailSheetProps> = ({
  activity,
  open,
  onOpenChange,
  buildReferenceUrl,
  getRelatedRecordUrl,
  'data-testid': dataTestId,
  accessToken,
  flowContext
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
        <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left gba:mb-3">
            {activity?.title || 'Activity Details'}
          </SheetTitle>
          {accessToken && flowContext && activity && (
            <div className="gba:flex gba:justify-end">
              <AppAction
                contexts={[{ context: flowContext, contextData: { activityId: activity.id } }]}
                accessToken={accessToken}
                mode="button"
                buttonSize="sm"
                buttonVariant="outline"
                emptyState="enable"
                lazyLoad
                prefixDataTestId={`${dataTestId || DATA_TEST_ID_PREFIX}-actions`}
                data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-actions-button`}
              >
                <DotsThreeVerticalIcon size={16} className="gba:mr-2" />
                Actions
              </AppAction>
            </div>
          )}
        </SheetHeader>
        <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
          {activity ? (
            <ActivityDetailContent
              activity={activity}
              buildReferenceUrl={buildReferenceUrl}
              getRelatedRecordUrl={getRelatedRecordUrl}
              data-testid={dataTestId}
              accessToken={accessToken}
            />
          ) : (
            <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
              No activity selected
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default ActivityDetailSheet
