import React, { useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobApplication } from '@/common/data/recruiting/hooks/useJobApplication'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { CatalogSelect } from '@/components/catalog-select'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Textarea } from '@newwork/nw-design-system'
import { RECRUITING_CATALOGS } from '@/common/data/recruiting/constants/recruitingConstants'

const jobApplicationSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  code: z.string().optional(),
  applicationDate: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  applicationStatusRef: z.string().optional(),
  applicationStageRef: z.string().optional(),
  jobCandidateId: z.string().optional(),
  jobPostingId: z.string().optional(),
  reviewedByEmployeeId: z.string().optional(),
  additionalProperties: z.any().optional()
})

type JobApplicationFormProps = BusinessAppContextProps

const JobApplicationForm: React.FC<JobApplicationFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const jobApplicationId =
    additionalData?.jobApplicationId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobApplicationId ||
    undefined

  const { jobApplication, loading, error } = useJobApplication(accessToken || '', jobApplicationId)

  const form = useForm({
    resolver: zodResolver(jobApplicationSchema),
    defaultValues: mapToFormValues(jobApplication || {}, jobApplicationSchema) as any,
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
      return {
        ...data,
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
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid={formatDataTestId('job-application-form', 'notes-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="applicationStatusRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier={RECRUITING_CATALOGS.APPLICATION_STATUS}
                      value={field.value || null}
                      onValueChange={(v: string | null) => field.onChange(v || '')}
                      businessAppContext={{ accessToken, userInfo, additionalData }}
                      placeholder="Select status..."
                      data-testid={formatDataTestId('job-application-form', 'status-select')}
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
