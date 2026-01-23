import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface JobApplicationFeedbackDeletePopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

interface FeedbackData {
  id: string
  version: number
  feedback: string
}

export const JobApplicationFeedbackDeletePopup: React.FC<JobApplicationFeedbackDeletePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-application-feedback-delete-popup'
}) => {
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken || '')

  const feedbackId =
    additionalData?.jobApplicationFeedbackId ||
    additionalData?.feedbackId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobApplicationFeedbackId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.feedbackId ||
    additionalData?.id

  useEffect(() => {
    const loadFeedback = async () => {
      if (!feedbackId || !accessToken) {
        setError(
          getTranslationFromI18nKeyAndLabel(
            'recruiting.jobApplicationFeedback.delete.error.noId',
            'Feedback ID not provided or access token missing'
          )
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = `
          query GetJobApplicationFeedback($id: uuid!) {
            JobApplicationFeedbackByPk(id: $id) {
              id
              version
              feedback
            }
          }
        `

        const result = await graphqlClient.request<{ JobApplicationFeedbackByPk: any }>(query, { id: feedbackId })

        if (!result?.JobApplicationFeedbackByPk) {
          setError(
            getTranslationFromI18nKeyAndLabel(
              'recruiting.jobApplicationFeedback.delete.error.notFound',
              'Feedback not found'
            )
          )
          return
        }

        const fb = result.JobApplicationFeedbackByPk

        setFeedback({
          id: fb.id,
          version: fb.version || 0,
          feedback: fb.feedback || 'Unnamed Feedback'
        })
      } catch (err) {
        console.error('Failed to load feedback:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel(
                'recruiting.jobApplicationFeedback.delete.error.loadFailed',
                'Failed to load feedback'
              )
        )
      } finally {
        setLoading(false)
      }
    }

    loadFeedback()
  }, [feedbackId, accessToken, graphqlClient])

  const handleSubmit = async () => {
    if (!feedback) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'recruiting.jobApplicationFeedback.delete.error.noData',
          'Feedback data not loaded'
        )
      )
    }

    return {
      jobApplicationFeedback: {
        id: feedback.id,
        version: feedback.version,
        isDeleted: true
      }
    }
  }

  const handleProcessCompletion = () => {
    if (onSuccess) {
      onSuccess()
    }
    onClose()
  }

  if (!feedbackId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobApplicationFeedback.delete.missingId',
            'Feedback ID not found. Cannot delete feedback.'
          )}
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8" data-testid={`${dataTestId}-loading`}>
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel('recruiting.jobApplicationFeedback.delete.loading', 'Loading feedback...')}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {error}
        </Alert>
      </div>
    )
  }

  if (!feedback) {
    return null
  }

  const feedbackTitle =
    feedback.feedback || getTranslationFromI18nKeyAndLabel('recruiting.feedback.unnamed', 'Unnamed Feedback')
  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobApplicationFeedback', 'Job Application Feedback')

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      onCancel={onClose}
      formData={{}}
      onProcessCompletion={handleProcessCompletion}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      data-testid={`${dataTestId}-form`}
    >
      <DeleteLayout itemType={itemType} itemTitle={feedbackTitle} data-testid={dataTestId} />
    </AppActionForm>
  )
}

export default JobApplicationFeedbackDeletePopup
