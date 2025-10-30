import React, { useState, useMemo } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { useContentEntries, useUserContentReactions, toIntranetContent } from '@/common/data/content'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import ContentCard from '../../components/cards/ContentCard'
import SearchInput from '../../components/shared/SearchInput'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import ContentCarousel from '../../components/shared/ContentCarousel'
import TrendingNow from '../../components/cards/TrendingNow'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'

interface HomeViewProps extends BusinessAppContextProps {
  onNavigate?: (tab: string) => void
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const DEFAULT_PAGE_SIZE = 12
const NEXT_PAGE_SIZE = 10

const HomeView: React.FC<HomeViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'intranet',
  allowedReactions,
  reactionCatalogMap
}) => {
  const { t } = useTranslation(translations)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  const offset = page === 1 ? 0 : DEFAULT_PAGE_SIZE + (page - 2) * NEXT_PAGE_SIZE
  const limit = page === 1 ? DEFAULT_PAGE_SIZE : NEXT_PAGE_SIZE

  // Memoize params to prevent infinite re-renders
  // Home View shows ALL content groups, sorted by newest first
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      // No contentGroupRef - show all groups (News, Knowledge, Documents, etc.)
      search: searchQuery,
      limit,
      offset,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    [searchQuery, limit, offset]
  )

  // Use central content data - FIXED: correct parameter order & role
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
  const topArticles = useMemo(() => data.slice(0, 5), [data])
  const remainingArticles = useMemo(() => data.slice(5), [data])

  const hasMore = entries.length > 0 && entries.length < totalCount

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
        {data.length > 0 && (
          <>
            <div className="gba:mb-6 gba:mt-6">
              <h2 className="gba:text-2xl gba:md:text-3xl gba:text-foreground gba:font-semibold">
                {t('latest_announcements')}
              </h2>
            </div>

            {/* Carousel and Trending Now Section */}
            <div className="gba:grid gba:grid-cols-[1fr_280px] gba:gap-6 gba:mb-8">
              <div>
                <ContentCarousel articles={topArticles} currentTab={currentTab} />
              </div>
              <div>
                <TrendingNow
                  entries={entries}
                  className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:shadow-sm gba:h-full"
                  currentTab={currentTab}
                />
              </div>
            </div>
          </>
        )}

        <div className="gba:w-full gba:flex gba:justify-center gba:mb-8 gba:mt-6">
          <div className="gba:w-full gba:max-w-[80%]">
            <SearchInput onSearch={handleSearch} placeholder={t('search_intranet')} />
          </div>
        </div>

        <div className="gba:mb-6">
          <h2 className="gba:text-2xl gba:md:text-3xl gba:text-foreground gba:font-semibold">{t('recent_content')}</h2>
        </div>

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
