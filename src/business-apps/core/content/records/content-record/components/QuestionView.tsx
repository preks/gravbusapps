import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslation, Badge, Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { MessageCircle, CheckCircle, Share2, ChevronDown, ChevronUp } from 'lucide-react'
import { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { useContentComments, CommentWithReplies } from '@/common/data/content/hooks/useContentComments'
import { useUserContentReactions } from '@/common/data/content/hooks/useUserContentReactions'
import { VoteButtons, type VoteState, type TranslatedTexts } from '@/common/components/content'
import { AcceptAnswerButton } from '@/common/components/content/AcceptAnswerButton'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action'
import { getEntityTypeFromContentGroup, buildContentRecordUrl } from '@/business-apps/core/content/utils/shareUtils'
import { ContentHtmlRenderer } from './ContentHtmlRenderer'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import CommentForm from './interactions/CommentForm'
import CommentItem from './interactions/CommentItem'
import AnswerForm from './AnswerForm'
import translations from '../_i18n'

dayjs.extend(relativeTime)

interface QuestionViewProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  reactionCatalogMap?: Record<string, string>
  targetLanguage?: string | null
  translatedTexts?: TranslatedTexts | null
  onTranslateComments?: (commentTexts: string[], targetLanguage: string) => Promise<string[]>
}

/**
 * Q&A Forum View for Questions with Answers and Voting
 */
const QuestionView: React.FC<QuestionViewProps> = ({
  item,
  accessToken,
  userId,
  employeeId,
  reactionCatalogMap = {},
  targetLanguage,
  translatedTexts,
  onTranslateComments
}) => {
  const { t } = useTranslation(translations)

  // Use translated texts if available, otherwise use original
  const displayTitle = translatedTexts?.title || item.title
  const displayPreview = translatedTexts?.preview || item.preview
  const displayContent = translatedTexts?.content || item.content

  const entityType = getEntityTypeFromContentGroup(item.contentGroup || '')
  const entityDisplayUrl = buildContentRecordUrl(item.id || '')
  const [expandedAnswerId, setExpandedAnswerId] = useState<string | null>(null)
  const [showAnswerForm, setShowAnswerForm] = useState(false)
  const [visibleCommentsPerAnswer, setVisibleCommentsPerAnswer] = useState<Record<string, number>>({})
  const [visibleRepliesPerComment, setVisibleRepliesPerComment] = useState<Record<string, number>>({})
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [translatedAnswers, setTranslatedAnswers] = useState<Record<string, string>>({})
  const [translatedAnswerComments, setTranslatedAnswerComments] = useState<Record<string, Record<string, string>>>({})

  // Find catalog IDs for +1 and -1 reactions from the map
  // The map has entries like: '+1' -> 'ContentReaction:v1:+1'
  const upvoteCatalogId = reactionCatalogMap['+1'] || ''
  const downvoteCatalogId = reactionCatalogMap['-1'] || ''

  // Load answers (comments with COMMENT role)
  const { comments: answers, isLoading, error, refetch } = useContentComments(item.id || '', accessToken)

  // Translate answers when targetLanguage is set and answers are loaded
  useEffect(() => {
    const translateAllAnswers = async () => {
      if (!targetLanguage || !onTranslateComments || answers.length === 0) {
        setTranslatedAnswers({})
        return
      }

      // Collect all answer texts
      const answerTexts: string[] = []
      const answerIdMap: string[] = []

      answers.forEach(answer => {
        if (answer.content) {
          answerTexts.push(answer.content)
          answerIdMap.push(answer.id || '')
        }
      })

      if (answerTexts.length === 0) {
        return
      }

      try {
        const translations = await onTranslateComments(answerTexts, targetLanguage)
        const translatedMap: Record<string, string> = {}
        translations.forEach((translation, index) => {
          if (answerIdMap[index]) {
            translatedMap[answerIdMap[index]] = translation
          }
        })
        setTranslatedAnswers(translatedMap)
      } catch (err) {
        console.error('Error translating answers:', err)
        setTranslatedAnswers({})
      }
    }

    translateAllAnswers()
  }, [answers, targetLanguage, onTranslateComments])

  // Helper function to collect comment texts (extracted to reduce nesting)
  const collectCommentTexts = useCallback((commentList: CommentWithReplies[]): { texts: string[]; idMap: string[] } => {
    const allCommentTexts: string[] = []
    const commentIdMap: string[] = []

    const collectTexts = (comments: CommentWithReplies[]) => {
      for (const comment of comments) {
        if (comment.content) {
          allCommentTexts.push(comment.content)
          commentIdMap.push(comment.id || '')
        }
        if (comment.replies && comment.replies.length > 0) {
          collectTexts(comment.replies)
        }
      }
    }

    collectTexts(commentList)
    return { texts: allCommentTexts, idMap: commentIdMap }
  }, [])

  // Translate comments for expanded answers when they are opened
  useEffect(() => {
    const translateAnswerComments = async () => {
      if (!targetLanguage || !onTranslateComments || !expandedAnswerId) {
        return
      }

      // Find the expanded answer
      const expandedAnswer = answers.find(a => a.id === expandedAnswerId)
      if (!expandedAnswer?.replies || expandedAnswer.replies.length === 0) {
        return
      }

      // Check if already translated
      if (translatedAnswerComments[expandedAnswerId]) {
        return
      }

      // Collect all comment texts (including nested replies)
      const { texts: allCommentTexts, idMap: commentIdMap } = collectCommentTexts(expandedAnswer.replies)

      if (allCommentTexts.length === 0) {
        return
      }

      try {
        const translations = await onTranslateComments(allCommentTexts, targetLanguage)
        const translatedMap: Record<string, string> = {}
        translations.forEach((translation, index) => {
          if (commentIdMap[index]) {
            translatedMap[commentIdMap[index]] = translation
          }
        })
        setTranslatedAnswerComments(prev => ({
          ...prev,
          [expandedAnswerId]: translatedMap
        }))
      } catch (err) {
        console.error('Error translating answer comments:', err)
      }
    }

    translateAnswerComments()
  }, [expandedAnswerId, targetLanguage, onTranslateComments, answers, collectCommentTexts, translatedAnswerComments])

  // Helper function to flatten nested replies (extracted to reduce nesting)
  const flattenReplies = useCallback((comment: CommentWithReplies): CommentWithReplies[] => {
    const allReplies: CommentWithReplies[] = []
    const collectReplies = (replies: CommentWithReplies[]) => {
      for (const reply of replies) {
        const flatReply: CommentWithReplies = {
          ...reply,
          replies: []
        }
        allReplies.push(flatReply)
        if (reply.replies && reply.replies.length > 0) {
          collectReplies(reply.replies)
        }
      }
    }
    if (comment.replies && comment.replies.length > 0) {
      collectReplies(comment.replies)
    }
    return allReplies
  }, [])

  // Get answer IDs for batch reaction fetching
  const answerIds = useMemo(() => answers.map(answer => answer.id || '').filter(Boolean), [answers])

  // Batch fetch reactions for question and all answers
  const { reactionsByArticle, refetch: refetchReactions } = useUserContentReactions({
    contentEntryIds: [item.id || '', ...answerIds],
    currentUserId: userId || '',
    accessToken: accessToken || ''
  })

  // Calculate vote counts for question or answer
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

  // Get vote counts for question
  const questionVotes: VoteState = useMemo(() => {
    return getVoteCounts(item.id || '')
  }, [item.id, reactionsByArticle])

  // Sort answers: accepted answer first, then by vote score (best to worst)
  const sortedAnswers = useMemo(() => {
    return [...answers].sort((a, b) => {
      // Accepted answer always comes first
      const aAccepted = a.accepted || false
      const bAccepted = b.accepted || false

      if (aAccepted && !bAccepted) return -1
      if (!aAccepted && bAccepted) return 1

      // If both accepted or both not accepted, sort by score
      const scoreA = getVoteCounts(a.id || '').score
      const scoreB = getVoteCounts(b.id || '').score
      return scoreB - scoreA
    })
  }, [answers, reactionsByArticle])

  // Check if there's any accepted answer
  const hasAcceptedAnswer = useMemo(() => {
    return sortedAnswers.some(answer => answer.accepted || false)
  }, [sortedAnswers])

  const handleVoteSuccess = () => {
    refetchReactions()
    refetch()
  }

  const handleAnswerSuccess = () => {
    setShowAnswerForm(false)
    refetch()
    refetchReactions()
  }

  const toggleAnswerComments = (answerId: string) => {
    setExpandedAnswerId(expandedAnswerId === answerId ? null : answerId)
  }

  const handleAuthorClick = (e: React.MouseEvent | React.KeyboardEvent, employeeId: string | undefined) => {
    e.stopPropagation()
    if (employeeId) {
      const employeeUrl = buildPlatformUrl('/platform/employee-record', { employeeId })
      navigateTo(employeeUrl)
    }
  }

  const getVisibleComments = (answerId: string) => {
    return visibleCommentsPerAnswer[answerId] || 10
  }

  const getVisibleReplies = (commentId: string) => {
    return visibleRepliesPerComment[commentId] || 3
  }

  const showMoreComments = (answerId: string) => {
    setVisibleCommentsPerAnswer(prev => ({
      ...prev,
      [answerId]: (prev[answerId] || 10) + 10
    }))
  }

  const showMoreReplies = (commentId: string) => {
    setVisibleRepliesPerComment(prev => ({
      ...prev,
      [commentId]: (prev[commentId] || 3) + 10
    }))
  }

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const isCommentExpanded = (commentId: string) => {
    return expandedComments.has(commentId)
  }

  return (
    <div className="gba:overflow-y-auto gba:mb-6" data-testid="question-view">
      <div className="gba:flex gba:flex-col gba:mt-6 gba:max-w-[1000px] gba:mx-auto gba:px-4">
        {/* Question Section */}
        <div className="gba:bg-card gba:rounded-lg gba:border gba:border-border gba:p-8 gba:mb-6">
          <div className="gba:flex gba:gap-6">
            {/* Vote Section for Question */}
            <VoteButtons
              contentEntryId={item.id || ''}
              initialVoteState={questionVotes}
              upvoteCatalogId={upvoteCatalogId}
              downvoteCatalogId={downvoteCatalogId}
              accessToken={accessToken || ''}
              employeeId={employeeId || ''}
              size="lg"
              onVoteComplete={handleVoteSuccess}
              data-testid="question-vote"
            />

            {/* Question Content */}
            <div className="gba:flex-1">
              {/* Tags */}
              {item.contentEntryTags && item.contentEntryTags.length > 0 && (
                <div className="gba:flex gba:flex-row gba:flex-wrap gba:gap-2 gba:mb-4">
                  {item.contentEntryTags.map(tagEntry => {
                    const tagId = tagEntry.contentTag?.id || tagEntry.id || tagEntry.contentTag?.value || ''
                    return (
                      <Badge key={`question-tag-${tagId}`} variant="secondary">
                        #{tagEntry.contentTag?.value || ''}
                      </Badge>
                    )
                  })}
                </div>
              )}

              {/* Title */}
              <h1 className="gba:text-3xl gba:font-bold gba:mb-4 gba:text-foreground">{displayTitle}</h1>

              {/* Preview Text */}
              {displayPreview && (
                <p className="gba:text-base gba:leading-7 gba:mb-4 gba:text-foreground">{displayPreview}</p>
              )}

              {/* Content */}
              <ContentHtmlRenderer content={displayContent || ''} variant="default" className="gba:mb-4" />

              {/* Content Info Section without reactions */}
              <div className="gba:flex gba:flex-row gba:justify-between gba:p-5 gba:mt-4 gba:bg-muted gba:rounded-lg">
                {/* Author and Date Info */}
                <div className="gba:flex gba:flex-row gba:items-center">
                  {item.displayCreator && item.creatorEmployee?.displayName && (
                    <>
                      <button
                        type="button"
                        className="gba:text-sm gba:font-bold gba:text-foreground gba:cursor-pointer hover:gba:text-primary hover:gba:underline gba:bg-transparent gba:border-0 gba:p-0"
                        onClick={e => handleAuthorClick(e, item.creatorEmployeeId || undefined)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleAuthorClick(e, item.creatorEmployeeId || undefined)
                          }
                        }}
                      >
                        {item.creatorEmployee.displayName}
                      </button>
                      <p className="gba:text-sm gba:font-regular gba:mx-3 gba:text-muted-foreground">•</p>
                    </>
                  )}

                  {item.createdAt && (
                    <p className="gba:text-sm gba:font-regular gba:text-foreground">
                      {dayjs(item.createdAt).format('MMM DD, YYYY')}
                    </p>
                  )}
                </div>

                {/* Share Button only */}
                <div className="gba:flex gba:flex-row gba:items-center gba:ml-auto">
                  {entityType && (
                    <AppAction
                      variant="custom"
                      mode="button"
                      buttonSize="sm"
                      buttonVariant="ghost"
                      shareContext={{
                        entityType,
                        entityId: item.id || '',
                        entityName: item.title || '',
                        entityUrl: entityDisplayUrl
                      }}
                      accessToken={accessToken}
                      className="gba:p-2"
                      data-testid="question-share-button"
                    >
                      <Share2 className="gba:w-4 gba:h-4" />
                    </AppAction>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Answers Section Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            <MessageCircle className="gba:w-5 gba:h-5 gba:text-foreground" />
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">
              {answers.length} {answers.length === 1 ? t('answer') : t('answers')}
            </h2>
          </div>

          {/* Add Answer Button */}
          {item.allowComment && !showAnswerForm && (
            <Button variant="default" onClick={() => setShowAnswerForm(true)} data-testid="add-answer-button">
              {t('add_answer')}
            </Button>
          )}
        </div>

        {/* Answer Form */}
        {showAnswerForm && (
          <AnswerForm
            questionId={item.id || ''}
            accessToken={accessToken || ''}
            employeeId={employeeId || ''}
            onSuccess={handleAnswerSuccess}
            onCancel={() => setShowAnswerForm(false)}
            data-testid="question-answer-form"
          />
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="gba:mb-4">
            <AlertTitle>{t('error_loading_answers')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="gba:flex gba:justify-center gba:py-8">
            <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary"></div>
          </div>
        )}

        {/* Answers List */}
        {!isLoading && sortedAnswers.length === 0 && (
          <div className="gba:text-center gba:py-12 gba:bg-card gba:rounded-lg gba:border gba:border-border">
            <MessageCircle className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
            <p className="gba:text-muted-foreground">{t('no_answers_yet')}</p>
          </div>
        )}

        {!isLoading &&
          sortedAnswers.map(answer => {
            const answerVotes = getVoteCounts(answer.id || '')
            const isAccepted = answer.accepted || false
            const isQuestionAuthor = !!(item.createdBy && userId && item.createdBy === userId)

            // Debug logging
            console.log('🔍 Question Author Check:', {
              'item.createdBy': item.createdBy,
              userId: userId,
              isQuestionAuthor: isQuestionAuthor,
              match: item.createdBy === userId
            })

            const isExpanded = expandedAnswerId === answer.id
            const commentCount = answer.replies?.length || 0

            return (
              <div
                key={answer.id}
                className={`gba:bg-card gba:rounded-lg gba:border gba:p-6 gba:mb-4 ${
                  isAccepted ? 'gba:border-success gba:shadow-md' : 'gba:border-border'
                }`}
                data-testid={`answer-${answer.id}`}
              >
                <div className="gba:flex gba:gap-6">
                  {/* Vote Section for Answer */}
                  <VoteButtons
                    contentEntryId={answer.id || ''}
                    initialVoteState={answerVotes}
                    upvoteCatalogId={upvoteCatalogId}
                    downvoteCatalogId={downvoteCatalogId}
                    accessToken={accessToken || ''}
                    employeeId={employeeId || ''}
                    size="md"
                    onVoteComplete={handleVoteSuccess}
                    data-testid={`answer-vote-${answer.id}`}
                  />

                  {/* Answer Content */}
                  <div className="gba:flex-1">
                    {isAccepted && (
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-success gba:font-semibold gba:mb-2">
                        <CheckCircle className="gba:w-5 gba:h-5" />
                        <span>{t('accepted_answer')}</span>
                      </div>
                    )}
                    {/* Answer Text */}
                    {answer.content && (
                      <div
                        className="gba:text-base gba:leading-7 gba:mb-4 gba:text-foreground"
                        dangerouslySetInnerHTML={{
                          __html:
                            targetLanguage && translatedAnswers[answer.id || '']
                              ? translatedAnswers[answer.id || '']
                              : answer.content
                        }}
                      />
                    )}

                    {/* Answer Meta */}
                    <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground gba:mb-3">
                      <span>
                        {t('answered_by')}{' '}
                        <button
                          type="button"
                          className="gba:cursor-pointer hover:gba:text-primary hover:gba:underline gba:bg-transparent gba:border-0 gba:p-0"
                          onClick={e => handleAuthorClick(e, answer.creatorEmployeeId || undefined)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleAuthorClick(e, answer.creatorEmployeeId || undefined)
                            }
                          }}
                        >
                          {answer.creatorEmployee?.displayName || t('unknown')}
                        </button>
                      </span>
                      {answer.createdAt && (
                        <>
                          <span>•</span>
                          <span>{dayjs(answer.createdAt).format('MMM DD, YYYY')}</span>
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="gba:flex gba:items-center gba:gap-3">
                      {/* Accept Answer Button - Only visible to question author */}
                      {/* Hide all accept buttons if there's an accepted answer, except for the accepted one */}
                      {isQuestionAuthor && (!hasAcceptedAnswer || isAccepted) && (
                        <AcceptAnswerButton
                          answerId={answer.id || ''}
                          questionId={item.id || ''}
                          isAccepted={isAccepted}
                          accessToken={accessToken || ''}
                          employeeId={employeeId || ''}
                          version={answer.version}
                          onAcceptComplete={handleVoteSuccess}
                          data-testid={`accept-answer-${answer.id}`}
                        />
                      )}

                      {/* Comments Toggle Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAnswerComments(answer.id || '')}
                        className="gba:text-muted-foreground hover:gba:text-foreground gba:gap-2"
                        data-testid={`toggle-answer-comments-${answer.id}`}
                      >
                        <MessageCircle className="gba:w-4 gba:h-4" />
                        {(() => {
                          if (commentCount > 0) {
                            const commentText = commentCount === 1 ? t('comment') : t('comments')
                            return `${commentCount} ${commentText}`
                          }
                          return t('add_comment')
                        })()}
                        {isExpanded ? (
                          <ChevronUp className="gba:w-4 gba:h-4" />
                        ) : (
                          <ChevronDown className="gba:w-4 gba:h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Expanded Comments Section */}
                    {isExpanded && (
                      <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-border">
                        {/* Comment Form */}
                        <div className="gba:mb-6">
                          <CommentForm
                            articleId={answer.id || ''}
                            articleCommentId={null}
                            accessToken={accessToken || ''}
                            employeeId={employeeId || ''}
                            onSuccess={refetch}
                            placeholder={t('add_comment')}
                            data-testid={`answer-comment-form-${answer.id}`}
                          />
                        </div>

                        {/* Comments Header */}
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                          <MessageCircle className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">
                            {commentCount > 0 ? `Comments (${commentCount})` : t('no_comments_yet')}
                          </h3>
                        </div>

                        {/* Comments List */}
                        {answer.replies && answer.replies.length > 0 ? (
                          <div className="gba:space-y-4">
                            {answer.replies.slice(0, getVisibleComments(answer.id || '')).map(comment => {
                              const flatReplies = flattenReplies(comment)
                              const isExpanded = isCommentExpanded(comment.id || '')
                              const visibleRepliesCount = getVisibleReplies(comment.id || '')
                              const visibleReplies = flatReplies.slice(0, visibleRepliesCount)
                              const hasMoreReplies = flatReplies.length > visibleRepliesCount

                              return (
                                <div key={comment.id}>
                                  {/* Top-level comment */}
                                  <CommentItem
                                    comment={{ ...comment, replies: [] }}
                                    articleId={answer.id || ''}
                                    accessToken={accessToken || ''}
                                    employeeId={employeeId || ''}
                                    currentUserId={userId || ''}
                                    onCommentCreated={refetch}
                                    depth={0}
                                    translatedContent={
                                      targetLanguage && translatedAnswerComments[answer.id || '']?.[comment.id || '']
                                        ? translatedAnswerComments[answer.id || ''][comment.id || '']
                                        : undefined
                                    }
                                    data-testid={`answer-comment-${comment.id}`}
                                  />

                                  {/* Show/Hide Replies Button */}
                                  {flatReplies.length > 0 && (
                                    <div className="gba:ml-8 gba:mt-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleReplies(comment.id || '')}
                                        className="gba:text-primary gba:text-xs gba:gap-1"
                                      >
                                        {isExpanded ? (
                                          <>
                                            <ChevronUp className="gba:w-4 gba:h-4" />
                                            Hide {flatReplies.length} {flatReplies.length === 1 ? 'reply' : 'replies'}
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="gba:w-4 gba:h-4" />
                                            Show {flatReplies.length} {flatReplies.length === 1 ? 'reply' : 'replies'}
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  )}

                                  {/* Flattened replies - only shown when expanded */}
                                  {isExpanded && visibleReplies.length > 0 && (
                                    <div className="gba:ml-8 gba:space-y-3 gba:mt-3">
                                      {visibleReplies.map(reply => (
                                        <CommentItem
                                          key={reply.id}
                                          comment={reply}
                                          articleId={answer.id || ''}
                                          accessToken={accessToken || ''}
                                          employeeId={employeeId || ''}
                                          currentUserId={userId || ''}
                                          onCommentCreated={refetch}
                                          depth={1}
                                          translatedContent={
                                            targetLanguage &&
                                            translatedAnswerComments[answer.id || '']?.[reply.id || '']
                                              ? translatedAnswerComments[answer.id || ''][reply.id || '']
                                              : undefined
                                          }
                                          data-testid={`answer-reply-${reply.id}`}
                                        />
                                      ))}
                                      {/* Show More Replies Button */}
                                      {hasMoreReplies && (
                                        <div className="gba:mt-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => showMoreReplies(comment.id || '')}
                                            className="gba:text-primary gba:text-xs"
                                          >
                                            <ChevronDown className="gba:w-4 gba:h-4 gba:mr-1" />
                                            Show {Math.min(10, flatReplies.length - visibleRepliesCount)} more{' '}
                                            {flatReplies.length - visibleRepliesCount === 1 ? 'reply' : 'replies'}
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            {/* Show More Comments Button */}
                            {answer.replies.length > getVisibleComments(answer.id || '') && (
                              <div className="gba:mt-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => showMoreComments(answer.id || '')}
                                  className="gba:text-primary"
                                >
                                  <ChevronDown className="gba:w-4 gba:h-4 gba:mr-2" />
                                  Show {Math.min(
                                    10,
                                    answer.replies.length - getVisibleComments(answer.id || '')
                                  )} more{' '}
                                  {answer.replies.length - getVisibleComments(answer.id || '') === 1
                                    ? 'comment'
                                    : 'comments'}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                            <p>{t('no_comments_yet')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default QuestionView
