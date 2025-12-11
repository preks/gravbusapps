import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useContentComments, CommentWithReplies } from '@/common/data/content/hooks/useContentComments'
import { useInfiniteScroll } from '@/common/hooks/useInfiniteScroll'
import CommentForm from './CommentForm'
import CommentItem from './CommentItem'

export interface CommentSectionProps {
  articleId: string
  allowComment: boolean
  commentCount: number
  accessToken: string
  currentUserId: string | undefined
  employeeId: string
  targetLanguage?: string
  onTranslateComments?: (commentTexts: string[], targetLanguage: string) => Promise<string[]>
  'data-testid'?: string
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  articleId,
  allowComment,
  commentCount,
  accessToken,
  currentUserId,
  employeeId,
  targetLanguage,
  onTranslateComments,
  'data-testid': dataTestId = 'comment-section'
}) => {
  const { t } = useTranslation('content')
  const { comments, isLoading, error, refetch } = useContentComments(articleId, accessToken)
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(10)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [visibleRepliesPerComment, setVisibleRepliesPerComment] = useState<Record<string, number>>({})
  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({})

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

  // Translate comments when targetLanguage is set and comments are loaded
  useEffect(() => {
    const translateAllComments = async () => {
      if (!targetLanguage || !onTranslateComments || comments.length === 0) {
        setTranslatedComments({})
        return
      }

      // Collect all comment texts (including replies)
      const { texts: allCommentTexts, idMap: commentIdMap } = collectCommentTexts(comments)

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
        setTranslatedComments(translatedMap)
      } catch (err) {
        console.error('Error translating comments:', err)
        setTranslatedComments({})
      }
    }

    translateAllComments()
  }, [comments, targetLanguage, onTranslateComments, collectCommentTexts])

  // Helper to get translated content for a comment
  const getTranslatedContent = (commentId: string, originalContent: string): string => {
    return translatedComments[commentId] || originalContent
  }

  // Show comments based on visible count
  const visibleComments = comments.slice(0, visibleCommentsCount)
  const hasMoreComments = comments.length > visibleCommentsCount

  // Load more comments for infinite scroll
  const loadMoreComments = () => {
    setVisibleCommentsCount(prev => prev + 10)
  }

  // Infinite scroll hook - must be called unconditionally
  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMoreComments,
    hasMore: hasMoreComments && allowComment,
    isLoading: false,
    threshold: 300
  })

  if (!allowComment) {
    return null
  }

  const getVisibleReplies = (commentId: string) => {
    return visibleRepliesPerComment[commentId] || 3
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

  // Flatten all replies to a single level (no nested replies within replies)
  const flattenReplies = (comment: CommentWithReplies): CommentWithReplies[] => {
    const allReplies: CommentWithReplies[] = []

    const collectReplies = (replies: CommentWithReplies[]) => {
      replies.forEach(reply => {
        // Create a new object with explicitly empty replies to prevent any nesting
        const flatReply: CommentWithReplies = {
          ...reply,
          replies: [] as CommentWithReplies[]
        }
        allReplies.push(flatReply)

        // Recursively collect any nested replies
        if (reply.replies && reply.replies.length > 0) {
          collectReplies(reply.replies)
        }
      })
    }

    if (comment.replies && comment.replies.length > 0) {
      collectReplies(comment.replies)
    }

    return allReplies
  }

  return (
    <div className="gba:mt-8 gba:bg-card gba:rounded-lg gba:border gba:border-border gba:p-6" data-testid={dataTestId}>
      {/* Section Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-6">
        <MessageCircle className="gba:w-5 gba:h-5 gba:text-foreground" />
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">
          {t('comments', 'Comments')} ({commentCount})
        </h2>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          <AlertTitle>{t('error_loading_comments', 'Error loading comments')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Comment Form */}
      <div className="gba:mb-6" data-testid={`${dataTestId}-form`}>
        <CommentForm
          articleId={articleId}
          accessToken={accessToken}
          employeeId={employeeId}
          onSuccess={refetch}
          data-testid={`${dataTestId}-new-comment-form`}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="gba:flex gba:justify-center gba:py-8">
          <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary"></div>
        </div>
      )}

      {/* Comments List */}
      {!isLoading && comments.length > 0 && (
        <>
          <div className="gba:space-y-4 gba:mt-6" data-testid={`${dataTestId}-list`}>
            {visibleComments.map(comment => {
              const flatReplies = flattenReplies(comment)
              const isExpanded = isCommentExpanded(comment.id)
              const visibleRepliesCount = getVisibleReplies(comment.id)
              const visibleReplies = flatReplies.slice(0, visibleRepliesCount)
              const hasMoreReplies = flatReplies.length > visibleRepliesCount

              return (
                <div
                  key={comment.id}
                  className="gba:space-y-3 gba:pb-6 gba:border-b gba:border-border/50 last:gba:border-0"
                >
                  {/* Main Comment */}
                  <CommentItem
                    comment={{ ...comment, replies: [] }}
                    articleId={articleId}
                    accessToken={accessToken}
                    employeeId={employeeId}
                    currentUserId={currentUserId}
                    onCommentCreated={refetch}
                    translatedContent={getTranslatedContent(comment.id || '', comment.content || '')}
                    data-testid={`${dataTestId}-item`}
                  />

                  {/* Show/Hide Replies Button */}
                  {flatReplies.length > 0 && (
                    <div className="gba:ml-8 gba:mt-2">
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="gba:flex gba:items-center gba:gap-1 gba:font-semibold gba:text-sm gba:text-info gba:bg-transparent hover:gba:text-info/80 hover:gba:underline gba:cursor-pointer gba:border-0 gba:px-2 gba:py-1 gba:transition-all"
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
                      </button>
                    </div>
                  )}

                  {/* All Replies Flattened at Same Level - only shown when expanded */}
                  {isExpanded && visibleReplies.length > 0 && (
                    <div className="gba:ml-8 gba:space-y-3 gba:mt-3">
                      {visibleReplies.map(reply => (
                        <CommentItem
                          key={reply.id}
                          comment={reply}
                          articleId={articleId}
                          accessToken={accessToken}
                          employeeId={employeeId}
                          currentUserId={currentUserId}
                          onCommentCreated={refetch}
                          depth={1}
                          translatedContent={getTranslatedContent(reply.id || '', reply.content || '')}
                          data-testid={`${dataTestId}-reply`}
                        />
                      ))}
                      {/* Show More Replies Button */}
                      {hasMoreReplies && (
                        <div className="gba:mt-2">
                          <button
                            onClick={() => showMoreReplies(comment.id)}
                            className="gba:flex gba:items-center gba:gap-1 gba:font-semibold gba:text-sm gba:text-info gba:bg-transparent hover:gba:text-info/80 hover:gba:underline gba:cursor-pointer gba:border-0 gba:px-2 gba:py-1 gba:transition-all"
                          >
                            <ChevronDown className="gba:w-4 gba:h-4" />
                            Show {Math.min(10, flatReplies.length - visibleRepliesCount)} more{' '}
                            {flatReplies.length - visibleRepliesCount === 1 ? 'reply' : 'replies'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Infinite Scroll Sentinel */}
          {hasMoreComments && (
            <div ref={sentinelRef} className="gba:h-4 gba:w-full" data-testid={`${dataTestId}-sentinel`} />
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && comments.length === 0 && !error && (
        <div className="gba:text-center gba:py-8 gba:text-muted-foreground" data-testid={`${dataTestId}-empty`}>
          <p className="gba:text-sm">{t('no_comments_yet', 'No comments yet. Be the first to comment!')}</p>
        </div>
      )}
    </div>
  )
}

export default CommentSection
