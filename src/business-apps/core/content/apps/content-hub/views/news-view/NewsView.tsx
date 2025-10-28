import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { useContents } from '../../hooks/useContents'
import ContentCard from '../../components/cards/ContentCard'
import SearchInput from '../../components/shared/SearchInput'
import NavigationTagList from '../../components/shared/NavigationTagList'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { NEWS_CATEGORIES, ALL_TAG, contentGroupMapper, NEWS } from '../../constants/contentConstants'
import { updateTags } from '../../utils/contentUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface NewsViewProps extends BusinessAppContextProps {
  hideBanner?: boolean
  currentTab?: string
}

const DEFAULT_PAGE_SIZE = 11
const NEXT_PAGE_SIZE = 10

const NewsView: React.FC<NewsViewProps> = ({ accessToken, userInfo, hideBanner = false, currentTab = 'news' }) => {
  const { t } = useTranslation('content')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<{ label: string; checked: boolean }[]>([
    { label: ALL_TAG, checked: true },
    ...NEWS_CATEGORIES.map(category => ({ label: category, checked: false }))
  ])

  const offset = page === 1 ? 0 : DEFAULT_PAGE_SIZE + (page - 2) * NEXT_PAGE_SIZE
  const limit = page === 1 ? DEFAULT_PAGE_SIZE : NEXT_PAGE_SIZE

  const { data, totalCount, isLoading, error, refetch } = useContents(
    {
      offset,
      limit,
      search: searchQuery,
      articleGroupRef: contentGroupMapper[NEWS],
      sorter: { field: 'createdAt', order: 'descend' }
    },
    accessToken
  )

  const featuredArticles = page === 1 && data.length > 0 ? data.slice(0, 2) : []
  const otherArticles =
    page === 1 && data.length > 2
      ? data.slice(2)
      : data.filter(article => !featuredArticles.some(featured => featured.articleId === article.articleId))

  const hasMore = data.length > 0 && data.length < totalCount

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
      data-testid="news-view"
    >
      {/* Banner - Full Width */}
      {!hideBanner && (
        <div className="gba:w-full">
          <Banner variant={BannerVariant.NEWS} title={t('news_welcome_title')} subtitle={t('news_welcome_subtitle')} />
        </div>
      )}

      <div className="gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4">
        {/* Featured News */}
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
                />
              ))}
            </div>
          </>
        )}

        {/* Navigation and Search */}
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
                contextsArray={[FlowContextName.articleCreate]}
                externalContextData={{ articleGroup: contentGroupMapper[NEWS] }}
                accessToken={accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
                data-testid="news-view-create-button"
              >
                <Button>{t('create_article', 'Create Article')}</Button>
              </AppAction>
            </div>
          </div>
        </div>

        {/* Regular Articles */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:mb-6">
          {otherArticles.map(item => (
            <ContentCard
              key={item.articleId}
              item={item}
              variant="news"
              currentTab={currentTab}
              accessToken={accessToken}
              userInfo={userInfo}
            />
          ))}
        </div>

        {/* Load More */}
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

        {/* Empty State */}
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
