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
import {
  RECRUITING_CATALOGS,
  JOB_REQUISITION_REASON_VALUES
} from '@/common/data/recruiting/constants/recruitingConstants'
import { REQUISITION_STATUS_OPTIONS } from '@/common/data/recruiting/constants/requisitionStatus'

const jobRequestSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  code: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  note: z.string().optional(),
  headcount: z.number().min(1, 'Headcount must be at least 1').default(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  requisitionStatus: z.string().optional(),
  reasonRef: z.string().optional(),
  contractTypeRef: z.string().optional(),
  experienceLevelRef: z.string().optional(),
  organizationalUnitId: z.string().optional(),
  replacedPositionId: z.string().optional(),
  requesterId: z.string().optional(),
  jobProfileId: z.string().optional(),
  costCenterId: z.string().optional(),
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
      const payload = buildJobRequestPayload(data)
      return {
        ...payload,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting job request:', error)
      throw error
    }
  }, [])

  // Watch reasonRef to determine which fields to show
  const reasonRef = form.watch('reasonRef')

  // Extract the code part from catalog entry format: "CatalogName:Version:Code" -> "Code"
  // This ensures it works even if the catalog name format varies slightly
  const getReasonCode = (ref?: string | null): string | null => {
    if (!ref) return null
    const parts = ref.split(':')
    return parts.length >= 3 ? parts[parts.length - 1] : null
  }

  const reasonCode = getReasonCode(reasonRef)

  // Check reason using constants (exact match) or code extraction (fallback)
  const isReplacement = reasonRef === JOB_REQUISITION_REASON_VALUES.REPLACEMENT || reasonCode === '1'
  const isNew = reasonRef === JOB_REQUISITION_REASON_VALUES.NEW || reasonCode === '2'

  // Clear fields when reason changes
  useEffect(() => {
    if (isReplacement) {
      // Clear job profile and headcount when switching to REPLACEMENT
      form.setValue('jobProfileId', undefined)
      form.setValue('headcount', 1)
    } else if (isNew) {
      // Clear replaced position when switching to NEW
      form.setValue('replacedPositionId', undefined)
    }
  }, [reasonRef, isReplacement, isNew, form])

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
                name="requesterId"
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

            {/* Second line: Reason */}
            <FormField
              control={form.control}
              name="reasonRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier={RECRUITING_CATALOGS.JOB_REQUISITION_REASON}
                      value={field.value || null}
                      onValueChange={(v: string | string[]) => field.onChange(Array.isArray(v) ? v[0] || '' : v || '')}
                      data-testid={formatDataTestId('job-request-form', 'reason-select')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Third line: Job Position (REPLACEMENT) OR Job Profile and Headcount (NEW) */}
            {isReplacement && (
              <FormField
                control={form.control}
                name="replacedPositionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Position</FormLabel>
                    <FormControl>
                      <JobPositionSelect
                        value={field.value || null}
                        onValueChange={v => field.onChange(v || '')}
                        businessAppContext={{ accessToken, userInfo, additionalData }}
                        placeholder="Select job position..."
                        data-testid={formatDataTestId('job-request-form', 'job-position-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isNew && (
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <FormField
                  control={form.control}
                  name="jobProfileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Profile</FormLabel>
                      <FormControl>
                        <JobProfileSelect
                          value={field.value || null}
                          onValueChange={v => field.onChange(v || '')}
                          businessAppContext={{ accessToken, userInfo, additionalData }}
                          placeholder="Select job profile..."
                          data-testid={formatDataTestId('job-request-form', 'job-profile-select')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="headcount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Headcount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          value={field.value || 1}
                          onChange={e => field.onChange(Number.parseInt(e.target.value, 10) || 1)}
                          data-testid={formatDataTestId('job-request-form', 'headcount-input')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Fourth line: Contract Type and Experience Level */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
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
                name="experienceLevelRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience Level</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={RECRUITING_CATALOGS.EXPERIENCE_LEVEL}
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid={formatDataTestId('job-request-form', 'code-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid={formatDataTestId('job-request-form', 'name-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid={formatDataTestId('job-request-form', 'note-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DateInput
                        type="date"
                        value={field.value || ''}
                        onChange={value => field.onChange(value || '')}
                        placeholder="Select start date..."
                        data-testid={formatDataTestId('job-request-form', 'start-date-input')}
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
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <DateInput
                        type="date"
                        value={field.value || ''}
                        onChange={value => field.onChange(value || '')}
                        placeholder="Select end date..."
                        data-testid={formatDataTestId('job-request-form', 'end-date-input')}
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
              name="requisitionStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ''}
                      onValueChange={value => field.onChange(typeof value === 'string' ? value : value[0] || '')}
                    >
                      <SelectTrigger data-testid={formatDataTestId('job-request-form', 'status-select')}>
                        <SelectValue placeholder="Select status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REQUISITION_STATUS_OPTIONS.map(option => (
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
