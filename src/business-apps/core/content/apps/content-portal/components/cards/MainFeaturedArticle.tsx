import React, { useState } from 'react'
import type { IntranetContent } from '@/common/data/content/mappers/contentMappers'
import { useTranslation, Badge } from '@newwork/nw-design-system'
import { MessageSquare, Share2 } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ShareDialog } from '@/components/share-dialog'
import { getEntityTypeFromTab, buildContentRecordUrl } from '@/business-apps/core/content/utils/shareUtils'
import translations from '../../_i18n'

interface MainFeaturedArticleProps {
  item: IntranetContent
  onClick?: (item: IntranetContent) => void
  currentTab?: string
  reactionSummary?: { [emoji: string]: { emoji: string; count: number; userReacted: boolean } }
  accessToken?: string
  userInfo?: { id?: string }
}

const MainFeaturedArticle: React.FC<MainFeaturedArticleProps> = ({
  item,
  onClick,
  currentTab,
  reactionSummary,
  accessToken,
  userInfo
}) => {
  const { t } = useTranslation(translations)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const createdDate = item?.createdAt
    ? new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''

  const hasTags = item.tags && item.tags.length > 0

  const calculateReadingTime = (content: string | null | undefined): number => {
    if (!content) return 1
    const words = content.split(/\s+/).length
    return Math.ceil(words / 200)
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShareDialogOpen(true)
  }

  const entityType = getEntityTypeFromTab(currentTab)
  const entityDisplayUrl = buildContentRecordUrl(item.articleId, currentTab)

  const handleClick = () => {
    if (onClick) {
      onClick(item)
    } else {
      // Navigate to content record with tab parameter
      const url = buildPlatformUrl('/platform/content/intranet/content-record', {
        contentId: item.articleId,
        ...(currentTab && { tab: currentTab })
      })
      navigateTo(url)
    }
  }

  return (
    <div
      className="gba:w-full gba:rounded-lg gba:overflow-hidden gba:shadow-md gba:hover:shadow-lg gba:hover:-translate-y-1 gba:transition-all gba:duration-300 gba:bg-card gba:border gba:border-border"
      data-testid="main-featured-article"
    >
      <div onClick={handleClick} className="gba:cursor-pointer">
        <div className="gba:h-[280px] gba:overflow-hidden gba:relative">
          {item.contentImage ? (
            <img
              src={item.contentImage}
              alt={t('knowledge_image')}
              className="gba:w-full gba:h-full gba:object-cover"
            />
          ) : (
            <div className="gba:w-full gba:h-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
              <span className="gba:text-muted-foreground gba:text-2xl gba:font-bold">KB</span>
            </div>
          )}
        </div>
        <div className="gba:p-5">
          <div className="gba:flex gba:justify-between gba:items-center gba:mb-2 gba:text-xs gba:text-muted-foreground">
            <p className="gba:mr-2">{createdDate}</p>
            <p>{item.timeToRead ?? calculateReadingTime(item.content)} mins read</p>
          </div>
          <h3 className="gba:font-bold gba:mb-3 gba:line-clamp-2 gba:text-xl gba:text-foreground">{item.title}</h3>
          <p className="gba:text-sm gba:mb-4 gba:line-clamp-3 gba:text-muted-foreground">{item.previewText}</p>

          <div className="gba:flex gba:items-center gba:mb-4">
            {item.displayAuthor && item.author ? (
              <div className="gba:flex gba:items-center">
                <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-muted gba:mr-2 gba:overflow-hidden">
                  {item.author.avatar ? (
                    <img
                      src={item.author.avatar}
                      alt={`${item.author.firstName} ${item.author.lastName}`}
                      className="gba:w-full gba:h-full gba:object-cover"
                    />
                  ) : (
                    <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-muted gba:text-xs gba:text-muted-foreground">
                      {item.author.firstName?.[0] || ''}
                      {item.author.lastName?.[0] || ''}
                    </div>
                  )}
                </div>
                <div className="gba:flex gba:flex-col">
                  <span className="gba:text-xs gba:text-foreground">
                    {item.author?.firstName} {item.author?.lastName}
                  </span>
                  {item.author?.jobPosition && (
                    <span className="gba:text-xs gba:text-muted-foreground">{item.author.jobPosition}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="gba:h-6">{/* Empty space holder with same height */}</div>
            )}
          </div>

          <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {hasTags ? (
                item.tags.map(tag => (
                  <Badge key={tag?.tag_id} data-testid="tag">
                    {tag?.tag}
                  </Badge>
                ))
              ) : (
                <Badge>{t('knowledge')}</Badge>
              )}
            </div>
          </div>

          <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
            <div className="gba:flex gba:items-center gba:space-x-4">
              {reactionSummary && Object.keys(reactionSummary).length > 0 && (
                <div className="gba:flex gba:items-center gba:gap-1">
                  {Object.entries(reactionSummary)
                    .slice(0, 3)
                    .map(([emoji, data]) => (
                      <div key={emoji} className="gba:flex gba:items-center gba:gap-0.5">
                        <span>{emoji}</span>
                        <span>{data.count}</span>
                      </div>
                    ))}
                </div>
              )}
              <div className="gba:flex gba:items-center">
                <MessageSquare className="gba:mr-1 gba:w-4 gba:h-4 gba:text-foreground" />
                <span>{item.commentsCount || 0}</span>
              </div>
            </div>
            <div className="gba:flex gba:items-center">
              <button
                onClick={handleShare}
                className="gba:flex gba:items-center gba:hover:opacity-70 gba:transition-opacity"
                data-testid="share-button"
              >
                <Share2 className="gba:mr-1 gba:w-4 gba:h-4 gba:text-foreground" data-testid="share-button-icon" />
              </button>
              <span>{item.shareCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
      {entityType && accessToken && userInfo?.id && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          accessToken={accessToken}
          currentUserId={userInfo.id}
          entityType={entityType}
          entityId={item.articleId}
          entityName={item.title}
          entityDisplayUrl={entityDisplayUrl}
        />
      )}
    </div>
  )
}

export default MainFeaturedArticle
