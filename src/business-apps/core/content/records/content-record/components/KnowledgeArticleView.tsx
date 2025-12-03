import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { CommentSection } from '@/business-apps/core/content/records/content-record/components/interactions'
import ContentInfoSection from './ContentInfoSection'
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
        {item.picture && (
          <img
            src={item.picture}
            alt={item.title}
            className="gba:w-full gba:h-auto gba:max-h-[500px] gba:object-cover gba:rounded-lg gba:mb-8"
            data-testid="knowledge-article-image"
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

        {/* Content */}
        {displayContent && (
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
        )}

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
