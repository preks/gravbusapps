import React, { useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobApplicationInterview } from '@/common/data/recruiting/hooks/useJobApplicationInterview'
import { buildJobApplicationInterviewPayload } from '@/common/data/recruiting/payloads/jobApplicationInterviewPayloads'
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
import { EmployeeSelect } from '@/components/employee-select'
import { RECRUITING_CATALOGS } from '@/common/data/recruiting/constants/recruitingConstants'

const jobApplicationInterviewSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),

  // Date fields
  interviewDate: z.string().optional(),
  scheduledDate: z.string().optional(),
  confirmedDate: z.string().optional(),
  cancelledDate: z.string().optional(),

  // Other fields
  duration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
  participants: z.any().optional(),
  meetingPlace: z.string().optional(),
  meetingLink: z.union([z.string().url({ message: 'Must be a valid URL' }), z.literal('')]).optional(),

  // Catalog Reference
  typeRef: z.string().optional(),

  // Entity References
  jobApplicationId: z.string().min(1, 'Job application is required'),
  employeeId: z.string().optional(),

  additionalProperties: z.any().optional()
})

type JobApplicationInterviewFormProps = BusinessAppContextProps

const JobApplicationInterviewForm: React.FC<JobApplicationInterviewFormProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  const interviewId =
    additionalData?.interviewId ||
    additionalData?.jobApplicationInterviewId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.interviewId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobApplicationInterviewId ||
    undefined

  const jobApplicationId =
    additionalData?.jobApplicationId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobApplicationId ||
    undefined

  const { jobApplicationInterview, loading, error } = useJobApplicationInterview(accessToken || '', interviewId)

  const form = useForm({
    resolver: zodResolver(jobApplicationInterviewSchema),
    defaultValues: mapToFormValues(
      jobApplicationInterview || { jobApplicationId },
      jobApplicationInterviewSchema
    ) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const interviewRef = useRef(jobApplicationInterview)
  useEffect(() => {
    if (interviewRef.current?.id !== jobApplicationInterview?.id) {
      form.reset(mapToFormValues(jobApplicationInterview || { jobApplicationId }, jobApplicationInterviewSchema) as any)
      interviewRef.current = jobApplicationInterview
    }
  }, [jobApplicationInterview?.id, jobApplicationInterview, jobApplicationId, form])

  const handleSubmit = useCallback(async (data: any) => {
    try {
      const payload = buildJobApplicationInterviewPayload(data)
      return {
        ...payload,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting interview:', error)
      throw error
    }
  }, [])

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load interview data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="interview-form" />
  }

  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

  const processType = jobApplicationInterview?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={jobApplicationInterviewSchema}
        data-testid={formatDataTestId('interview-form', 'Form')}
        submitButtonText={jobApplicationInterview?.id ? 'Update Interview' : 'Schedule Interview'}
        isSubmitDisabled={loading}
      >
        <Form {...form}>
          <div className="gba:space-y-4">
            {/* Interview Type */}
            <FormField
              control={form.control}
              name="typeRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interview Type</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier={RECRUITING_CATALOGS.INTERVIEW_TYPE}
                      value={field.value || null}
                      onValueChange={(v: string | string[]) => field.onChange(Array.isArray(v) ? v[0] || '' : v || '')}
                      data-testid={formatDataTestId('interview-form', 'type-select')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Interviewer */}
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interviewer</FormLabel>
                  <FormControl>
                    <EmployeeSelect
                      value={field.value || null}
                      onValueChange={v => field.onChange(v || '')}
                      businessAppContext={{ accessToken, userInfo, additionalData }}
                      placeholder="Select interviewer..."
                      autoSelect="current-user"
                      data-testid={formatDataTestId('interview-form', 'interviewer-select')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Fields in 2-column grid */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Date</FormLabel>
                    <FormControl>
                      <DateInput
                        type="datetime-local"
                        value={field.value || ''}
                        onChange={value => field.onChange(value || '')}
                        placeholder="Select scheduled date..."
                        data-testid={formatDataTestId('interview-form', 'scheduled-date-input')}
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
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(Number.parseInt(e.target.value, 10) || undefined)}
                        data-testid={formatDataTestId('interview-form', 'duration-input')}
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
                name="confirmedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmed Date</FormLabel>
                    <FormControl>
                      <DateInput
                        type="datetime-local"
                        value={field.value || ''}
                        onChange={value => field.onChange(value || '')}
                        placeholder="Confirmation date..."
                        data-testid={formatDataTestId('interview-form', 'confirmed-date-input')}
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
                name="cancelledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancelled Date</FormLabel>
                    <FormControl>
                      <DateInput
                        type="datetime-local"
                        value={field.value || ''}
                        onChange={value => field.onChange(value || '')}
                        placeholder="Cancellation date..."
                        data-testid={formatDataTestId('interview-form', 'cancelled-date-input')}
                        captionLayout="dropdown"
                        outputFormat="iso"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Meeting Details */}
            <FormField
              control={form.control}
              name="meetingPlace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Place</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Conference Room A, Building 2"
                      data-testid={formatDataTestId('interview-form', 'meeting-place-input')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meetingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Link</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      {...field}
                      placeholder="https://meet.example.com/interview-123"
                      data-testid={formatDataTestId('interview-form', 'meeting-link-input')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Participants (JSON) */}
            <FormField
              control={form.control}
              name="participants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Participants (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={typeof field.value === 'string' ? field.value : JSON.stringify(field.value || {}, null, 2)}
                      onChange={e => {
                        try {
                          const parsed = JSON.parse(e.target.value)
                          field.onChange(parsed)
                        } catch {
                          field.onChange(e.target.value)
                        }
                      }}
                      placeholder='{"interviewers": [], "observers": []}'
                      rows={4}
                      data-testid={formatDataTestId('interview-form', 'participants-input')}
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

export default JobApplicationInterviewForm
