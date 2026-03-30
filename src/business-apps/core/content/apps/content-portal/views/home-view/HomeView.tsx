import React, { useMemo, useEffect, useRef, useState } from 'react'
import {
  useTranslation,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Skeleton,
  Card,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@newwork/nw-design-system'
import {
  Newspaper,
  BookOpen,
  MessageCircleQuestion,
  Clock,
  ChevronRight,
  ArrowRight,
  ChevronLeft,
  MessageSquare,
  ThumbsUp,
  MessageCircle
} from 'lucide-react'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentRole, ContentGroup } from '@/common/data/content/types/contentEnums'
import ContentCard from '../../components/cards/ContentCard'
import { ContentImage } from '../../components/shared/ContentImage'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { useArticleComments } from '../../hooks/useRecentComments'
import translations from '../../_i18n'

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
  allowedReactions,
  reactionCatalogMap,
  targetLanguage,
  translatedItems,
  onTranslate
}) => {
  const { t } = useTranslation(translations)

  // Query for NEWS articles (hero + 4 secondary + more news)
  const newsQueryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroup: ContentGroup.NEWS,
      limit: 8,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    []
  )

  // Query for KNOWLEDGE articles - fetch more to group by category
  const knowledgeQueryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroup: ContentGroup.KNOWLEDGE,
      limit: 20,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    []
  )

  // Query for QUESTIONS
  const questionsQueryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroup: ContentGroup.QUESTION,
      limit: 5,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    []
  )

  // Query for recent/trending (all content types for timeline)
  const recentQueryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroups: [ContentGroup.NEWS, ContentGroup.KNOWLEDGE, ContentGroup.QUESTION],
      limit: 8,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    []
  )

  // Fetch all content
  const {
    entries: newsEntries,
    isLoading: newsLoading,
    error: newsError,
    refetch: refetchNews
  } = useContentEntries(newsQueryParams, accessToken)

  const {
    entries: knowledgeEntries,
    isLoading: knowledgeLoading,
    refetch: refetchKnowledge
  } = useContentEntries(knowledgeQueryParams, accessToken)

  const {
    entries: questionEntries,
    isLoading: questionsLoading,
    refetch: refetchQuestions
  } = useContentEntries(questionsQueryParams, accessToken)

  const {
    entries: recentEntries,
    isLoading: recentLoading,
    refetch: refetchRecent
  } = useContentEntries(recentQueryParams, accessToken)

  // Split news into hero and secondary
  const heroNews = newsEntries[0]
  const secondaryNews = newsEntries.slice(1, 5) // Show 4 secondary articles
  const moreNews = newsEntries.slice(5)

  // Group knowledge entries by content type (max 3 types, 4 articles each)
  const knowledgeByType = useMemo(() => {
    if (!knowledgeEntries.length) return []

    const typeMap = new Map<
      string,
      {
        type: { id: string; name: string }
        articles: typeof knowledgeEntries
      }
    >()

    for (const entry of knowledgeEntries) {
      const typeId = entry.contentType?.id
      if (!typeId) continue

      if (!typeMap.has(typeId)) {
        typeMap.set(typeId, {
          type: { id: typeId, name: entry.contentType?.name || typeId },
          articles: []
        })
      }

      const group = typeMap.get(typeId)!
      if (group.articles.length < 4) {
        group.articles.push(entry)
      }
    }

    return Array.from(typeMap.values()).slice(0, 3)
  }, [knowledgeEntries])

  // Fetch comments for the hero article
  const {
    comments: heroComments,
    isLoading: commentsLoading,
    refetch: refetchComments
  } = useArticleComments({ accessToken, articleId: heroNews?.id, limit: 10 })

  // Ref for the comments slider
  const commentsSliderRef = useRef<HTMLDivElement>(null)

  // Scroll handlers for comments slider
  const scrollCommentsLeft = () => {
    if (commentsSliderRef.current) {
      commentsSliderRef.current.scrollBy({ left: -300, behavior: 'smooth' })
    }
  }

  const scrollCommentsRight = () => {
    if (commentsSliderRef.current) {
      commentsSliderRef.current.scrollBy({ left: 300, behavior: 'smooth' })
    }
  }

  // Listen for process completion to refresh data
  useProcessCompletion({
    onSuccess: () => {
      refetchNews()
      refetchKnowledge()
      refetchQuestions()
      refetchRecent()
      refetchComments()
    }
  })

  // Collect all items for translation
  const allItems = useMemo(() => {
    return [...newsEntries, ...knowledgeEntries, ...questionEntries]
  }, [newsEntries, knowledgeEntries, questionEntries])

  // Trigger translation when targetLanguage is set
  useEffect(() => {
    if (!targetLanguage || !onTranslate || allItems.length === 0) {
      return
    }
    onTranslate(allItems, targetLanguage).catch(() => {})
  }, [targetLanguage, allItems, onTranslate])

  // Navigation handlers
  const handleNavigateToNews = () => navigateTo(buildPlatformUrl('/platform/content/intranet', { tab: 'news' }))
  const handleNavigateToKnowledge = () =>
    navigateTo(buildPlatformUrl('/platform/content/intranet', { tab: 'knowledge' }))
  const handleNavigateToQuestions = () =>
    navigateTo(buildPlatformUrl('/platform/content/intranet', { tab: 'questions' }))

  const handleArticleClick = (entryId: string, tab: string) => {
    const url = buildPlatformUrl('/platform/content/intranet/content-record', {
      contentId: entryId,
      tab
    })
    navigateTo(url)
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins} min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Get content group label
  const getGroupLabel = (groupRef: string | null | undefined) => {
    if (groupRef === ContentGroup.NEWS) return t('news')
    if (groupRef === ContentGroup.KNOWLEDGE) return t('knowledge')
    if (groupRef === ContentGroup.QUESTION) return t('questions')
    return ''
  }

  // Get content group badge variant
  const getGroupBadgeVariant = (groupRef: string | null | undefined): 'default' | 'secondary' | 'warning' => {
    if (groupRef === ContentGroup.NEWS) return 'default'
    if (groupRef === ContentGroup.KNOWLEDGE) return 'secondary'
    return 'warning'
  }

  // Get total reaction count from entry
  const getReactionCount = (entry: (typeof newsEntries)[0]) => {
    return entry.contentEntryReactionCounts?.reduce((sum, item) => sum + (item.count || 0), 0) || 0
  }

  // Get comment count from entry
  const getCommentCount = (entry: (typeof newsEntries)[0]) => {
    return entry.descendantContentEntriesAggregate?.aggregate?.count || 0
  }

  // Get initials from name
  const getInitials = (displayName: string | null, firstName: string | null, lastName: string | null) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }
    if (displayName) {
      const parts = displayName.split(' ')
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      }
      return displayName.substring(0, 2).toUpperCase()
    }
    return '??'
  }

  // Strip HTML tags from content and truncate
  const stripHtmlAndTruncate = (html: string | null, maxLength = 120) => {
    if (!html) return ''
    const text = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  // Track if queries have completed their initial fetch (regardless of whether data exists)
  const [newsQueryCompleted, setNewsQueryCompleted] = useState(false)
  const [knowledgeQueryCompleted, setKnowledgeQueryCompleted] = useState(false)
  const [recentQueryCompleted, setRecentQueryCompleted] = useState(false)

  // Mark queries as completed when they finish loading (even if empty)
  useEffect(() => {
    if (!newsLoading) {
      setNewsQueryCompleted(true)
    }
  }, [newsLoading])

  useEffect(() => {
    if (!knowledgeLoading) {
      setKnowledgeQueryCompleted(true)
    }
  }, [knowledgeLoading])

  useEffect(() => {
    if (!recentLoading) {
      setRecentQueryCompleted(true)
    }
  }, [recentLoading])

  // Show full loading state only if primary queries haven't completed yet
  // This prevents flash of empty content on initial load
  const showFullLoading = !newsQueryCompleted || !recentQueryCompleted

  if (newsError) {
    return (
      <div className="gba:p-6" data-testid="intranet-view-error">
        <Alert variant="destructive">
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>
            {newsError?.message || 'An error occurred'}
            <Button onClick={refetchNews} variant="outline" className="gba:mt-2 gba:ml-4">
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show full-page skeleton if initial data hasn't loaded yet
  // This prevents the flash of empty content before data arrives
  if (showFullLoading) {
    return (
      <div
        className="gba:relative gba:min-h-screen gba:flex gba:flex-col gba:w-full"
        data-testid="intranet-view-loading"
      >
        {!hideBanner && (
          <Banner
            variant={BannerVariant.INTRANET}
            title={t('intranet-welcome-title')}
            subtitle={t('intranet-welcome-subtitle')}
          />
        )}
        <div className="gba:w-full gba:max-w-[1400px] gba:mx-auto gba:px-4 gba:py-6">
          <div className="gba:flex gba:flex-col gba:md:flex-row gba:gap-6">
            {/* Main Content Skeleton */}
            <div className="gba:flex-1 gba:min-w-0 gba:space-y-8">
              {/* News Section Skeleton */}
              <div>
                <Skeleton className="gba:h-5 gba:w-24 gba:mb-4" />
                <div className="gba:flex gba:flex-col gba:md:flex-row gba:gap-4">
                  <div className="gba:md:w-1/2 gba:flex gba:flex-col gba:gap-3">
                    <Skeleton className="gba:h-[280px] gba:w-full gba:rounded-xl" />
                    <div className="gba:flex gba:gap-2">
                      <Skeleton className="gba:h-16 gba:flex-1 gba:rounded-lg" />
                      <Skeleton className="gba:h-16 gba:flex-1 gba:rounded-lg" />
                    </div>
                  </div>
                  <div className="gba:flex-1 gba:flex gba:flex-col gba:gap-2">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="gba:h-[72px] gba:w-full gba:rounded-lg gba:flex-1" />
                    ))}
                  </div>
                </div>
              </div>
              {/* Knowledge Section Skeleton */}
              <div>
                <Skeleton className="gba:h-5 gba:w-32 gba:mb-4" />
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="gba:space-y-3">
                      <Skeleton className="gba:h-40 gba:w-full gba:rounded-lg" />
                      <Skeleton className="gba:h-4 gba:w-24" />
                      <Skeleton className="gba:h-5 gba:w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Sidebar Skeleton */}
            {/* NOTE: We cap width to prevent intermittent layout collapse when CSS is stale/mismatched */}
            <aside className="gba:w-full gba:max-w-80 gba:shrink-0">
              <Card className="gba:p-4">
                <Skeleton className="gba:h-5 gba:w-32 gba:mb-4" />
                <div className="gba:space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="gba:flex gba:gap-3">
                      <Skeleton className="gba:w-10 gba:h-10 gba:shrink-0" />
                      <div className="gba:flex-1 gba:space-y-1">
                        <Skeleton className="gba:h-4 gba:w-full" />
                        <Skeleton className="gba:h-3 gba:w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:relative gba:min-h-screen gba:flex gba:flex-col gba:w-full" data-testid="intranet-view">
      {!hideBanner && (
        <Banner
          variant={BannerVariant.INTRANET}
          title={t('intranet-welcome-title')}
          subtitle={t('intranet-welcome-subtitle')}
        />
      )}

      <div className="gba:w-full gba:max-w-[1400px] gba:mx-auto gba:px-4 gba:py-6">
        {/* Main Layout: Content + Sidebar */}
        <div className="gba:flex gba:flex-col gba:md:flex-row gba:gap-6">
          {/* Main Content Area - min-h ensures it takes space even during loading */}
          <div className="gba:flex-1 gba:min-w-0 gba:space-y-8 gba:min-h-[400px]">
            {/* NEWS SECTION - Hero Layout */}
            <section data-testid="home-news-section">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:flex gba:items-center gba:gap-2">
                  <Newspaper className="gba:w-4 gba:h-4" />
                  {t('news')}
                </h3>
                <Button variant="ghost" size="sm" onClick={handleNavigateToNews} className="gba:text-xs">
                  {t('all_articles')} <ChevronRight className="gba:w-3 gba:h-3 gba:ml-1" />
                </Button>
              </div>

              {/* Show skeleton if news query hasn't completed yet */}
              {!newsQueryCompleted ? (
                <div className="gba:flex gba:flex-col gba:md:flex-row gba:gap-4">
                  {/* Left column skeleton: Hero + Comments */}
                  <div className="gba:md:w-1/2 gba:flex gba:flex-col gba:gap-3">
                    <Skeleton className="gba:h-[280px] gba:w-full gba:rounded-xl" />
                    <div className="gba:flex gba:gap-2">
                      <Skeleton className="gba:h-16 gba:flex-1 gba:rounded-lg" />
                      <Skeleton className="gba:h-16 gba:flex-1 gba:rounded-lg" />
                    </div>
                  </div>
                  {/* Right column skeleton: 4 secondary articles */}
                  <div className="gba:flex-1 gba:flex gba:flex-col gba:gap-2">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="gba:h-[72px] gba:w-full gba:rounded-lg gba:flex-1" />
                    ))}
                  </div>
                </div>
              ) : heroNews ? (
                <div className={`gba:flex gba:flex-col ${secondaryNews.length > 0 ? 'gba:md:flex-row' : ''} gba:gap-4`}>
                  {/* Left Column: Hero Article + Comments */}
                  <div
                    className={`gba:flex gba:flex-col gba:gap-3 ${secondaryNews.length > 0 ? 'gba:md:w-1/2' : 'gba:w-full'}`}
                  >
                    {/* Hero Article */}
                    <button
                      type="button"
                      onClick={() => handleArticleClick(heroNews.id || '', 'news')}
                      className="gba:relative gba:group gba:overflow-hidden gba:rounded-xl gba:bg-card gba:border gba:border-border gba:text-left gba:transition-all hover:gba:border-primary/50 gba:h-[280px] gba:flex-shrink-0"
                      data-testid="hero-news-article"
                    >
                      {heroNews.picture ? (
                        <ContentImage
                          picture={heroNews.picture}
                          accessToken={accessToken || ''}
                          alt={heroNews.title || ''}
                          className="gba:absolute gba:inset-0 gba:w-full gba:h-full"
                        />
                      ) : (
                        <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary/20 gba:to-primary/5" />
                      )}
                      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-t gba:from-black/80 gba:via-black/40 gba:to-transparent" />
                      <div className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:justify-end gba:p-5">
                        <Badge variant="default" className="gba:w-fit gba:mb-2">
                          {t('news')}
                        </Badge>
                        <h2 className="gba:text-xl gba:font-bold gba:text-white gba:mb-1 gba:line-clamp-2 group-hover:gba:text-primary-foreground">
                          {translatedItems?.[heroNews.id || '']?.title || heroNews.title}
                        </h2>
                        <p className="gba:text-sm gba:text-white/80 gba:line-clamp-2 gba:mb-2">
                          {translatedItems?.[heroNews.id || '']?.preview || heroNews.preview}
                        </p>
                        <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-white/60">
                          <span className="gba:flex gba:items-center gba:gap-1">
                            <Clock className="gba:w-3 gba:h-3" />
                            {heroNews.createdAt ? formatRelativeTime(heroNews.createdAt) : ''}
                          </span>
                          {heroNews.creatorEmployee?.displayName && (
                            <span className="gba:truncate gba:max-w-[120px]">
                              {heroNews.creatorEmployee.displayName}
                            </span>
                          )}
                          {getReactionCount(heroNews) > 0 && (
                            <span className="gba:flex gba:items-center gba:gap-1">
                              <ThumbsUp className="gba:w-3 gba:h-3" />
                              {getReactionCount(heroNews)}
                            </span>
                          )}
                          {getCommentCount(heroNews) > 0 && (
                            <span className="gba:flex gba:items-center gba:gap-1">
                              <MessageCircle className="gba:w-3 gba:h-3" />
                              {getCommentCount(heroNews)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Hero Article Comments - inside hero column */}
                    {heroComments.length > 0 && (
                      <div data-testid="hero-comments-slider">
                        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                            <MessageSquare className="gba:w-3 gba:h-3" />
                            <span>
                              {heroComments.length} {t('recent_comments') || 'Recent Comments'}
                            </span>
                          </div>
                          <div className="gba:flex gba:gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={scrollCommentsLeft}
                              className="gba:h-6 gba:w-6 gba:p-0"
                              data-testid="comments-scroll-left"
                            >
                              <ChevronLeft className="gba:w-3 gba:h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={scrollCommentsRight}
                              className="gba:h-6 gba:w-6 gba:p-0"
                              data-testid="comments-scroll-right"
                            >
                              <ChevronRight className="gba:w-3 gba:h-3" />
                            </Button>
                          </div>
                        </div>

                        <div
                          ref={commentsSliderRef}
                          className="gba:flex gba:gap-2 gba:overflow-x-auto gba:pb-1 gba:scrollbar-hide"
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                          {commentsLoading ? (
                            <>
                              {[1, 2].map(i => (
                                <div key={i} className="gba:shrink-0 gba:flex-1 gba:min-w-[200px]">
                                  <div className="gba:flex gba:gap-2 gba:p-2 gba:bg-muted/30 gba:rounded-lg">
                                    <Skeleton className="gba:w-7 gba:h-7 gba:rounded-full gba:shrink-0" />
                                    <div className="gba:flex-1 gba:space-y-1">
                                      <Skeleton className="gba:h-3 gba:w-16" />
                                      <Skeleton className="gba:h-3 gba:w-full" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          ) : (
                            heroComments.slice(0, 4).map((comment, index) => {
                              const employee = comment.creatorEmployee

                              return (
                                <div
                                  key={comment.id || `comment-${index}`}
                                  className="gba:shrink-0 gba:w-[calc(50%-4px)] gba:p-2 gba:bg-muted/30 gba:rounded-lg"
                                  data-testid={`hero-comment-${index}`}
                                >
                                  <div className="gba:flex gba:gap-2">
                                    <Avatar className="gba:w-7 gba:h-7 gba:shrink-0">
                                      {employee?.pictureThumbnail && (
                                        <AvatarImage
                                          src={`data:image/gif;base64,${employee.pictureThumbnail}`}
                                          alt={employee.displayName || ''}
                                        />
                                      )}
                                      <AvatarFallback className="gba:text-[10px]">
                                        {getInitials(
                                          employee?.displayName || null,
                                          employee?.firstName || null,
                                          employee?.lastName || null
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="gba:flex-1 gba:min-w-0">
                                      <div className="gba:flex gba:items-center gba:gap-1 gba:mb-0.5">
                                        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:truncate">
                                          {employee?.displayName || employee?.firstName || 'Anonymous'}
                                        </span>
                                        <span className="gba:text-[10px] gba:text-muted-foreground gba:shrink-0">
                                          {formatRelativeTime(comment.createdAt)}
                                        </span>
                                      </div>
                                      <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">
                                        {stripHtmlAndTruncate(comment.content, 60)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Secondary News - 4 articles that fill the height */}
                  {secondaryNews.length > 0 && (
                    <div className="gba:flex-1 gba:flex gba:flex-col gba:gap-2">
                      {secondaryNews.map((item, index) => {
                        const translated = translatedItems?.[item.id || '']
                        return (
                          <button
                            key={item.id || `secondary-${index}`}
                            type="button"
                            onClick={() => handleArticleClick(item.id || '', 'news')}
                            className="gba:w-full gba:flex-1 gba:flex gba:gap-3 gba:p-2.5 gba:rounded-lg gba:bg-card gba:border gba:border-border gba:text-left gba:transition-all hover:gba:border-primary/50 hover:gba:bg-accent/50"
                            data-testid={`secondary-news-${index}`}
                          >
                            {item.picture && (
                              <ContentImage
                                picture={item.picture}
                                accessToken={accessToken || ''}
                                alt={item.title || ''}
                                className="gba:w-16 gba:h-14 gba:rounded-md gba:shrink-0"
                              />
                            )}
                            <div className="gba:flex-1 gba:min-w-0 gba:flex gba:flex-col gba:justify-center">
                              <h3 className="gba:font-semibold gba:text-foreground gba:line-clamp-2 gba:text-sm gba:leading-tight">
                                {translated?.title || item.title}
                              </h3>
                              <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:mt-1">
                                {item.creatorEmployee && (
                                  <span className="gba:truncate gba:max-w-[100px]">
                                    {item.creatorEmployee.displayName}
                                  </span>
                                )}
                                <span className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
                                  <Clock className="gba:w-3 gba:h-3" />
                                  {item.createdAt ? formatRelativeTime(item.createdAt) : ''}
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="gba:text-center gba:py-8 gba:text-muted-foreground">{t('no_news_found')}</div>
              )}

              {/* More News Row */}
              {moreNews.length > 0 && (
                <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:mt-4">
                  {moreNews.map((item, index) => {
                    const translated = translatedItems?.[item.id || '']
                    return (
                      <ContentCard
                        key={item.id || `more-news-${index}`}
                        item={item}
                        variant="news"
                        currentTab="news"
                        accessToken={accessToken}
                        userInfo={userInfo}
                        allowedReactions={allowedReactions}
                        reactionCatalogMap={reactionCatalogMap}
                        onReactionsRefetch={refetchNews}
                        translatedTitle={translated?.title}
                        translatedPreview={translated?.preview}
                        simpleReactions
                      />
                    )
                  })}
                </div>
              )}
            </section>

            {/* KNOWLEDGE SECTION - Organized by Content Types */}
            <section data-testid="home-knowledge-section">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:flex gba:items-center gba:gap-2">
                  <BookOpen className="gba:w-4 gba:h-4" />
                  {t('knowledge')}
                </h3>
                <Button variant="ghost" size="sm" onClick={handleNavigateToKnowledge} className="gba:text-xs">
                  {t('all_articles')} <ChevronRight className="gba:w-3 gba:h-3 gba:ml-1" />
                </Button>
              </div>

              {/* Show skeleton if knowledge query hasn't completed yet */}
              {!knowledgeQueryCompleted ? (
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="gba:space-y-3">
                      <Skeleton className="gba:h-40 gba:w-full gba:rounded-lg" />
                      <Skeleton className="gba:h-4 gba:w-24" />
                      <Skeleton className="gba:h-5 gba:w-full" />
                      <div className="gba:space-y-2">
                        <Skeleton className="gba:h-3 gba:w-full" />
                        <Skeleton className="gba:h-3 gba:w-4/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : knowledgeByType.length > 0 ? (
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-6">
                  {knowledgeByType.map(({ type, articles }) => {
                    const heroArticle = articles[0]
                    const otherArticles = articles.slice(1)
                    const heroTranslated = translatedItems?.[heroArticle?.id || '']

                    return (
                      <div
                        key={type.id}
                        className="gba:space-y-3"
                        data-testid={`knowledge-type-${type.code || type.id}`}
                      >
                        {/* Type Hero Image */}
                        <button
                          type="button"
                          onClick={() => handleArticleClick(heroArticle?.id || '', 'knowledge')}
                          className="gba:w-full gba:aspect-[4/3] gba:relative gba:rounded-lg gba:overflow-hidden gba:group"
                        >
                          {heroArticle?.picture ? (
                            <ContentImage
                              picture={heroArticle.picture}
                              accessToken={accessToken || ''}
                              alt={heroArticle.title || ''}
                              className="gba:absolute gba:inset-0 gba:w-full gba:h-full"
                            />
                          ) : (
                            <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary/20 gba:to-primary/5" />
                          )}
                          <div className="gba:absolute gba:inset-0 gba:bg-black/20 group-hover:gba:bg-black/30 gba:transition-colors" />
                        </button>

                        {/* Content Type Name */}
                        <h4 className="gba:text-sm gba:font-bold gba:text-primary gba:uppercase gba:tracking-wide">
                          {type.value}
                        </h4>

                        {/* Hero Article Title */}
                        <button
                          type="button"
                          onClick={() => handleArticleClick(heroArticle?.id || '', 'knowledge')}
                          className="gba:text-left gba:w-full"
                        >
                          <h5 className="gba:font-semibold gba:text-foreground gba:line-clamp-2 hover:gba:text-primary gba:transition-colors gba:mb-1">
                            {heroTranslated?.title || heroArticle?.title}
                          </h5>
                          {(getReactionCount(heroArticle) > 0 || getCommentCount(heroArticle) > 0) && (
                            <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                              {getReactionCount(heroArticle) > 0 && (
                                <span className="gba:flex gba:items-center gba:gap-1">
                                  <ThumbsUp className="gba:w-3 gba:h-3" />
                                  {getReactionCount(heroArticle)}
                                </span>
                              )}
                              {getCommentCount(heroArticle) > 0 && (
                                <span className="gba:flex gba:items-center gba:gap-1">
                                  <MessageCircle className="gba:w-3 gba:h-3" />
                                  {getCommentCount(heroArticle)}
                                </span>
                              )}
                            </div>
                          )}
                        </button>

                        {/* Other Articles as Links */}
                        {otherArticles.length > 0 && (
                          <div className="gba:space-y-1.5">
                            {otherArticles.map((article, idx) => {
                              const translated = translatedItems?.[article.id || '']
                              return (
                                <button
                                  key={article.id || `other-${idx}`}
                                  type="button"
                                  onClick={() => handleArticleClick(article.id || '', 'knowledge')}
                                  className="gba:block gba:w-full gba:text-left gba:text-sm gba:text-primary hover:gba:underline gba:line-clamp-1"
                                  data-testid={`knowledge-article-${idx}`}
                                >
                                  {translated?.title || article.title}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : knowledgeEntries.length > 0 ? (
                // Fallback to simple grid if no content types
                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  {knowledgeEntries.slice(0, 4).map((item, index) => {
                    const translated = translatedItems?.[item.id || '']
                    return (
                      <ContentCard
                        key={item.id || `knowledge-${index}`}
                        item={item}
                        variant="knowledge"
                        currentTab="knowledge"
                        accessToken={accessToken}
                        userInfo={userInfo}
                        allowedReactions={allowedReactions}
                        reactionCatalogMap={reactionCatalogMap}
                        onReactionsRefetch={refetchKnowledge}
                        translatedTitle={translated?.title}
                        translatedPreview={translated?.preview}
                        simpleReactions
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="gba:text-center gba:py-8 gba:text-muted-foreground">{t('no_knowledge_found')}</div>
              )}
            </section>

            {/* Q&A SECTION - Compact List */}
            <section data-testid="home-questions-section">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:flex gba:items-center gba:gap-2">
                  <MessageCircleQuestion className="gba:w-4 gba:h-4" />
                  {t('questions')}
                </h3>
                <Button variant="ghost" size="sm" onClick={handleNavigateToQuestions} className="gba:text-xs">
                  {t('all_articles')} <ChevronRight className="gba:w-3 gba:h-3 gba:ml-1" />
                </Button>
              </div>

              {/* Q&A section skeleton while loading */}
              {questionsLoading ? (
                <Card className="gba:p-4">
                  <div className="gba:space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="gba:h-12 gba:w-full" />
                    ))}
                  </div>
                </Card>
              ) : questionEntries.length > 0 ? (
                <Card className="gba:divide-y gba:divide-border">
                  {questionEntries.map((item, index) => {
                    const translated = translatedItems?.[item.id || '']
                    const answerCount = item.childContentEntriesAggregate?.aggregate?.count || 0
                    return (
                      <button
                        key={item.id || `question-${index}`}
                        type="button"
                        onClick={() => handleArticleClick(item.id || '', 'questions')}
                        className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-4 gba:text-left gba:transition-colors hover:gba:bg-accent/50"
                        data-testid={`home-question-${index}`}
                      >
                        <div className="gba:flex-1 gba:min-w-0 gba:pr-4">
                          <h4 className="gba:font-medium gba:text-foreground gba:line-clamp-1 gba:text-sm">
                            {translated?.title || item.title}
                          </h4>
                          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                            {item.createdAt ? formatRelativeTime(item.createdAt) : ''} • {answerCount}{' '}
                            {t('answers') || 'answers'}
                          </p>
                        </div>
                        <ArrowRight className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:shrink-0" />
                      </button>
                    )
                  })}
                </Card>
              ) : (
                <div className="gba:text-center gba:py-8 gba:text-muted-foreground">{t('no_questions_found')}</div>
              )}
            </section>
          </div>

          {/* Sidebar - Trending/Recent Timeline */}
          {/* NOTE: Cap sidebar width to avoid it swallowing the main column if md width rules are missing */}
          <aside className="gba:w-full gba:max-w-80 gba:shrink-0 gba:md:sticky gba:md:top-4 gba:md:self-start gba:space-y-6">
            <Card className="gba:p-4">
              <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-4 gba:flex gba:items-center gba:gap-2">
                <Clock className="gba:w-4 gba:h-4" />
                {t('trending_now') || 'Trending'}
              </h3>

              {/* Show skeleton if recent query hasn't completed yet */}
              {!recentQueryCompleted ? (
                <div className="gba:space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="gba:flex gba:gap-3">
                      <Skeleton className="gba:w-10 gba:h-10 gba:shrink-0" />
                      <div className="gba:flex-1 gba:space-y-1">
                        <Skeleton className="gba:h-4 gba:w-full" />
                        <Skeleton className="gba:h-3 gba:w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentEntries.length > 0 ? (
                <div className="gba:space-y-1">
                  {recentEntries.map((item, index) => {
                    const translated = translatedItems?.[item.id || '']
                    const tabForItem =
                      item.contentGroup === ContentGroup.QUESTION
                        ? 'questions'
                        : item.contentGroup === ContentGroup.KNOWLEDGE
                          ? 'knowledge'
                          : 'news'
                    return (
                      <button
                        key={item.id || `recent-${index}`}
                        type="button"
                        onClick={() => handleArticleClick(item.id || '', tabForItem)}
                        className="gba:w-full gba:flex gba:gap-3 gba:p-2 gba:rounded-lg gba:text-left gba:transition-colors hover:gba:bg-accent/50 gba:-mx-2"
                        data-testid={`trending-item-${index}`}
                      >
                        <div className="gba:w-12 gba:shrink-0 gba:text-right gba:pr-1">
                          <span className="gba:text-sm gba:font-semibold gba:text-muted-foreground gba:tabular-nums">
                            {formatRelativeTime(item.createdAt || '')}
                          </span>
                        </div>
                        <div className="gba:flex-1 gba:min-w-0 gba:border-l gba:border-border gba:pl-3">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <Badge variant={getGroupBadgeVariant(item.contentGroup)} className="gba:text-[10px]">
                              {getGroupLabel(item.contentGroup)}
                            </Badge>
                            {(getReactionCount(item) > 0 || getCommentCount(item) > 0) && (
                              <div className="gba:flex gba:items-center gba:gap-2 gba:text-[10px] gba:text-muted-foreground">
                                {getReactionCount(item) > 0 && (
                                  <span className="gba:flex gba:items-center gba:gap-0.5">
                                    <ThumbsUp className="gba:w-2.5 gba:h-2.5" />
                                    {getReactionCount(item)}
                                  </span>
                                )}
                                {getCommentCount(item) > 0 && (
                                  <span className="gba:flex gba:items-center gba:gap-0.5">
                                    <MessageCircle className="gba:w-2.5 gba:h-2.5" />
                                    {getCommentCount(item)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:line-clamp-2">
                            {translated?.title || item.title}
                          </h4>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="gba:text-center gba:py-4 gba:text-sm gba:text-muted-foreground">
                  {t('no_trending_content') || 'No trending content'}
                </div>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default React.memo(HomeView, (prevProps, nextProps) => {
  if (prevProps.accessToken !== nextProps.accessToken) return false
  if (prevProps.currentTab !== nextProps.currentTab) return false
  if (prevProps.targetLanguage !== nextProps.targetLanguage) return false
  if (prevProps.allowedReactions?.join(',') !== nextProps.allowedReactions?.join(',')) return false
  if (JSON.stringify(prevProps.reactionCatalogMap) !== JSON.stringify(nextProps.reactionCatalogMap)) return false
  if (JSON.stringify(prevProps.translatedItems) !== JSON.stringify(nextProps.translatedItems)) return false
  if (prevProps.userInfo?.id !== nextProps.userInfo?.id) return false
  if (prevProps.hideBanner !== nextProps.hideBanner) return false
  return true
})
