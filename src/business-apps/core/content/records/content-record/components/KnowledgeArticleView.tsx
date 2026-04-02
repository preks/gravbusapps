import React, { useState, useEffect, useRef } from 'react'
import { Badge } from '@newwork/nw-design-system'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { CommentSection } from '@/business-apps/core/content/records/content-record/components/interactions'
import ContentInfoSection from './ContentInfoSection'
import { ContentHtmlRenderer } from './ContentHtmlRenderer'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { ContentArticleAnalyzer } from '@/business-apps/core/content/components/ContentArticleAnalyzer'
import { ContentGroup } from '@/common/data/content/constants/contentConstants'
import type { TranslatedTexts } from '@/common/components/content'

interface KnowledgeArticleViewProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
  targetLanguage?: string | null
  translatedTexts?: TranslatedTexts | null
  onTranslateComments?: (commentTexts: string[], targetLanguage: string) => Promise<string[]>
  onReactionSuccess?: () => void
}

/**
 * Clean Knowledge Article View
 * Focused on readability and content
 */
const KnowledgeArticleView: React.FC<KnowledgeArticleViewProps> = ({
  item,
  accessToken,
  userId,
  employeeId,
  allowedReactions,
  reactionCatalogMap,
  onReactionSuccess,
  targetLanguage,
  translatedTexts,
  onTranslateComments
}) => {
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
      console.log('[KnowledgeArticleView] Picture is not JSON, using directly:', item.picture)
      setImageBlobUrl(item.picture)
      return
    }

    if (!fileInfo?.path) {
      console.log('[KnowledgeArticleView] No picture available or invalid fileInfo')
      return
    }

    console.log('[KnowledgeArticleView] Picture JSON parsed, fileInfo:', fileInfo)

    // Fetch image with authentication using buildFileUrl
    let isCancelled = false

    const fetchImage = async () => {
      try {
        const blobUrl = await buildFileUrl(fileInfo, accessToken)
        if (!isCancelled) {
          blobUrlRef.current = blobUrl
          setImageBlobUrl(blobUrl)
          console.log('[KnowledgeArticleView] Image fetched and blob URL created:', blobUrl)
        } else {
          // Clean up blob if fetch completed but component already unmounted/changed
          URL.revokeObjectURL(blobUrl)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[KnowledgeArticleView] Error fetching image:', error)
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
    <div className="gba:overflow-y-auto gba:mb-6" data-testid="knowledge-article-view">
      <div className="gba:flex gba:flex-col gba:mt-6 gba:max-w-[800px] gba:mx-auto gba:px-4">
        {/* Category Badge */}
        {item.categoryNames && item.categoryNames.length > 0 && (
          <div className="gba:mb-4">
            <Badge variant="secondary" className="gba:text-xs">
              {item.categoryNames[0]}
            </Badge>
          </div>
        )}

        {/* Tags */}
        {item.tagNames && item.tagNames.length > 0 && (
          <div className="gba:flex gba:flex-row gba:flex-wrap gba:gap-2 gba:mb-4">
            {item.tagNames.map(tag => (
              <Badge key={`knowledge-tag-${tag}`} variant="outline">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Title with AI Analyzer */}
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:mb-6">
          <h1 className="gba:text-5xl gba:mt-4 gba:leading-tight gba:font-bold gba:flex-1 gba:text-foreground">
            {displayTitle}
          </h1>
          {item.contentGroup === ContentGroup.KNOWLEDGE && accessToken && userId && (
            <div className="gba:mt-4">
              <ContentArticleAnalyzer contentEntry={item} accessToken={accessToken} userId={userId} />
            </div>
          )}
        </div>

        {/* Preview/Summary */}
        {displayPreview && (
          <p className="gba:text-xl gba:text-muted-foreground gba:mb-8 gba:leading-relaxed gba:italic">
            {displayPreview}
          </p>
        )}

        {/* Featured Image */}
        {imageBlobUrl ? (
          <img
            src={imageBlobUrl}
            alt={item.title}
            className="gba:w-full gba:h-auto gba:max-h-[500px] gba:object-cover gba:rounded-lg gba:mb-8"
            data-testid="knowledge-article-image"
          />
        ) : null}

        {/* Article Info Section */}
        <ContentInfoSection
          item={item}
          accessToken={accessToken}
          userId={userId}
          employeeId={employeeId}
          allowedReactions={allowedReactions}
          reactionCatalogMap={reactionCatalogMap}
          onReactionSuccess={onReactionSuccess}
        />

        {/* Content */}
        <ContentHtmlRenderer
          content={displayContent || ''}
          variant="default"
          className="gba:mb-10"
          data-testid="knowledge-article-content"
        />

        {/* Comment Section */}
        {item.allowComment && (
          <CommentSection
            articleId={item.id}
            allowComment={item.allowComment}
            commentCount={item.commentCount || 0}
            accessToken={accessToken}
            employeeId={employeeId}
            currentUserId={userId}
            targetLanguage={targetLanguage || undefined}
            onTranslateComments={onTranslateComments}
            data-testid="knowledge-article-view-comments"
          />
        )}
      </div>
    </div>
  )
}

export default KnowledgeArticleView
