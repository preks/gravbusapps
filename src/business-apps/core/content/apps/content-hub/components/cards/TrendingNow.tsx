import React from 'react'
import { useTranslation } from 'react-i18next'
import { Content } from '../../types/content.types'
import { Heart, MessageSquare } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface TrendingNowProps {
  articles: Content[]
  className?: string
  currentTab?: string
}

const calculateTrendingScore = (article: Content): number => {
  const likes = article.likesCount || 0
  const comments = article.commentsCount || 0
  const shares = article.shareCount || 0
  return likes * 1 + comments * 2 + shares * 3
}

const TrendingNow: React.FC<TrendingNowProps> = ({ articles, className = '', currentTab }) => {
  const { t } = useTranslation('content')

  const trendingArticles = [...articles]
    .sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a))
    .slice(0, 3)

  const handleArticleClick = (article: Content) => {
    const url = buildPlatformUrl('/platform/core/content-record', {
      contentId: article.articleId,
      ...(currentTab && { tab: currentTab })
    })
    navigateTo(url)
  }

  if (trendingArticles.length === 0) return null

  return (
    <div
      className={`gba:w-full gba:mb-8 gba:hover:shadow-lg gba:hover:-translate-y-1 gba:transition-all gba:duration-300 ${className}`}
      data-testid="trending-now"
    >
      <div className="gba:shadow-lg gba:rounded-lg gba:p-4 gba:space-y-4">
        <div className="gba:mb-4">
          <h3 className="gba:text-2xl gba:text-foreground gba:font-bold">{t('trending_now')}</h3>
        </div>
        {trendingArticles.map(article => (
          <div
            key={article.articleId}
            className="gba:flex gba:gap-3 gba:cursor-pointer gba:hover:bg-accent gba:p-2 gba:rounded-md gba:transition-colors"
            onClick={() => handleArticleClick(article)}
            data-testid={`trending-article-${article.articleId}`}
          >
            <div className="gba:w-16 gba:h-16 gba:rounded-md gba:overflow-hidden gba:shrink-0">
              {article.contentImage ? (
                <img
                  src={article.contentImage}
                  alt={article.title || ''}
                  className="gba:w-full gba:h-full gba:object-cover"
                />
              ) : (
                <div className="gba:w-full gba:h-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-xs gba:text-muted-foreground">
                  {t('no_image')}
                </div>
              )}
            </div>

            <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0">
              <h4 className="gba:text-sm gba:font-medium gba:mb-1 gba:line-clamp-2 gba:text-foreground">
                {article.title}
              </h4>

              <div className="gba:mt-auto gba:flex gba:items-center gba:gap-2">
                <div className="gba:flex gba:items-center gba:text-xs gba:text-muted-foreground">
                  <Heart className="gba:fill-current gba:text-foreground gba:w-3 gba:h-3" />
                  <span className="gba:ml-1">{article.likesCount || 0}</span>
                </div>

                <div className="gba:flex gba:items-center gba:text-xs gba:text-muted-foreground">
                  <MessageSquare className="gba:fill-current gba:text-foreground gba:w-3 gba:h-3" />
                  <span className="gba:ml-1">{article.commentsCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TrendingNow
