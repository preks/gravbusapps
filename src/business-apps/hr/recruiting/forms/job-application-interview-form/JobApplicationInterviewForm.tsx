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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  DateInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { getJobInterviewStatusOptions } from '@/common/data/recruiting/types/enums'

const jobApplicationInterviewSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),

  // Date and time fields
  scheduledAt: z.string().optional(),

  // Other fields
  duration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
  location: z.string().optional(),
  meetingLink: z.union([z.string().url({ message: 'Must be a valid URL' }), z.literal('')]).optional(),
  jobInterviewStatus: z.string().optional(),

  // Entity References
  jobApplicationId: z.string().min(1, 'Job application is required'),

  additionalProperties: z.any().optional()
})

type JobApplicationInterviewFormProps = BusinessAppContextProps

const JobApplicationInterviewForm: React.FC<JobApplicationInterviewFormProps> = ({ accessToken, additionalData }) => {
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
      const { jobApplicationInterview } = buildJobApplicationInterviewPayload(data)
      return {
        jobApplicationInterview,
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
          {/* Scheduled Date and Duration */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date & Time</FormLabel>
                  <FormControl>
                    <DateInput
                      type="datetime-local"
                      value={field.value || ''}
                      onChange={value => field.onChange(value || '')}
                      placeholder="Select scheduled date..."
                      data-testid={formatDataTestId('interview-form', 'scheduled-at-input')}
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

          {/* Location and Meeting Link */}
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Conference Room A, Building 2"
                    data-testid={formatDataTestId('interview-form', 'location-input')}
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

          {/* Interview Status */}
          <FormField
            control={form.control}
            name="jobInterviewStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interview Status</FormLabel>
                <FormControl>
                  <Select value={field.value || ''} onValueChange={v => field.onChange(v || '')}>
                    <SelectTrigger data-testid={formatDataTestId('interview-form', 'status-select')}>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getJobInterviewStatusOptions().map(option => (
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
  )
}

export default JobApplicationInterviewForm
