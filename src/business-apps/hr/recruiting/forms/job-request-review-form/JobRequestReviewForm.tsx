import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Card, CardContent, CardHeader, CardTitle, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useJobRequest } from '@/common/data/recruiting/hooks/useJobRequest'
import { ErrorAlert } from '@/components/error-alert'

type JobRequestReviewFormProps = BusinessAppContextProps

const JobRequestReviewForm: React.FC<JobRequestReviewFormProps> = ({ accessToken, additionalData }) => {
  const jobRequestId =
    additionalData?.jobRequestId || additionalData?.psi_taskPayload?.psi_initialParameters?.jobRequestId || undefined

  const { jobRequest, loading, error } = useJobRequest(accessToken || '', jobRequestId)

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load job request data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="job-request-review-form" />
  }

  if (loading) {
    return <Spinner size="large" />
  }

  return (
    <div data-testid="job-request-review-form" className="gba:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{getTranslationFromI18nKeyAndLabel('reviewJobRequest', 'Review Job Request')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            <div>
              <label className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('title', 'Title')}
              </label>
              <p className="gba:text-base">{jobRequest?.title || '-'}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('description', 'Description')}
              </label>
              <p className="gba:text-base">{jobRequest?.description || '-'}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('status', 'Status')}
              </label>
              <p className="gba:text-base">{jobRequest?.jobRequestStatus?.value || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default JobRequestReviewForm
