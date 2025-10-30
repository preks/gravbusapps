import React, { useState, useMemo } from 'react'
import { useTranslation, Button, Alert, AlertTitle, AlertDescription, Badge } from '@newwork/nw-design-system'
import { MessageCircle, ThumbsUp, ThumbsDown, Eye } from 'lucide-react'
import { useContentEntries, toIntranetContent, useUserContentReactions } from '@/common/data/content'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import { buildReactionPayload } from '@/common/data/content/payloads'
import SearchInput from '../../components/shared/SearchInput'
import NavigationTagList from '../../components/shared/NavigationTagList'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { AppAction } from '@/components/app-action'
import { AppActionProvider } from '@/components/app-action-provider'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { QUESTION_CATEGORIES, ALL_TAG, contentGroupMapper, QUESTION } from '../../constants/contentConstants'
import { updateTags } from '../../utils/contentUtils'
import translations from '../../_i18n'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { UserInfoProps } from '@/common/BusinessAppContext'

interface QuestionViewProps {
  accessToken?: string
  userInfo?: UserInfoProps
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const DEFAULT_PAGE_SIZE = 15
const NEXT_PAGE_SIZE = 10

const QuestionView: React.FC<QuestionViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'questions',
  reactionCatalogMap = {}
}) => {
  const { t } = useTranslation(translations)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<{ label: string; checked: boolean }[]>([
    { label: ALL_TAG, checked: true },
    ...QUESTION_CATEGORIES.map(category => ({ label: category, checked: false }))
  ])

  const employeeId = userInfo?.employeeDetails?.employeeId || ''

  // Find catalog IDs for +1 and -1 reactions from the map
  // The map has entries like: '+1' -> 'ContentReaction:v1:+1'
  const upvoteCatalogId = reactionCatalogMap['+1'] || ''
  const downvoteCatalogId = reactionCatalogMap['-1'] || ''

  const offset = page === 1 ? 0 : DEFAULT_PAGE_SIZE + (page - 2) * NEXT_PAGE_SIZE
  const limit = page === 1 ? DEFAULT_PAGE_SIZE : NEXT_PAGE_SIZE

  // Memoize params to prevent infinite re-renders
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: contentGroupMapper[QUESTION],
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
    accessToken: accessToken || ''
  })

  // Convert to legacy format
  const data = useMemo(() => entries.map(toIntranetContent), [entries])

  const hasMore = entries.length > 0 && entries.length < totalCount

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
                externalContextData={{ contentGroup: contentGroupMapper[QUESTION] }}
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
          {data.map(question => {
            const votes = getVoteCounts(question.articleId)
            return (
              <div
                key={question.articleId}
                className="gba:bg-card gba:rounded-lg gba:shadow-sm hover:gba:shadow-md gba:transition gba:border gba:border-border gba:p-6 gba:cursor-pointer"
                onClick={() => handleQuestionClick(question)}
                data-testid={`question-item-${question.articleId}`}
              >
                <div className="gba:flex gba:gap-4">
                  {/* Vote section */}
                  <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:min-w-[80px]">
                    {/* Upvote button */}
                    <AppActionProvider
                      contextsArray={[FlowContextName.contentEntryReact]}
                      externalContextData={{ contentEntryId: question.articleId }}
                      accessToken={accessToken || ''}
                      onSuccess={handleVoteSuccess}
                      transformData={() => {
                        if (!upvoteCatalogId) {
                          throw new Error('Upvote catalog entry not found')
                        }
                        return buildReactionPayload({
                          contentEntryId: question.articleId,
                          catalogEntryId: upvoteCatalogId,
                          employeeId,
                          existingReactionId: votes.userReactionId,
                          existingCatalogEntryId: votes.userCatalogId,
                          existingVersion: votes.userVersion
                        })
                      }}
                    >
                      {({ executeAction, isLoading }) => (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`gba:h-8 gba:w-8 gba:p-0 ${
                            votes.userVote === 'upvote'
                              ? 'gba:text-success gba:hover:bg-success-secondary'
                              : 'gba:text-muted-foreground gba:hover:text-success gba:hover:bg-accent'
                          }`}
                          onClick={e => {
                            e.stopPropagation()
                            executeAction({})
                          }}
                          disabled={isLoading}
                          data-testid={`question-upvote-${question.articleId}`}
                        >
                          <ThumbsUp className="gba:w-5 gba:h-5" />
                        </Button>
                      )}
                    </AppActionProvider>

                    {/* Vote count */}
                    <span
                      className={`gba:font-bold gba:text-xl ${
                        votes.score > 0
                          ? 'gba:text-success'
                          : votes.score < 0
                            ? 'gba:text-destructive'
                            : 'gba:text-foreground'
                      }`}
                    >
                      {votes.score}
                    </span>

                    {/* Downvote button */}
                    <AppActionProvider
                      contextsArray={[FlowContextName.contentEntryReact]}
                      externalContextData={{ contentEntryId: question.articleId }}
                      accessToken={accessToken || ''}
                      onSuccess={handleVoteSuccess}
                      transformData={() => {
                        if (!downvoteCatalogId) {
                          throw new Error('Downvote catalog entry not found')
                        }
                        return buildReactionPayload({
                          contentEntryId: question.articleId,
                          catalogEntryId: downvoteCatalogId,
                          employeeId,
                          existingReactionId: votes.userReactionId,
                          existingCatalogEntryId: votes.userCatalogId,
                          existingVersion: votes.userVersion
                        })
                      }}
                    >
                      {({ executeAction, isLoading }) => (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`gba:h-8 gba:w-8 gba:p-0 ${
                            votes.userVote === 'downvote'
                              ? 'gba:text-destructive gba:hover:bg-destructive-secondary'
                              : 'gba:text-muted-foreground gba:hover:text-destructive gba:hover:bg-accent'
                          }`}
                          onClick={e => {
                            e.stopPropagation()
                            executeAction({})
                          }}
                          disabled={isLoading}
                          data-testid={`question-downvote-${question.articleId}`}
                        >
                          <ThumbsDown className="gba:w-5 gba:h-5" />
                        </Button>
                      )}
                    </AppActionProvider>
                  </div>

                  {/* Question content */}
                  <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                      <Badge variant={getStatusVariant(question.status)} className="gba:text-xs">
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
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <Eye className="gba:w-4 gba:h-4" />
                        <span>
                          {question.feedbacksCount || 0} {t('views')}
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
          })}
        </div>

        {hasMore && (
          <div className="gba:flex gba:justify-center gba:w-full gba:mt-6 gba:mb-4">
            <Button
              variant="default"
              className="gba:w-[280px]"
              onClick={loadMore}
              disabled={isLoading}
              data-testid="question-view-load-more"
            >
              {t('load_more')}
            </Button>
          </div>
        )}

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
