import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { useContentEntries, useUserContentReactions, toIntranetContent } from '@/common/data/content'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import ContentCard from '../../components/cards/ContentCard'
import MainFeaturedArticle from '../../components/cards/MainFeaturedArticle'
import TrendingNow from '../../components/cards/TrendingNow'
import SearchInput from '../../components/shared/SearchInput'
import NavigationTagList from '../../components/shared/NavigationTagList'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { KNOWLEDGE_CATEGORIES, ALL_TAG, contentGroupMapper, KNOWLEDGE_BASE } from '../../constants/contentConstants'
import { updateTags } from '../../utils/contentUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface KnowledgeViewProps extends BusinessAppContextProps {
  onNavigate?: (tab: string) => void
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const DEFAULT_PAGE_SIZE = 12
const NEXT_PAGE_SIZE = 10

const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'knowledge',
  allowedReactions,
  reactionCatalogMap
}) => {
  const { t } = useTranslation('content')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<{ label: string; checked: boolean }[]>([
    { label: ALL_TAG, checked: true },
    ...KNOWLEDGE_CATEGORIES.map(category => ({ label: category, checked: false }))
  ])

  const isAllSelected = useMemo(() => {
    return categories.find(cat => cat.label === ALL_TAG)?.checked ?? false
  }, [categories])

  const offset = page === 1 ? 0 : DEFAULT_PAGE_SIZE + (page - 2) * NEXT_PAGE_SIZE
  const limit = page === 1 ? DEFAULT_PAGE_SIZE : NEXT_PAGE_SIZE

  // Memoize params to prevent infinite re-renders
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: contentGroupMapper[KNOWLEDGE_BASE],
      search: searchQuery,
      limit,
      offset,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    [searchQuery, limit, offset]
  )

  // Use central content data - FIXED: correct parameter order
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

  // Get the first article as featured (only when "All" is selected and no search)
  const featuredArticle = useMemo(() => {
    return isAllSelected && !searchQuery && data.length > 0 ? data[0] : null
  }, [data, isAllSelected, searchQuery])

  // Filter out the featured article from the regular grid
  const regularArticles = useMemo(() => {
    if (featuredArticle && isAllSelected && !searchQuery) {
      return data.filter(item => item.articleId !== featuredArticle.articleId)
    }
    return data
  }, [data, featuredArticle, isAllSelected, searchQuery])

  const hasMore = entries.length > 0 && entries.length < totalCount

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleCategoryClick = (label: string) => {
    const updatedCategories = updateTags(categories, label)
    setCategories(updatedCategories)
    setPage(1)
  }

  const loadMore = () => {
    setPage(prev => prev + 1)
  }

  const handleArticleClick = (article: any) => {
    const url = buildPlatformUrl('/platform/content/intranet/content-record', {
      contentId: article.articleId,
      tab: currentTab
    })
    navigateTo(url)
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="knowledge-view-error">
        <Alert variant="destructive">
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>
            {error}
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
            title={t('knowledge_welcome_title')}
            subtitle={t('knowledge_welcome_subtitle')}
          />
        </div>
      )}

      <div className="gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4">
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
              <SearchInput onSearch={handleSearch} placeholder={t('search_knowledge')} />
              <AppAction
                contextsArray={[FlowContextName.contentEntryCreate]}
                externalContextData={{ contentGroup: contentGroupMapper[KNOWLEDGE_BASE] }}
                accessToken={accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
                data-testid="knowledge-view-create-button"
              >
                <Button>{t('create_article', 'Create Article')}</Button>
              </AppAction>
            </div>
          </div>
        </div>

        {featuredArticle && isAllSelected && !searchQuery && (
          <div className="gba:grid gba:grid-cols-[1fr_280px] gba:gap-6 gba:mb-6">
            <div>
              <MainFeaturedArticle item={featuredArticle} onClick={handleArticleClick} />
            </div>
            <div>
              <TrendingNow
                articles={data}
                className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:shadow-sm gba:h-full"
                currentTab={currentTab}
              />
            </div>
          </div>
        )}

        <div className="gba:grid gba:grid-cols-3 gba:gap-6 gba:mb-8">
          {regularArticles.map(item => (
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

          {!isLoading && regularArticles.length === 0 && !featuredArticle && (
            <div className="gba:col-span-3 gba:text-center gba:py-12">
              <p className="gba:text-muted-foreground">{t('no_knowledge_found')}</p>
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
  )
}

export default KnowledgeView
