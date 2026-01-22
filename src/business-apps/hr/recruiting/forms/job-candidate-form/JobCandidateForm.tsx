import React, { useEffect, useRef, useCallback, useMemo } from 'react'
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Button,
  DateInput
} from '@newwork/nw-design-system'
import { useEmployeeByUserId } from '@/common/data/employee/hooks/useEmployeeByUserId'
import { ArrowsClockwise } from '@phosphor-icons/react'

const jobCandidateSchema = z.object({
  id: z.string().nullish(),
  version: z.number().nullish(),
  code: z.string().nullish(),
  title: z.string().nullish(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  displayName: z.string().nullish(),
  birthDate: z.string().nullish(),
  birthName: z.string().nullish(),
  birthPlace: z.string().nullish(),
  children: z.number().nullish(),
  jobCandidateStatus: z.string().nullish(),
  academicTitleRef: z.string().nullish(),
  genderRef: z.string().nullish(),
  nationalityRef: z.string().nullish(),
  ethnicityRef: z.string().nullish(),
  maritalStatusRef: z.string().nullish(),
  disabilityStatusRef: z.string().nullish(),
  veteranStatusRef: z.string().nullish(),
  sourceRef: z.string().nullish(),
  candidateStatusRef: z.string().nullish(),
  notes: z.string().nullish(),
  // Jsonb fields (simplified for now - full editors can be added later)
  communicationChannels: z.any().optional(),
  addresses: z.any().optional(),
  educations: z.any().optional(),
  certificates: z.any().optional(),
  additionalProperties: z.any().optional()
})

type JobCandidateFormProps = BusinessAppContextProps

const JobCandidateForm: React.FC<JobCandidateFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const jobCandidateId =
    additionalData?.jobCandidateId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobCandidateId ||
    undefined

  const scope = useMemo(() => {
    return additionalData?.scope || additionalData?.psi_taskPayload?.psi_initialParameters?.scope || undefined
  }, [additionalData])
  const isPersonalScope = scope === 'personal'

  const { jobCandidate, loading, error } = useJobCandidate(accessToken || '', jobCandidateId)

  // Extract userId from psi_initialParameters
  const userId = useMemo(() => {
    return additionalData?.psi_taskPayload?.psi_initialParameters?.userId || additionalData?.userId || undefined
  }, [additionalData])

  // Fetch employee data if userId is provided
  const { employee: employeeData, loading: employeeLoading } = useEmployeeByUserId({
    accessToken: accessToken || '',
    userId
  })

  const hasEmployee = !!employeeData

  // Initialize form with jobCandidate data OR employee data (in personal scope, create mode)
  // When using employee data, remove id to avoid conflicts
  const getInitialFormData = useCallback(() => {
    if (jobCandidate) {
      return jobCandidate
    }
    if (isPersonalScope && !jobCandidateId && employeeData) {
      // Remove id from employee data for create mode (employee doesn't have version)
      const employeeWithoutId = Object.fromEntries(Object.entries(employeeData).filter(([key]) => key !== 'id'))
      return employeeWithoutId
    }
    return {}
  }, [jobCandidate, isPersonalScope, jobCandidateId, employeeData])

  const form = useForm({
    resolver: zodResolver(jobCandidateSchema),
    defaultValues: mapToFormValues(getInitialFormData(), jobCandidateSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const jobCandidateRef = useRef(jobCandidate)
  const employeeDataRef = useRef(employeeData)

  // Sync form when jobCandidate changes (switching between candidates)
  useEffect(() => {
    if (jobCandidateRef.current?.id !== jobCandidate?.id) {
      form.reset(mapToFormValues(jobCandidate || {}, jobCandidateSchema) as any)
      jobCandidateRef.current = jobCandidate
    }
  }, [jobCandidate?.id, jobCandidate, form])

  // Sync form when employee data loads in personal scope (create mode only)
  useEffect(() => {
    if (
      isPersonalScope &&
      !jobCandidateId &&
      !loading &&
      employeeData &&
      employeeDataRef.current?.id !== employeeData?.id
    ) {
      // Remove id from employee data for create mode (employee doesn't have version)
      const employeeWithoutId = Object.fromEntries(Object.entries(employeeData).filter(([key]) => key !== 'id'))
      form.reset(mapToFormValues(employeeWithoutId, jobCandidateSchema) as any)
      employeeDataRef.current = employeeData
    }
  }, [isPersonalScope, employeeData, jobCandidateId, loading, form])

  // Handle reload from employee data
  const handleReloadFromEmployee = useCallback(() => {
    if (employeeData) {
      // Remove id from employee data for create mode (employee doesn't have version)
      const employeeWithoutId = Object.fromEntries(Object.entries(employeeData).filter(([key]) => key !== 'id'))
      form.reset(mapToFormValues(employeeWithoutId, jobCandidateSchema) as any)
    }
  }, [employeeData, form])

  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        const { jobCandidate } = buildJobCandidatePayload(data)

        // Add userId to the payload if in personal scope and creating new candidate
        if (isPersonalScope && !data.id && userId) {
          jobCandidate.userId = userId
        }

        return {
          jobCandidate,
          changeMode: data.id ? 'UPDATE' : 'INSERT'
        }
      } catch (error) {
        console.error('Error submitting job candidate:', error)
        throw error
      }
    },
    [isPersonalScope, userId]
  )

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
            {/* Reload from Employee Button - Only in personal scope with employee data */}
            {isPersonalScope && hasEmployee && (
              <div className="gba:flex gba:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReloadFromEmployee}
                  disabled={employeeLoading}
                  data-testid={formatDataTestId('job-candidate-form', 'reload-from-employee-button')}
                >
                  <ArrowsClockwise size={16} className="gba:mr-2" />
                  Reload from Employee
                </Button>
              </div>
            )}

            {/* Personal Information */}
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
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth Date</FormLabel>
                    <FormControl>
                      <DateInput {...field} data-testid={formatDataTestId('job-candidate-form', 'birthDate-input')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthPlace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth Place</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid={formatDataTestId('job-candidate-form', 'birthPlace-input')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="birthName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birth Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid={formatDataTestId('job-candidate-form', 'birthName-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="genderRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="Gender"
                        value={field.value || ''}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-candidate-form', 'gender-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nationalityRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="Nationality"
                        value={field.value || ''}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-candidate-form', 'nationality-select')}
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
                name="maritalStatusRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="MaritalStatus"
                        value={field.value || ''}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-candidate-form', 'maritalStatus-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="children"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Children</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        data-testid={formatDataTestId('job-candidate-form', 'children-input')}
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
                      value={field.value || ''}
                      onValueChange={(v: string | string[]) => field.onChange(Array.isArray(v) ? v[0] || '' : v || '')}
                      data-testid={formatDataTestId('job-candidate-form', 'academic-title-select')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="ethnicityRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ethnicity</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="Ethnicity"
                        value={field.value || ''}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-candidate-form', 'ethnicity-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="disabilityStatusRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disability Status</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="DisabilityStatus"
                        value={field.value || ''}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-candidate-form', 'disabilityStatus-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="veteranStatusRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veteran Status</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier="VeteranStatus"
                      value={field.value || ''}
                      onValueChange={(v: string | string[]) => field.onChange(Array.isArray(v) ? v[0] || '' : v || '')}
                      data-testid={formatDataTestId('job-candidate-form', 'veteranStatus-select')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hide candidateStatusRef, sourceRef, and notes in personal scope */}
            {!isPersonalScope && (
              <>
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
                            value={field.value || ''}
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
                            value={field.value || ''}
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid={formatDataTestId('job-candidate-form', 'notes-input')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
        </Form>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default JobCandidateForm
