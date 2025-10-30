import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Button } from '@newwork/nw-design-system'
import { Share2 } from 'lucide-react'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { copyUrlToClipboard } from '@/business-apps/core/content/apps/content-portal/utils/contentUtils'
import { useUserContentReactions, ReactionSummary } from '@/common/data/content'
import { ReactionButton } from '@/business-apps/core/content/components/interactions'
import translations from '../_i18n'
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
  const { t } = useTranslation(translations)

  // Fetch reactions using central hook
  const { reactionsByArticle, refetch: refetchReactions } = useUserContentReactions({
    contentEntryIds: [item.id],
    currentUserId: userId,
    accessToken
  })

  const reactionSummary: ReactionSummary = reactionsByArticle[item.id] || {}

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
        {item.displayCreator && item.creatorDisplayName && (
          <>
            <p className="gba:text-sm gba:font-bold gba:text-foreground">{item.creatorDisplayName}</p>
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
          <ReactionButton
            contentEntryId={item.id}
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
