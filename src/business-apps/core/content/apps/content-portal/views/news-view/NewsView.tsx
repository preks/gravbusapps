import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription, Skeleton } from '@newwork/nw-design-system'
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
import { useContentFilterGroups } from '@/common/data/content/hooks/useContentFilterGroups'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useInfiniteScroll } from '@/common/hooks/useInfiniteScroll'
import translations from '../../_i18n'

// Local constants
const ALL_TAG = 'All'
const PAGE_SIZE = 10

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
  const [offset, setOffset] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContentTypeRef, setSelectedContentTypeRef] = useState<string | null>(null)

  // Fetch filter options (ContentTypes) from distinct ContentEntry queries (scoped to NEWS)
  const { getFilterOptions } = useContentFilterGroups({ accessToken, userInfo }, ContentGroup.NEWS)

  // Get ContentType filter options
  const contentTypeOptions = getFilterOptions('contentTypeRef')

  // Build categories from filter options
  const categories = useMemo(() => {
    const allTag = { label: ALL_TAG, checked: selectedContentTypeRef === null }
    const typeTags = contentTypeOptions.map(option => ({
      label: option.label || 'Unnamed',
      checked: selectedContentTypeRef === option.id
    }))
    return [allTag, ...typeTags]
  }, [contentTypeOptions, selectedContentTypeRef])

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
  const queryParams = useMemo(() => {
    return {
      role: ContentRole.ROOT,
      contentGroupRef: ContentGroup.NEWS,
      contentTypeRef: selectedContentTypeRef || undefined,
      search: searchQuery,
      limit: PAGE_SIZE,
      offset: offset,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }
  }, [searchQuery, offset, selectedContentTypeRef])

  // Featured entries - not affected by search
  const { entries: featuredEntries, refetch: refetchFeatured } = useContentEntries(featuredQueryParams, accessToken)

  // Main content entries - affected by search
  const { entries: fetchedEntries, totalCount, isLoading, error, refetch } = useContentEntries(queryParams, accessToken)

  // Accumulate entries for infinite scroll
  // Track the query key to detect when search/category changes (which should reset)
  const queryKey = useMemo(() => `${searchQuery}-${selectedContentTypeRef}`, [searchQuery, selectedContentTypeRef])
  const lastQueryKeyRef = useRef(queryKey)
  const [allLoadedEntries, setAllLoadedEntries] = useState<typeof fetchedEntries>([])

  // Reset when search/category changes
  useEffect(() => {
    if (queryKey !== lastQueryKeyRef.current) {
      lastQueryKeyRef.current = queryKey
      setOffset(0)
      setAllLoadedEntries([])
    }
  }, [queryKey])

  // Accumulate entries based on offset
  useEffect(() => {
    if (offset === 0) {
      // First page - replace all entries
      setAllLoadedEntries(fetchedEntries)
    } else {
      // Subsequent pages - append new entries (avoid duplicates)
      setAllLoadedEntries(prev => {
        const existingIds = new Set(prev.map(e => e.id))
        const newEntries = fetchedEntries.filter(e => e.id && !existingIds.has(e.id))
        return [...prev, ...newEntries]
      })
    }
  }, [fetchedEntries, offset])

  // Listen for process completion to refresh data
  useProcessCompletion({
    onSuccess: () => {
      refetchFeatured()
      refetch()
      // Don't reset offset - let user continue scrolling from where they were
    }
  })

  // Use accumulated entries
  const data = allLoadedEntries
  const featuredData = featuredEntries
  const featuredArticles = useMemo(() => featuredData.slice(0, 2), [featuredData])
  const otherArticles = useMemo(() => data, [data])

  // Keep loading state until we have data on initial load
  const isInitialLoad = offset === 0 && allLoadedEntries.length === 0
  const showLoading = isLoading || isInitialLoad

  const hasMore = allLoadedEntries.length > 0 && allLoadedEntries.length < totalCount

  // Collect all items for translation (remove duplicates)
  const allItems = useMemo(() => {
    const featuredIds = new Set(featuredArticles.map(item => item.id))
    const uniqueOtherItems = otherArticles.filter(item => !featuredIds.has(item.id))
    return [...featuredArticles, ...uniqueOtherItems]
  }, [featuredArticles, otherArticles])

  // Memoize item IDs to prevent unnecessary re-renders (sorted for consistency)
  const allItemsIds = useMemo(() => {
    const ids = allItems.map(item => item.id).filter(Boolean) as string[]
    const sortedIds = [...ids].sort((a: string, b: string) => {
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
    onLoadMore: () => {
      setOffset(prev => prev + PAGE_SIZE)
    },
    hasMore,
    isLoading: showLoading
  })

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // Offset will be reset by the queryKey effect
  }

  const handleCategoryClick = (label: string) => {
    if (label === ALL_TAG) {
      setSelectedContentTypeRef(null)
    } else {
      const selectedType = contentTypeOptions.find(option => option.label === label)
      setSelectedContentTypeRef(selectedType?.id || null)
    }
    // Offset will be reset by the queryKey effect
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
          <div className="gba:mb-6 gba:pt-6 gba:flex gba:justify-between gba:items-center gba:gap-4">
            <Skeleton className="gba:h-5 gba:w-48" />
            <div className="gba:flex gba:gap-2 gba:items-center">
              <Skeleton className="gba:h-10 gba:w-[300px]" />
              <Skeleton className="gba:h-10 gba:w-32" />
            </div>
          </div>
        ) : (
          <div className="gba:mb-6 gba:pt-6 gba:flex gba:justify-between gba:items-center gba:gap-4">
            <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
              {t('featured_news')}
            </h3>
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
          {showLoading ? (
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

        {/* Show loading more text when loading additional items */}
        {isLoading && offset > 0 && (
          <div className="gba:text-center gba:py-4">
            <p className="gba:text-sm gba:text-muted-foreground">{t('loading_more') || 'Loading more...'}</p>
          </div>
        )}

        {!showLoading && offset === 0 && data.length === 0 && fetchedEntries.length === 0 && (
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
