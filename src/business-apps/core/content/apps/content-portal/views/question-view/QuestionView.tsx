import React, { useState, useMemo, useEffect } from 'react'
import {
  useTranslation,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge,
  Skeleton,
  Card
} from '@newwork/nw-design-system'
import { MessageCircle, Folder, ChevronRight, HelpCircle, CheckCircle, Share2 } from 'lucide-react'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { useUserContentReactions } from '@/common/data/content/hooks/useUserContentReactions'
import { ContentRole, ContentGroup } from '@/common/data/content/types/contentEnums'
import { VoteButtons, type VoteState } from '@/common/components/content'
import { EmployeeHoverCard } from '@/common/components/employee'
import SearchInput from '../../components/shared/SearchInput'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useContentTypes } from '../../hooks/useContentTypes'
import { useCatalogEntries } from '@/common/data/catalog'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useInfiniteScroll } from '@/common/hooks/useInfiniteScroll'
import translations from '../../_i18n'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { getEntityTypeFromContentGroup, buildContentRecordUrl } from '@/business-apps/core/content/utils/shareUtils'

// Local constants
const PAGE_SIZE = 20

interface QuestionViewProps {
  accessToken?: string
  userInfo?: UserInfoProps
  hideBanner?: boolean
  currentTab?: string
  reactionCatalogMap?: Record<string, string>
  targetLanguage?: string | null
  translatedItems?: Record<string, { id: string; title?: string; preview?: string }>
  onTranslate?: (items: any[], targetLanguage: string) => Promise<void>
}

const QuestionView: React.FC<QuestionViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'questions',
  reactionCatalogMap = {},
  targetLanguage,
  translatedItems,
  onTranslate
}) => {
  const { t } = useTranslation(translations)
  const [loadedCount, setLoadedCount] = useState(PAGE_SIZE)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContentTypeRef, setSelectedContentTypeRef] = useState<string | null>(null)

  const employeeId = userInfo?.employeeDetails?.employeeId || ''

  // Fetch ContentGroup QUESTION entry to get its ID
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: accessToken || '' })
  const [questionGroupId, setQuestionGroupId] = useState<string | null>(null)

  // Load QUESTION ContentGroup ID
  React.useEffect(() => {
    const loadQuestionGroupId = async () => {
      try {
        const result = await fetchCatalogEntriesByIdentifier('ContentGroup', {
          limit: 1,
          offset: 0
        })
        const questionEntry = result.entries.find(entry => entry.code === 'QUESTION')
        if (questionEntry) {
          setQuestionGroupId(questionEntry.id)
        }
      } catch (err) {
        console.error('Error loading QUESTION group ID:', err)
      }
    }
    if (accessToken) {
      loadQuestionGroupId()
    }
  }, [accessToken, fetchCatalogEntriesByIdentifier])

  // Load ContentTypes for QUESTION
  const { types: contentTypes } = useContentTypes({ accessToken: accessToken || '' }, questionGroupId)

  // Find catalog IDs for +1 and -1 reactions from the map
  // The map has entries like: '+1' -> 'ContentReaction:v1:+1'
  const upvoteCatalogId = reactionCatalogMap['+1'] || ''
  const downvoteCatalogId = reactionCatalogMap['-1'] || ''

  // Memoize params to prevent infinite re-renders
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: ContentGroup.QUESTION,
      contentTypeRef: selectedContentTypeRef || undefined,
      search: searchQuery,
      limit: loadedCount,
      offset: 0,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const
    }),
    [searchQuery, loadedCount, selectedContentTypeRef]
  )

  // Memoize query options to prevent infinite re-renders
  const queryOptions = useMemo(
    () => ({
      fields: [
        'id',
        'title',
        'preview',
        'picture',
        'contentGroupRef',
        'contentTypeRef',
        'creatorEmployee',
        'contentGroup',
        'contentType',
        'createdAt',
        'contentEntryTags',
        'childContentEntries',
        'childContentEntriesAggregate',
        'contentEntryReactionCounts'
      ] as const
    }),
    []
  )

  // Use central content data - FIXED: correct parameter order
  // Questions use childContentEntriesAggregate (direct answers only, not nested replies)
  const { entries, totalCount, isLoading, error, refetch } = useContentEntries(queryParams, accessToken, queryOptions)

  // Batch fetch reactions
  const articleIds = useMemo(() => entries.map(entry => entry.id), [entries])
  const { reactionsByArticle, refetch: refetchReactions } = useUserContentReactions({
    contentEntryIds: articleIds,
    currentUserId: userInfo?.id,
    accessToken: accessToken || ''
  })

  // Listen for process completion to refresh data
  useProcessCompletion({
    onSuccess: () => {
      refetch()
      refetchReactions()
    }
  })

  // Use entries directly (no conversion needed)
  const data = entries

  const hasMore = entries.length > 0 && entries.length < totalCount

  // Collect all items for translation
  const allItems = useMemo(() => {
    return entries
  }, [entries])

  // Trigger translation when targetLanguage is set
  useEffect(() => {
    if (targetLanguage && onTranslate && allItems.length > 0) {
      onTranslate(allItems, targetLanguage)
    }
  }, [targetLanguage, allItems, onTranslate])

  // Infinite scroll
  const sentinelRef = useInfiniteScroll({
    onLoadMore: () => setLoadedCount(prev => prev + PAGE_SIZE),
    hasMore,
    isLoading
  })

  // Calculate vote counts for each question
  const getVoteCounts = (contentEntryId: string) => {
    const reactions = reactionsByArticle[contentEntryId] || {}
    let upvotes = 0
    let downvotes = 0
    let userVote: 'upvote' | 'downvote' | null = null
    let userReactionId: string | undefined
    let userCatalogId: string | undefined
    let userVersion: number | undefined

    Object.values(reactions).forEach(reaction => {
      if (reaction.catalogEntryId === upvoteCatalogId) {
        upvotes += reaction.count
        if (reaction.userReacted) {
          userVote = 'upvote'
          userReactionId = reaction.reactionId
          userCatalogId = reaction.catalogEntryId
          userVersion = reaction.version
        }
      } else if (reaction.catalogEntryId === downvoteCatalogId) {
        downvotes += reaction.count
        if (reaction.userReacted) {
          userVote = 'downvote'
          userReactionId = reaction.reactionId
          userCatalogId = reaction.catalogEntryId
          userVersion = reaction.version
        }
      }
    })

    return {
      upvotes,
      downvotes,
      score: upvotes - downvotes,
      userVote,
      userReactionId,
      userCatalogId,
      userVersion
    }
  }

  const handleVoteSuccess = () => {
    refetchReactions()
    refetch()
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setLoadedCount(PAGE_SIZE)
  }

  const handleCategoryClick = (categoryId: string | null) => {
    setSelectedContentTypeRef(categoryId)
    setLoadedCount(PAGE_SIZE)
  }

  const handleQuestionClick = (question: any) => {
    const url = buildPlatformUrl('/platform/content/intranet/content-record', {
      contentId: question.id,
      tab: currentTab
    })
    navigateTo(url)
  }

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'info' => {
    switch (status?.toLowerCase()) {
      case 'answered':
        return 'success'
      case 'open':
        return 'warning'
      case 'closed':
        return 'default'
      default:
        return 'info'
    }
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="question-view-error">
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
      data-testid="question-view"
    >
      {!hideBanner && (
        <div className="gba:w-full">
          <Banner
            variant={BannerVariant.QUESTION}
            title={t('question-welcome-title')}
            subtitle={t('question-welcome-subtitle')}
          />
        </div>
      )}

      <div className="gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4">
        {/* Header with Search */}
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
              <HelpCircle className="gba:w-8 gba:h-8 gba:text-primary" />
              <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">{t('question-welcome-title')}</h1>
            </div>
            <div className="gba:flex gba:gap-2 gba:items-center">
              <SearchInput onSearch={handleSearch} placeholder={t('search_questions')} className="gba:w-[300px]" />
              <AppAction
                contexts={[
                  {
                    context: FlowContextName.contentEntryCreate,
                    contextData: { contentGroup: ContentGroup.QUESTION }
                  }
                ]}
                accessToken={accessToken}
                emptyState="enable"
                lazyLoad
                data-testid="question-view-create-button"
              >
                <Button>{t('ask_question')}</Button>
              </AppAction>
            </div>
          </div>
        )}

        {/* Sidebar + Content Layout */}
        <div className="gba:grid gba:grid-cols-[260px_1fr] gba:gap-6">
          {/* Left Sidebar - Category Navigation */}
          <div className="gba:sticky gba:top-4 gba:h-fit">
            <Card className="gba:p-4">
              <h3 className="gba:text-sm gba:font-semibold gba:mb-4 gba:text-muted-foreground gba:uppercase">
                {t('categories')}
              </h3>
              <nav className="gba:space-y-1">
                <button
                  onClick={() => handleCategoryClick(null)}
                  className={`gba:w-full gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:rounded-md gba:text-sm gba:transition-colors ${
                    selectedContentTypeRef === null
                      ? 'gba:bg-primary gba:text-primary-foreground'
                      : 'gba:hover:bg-accent gba:text-foreground'
                  }`}
                  data-testid="question-category-all"
                >
                  <span className="gba:flex gba:items-center gba:gap-2">
                    <Folder className="gba:w-4 gba:h-4" />
                    All
                  </span>
                  <ChevronRight className="gba:w-4 gba:h-4" />
                </button>

                {contentTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleCategoryClick(type.id)}
                    className={`gba:w-full gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:rounded-md gba:text-sm gba:transition-colors ${
                      selectedContentTypeRef === type.id
                        ? 'gba:bg-primary gba:text-primary-foreground'
                        : 'gba:hover:bg-accent gba:text-foreground'
                    }`}
                    data-testid={`question-category-${type.code?.toLowerCase()}`}
                  >
                    <span className="gba:flex gba:items-center gba:gap-2">
                      <Folder className="gba:w-4 gba:h-4" />
                      {type.value}
                    </span>
                    <ChevronRight className="gba:w-4 gba:h-4" />
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Right Content - Questions List */}
          <div className="gba:space-y-4 gba:mb-8">
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5].map(i => (
                  <Card key={i} className="gba:p-4">
                    <div className="gba:flex gba:gap-3">
                      <div className="gba:flex gba:flex-col gba:items-center gba:gap-1">
                        <Skeleton className="gba:h-6 gba:w-10" />
                        <Skeleton className="gba:h-5 gba:w-10" />
                      </div>
                      <div className="gba:flex-1 gba:space-y-2">
                        <Skeleton className="gba:h-5 gba:w-3/4" />
                        <Skeleton className="gba:h-3 gba:w-full" />
                        <Skeleton className="gba:h-3 gba:w-2/3" />
                        <div className="gba:flex gba:gap-3 gba:mt-3">
                          <Skeleton className="gba:h-3 gba:w-20" />
                          <Skeleton className="gba:h-3 gba:w-20" />
                          <Skeleton className="gba:h-3 gba:w-20" />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            ) : (
              data.map(question => {
                const votes: VoteState = getVoteCounts(question.id || '')
                const commentCount = question.childContentEntriesAggregate?.aggregate?.count || 0
                const hasAcceptedAnswer = question.childContentEntries?.some(answer => answer.accepted) || false
                const tagNames = question.contentEntryTags?.map(t => t.contentTag?.value).filter(Boolean) || []

                return (
                  <button
                    type="button"
                    key={question.id}
                    className="gba:bg-card gba:rounded-lg gba:shadow-sm hover:gba:shadow-md gba:transition gba:border gba:border-border gba:p-4 gba:cursor-pointer gba:w-full gba:text-left gba:bg-transparent"
                    onClick={() => handleQuestionClick(question)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleQuestionClick(question)
                      }
                    }}
                    data-testid={`question-item-${question.id}`}
                  >
                    <div className="gba:flex gba:gap-3">
                      {/* Vote section */}
                      <div
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <VoteButtons
                          contentEntryId={question.id || ''}
                          initialVoteState={votes}
                          upvoteCatalogId={upvoteCatalogId}
                          downvoteCatalogId={downvoteCatalogId}
                          accessToken={accessToken || ''}
                          employeeId={employeeId}
                          size="sm"
                          onVoteComplete={handleVoteSuccess}
                          data-testid={`question-vote-${question.id}`}
                        />
                      </div>

                      {/* Question content */}
                      <div className="gba:flex-1">
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                          {hasAcceptedAnswer && (
                            <Badge variant="success" className="gba:text-xs gba:flex gba:items-center gba:gap-1">
                              <CheckCircle className="gba:w-3 gba:h-3" />
                              Answered
                            </Badge>
                          )}
                          <Badge variant={getStatusVariant(question.contentType?.value || '')} className="gba:text-xs">
                            {question.contentType?.value || 'OPEN'}
                          </Badge>
                          {tagNames.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="gba:text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <h3 className="gba:text-lg gba:font-bold gba:text-foreground gba:mb-2 hover:gba:text-primary gba:transition">
                          {translatedItems?.[question.id || '']?.title || question.title}
                        </h3>

                        <p className="gba:text-sm gba:text-muted-foreground gba:mb-3 gba:line-clamp-2">
                          {translatedItems?.[question.id || '']?.preview || question.preview}
                        </p>

                        <div className="gba:flex gba:items-center gba:justify-between">
                          <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
                            <div className="gba:flex gba:items-center gba:gap-1">
                              <MessageCircle className="gba:w-4 gba:h-4" />
                              <span>
                                {commentCount} {t('answers')}
                              </span>
                            </div>
                            <span>•</span>
                            <span>
                              {t('asked_by')}{' '}
                              {question.creatorEmployee ? (
                                <EmployeeHoverCard employee={question.creatorEmployee}>
                                  <span className="gba:cursor-pointer hover:gba:text-primary hover:gba:underline">
                                    {question.creatorEmployee.displayName ||
                                      question.creatorEmployee.fullName ||
                                      'Unknown'}
                                  </span>
                                </EmployeeHoverCard>
                              ) : (
                                <span>Unknown</span>
                              )}
                            </span>
                            {question.createdAt && (
                              <>
                                <span>•</span>
                                <span>
                                  {new Date(question.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </>
                            )}
                          </div>
                          {(() => {
                            const entityType = getEntityTypeFromContentGroup(question.contentGroupRef)
                            return entityType ? (
                              <AppAction
                                variant="custom"
                                mode="button"
                                buttonSize="sm"
                                buttonVariant="ghost"
                                shareContext={{
                                  entityType,
                                  entityId: question.id || '',
                                  entityName: question.title || '',
                                  entityUrl: buildContentRecordUrl(question.id || '', currentTab)
                                }}
                                accessToken={accessToken}
                                className="gba:ml-auto gba:p-1 gba:h-auto"
                                onClick={e => e.stopPropagation()}
                                data-testid={`question-share-${question.id}`}
                              >
                                <Share2 className="gba:w-4 gba:h-4" />
                              </AppAction>
                            ) : null
                          })()}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}

            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={sentinelRef} className="gba:h-4" />}

            {!isLoading && data.length === 0 && (
              <div className="gba:text-center gba:py-12 gba:bg-card gba:rounded-lg gba:border gba:border-border">
                <MessageCircle className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
                <p className="gba:text-muted-foreground">{t('no_questions_found')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuestionView
