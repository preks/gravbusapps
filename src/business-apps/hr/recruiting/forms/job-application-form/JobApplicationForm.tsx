import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobApplication } from '@/common/data/recruiting/hooks/useJobApplication'
import { buildJobApplicationPayload } from '@/common/data/recruiting/payloads/jobApplicationPayloads'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { CatalogSelect } from '@/components/catalog-select'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  DateInput,
  Input
} from '@newwork/nw-design-system'
import { RECRUITING_CATALOGS } from '@/common/data/recruiting/constants/recruitingConstants'
import { EmployeeSelect } from '@/components/employee-select'
import { JobPostingSelect } from '@/components/job-posting-select'
import { JobCandidateSelect } from '@/components/job-candidate-select'
import { useJobPosting } from '@/common/data/recruiting/hooks/useJobPosting'
import { useJobCandidate } from '@/common/data/recruiting/hooks/useJobCandidate'

const jobApplicationSchema = z.object({
  id: z.string().nullish(),
  version: z.number().nullish(),
  code: z.string().nullish(),
  applicationDate: z.string().nullish(),
  status: z.string().nullish(),
  notes: z.string().nullish(),
  applicationStatusRef: z.string().nullish(),
  applicationStageRef: z.string().nullish(),
  jobCandidateId: z.string().min(1, 'Candidate is required'),
  jobPostingId: z.string().min(1, 'Job Posting is required'),
  reviewedByEmployeeId: z.string().nullish(),
  additionalProperties: z.any().optional()
})

type JobApplicationFormProps = BusinessAppContextProps

const JobApplicationForm: React.FC<JobApplicationFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const jobApplicationId =
    additionalData?.jobApplicationId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobApplicationId ||
    undefined

  const scope = useMemo(() => {
    return (
      (additionalData as any)?.externalContextData?.scope || // From AppAction (highest priority)
      additionalData?.scope ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.scope ||
      undefined
    )
  }, [additionalData])
  const isPersonalScope = scope === 'personal'

  const jobPostingId = useMemo(() => {
    return (
      (additionalData as any)?.externalContextData?.jobPostingId || // From AppAction (highest priority)
      additionalData?.jobPostingId ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.jobPostingId ||
      undefined
    )
  }, [additionalData])

  const jobCandidateId = useMemo(() => {
    return (
      (additionalData as any)?.externalContextData?.jobCandidateId || // From AppAction (highest priority)
      additionalData?.jobCandidateId ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.jobCandidateId ||
      undefined
    )
  }, [additionalData])

  const { jobApplication, loading, error } = useJobApplication(accessToken || '', jobApplicationId)

  // Fetch related entities for display in personal scope
  const { jobPosting } = useJobPosting(accessToken || '', jobPostingId, 'record')
  const { jobCandidate } = useJobCandidate(accessToken || '', jobCandidateId)

  // Build initial default values
  const initialDefaultValues = useMemo(() => {
    const baseValues = mapToFormValues(jobApplication || {}, jobApplicationSchema) as any

    // Pre-fill from context if available
    if (!jobApplicationId) {
      const currentDate = new Date().toISOString().split('T')[0]
      return {
        ...baseValues,
        jobPostingId: jobPostingId || baseValues.jobPostingId,
        jobCandidateId: jobCandidateId || baseValues.jobCandidateId,
        applicationDate: baseValues.applicationDate || currentDate,
        applicationStatusRef: baseValues.applicationStatusRef || 'SUBMITTED'
      }
    }

    return baseValues
  }, [jobApplication, jobApplicationId, jobPostingId, jobCandidateId])

  const form = useForm({
    resolver: zodResolver(jobApplicationSchema),
    defaultValues: initialDefaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const jobApplicationRef = useRef(jobApplication)
  useEffect(() => {
    if (jobApplicationRef.current?.id !== jobApplication?.id) {
      form.reset(mapToFormValues(jobApplication || {}, jobApplicationSchema) as any)
      jobApplicationRef.current = jobApplication
    }
  }, [jobApplication?.id, jobApplication, form])

  const handleSubmit = useCallback(async (data: any) => {
    try {
      const { jobApplication } = buildJobApplicationPayload(data)
      return {
        jobApplication,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting job application:', error)
      throw error
    }
  }, [])

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load job application data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="job-application-form" />
  }

  const handleCancel = async () => {}

  const processType = jobApplication?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={jobApplicationSchema}
        data-testid={formatDataTestId('job-application-form', 'Form')}
        submitButtonText={jobApplication?.id ? 'Update Job Application' : 'Create Job Application'}
        isSubmitDisabled={loading}
      >
        <Form {...form}>
          <div className="gba:space-y-4">
            {/* Job Posting Selection */}
            <FormField
              control={form.control}
              name="jobPostingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Job Posting <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    {isPersonalScope ? (
                      <div className="gba:p-3 gba:border gba:border-border gba:rounded-md gba:bg-muted">
                        <p className="gba:text-sm gba:font-medium">{jobPosting?.title || 'Loading...'}</p>
                      </div>
                    ) : (
                      <JobPostingSelect
                        value={field.value || null}
                        onValueChange={field.onChange}
                        businessAppContext={{ accessToken, userInfo, additionalData }}
                        placeholder="Select job posting..."
                        data-testid={formatDataTestId('job-application-form', 'job-posting-select')}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Job Candidate Selection */}
            <FormField
              control={form.control}
              name="jobCandidateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Candidate <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    {isPersonalScope ? (
                      <div className="gba:p-3 gba:border gba:border-border gba:rounded-md gba:bg-muted">
                        <p className="gba:text-sm gba:font-medium">
                          {jobCandidate
                            ? jobCandidate.displayName || `${jobCandidate.firstName} ${jobCandidate.lastName}`
                            : 'Loading...'}
                        </p>
                      </div>
                    ) : (
                      <JobCandidateSelect
                        value={field.value || null}
                        onValueChange={field.onChange}
                        accessToken={accessToken || ''}
                        placeholder="Select candidate..."
                        data-testid={formatDataTestId('job-application-form', 'job-candidate-select')}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="applicationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application Date</FormLabel>
                  <FormControl>
                    <DateInput
                      type="date"
                      value={field.value || ''}
                      onChange={value => field.onChange(value || '')}
                      placeholder="Select application date..."
                      data-testid={formatDataTestId('job-application-form', 'application-date-input')}
                      captionLayout="dropdown"
                      outputFormat="iso"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid={formatDataTestId('job-application-form', 'status-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      data-testid={formatDataTestId('job-application-form', 'notes-input')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="applicationStatusRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Status</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={RECRUITING_CATALOGS.APPLICATION_STATUS}
                        value={field.value || null}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-application-form', 'application-status-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicationStageRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Stage</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={RECRUITING_CATALOGS.JOB_APPLICATION_STAGE}
                        value={field.value || null}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-application-form', 'application-stage-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reviewedByEmployeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reviewed By</FormLabel>
                  <FormControl>
                    <EmployeeSelect
                      value={field.value || null}
                      onValueChange={v => field.onChange(v || '')}
                      businessAppContext={{ accessToken, userInfo, additionalData }}
                      placeholder="Select reviewer..."
                      data-testid={formatDataTestId('job-application-form', 'reviewer-select')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default JobApplicationForm
