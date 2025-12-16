import React, { useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobPosting } from '@/common/data/recruiting/hooks/useJobPosting'
import { buildJobPostingPayload } from '@/common/data/recruiting/payloads/jobPostingPayloads'
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
  DateInput
} from '@newwork/nw-design-system'
import { RECRUITING_CATALOGS } from '@/common/data/recruiting/constants/recruitingConstants'

const jobPostingSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  code: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  requirements: z.string().optional(),
  publishedDate: z.string().optional(),
  closingDate: z.string().optional(),
  isPublished: z.boolean().optional(),
  jobPostingStatusRef: z.string().optional(),
  jobPostingTypeRef: z.string().optional(),
  locationRef: z.string().optional(),
  employmentTypeRef: z.string().optional(),
  contractTypeRef: z.string().optional(),
  jobRequestId: z.string().optional(),
  createdByEmployeeId: z.string().optional(),
  additionalProperties: z.any().optional()
})

type JobPostingFormProps = BusinessAppContextProps

const JobPostingForm: React.FC<JobPostingFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const jobPostingId =
    additionalData?.jobPostingId || additionalData?.psi_taskPayload?.psi_initialParameters?.jobPostingId || undefined

  const { jobPosting, loading, error } = useJobPosting(accessToken || '', jobPostingId)

  const form = useForm({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: mapToFormValues(jobPosting || {}, jobPostingSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const jobPostingRef = useRef(jobPosting)
  useEffect(() => {
    if (jobPostingRef.current?.id !== jobPosting?.id) {
      form.reset(mapToFormValues(jobPosting || {}, jobPostingSchema) as any)
      jobPostingRef.current = jobPosting
    }
  }, [jobPosting?.id, jobPosting, form])

  const handleSubmit = useCallback(async (data: any) => {
    try {
      const payload = buildJobPostingPayload(data)
      return {
        ...payload,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting job posting:', error)
      throw error
    }
  }, [])

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load job posting data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="job-posting-form" />
  }

  const handleCancel = async () => {}

  const processType = jobPosting?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={jobPostingSchema}
        data-testid={formatDataTestId('job-posting-form', 'Form')}
        submitButtonText={jobPosting?.id ? 'Update Job Posting' : 'Create Job Posting'}
        isSubmitDisabled={loading}
      >
        <Form {...form}>
          <div className="gba:space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid={formatDataTestId('job-posting-form', 'title-input')} />
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
                      rows={4}
                      data-testid={formatDataTestId('job-posting-form', 'description-input')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirements</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      data-testid={formatDataTestId('job-posting-form', 'requirements-input')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="jobPostingStatusRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={RECRUITING_CATALOGS.JOB_POSTING_STATUS}
                        value={field.value || null}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-posting-form', 'status-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobPostingTypeRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={RECRUITING_CATALOGS.JOB_POSTING_TYPE}
                        value={field.value || null}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-posting-form', 'type-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="locationRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={RECRUITING_CATALOGS.LOCATION}
                        value={field.value || null}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-posting-form', 'location-select')}
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
                        data-testid={formatDataTestId('job-posting-form', 'employment-type-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      onValueChange={(v: string | string[]) => field.onChange(Array.isArray(v) ? v[0] || '' : v || '')}
                      data-testid={formatDataTestId('job-posting-form', 'contract-type-select')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="publishedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Published Date</FormLabel>
                    <FormControl>
                      <DateInput
                        type="date"
                        value={field.value || ''}
                        onChange={value => field.onChange(value || '')}
                        placeholder="Select published date..."
                        data-testid={formatDataTestId('job-posting-form', 'published-date-input')}
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
                name="closingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Closing Date</FormLabel>
                    <FormControl>
                      <DateInput
                        type="date"
                        value={field.value || ''}
                        onChange={value => field.onChange(value || '')}
                        placeholder="Select closing date..."
                        data-testid={formatDataTestId('job-posting-form', 'closing-date-input')}
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

export default JobPostingForm
