import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobRequest } from '@/common/data/recruiting/hooks/useJobRequest'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { Button, Spinner, Alert, Checkbox, Label } from '@newwork/nw-design-system'
import { getJobRequestTypeLabel, getJobRequestStatusLabel } from '@/common/data/recruiting/types/enums'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

type JobRequestApproveFormProps = BusinessAppContextProps

const JobRequestApproveForm: React.FC<JobRequestApproveFormProps> = ({ accessToken, additionalData }) => {
  // Extract job request ID from task payload
  const jobRequestId = useMemo(() => {
    const taskPayload = additionalData?.psi_taskPayload
    return taskPayload?.jobRequest?.id || undefined
  }, [additionalData])

  // Fetch current job request from database for safety
  const { jobRequest, loading, error } = useJobRequest(accessToken || '', jobRequestId)

  const creatorName = useMemo(() => {
    const taskPayload = additionalData?.psi_taskPayload
    return taskPayload?.creatorName || null
  }, [additionalData])

  const [isRejecting, setIsRejecting] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [requireJobPosting, setRequireJobPosting] = useState(true)
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
        requireJobPosting: requireJobPosting,
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

  // Helper to get catalog value labels - handle both hydrated objects and refs
  const getCatalogLabel = (catalogData: any): string => {
    if (!catalogData) return '-'
    // If it's a hydrated object with 'value' property
    if (typeof catalogData === 'object' && catalogData.value) {
      return catalogData.value
    }
    // If it's just a ref string, extract the last part
    if (typeof catalogData === 'string') {
      const parts = catalogData.split(':')
      return parts[parts.length - 1] || catalogData
    }
    return '-'
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

      {creatorName && (
        <div className="gba:mb-4">
          <p className="gba:text-sm gba:text-muted-foreground">
            Requested by: <span className="gba:font-medium gba:text-foreground">{creatorName}</span>
          </p>
        </div>
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

          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
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
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Amount</label>
              <p className="gba:text-sm gba:mt-1">{getValue(jobRequest.amount)}</p>
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Organizational Unit</label>
              <p className="gba:text-sm gba:mt-1">
                {jobRequest.organizationalUnit?.name || getValue(jobRequest.organizationalUnitId)}
              </p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Requester</label>
              <p className="gba:text-sm gba:mt-1">
                {jobRequest.requesterEmployee
                  ? `${jobRequest.requesterEmployee.firstName} ${jobRequest.requesterEmployee.lastName}`
                  : getValue(jobRequest.requesterEmployeeId)}
              </p>
            </div>
          </div>

          {jobRequest.jobPosition && (
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                Job Position (Replacement)
              </label>
              <p className="gba:text-sm gba:mt-1">
                {jobRequest.jobPosition.name || getValue(jobRequest.jobPositionId)}
              </p>
            </div>
          )}

          {jobRequest.jobProfile && (
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                Job Profile (New Position)
              </label>
              <p className="gba:text-sm gba:mt-1">{jobRequest.jobProfile.name || getValue(jobRequest.jobProfileId)}</p>
            </div>
          )}

          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Contract Type</label>
              <p className="gba:text-sm gba:mt-1">{getCatalogLabel(jobRequest.contractType)}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Employment Type</label>
              <p className="gba:text-sm gba:mt-1">{getCatalogLabel(jobRequest.employmentType)}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Experience Level</label>
              <p className="gba:text-sm gba:mt-1">{getCatalogLabel(jobRequest.jobExperienceLevel)}</p>
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Company</label>
              <p className="gba:text-sm gba:mt-1">{jobRequest.company?.name || getValue(jobRequest.companyId)}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Cost Center</label>
              <p className="gba:text-sm gba:mt-1">{jobRequest.costCenter?.name || getValue(jobRequest.costCenterId)}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Site Location</label>
              <p className="gba:text-sm gba:mt-1">
                {jobRequest.siteLocation?.name || getValue(jobRequest.siteLocationId)}
              </p>
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

      <div className="gba:border-t gba:pt-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Checkbox
            id="requireJobPosting"
            checked={requireJobPosting}
            onCheckedChange={checked => setRequireJobPosting(checked === true)}
            data-testid={formatDataTestId('job-request-approve-form', 'require-job-posting-checkbox')}
          />
          <Label htmlFor="requireJobPosting" className="gba:text-sm gba:font-medium gba:cursor-pointer">
            Require Job Posting
          </Label>
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
