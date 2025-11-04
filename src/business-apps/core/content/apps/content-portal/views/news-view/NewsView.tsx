import React, { useState, useMemo } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription, Skeleton } from '@newwork/nw-design-system'
import { useContentEntries, useUserContentReactions, toIntranetContent } from '@/common/data/content'
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
}

const NewsView: React.FC<NewsViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'news',
  allowedReactions,
  reactionCatalogMap
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
  const featuredArticles = featuredData.slice(0, 2)
  const otherArticles = data

  const hasMore = entries.length > 0 && entries.length < totalCount

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
        {isLoading ? (
          <>
            <div className="gba:w-full gba:mb-6 gba:py-4">
              <Skeleton className="gba:h-8 gba:w-48" />
            </div>
            <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:mb-10">
              <ContentCardSkeleton variant="featured" count={2} />
            </div>
          </>
        ) : featuredArticles.length > 0 ? (
          <>
            <div className="gba:w-full gba:mb-6 gba:py-4">
              <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground">{t('featured_news')}</h2>
            </div>
            <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:mb-10">
              {featuredArticles.map(item => (
                <ContentCard
                  key={item.articleId}
                  item={item}
                  variant="news"
                  featured={true}
                  currentTab={currentTab}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  allowedReactions={allowedReactions}
                  reactionCatalogMap={reactionCatalogMap}
                  reactionSummary={reactionsByArticle[item.articleId] || {}}
                  onReactionsRefetch={refetchReactions}
                />
              ))}
            </div>
          </>
        ) : null}

        <div className="gba:w-full gba:mb-6">
          <div className="gba:grid gba:grid-cols-[1fr_280px] gba:gap-6 gba:mb-4">
            <div>
              <NavigationTagList
                tags={categories}
                onTagClick={handleCategoryClick}
                maxVisibleTags={6}
                alwaysVisibleTag={ALL_TAG}
              />
            </div>
            <div className="gba:flex gba:gap-2">
              <SearchInput onSearch={handleSearch} />
              <AppAction
                contextsArray={[FlowContextName.contentEntryCreate]}
                externalContextData={{ contentGroup: ContentGroup.NEWS }}
                accessToken={accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
                data-testid="news-view-create-button"
              >
                <Button>{t('create_article')}</Button>
              </AppAction>
            </div>
          </div>
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:mb-6">
          {isLoading ? (
            <ContentCardSkeleton variant="horizontal" count={5} />
          ) : (
            otherArticles.map(item => (
              <ContentCard
                key={item.articleId}
                item={item}
                variant="news"
                currentTab={currentTab}
                accessToken={accessToken}
                userInfo={userInfo}
                allowedReactions={allowedReactions}
                reactionCatalogMap={reactionCatalogMap}
                reactionSummary={reactionsByArticle[item.articleId] || {}}
                onReactionsRefetch={refetchReactions}
              />
            ))
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

export default NewsView
