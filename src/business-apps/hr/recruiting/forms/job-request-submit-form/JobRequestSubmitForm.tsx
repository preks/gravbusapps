import React, { useEffect, useRef, useCallback, useState } from 'react'
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
  SelectItem,
  Button
} from '@newwork/nw-design-system'
import { EmployeeSelect } from '@/components/employee-select'
import { JobPositionSelect } from '@/components/job-position-select'
import { JobProfileSelect } from '@/components/job-profile-select'
import { OrganizationalUnitSelect } from '@/components/organizational-unit-select'
import { RECRUITING_CATALOGS } from '@/common/data/recruiting/constants/recruitingConstants'
import { JobRequestType, JobRequestStatus, getJobRequestTypeOptions } from '@/common/data/recruiting/types/enums'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

const jobRequestSubmitSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  code: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  plannedHireDate: z.string().optional(),
  plannedExitDate: z.string().optional(),
  jobRequestType: z.nativeEnum(JobRequestType).optional(),
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

type JobRequestSubmitFormProps = BusinessAppContextProps

const JobRequestSubmitForm: React.FC<JobRequestSubmitFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const jobRequestId =
    additionalData?.jobRequestId || additionalData?.psi_taskPayload?.psi_initialParameters?.jobRequestId || undefined

  const { jobRequest, loading, error } = useJobRequest(accessToken || '', jobRequestId)

  const form = useForm({
    resolver: zodResolver(jobRequestSubmitSchema),
    defaultValues: mapToFormValues(jobRequest || {}, jobRequestSubmitSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const [isSaving, setIsSaving] = useState(false)

  const jobRequestRef = useRef(jobRequest)
  useEffect(() => {
    if (jobRequestRef.current?.id !== jobRequest?.id) {
      form.reset(mapToFormValues(jobRequest || {}, jobRequestSubmitSchema) as any)
      jobRequestRef.current = jobRequest
    }
  }, [jobRequest?.id, jobRequest, form])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const formData = form.getValues()
      const dataWithStatus = {
        ...formData,
        jobRequestStatus: JobRequestStatus.DRAFT
      }
      const { jobRequest } = buildJobRequestPayload(dataWithStatus)
      const payload = {
        jobRequest,
        changeMode: formData.id ? 'UPDATE' : 'INSERT'
      }
      dispatchProcessContinueEvent('pse_submit', payload)
    } catch (error) {
      console.error('Error saving job request:', error)
    } finally {
      setIsSaving(false)
    }
  }, [form])

  const handleSubmit = useCallback(async (data: any) => {
    try {
      const dataWithStatus = {
        ...data,
        jobRequestStatus: JobRequestStatus.SUBMITTED
      }
      const { jobRequest } = buildJobRequestPayload(dataWithStatus)
      return {
        jobRequest,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting job request:', error)
      throw error
    }
  }, [])

  const jobRequestType = form.watch('jobRequestType')
  const isReplacement = jobRequestType === JobRequestType.REPLACEMENT
  const isNew = jobRequestType === JobRequestType.NEW

  useEffect(() => {
    if (isReplacement) {
      form.setValue('jobProfileId', undefined)
    } else if (isNew) {
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
    return <ErrorAlert errors={errors} prefixDataTestId="job-request-submit-form" />
  }

  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

  const processType = jobRequest?.id ? 'update' : 'create'

  const customActions = (
    <div className="gba:flex gba:justify-end gba:gap-2 gba:items-center gba:mt-auto gba:pt-4">
      <Button
        variant="outline"
        type="button"
        onClick={handleCancel}
        disabled={isSaving || loading}
        data-testid={formatDataTestId('job-request-submit-form', 'cancel-button')}
      >
        Cancel
      </Button>
      <Button
        variant="outline"
        type="button"
        onClick={handleSave}
        disabled={isSaving || loading}
        data-testid={formatDataTestId('job-request-submit-form', 'save-button')}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
      <Button
        type="submit"
        disabled={isSaving || loading}
        data-testid={formatDataTestId('job-request-submit-form', 'submit-button')}
      >
        Submit
      </Button>
    </div>
  )

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={jobRequestSubmitSchema}
        data-testid={formatDataTestId('job-request-submit-form', 'Form')}
        customActions={customActions}
        disableFormSubmission={false}
        customFormLayout={true}
      >
        <Form {...form}>
          <div className="gba:space-y-4">
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
                        data-testid={formatDataTestId('job-request-submit-form', 'organizational-unit-select')}
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
                        data-testid={formatDataTestId('job-request-submit-form', 'requester-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="jobRequestType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Type</FormLabel>
                  <FormControl>
                    <Select value={field.value || ''} onValueChange={value => field.onChange(value || '')}>
                      <SelectTrigger data-testid={formatDataTestId('job-request-submit-form', 'type-select')}>
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
                        data-testid={formatDataTestId('job-request-submit-form', 'job-position-select')}
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
                        data-testid={formatDataTestId('job-request-submit-form', 'job-profile-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                        data-testid={formatDataTestId('job-request-submit-form', 'contract-type-select')}
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
                        data-testid={formatDataTestId('job-request-submit-form', 'employment-type-select')}
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
                        data-testid={formatDataTestId('job-request-submit-form', 'experience-level-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid={formatDataTestId('job-request-submit-form', 'name-input')} />
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
                    <Textarea
                      {...field}
                      data-testid={formatDataTestId('job-request-submit-form', 'description-input')}
                    />
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
                        data-testid={formatDataTestId('job-request-submit-form', 'planned-hire-date-input')}
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
                        data-testid={formatDataTestId('job-request-submit-form', 'planned-exit-date-input')}
                        captionLayout="dropdown"
                        outputFormat="iso"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Form>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default JobRequestSubmitForm
