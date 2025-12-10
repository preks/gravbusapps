import React, { useState, useEffect, useRef } from 'react'
import { useTranslation, Badge } from '@newwork/nw-design-system'
import { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { CommentSection } from '@/business-apps/core/content/records/content-record/components/interactions'
import ContentInfoSection from './ContentInfoSection'
import { buildFileUrl } from '@/common/utils/fileUtils'
import type { TranslatedTexts } from '@/common/components/content'
import translations from '../_i18n'

interface ArticleViewProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
  targetLanguage?: string | null
  translatedTexts?: TranslatedTexts | null
  onTranslateComments?: (commentTexts: string[], targetLanguage: string) => Promise<string[]>
}

/**
 * Default Article View for News, Knowledge Base, Documents, and general content
 */
const ArticleView: React.FC<ArticleViewProps> = ({
  item,
  accessToken,
  userId,
  employeeId,
  allowedReactions,
  reactionCatalogMap,
  targetLanguage,
  translatedTexts,
  onTranslateComments
}) => {
  const { t } = useTranslation(translations)

  // Use translated texts if available, otherwise use original
  const displayTitle = translatedTexts?.title || item.title
  const displayPreview = translatedTexts?.preview || item.preview
  const displayContent = translatedTexts?.content || item.content

  // State for image blob URL
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  // Fetch image with authentication
  useEffect(() => {
    // Clean up previous blob URL if it exists
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    if (!item.picture || !accessToken) {
      return
    }

    let fileInfo: any = null
    try {
      fileInfo = typeof item.picture === 'string' ? JSON.parse(item.picture) : item.picture
    } catch {
      // If it's not JSON, check if it's a data URL (base64) - use directly
      if (typeof item.picture === 'string' && item.picture.startsWith('data:')) {
        setImageBlobUrl(item.picture)
        return
      }
      // Otherwise try to use as direct URL (old format)
      console.log('[ArticleView] Picture is not JSON, using directly:', item.picture)
      setImageBlobUrl(item.picture)
      return
    }

    if (!fileInfo?.path) {
      console.log('[ArticleView] No picture available or invalid fileInfo')
      return
    }

    console.log('[ArticleView] Picture JSON parsed, fileInfo:', fileInfo)

    // Fetch image with authentication using buildFileUrl
    let isCancelled = false

    const fetchImage = async () => {
      try {
        const blobUrl = await buildFileUrl(fileInfo, accessToken)
        if (!isCancelled) {
          blobUrlRef.current = blobUrl
          setImageBlobUrl(blobUrl)
          console.log('[ArticleView] Image fetched and blob URL created:', blobUrl)
        } else {
          // Clean up blob if fetch completed but component already unmounted/changed
          URL.revokeObjectURL(blobUrl)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[ArticleView] Error fetching image:', error)
        }
      }
    }

    fetchImage()

    // Cleanup function
    return () => {
      isCancelled = true
      // Clean up blob URL on unmount
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [item.picture, accessToken])

  return (
    <div className="gba:overflow-y-auto gba:mb-6" data-testid="article-view">
      <div className="gba:flex gba:flex-col gba:mt-6 gba:max-w-[1000px] gba:mx-auto gba:px-4">
        {/* Tags */}
        {item.contentEntryTags && item.contentEntryTags.length > 0 && (
          <div className="gba:flex gba:flex-row gba:flex-wrap gba:gap-2 gba:mb-4">
            {item.contentEntryTags.map(tagEntry => {
              const tagId = tagEntry.contentTag?.id || tagEntry.id || tagEntry.contentTag?.value || ''
              return (
                <Badge key={`article-tag-${tagId}`} variant="secondary">
                  #{tagEntry.contentTag?.value || ''}
                </Badge>
              )
            })}
          </div>
        )}

        {/* Title */}
        <h1 className="gba:text-5xl gba:mt-4 gba:leading-tight gba:font-bold gba:mb-9 gba:text-foreground">
          {displayTitle}
        </h1>

        {/* Featured Image */}
        {imageBlobUrl ? (
          <img
            src={imageBlobUrl}
            alt={t('content_image')}
            className="gba:w-full gba:h-auto gba:max-h-[562px] gba:object-cover gba:rounded-lg"
          />
        ) : (
          <div className="gba:bg-muted gba:w-full gba:h-[562px] gba:rounded-lg gba:flex gba:items-center gba:justify-center">
            <span className="gba:text-muted-foreground gba:text-2xl">{t('no_image')}</span>
          </div>
        )}

        {/* Preview Text */}
        {displayPreview && (
          <p className="gba:text-lg gba:leading-8 gba:font-bold gba:mt-10 gba:px-4 gba:text-foreground">
            {displayPreview}
          </p>
        )}

        {/* Content */}
        {displayContent && (
          <div
            className="gba:text-lg gba:leading-8 gba:mt-10 gba:px-4 gba:text-foreground 
                       [&>h1]:gba:text-4xl [&>h1]:gba:font-bold 
                       [&>h2]:gba:text-3xl [&>h2]:gba:font-bold 
                       [&>h3]:gba:text-2xl [&>h3]:gba:font-bold"
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
        )}

        {/* Article Info Section */}
        <ContentInfoSection
          item={item}
          accessToken={accessToken}
          userId={userId}
          employeeId={employeeId}
          allowedReactions={allowedReactions}
          reactionCatalogMap={reactionCatalogMap}
        />

        {/* Comment Section */}
        {item.allowComment && item.id && employeeId && (
          <CommentSection
            articleId={item.id}
            allowComment={item.allowComment}
            commentCount={0}
            accessToken={accessToken}
            employeeId={employeeId}
            currentUserId={userId}
            targetLanguage={targetLanguage || undefined}
            onTranslateComments={onTranslateComments}
            data-testid="article-view-comments"
          />
        )}
      </div>
    </div>
  )
}

export default ArticleView
