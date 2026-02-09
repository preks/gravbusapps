import React from 'react'
import { useTranslation, Badge } from '@newwork/nw-design-system'
import { MessageCircle, Share2, ThumbsUp } from 'lucide-react'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { calculateReadingTime } from '../../utils/contentUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ReactionPicker } from '@/common/components/content'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action'
import { getEntityTypeFromVariant, buildContentRecordUrl } from '@/business-apps/core/content/utils/shareUtils'
import { buildReactionSummaryFromCounts } from '@/common/data/content/utils/reactionUtils'
import { EmployeeHoverCard } from '@/common/components/employee'
import { ContentArticleAnalyzer } from '@/business-apps/core/content/components/ContentArticleAnalyzer'
import { ContentImage } from '../shared/ContentImage'
import { ContentGroup } from '@/common/data/content/types/contentEnums'
import dayjs from 'dayjs'
import translations from '../../_i18n'

export type ContentCardVariant = 'news' | 'knowledge' | 'intranet' | 'document'

interface ContentCardProps extends BusinessAppContextProps {
  item: ContentEntry
  variant: ContentCardVariant
  onClick?: (item: ContentEntry) => void
  className?: string
  featured?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
  onReactionsRefetch?: () => void
  authorLabel?: string // Label for author field (e.g., "Author", "Creator", "Responsible")
  translatedTitle?: string
  translatedPreview?: string
  simpleReactions?: boolean // Show simple reaction/comment counts instead of full ReactionPicker
}

const ContentCard: React.FC<ContentCardProps> = ({
  item,
  variant,
  onClick,
  className = '',
  featured = false,
  currentTab,
  accessToken,
  userInfo,
  allowedReactions,
  reactionCatalogMap,
  onReactionsRefetch,
  authorLabel,
  translatedTitle,
  translatedPreview,
  simpleReactions = false
}) => {
  const { t } = useTranslation(translations)
  const formattedDate = item?.createdAt ? dayjs(item.createdAt).format('MMM DD, YYYY') : ''

  // Use translated texts if available, otherwise use original
  const displayTitle = translatedTitle || item.title
  const displayPreview = translatedPreview || item.preview

  // Build reaction summary from contentEntryReactionCounts
  const reactionSummary = buildReactionSummaryFromCounts(item, userInfo?.id)

  const handleClick = () => {
    if (onClick) {
      onClick(item)
    } else {
      // Navigate to content record with tab parameter
      const url = buildPlatformUrl('/platform/content/intranet/content-record', {
        contentId: item.id,
        ...(currentTab && { tab: currentTab })
      })
      navigateTo(url)
    }
  }

  const entityType = getEntityTypeFromVariant(variant)
  const entityDisplayUrl = buildContentRecordUrl(item.id || '', currentTab)

  const hasTags = item.contentEntryTags && item.contentEntryTags.length > 0
  const readingTime = item.timeToRead ?? calculateReadingTime(item.content)
  const commentCount =
    item.descendantContentEntriesAggregate?.aggregate?.count || item.childContentEntriesAggregate?.aggregate?.count || 0
  const reactionCount = item.contentEntryReactionCounts?.reduce((sum, r) => sum + (r.count || 0), 0) || 0

  const isNewsOrKnowledge =
    item.contentGroupRef === ContentGroup.NEWS || item.contentGroupRef === ContentGroup.KNOWLEDGE

  return (
    <div className={`gba:relative gba:w-full ${className}`}>
      {/* AI Analyzer Button - Only for NEWS and KNOWLEDGE */}
      {isNewsOrKnowledge && accessToken && userInfo?.id && (
        <div
          className="gba:absolute gba:top-2 gba:right-2 gba:z-10"
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          <ContentArticleAnalyzer contentEntry={item} accessToken={accessToken} userId={userInfo.id} />
        </div>
      )}
      <button
        type="button"
        className={`gba:w-full gba:flex gba:flex-col gba:h-full gba:bg-card gba:rounded-lg gba:overflow-hidden gba:border gba:border-border gba:shadow-lg gba:hover:shadow-xl gba:hover:translate-y-[-4px] gba:transition-all gba:duration-300 gba:cursor-pointer gba:text-left ${
          featured ? 'featured' : ''
        }`}
        data-testid={`content-card-${item.id}`}
        onClick={handleClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        {/* Image */}
        <div className="gba:w-full gba:h-[200px] gba:overflow-hidden gba:relative">
          <ContentImage
            picture={item.picture}
            accessToken={accessToken!}
            alt={t(`${variant}_image`)}
            className="gba:w-full gba:h-full"
            fallbackText={t('no_image')}
          />
        </div>

        {/* Content */}
        <div className="gba:p-4 gba:flex gba:flex-col gba:flex-grow">
          {/* Meta Info with ContentType Badge */}
          <div className="gba:flex gba:justify-between gba:items-center gba:mb-2 gba:text-xs">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-muted-foreground">{formattedDate}</span>
              {variant === 'knowledge' && item.contentType?.value && (
                <Badge variant="outline" className="gba:text-xs">
                  {item.contentType.value}
                </Badge>
              )}
            </div>
            <span className="gba:text-muted-foreground">{readingTime} mins read</span>
          </div>

          {/* Title and Preview */}
          <div className="gba:flex gba:flex-col gba:justify-between gba:flex-grow">
            <div>
              <h3
                className="gba:text-xl gba:font-bold gba:mb-2 gba:line-clamp-2 gba:min-h-[48px] gba:text-foreground"
                data-testid={`content-card-title-${item.id}`}
              >
                {displayTitle}
              </h3>
              {displayPreview && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mb-3 gba:line-clamp-2 gba:min-h-[40px]">
                  {displayPreview}
                </p>
              )}
            </div>

            {/* Author */}
            {item.creatorEmployee && (
              <div className="gba:flex gba:items-center gba:mb-3 gba:text-sm">
                {authorLabel && <span className="gba:text-muted-foreground gba:mr-1">{authorLabel}:</span>}
                <EmployeeHoverCard employee={item.creatorEmployee}>
                  <span className="gba:cursor-pointer hover:gba:text-primary hover:gba:underline gba:text-foreground">
                    {item.creatorEmployee.displayName ||
                      item.creatorEmployee.fullName ||
                      `${item.creatorEmployee.firstName || ''} ${item.creatorEmployee.lastName || ''}`.trim()}
                  </span>
                </EmployeeHoverCard>
              </div>
            )}

            {/* Tags */}
            {hasTags && (
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mb-3">
                {item.contentEntryTags!.slice(0, 3).map((tag, index) => (
                  <Badge key={`${item.id}-tag-${index}`} variant="secondary" className="gba:text-xs">
                    #{tag.contentTag?.value || ''}
                  </Badge>
                ))}
                {item.contentEntryTags!.length > 3 && (
                  <Badge variant="outline" className="gba:text-xs">
                    +{item.contentEntryTags!.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="gba:flex gba:items-center gba:gap-4 gba:pt-2 gba:border-t gba:border-border">
              {simpleReactions ? (
                /* Simple reaction/comment counts - like hero article style */
                <>
                  {reactionCount > 0 && (
                    <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                      <ThumbsUp className="gba:w-4 gba:h-4" />
                      <span>{reactionCount}</span>
                    </div>
                  )}
                  {commentCount > 0 && (
                    <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                      <MessageCircle className="gba:w-4 gba:h-4" />
                      <span>{commentCount}</span>
                    </div>
                  )}
                </>
              ) : (
                /* Full ReactionPicker */
                <>
                  {item.allowReaction && (
                    <div
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => e.stopPropagation()}
                      className="gba:bg-transparent gba:border-0 gba:p-0"
                    >
                      <ReactionPicker
                        contentEntryId={item.id || ''}
                        reactionSummary={reactionSummary}
                        allowReaction={item.allowReaction}
                        accessToken={accessToken}
                        employeeId={userInfo?.employeeDetails?.employeeId || ''}
                        onSuccess={onReactionsRefetch}
                        size="sm"
                        allowedReactions={allowedReactions}
                        reactionCatalogMap={reactionCatalogMap}
                        data-testid={`content-card-reaction-${item.id}`}
                      />
                    </div>
                  )}
                  {item.allowComment && (
                    <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                      <MessageCircle className="gba:w-4 gba:h-4" />
                      <span>{commentCount}</span>
                    </div>
                  )}
                </>
              )}
              {entityType && (
                <div className="gba:ml-auto" onClick={e => e.stopPropagation()}>
                  <AppAction
                    variant="custom"
                    mode="trigger"
                    shareContext={{
                      entityType,
                      entityId: item.id || '',
                      entityName: item.title || '',
                      entityUrl: entityDisplayUrl
                    }}
                    accessToken={accessToken}
                    data-testid={`content-card-share-${item.id}`}
                  >
                    <Share2 className="gba:w-4 gba:h-4" />
                  </AppAction>
                </div>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}

export default ContentCard
