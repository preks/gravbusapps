import React, { useState, useCallback } from 'react'
import { Textarea, Button, Form, FormField, FormItem, FormControl, FormMessage } from '@newwork/nw-design-system'
import { AppActionProvider } from '@/components/app-action-provider'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

export interface CommentFormProps {
  articleId: string
  articleCommentId?: string | null
  accessToken: string
  onSuccess?: () => void
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
  onSuccess,
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
      const articleCommentData: any = {
        comment: formData.comment,
        article: articleId
      }

      // Only include articleComment if replying to another comment
      if (articleCommentId) {
        articleCommentData.articleComment = articleCommentId
      }

      return {
        articleComment: articleCommentData
      }
    },
    [articleId, articleCommentId]
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
        contextsArray={[FlowContextName.contentCommentCreate]}
        externalContextData={{ articleId }}
        accessToken={accessToken}
        onSuccess={handleSuccess}
        onError={handleError}
        transformData={transformData}
      >
        {({ executeAction, isLoading, isProcessing }) => {
          const handleSubmit = async (formData: CommentFormData) => {
            await executeAction(formData)
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
                    {isFormLoading ? 'Posting...' : articleCommentId ? 'Reply' : 'Comment'}
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
