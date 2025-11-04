import React, { useState, useMemo } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription, Skeleton, Card } from '@newwork/nw-design-system'
import { useContentEntries, useUserContentReactions, toIntranetContent } from '@/common/data/content'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import ContentCard from '../../components/cards/ContentCard'
import SearchInput from '../../components/shared/SearchInput'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import ContentCarousel from '../../components/shared/ContentCarousel'
import TrendingNow from '../../components/cards/TrendingNow'
import ContentCardSkeleton from '../../components/skeletons/ContentCardSkeleton'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useInfiniteScroll } from '@/common/hooks/useInfiniteScroll'
import translations from '../../_i18n'

const PAGE_SIZE = 20

interface HomeViewProps extends BusinessAppContextProps {
  onNavigate?: (tab: string) => void
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const HomeView: React.FC<HomeViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'intranet',
  allowedReactions,
  reactionCatalogMap
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

  // Batch fetch reactions for main content
  const articleIds = useMemo(() => entries.map(entry => entry.id), [entries])
  const { reactionsByArticle, refetch: refetchReactions } = useUserContentReactions({
    contentEntryIds: articleIds,
    currentUserId: userInfo?.id,
    accessToken
  })

  // Listen for process completion to refresh data
  useProcessCompletion({
    onSuccess: () => {
      refetchFeatured()
      refetch()
      refetchReactions()
    }
  })

  // Convert to legacy format
  const data = useMemo(() => entries.map(toIntranetContent), [entries])
  const featuredData = useMemo(() => featuredEntries.map(toIntranetContent), [featuredEntries])
  const topArticles = useMemo(() => featuredData.slice(0, 5), [featuredData])
  const remainingArticles = useMemo(() => data.slice(5), [data])

  const hasMore = entries.length > 0 && entries.length < totalCount

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
        {/* Featured Section - Always visible, not affected by search */}
        {isLoading ? (
          <>
            <div className="gba:mb-6 gba:mt-6">
              <Skeleton className="gba:h-10 gba:w-64" />
            </div>
            <div className="gba:grid gba:grid-cols-[1fr_280px] gba:gap-6 gba:mb-8 gba:items-start">
              <Card className="gba:p-6 gba:h-80">
                <div className="gba:space-y-4">
                  <Skeleton className="gba:h-8 gba:w-3/4" />
                  <Skeleton className="gba:h-4 gba:w-full" />
                  <Skeleton className="gba:h-4 gba:w-full" />
                  <Skeleton className="gba:h-4 gba:w-2/3" />
                </div>
              </Card>
              <Card className="gba:p-4 gba:h-80">
                <Skeleton className="gba:h-6 gba:w-32 gba:mb-4" />
                <div className="gba:space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="gba:flex gba:gap-3">
                      <Skeleton className="gba:w-16 gba:h-16 gba:rounded-md" />
                      <div className="gba:flex-1 gba:space-y-2">
                        <Skeleton className="gba:h-4 gba:w-full" />
                        <Skeleton className="gba:h-3 gba:w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        ) : featuredEntries.length > 0 ? (
          <>
            <div className="gba:mb-6 gba:mt-6">
              <h2 className="gba:text-2xl gba:md:text-3xl gba:text-foreground gba:font-semibold">
                {t('latest_announcements')}
              </h2>
            </div>

            {/* Carousel and Trending Now Section */}
            <div className="gba:grid gba:grid-cols-[1fr_280px] gba:gap-6 gba:mb-8 gba:items-start">
              <div>
                <ContentCarousel articles={topArticles} currentTab={currentTab} />
              </div>
              <div>
                <TrendingNow
                  entries={featuredEntries}
                  className="gba:bg-card gba:border gba:border-border"
                  currentTab={currentTab}
                />
              </div>
            </div>
          </>
        ) : null}

        <div className="gba:w-full gba:flex gba:justify-center gba:mb-8 gba:mt-6">
          <div className="gba:w-full gba:max-w-[80%]">
            <SearchInput onSearch={handleSearch} placeholder={t('search_intranet')} />
          </div>
        </div>

        <div className="gba:mb-6">
          <h2 className="gba:text-2xl gba:md:text-3xl gba:text-foreground gba:font-semibold">{t('recent_content')}</h2>
        </div>

        {isLoading ? (
          <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:mb-8">
            <ContentCardSkeleton count={6} />
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:mb-8">
            {remainingArticles.length > 0 ? (
              remainingArticles.map(item => (
                <ContentCard
                  key={item.articleId}
                  item={item}
                  variant="intranet"
                  currentTab={currentTab}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  allowedReactions={allowedReactions}
                  reactionCatalogMap={reactionCatalogMap}
                  reactionSummary={reactionsByArticle[item.articleId] || {}}
                  onReactionsRefetch={refetchReactions}
                />
              ))
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

export default HomeView
