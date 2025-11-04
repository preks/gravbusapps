import React, { useState, useMemo } from 'react'
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
import { MessageCircle } from 'lucide-react'
import { useContentEntries, toIntranetContent, useUserContentReactions } from '@/common/data/content'
import { ContentRole, ContentGroup } from '@/common/data/content/types/contentEnums'
import { VoteButtons, type VoteState } from '@/common/components/common-content'
import SearchInput from '../../components/shared/SearchInput'
import NavigationTagList from '../../components/shared/NavigationTagList'
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

// Local constants
const ALL_TAG = 'All'
const PAGE_SIZE = 20

interface QuestionViewProps {
  accessToken?: string
  userInfo?: UserInfoProps
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const QuestionView: React.FC<QuestionViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'questions',
  reactionCatalogMap = {}
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

  // Build categories from ContentTypes
  const categories = useMemo(() => {
    const allTag = { label: ALL_TAG, checked: selectedContentTypeRef === null }
    const typeTags = contentTypes.map(type => ({
      label: type.value || 'Unnamed',
      checked: selectedContentTypeRef === type.id
    }))
    return [allTag, ...typeTags]
  }, [contentTypes, selectedContentTypeRef])

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

  // Use central content data - FIXED: correct parameter order
  // Use childCount for Questions (only direct answers, not nested replies)
  const { entries, totalCount, isLoading, error, refetch } = useContentEntries(queryParams, accessToken, true)

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

  // Convert to legacy format
  const data = useMemo(() => entries.map(toIntranetContent), [entries])

  const hasMore = entries.length > 0 && entries.length < totalCount

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

  const handleCategoryClick = (label: string) => {
    if (label === ALL_TAG) {
      setSelectedContentTypeRef(null)
    } else {
      const selectedType = contentTypes.find(type => type.value === label)
      setSelectedContentTypeRef(selectedType?.id || null)
    }
    setLoadedCount(PAGE_SIZE)
  }

  const handleQuestionClick = (question: any) => {
    const url = buildPlatformUrl('/platform/content/intranet/content-record', {
      contentId: question.articleId,
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
              <SearchInput onSearch={handleSearch} placeholder={t('search_questions')} />
              <AppAction
                contextsArray={[FlowContextName.contentEntryCreate]}
                externalContextData={{ contentGroup: ContentGroup.QUESTION }}
                accessToken={accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
                data-testid="question-view-create-button"
              >
                <Button>{t('ask_question')}</Button>
              </AppAction>
            </div>
          </div>
        </div>

        <div className="gba:space-y-4 gba:mb-8">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i} className="gba:p-6">
                  <div className="gba:flex gba:gap-4">
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                      <Skeleton className="gba:h-8 gba:w-12" />
                      <Skeleton className="gba:h-6 gba:w-12" />
                    </div>
                    <div className="gba:flex-1 gba:space-y-3">
                      <Skeleton className="gba:h-6 gba:w-3/4" />
                      <Skeleton className="gba:h-4 gba:w-full" />
                      <Skeleton className="gba:h-4 gba:w-2/3" />
                      <div className="gba:flex gba:gap-4 gba:mt-4">
                        <Skeleton className="gba:h-4 gba:w-24" />
                        <Skeleton className="gba:h-4 gba:w-24" />
                        <Skeleton className="gba:h-4 gba:w-24" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          ) : (
            data.map(question => {
              const votes: VoteState = getVoteCounts(question.articleId)
              return (
                <div
                  key={question.articleId}
                  className="gba:bg-card gba:rounded-lg gba:shadow-sm hover:gba:shadow-md gba:transition gba:border gba:border-border gba:p-6 gba:cursor-pointer"
                  onClick={() => handleQuestionClick(question)}
                  data-testid={`question-item-${question.articleId}`}
                >
                  <div className="gba:flex gba:gap-4">
                    {/* Vote section */}
                    <div onClick={e => e.stopPropagation()}>
                      <VoteButtons
                        contentEntryId={question.articleId}
                        initialVoteState={votes}
                        upvoteCatalogId={upvoteCatalogId}
                        downvoteCatalogId={downvoteCatalogId}
                        accessToken={accessToken || ''}
                        employeeId={employeeId}
                        size="md"
                        onVoteComplete={handleVoteSuccess}
                        data-testid={`question-vote-${question.articleId}`}
                      />
                    </div>

                    {/* Question content */}
                    <div className="gba:flex-1">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                        <Badge variant={getStatusVariant(question.status || '')} className="gba:text-xs">
                          {question.status || 'OPEN'}
                        </Badge>
                        {question.tagNames?.slice(0, 3).map((tag: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="gba:text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <h3 className="gba:text-xl gba:font-bold gba:text-foreground gba:mb-2 hover:gba:text-primary gba:transition">
                        {question.title}
                      </h3>

                      <p className="gba:text-muted-foreground gba:mb-4 gba:line-clamp-2">{question.previewText}</p>

                      <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <MessageCircle className="gba:w-4 gba:h-4" />
                          <span>
                            {question.commentsCount || 0} {t('answers')}
                          </span>
                        </div>
                        <span>•</span>
                        <span>
                          {t('asked_by')} {question.authorFullName || 'Unknown'}
                        </span>
                        {question.createdAtText && (
                          <>
                            <span>•</span>
                            <span>{question.createdAtText}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

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
  )
}

export default QuestionView
