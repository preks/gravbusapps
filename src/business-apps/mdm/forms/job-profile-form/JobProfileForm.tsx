import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { useJobProfileQueries } from '@/business-apps/mdm/apps/job-structure-data/queries/useJobProfileQueries.ts'
import { PartialJobFunction } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFunction.types'
import { JobLevel } from '@/business-apps/mdm/apps/job-structure-data/utils/JobLevel.types'
import {
  JobProfile,
  JobProfileMutationPayload
} from '@/business-apps/mdm/apps/job-structure-data/utils/JobProfile.types'
import {
  JobProfileFormValues,
  jobProfileSchema,
  validateJobProfileCode
} from '@/business-apps/mdm/apps/job-structure-data/validation/JobProfile.validation'
import { ComboboxField, TextAreaField, TextField } from '@/business-apps/mdm/components/form-fields/FormFields'
import { CodeSuggestionWatcher } from '@/business-apps/mdm/hooks/useCodeSuggestion'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { toast } from '@newwork/nw-design-system'
import { Dispatch, ReactNode, SetStateAction, useMemo, useState } from 'react'
import { FieldValues } from 'react-hook-form'
import SkillsSection from './components/SkillsSection'
import { transformJobProfileToFormValues } from './utils/formTransforms'
import { useJobDescriptionFile } from './hooks/useJobDescriptionFile'

interface JobProfileFormProps extends BusinessAppContextProps {
  childAddButton?: ReactNode
  jobProfile?: Partial<JobProfile>
  onCancel?: () => void
  prefixDataTestId: string
  refetch: () => void
  isDrawerActive?: boolean
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  usedCodes?: string[]
  jobFunctions: PartialJobFunction[]
  jobLevels: JobLevel[]
}

export default function JobProfileForm({
  childAddButton,
  jobProfile,
  onCancel,
  prefixDataTestId,
  accessToken,
  refetch,
  isDrawerActive = false,
  open,
  setOpen,
  usedCodes = [],
  jobFunctions,
  jobLevels
}: Readonly<JobProfileFormProps>) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobFunctionSearch, setJobFunctionSearch] = useState('')
  const [jobLevelSearch, setJobLevelSearch] = useState('')
  const [suggestedCode, setSuggestedCode] = useState('')

  const { createJobProfile, updateJobProfile } = useJobProfileQueries(accessToken)

  const dialogOpen = open ?? internalOpen
  const setDialogOpen = setOpen || setInternalOpen

  const { isLoadingJobDescriptionFile, initialJobDescriptionFile, resolveFileForSave, cleanupFiles } =
    useJobDescriptionFile({
      accessToken,
      jobProfileId: jobProfile?.id,
      isModalOpen: dialogOpen
    })

  const filteredJobFunctions = useMemo(() => {
    if (!jobFunctionSearch) return jobFunctions
    const term = jobFunctionSearch.toLowerCase()
    return jobFunctions.filter(f => f.name?.toLowerCase().includes(term) || f.code?.toLowerCase().includes(term))
  }, [jobFunctions, jobFunctionSearch])

  const filteredJobLevels = useMemo(() => {
    if (!jobLevelSearch) return jobLevels
    const term = jobLevelSearch.toLowerCase()
    return jobLevels.filter(l => l.name?.toLowerCase().includes(term) || l.code?.toLowerCase().includes(term))
  }, [jobLevels, jobLevelSearch])

  const handleSubmit = async (values: FieldValues) => {
    const validationResult = jobProfileSchema.safeParse(values)
    if (!validationResult.success) {
      throw new Error('Invalid form data: ' + validationResult.error.issues.map(e => e.message).join(', '))
    }

    const validatedValues = validationResult.data

    if (!jobProfile) {
      const codeError = validateJobProfileCode(validatedValues.code, usedCodes)
      if (codeError) {
        throw new Error(codeError)
      }
    }

    const { jobDescriptionFileId, fileIdsToDelete } = await resolveFileForSave(
      values.jobDescriptionFile,
      jobProfile?.id
    )

    const filePayloadFragment = jobDescriptionFileId === undefined ? {} : { jobDescriptionFileId }

    const skills = (validatedValues.skills || [])
      .filter(skill => skill.skillId?.length > 0)
      .map(skill => ({
        skillId: skill.skillId,
        skillName: skill.skillName || null,
        requiredLevel: skill.level ?? null
      }))

    const payload: JobProfileMutationPayload = {
      changeMode: 'INSERT',
      jobProfile: {
        code: validatedValues.code,
        name: validatedValues.name,
        description: validatedValues.description || '',
        jobFunction: validatedValues.jobFunction?.id || null,
        jobLevel: validatedValues.jobLevel?.id || null,
        ...(skills.length > 0 ? { skills } : {}),
        ...filePayloadFragment,
        ...(jobProfile ? { id: jobProfile.id, version: jobProfile.version } : {})
      }
    }

    setLoading(true)
    setError(null)

    try {
      await (jobProfile ? updateJobProfile : createJobProfile)(payload)

      if (jobProfile?.id && fileIdsToDelete.length > 0) {
        await cleanupFiles(jobProfile.id, fileIdsToDelete)
      }

      toast.success(jobProfile ? 'Job profile updated successfully!' : 'Job profile created successfully!')
      refetch()
      setOpen?.(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const defaultValues = useMemo(
    (): JobProfileFormValues => transformJobProfileToFormValues(jobProfile as JobProfile | null, suggestedCode),
    [jobProfile, suggestedCode]
  )

  return (
    <ErrorBoundary>
      <FormWrapperModal
        childAddButton={childAddButton}
        title={jobProfile ? 'Edit Job Profile' : 'Create Job Profile'}
        description={jobProfile ? 'Update the job profile information' : 'Create a new job profile'}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        defaultValues={defaultValues}
        isEditing={!!jobProfile}
        loading={loading}
        dataTestId={`${prefixDataTestId}-form-modal`}
        isDrawerActive={isDrawerActive}
        open={dialogOpen}
        setOpen={setDialogOpen}
        errorMessage={error ?? ''}
      >
        <TextField<JobProfileFormValues>
          name="name"
          label="Name"
          required
          placeholder="e.g., Senior Software Engineer, Product Manager"
          maxLength={100}
          dataTestId={`${prefixDataTestId}-name-input`}
        />

        <ComboboxField<JobProfileFormValues>
          name="jobFunction"
          label="Job Function"
          required
          options={filteredJobFunctions.map(f => ({ value: f.id, label: `${f.name} (${f.code})` }))}
          placeholder="Select a Job Function"
          searchPlaceholder="Search job functions..."
          emptyText="No job functions found"
          dataTestId={`${prefixDataTestId}-job-function-combobox`}
          onSearch={setJobFunctionSearch}
          onValueChange={(selectedId, field) => {
            const selectedRecord = jobFunctions.find(f => f.id === selectedId)
            field.onChange(selectedRecord || null)
          }}
        />

        <ComboboxField<JobProfileFormValues>
          name="jobLevel"
          label="Job Level"
          required
          options={filteredJobLevels.map(l => ({
            value: l.id,
            label: `${l.name} (${l.code}) - Level ${l.hierarchyOrder}`
          }))}
          placeholder="Select a Job Level"
          searchPlaceholder="Search job levels..."
          emptyText="No job levels found"
          dataTestId={`${prefixDataTestId}-job-level-combobox`}
          onSearch={setJobLevelSearch}
          onValueChange={(selectedId, field) => {
            const selectedRecord = jobLevels.find(l => l.id === selectedId)
            field.onChange(selectedRecord || null)
          }}
        />

        <TextAreaField<JobProfileFormValues>
          name="description"
          label="Description"
          placeholder="Describe the responsibilities and requirements for this profile"
          rows={3}
          maxLength={500}
          dataTestId={`${prefixDataTestId}-description-textarea`}
        />

        {!jobProfile && (
          <>
            <CodeSuggestionWatcher<JobProfileFormValues>
              enabled={!jobProfile}
              generateCode={({ jobFunction, jobLevel }) =>
                jobFunction?.code && jobLevel?.code ? `${jobFunction.code}_${jobLevel.code}` : ''
              }
              watchFields={['jobFunction', 'jobLevel']}
              codeFieldName="code"
              onCodeSuggested={setSuggestedCode}
            />

            <TextField<JobProfileFormValues>
              name="code"
              label="Code"
              required
              placeholder="e.g., SSE, PM"
              maxLength={20}
              pattern={/^[A-Z0-9_]+$/}
              patternMessage="Code must contain only uppercase letters, numbers, and underscores"
              transform={value => value.toUpperCase()}
              validate={(value: string) => {
                const error = validateJobProfileCode(value, usedCodes)
                return error || true
              }}
              dataTestId={`${prefixDataTestId}-code-input`}
            />
          </>
        )}

        <SkillsSection
          dataTestId={prefixDataTestId}
          accessToken={accessToken || ''}
          isLoadingJobDescriptionFile={isLoadingJobDescriptionFile}
          initialJobDescriptionFile={initialJobDescriptionFile}
        />
      </FormWrapperModal>
    </ErrorBoundary>
  )
}
