import React, { useState, useEffect, useRef } from 'react'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { useTranslation, Badge } from '@newwork/nw-design-system'
import { MessageSquare, Share2 } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { AppAction } from '@/components/app-action'
import { getEntityTypeFromTab, buildContentRecordUrl } from '@/business-apps/core/content/utils/shareUtils'
import translations from '../../_i18n'

interface MainFeaturedArticleProps {
  item: ContentEntry
  onClick?: (item: ContentEntry) => void
  currentTab?: string
  reactionSummary?: { [emoji: string]: { emoji: string; count: number; userReacted: boolean } }
  accessToken?: string
}

const MainFeaturedArticle: React.FC<MainFeaturedArticleProps> = ({
  item,
  onClick,
  currentTab,
  reactionSummary,
  accessToken
}) => {
  const { t } = useTranslation(translations)
  const createdDate = item?.createdAt
    ? new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''

  const hasTags = item.contentEntryTags && item.contentEntryTags.length > 0
  const commentCount =
    item.descendantContentEntriesAggregate?.aggregate?.count || item.childContentEntriesAggregate?.aggregate?.count || 0

  const calculateReadingTime = (content: string | null | undefined): number => {
    if (!content) return 1
    const words = content.split(/\s+/).length
    return Math.ceil(words / 200)
  }

  const entityType = getEntityTypeFromTab(currentTab)
  const entityDisplayUrl = buildContentRecordUrl(item.id || '', currentTab)

  // Handle image URL with async blob URL support
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    // Clean up previous blob URL if it exists
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    if (!item.picture) {
      setImageUrl(null)
      return
    }

    let fileInfo: any = null
    try {
      fileInfo = typeof item.picture === 'string' ? JSON.parse(item.picture) : item.picture
    } catch {
      // If it's not JSON, check if it's a data URL (base64) - use directly
      if (typeof item.picture === 'string' && item.picture.startsWith('data:')) {
        setImageUrl(item.picture)
        return
      }
      // Otherwise try to use as direct URL (old format)
      setImageUrl(item.picture)
      return
    }

    if (!fileInfo?.path) {
      setImageUrl(null)
      return
    }

    // If accessToken is provided, fetch as blob URL (async)
    if (accessToken) {
      let isCancelled = false

      const fetchImage = async () => {
        try {
          const blobUrl = await buildFileUrl(fileInfo, accessToken)
          if (!isCancelled) {
            blobUrlRef.current = blobUrl
            setImageUrl(blobUrl)
          } else {
            URL.revokeObjectURL(blobUrl)
          }
        } catch (error) {
          if (!isCancelled) {
            console.error('[MainFeaturedArticle] Error fetching image:', error)
            setImageUrl(null)
          }
        }
      }

      fetchImage()

      return () => {
        isCancelled = true
        if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
        }
      }
    } else {
      // No accessToken, use plain URL (synchronous)
      setImageUrl(buildFileUrl(fileInfo))
    }
  }, [item.picture, accessToken])

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

  return (
    <div
      className="gba:w-full gba:rounded-lg gba:overflow-hidden gba:shadow-md gba:hover:shadow-lg gba:hover:-translate-y-1 gba:transition-all gba:duration-300 gba:bg-card gba:border gba:border-border"
      data-testid="main-featured-article"
    >
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
        className="gba:cursor-pointer gba:w-full gba:text-left gba:bg-transparent gba:border-0 gba:p-0"
      >
        <div className="gba:h-[280px] gba:overflow-hidden gba:relative">
          {imageUrl ? (
            <img src={imageUrl} alt={t('knowledge_image')} className="gba:w-full gba:h-full gba:object-cover" />
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
          <p className="gba:text-sm gba:mb-4 gba:line-clamp-3 gba:text-muted-foreground">{item.preview}</p>

          <div className="gba:flex gba:items-center gba:mb-4">
            {item.displayCreator && item.creatorEmployee ? (
              <div className="gba:flex gba:items-center">
                <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-muted gba:mr-2 gba:overflow-hidden">
                  {item.creatorEmployee.pictureThumbnail || item.creatorEmployee.picture ? (
                    <img
                      src={item.creatorEmployee.pictureThumbnail || item.creatorEmployee.picture}
                      alt={item.creatorEmployee.displayName || item.creatorEmployee.fullName || ''}
                      className="gba:w-full gba:h-full gba:object-cover"
                    />
                  ) : (
                    <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-muted gba:text-xs gba:text-muted-foreground">
                      {item.creatorEmployee.firstName?.[0] || ''}
                      {item.creatorEmployee.lastName?.[0] || ''}
                    </div>
                  )}
                </div>
                <div className="gba:flex gba:flex-col">
                  <span className="gba:text-xs gba:text-foreground">
                    {item.creatorEmployee.displayName || item.creatorEmployee.fullName}
                  </span>
                  {item.creatorEmployee.employeePosition?.jobPosition?.name && (
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {item.creatorEmployee.employeePosition.jobPosition.name}
                    </span>
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
                item.contentEntryTags!.map(tag => (
                  <Badge key={tag.id} data-testid="tag">
                    {tag.contentTag?.value || ''}
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
                <span>{commentCount}</span>
              </div>
            </div>
            <div className="gba:flex gba:items-center">
              {entityType && accessToken && (
                <AppAction
                  variant="custom"
                  mode="button"
                  buttonSize="sm"
                  buttonVariant="ghost"
                  shareContext={{
                    entityType,
                    entityId: item.id || '',
                    entityName: item.title || '',
                    entityUrl: entityDisplayUrl
                  }}
                  accessToken={accessToken}
                  className="gba:flex gba:items-center gba:hover:opacity-70 gba:transition-opacity"
                  onClick={e => e.stopPropagation()}
                  data-testid="share-button"
                >
                  <Share2 className="gba:mr-1 gba:w-4 gba:h-4 gba:text-foreground" data-testid="share-button-icon" />
                </AppAction>
              )}
              <span>0</span>
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}

export default MainFeaturedArticle
