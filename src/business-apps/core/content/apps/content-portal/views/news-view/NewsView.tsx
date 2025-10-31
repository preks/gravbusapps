import React, { useState, useMemo } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { useContentEntries, useUserContentReactions, toIntranetContent } from '@/common/data/content'
import { ContentRole, ContentGroup } from '@/common/data/content/types/contentEnums'
import ContentCard from '../../components/cards/ContentCard'
import SearchInput from '../../components/shared/SearchInput'
import NavigationTagList from '../../components/shared/NavigationTagList'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { NEWS_CATEGORIES, ALL_TAG } from '../../constants/contentConstants'
import { updateTags } from '../../utils/contentUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'

interface NewsViewProps extends BusinessAppContextProps {
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const DEFAULT_PAGE_SIZE = 11
const NEXT_PAGE_SIZE = 10

const NewsView: React.FC<NewsViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'news',
  allowedReactions,
  reactionCatalogMap
}) => {
  const { t } = useTranslation(translations)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<{ label: string; checked: boolean }[]>([
    { label: ALL_TAG, checked: true },
    ...NEWS_CATEGORIES.map(category => ({ label: category, checked: false }))
  ])

  const offset = page === 1 ? 0 : DEFAULT_PAGE_SIZE + (page - 2) * NEXT_PAGE_SIZE
  const limit = page === 1 ? DEFAULT_PAGE_SIZE : NEXT_PAGE_SIZE

  // Memoize params to prevent infinite re-renders
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: ContentGroup.NEWS,
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

  const featuredArticles = page === 1 && data.length > 0 ? data.slice(0, 2) : []
  const otherArticles =
    page === 1 && data.length > 2
      ? data.slice(2)
      : data.filter(article => !featuredArticles.some(featured => featured.articleId === article.articleId))

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
        {featuredArticles.length > 0 && (
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
        )}

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
          {otherArticles.map(item => (
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
          ))}
        </div>

        {hasMore && (
          <div className="gba:flex gba:justify-center gba:w-full gba:mt-6 gba:mb-4">
            <Button
              variant="default"
              className="gba:w-[280px]"
              onClick={loadMore}
              disabled={isLoading}
              data-testid="news-view-load-more"
            >
              {t('load_more')}
            </Button>
          </div>
        )}

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
