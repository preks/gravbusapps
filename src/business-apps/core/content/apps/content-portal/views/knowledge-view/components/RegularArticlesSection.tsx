import React from 'react'
import { Skeleton } from '@newwork/nw-design-system'
import ContentCard from '../../../components/cards/ContentCard'
import ContentCardSkeleton from '../../../components/skeletons/ContentCardSkeleton'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface RegularArticlesSectionProps extends BusinessAppContextProps {
  articles: ContentEntry[]
  isLoading: boolean
  isInitialLoad: boolean
  searchQuery: string
  currentTab: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
  translatedItems?: Record<string, { id: string; title?: string; preview?: string }>
  onReactionsRefetch: () => void
  t: (key: string) => string
}

const RegularArticlesSection: React.FC<RegularArticlesSectionProps> = ({
  articles,
  isLoading,
  isInitialLoad,
  searchQuery,
  currentTab,
  accessToken,
  userInfo,
  allowedReactions,
  reactionCatalogMap,
  translatedItems,
  onReactionsRefetch,
  t
}) => {
  if (isLoading) {
    return (
      <div className="gba:mb-4">
        <Skeleton className="gba:h-6 gba:w-48 gba:mb-4" />
        <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:mb-8">
          <ContentCardSkeleton count={9} />
        </div>
      </div>
    )
  }

  if (articles.length === 0) {
    return null
  }

  const sectionTitle = isInitialLoad && !searchQuery ? t('more_articles') : t('all_articles')

  return (
    <div className="gba:mb-4">
      <h2 className="gba:text-xl gba:font-semibold gba:mb-4 gba:text-foreground">{sectionTitle}</h2>
      <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:mb-8">
        {articles.map(entry => {
          const translated = translatedItems?.[entry.id || '']
          return (
            <ContentCard
              key={entry.id}
              item={entry}
              variant="knowledge"
              currentTab={currentTab}
              accessToken={accessToken}
              userInfo={userInfo}
              allowedReactions={allowedReactions}
              reactionCatalogMap={reactionCatalogMap}
              onReactionsRefetch={onReactionsRefetch}
              authorLabel="Creator"
              translatedTitle={translated?.title}
              translatedPreview={translated?.preview}
            />
          )
        })}
      </div>
    </div>
  )
}

export default RegularArticlesSection
