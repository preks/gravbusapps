import React, { useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobRequest } from '@/common/data/recruiting/hooks/useJobRequest'
import { buildJobRequestPayload } from '@/common/data/recruiting/payloads/jobRequestPayloads'
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
  Input,
  Textarea,
  DateInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { EmployeeSelect } from '@/components/employee-select'
import { JobPositionSelect } from '@/components/job-position-select'
import { JobProfileSelect } from '@/components/job-profile-select'
import { OrganizationalUnitSelect } from '@/components/organizational-unit-select'
import { RECRUITING_CATALOGS } from '@/common/data/recruiting/constants/recruitingConstants'
import {
  JobRequestType,
  JobRequestStatus,
  getJobRequestTypeOptions,
  getJobRequestStatusOptions
} from '@/common/data/recruiting/types/enums'

const jobRequestSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  code: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  plannedHireDate: z.string().optional(),
  plannedExitDate: z.string().optional(),
  jobRequestType: z.nativeEnum(JobRequestType).optional(),
  jobRequestStatus: z.nativeEnum(JobRequestStatus).optional(),
  contractTypeRef: z.string().optional(),
  employmentTypeRef: z.string().optional(),
  jobExperienceLevelRef: z.string().optional(),
  organizationalUnitId: z.string().optional(),
  companyId: z.string().optional(),
  costCenterId: z.string().optional(),
  siteLocationId: z.string().optional(),
  jobProfileId: z.string().optional(),
  jobPositionId: z.string().optional(),
  requesterEmployeeId: z.string().optional(),
  additionalProperties: z.any().optional()
})

type JobRequestFormProps = BusinessAppContextProps

const JobRequestForm: React.FC<JobRequestFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const jobRequestId =
    additionalData?.jobRequestId || additionalData?.psi_taskPayload?.psi_initialParameters?.jobRequestId || undefined

  const { jobRequest, loading, error } = useJobRequest(accessToken || '', jobRequestId)

  const form = useForm({
    resolver: zodResolver(jobRequestSchema),
    defaultValues: mapToFormValues(jobRequest || {}, jobRequestSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const jobRequestRef = useRef(jobRequest)
  useEffect(() => {
    if (jobRequestRef.current?.id !== jobRequest?.id) {
      form.reset(mapToFormValues(jobRequest || {}, jobRequestSchema) as any)
      jobRequestRef.current = jobRequest
    }
  }, [jobRequest?.id, jobRequest, form])

  const handleSubmit = useCallback(async (data: any) => {
    try {
      const { jobRequest } = buildJobRequestPayload(data)
      return {
        jobRequest,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting job request:', error)
      throw error
    }
  }, [])

  // Watch jobRequestType to determine which fields to show
  const jobRequestType = form.watch('jobRequestType')

  // Check job request type
  const isReplacement = jobRequestType === JobRequestType.REPLACEMENT
  const isNew = jobRequestType === JobRequestType.NEW

  // Clear fields when type changes
  useEffect(() => {
    if (isReplacement) {
      // Clear job profile when switching to REPLACEMENT
      form.setValue('jobProfileId', undefined)
    } else if (isNew) {
      // Clear job position when switching to NEW
      form.setValue('jobPositionId', undefined)
    }
  }, [jobRequestType, isReplacement, isNew, form])

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load job request data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="job-request-form" />
  }

  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

  const processType = jobRequest?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={jobRequestSchema}
        data-testid={formatDataTestId('job-request-form', 'Form')}
        submitButtonText={jobRequest?.id ? 'Update Job Request' : 'Create Job Request'}
        isSubmitDisabled={loading}
      >
        <Form {...form}>
          <div className="gba:space-y-4">
            {/* First line: Organizational Unit and Requester */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="organizationalUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organizational Unit</FormLabel>
                    <FormControl>
                      <OrganizationalUnitSelect
                        value={field.value || null}
                        onValueChange={v => field.onChange(v || '')}
                        businessAppContext={{ accessToken, userInfo, additionalData }}
                        placeholder="Select organizational unit..."
                        autoSelect="current-user"
                        data-testid={formatDataTestId('job-request-form', 'organizational-unit-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requesterEmployeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requester</FormLabel>
                    <FormControl>
                      <EmployeeSelect
                        value={field.value || null}
                        onValueChange={v => field.onChange(v || '')}
                        businessAppContext={{ accessToken, userInfo, additionalData }}
                        placeholder="Select requester..."
                        autoSelect="current-user"
                        data-testid={formatDataTestId('job-request-form', 'requester-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Second line: Job Request Type */}
            <FormField
              control={form.control}
              name="jobRequestType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Type</FormLabel>
                  <FormControl>
                    <Select value={field.value || ''} onValueChange={value => field.onChange(value || '')}>
                      <SelectTrigger data-testid={formatDataTestId('job-request-form', 'type-select')}>
                        <SelectValue placeholder="Select request type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getJobRequestTypeOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Third line: Job Position (REPLACEMENT) OR Job Profile (NEW) */}
            {isReplacement && (
              <FormField
                control={form.control}
                name="jobPositionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Position (Replacement)</FormLabel>
                    <FormControl>
                      <JobPositionSelect
                        value={field.value || null}
                        onValueChange={v => field.onChange(v || '')}
                        businessAppContext={{ accessToken, userInfo, additionalData }}
                        placeholder="Select job position to replace..."
                        data-testid={formatDataTestId('job-request-form', 'job-position-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isNew && (
              <FormField
                control={form.control}
                name="jobProfileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Profile (New Position)</FormLabel>
                    <FormControl>
                      <JobProfileSelect
                        value={field.value || null}
                        onValueChange={v => field.onChange(v || '')}
                        businessAppContext={{ accessToken, userInfo, additionalData }}
                        placeholder="Select job profile for new position..."
                        data-testid={formatDataTestId('job-request-form', 'job-profile-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Fourth line: Contract Type, Employment Type, and Experience Level */}
            <div className="gba:grid gba:grid-cols-3 gba:gap-4">
              <FormField
                control={form.control}
                name="contractTypeRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Type</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={RECRUITING_CATALOGS.CONTRACT_TYPE}
                        value={field.value || null}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-request-form', 'contract-type-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employmentTypeRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={RECRUITING_CATALOGS.EMPLOYMENT_TYPE}
                        value={field.value || null}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-request-form', 'employment-type-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobExperienceLevelRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience Level</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={RECRUITING_CATALOGS.JOB_EXPERIENCE_LEVEL}
                        value={field.value || null}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-request-form', 'experience-level-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional fields */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid={formatDataTestId('job-request-form', 'name-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid={formatDataTestId('job-request-form', 'description-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="plannedHireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned Hire Date</FormLabel>
                    <FormControl>
                      <DateInput
                        type="date"
                        value={field.value || ''}
                        onChange={value => field.onChange(value || '')}
                        placeholder="Select planned hire date..."
                        data-testid={formatDataTestId('job-request-form', 'planned-hire-date-input')}
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
                name="plannedExitDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned Exit Date</FormLabel>
                    <FormControl>
                      <DateInput
                        type="date"
                        value={field.value || ''}
                        onChange={value => field.onChange(value || '')}
                        placeholder="Select planned exit date..."
                        data-testid={formatDataTestId('job-request-form', 'planned-exit-date-input')}
                        captionLayout="dropdown"
                        outputFormat="iso"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="jobRequestStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select value={field.value || ''} onValueChange={value => field.onChange(value || '')}>
                      <SelectTrigger data-testid={formatDataTestId('job-request-form', 'status-select')}>
                        <SelectValue placeholder="Select status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getJobRequestStatusOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

export default JobRequestForm
