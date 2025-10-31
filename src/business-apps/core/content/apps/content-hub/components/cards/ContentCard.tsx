import React from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button } from '@newwork/nw-design-system'
import { MessageCircle, Share2 } from 'lucide-react'
import { Content } from '../../types/content.types'
import { copyUrlToClipboard, calculateReadingTime } from '../../utils/contentUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useArticleLikes } from '@/business-apps/core/content/hooks/useArticleLikes'
import { LikeButton } from '@/business-apps/core/content/components/interactions'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import dayjs from 'dayjs'

export type ContentCardVariant = 'news' | 'knowledge' | 'intranet' | 'document'

interface ContentCardProps extends BusinessAppContextProps {
  item: Content
  variant: ContentCardVariant
  onClick?: (item: Content) => void
  className?: string
  featured?: boolean
  currentTab?: string
}

const ContentCard: React.FC<ContentCardProps> = ({
  item,
  variant,
  onClick,
  className = '',
  featured = false,
  currentTab,
  accessToken,
  userInfo
}) => {
  const { t } = useTranslation('content')
  const formattedDate = item?.createdAt ? dayjs(item.createdAt).format('MMM DD, YYYY') : ''

  // Fetch user's like status
  const { userLike, refetch: refetchLikes } = useArticleLikes(item.articleId, userInfo?.id, accessToken)

  const handleClick = () => {
    if (onClick) {
      onClick(item)
    } else {
      // Navigate to content record with tab parameter
      const url = buildPlatformUrl('/platform/core/content-record', {
        contentId: item.articleId,
        ...(currentTab && { tab: currentTab })
      })
      navigateTo(url)
    }
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    copyUrlToClipboard(t('content_link_copied'), item.articleId)
  }

  const hasTags = item.tags && item.tags.length > 0
  const readingTime = item.timeToRead ?? calculateReadingTime(item.content)

  return (
    <div
      className={`gba:w-full gba:flex gba:flex-col gba:h-full gba:bg-card gba:rounded-lg gba:overflow-hidden gba:border gba:border-border gba:shadow-lg gba:hover:shadow-xl gba:hover:translate-y-[-4px] gba:transition-all gba:duration-300 ${
        featured ? 'featured' : ''
      } ${className}`}
      data-testid={`content-card-${item.articleId}`}
    >
      <div className="gba:cursor-pointer gba:flex gba:flex-col gba:h-full" onClick={handleClick}>
        {/* Image */}
        <div className="gba:w-full gba:h-[200px] gba:overflow-hidden gba:relative">
          {item.contentImage ? (
            <img
              src={item.contentImage}
              alt={t(`${variant}_image`)}
              className="gba:w-full gba:h-full gba:object-cover"
            />
          ) : (
            <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-muted">
              <span className="gba:text-muted-foreground gba:text-xl gba:font-bold">{t('no_image')}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="gba:p-4 gba:flex gba:flex-col gba:flex-grow">
          {/* Meta Info */}
          <div className="gba:flex gba:justify-between gba:items-center gba:mb-2 gba:text-xs gba:text-muted-foreground">
            <p>{formattedDate}</p>
            <p>{readingTime} mins read</p>
          </div>

          {/* Title and Preview */}
          <div className="gba:flex gba:flex-col gba:justify-between gba:flex-grow">
            <div>
              <h3
                className="gba:text-xl gba:font-bold gba:mb-2 gba:line-clamp-2 gba:min-h-[48px] gba:text-foreground"
                data-testid={`content-card-title-${item.articleId}`}
              >
                {item.title}
              </h3>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-3 gba:line-clamp-2 gba:min-h-[40px]">
                {item.previewText}
              </p>
            </div>

            {/* Author */}
            {item.displayAuthor && item.author && (
              <div className="gba:flex gba:items-center gba:mb-3">
                <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:mr-3 gba:overflow-hidden gba:flex gba:items-center gba:justify-center">
                  {item.author.avatar ? (
                    <img
                      src={item.author.avatar}
                      alt={`${item.author.firstName} ${item.author.lastName}`}
                      className="gba:w-full gba:h-full gba:object-cover"
                    />
                  ) : (
                    <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-muted gba:text-xs gba:text-muted-foreground">
                      {item.author.firstName?.[0]}
                      {item.author.lastName?.[0]}
                    </div>
                  )}
                </div>
                <div>
                  <p className="gba:text-sm gba:font-medium gba:text-foreground">
                    {item.author.firstName} {item.author.lastName}
                  </p>
                  {item.author.jobPosition && (
                    <p className="gba:text-xs gba:text-muted-foreground">{item.author.jobPosition}</p>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {hasTags && (
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mb-3">
                {item.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={`${item.articleId}-tag-${index}`} variant="secondary" className="gba:text-xs">
                    #{tag.tag || tag.name}
                  </Badge>
                ))}
                {item.tags.length > 3 && (
                  <Badge variant="outline" className="gba:text-xs">
                    +{item.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="gba:flex gba:items-center gba:gap-4 gba:pt-2 gba:border-t gba:border-border">
              {item.allowLike && (
                <div onClick={e => e.stopPropagation()}>
                  <LikeButton
                    articleId={item.articleId}
                    userLike={userLike}
                    likesCount={item.likesCount}
                    allowLike={item.allowLike}
                    accessToken={accessToken}
                    onSuccess={refetchLikes}
                    size="sm"
                    data-testid={`content-card-like-${item.articleId}`}
                  />
                </div>
              )}
              {item.allowComment && (
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                  <MessageCircle className="gba:w-4 gba:h-4" />
                  <span>{item.commentsCount || 0}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="gba:ml-auto gba:p-1 gba:h-auto"
                onClick={handleShare}
                data-testid={`content-card-share-${item.articleId}`}
              >
                <Share2 className="gba:w-4 gba:h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContentCard
