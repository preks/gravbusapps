import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { Sparkles, Loader2, X } from 'lucide-react'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { CommentSection } from '@/business-apps/core/content/records/content-record/components/interactions'
import ContentInfoSection from './ContentInfoSection'
import { buildFileUrl } from '@/common/utils/fileUtils'
import type { TranslatedTexts } from '@/common/components/content'
import { DocumentAnnotationOverlay } from '@/business-apps/ai/apps/document-reviewer'
import type { DocumentAnnotation } from '@/business-apps/ai/apps/document-reviewer/types'

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

  // Document Review state - managed locally, receives annotations from chat
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [isReviewLoading, setIsReviewLoading] = useState(false)

  // Broadcast document content for chat to use
  useEffect(() => {
    if (!displayContent || !item.id) return

    // Broadcast that this document is currently being viewed
    const documentContext = {
      documentId: item.id,
      documentTitle: displayTitle || item.title,
      documentContent: displayContent,
      contentType: 'knowledge_article'
    }

    // Store in window for chat to access
    ;(window as any).__currentDocumentContext = documentContext

    // Also dispatch event for any listeners
    window.dispatchEvent(
      new CustomEvent('document-context-changed', {
        detail: documentContext
      })
    )

    console.log('[KnowledgeArticleView] Document context broadcast:', item.id)

    return () => {
      // Clean up on unmount
      if ((window as any).__currentDocumentContext?.documentId === item.id) {
        ;(window as any).__currentDocumentContext = null
      }
    }
  }, [item.id, displayTitle, displayContent, item.title])

  // Listen for annotations from chat
  useEffect(() => {
    const handleAnnotations = (event: CustomEvent) => {
      const { documentId, annotations: newAnnotations, isLoading } = event.detail

      console.log('[KnowledgeArticleView] Received annotations event:', {
        documentId,
        count: newAnnotations?.length,
        isLoading
      })

      // Only accept annotations for this document
      if (documentId !== item.id) {
        console.log('[KnowledgeArticleView] Ignoring annotations for different document')
        return
      }

      if (isLoading !== undefined) {
        setIsReviewLoading(isLoading)
      }

      if (newAnnotations && newAnnotations.length > 0) {
        setAnnotations(newAnnotations)
        setIsReviewMode(true)
        console.log('[KnowledgeArticleView] Annotations set:', newAnnotations.length)
      }
    }

    window.addEventListener('document-review-annotations', handleAnnotations as EventListener)
    return () => {
      window.removeEventListener('document-review-annotations', handleAnnotations as EventListener)
    }
  }, [item.id])

  // Close review mode
  const handleCloseReview = useCallback(() => {
    setIsReviewMode(false)
    setAnnotations([])
    setSelectedAnnotationId(null)
  }, [])

  // Select annotation
  const selectAnnotation = useCallback((id: string) => {
    setSelectedAnnotationId(id)
  }, [])

  // Resolve annotation
  const resolveAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.map(a => (a.id === id ? { ...a, resolved: true } : a)))
  }, [])

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

        {/* Title */}
        <h1 className="gba:text-5xl gba:mt-4 gba:leading-tight gba:font-bold gba:mb-6 gba:text-foreground">
          {displayTitle}
        </h1>

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
        />

        {/* AI Review Status Bar - shows when reviewing via chat */}
        {(isReviewMode || isReviewLoading) && (
          <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6 gba:p-3 gba:bg-muted/50 gba:rounded-lg">
            {isReviewLoading ? (
              <>
                <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin gba:text-primary" />
                <span className="gba:text-sm gba:text-muted-foreground">AI is reviewing this document...</span>
              </>
            ) : (
              <>
                <Sparkles className="gba:w-4 gba:h-4 gba:text-primary" />
                <Badge variant="secondary">
                  {annotations.filter(a => !a.resolved).length} issue
                  {annotations.filter(a => !a.resolved).length !== 1 ? 's' : ''} found
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseReview}
                  data-testid="knowledge-article-close-review-button"
                  className="gba:ml-auto gba:gap-1"
                >
                  <X className="gba:w-4 gba:h-4" />
                  Close Review
                </Button>
              </>
            )}
          </div>
        )}

        {/* Content - with or without annotations */}
        {displayContent &&
          (isReviewMode && annotations.length > 0 ? (
            <DocumentAnnotationOverlay
              content={displayContent}
              annotations={annotations}
              selectedAnnotationId={selectedAnnotationId}
              isLoading={isReviewLoading}
              onAnnotationClick={ann => selectAnnotation(ann.id)}
              onResolve={ann => resolveAnnotation(ann.id)}
              className="gba:mb-10"
              data-testid="knowledge-article-annotations"
            />
          ) : (
            <div
              className="gba:prose gba:prose-lg gba:max-w-none gba:mb-10
                         [&>h1]:gba:text-3xl [&>h1]:gba:font-bold [&>h1]:gba:mt-8 [&>h1]:gba:mb-4 [&>h1]:gba:text-foreground
                         [&>h2]:gba:text-2xl [&>h2]:gba:font-semibold [&>h2]:gba:mt-6 [&>h2]:gba:mb-3 [&>h2]:gba:text-foreground
                         [&>h3]:gba:text-xl [&>h3]:gba:font-semibold [&>h3]:gba:mt-5 [&>h3]:gba:mb-2 [&>h3]:gba:text-foreground
                         [&>p]:gba:text-base [&>p]:gba:leading-7 [&>p]:gba:mb-4 [&>p]:gba:text-foreground
                         [&>ul]:gba:list-disc [&>ul]:gba:ml-6 [&>ul]:gba:mb-4 [&>ul]:gba:text-foreground
                         [&>ol]:gba:list-decimal [&>ol]:gba:ml-6 [&>ol]:gba:mb-4 [&>ol]:gba:text-foreground
                         [&>li]:gba:mb-2
                         [&>code]:gba:bg-muted [&>code]:gba:px-2 [&>code]:gba:py-1 [&>code]:gba:rounded [&>code]:gba:text-sm [&>code]:gba:font-mono
                         [&>pre]:gba:bg-muted [&>pre]:gba:p-4 [&>pre]:gba:rounded-lg [&>pre]:gba:mb-4 [&>pre]:gba:overflow-x-auto
                         [&>blockquote]:gba:border-l-4 [&>blockquote]:gba:border-primary [&>blockquote]:gba:pl-4 [&>blockquote]:gba:italic [&>blockquote]:gba:my-4 [&>blockquote]:gba:text-muted-foreground
                         [&>a]:gba:text-primary [&>a]:gba:underline [&>a]:hover:gba:text-primary/80"
              dangerouslySetInnerHTML={{ __html: displayContent }}
              data-testid="knowledge-article-content"
            />
          ))}

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
