import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@newwork/nw-design-system'
import { Share2 } from 'lucide-react'
import { Content } from '@/business-apps/core/content/apps/content-portal/types/content.types'
import { copyUrlToClipboard } from '@/business-apps/core/content/apps/content-portal/utils/contentUtils'
import { useUserContentReactions, ReactionSummary } from '@/common/data/content'
import { ReactionButton } from '@/business-apps/core/content/components/interactions'
import dayjs from 'dayjs'

interface ContentInfoSectionProps {
  item: Content
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
  const { t } = useTranslation('content')

  // Fetch reactions using central hook
  const { reactionsByArticle, refetch: refetchReactions } = useUserContentReactions({
    contentEntryIds: [item.articleId],
    currentUserId: userId,
    accessToken
  })

  const reactionSummary: ReactionSummary = reactionsByArticle[item.articleId] || {}

  const formattedDate = useMemo(() => {
    return item.createdAt ? dayjs(item.createdAt).format('MMM DD, YYYY') : ''
  }, [item.createdAt])

  const handleShare = () => {
    copyUrlToClipboard(t('content_link_copied'))
  }

  return (
    <div
      className="gba:flex gba:flex-row gba:justify-between gba:p-5 gba:mt-4 gba:bg-muted gba:rounded-lg"
      data-testid="content-info-section"
    >
      {/* Author and Date Info */}
      <div className="gba:flex gba:flex-row gba:items-center">
        {item.displayAuthor && item.author && (
          <>
            <p className="gba:text-sm gba:font-bold gba:text-foreground">
              {item.author.firstName} {item.author.lastName}
            </p>

            {item.author.jobPosition && (
              <>
                <p className="gba:text-sm gba:font-regular gba:mx-3 gba:text-muted-foreground">•</p>
                <p className="gba:text-sm gba:font-regular gba:text-foreground">{item.author.jobPosition}</p>
                <p className="gba:text-sm gba:font-regular gba:mx-3 gba:text-muted-foreground">•</p>
              </>
            )}
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
          <ReactionButton
            contentEntryId={item.articleId}
            reactionSummary={reactionSummary}
            allowReaction={item.allowReaction}
            accessToken={accessToken}
            employeeId={employeeId || ''}
            onSuccess={refetchReactions}
            size="md"
            allowedReactions={allowedReactions}
            reactionCatalogMap={reactionCatalogMap}
            data-testid="content-info-reaction-button"
          />
        )}

        <Button variant="ghost" size="sm" onClick={handleShare} className="gba:p-2" data-testid="content-share-button">
          <Share2 className="gba:w-4 gba:h-4" />
        </Button>
      </div>
    </div>
  )
}

export default ContentInfoSection
