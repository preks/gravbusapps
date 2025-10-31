import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { useContents } from '../../hooks/useContents'
import ContentCard from '../../components/cards/ContentCard'
import SearchInput from '../../components/shared/SearchInput'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import ContentCarousel from '../../components/shared/ContentCarousel'
import { contentGroupMapper, INTRANET } from '../../constants/contentConstants'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface HomeViewProps extends BusinessAppContextProps {
  onNavigate?: (tab: string) => void
  hideBanner?: boolean
  currentTab?: string
}

const DEFAULT_PAGE_SIZE = 12
const NEXT_PAGE_SIZE = 10

const HomeView: React.FC<HomeViewProps> = ({ accessToken, userInfo, hideBanner = false, currentTab = 'intranet' }) => {
  const { t } = useTranslation('content')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  // Format current date
  const formattedDate = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }, [])

  // Determine appropriate greeting
  const greeting = useMemo(() => {
    const localTimeHours = new Date().getHours()
    if (localTimeHours >= 5 && localTimeHours < 12) return t('greeting_morning')
    if (localTimeHours >= 12 && localTimeHours < 18) return t('greeting_afternoon')
    if (localTimeHours >= 18 && localTimeHours < 22) return t('greeting_evening')
    return t('greeting_generic')
  }, [t])

  const offset = page === 1 ? 0 : DEFAULT_PAGE_SIZE + (page - 2) * NEXT_PAGE_SIZE
  const limit = page === 1 ? DEFAULT_PAGE_SIZE : NEXT_PAGE_SIZE

  const { data, totalCount, isLoading, error, refetch } = useContents(
    {
      offset,
      limit,
      search: searchQuery,
      articleGroupRef: contentGroupMapper[INTRANET],
      sorter: { field: 'createdAt', order: 'descend' }
    },
    accessToken
  )

  // Get the first 5 articles for the carousel
  const topArticles = useMemo(() => data.slice(0, 5), [data])

  // Get the remaining articles for the grid (excluding those in the carousel)
  const remainingArticles = useMemo(() => data.slice(5), [data])

  const hasMore = data.length > 0 && data.length < totalCount

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const loadMore = () => {
    setPage(prev => prev + 1)
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="intranet-view-error">
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
      data-testid="intranet-view"
    >
      {/* Banner - Full Width with greeting */}
      {!hideBanner && (
        <div className="gba:w-full">
          <Banner
            variant={BannerVariant.INTRANET}
            title={t('intranet_welcome_title')}
            subtitle={t('intranet_welcome_subtitle')}
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
        {/* Carousel */}
        {data.length > 0 && (
          <ContentCarousel articles={topArticles} className="gba:mt-6 gba:mb-8" currentTab={currentTab} />
        )}

        {/* Search Input - Centered */}
        <div className="gba:w-full gba:flex gba:justify-center gba:mb-8 gba:mt-6">
          <div className="gba:w-full gba:max-w-[80%]">
            <SearchInput onSearch={handleSearch} placeholder={t('search_intranet')} />
          </div>
        </div>

        {/* Section Title */}
        <div className="gba:mb-6">
          <h2 className="gba:text-2xl gba:md:text-3xl gba:text-foreground gba:font-semibold">
            {t('latest_announcements')}
          </h2>
        </div>

        {/* Articles Grid */}
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
              />
            ))
          ) : (
            <div className="gba:col-span-2 gba:text-center gba:text-muted-foreground gba:py-8">
              {t('no_more_articles')}
            </div>
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="gba:flex gba:justify-center gba:w-full gba:mt-6 gba:mb-4">
            <Button
              variant="default"
              className="gba:w-[280px]"
              onClick={loadMore}
              disabled={isLoading}
              data-testid="intranet-view-load-more"
            >
              {t('load_more')}
            </Button>
          </div>
        )}

        {/* Empty State */}
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
