import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { ChevronLeft, ChevronRight, MessageCircle, Share2 } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ReactionPicker } from '@/common/components/content'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action'
import {
  getEntityTypeFromTab,
  getEntityTypeFromContentGroup,
  buildContentRecordUrl
} from '@/business-apps/core/content/utils/shareUtils'
import { buildReactionSummaryFromCounts } from '@/common/data/content/utils/reactionUtils'
import { ContentImage } from './ContentImage'
import { EmployeePopover } from '@/components/employee-popover'

interface ContentCarouselProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  articles: ContentEntry[]
  className?: string
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
  onReactionsRefetch?: () => void
  translatedItems?: Record<string, { id: string; title?: string; preview?: string }>
}

const ContentCarousel: React.FC<ContentCarouselProps> = ({
  articles,
  className = '',
  currentTab,
  accessToken,
  userInfo,
  allowedReactions,
  reactionCatalogMap,
  onReactionsRefetch,
  translatedItems
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [autoplay, setAutoplay] = useState<boolean>(true)
  const carouselArticles = [...articles].reverse()

  const getInitials = useMemo(
    () => (employee: ContentEntry['creatorEmployee']) => {
      if (!employee) return 'NA'
      const name = employee.displayName || employee.fullName
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
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const handleArticleClick = (article: ContentEntry) => {
    if (!article.id) return
    const url = buildPlatformUrl('/platform/content/intranet/content-record', {
      contentId: article.id,
      ...(currentTab && { tab: currentTab })
    })
    navigateTo(url)
  }

  return (
    <section
      className={`gba:bg-card gba:rounded-lg gba:shadow-md gba:mb-10 gba:overflow-hidden ${className}`}
      onMouseEnter={pauseAutoplay}
      onTouchStart={pauseAutoplay}
      aria-label="Content carousel"
    >
      <div className="gba:relative">
        <div className="gba:overflow-hidden">
          <div
            className="gba:flex gba:transition-transform gba:duration-500 gba:ease-in-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {carouselArticles.map(article => {
              const commentCount =
                article.descendantContentEntriesAggregate?.aggregate?.count ||
                article.childContentEntriesAggregate?.aggregate?.count ||
                0
              const tagNames = article.contentEntryTags?.map(t => t.contentTag?.value).filter(Boolean) || []

              return (
                <div key={article.id} className="gba:min-w-full">
                  <button
                    type="button"
                    className="gba:relative gba:flex gba:flex-row gba:py-6 gba:px-14 gba:gap-6 gba:cursor-pointer gba:w-full gba:text-left gba:bg-transparent gba:border-0 gba:p-0"
                    onClick={() => handleArticleClick(article)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleArticleClick(article)
                      }
                    }}
                  >
                    <div className="gba:w-2/5 gba:h-64 gba:overflow-hidden gba:rounded-lg gba:shrink-0 gba:relative">
                      {article.picture ? (
                        <ContentImage
                          picture={article.picture}
                          accessToken={accessToken!}
                          alt={article.title || ''}
                          className="gba:w-full gba:h-full gba:transition-transform gba:hover:scale-105 gba:duration-300"
                        />
                      ) : (
                        <div className="gba:w-full gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-gradient-to-r gba:from-[#376399] gba:to-[#648eca]">
                          <span className="gba:text-4xl gba:font-bold gba:text-white gba:mb-2">
                            {getInitials(article.creatorEmployee)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="gba:flex gba:flex-col gba:w-3/5 gba:justify-between">
                      <div>
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2 gba:text-sm gba:text-muted-foreground">
                          <span>{formatArticleDate(article.createdAt ?? '')}</span>
                          {tagNames.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="gba:bg-blue-50 gba:text-blue-700 gba:px-2 gba:py-0.5 gba:rounded-full">
                                {tagNames[0]}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-3 gba:line-clamp-2">
                          {translatedItems?.[article.id || '']?.title || article.title}
                        </h3>
                        <p className="gba:text-muted-foreground gba:line-clamp-3 gba:md:line-clamp-4 gba:mb-4">
                          {translatedItems?.[article.id || '']?.preview ||
                            article.preview ||
                            article.content?.substring(0, 150)}
                        </p>
                      </div>
                      <div className="gba:flex gba:items-center gba:mb-3">
                        {article.creatorEmployee && accessToken ? (
                          <EmployeePopover employee={article.creatorEmployee} accessToken={accessToken}>
                            <span className="gba:text-sm gba:text-muted-foreground gba:cursor-pointer hover:gba:text-primary hover:gba:underline">
                              {article.creatorEmployee.displayName || article.creatorEmployee.fullName}
                            </span>
                          </EmployeePopover>
                        ) : article.creatorEmployee ? (
                          <span className="gba:text-sm gba:text-muted-foreground">
                            {article.creatorEmployee.displayName || article.creatorEmployee.fullName}
                          </span>
                        ) : null}
                      </div>

                      {/* Stats - Reactions, Comments, Share */}
                      <div className="gba:flex gba:items-center gba:gap-4 gba:pt-3 gba:border-t gba:border-border">
                        {article.allowReaction && accessToken && (
                          <button
                            type="button"
                            onClick={e => e.stopPropagation()}
                            onKeyDown={e => e.stopPropagation()}
                            className="gba:bg-transparent gba:border-0 gba:p-0"
                          >
                            <ReactionPicker
                              contentEntryId={article.id || ''}
                              reactionSummary={buildReactionSummaryFromCounts(article, userInfo?.id)}
                              allowReaction={article.allowReaction}
                              accessToken={accessToken}
                              employeeId={userInfo?.employeeDetails?.employeeId || ''}
                              onSuccess={onReactionsRefetch}
                              allowedReactions={allowedReactions}
                              reactionCatalogMap={reactionCatalogMap}
                              data-testid={`carousel-reaction-${article.id}`}
                            />
                          </button>
                        )}
                        {article.allowComment && (
                          <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                            <MessageCircle className="gba:w-4 gba:h-4" />
                            <span>{commentCount}</span>
                          </div>
                        )}
                        {(() => {
                          const entityType =
                            getEntityTypeFromContentGroup(article.contentGroupRef) || getEntityTypeFromTab(currentTab)
                          return entityType ? (
                            <AppAction
                              variant="custom"
                              mode="button"
                              buttonSize="sm"
                              buttonVariant="ghost"
                              shareContext={{
                                entityType,
                                entityId: article.id || '',
                                entityName: article.title || '',
                                entityUrl: buildContentRecordUrl(article.id || '', currentTab)
                              }}
                              accessToken={accessToken}
                              className="gba:ml-auto gba:p-1 gba:h-auto"
                              onClick={e => e.stopPropagation()}
                              data-testid={`carousel-share-${article.id}`}
                            >
                              <Share2 className="gba:w-4 gba:h-4" />
                            </AppAction>
                          ) : null
                        })()}
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
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
          {carouselArticles.map((article, index) => (
            <button
              key={`article-dot-${article.id || index}`}
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
    </section>
  )
}

export default ContentCarousel
