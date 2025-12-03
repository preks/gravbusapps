import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { MessageSquare, TrendingUp } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useTrendingContent } from '../../hooks/useTrendingContent'
import translations from '../../_i18n'

interface TrendingNowProps {
  entries: ContentEntry[]
  className?: string
  currentTab?: string
}

const TrendingNow: React.FC<TrendingNowProps> = ({ entries, className = '', currentTab }) => {
  const { t } = useTranslation(translations)

  // Use smart trending algorithm
  const trendingEntries = useTrendingContent({ entries, limit: 3 })

  const handleArticleClick = (entry: ContentEntry) => {
    const url = buildPlatformUrl('/platform/content/intranet/content-record', {
      contentId: entry.id,
      ...(currentTab && { tab: currentTab })
    })
    navigateTo(url)
  }

  if (trendingEntries.length === 0) return null

  return (
    <div
      className={`gba:w-full gba:shadow-lg gba:rounded-lg gba:p-4 gba:space-y-4 ${className}`}
      data-testid="trending-now"
    >
      <div className="gba:mb-4 gba:flex gba:items-center gba:gap-2">
        <TrendingUp className="gba:w-5 gba:h-5 gba:text-primary" />
        <h3 className="gba:text-xl gba:text-foreground gba:font-bold">{t('trending_now')}</h3>
      </div>
      {trendingEntries.map(entry => (
        <button
          key={entry.id}
          type="button"
          className="gba:flex gba:gap-3 gba:cursor-pointer gba:hover:bg-accent gba:p-2 gba:rounded-md gba:transition-colors gba:w-full gba:text-left gba:bg-transparent gba:border-0"
          onClick={() => handleArticleClick(entry)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleArticleClick(entry)
            }
          }}
          data-testid={`trending-article-${entry.id}`}
        >
          <div className="gba:w-16 gba:h-16 gba:rounded-md gba:overflow-hidden gba:shrink-0">
            {entry.picture ? (
              <img src={entry.picture} alt={entry.title || ''} className="gba:w-full gba:h-full gba:object-cover" />
            ) : (
              <div className="gba:w-full gba:h-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-xs gba:text-muted-foreground">
                {t('no_image')}
              </div>
            )}
          </div>

          <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0">
            <h4 className="gba:text-sm gba:font-medium gba:mb-1 gba:line-clamp-2 gba:text-foreground">{entry.title}</h4>

            <div className="gba:mt-auto gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
              {entry.contentEntryReactionCounts && entry.contentEntryReactionCounts.length > 0 && (
                <span className="gba:flex gba:items-center gba:gap-1">
                  <span className="gba:text-primary">❤️</span>
                  {entry.contentEntryReactionCounts.reduce((sum, item) => sum + (item.count || 0), 0)}
                </span>
              )}

              <div className="gba:flex gba:items-center">
                <MessageSquare className="gba:fill-current gba:text-foreground gba:w-3 gba:h-3" />
                <span className="gba:ml-1">{entry.commentCount || 0}</span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

export default TrendingNow
