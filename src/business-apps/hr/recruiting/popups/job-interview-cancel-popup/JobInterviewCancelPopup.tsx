import React, { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useJobInterview } from '@/common/data/recruiting/hooks/useJobInterview'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { JobInterviewStatus } from '@/common/data/recruiting/types/enums'
import { createCalendarApiClient } from '@/business-apps/platform/apps/chat/calendar/calendarApiClient'
import { env } from '@/common/env/EnvUtils'

export interface JobInterviewCancelPopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

export const JobInterviewCancelPopup: React.FC<JobInterviewCancelPopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-interview-cancel-popup'
}) => {
  const jobInterviewId =
    additionalData?.jobInterviewId ||
    additionalData?.jobInterviewId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobInterviewId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobInterviewId ||
    additionalData?.id

  const { jobInterview, loading, error } = useJobInterview(accessToken || '', jobInterviewId, 'record')

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
    if (!jobInterview?.meetingLink) {
      return
    }

    try {
      const apiUrl = getChatApiUrl()
      const calendarClient = createCalendarApiClient(apiUrl, accessToken || '')
      await calendarClient.cancelMeeting(jobInterview.meetingLink)
    } catch (error) {
      console.error('Error cancelling chat meeting:', error)
    }
  }, [jobInterview?.meetingLink, accessToken, getChatApiUrl])

  const handleSubmit = useCallback(async () => {
    if (!jobInterview || !jobInterview.id) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'recruiting.jobInterview.cancel.error.noData',
          'Job interview data not loaded'
        )
      )
    }

    return {
      jobInterview: {
        id: jobInterview.id,
        ...(jobInterview.version !== undefined && jobInterview.version !== null
          ? { version: jobInterview.version }
          : {}),
        jobInterviewStatus: JobInterviewStatus.CANCELLED
      },
      changeMode: 'UPDATE' as const
    }
  }, [jobInterview])

  const handleProcessCompletion = () => {
    if (onSuccess) {
      onSuccess()
    }
    onClose()
  }

  if (!jobInterviewId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobInterview.cancel.missingId',
            'Job interview ID not found. Cannot cancel job interview.'
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
          {getTranslationFromI18nKeyAndLabel('recruiting.jobInterview.cancel.loading', 'Loading job interview...')}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobInterview.cancel.error',
            'Failed to load job interview. Please try again.'
          )}
        </Alert>
      </div>
    )
  }

  if (!jobInterview) {
    return null
  }

  const interviewTitle = jobInterview.scheduledAt
    ? new Date(jobInterview.scheduledAt).toLocaleString()
    : getTranslationFromI18nKeyAndLabel('recruiting.jobInterview.unnamed', 'Unnamed Interview')
  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobInterview', 'Job Interview')

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

export default JobInterviewCancelPopup
