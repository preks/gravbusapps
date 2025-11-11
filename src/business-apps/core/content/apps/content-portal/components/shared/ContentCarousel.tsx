import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import type { IntranetContent } from '@/common/data/content/mappers/contentMappers'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, MessageCircle, Share2 } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ReactionPicker } from '@/common/components/content'
import { Button } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ShareDialog } from '@/components/share-dialog'
import { getEntityTypeFromTab, buildContentRecordUrl } from '@/business-apps/core/content/utils/shareUtils'
import { buildReactionSummaryFromCounts } from '@/common/data/content/utils/reactionUtils'

interface ContentCarouselProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  articles: IntranetContent[]
  className?: string
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
  onReactionsRefetch?: () => void
}

const ContentCarousel: React.FC<ContentCarouselProps> = ({
  articles,
  className = '',
  currentTab,
  accessToken,
  userInfo,
  allowedReactions,
  reactionCatalogMap,
  onReactionsRefetch
}) => {
  const { t } = useTranslation('content')
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [autoplay, setAutoplay] = useState<boolean>(true)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<IntranetContent | null>(null)
  const carouselArticles = [...articles].reverse()

  const getInitials = useMemo(
    () => (name: string | null) => {
      if (!name) return 'NA'
      return name
        .split(' ')
        .slice(0, 2)
        .map(word => word.charAt(0).toUpperCase())
        .join('')
    },
    []
  )

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const pauseAutoplay = useCallback(() => {
    setAutoplay(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const playAutoplay = useCallback(() => {
    setAutoplay(true)
  }, [])

  useEffect(() => {
    if (autoplay && carouselArticles.length > 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      intervalRef.current = setInterval(() => {
        setActiveIndex(prev => (prev === carouselArticles.length - 1 ? 0 : prev + 1))
      }, 5000)
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }
  }, [autoplay, carouselArticles.length])

  useEffect(() => {
    if (!autoplay) {
      const timer = setTimeout(() => {
        playAutoplay()
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [autoplay, playAutoplay])

  if (carouselArticles.length === 0) {
    return null
  }

  const formatArticleDate = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return ''
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const handleArticleClick = (article: IntranetContent) => {
    const url = buildPlatformUrl('/platform/content/intranet/content-record', {
      contentId: article.articleId,
      ...(currentTab && { tab: currentTab })
    })
    navigateTo(url)
  }

  const handleShare = (e: React.MouseEvent, article: IntranetContent) => {
    e.stopPropagation()
    setSelectedArticle(article)
    setShareDialogOpen(true)
  }

  const entityType = selectedArticle ? getEntityTypeFromTab(currentTab) : null
  const entityDisplayUrl = selectedArticle ? buildContentRecordUrl(selectedArticle.articleId, currentTab) : ''

  return (
    <div
      className={`gba:bg-card gba:rounded-lg gba:shadow-md gba:mb-10 gba:overflow-hidden ${className}`}
      onMouseEnter={pauseAutoplay}
      onTouchStart={pauseAutoplay}
    >
      <div className="gba:relative">
        <div className="gba:overflow-hidden">
          <div
            className="gba:flex gba:transition-transform gba:duration-500 gba:ease-in-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {carouselArticles.map(article => (
              <div key={article.articleId} className="gba:min-w-full">
                <div
                  className="gba:relative gba:flex gba:flex-row gba:py-6 gba:px-14 gba:gap-6 gba:cursor-pointer"
                  onClick={() => handleArticleClick(article)}
                >
                  <div className="gba:w-2/5 gba:h-64 gba:overflow-hidden gba:rounded-lg gba:shrink-0 gba:relative">
                    {article.contentImage ? (
                      <img
                        src={article.contentImage}
                        alt={article.title}
                        className="gba:w-full gba:h-full gba:object-cover gba:transition-transform gba:hover:scale-105 gba:duration-300"
                      />
                    ) : (
                      <div className="gba:w-full gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-gradient-to-r gba:from-[#376399] gba:to-[#648eca]">
                        <span className="gba:text-4xl gba:font-bold gba:text-white gba:mb-2">
                          {getInitials(article.authorFullName)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="gba:flex gba:flex-col gba:w-3/5 gba:justify-between">
                    <div>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2 gba:text-sm gba:text-muted-foreground">
                        <span>{formatArticleDate(article.createdAt ?? '')}</span>
                        {article.tagNames && article.tagNames.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="gba:bg-blue-50 gba:text-blue-700 gba:px-2 gba:py-0.5 gba:rounded-full">
                              {article.tagNames[0]}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-3 gba:line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="gba:text-muted-foreground gba:line-clamp-3 gba:md:line-clamp-4 gba:mb-4">
                        {article.previewText || article.content?.substring(0, 150)}
                      </p>
                    </div>
                    <div className="gba:flex gba:items-center gba:mb-3">
                      {article.authorFullName && (
                        <span className="gba:text-sm gba:text-muted-foreground">
                          {t('by')} {article.authorFullName}
                        </span>
                      )}
                    </div>

                    {/* Stats - Reactions, Comments, Share */}
                    <div className="gba:flex gba:items-center gba:gap-4 gba:pt-3 gba:border-t gba:border-border">
                      {article.allowReaction && accessToken && (
                        <div onClick={e => e.stopPropagation()}>
                          <ReactionPicker
                            contentEntryId={article.articleId}
                            reactionSummary={buildReactionSummaryFromCounts(article, userInfo?.id)}
                            allowReaction={article.allowReaction}
                            accessToken={accessToken}
                            employeeId={userInfo?.employeeDetails?.employeeId || ''}
                            onSuccess={onReactionsRefetch}
                            size="sm"
                            allowedReactions={allowedReactions}
                            reactionCatalogMap={reactionCatalogMap}
                            data-testid={`carousel-reaction-${article.articleId}`}
                          />
                        </div>
                      )}
                      {article.allowComment && (
                        <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                          <MessageCircle className="gba:w-4 gba:h-4" />
                          <span>{article.commentsCount || 0}</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:ml-auto gba:p-1 gba:h-auto"
                        onClick={e => handleShare(e, article)}
                        data-testid={`carousel-share-${article.articleId}`}
                      >
                        <Share2 className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          className="gba:absolute gba:top-1/2 gba:left-2 gba:transform gba:-translate-y-1/2 gba:bg-white/80 gba:rounded-full gba:p-2 gba:shadow-md gba:z-10 focus:gba:outline-none gba:hover:bg-white gba:transition-colors"
          onClick={() => {
            pauseAutoplay()
            setActiveIndex(prev => (prev === 0 ? carouselArticles.length - 1 : prev - 1))
          }}
          aria-label="Previous slide"
        >
          <ChevronLeft className="gba:h-5 gba:w-5" />
        </button>
        <button
          className="gba:absolute gba:top-1/2 gba:right-2 gba:transform gba:-translate-y-1/2 gba:bg-white/80 gba:rounded-full gba:p-2 gba:shadow-md gba:z-10 focus:gba:outline-none gba:hover:bg-white gba:transition-colors"
          onClick={() => {
            pauseAutoplay()
            setActiveIndex(prev => (prev === carouselArticles.length - 1 ? 0 : prev + 1))
          }}
          aria-label="Next slide"
        >
          <ChevronRight className="gba:h-5 gba:w-5" />
        </button>
        {/* Dot indicators */}
        <div className="gba:flex gba:justify-center gba:gap-2 gba:my-4">
          {carouselArticles.map((_, index) => (
            <button
              key={`article-dot-${index}`}
              className={`gba:h-2 gba:rounded-full focus:gba:outline-none gba:transition-all ${
                index === activeIndex ? 'gba:w-6 gba:bg-primary' : 'gba:w-2 gba:bg-muted'
              }`}
              onClick={() => {
                pauseAutoplay()
                setActiveIndex(index)
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
      {entityType && selectedArticle && userInfo?.id && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          accessToken={accessToken}
          currentUserId={userInfo.id}
          entityType={entityType}
          entityId={selectedArticle.articleId}
          entityName={selectedArticle.title}
          entityDisplayUrl={entityDisplayUrl}
        />
      )}
    </div>
  )
}

export default ContentCarousel
