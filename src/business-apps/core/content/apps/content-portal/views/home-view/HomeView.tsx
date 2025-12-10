import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription, Skeleton, Card } from '@newwork/nw-design-system'
import { Home as HomeIcon } from 'lucide-react'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import ContentCard from '../../components/cards/ContentCard'
import SearchInput from '../../components/shared/SearchInput'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import ContentCarousel from '../../components/shared/ContentCarousel'
import ContentCardSkeleton from '../../components/skeletons/ContentCardSkeleton'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useInfiniteScroll } from '@/common/hooks/useInfiniteScroll'
import translations from '../../_i18n'

const PAGE_SIZE = 20

interface HomeViewProps extends BusinessAppContextProps {
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
  targetLanguage?: string | null
  translatedItems?: Record<string, { id: string; title?: string; preview?: string }>
  onTranslate?: (items: any[], targetLanguage: string) => Promise<void>
}

const HomeView: React.FC<HomeViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'intranet',
  allowedReactions,
  reactionCatalogMap,
  targetLanguage,
  translatedItems,
  onTranslate
}) => {
  const { t } = useTranslation(translations)
  const [loadedCount, setLoadedCount] = useState(PAGE_SIZE)
  const [searchQuery, setSearchQuery] = useState('')

  // Featured content (independent of search) - always shows latest
  const featuredQueryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      limit: 12,
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
      search: searchQuery,
      limit: loadedCount,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    [searchQuery, loadedCount]
  )

  // Featured entries (carousel + trending) - not affected by search
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
  const topArticles = useMemo(() => featuredData.slice(0, 5), [featuredData])
  const remainingArticles = useMemo(() => data.slice(5), [data])

  const hasMore = entries.length > 0 && entries.length < totalCount

  // Collect all items for translation (remove duplicates)
  const allItems = useMemo(() => {
    const featuredIds = new Set(featuredData.map(item => item.id))
    const uniqueMainItems = data.filter(item => !featuredIds.has(item.id))
    return [...featuredData, ...uniqueMainItems]
  }, [featuredData, data])

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

  const formattedDate = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }, [])

  const greeting = useMemo(() => {
    const localTimeHours = new Date().getHours()
    if (localTimeHours >= 5 && localTimeHours < 12) return t('greeting-morning')
    if (localTimeHours >= 12 && localTimeHours < 18) return t('greeting-afternoon')
    if (localTimeHours >= 18 && localTimeHours < 22) return t('greeting-evening')
    return t('greeting-generic')
  }, [t])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setLoadedCount(PAGE_SIZE)
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="intranet-view-error">
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
      data-testid="intranet-view"
    >
      {!hideBanner && (
        <div className="gba:w-full">
          <Banner
            variant={BannerVariant.INTRANET}
            title={t('intranet-welcome-title')}
            subtitle={t('intranet-welcome-subtitle')}
          >
            <div className="gba:flex gba:flex-col gba:items-end">
              <span className="gba:text-lg gba:md:text-xl gba:text-white gba:font-medium gba:text-right gba:font-bold">
                {greeting}
              </span>
              <span className="gba:text-sm gba:text-white gba:opacity-80 gba:text-right">{formattedDate}</span>
            </div>
          </Banner>
        </div>
      )}

      <div className="gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4">
        {/* Header with Search */}
        {isLoading ? (
          <div className="gba:mb-6 gba:py-6 gba:flex gba:justify-between gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-3">
              <Skeleton className="gba:h-8 gba:w-8 gba:rounded-md" />
              <Skeleton className="gba:h-9 gba:w-64" />
            </div>
            <Skeleton className="gba:h-10 gba:w-[300px]" />
          </div>
        ) : (
          <div className="gba:mb-6 gba:py-6 gba:flex gba:justify-between gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-3">
              <HomeIcon className="gba:w-8 gba:h-8 gba:text-primary" />
              <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">{t('latest_announcements')}</h1>
            </div>
            <SearchInput onSearch={handleSearch} placeholder={t('search_intranet')} className="gba:w-[300px]" />
          </div>
        )}

        {/* Featured Section - Always visible, not affected by search */}
        {(() => {
          if (isLoading) {
            return (
              <div className="gba:mb-8">
                <Card className="gba:p-6 gba:h-80">
                  <div className="gba:space-y-4">
                    <Skeleton className="gba:h-8 gba:w-3/4" />
                    <Skeleton className="gba:h-4 gba:w-full" />
                    <Skeleton className="gba:h-4 gba:w-full" />
                    <Skeleton className="gba:h-4 gba:w-2/3" />
                  </div>
                </Card>
              </div>
            )
          }
          if (featuredEntries.length > 0) {
            return (
              <div className="gba:mb-8">
                <ContentCarousel
                  articles={topArticles}
                  currentTab={currentTab}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  allowedReactions={allowedReactions}
                  reactionCatalogMap={reactionCatalogMap}
                  onReactionsRefetch={refetchFeatured}
                  translatedItems={translatedItems}
                />
              </div>
            )
          }
          return null
        })()}

        <div className="gba:mb-6 gba:mt-8">
          <h2 className="gba:text-2xl gba:md:text-3xl gba:text-foreground gba:font-semibold">{t('recent_content')}</h2>
        </div>

        {isLoading ? (
          <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:mb-8">
            <ContentCardSkeleton count={6} />
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:mb-8">
            {remainingArticles.length > 0 ? (
              remainingArticles.map((item, index) => {
                const translated = translatedItems?.[item.id || '']
                return (
                  <ContentCard
                    key={item.id || `article-${index}`}
                    item={item}
                    variant="intranet"
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
            ) : (
              <div className="gba:col-span-2 gba:text-center gba:text-muted-foreground gba:py-8">
                {t('no_more_articles')}
              </div>
            )}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {hasMore && <div ref={sentinelRef} className="gba:h-4" />}

        {!isLoading && data.length === 0 && (
          <div className="gba:text-center gba:py-12">
            <p className="gba:text-muted-foreground">{t('no_intranet_found')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(HomeView, (prevProps, nextProps) => {
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
