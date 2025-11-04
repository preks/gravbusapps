import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { CommentSection } from '@/business-apps/core/content/records/content-record/components/interactions'
import ContentInfoSection from './ContentInfoSection'
import translations from '../_i18n'

interface ArticleViewProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
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
  reactionCatalogMap
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:overflow-y-auto gba:mb-6" data-testid="article-view">
      <div className="gba:flex gba:flex-col gba:mt-6 gba:max-w-[1000px] gba:mx-auto gba:px-4">
        {/* Tags */}
        {item.tagNames && item.tagNames.length > 0 && (
          <div className="gba:flex gba:flex-row gba:flex-wrap gba:gap-2 gba:mb-4">
            {item.tagNames.map((tag, index) => (
              <Badge key={index} variant="secondary">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="gba:text-5xl gba:mt-4 gba:leading-tight gba:font-bold gba:mb-9 gba:text-foreground">
          {item.title}
        </h1>

        {/* Featured Image */}
        {item.picture ? (
          <img
            src={item.picture}
            alt={t('content_image')}
            className="gba:w-full gba:h-auto gba:max-h-[562px] gba:object-cover gba:rounded-lg"
          />
        ) : (
          <div className="gba:bg-muted gba:w-full gba:h-[562px] gba:rounded-lg gba:flex gba:items-center gba:justify-center">
            <span className="gba:text-muted-foreground gba:text-2xl">{t('no_image')}</span>
          </div>
        )}

        {/* Preview Text */}
        {item.preview && (
          <p className="gba:text-lg gba:leading-8 gba:font-bold gba:mt-10 gba:px-4 gba:text-foreground">
            {item.preview}
          </p>
        )}

        {/* Content */}
        {item.content && (
          <div
            className="gba:text-lg gba:leading-8 gba:mt-10 gba:px-4 gba:text-foreground 
                       [&>h1]:gba:text-4xl [&>h1]:gba:font-bold 
                       [&>h2]:gba:text-3xl [&>h2]:gba:font-bold 
                       [&>h3]:gba:text-2xl [&>h3]:gba:font-bold"
            dangerouslySetInnerHTML={{ __html: item.content }}
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
        {item.allowComment && (
          <CommentSection
            articleId={item.id}
            allowComment={item.allowComment}
            commentCount={item.commentCount || 0}
            accessToken={accessToken}
            employeeId={employeeId}
            currentUserId={userId}
            data-testid="article-view-comments"
          />
        )}
      </div>
    </div>
  )
}

export default ArticleView
