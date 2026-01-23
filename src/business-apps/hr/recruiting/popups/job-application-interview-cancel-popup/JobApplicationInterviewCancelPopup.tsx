import React, { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useJobApplicationInterview } from '@/common/data/recruiting/hooks/useJobApplicationInterview'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { JobInterviewStatus } from '@/common/data/recruiting/types/enums'
import { createCalendarApiClient } from '@/business-apps/platform/apps/chat/calendar/calendarApiClient'
import { env } from '@/common/env/EnvUtils'

export interface JobApplicationInterviewCancelPopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

export const JobApplicationInterviewCancelPopup: React.FC<JobApplicationInterviewCancelPopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-application-interview-cancel-popup'
}) => {
  const jobApplicationInterviewId =
    additionalData?.jobApplicationInterviewId ||
    additionalData?.jobInterviewId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobApplicationInterviewId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobInterviewId ||
    additionalData?.id

  const { jobApplicationInterview, loading, error } = useJobApplicationInterview(
    accessToken || '',
    jobApplicationInterviewId,
    'record'
  )

  const getChatApiUrl = useCallback((): string => {
    let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
    baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

    const isLocalPlatform = baseUrl.includes('localhost')
    if (isLocalPlatform) {
      baseUrl = 'https://newwork-dev.newwork.com'
    }

    let apiUrl = env('NEXT_PUBLIC_CHAT_API') || `${baseUrl}/chat-service/api/v1`
    if (apiUrl.includes('localhost')) {
      apiUrl = `${baseUrl}/chat-service/api/v1`
    }

    return apiUrl
  }, [])

  const handlePreSubmit = useCallback(async () => {
    if (!jobApplicationInterview?.meetingLink) {
      return
    }

    try {
      const apiUrl = getChatApiUrl()
      const calendarClient = createCalendarApiClient(apiUrl, accessToken || '')
      await calendarClient.cancelMeeting(jobApplicationInterview.meetingLink)
    } catch (error) {
      console.error('Error cancelling chat meeting:', error)
    }
  }, [jobApplicationInterview?.meetingLink, accessToken, getChatApiUrl])

  const handleSubmit = useCallback(async () => {
    if (!jobApplicationInterview || !jobApplicationInterview.id) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'recruiting.jobApplicationInterview.cancel.error.noData',
          'Job application interview data not loaded'
        )
      )
    }

    return {
      jobApplicationInterview: {
        id: jobApplicationInterview.id,
        ...(jobApplicationInterview.version !== undefined && jobApplicationInterview.version !== null
          ? { version: jobApplicationInterview.version }
          : {}),
        jobInterviewStatus: JobInterviewStatus.CANCELLED
      },
      changeMode: 'UPDATE' as const
    }
  }, [jobApplicationInterview])

  const handleProcessCompletion = () => {
    if (onSuccess) {
      onSuccess()
    }
    onClose()
  }

  if (!jobApplicationInterviewId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobApplicationInterview.cancel.missingId',
            'Job application interview ID not found. Cannot cancel job application interview.'
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
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobApplicationInterview.cancel.loading',
            'Loading job application interview...'
          )}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobApplicationInterview.cancel.error',
            'Failed to load job application interview. Please try again.'
          )}
        </Alert>
      </div>
    )
  }

  if (!jobApplicationInterview) {
    return null
  }

  const interviewTitle = jobApplicationInterview.scheduledAt
    ? new Date(jobApplicationInterview.scheduledAt).toLocaleString()
    : getTranslationFromI18nKeyAndLabel('recruiting.jobApplicationInterview.unnamed', 'Unnamed Interview')
  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobApplicationInterview', 'Job Application Interview')

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      handlePreSubmit={handlePreSubmit}
      onCancel={onClose}
      formData={{}}
      onProcessCompletion={handleProcessCompletion}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel Interview')}
      submitButtonVariant="destructive"
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      data-testid={`${dataTestId}-form`}
    >
      <DeleteLayout itemType={itemType} itemTitle={interviewTitle} data-testid={dataTestId} />
    </AppActionForm>
  )
}

export default JobApplicationInterviewCancelPopup
