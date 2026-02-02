import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription, Skeleton, Card } from '@newwork/nw-design-system'
import { Home as HomeIcon, Newspaper, BookOpen, FileText, MessageCircleQuestion } from 'lucide-react'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentRole, ContentGroup } from '@/common/data/content/types/contentEnums'
import { useContentStatistics } from '../../hooks/useContentStatistics'
import ContentCard from '../../components/cards/ContentCard'
import SearchInput from '../../components/shared/SearchInput'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import ContentCarousel from '../../components/shared/ContentCarousel'
import ContentCardSkeleton from '../../components/skeletons/ContentCardSkeleton'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useInfiniteScroll } from '@/common/hooks/useInfiniteScroll'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import translations from '../../_i18n'

const PAGE_SIZE = 10

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
  const [offset, setOffset] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Featured content (independent of search) - filter by NEWS and KNOWLEDGE
  const featuredQueryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRefs: [ContentGroup.NEWS, ContentGroup.KNOWLEDGE],
      limit: 12,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    []
  )

  // Search/browsing content - filter by NEWS and KNOWLEDGE
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRefs: [ContentGroup.NEWS, ContentGroup.KNOWLEDGE],
      search: searchQuery,
      limit: PAGE_SIZE,
      offset: offset,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    [searchQuery, offset]
  )

  // Query for open questions (questions without accepted answers) - still needed for the detailed view
  const openQuestionsQueryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: ContentGroup.QUESTION,
      limit: 1000,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    []
  )

  const openQuestionsQueryOptions = useMemo(
    () => ({
      config: 'list' as const,
      fields: ['id', 'childContentEntries'] as const
    }),
    []
  )

  // Single query for all statistics
  const {
    recentNewsCount,
    recentKnowledgeCount,
    recentDocumentsCount,
    unansweredQuestionsCount: openQuestionsCount,
    refetch: refetchStatistics
  } = useContentStatistics(accessToken)

  // Featured entries (carousel + trending) - not affected by search
  const { entries: featuredEntries, refetch: refetchFeatured } = useContentEntries(featuredQueryParams, accessToken)

  // Main content entries - affected by search
  const { entries: fetchedEntries, totalCount, isLoading, error, refetch } = useContentEntries(queryParams, accessToken)

  // Accumulate entries for infinite scroll
  // Track the query key to detect when search changes (which should reset)
  const queryKey = useMemo(() => searchQuery, [searchQuery])
  const lastQueryKeyRef = useRef(queryKey)
  const [allLoadedEntries, setAllLoadedEntries] = useState<typeof fetchedEntries>([])

  // Reset when search changes
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

  // Use accumulated entries
  const entries = allLoadedEntries

  // Keep loading state until we have data on initial load
  const isInitialDataLoad = offset === 0 && allLoadedEntries.length === 0
  const showLoading = isLoading || isInitialDataLoad

  // Open questions query - still needed for detailed view
  const { refetch: refetchOpenQuestions } = useContentEntries(
    openQuestionsQueryParams,
    accessToken,
    openQuestionsQueryOptions
  )

  // Listen for process completion to refresh data
  useProcessCompletion({
    onSuccess: () => {
      refetchFeatured()
      refetch()
      refetchOpenQuestions()
      refetchStatistics()
      // Don't reset offset - let user continue scrolling from where they were
    }
  })

  // Navigation handlers for statistics cards
  const handleNavigateToNews = () => {
    const url = buildPlatformUrl('/platform/content/intranet', { tab: 'news' })
    navigateTo(url)
  }

  const handleNavigateToKnowledge = () => {
    const url = buildPlatformUrl('/platform/content/intranet', { tab: 'knowledge' })
    navigateTo(url)
  }

  const handleNavigateToDocuments = () => {
    const url = buildPlatformUrl('/platform/content/intranet', { tab: 'documents' })
    navigateTo(url)
  }

  const handleNavigateToQuestions = () => {
    const url = buildPlatformUrl('/platform/content/intranet', { tab: 'questions' })
    navigateTo(url)
  }

  // Use entries directly (no conversion needed)
  const data = entries
  const featuredData = featuredEntries
  const topArticles = useMemo(() => featuredData.slice(0, 5), [featuredData])
  const remainingArticles = useMemo(() => data.slice(5), [data])

  const hasMore = allLoadedEntries.length > 0 && allLoadedEntries.length < totalCount

  // Collect all items for translation (remove duplicates)
  const allItems = useMemo(() => {
    const featuredIds = new Set(featuredData.map(item => item.id))
    const uniqueMainItems = data.filter(item => !featuredIds.has(item.id))
    return [...featuredData, ...uniqueMainItems]
  }, [featuredData, data])

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
    // Offset will be reset by the queryKey effect
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
        {/* Statistics Cards Section */}
        <div
          className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4"
          data-testid="home-statistics-section"
        >
          {/* Recent News Articles */}
          <Card
            className="gba:p-6 gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow"
            onClick={handleNavigateToNews}
            data-testid="statistics-card-news"
          >
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex-1">
                <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  {t('recent_news_articles') || 'Recent News Articles'}
                </p>
                <p className="gba:text-3xl gba:font-bold gba:text-foreground">{recentNewsCount}</p>
              </div>
              <div className="gba:bg-primary/10 gba:p-3 gba:rounded-lg">
                <Newspaper className="gba:w-6 gba:h-6 gba:text-primary" />
              </div>
            </div>
          </Card>

          {/* Recent Knowledge Articles */}
          <Card
            className="gba:p-6 gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow"
            onClick={handleNavigateToKnowledge}
            data-testid="statistics-card-knowledge"
          >
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex-1">
                <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  {t('recent_knowledge_articles') || 'Recent Knowledge Articles'}
                </p>
                <p className="gba:text-3xl gba:font-bold gba:text-foreground">{recentKnowledgeCount}</p>
              </div>
              <div className="gba:bg-success/10 gba:p-3 gba:rounded-lg">
                <BookOpen className="gba:w-6 gba:h-6 gba:text-success" />
              </div>
            </div>
          </Card>

          {/* Recently Uploaded Documents */}
          <Card
            className="gba:p-6 gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow"
            onClick={handleNavigateToDocuments}
            data-testid="statistics-card-documents"
          >
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex-1">
                <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  {t('recently_uploaded_documents') || 'Recently Uploaded Documents'}
                </p>
                <p className="gba:text-3xl gba:font-bold gba:text-foreground">{recentDocumentsCount}</p>
              </div>
              <div className="gba:bg-info/10 gba:p-3 gba:rounded-lg">
                <FileText className="gba:w-6 gba:h-6 gba:text-info" />
              </div>
            </div>
          </Card>

          {/* Unanswered Questions */}
          <Card
            className="gba:p-6 gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow"
            onClick={handleNavigateToQuestions}
            data-testid="statistics-card-questions"
          >
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex-1">
                <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  {t('unanswered_questions') || 'Unanswered Questions'}
                </p>
                <p className="gba:text-3xl gba:font-bold gba:text-foreground">{openQuestionsCount}</p>
              </div>
              <div className="gba:bg-warning/10 gba:p-3 gba:rounded-lg">
                <MessageCircleQuestion className="gba:w-6 gba:h-6 gba:text-warning" />
              </div>
            </div>
          </Card>
        </div>

        {/* Header with Search */}
        {showLoading ? (
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
          if (showLoading) {
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

        {showLoading ? (
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

        {/* Show loading more text when loading additional items */}
        {isLoading && offset > 0 && (
          <div className="gba:text-center gba:py-4">
            <p className="gba:text-sm gba:text-muted-foreground">{t('loading_more') || 'Loading more...'}</p>
          </div>
        )}

        {!showLoading && offset === 0 && data.length === 0 && fetchedEntries.length === 0 && (
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
