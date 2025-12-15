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
  Textarea
} from '@newwork/nw-design-system'
import { RECRUITING_CATALOGS } from '@/common/data/recruiting/constants/recruitingConstants'

const jobRequestSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  code: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  requestDate: z.string().optional(),
  requiredStartDate: z.string().optional(),
  status: z.string().optional(),
  jobRequestStatusRef: z.string().optional(),
  jobRequestTypeRef: z.string().optional(),
  priorityRef: z.string().optional(),
  departmentRef: z.string().optional(),
  requestedByEmployeeId: z.string().optional(),
  jobPositionId: z.string().optional(),
  approvedByEmployeeId: z.string().optional(),
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
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid={formatDataTestId('job-request-form', 'title-input')} />
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

            <FormField
              control={form.control}
              name="jobRequestStatusRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier={RECRUITING_CATALOGS.JOB_REQUEST_STATUS}
                      value={field.value || null}
                      onValueChange={(v: string | null) => field.onChange(v || '')}
                      businessAppContext={{ accessToken, userInfo, additionalData }}
                      placeholder="Select status..."
                      data-testid={formatDataTestId('job-request-form', 'status-select')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priorityRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier={RECRUITING_CATALOGS.PRIORITY}
                      value={field.value || null}
                      onValueChange={(v: string | null) => field.onChange(v || '')}
                      businessAppContext={{ accessToken, userInfo, additionalData }}
                      placeholder="Select priority..."
                      data-testid={formatDataTestId('job-request-form', 'priority-select')}
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

export default JobRequestForm
