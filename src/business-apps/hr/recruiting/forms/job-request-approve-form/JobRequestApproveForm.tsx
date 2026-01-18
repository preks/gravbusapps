import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobRequest } from '@/common/data/recruiting/hooks/useJobRequest'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { Button, Spinner, Alert } from '@newwork/nw-design-system'
import { getJobRequestTypeLabel, getJobRequestStatusLabel } from '@/common/data/recruiting/types/enums'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

type JobRequestApproveFormProps = BusinessAppContextProps

const JobRequestApproveForm: React.FC<JobRequestApproveFormProps> = ({ accessToken, additionalData }) => {
  const jobRequestId =
    additionalData?.jobRequestId || additionalData?.psi_taskPayload?.psi_initialParameters?.jobRequestId || undefined

  const { jobRequest, loading, error } = useJobRequest(accessToken || '', jobRequestId)

  const [isRejecting, setIsRejecting] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleReject = async () => {
    setIsRejecting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      dispatchProcessContinueEvent('pse_reject', {
        jobRequest: jobRequest?.id,
        event: 'pse_reject'
      })
      setSuccessMessage('Job request rejected successfully')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reject'
      setErrorMessage(`Failed to reject: ${errorMsg}`)
    } finally {
      setIsRejecting(false)
    }
  }

  const handleReturn = async () => {
    setIsReturning(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      dispatchProcessContinueEvent('pse_return', {
        jobRequest: jobRequest?.id,
        event: 'pse_return'
      })
      setSuccessMessage('Job request returned successfully')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to return'
      setErrorMessage(`Failed to return: ${errorMsg}`)
    } finally {
      setIsReturning(false)
    }
  }

  const handleApprove = async () => {
    setIsApproving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      dispatchProcessContinueEvent('pse_approve', {
        jobRequest: jobRequest?.id,
        event: 'pse_approve'
      })
      setSuccessMessage('Job request approved successfully')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to approve'
      setErrorMessage(`Failed to approve: ${errorMsg}`)
    } finally {
      setIsApproving(false)
    }
  }

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load job request data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="job-request-approve-form" />
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid={formatDataTestId('job-request-approve-form', 'loading')}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (!jobRequest) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId('job-request-approve-form', 'error')}>
        Job request not found
      </Alert>
    )
  }

  const getValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '-'
    return String(value)
  }

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid={formatDataTestId('job-request-approve-form', 'Form')}>
      {errorMessage && (
        <Alert variant="destructive" data-testid={formatDataTestId('job-request-approve-form', 'error-message')}>
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="default" data-testid={formatDataTestId('job-request-approve-form', 'success-message')}>
          {successMessage}
        </Alert>
      )}

      <div className="gba:space-y-4">
        <h3 className="gba:text-lg gba:font-semibold">Job Request Details</h3>

        <div className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Name</label>
              <p className="gba:text-sm gba:mt-1">{getValue(jobRequest.name)}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Code</label>
              <p className="gba:text-sm gba:mt-1">{getValue(jobRequest.code)}</p>
            </div>
          </div>

          <div>
            <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Description</label>
            <p className="gba:text-sm gba:mt-1">{getValue(jobRequest.description)}</p>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Type</label>
              <p className="gba:text-sm gba:mt-1">
                {jobRequest.jobRequestType ? getJobRequestTypeLabel(jobRequest.jobRequestType) : '-'}
              </p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Status</label>
              <p className="gba:text-sm gba:mt-1">
                {jobRequest.jobRequestStatus ? getJobRequestStatusLabel(jobRequest.jobRequestStatus) : '-'}
              </p>
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Contract Type</label>
              <p className="gba:text-sm gba:mt-1">{getValue(jobRequest.contractType?.value)}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Employment Type</label>
              <p className="gba:text-sm gba:mt-1">{getValue(jobRequest.employmentType?.value)}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Experience Level</label>
              <p className="gba:text-sm gba:mt-1">{getValue(jobRequest.jobExperienceLevel?.value)}</p>
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Planned Hire Date</label>
              <p className="gba:text-sm gba:mt-1">
                {jobRequest.plannedHireDate ? new Date(jobRequest.plannedHireDate).toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Planned Exit Date</label>
              <p className="gba:text-sm gba:mt-1">
                {jobRequest.plannedExitDate ? new Date(jobRequest.plannedExitDate).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4 gba:border-t">
        <Button
          variant="destructive"
          type="button"
          onClick={handleReject}
          disabled={isRejecting || isReturning || isApproving}
          data-testid={formatDataTestId('job-request-approve-form', 'reject-button')}
        >
          {isRejecting ? 'Rejecting...' : 'Reject'}
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={handleReturn}
          disabled={isRejecting || isReturning || isApproving}
          data-testid={formatDataTestId('job-request-approve-form', 'return-button')}
        >
          {isReturning ? 'Returning...' : 'Return'}
        </Button>
        <Button
          type="button"
          onClick={handleApprove}
          disabled={isRejecting || isReturning || isApproving}
          data-testid={formatDataTestId('job-request-approve-form', 'approve-button')}
        >
          {isApproving ? 'Approving...' : 'Approve'}
        </Button>
      </div>
    </div>
  )
}

export default JobRequestApproveForm
