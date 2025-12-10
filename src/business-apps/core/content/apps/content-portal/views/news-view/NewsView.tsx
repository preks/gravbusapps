import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription, Skeleton } from '@newwork/nw-design-system'
import { Newspaper } from 'lucide-react'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentRole, ContentGroup } from '@/common/data/content/types/contentEnums'
import ContentCard from '../../components/cards/ContentCard'
import ContentCardSkeleton from '../../components/skeletons/ContentCardSkeleton'
import SearchInput from '../../components/shared/SearchInput'
import NavigationTagList from '../../components/shared/NavigationTagList'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useContentTypes } from '../../hooks/useContentTypes'
import { useCatalogEntries } from '@/common/data/catalog'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useInfiniteScroll } from '@/common/hooks/useInfiniteScroll'
import translations from '../../_i18n'

// Local constants
const ALL_TAG = 'All'
const PAGE_SIZE = 20

interface NewsViewProps extends BusinessAppContextProps {
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
  targetLanguage?: string | null
  translatedItems?: Record<string, { id: string; title?: string; preview?: string }>
  onTranslate?: (items: any[], targetLanguage: string) => Promise<void>
}

const NewsView: React.FC<NewsViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'news',
  allowedReactions,
  reactionCatalogMap,
  targetLanguage,
  translatedItems,
  onTranslate
}) => {
  const { t } = useTranslation(translations)
  const [loadedCount, setLoadedCount] = useState(PAGE_SIZE)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContentTypeRef, setSelectedContentTypeRef] = useState<string | null>(null)

  // Fetch ContentGroup NEWS entry to get its ID
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })
  const [newsGroupId, setNewsGroupId] = useState<string | null>(null)

  // Load NEWS ContentGroup ID
  React.useEffect(() => {
    const loadNewsGroupId = async () => {
      try {
        const result = await fetchCatalogEntriesByIdentifier('ContentGroup', {
          limit: 1,
          offset: 0
        })
        const newsEntry = result.entries.find(entry => entry.code === 'NEWS')
        if (newsEntry) {
          setNewsGroupId(newsEntry.id)
        }
      } catch (err) {
        console.error('Error loading NEWS group ID:', err)
      }
    }
    if (accessToken) {
      loadNewsGroupId()
    }
  }, [accessToken, fetchCatalogEntriesByIdentifier])

  // Load ContentTypes for NEWS
  const { types: contentTypes } = useContentTypes({ accessToken }, newsGroupId)

  // Build categories from ContentTypes
  const categories = useMemo(() => {
    const allTag = { label: ALL_TAG, checked: selectedContentTypeRef === null }
    const typeTags = contentTypes.map(type => ({
      label: type.value || 'Unnamed',
      checked: selectedContentTypeRef === type.id
    }))
    return [allTag, ...typeTags]
  }, [contentTypes, selectedContentTypeRef])

  // Featured content (independent of search) - always shows latest
  const featuredQueryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: ContentGroup.NEWS,
      limit: 2,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    []
  )

  // Search/browsing content
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: ContentGroup.NEWS,
      contentTypeRef: selectedContentTypeRef || undefined,
      search: searchQuery,
      limit: loadedCount,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    [searchQuery, loadedCount, selectedContentTypeRef]
  )

  // Featured entries - not affected by search
  const { entries: featuredEntries, refetch: refetchFeatured } = useContentEntries(featuredQueryParams, accessToken)

  // Main content entries - affected by search
  const { entries, totalCount, isLoading, error, refetch } = useContentEntries(queryParams, accessToken)

  // Listen for process completion to refresh data
  useProcessCompletion({
    onSuccess: () => {
      refetchFeatured()
      refetch()
    }
  })

  // Use entries directly (no conversion needed)
  const data = entries
  const featuredData = featuredEntries
  const featuredArticles = useMemo(() => featuredData.slice(0, 2), [featuredData])
  const otherArticles = useMemo(() => data, [data])

  const hasMore = entries.length > 0 && entries.length < totalCount

  // Collect all items for translation (remove duplicates)
  const allItems = useMemo(() => {
    const featuredIds = new Set(featuredArticles.map(item => item.id))
    const uniqueOtherItems = otherArticles.filter(item => !featuredIds.has(item.id))
    return [...featuredArticles, ...uniqueOtherItems]
  }, [featuredArticles, otherArticles])

  // Memoize item IDs to prevent unnecessary re-renders (sorted for consistency)
  const allItemsIds = useMemo(() => {
    const ids = allItems.map(item => item.id).filter(Boolean)
    const sortedIds = ids.toSorted((a, b) => {
      if (!a || !b) return 0
      return a.localeCompare(b)
    })
    return sortedIds.join(',')
  }, [allItems])

  // Trigger translation when targetLanguage is set
  useEffect(() => {
    if (!targetLanguage || !onTranslate || allItems.length === 0) {
      return
    }

    onTranslate(allItems, targetLanguage).catch(() => {
      // Error handling is done in the translation hook
    })
  }, [targetLanguage, allItemsIds, onTranslate, allItems])

  // Infinite scroll
  const sentinelRef = useInfiniteScroll({
    onLoadMore: () => setLoadedCount(prev => prev + PAGE_SIZE),
    hasMore,
    isLoading
  })

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setLoadedCount(PAGE_SIZE)
  }

  const handleCategoryClick = (label: string) => {
    if (label === ALL_TAG) {
      setSelectedContentTypeRef(null)
    } else {
      const selectedType = contentTypes.find(type => type.value === label)
      setSelectedContentTypeRef(selectedType?.id || null)
    }
    setLoadedCount(PAGE_SIZE)
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="news-view-error">
        <Alert variant="destructive">
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>
            {error?.message || 'An error occurred'}
            <Button onClick={refetch} variant="outline" className="gba:mt-2 gba:ml-4">
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div
      className="gba:relative gba:min-h-screen gba:flex gba:flex-col gba:items-center gba:w-full"
      data-testid="news-view"
    >
      {!hideBanner && (
        <div className="gba:w-full">
          <Banner variant={BannerVariant.NEWS} title={t('news-welcome-title')} subtitle={t('news-welcome-subtitle')} />
        </div>
      )}

      <div className="gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4">
        {/* Header with Search and Action */}
        {isLoading ? (
          <div className="gba:mb-6 gba:py-6 gba:flex gba:justify-between gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-3">
              <Skeleton className="gba:h-8 gba:w-8 gba:rounded-md" />
              <Skeleton className="gba:h-9 gba:w-64" />
            </div>
            <div className="gba:flex gba:gap-2 gba:items-center">
              <Skeleton className="gba:h-10 gba:w-[300px]" />
              <Skeleton className="gba:h-10 gba:w-32" />
            </div>
          </div>
        ) : (
          <div className="gba:mb-6 gba:py-6 gba:flex gba:justify-between gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-3">
              <Newspaper className="gba:w-8 gba:h-8 gba:text-primary" />
              <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">{t('featured_news')}</h1>
            </div>
            <div className="gba:flex gba:gap-2 gba:items-center">
              <SearchInput onSearch={handleSearch} placeholder={t('search_news')} className="gba:w-[300px]" />
              <AppAction
                contexts={[
                  {
                    context: FlowContextName.contentEntryCreate,
                    contextData: { contentGroup: ContentGroup.NEWS }
                  }
                ]}
                accessToken={accessToken}
                emptyState="enable"
                lazyLoad
                data-testid="news-view-create-button"
              >
                <Button>{t('publish_news')}</Button>
              </AppAction>
            </div>
          </div>
        )}

        {(() => {
          if (isLoading) {
            return (
              <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:mb-10">
                <ContentCardSkeleton variant="featured" count={2} />
              </div>
            )
          }
          if (featuredArticles.length > 0) {
            return (
              <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:mb-10">
                {featuredArticles.map((item, index) => {
                  const translated = translatedItems?.[item.id || '']
                  return (
                    <ContentCard
                      key={item.id || `featured-${index}`}
                      item={item}
                      variant="news"
                      featured={true}
                      currentTab={currentTab}
                      accessToken={accessToken}
                      userInfo={userInfo}
                      allowedReactions={allowedReactions}
                      reactionCatalogMap={reactionCatalogMap}
                      onReactionsRefetch={refetch}
                      authorLabel="Author"
                      translatedTitle={translated?.title}
                      translatedPreview={translated?.preview}
                    />
                  )
                })}
              </div>
            )
          }
          return null
        })()}

        {/* Category Filter */}
        <div className="gba:w-full gba:mb-6">
          <NavigationTagList
            tags={categories}
            onTagClick={handleCategoryClick}
            maxVisibleTags={6}
            alwaysVisibleTag={ALL_TAG}
          />
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:mb-6">
          {isLoading ? (
            <ContentCardSkeleton variant="horizontal" count={5} />
          ) : (
            otherArticles.map((item, index) => {
              const translated = translatedItems?.[item.id || '']
              return (
                <ContentCard
                  key={item.id || `article-${index}`}
                  item={item}
                  variant="news"
                  currentTab={currentTab}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  allowedReactions={allowedReactions}
                  reactionCatalogMap={reactionCatalogMap}
                  onReactionsRefetch={refetch}
                  authorLabel="Author"
                  translatedTitle={translated?.title}
                  translatedPreview={translated?.preview}
                />
              )
            })
          )}
        </div>

        {/* Infinite scroll sentinel */}
        {hasMore && <div ref={sentinelRef} className="gba:h-4" />}

        {!isLoading && data.length === 0 && (
          <div className="gba:text-center gba:py-12">
            <p className="gba:text-muted-foreground">{t('no_news_found')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(NewsView, (prevProps, nextProps) => {
  const changedProps: string[] = []

  if (prevProps.accessToken !== nextProps.accessToken) changedProps.push('accessToken')
  if (prevProps.currentTab !== nextProps.currentTab) changedProps.push('currentTab')
  if (prevProps.targetLanguage !== nextProps.targetLanguage) changedProps.push('targetLanguage')
  if (prevProps.allowedReactions?.join(',') !== nextProps.allowedReactions?.join(','))
    changedProps.push('allowedReactions')
  if (JSON.stringify(prevProps.reactionCatalogMap) !== JSON.stringify(nextProps.reactionCatalogMap))
    changedProps.push('reactionCatalogMap')
  if (JSON.stringify(prevProps.translatedItems) !== JSON.stringify(nextProps.translatedItems))
    changedProps.push('translatedItems')
  if (prevProps.userInfo?.id !== nextProps.userInfo?.id) changedProps.push('userInfo.id')
  if (prevProps.hideBanner !== nextProps.hideBanner) changedProps.push('hideBanner')

  if (changedProps.length > 0) {
    return false // Re-render
  }

  return true // Skip re-render
})
