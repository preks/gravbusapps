import React from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@newwork/nw-design-system'
import { Content } from '@/business-apps/core/content/apps/content-hub/types/content.types'
import { CommentSection } from '@/business-apps/core/content/components/interactions'
import ContentInfoSection from './ContentInfoSection'

interface ContentPageProps {
  item: Content
  accessToken: string
  userId: string | undefined
}

const ContentPage: React.FC<ContentPageProps> = ({ item, accessToken, userId }) => {
  const { t } = useTranslation('content')

  return (
    <div className="gba:overflow-y-auto gba:mb-6" data-testid="content-page">
      <div className="gba:flex gba:flex-col gba:mt-6 gba:max-w-[1000px] gba:mx-auto gba:px-4">
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="gba:flex gba:flex-row gba:flex-wrap gba:gap-2 gba:mb-4">
            {item.tags.map(tag => (
              <Badge key={tag.tag_id} variant="secondary">
                #{tag.tag || tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="gba:text-5xl gba:mt-4 gba:leading-tight gba:font-bold gba:mb-9 gba:text-foreground">
          {item.title}
        </h1>

        {/* Featured Image */}
        {item.contentImage ? (
          <img
            src={item.contentImage}
            alt={t('content_image')}
            className="gba:w-full gba:h-auto gba:max-h-[562px] gba:object-cover gba:rounded-lg"
          />
        ) : (
          <div className="gba:bg-muted gba:w-full gba:h-[562px] gba:rounded-lg gba:flex gba:items-center gba:justify-center">
            <span className="gba:text-muted-foreground gba:text-2xl">{t('no_image')}</span>
          </div>
        )}

        {/* Preview Text */}
        {item.previewText && (
          <p className="gba:text-lg gba:leading-8 gba:font-bold gba:mt-10 gba:px-4 gba:text-foreground">
            {item.previewText}
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
        <ContentInfoSection item={item} accessToken={accessToken} userId={userId} />

        {/* Comment Section */}
        {item.allowComment && (
          <CommentSection
            articleId={item.articleId}
            allowComment={item.allowComment}
            accessToken={accessToken}
            currentUserId={userId}
            data-testid="content-page-comments"
          />
        )}
      </div>
    </div>
  )
}

export default ContentPage
