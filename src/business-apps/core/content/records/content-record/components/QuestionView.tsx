import React, { useState, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Badge, Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { MessageCircle, CheckCircle, Share2, ChevronDown, ChevronUp } from 'lucide-react'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { useContentComments, CommentWithReplies } from '@/common/data/content'
import { useUserContentReactions } from '@/common/data/content'
import { VoteButtons, type VoteState } from '@/common/components/common-content'
import CommentForm from './interactions/CommentForm'
import CommentItem from './interactions/CommentItem'
import AnswerForm from './AnswerForm'
import translations from '../_i18n'

interface QuestionViewProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  reactionCatalogMap?: Record<string, string>
}

/**
 * Q&A Forum View for Questions with Answers and Voting
 */
const QuestionView: React.FC<QuestionViewProps> = ({
  item,
  accessToken,
  userId,
  employeeId,
  reactionCatalogMap = {}
}) => {
  const { t } = useTranslation(translations)
  const [expandedAnswerId, setExpandedAnswerId] = useState<string | null>(null)
  const [showAnswerForm, setShowAnswerForm] = useState(false)

  // Find catalog IDs for +1 and -1 reactions from the map
  // The map has entries like: '+1' -> 'ContentReaction:v1:+1'
  const upvoteCatalogId = reactionCatalogMap['+1'] || ''
  const downvoteCatalogId = reactionCatalogMap['-1'] || ''

  // Load answers (comments with COMMENT role)
  const { comments: answers, isLoading, error, refetch } = useContentComments(item.id, accessToken)

  // Get answer IDs for batch reaction fetching
  const answerIds = useMemo(() => answers.map(answer => answer.id), [answers])

  // Batch fetch reactions for question and all answers
  const { reactionsByArticle, refetch: refetchReactions } = useUserContentReactions({
    contentEntryIds: [item.id, ...answerIds],
    currentUserId: userId,
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
    return getVoteCounts(item.id)
  }, [item.id, reactionsByArticle])

  // Sort answers by vote score (best answer first)
  const sortedAnswers = useMemo(() => {
    return [...answers].sort((a, b) => {
      const scoreA = getVoteCounts(a.id).score
      const scoreB = getVoteCounts(b.id).score
      return scoreB - scoreA
    })
  }, [answers, reactionsByArticle])

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

  return (
    <div className="gba:overflow-y-auto gba:mb-6" data-testid="question-view">
      <div className="gba:flex gba:flex-col gba:mt-6 gba:max-w-[1000px] gba:mx-auto gba:px-4">
        {/* Question Section */}
        <div className="gba:bg-card gba:rounded-lg gba:border gba:border-border gba:p-8 gba:mb-6">
          <div className="gba:flex gba:gap-6">
            {/* Vote Section for Question */}
            <VoteButtons
              contentEntryId={item.id}
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
              {item.tagNames && item.tagNames.length > 0 && (
                <div className="gba:flex gba:flex-row gba:flex-wrap gba:gap-2 gba:mb-4">
                  {item.tagNames.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="gba:text-3xl gba:font-bold gba:mb-4 gba:text-foreground">{item.title}</h1>

              {/* Preview Text */}
              {item.preview && (
                <p className="gba:text-base gba:leading-7 gba:mb-4 gba:text-foreground">{item.preview}</p>
              )}

              {/* Content */}
              {item.content && (
                <div
                  className="gba:text-base gba:leading-7 gba:mb-4 gba:text-foreground 
                             [&>h1]:gba:text-2xl [&>h1]:gba:font-bold 
                             [&>h2]:gba:text-xl [&>h2]:gba:font-bold 
                             [&>h3]:gba:text-lg [&>h3]:gba:font-bold"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
              )}

              {/* Content Info Section without reactions */}
              <div className="gba:flex gba:flex-row gba:justify-between gba:p-5 gba:mt-4 gba:bg-muted gba:rounded-lg">
                {/* Author and Date Info */}
                <div className="gba:flex gba:flex-row gba:items-center">
                  {item.displayCreator && item.creatorDisplayName && (
                    <>
                      <p className="gba:text-sm gba:font-bold gba:text-foreground">{item.creatorDisplayName}</p>
                      <p className="gba:text-sm gba:font-regular gba:mx-3 gba:text-muted-foreground">•</p>
                    </>
                  )}

                  {item.createdAt && (
                    <p className="gba:text-sm gba:font-regular gba:text-foreground">
                      {item.formattedCreatedAt || new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Share Button only */}
                <div className="gba:flex gba:flex-row gba:items-center gba:ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = window.location.href
                      navigator.clipboard.writeText(url)
                    }}
                    className="gba:p-2"
                  >
                    <Share2 className="gba:w-4 gba:h-4" />
                  </Button>
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
              {item.commentCount || 0} {(item.commentCount || 0) === 1 ? t('answer') : t('answers')}
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
            questionId={item.id}
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
          sortedAnswers.map((answer, index) => {
            const answerVotes = getVoteCounts(answer.id)
            const isAccepted = index === 0 && answerVotes.score > 0 // First answer with positive score
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
                    contentEntryId={answer.id}
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
                        <span>{t('best_answer')}</span>
                      </div>
                    )}
                    {/* Answer Text */}
                    {answer.content && (
                      <div
                        className="gba:text-base gba:leading-7 gba:mb-4 gba:text-foreground"
                        dangerouslySetInnerHTML={{ __html: answer.content }}
                      />
                    )}

                    {/* Answer Meta */}
                    <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground gba:mb-3">
                      <span>
                        {t('answered_by')} {answer.creatorDisplayName || t('unknown')}
                      </span>
                      {answer.formattedCreatedAt && (
                        <>
                          <span>•</span>
                          <span>{answer.formattedCreatedAt}</span>
                        </>
                      )}
                    </div>

                    {/* Comments Toggle Button */}
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAnswerComments(answer.id)}
                        className="gba:text-muted-foreground hover:gba:text-foreground gba:gap-2"
                        data-testid={`toggle-answer-comments-${answer.id}`}
                      >
                        <MessageCircle className="gba:w-4 gba:h-4" />
                        {commentCount > 0
                          ? `${commentCount} ${commentCount === 1 ? t('comment') : t('comments')}`
                          : t('add_comment')}
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
                            articleId={answer.id}
                            parentCommentId={null}
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
                            {answer.replies.map(comment => {
                              // Flatten replies
                              const flattenReplies = (c: CommentWithReplies): CommentWithReplies[] => {
                                const allReplies: CommentWithReplies[] = []
                                const collectReplies = (replies: CommentWithReplies[]) => {
                                  replies.forEach(reply => {
                                    const flatReply: CommentWithReplies = {
                                      ...reply,
                                      replies: []
                                    }
                                    allReplies.push(flatReply)
                                    if (reply.replies && reply.replies.length > 0) {
                                      collectReplies(reply.replies)
                                    }
                                  })
                                }
                                if (c.replies && c.replies.length > 0) {
                                  collectReplies(c.replies)
                                }
                                return allReplies
                              }

                              const flatReplies = flattenReplies(comment)

                              return (
                                <div key={comment.id}>
                                  {/* Top-level comment */}
                                  <CommentItem
                                    comment={{ ...comment, replies: [] }}
                                    articleId={answer.id}
                                    accessToken={accessToken || ''}
                                    employeeId={employeeId || ''}
                                    currentUserId={userId}
                                    onCommentCreated={refetch}
                                    depth={0}
                                    data-testid={`answer-comment-${comment.id}`}
                                  />
                                  {/* Flattened replies */}
                                  {flatReplies.length > 0 && (
                                    <div className="gba:space-y-3">
                                      {flatReplies.map(reply => (
                                        <CommentItem
                                          key={reply.id}
                                          comment={reply}
                                          articleId={answer.id}
                                          accessToken={accessToken || ''}
                                          employeeId={employeeId || ''}
                                          currentUserId={userId}
                                          onCommentCreated={refetch}
                                          depth={1}
                                          data-testid={`answer-reply-${reply.id}`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
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
