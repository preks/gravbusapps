import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription, Skeleton } from '@newwork/nw-design-system'
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
import { BookOpen, ChevronRight } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import CategorySidebar, { GLOSSARY_VIEW_MODE } from './components/CategorySidebar'
import FeaturedArticlesSection from './components/FeaturedArticlesSection'
import RegularArticlesSection from './components/RegularArticlesSection'
import GlossarySection from './components/GlossarySection'
import translations from '../../_i18n'

const PAGE_SIZE = 20

interface KnowledgeViewProps extends BusinessAppContextProps {
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
  targetLanguage?: string | null
  translatedItems?: Record<string, { id: string; title?: string; preview?: string }>
  onTranslate?: (items: any[], targetLanguage: string) => Promise<void>
}

const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'knowledge',
  allowedReactions,
  reactionCatalogMap,
  targetLanguage,
  translatedItems,
  onTranslate
}) => {
  const { t } = useTranslation(translations)
  const [loadedCount, setLoadedCount] = useState(PAGE_SIZE)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryRef, setSelectedCategoryRef] = useState<string | null>(null)

  // Check URL for glossary view mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const view = urlParams.get('view')
      if (view === 'glossary') {
        setSelectedCategoryRef(GLOSSARY_VIEW_MODE)
      }
    }
  }, [])

  // Update URL when glossary mode changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (selectedCategoryRef === GLOSSARY_VIEW_MODE) {
        url.searchParams.set('view', 'glossary')
      } else {
        url.searchParams.delete('view')
      }
      window.history.replaceState({}, '', url.toString())
    }
  }, [selectedCategoryRef])

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

  // Collect all items for translation
  const allItems = useMemo(() => {
    return entries
  }, [entries])

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

  const handleCategoryClick = (categoryRef: string | null) => {
    setSelectedCategoryRef(categoryRef)
    setLoadedCount(PAGE_SIZE)
    // Clear article search when switching to glossary mode
    if (categoryRef === GLOSSARY_VIEW_MODE) {
      setSearchQuery('')
    }
  }

  // Check if we're in glossary mode
  const isGlossaryMode = selectedCategoryRef === GLOSSARY_VIEW_MODE

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
        {/* Wiki-style Header with Search - Hide in glossary mode */}
        {!isGlossaryMode && (
          <>
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
                    contexts={[
                      {
                        context: FlowContextName.contentEntryCreate,
                        contextData: { contentGroup: ContentGroup.KNOWLEDGE }
                      }
                    ]}
                    accessToken={accessToken}
                    emptyState="enable"
                    lazyLoad
                    data-testid="knowledge-view-create-button"
                  >
                    <Button>{t('create_article')}</Button>
                  </AppAction>
                </div>
              </div>
            )}
          </>
        )}

        {/* Wiki Layout: Sidebar + Content */}
        <div className="gba:grid gba:grid-cols-[260px_1fr] gba:gap-6">
          <CategorySidebar
            categories={categories}
            isLoading={categoriesLoading}
            selectedCategoryRef={selectedCategoryRef}
            onCategoryClick={handleCategoryClick}
            t={t}
          />

          {/* Main Content Area */}
          <div>
            {/* Breadcrumb */}
            {isGlossaryMode && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4 gba:text-sm gba:text-muted-foreground">
                <button
                  onClick={() => handleCategoryClick(null)}
                  className="gba:hover:text-foreground gba:transition-colors"
                >
                  {t('knowledge')}
                </button>
                <ChevronRight className="gba:w-4 gba:h-4" />
                <span className="gba:text-foreground gba:font-medium">{t('glossary')}</span>
              </div>
            )}

            {selectedCategory && !isGlossaryMode && (
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

            {/* Render Glossary Section or Articles */}
            {isGlossaryMode ? (
              <GlossarySection accessToken={accessToken} userInfo={userInfo} currentTab={currentTab} />
            ) : (
              <>
                {/* Featured Articles Section */}
                {isLoading ? (
                  <div className="gba:mb-8">
                    <Skeleton className="gba:h-6 gba:w-48 gba:mb-4" />
                    <div className="gba:space-y-4">
                      <ContentCardSkeleton variant="horizontal" count={3} />
                    </div>
                  </div>
                ) : (
                  <FeaturedArticlesSection
                    articles={featuredArticles}
                    onArticleClick={handleArticleClick}
                    truncateText={truncateText}
                    t={t}
                    accessToken={accessToken}
                  />
                )}

                {/* Regular Articles Grid */}
                <RegularArticlesSection
                  articles={regularArticles}
                  isLoading={isLoading}
                  isInitialLoad={isInitialLoad}
                  searchQuery={searchQuery}
                  currentTab={currentTab}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  allowedReactions={allowedReactions}
                  reactionCatalogMap={reactionCatalogMap}
                  translatedItems={translatedItems}
                  onReactionsRefetch={refetch}
                  t={t}
                />

                {/* Show all articles in grid if searching or not on first page */}
                {(searchQuery || !isInitialLoad) && data.length > 0 && (
                  <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:mb-8">
                    {data.map(item => {
                      const translated = translatedItems?.[item.id || '']
                      return (
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
                          translatedTitle={translated?.title}
                          translatedPreview={translated?.preview}
                        />
                      )
                    })}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(KnowledgeView, (prevProps, nextProps) => {
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
