import React, { useMemo } from 'react'
import { Share2 } from 'lucide-react'
import { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { ReactionPicker } from '@/common/components/content'
import { AppAction } from '@/components/app-action'
import { getEntityTypeFromContentGroup, buildContentRecordUrl } from '@/business-apps/core/content/utils/shareUtils'
import { buildReactionSummaryFromCounts } from '@/common/data/content/utils/reactionUtils'
import { EmployeeHoverCard } from '@/common/components/employee'
import { ContentGroup } from '@/common/data/content/types/contentEnums'
import dayjs from 'dayjs'

interface ContentInfoSectionProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const ContentInfoSection: React.FC<ContentInfoSectionProps> = ({
  item,
  accessToken,
  userId,
  employeeId,
  allowedReactions,
  reactionCatalogMap
}) => {
  // Build reaction summary from contentEntryReactionCounts
  const reactionSummary = buildReactionSummaryFromCounts(item, userId)

  const formattedDate = useMemo(() => {
    return item.createdAt ? dayjs(item.createdAt).format('MMM DD, YYYY') : ''
  }, [item.createdAt])

  const entityType = getEntityTypeFromContentGroup(item.contentGroupRef)
  const entityDisplayUrl = buildContentRecordUrl(item.id)

  // Get author label based on content group
  const getAuthorLabel = (): string => {
    if (item.contentGroupRef?.includes(ContentGroup.NEWS)) return 'Author'
    if (item.contentGroupRef?.includes(ContentGroup.KNOWLEDGE)) return 'Creator'
    if (item.contentGroupRef?.includes(ContentGroup.DOCUMENT)) return 'Responsible'
    return 'Author' // Default
  }

  const authorLabel = getAuthorLabel()
  const authorName =
    item.creatorEmployee?.displayName ||
    (item.creatorEmployee
      ? `${item.creatorEmployee.firstName || ''} ${item.creatorEmployee.lastName || ''}`.trim()
      : null)

  return (
    <div
      className="gba:flex gba:flex-row gba:justify-between gba:p-5 gba:mt-4 gba:bg-muted gba:rounded-lg"
      data-testid="content-info-section"
    >
      {/* Author and Date Info */}
      <div className="gba:flex gba:flex-row gba:items-center">
        {authorName && (
          <>
            <div className="gba:flex gba:items-center gba:text-sm">
              <span className="gba:text-muted-foreground gba:mr-1">{authorLabel}:</span>
              {item.creatorEmployee ? (
                <EmployeeHoverCard employee={item.creatorEmployee}>
                  <span className="gba:cursor-pointer hover:gba:text-primary hover:gba:underline gba:text-foreground gba:font-medium">
                    {authorName}
                  </span>
                </EmployeeHoverCard>
              ) : (
                <span className="gba:text-foreground gba:font-medium">{authorName}</span>
              )}
            </div>
            <p className="gba:text-sm gba:font-regular gba:mx-3 gba:text-muted-foreground">•</p>
          </>
        )}

        {item.createdAt && (
          <p className="gba:text-sm gba:font-regular gba:text-foreground" data-testid="content-created-date">
            {formattedDate}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="gba:flex gba:flex-row gba:items-center gba:ml-auto gba:gap-4">
        {item.allowReaction && (
          <ReactionPicker
            contentEntryId={item.id}
            reactionSummary={reactionSummary}
            allowReaction={item.allowReaction}
            accessToken={accessToken}
            employeeId={employeeId || ''}
            onSuccess={() => {
              // Refetch will be handled by parent component
            }}
            size="md"
            allowedReactions={allowedReactions}
            reactionCatalogMap={reactionCatalogMap}
            data-testid="content-info-reaction-picker"
          />
        )}

        {entityType && (
          <AppAction
            variant="custom"
            mode="button"
            buttonSize="sm"
            buttonVariant="ghost"
            shareContext={{
              entityType,
              entityId: item.id,
              entityName: item.title || '',
              entityUrl: entityDisplayUrl
            }}
            accessToken={accessToken}
            className="gba:p-2"
            data-testid="content-share-button"
          >
            <Share2 className="gba:w-4 gba:h-4" />
          </AppAction>
        )}
      </div>
    </div>
  )
}

export default ContentInfoSection
