import React, { useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobCandidate } from '@/common/data/recruiting/hooks/useJobCandidate'
import { buildJobCandidatePayload } from '@/common/data/recruiting/payloads/jobCandidatePayloads'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { CatalogSelect } from '@/components/catalog-select'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input } from '@newwork/nw-design-system'

const jobCandidateSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  code: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  linkedinUrl: z.string().optional(),
  resumeUrl: z.string().optional(),
  coverLetterUrl: z.string().optional(),
  candidateStatusRef: z.string().optional(),
  sourceRef: z.string().optional(),
  academicTitleRef: z.string().optional(),
  createdByEmployeeId: z.string().optional(),
  additionalProperties: z.any().optional()
})

type JobCandidateFormProps = BusinessAppContextProps

const JobCandidateForm: React.FC<JobCandidateFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const jobCandidateId =
    additionalData?.jobCandidateId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobCandidateId ||
    undefined

  const { jobCandidate, loading, error } = useJobCandidate(accessToken || '', jobCandidateId)

  const form = useForm({
    resolver: zodResolver(jobCandidateSchema),
    defaultValues: mapToFormValues(jobCandidate || {}, jobCandidateSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const jobCandidateRef = useRef(jobCandidate)
  useEffect(() => {
    if (jobCandidateRef.current?.id !== jobCandidate?.id) {
      form.reset(mapToFormValues(jobCandidate || {}, jobCandidateSchema) as any)
      jobCandidateRef.current = jobCandidate
    }
  }, [jobCandidate?.id, jobCandidate, form])

  const handleSubmit = useCallback(async (data: any) => {
    try {
      const payload = buildJobCandidatePayload(data)
      return {
        ...payload,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting job candidate:', error)
      throw error
    }
  }, [])

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load job candidate data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="job-candidate-form" />
  }

  const handleCancel = async () => {}

  const processType = jobCandidate?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={jobCandidateSchema}
        data-testid={formatDataTestId('job-candidate-form', 'Form')}
        submitButtonText={jobCandidate?.id ? 'Update Job Candidate' : 'Create Job Candidate'}
        isSubmitDisabled={loading}
      >
        <Form {...form}>
          <div className="gba:space-y-4">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid={formatDataTestId('job-candidate-form', 'firstName-input')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid={formatDataTestId('job-candidate-form', 'lastName-input')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        data-testid={formatDataTestId('job-candidate-form', 'email-input')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid={formatDataTestId('job-candidate-form', 'phone-input')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="linkedinUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      {...field}
                      placeholder="https://linkedin.com/in/..."
                      data-testid={formatDataTestId('job-candidate-form', 'linkedin-input')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="resumeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resume URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        {...field}
                        placeholder="https://..."
                        data-testid={formatDataTestId('job-candidate-form', 'resume-input')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverLetterUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Letter URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        {...field}
                        placeholder="https://..."
                        data-testid={formatDataTestId('job-candidate-form', 'cover-letter-input')}
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
                name="candidateStatusRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Candidate Status</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="CandidateStatus"
                        value={field.value || null}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-candidate-form', 'status-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="Source"
                        value={field.value || null}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-candidate-form', 'source-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="academicTitleRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Title</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier="AcademicTitle"
                      value={field.value || null}
                      onValueChange={(v: string | string[]) => field.onChange(Array.isArray(v) ? v[0] || '' : v || '')}
                      data-testid={formatDataTestId('job-candidate-form', 'academic-title-select')}
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

export default JobCandidateForm
