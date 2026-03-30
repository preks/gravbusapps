import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { Eye } from 'lucide-react'
import { extractTextFromHTML } from '../../../../../utils/translationUtils'
import { ContentArticleAnalyzer } from '@/business-apps/core/content/components/ContentArticleAnalyzer'
import { ContentGroup } from '@/common/data/content/types/contentEnums'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContentImage } from '../../../components/shared/ContentImage'

interface FeaturedArticlesSectionProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  articles: ContentEntry[]
  onArticleClick: (entryId: string) => void
  truncateText: (text: string, maxLength: number) => string
  t: (key: string) => string
}

const FeaturedArticlesSection: React.FC<FeaturedArticlesSectionProps> = ({
  articles,
  onArticleClick,
  truncateText,
  t,
  accessToken,
  userInfo
}) => {
  if (articles.length === 0) {
    return null
  }

  return (
    <div className="gba:mb-8">
      <h2 className="gba:text-xl gba:font-semibold gba:mb-4 gba:text-foreground">{t('recent_articles')}</h2>
      <div className="gba:space-y-4">
        {articles.map(entry => (
          <Card
            key={entry.id}
            className="gba:p-6 gba:cursor-pointer gba:hover:shadow-lg gba:transition-shadow gba:relative"
            onClick={() => onArticleClick(entry.id || '')}
            data-testid={`featured-article-${entry.id}`}
          >
            {/* AI Analyzer Button - Only for KNOWLEDGE */}
            {entry.contentGroup === ContentGroup.KNOWLEDGE && accessToken && userInfo?.id && (
              <div
                className="gba:absolute gba:top-2 gba:right-2 gba:z-10"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => e.stopPropagation()}
              >
                <ContentArticleAnalyzer contentEntry={entry} accessToken={accessToken} userId={userInfo.id} />
              </div>
            )}
            <div className="gba:flex gba:gap-6">
              {entry.picture && (
                <div className="gba:w-48 gba:h-32 gba:rounded-lg gba:overflow-hidden gba:shrink-0">
                  <ContentImage
                    picture={entry.picture}
                    accessToken={accessToken!}
                    alt={entry.title || ''}
                    className="gba:w-full gba:h-full"
                  />
                </div>
              )}
              <div className="gba:flex-1">
                <h3 className="gba:text-2xl gba:font-bold gba:mb-2 gba:text-foreground gba:hover:text-primary gba:transition-colors">
                  {entry.title}
                </h3>
                {entry.previewText && (
                  <p className="gba:text-sm gba:text-muted-foreground gba:mb-3 gba:italic">
                    {truncateText(entry.previewText, 150)}
                  </p>
                )}
                {entry.description && (
                  <div
                    className="gba:text-foreground gba:leading-relaxed gba:mb-4"
                    dangerouslySetInnerHTML={{
                      __html: truncateText(extractTextFromHTML(entry.description), 300)
                    }}
                  />
                )}
                <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <Eye className="gba:w-4 gba:h-4" />
                    <span>{entry.viewCount || 0} views</span>
                  </div>
                  {entry.contentEntryReactionCounts && entry.contentEntryReactionCounts.length > 0 && (
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <span>❤️</span>
                      {entry.contentEntryReactionCounts.reduce((sum, item) => sum + (item.count || 0), 0)}
                    </span>
                  )}
                  {entry.createdAt && (
                    <span>
                      {new Date(entry.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default FeaturedArticlesSection
