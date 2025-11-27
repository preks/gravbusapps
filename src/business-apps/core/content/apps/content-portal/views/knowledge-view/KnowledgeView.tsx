import React, { useState, useMemo } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription, Card, Skeleton } from '@newwork/nw-design-system'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentRole, ContentGroup } from '@/common/data/content/types/contentEnums'
import ContentCard from '../../components/cards/ContentCard'
import ContentCardSkeleton from '../../components/skeletons/ContentCardSkeleton'
import SearchInput from '../../components/shared/SearchInput'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useKnowledgeCategories } from '../../hooks/useKnowledgeCategories'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useInfiniteScroll } from '@/common/hooks/useInfiniteScroll'
import { BookOpen, ChevronRight, Folder, Eye } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import translations from '../../_i18n'

const PAGE_SIZE = 20

interface KnowledgeViewProps extends BusinessAppContextProps {
  onNavigate?: (tab: string) => void
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'knowledge',
  allowedReactions,
  reactionCatalogMap
}) => {
  const { t } = useTranslation(translations)
  const [loadedCount, setLoadedCount] = useState(PAGE_SIZE)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryRef, setSelectedCategoryRef] = useState<string | null>(null)

  // Helper to check if we're showing the initial load
  const isInitialLoad = loadedCount === PAGE_SIZE

  // Load categories from catalog
  const { categories, isLoading: categoriesLoading } = useKnowledgeCategories({ accessToken })

  // Memoize params to prevent infinite re-renders
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: ContentGroup.KNOWLEDGE,
      categoryRefs: selectedCategoryRef ? [selectedCategoryRef] : undefined,
      search: searchQuery,
      limit: loadedCount,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    [selectedCategoryRef, searchQuery, loadedCount]
  )

  // Use central content data
  const { entries, totalCount, isLoading, error, refetch } = useContentEntries(queryParams, accessToken)

  // Listen for process completion to refresh data
  useProcessCompletion({
    onSuccess: () => {
      refetch()
    }
  })

  // Use entries directly (no conversion needed)
  const data = entries

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

  const handleCategoryClick = (categoryRef: string | null) => {
    setSelectedCategoryRef(categoryRef)
    setLoadedCount(PAGE_SIZE)
  }

  // Get selected category name for breadcrumb
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryRef)

  // Featured articles (first 3 for wiki-style display with content)
  const featuredArticles = useMemo(() => entries.slice(0, 3), [entries])
  const regularArticles = useMemo(() => entries.slice(3), [entries])

  const handleArticleClick = (entryId: string) => {
    const url = buildPlatformUrl('/platform/content/intranet/content-record', {
      contentId: entryId,
      tab: currentTab
    })
    navigateTo(url)
  }

  const truncateText = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="knowledge-view-error">
        <Alert variant="destructive">
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>
            {error?.message || String(error)}
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
      data-testid="knowledge-view"
    >
      {!hideBanner && (
        <div className="gba:w-full">
          <Banner
            variant={BannerVariant.KNOWLEDGE}
            title={t('knowledge-welcome-title')}
            subtitle={t('knowledge-welcome-subtitle')}
          />
        </div>
      )}

      <div className="gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4">
        {/* Wiki-style Header with Search */}
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
              <BookOpen className="gba:w-8 gba:h-8 gba:text-primary" />
              <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">{t('knowledge-welcome-title')}</h1>
            </div>
            <div className="gba:flex gba:gap-2 gba:items-center">
              <SearchInput onSearch={handleSearch} placeholder={t('search_knowledge')} className="gba:w-[300px]" />
              <AppAction
                contextsArray={[FlowContextName.contentEntryCreate]}
                externalContextData={{ contentGroup: ContentGroup.KNOWLEDGE }}
                accessToken={accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
                data-testid="knowledge-view-create-button"
              >
                <Button>{t('create_article')}</Button>
              </AppAction>
            </div>
          </div>
        )}

        {/* Wiki Layout: Sidebar + Content */}
        <div className="gba:grid gba:grid-cols-[260px_1fr] gba:gap-6">
          {/* Left Sidebar - Category Navigation */}
          <div className="gba:sticky gba:top-4 gba:h-fit">
            <Card className="gba:p-4">
              <h3 className="gba:text-sm gba:font-semibold gba:mb-4 gba:text-muted-foreground gba:uppercase">
                {t('categories')}
              </h3>

              {categoriesLoading ? (
                <div className="gba:text-sm gba:text-muted-foreground gba:py-2">{t('loading')}</div>
              ) : (
                <nav className="gba:space-y-1">
                  <button
                    onClick={() => handleCategoryClick(null)}
                    className={`gba:w-full gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:rounded-md gba:text-sm gba:transition-colors ${
                      selectedCategoryRef === null
                        ? 'gba:bg-primary gba:text-primary-foreground'
                        : 'gba:hover:bg-accent gba:text-foreground'
                    }`}
                    data-testid="knowledge-category-all"
                  >
                    <span className="gba:flex gba:items-center gba:gap-2">
                      <Folder className="gba:w-4 gba:h-4" />
                      {t('all_articles')}
                    </span>
                    <ChevronRight className="gba:w-4 gba:h-4" />
                  </button>

                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      className={`gba:w-full gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:rounded-md gba:text-sm gba:transition-colors ${
                        selectedCategoryRef === category.id
                          ? 'gba:bg-primary gba:text-primary-foreground'
                          : 'gba:hover:bg-accent gba:text-foreground'
                      }`}
                      data-testid={`knowledge-category-${category.code?.toLowerCase()}`}
                    >
                      <span className="gba:flex gba:items-center gba:gap-2">
                        <Folder className="gba:w-4 gba:h-4" />
                        {category.value}
                      </span>
                      <ChevronRight className="gba:w-4 gba:h-4" />
                    </button>
                  ))}
                </nav>
              )}
            </Card>
          </div>

          {/* Main Content Area */}
          <div>
            {/* Breadcrumb */}
            {selectedCategory && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4 gba:text-sm gba:text-muted-foreground">
                <button
                  onClick={() => handleCategoryClick(null)}
                  className="gba:hover:text-foreground gba:transition-colors"
                >
                  {t('knowledge')}
                </button>
                <ChevronRight className="gba:w-4 gba:h-4" />
                <span className="gba:text-foreground gba:font-medium">{selectedCategory.value}</span>
              </div>
            )}

            {/* Featured Articles Section - Wiki Style with Content Preview */}
            {isLoading ? (
              <div className="gba:mb-8">
                <Skeleton className="gba:h-6 gba:w-48 gba:mb-4" />
                <div className="gba:space-y-4">
                  <ContentCardSkeleton variant="horizontal" count={3} />
                </div>
              </div>
            ) : featuredArticles.length > 0 && isInitialLoad && !searchQuery ? (
              <div className="gba:mb-8">
                <h2 className="gba:text-xl gba:font-semibold gba:mb-4 gba:text-foreground">{t('recent_articles')}</h2>
                <div className="gba:space-y-4">
                  {featuredArticles.map(entry => (
                    <Card
                      key={entry.id}
                      className="gba:p-6 gba:cursor-pointer gba:hover:shadow-lg gba:transition-shadow"
                      onClick={() => handleArticleClick(entry.id)}
                      data-testid={`featured-article-${entry.id}`}
                    >
                      <div className="gba:flex gba:gap-6">
                        {entry.picture && (
                          <div className="gba:w-48 gba:h-32 gba:rounded-lg gba:overflow-hidden gba:shrink-0">
                            <img
                              src={entry.picture}
                              alt={entry.title || ''}
                              className="gba:w-full gba:h-full gba:object-cover"
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
                                __html: truncateText(entry.description.replace(/<[^>]*>/g, ''), 300)
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
            ) : null}

            {/* Regular Articles Grid */}
            {isLoading ? (
              <div className="gba:mb-4">
                <Skeleton className="gba:h-6 gba:w-48 gba:mb-4" />
                <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:mb-8">
                  <ContentCardSkeleton count={9} />
                </div>
              </div>
            ) : regularArticles.length > 0 ? (
              <div className="gba:mb-4">
                <h2 className="gba:text-xl gba:font-semibold gba:mb-4 gba:text-foreground">
                  {isInitialLoad && !searchQuery ? t('more_articles') : t('all_articles')}
                </h2>
                <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:mb-8">
                  {regularArticles.map(entry => {
                    const item = entry
                    return (
                      <ContentCard
                        key={item.id}
                        item={item}
                        variant="knowledge"
                        currentTab={currentTab}
                        accessToken={accessToken}
                        userInfo={userInfo}
                        allowedReactions={allowedReactions}
                        reactionCatalogMap={reactionCatalogMap}
                        onReactionsRefetch={refetch}
                        authorLabel="Creator"
                      />
                    )
                  })}
                </div>
              </div>
            ) : null}

            {/* Show all articles in grid if searching or not on first page */}
            {(searchQuery || !isInitialLoad) && data.length > 0 && (
              <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:mb-8">
                {data.map(item => (
                  <ContentCard
                    key={item.articleId}
                    item={item}
                    variant="knowledge"
                    currentTab={currentTab}
                    accessToken={accessToken}
                    userInfo={userInfo}
                    allowedReactions={allowedReactions}
                    reactionCatalogMap={reactionCatalogMap}
                    onReactionsRefetch={refetch}
                    authorLabel="Creator"
                  />
                ))}
              </div>
            )}

            {!isLoading && data.length === 0 && (
              <div className="gba:col-span-3 gba:text-center gba:py-12">
                <p className="gba:text-muted-foreground">
                  {searchQuery ? t('no_search_results') : t('no_knowledge_found')}
                </p>
              </div>
            )}

            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={sentinelRef} className="gba:h-4" />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default KnowledgeView
