import React, { useState, useCallback } from 'react'
import { Textarea, Button, Form, FormField, FormItem, FormControl, FormMessage } from '@newwork/nw-design-system'
import { AppActionProvider } from '@/components/app-action-provider'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { buildCreateContentEntryPayload } from '@/common/data/content/payloads/contentEntryPayloads'
import { ContentRole } from '@/common/data/content/types/contentEnums'

export interface AnswerFormProps {
  questionId: string // Root question ID
  accessToken: string
  employeeId: string
  onSuccess?: () => void
  onCancel?: () => void
  'data-testid'?: string
}

const answerSchema = z.object({
  answer: z
    .string()
    .min(10, 'Answer must be at least 10 characters')
    .max(10000, 'Answer must be less than 10000 characters')
    .trim()
})

type AnswerFormData = z.infer<typeof answerSchema>

export const AnswerForm: React.FC<AnswerFormProps> = ({
  questionId,
  accessToken,
  employeeId,
  onSuccess,
  onCancel,
  'data-testid': dataTestId = 'answer-form'
}) => {
  const [error, setError] = useState<string | null>(null)

  const form = useForm<AnswerFormData>({
    defaultValues: { answer: '' },
    resolver: zodResolver(answerSchema)
  })

  const transformData = useCallback(
    (formData: AnswerFormData) => {
      return buildCreateContentEntryPayload({
        content: formData.answer,
        role: ContentRole.COMMENT, // Answers are COMMENT role
        parentContentEntryId: questionId,
        rootContentEntryId: questionId,
        creatorEmployeeId: employeeId,
        displayCreator: true,
        displayUpdater: false,
        allowComment: true, // Allow comments on answers
        allowReaction: true // Allow voting on answers
      })
    },
    [questionId, employeeId]
  )

  const handleSuccess = useCallback(() => {
    form.reset({ answer: '' })
    setError(null)
    if (onSuccess) {
      onSuccess()
    }
  }, [form, onSuccess])

  const handleError = useCallback((err: Error) => {
    setError(err.message)
  }, [])

  return (
    <div className="gba:bg-card gba:rounded-lg gba:border gba:border-border gba:p-6 gba:mb-4" data-testid={dataTestId}>
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
        externalContextData={{ articleId: questionId }}
        accessToken={accessToken}
        onSuccess={handleSuccess}
        onError={handleError}
        transformData={transformData}
      >
        {({ executeAction, isLoading, isProcessing }) => {
          const handleSubmit = async (formData: AnswerFormData) => {
            await executeAction(formData)
          }

          const isFormLoading = isLoading || isProcessing

          return (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-3">
                <FormField
                  control={form.control}
                  name="answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Write your answer here... (minimum 10 characters)"
                          className="gba:min-h-[150px]"
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
                    {isFormLoading ? 'Posting...' : 'Post Answer'}
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

export default AnswerForm
