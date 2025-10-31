import React, { useState, useMemo } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription, Card } from '@newwork/nw-design-system'
import { useContentEntries, useUserContentReactions, toIntranetContent } from '@/common/data/content'
import { ContentRole, ContentGroup } from '@/common/data/content/types/contentEnums'
import ContentCard from '../../components/cards/ContentCard'
import SearchInput from '../../components/shared/SearchInput'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useKnowledgeCategories } from '../../hooks/useKnowledgeCategories'
import { BookOpen, ChevronRight, Folder } from 'lucide-react'
import translations from '../../_i18n'

interface KnowledgeViewProps extends BusinessAppContextProps {
  onNavigate?: (tab: string) => void
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const DEFAULT_PAGE_SIZE = 18
const NEXT_PAGE_SIZE = 12

const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'knowledge',
  allowedReactions,
  reactionCatalogMap
}) => {
  const { t } = useTranslation(translations)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryRef, setSelectedCategoryRef] = useState<string | null>(null)

  // Load categories from catalog
  const { categories, isLoading: categoriesLoading } = useKnowledgeCategories({ accessToken })

  const offset = page === 1 ? 0 : DEFAULT_PAGE_SIZE + (page - 2) * NEXT_PAGE_SIZE
  const limit = page === 1 ? DEFAULT_PAGE_SIZE : NEXT_PAGE_SIZE

  // Memoize params to prevent infinite re-renders
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: ContentGroup.KNOWLEDGE,
      categoryRefs: selectedCategoryRef ? [selectedCategoryRef] : undefined,
      search: searchQuery,
      limit,
      offset,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    [selectedCategoryRef, searchQuery, limit, offset]
  )

  // Use central content data
  const { entries, totalCount, isLoading, error, refetch } = useContentEntries(queryParams, accessToken)

  // Batch fetch reactions
  const articleIds = useMemo(() => entries.map(entry => entry.id), [entries])
  const { reactionsByArticle, refetch: refetchReactions } = useUserContentReactions({
    contentEntryIds: articleIds,
    currentUserId: userInfo?.id,
    accessToken
  })

  // Convert to legacy format
  const data = useMemo(() => entries.map(toIntranetContent), [entries])

  const hasMore = entries.length > 0 && entries.length < totalCount

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleCategoryClick = (categoryRef: string | null) => {
    setSelectedCategoryRef(categoryRef)
    setPage(1)
  }

  const loadMore = () => {
    setPage(prev => prev + 1)
  }

  // Get selected category name for breadcrumb
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryRef)

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

            {/* Articles Grid */}
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
                  reactionSummary={reactionsByArticle[item.articleId] || {}}
                  onReactionsRefetch={refetchReactions}
                />
              ))}

              {!isLoading && data.length === 0 && (
                <div className="gba:col-span-3 gba:text-center gba:py-12">
                  <p className="gba:text-muted-foreground">
                    {searchQuery ? t('no_search_results') : t('no_knowledge_found')}
                  </p>
                </div>
              )}
            </div>

            {hasMore && (
              <div className="gba:flex gba:justify-center gba:w-full gba:mt-6 gba:mb-4">
                <Button variant="default" className="gba:w-56" onClick={loadMore} disabled={isLoading}>
                  {t('load_more')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default KnowledgeView
