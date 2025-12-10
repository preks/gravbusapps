import React, { useState, useCallback } from 'react'
import { Textarea, Button, Form, FormField, FormItem, FormControl, FormMessage } from '@newwork/nw-design-system'
import { AppActionProvider } from '@/components/app-action-provider'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { buildCreateContentEntryPayload } from '@/common/data/content/payloads/contentEntryPayloads'
import { ContentRole } from '@/common/data/content/types/contentEnums'

export interface CommentFormProps {
  articleId: string // Root content entry ID (always the article)
  articleCommentId?: string | null // Parent comment ID (for nested replies)
  accessToken: string
  employeeId: string // Current user's employee ID
  onSuccess?: () => void
  onOptimisticCreate?: (comment: { content: string; createdAt: Date }) => void // Optimistic update callback
  onCancel?: () => void
  placeholder?: string
  'data-testid'?: string
}

const commentSchema = z.object({
  comment: z.string().min(1, 'Comment is required').max(5000, 'Comment must be less than 5000 characters').trim()
})

type CommentFormData = z.infer<typeof commentSchema>

export const CommentForm: React.FC<CommentFormProps> = ({
  articleId,
  articleCommentId = null,
  accessToken,
  employeeId,
  onSuccess,
  onOptimisticCreate,
  onCancel,
  placeholder = 'Write a comment...',
  'data-testid': dataTestId = 'comment-form'
}) => {
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CommentFormData>({
    defaultValues: { comment: '' },
    resolver: zodResolver(commentSchema)
  })

  const transformData = useCallback(
    (formData: CommentFormData) => {
      // Root is always the article
      const rootId = articleId

      // Parent: If articleCommentId exists, it's a reply to a comment
      // Otherwise, it's a top-level comment on the article
      const parentId = articleCommentId || articleId

      return buildCreateContentEntryPayload({
        content: formData.comment,
        role: ContentRole.COMMENT,
        parentContentEntryId: parentId,
        rootContentEntryId: rootId, // Always the root article
        creatorEmployeeId: employeeId,
        displayCreator: true,
        displayUpdater: false,
        allowComment: true, // Allow nested replies
        allowReaction: true
      })
    },
    [articleId, articleCommentId, employeeId]
  )

  const handleSuccess = useCallback(() => {
    form.reset({ comment: '' })
    setError(null)
    if (onSuccess) {
      onSuccess()
    }
  }, [form, onSuccess])

  const handleError = useCallback((err: Error) => {
    setError(err.message)
  }, [])

  return (
    <div data-testid={dataTestId}>
      {error && (
        <div
          className="gba:mb-2 gba:p-2 gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:rounded gba:text-sm"
          data-testid={`${dataTestId}-error`}
        >
          {error}
        </div>
      )}

      <AppActionProvider
        contextsArray={[FlowContextName.contentEntryComment]}
        externalContextData={{ articleId }}
        accessToken={accessToken}
        onSuccess={handleSuccess}
        onError={handleError}
        transformData={transformData}
      >
        {({ executeAction, isLoading, isProcessing }) => {
          const handleSubmit = async (formData: CommentFormData) => {
            // Optimistic update: immediately add comment to UI
            if (onOptimisticCreate) {
              onOptimisticCreate({
                content: formData.comment,
                createdAt: new Date()
              })
              form.reset({ comment: '' })
            }

            // Call backend
            try {
              await executeAction(formData)
            } catch (error) {
              // On error, the parent can handle reverting the optimistic update
              console.error('Failed to create comment:', error)
            }
          }

          const isFormLoading = isLoading || isProcessing

          return (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-2">
                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={placeholder}
                          className="gba:min-h-[80px]"
                          disabled={isFormLoading}
                          data-testid={`${dataTestId}-textarea`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="gba:flex gba:justify-end gba:gap-2">
                  {onCancel && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      disabled={isFormLoading}
                      data-testid={`${dataTestId}-cancel-button`}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={isFormLoading} data-testid={`${dataTestId}-submit-button`}>
                    {(() => {
                      if (isFormLoading) return 'Posting...'
                      if (articleCommentId) return 'Reply'
                      return 'Comment'
                    })()}
                  </Button>
                </div>
              </form>
            </Form>
          )
        }}
      </AppActionProvider>
    </div>
  )
}

export default CommentForm
