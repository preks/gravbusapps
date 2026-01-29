import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react'
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button
} from '@newwork/nw-design-system'
import { EmployeeSelect } from '@/components/employee-select'
import { JobPositionSelect } from '@/common/components/recruiting/form-components/job-position-select'
import { JobProfileSelect } from '@/common/components/recruiting/form-components/job-profile-select'
import { OrganizationalUnitSelect } from '@/components/organizational-unit-select'
import { CompanySelect } from '@/components/company-select'
import { CostCenterSelect } from '@/components/cost-center-select'
import { SiteLocationSelect } from '@/components/site-location-select'
import { RECRUITING_CATALOGS } from '@/common/data/recruiting/constants/recruitingConstants'
import { JobRequestType, JobRequestStatus, getJobRequestTypeOptions } from '@/common/data/recruiting/types/enums'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { PlannedDateFields } from '../_shared/components/PlannedDateFields'

const jobRequestSubmitSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  code: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  plannedHireDate: z.string().optional(),
  plannedExitDate: z.string().optional(),
  jobRequestType: z.enum(Object.values(JobRequestType) as [string, ...string[]]).optional(),
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
  amount: z.number().min(1, 'Amount must be at least 1').default(1),
  additionalProperties: z.any().optional()
})

type JobRequestSubmitFormProps = BusinessAppContextProps

const JobRequestSubmitForm: React.FC<JobRequestSubmitFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const jobRequestId =
    additionalData?.jobRequestId || additionalData?.psi_taskPayload?.psi_initialParameters?.jobRequestId || undefined

  const { jobRequest, loading, error } = useJobRequest(accessToken || '', jobRequestId)

  // Extract context data for prefilling
  const contextData = useMemo(
    () => ({
      organizationalUnitId: additionalData?.organizationalUnitId,
      costCenterId: additionalData?.costCenterId,
      siteLocationId: additionalData?.siteLocationId,
      companyId: additionalData?.companyId
    }),
    [additionalData]
  )

  // Build initial default values
  const initialDefaultValues = useMemo(() => {
    const baseValues = mapToFormValues(jobRequest || {}, jobRequestSubmitSchema) as any

    // If no existing job request, prefill from context
    if (!jobRequestId) {
      return {
        ...baseValues,
        organizationalUnitId: contextData.organizationalUnitId || baseValues.organizationalUnitId,
        costCenterId: contextData.costCenterId || baseValues.costCenterId,
        siteLocationId: contextData.siteLocationId || baseValues.siteLocationId,
        companyId: contextData.companyId || baseValues.companyId,
        amount: 1
      }
    }

    return baseValues
  }, [jobRequest, jobRequestId, contextData])

  const form = useForm({
    resolver: zodResolver(jobRequestSubmitSchema),
    defaultValues: initialDefaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    setIsSubmitting(true)
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
    } finally {
      setIsSubmitting(false)
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
        disabled={isSaving || isSubmitting || loading}
        data-testid={formatDataTestId('job-request-submit-form', 'cancel-button')}
      >
        Cancel
      </Button>
      <Button
        variant="outline"
        type="button"
        onClick={handleSave}
        disabled={isSaving || isSubmitting || loading}
        data-testid={formatDataTestId('job-request-submit-form', 'save-button')}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
      <Button
        type="submit"
        disabled={isSaving || isSubmitting || loading}
        data-testid={formatDataTestId('job-request-submit-form', 'submit-button')}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      value={field.value || 1}
                      onChange={e => field.onChange(e.target.value ? Number.parseInt(e.target.value, 10) : 1)}
                      data-testid={formatDataTestId('job-request-submit-form', 'amount-input')}
                    />
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

            <div className="gba:grid gba:grid-cols-3 gba:gap-4">
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <CompanySelect
                        value={field.value || null}
                        onValueChange={v => field.onChange(v || '')}
                        businessAppContext={{ accessToken, userInfo, additionalData }}
                        placeholder="Select company..."
                        data-testid={formatDataTestId('job-request-submit-form', 'company-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="costCenterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Center</FormLabel>
                    <FormControl>
                      <CostCenterSelect
                        value={field.value || null}
                        onValueChange={v => field.onChange(v || '')}
                        businessAppContext={{ accessToken, userInfo, additionalData }}
                        placeholder="Select cost center..."
                        data-testid={formatDataTestId('job-request-submit-form', 'cost-center-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="siteLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Location</FormLabel>
                    <FormControl>
                      <SiteLocationSelect
                        value={field.value || null}
                        onValueChange={v => field.onChange(v || '')}
                        businessAppContext={{ accessToken, userInfo, additionalData }}
                        placeholder="Select site location..."
                        data-testid={formatDataTestId('job-request-submit-form', 'site-location-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <PlannedDateFields control={form.control} prefixDataTestId="job-request-submit-form" />
          </div>
        </Form>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default JobRequestSubmitForm
