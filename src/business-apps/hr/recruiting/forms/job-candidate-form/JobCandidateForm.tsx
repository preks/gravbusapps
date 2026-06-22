import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
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
  DateInput,
  Textarea
} from '@newwork/nw-design-system'
import { useEmployeeByUserId } from '@/common/data/employee/hooks/useEmployeeByUserId'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { JobCandidateDocumentUpload, type DocumentUploadItem } from './components/JobCandidateDocumentUpload'
import { EducationArrayField } from './components/EducationArrayField'
import { CertificatesArrayField } from './components/CertificatesArrayField'
import { SkillsArrayField } from './components/SkillsArrayField'
import { JobHistoryArrayField } from './components/JobHistoryArrayField'
import { HobbiesArrayField } from './components/HobbiesArrayField'
import { fileClient } from '@/common/network/files/FileClient'
import { CommunicationSegment } from '@/common/components/common-relations/form-segments/communication-segment'
import { FormLocalizationProvider } from '@/common/components/form-localization-provider'
import { AddressSegment } from '@/common/components/common-relations/form-segments/address-segment'

const jobCandidateSchema = z.object({
  id: z.string().nullish(),
  version: z.number().nullish(),
  code: z.string().nullish(),
  title: z.string().nullish(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  preferredName: z.string().nullish(),
  displayName: z.string().nullish(),
  birthDate: z.string().nullish(),
  birthName: z.string().nullish(),
  birthPlace: z.string().nullish(),
  children: z.number().nullish(),
  severelyDisabilityDegree: z.number().nullish(),
  jobCandidateStatus: z.string().nullish(),
  academicTitleRef: z.string().nullish(),
  genderRef: z.string().nullish(),
  nationalityRef: z.string().nullish(),
  ethnicityRef: z.string().nullish(),
  maritalStatusRef: z.string().nullish(),
  salutationRef: z.string().nullish(),
  languageRef: z.string().nullish(),
  schoolQualificationRef: z.string().nullish(),
  disabilityStatusRef: z.string().nullish(),
  veteranStatusRef: z.string().nullish(),
  sourceRef: z.string().nullish(),
  candidateStatusRef: z.string().nullish(),
  notes: z.string().nullish(),
  // Jsonb fields with proper typing
  communicationChannels: z
    .array(
      z.object({
        communicationChannelRef: z.string().nullish(),
        value: z.string().nullish(),
        valueExtension: z.string().nullish()
      })
    )
    .optional(),
  addresses: z
    .array(
      z.object({
        addressLine: z.any().optional(),
        postalCode: z.string().nullish(),
        locality: z.string().nullish(),
        regionRef: z.string().nullish(),
        countryRef: z.string().nullish()
      })
    )
    .optional(),
  educations: z
    .array(
      z.object({
        title: z.string().nullish(),
        institute: z.string().nullish(),
        degree: z.string().nullish(),
        startDate: z.string().nullish(),
        endDate: z.string().nullish(),
        locality: z.string().nullish(),
        regionRef: z.string().nullish(),
        countryRef: z.string().nullish()
      })
    )
    .optional(),
  certificates: z
    .array(
      z.object({
        title: z.string().nullish(),
        institute: z.string().nullish(),
        validFrom: z.string().nullish(),
        validTo: z.string().nullish(),
        locality: z.string().nullish()
      })
    )
    .optional(),
  skills: z
    .array(
      z.object({
        skillId: z.string().nullish(),
        skillName: z.string().nullish(),
        level: z.string().nullish()
      })
    )
    .optional(),
  jobHistory: z
    .array(
      z.object({
        jobPosition: z.string().nullish(),
        company: z.string().nullish(),
        hireDate: z.string().nullish(),
        exitDate: z.string().nullish()
      })
    )
    .optional(),
  hobbies: z
    .array(
      z.object({
        hobby: z.string().nullish()
      })
    )
    .optional(),
  picture: z.any().optional(),
  pictureThumbnail: z.string().nullish(),
  additionalProperties: z.any().optional()
})

type JobCandidateFormProps = BusinessAppContextProps

const JobCandidateFormContent: React.FC<JobCandidateFormProps> = ({ accessToken, userInfo, additionalData }) => {
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

  // Document upload state
  const [documents, setDocuments] = useState<DocumentUploadItem[]>([])

  // Initialize FileClient with access token
  React.useEffect(() => {
    if (accessToken) {
      fileClient.setAccessToken(accessToken)
    }
  }, [accessToken])

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

  // Pre-submit handler: Upload files and prepare document payloads
  const handlePreSubmit = useCallback(
    async (formData: any) => {
      if (!accessToken) {
        return formData
      }

      // Upload all document files
      const documentsWithFileInfo = await Promise.all(
        documents
          .filter(doc => doc.file)
          .map(async doc => {
            try {
              const uploadResponse = await fileClient.uploadFile(
                doc.file!,
                { accessScope: 'tenant' },
                { appName: 'recruiting', folderPath: '/job-candidates/documents' },
                'fileContent'
              )

              return {
                ...doc,
                fileInfo: uploadResponse.fileInfo
              }
            } catch (error) {
              console.error('Error uploading document:', error)
              throw new Error(`Failed to upload document: ${doc.name || doc.file?.name}`)
            }
          })
      )

      return {
        ...formData,
        documents: documentsWithFileInfo
      }
    },
    [documents, accessToken]
  )

  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        const { jobCandidate } = buildJobCandidatePayload(data)

        // Add userId to the payload if in personal scope and creating new candidate
        if (isPersonalScope && !data.id && userId) {
          jobCandidate.userId = userId
        }

        // Prepare document payloads if documents were uploaded
        const jobCandidateDocuments =
          data.documents?.map((doc: any) => ({
            name: doc.name || doc.file?.name || 'Unnamed Document',
            description: doc.description || '',
            documentGroupRef: doc.documentGroupRef || '',
            documentTypeRef: doc.documentTypeRef || '',
            fileInfo: doc.fileInfo,
            folder: false
          })) || []

        const result: any = {
          jobCandidate,
          changeMode: data.id ? 'UPDATE' : 'INSERT'
        }

        // Add documents to payload if any were uploaded
        if (jobCandidateDocuments.length > 0) {
          result.jobCandidateDocuments = jobCandidateDocuments
        }

        return result
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
        handlePreSubmit={handlePreSubmit}
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
                  <ArrowsClockwiseIcon size={16} className="gba:mr-2" />
                  Reload from Employee
                </Button>
              </div>
            )}

            {/* Profile Picture Upload */}
            <FormField
              control={form.control}
              name="picture"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Picture</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            field.onChange(reader.result)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      data-testid={formatDataTestId('job-candidate-form', 'picture-input')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="preferredName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred First Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid={formatDataTestId('job-candidate-form', 'preferredName-input')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        onChange={e => field.onChange(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
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
                name="salutationRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salutation</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="Salutation"
                        value={field.value || ''}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-candidate-form', 'salutation-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid={formatDataTestId('job-candidate-form', 'title-input')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="languageRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="Languages"
                        value={field.value || ''}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-candidate-form', 'language-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schoolQualificationRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Qualification</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="SchoolQualification"
                        value={field.value || ''}
                        onValueChange={(v: string | string[]) =>
                          field.onChange(Array.isArray(v) ? v[0] || '' : v || '')
                        }
                        data-testid={formatDataTestId('job-candidate-form', 'schoolQualification-select')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="severelyDisabilityDegree"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severely Disability Degree</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
                      data-testid={formatDataTestId('job-candidate-form', 'severelyDisabilityDegree-input')}
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
                        <Textarea
                          {...field}
                          className="gba:min-h-[80px]"
                          data-testid={formatDataTestId('job-candidate-form', 'notes-input')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Communication Channels Section */}
            <div className="gba:mt-6">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Contact Information</h3>
              <CommunicationSegment businessAppContext={{ accessToken, userInfo, additionalData }} />
            </div>

            {/* Address Section */}
            <div className="gba:mt-6">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Addresses</h3>
              <AddressSegment />
            </div>

            {/* Education Section */}
            <div className="gba:mt-6">
              <EducationArrayField />
            </div>

            {/* Certificates Section */}
            <div className="gba:mt-6">
              <CertificatesArrayField />
            </div>

            {/* Skills Section */}
            <div className="gba:mt-6">
              <SkillsArrayField />
            </div>

            {/* Job History Section */}
            <div className="gba:mt-6">
              <JobHistoryArrayField />
            </div>

            {/* Hobbies Section */}
            <div className="gba:mt-6">
              <HobbiesArrayField />
            </div>

            {/* Document Upload Section */}
            <div className="gba:mt-6">
              <JobCandidateDocumentUpload
                documents={documents}
                onChange={setDocuments}
                accessToken={accessToken}
                prefixDataTestId={formatDataTestId('job-candidate-form', 'documents')}
              />
            </div>
          </div>
        </Form>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

const JobCandidateForm: React.FC<JobCandidateFormProps> = props => (
  <FormLocalizationProvider>
    <JobCandidateFormContent {...props} />
  </FormLocalizationProvider>
)

export default JobCandidateForm
