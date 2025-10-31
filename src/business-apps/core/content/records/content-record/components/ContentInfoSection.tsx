import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@newwork/nw-design-system'
import { MessageCircle, Share2 } from 'lucide-react'
import { Content } from '@/business-apps/core/content/apps/content-hub/types/content.types'
import { copyUrlToClipboard } from '@/business-apps/core/content/apps/content-hub/utils/contentUtils'
import { useArticleLikes } from '@/business-apps/core/content/hooks/useArticleLikes'
import { LikeButton } from '@/business-apps/core/content/components/interactions'
import dayjs from 'dayjs'

interface ContentInfoSectionProps {
  item: Content
  accessToken: string
  userId: string | undefined
}

const ContentInfoSection: React.FC<ContentInfoSectionProps> = ({ item, accessToken, userId }) => {
  const { t } = useTranslation('content')

  // Fetch user's like status
  const { userLike, refetch: refetchLikes } = useArticleLikes(item.articleId, userId, accessToken)

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
        {item.allowLike && (
          <LikeButton
            articleId={item.articleId}
            userLike={userLike}
            likesCount={item.likesCount}
            allowLike={item.allowLike}
            accessToken={accessToken}
            onSuccess={refetchLikes}
            size="md"
            data-testid="content-info-like-button"
          />
        )}

        {item.allowComment && (
          <div className="gba:flex gba:items-center gba:gap-2">
            <MessageCircle className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <span className="gba:text-sm gba:text-foreground">{item.commentsCount || 0}</span>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={handleShare} className="gba:p-2" data-testid="content-share-button">
          <Share2 className="gba:w-4 gba:h-4" />
          <span className="gba:ml-2 gba:text-sm">{item.shareCount || 0}</span>
        </Button>
      </div>
    </div>
  )
}

export default ContentInfoSection
