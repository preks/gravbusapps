import { useJobFunctionQueries } from '@/business-apps/mdm/apps/job-structure-data/queries/useJobFunctionQueries.ts'
import { JobFamily } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFamily.types.ts'
import {
  JobFunction,
  JobFunctionMutationPayload
} from '@/business-apps/mdm/apps/job-structure-data/utils/JobFunction.types.ts'
import {
  JobFunctionFormValues,
  jobFunctionSchema,
  validateJobFunctionCode
} from '@/business-apps/mdm/apps/job-structure-data/validation/JobFunction.validation'
import { ComboboxField, TextAreaField, TextField } from '@/business-apps/mdm/components/form-fields/FormFields'
import { CodeSuggestionWatcher } from '@/business-apps/mdm/hooks/useCodeSuggestion'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { toast } from '@newwork/nw-design-system'
import { Dispatch, ReactNode, SetStateAction, useCallback, useMemo, useState } from 'react'
import { FieldValues } from 'react-hook-form'

interface JobFunctionFormProps extends BusinessAppContextProps {
  childAddButton?: ReactNode
  jobFunction?: Partial<JobFunction>
  onCancel?: () => void
  prefixDataTestId: string
  refetch: () => void
  isDrawerActive?: boolean
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  usedCodes?: string[]
  jobFamilies: JobFamily[]
}

export default function JobFunctionForm({
  childAddButton,
  jobFunction,
  onCancel,
  prefixDataTestId,
  accessToken,
  refetch,
  isDrawerActive = false,
  open,
  setOpen,
  usedCodes = [],
  jobFamilies
}: Readonly<JobFunctionFormProps>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobFamilySearch, setJobFamilySearch] = useState('')
  const [suggestedCode, setSuggestedCode] = useState('')

  const { createJobFunction } = useJobFunctionQueries(accessToken)

  const filteredJobFamilies = useMemo(() => {
    if (!jobFamilySearch) return jobFamilies
    const term = jobFamilySearch.toLowerCase()
    return jobFamilies.filter(f => f.name?.toLowerCase().includes(term) || f.code?.toLowerCase().includes(term))
  }, [jobFamilies, jobFamilySearch])

  const handleJobFamilySearch = useCallback((query: string) => {
    setJobFamilySearch(query)
  }, [])

  const handleSubmit = async (values: FieldValues) => {
    const validationResult = jobFunctionSchema.safeParse(values)
    if (!validationResult.success) {
      throw new Error(
        'Invalid form data: ' + validationResult.error.issues.map((e: { message: any }) => e.message).join(', ')
      )
    }

    const validatedValues = validationResult.data

    const codeError = validateJobFunctionCode(validatedValues.code, usedCodes)
    if (codeError) {
      throw new Error(codeError)
    }

    const payload: JobFunctionMutationPayload = {
      changeMode: 'INSERT',
      jobFunction: {
        code: validatedValues.code,
        name: validatedValues.name,
        description: validatedValues.description || '',
        jobFamily: {
          id: validatedValues.jobFamily?.id || '',
          code: validatedValues.jobFamily?.code || '',
          name: validatedValues.jobFamily?.name || ''
        },
        ...(jobFunction ? { id: jobFunction.id, version: jobFunction.version } : {})
      }
    }

    setLoading(true)
    setError(null)

    try {
      await createJobFunction(payload)
      toast.success(jobFunction ? 'Job function updated successfully!' : 'Job function created successfully!')
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
    (): JobFunctionFormValues => ({
      name: jobFunction?.name || '',
      code: jobFunction?.code || suggestedCode,
      description: jobFunction?.description || '',
      jobFamily: jobFunction?.jobFamily || null
    }),
    [jobFunction, suggestedCode]
  )

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={jobFunction ? 'Edit Job Function' : 'Create Job Function'}
      description={
        jobFunction
          ? 'Update the job function information'
          : 'Create a new job function to define specific roles and responsibilities'
      }
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
      isEditing={!!jobFunction}
      loading={loading}
      dataTestId={`${prefixDataTestId}-form-modal`}
      isDrawerActive={isDrawerActive}
      open={open}
      setOpen={setOpen}
      errorMessage={error ?? ''}
    >
      <TextField<JobFunctionFormValues>
        name="name"
        label="Name"
        required
        placeholder="e.g., Software Development, Product Management"
        maxLength={100}
        dataTestId={`${prefixDataTestId}-name-input`}
      />

      <ComboboxField<JobFunctionFormValues>
        name="jobFamily"
        label="Job Family"
        required
        options={filteredJobFamilies.map(f => ({ value: f.id, label: `${f.name} (${f.code})` }))}
        placeholder="Select a Job Family"
        searchPlaceholder="Search job families..."
        emptyText="No job families found"
        dataTestId={`${prefixDataTestId}-job-family-combobox`}
        onSearch={handleJobFamilySearch}
        onValueChange={(selectedId, field) => {
          const selectedFamily = jobFamilies.find(f => f.id === selectedId)
          field.onChange(selectedFamily || null)
        }}
      />

      <TextAreaField<JobFunctionFormValues>
        name="description"
        label="Description"
        placeholder="Describe this job function and the types of roles it encompasses"
        rows={3}
        maxLength={500}
        dataTestId={`${prefixDataTestId}-description-textarea`}
      />

      {!jobFunction && (
        <>
          <CodeSuggestionWatcher<JobFunctionFormValues>
            enabled={!jobFunction}
            generateCode={values => {
              return values.jobFamily?.code ? `${values.jobFamily?.code}_` : ''
            }}
            watchFields={['jobFamily']}
            codeFieldName="code"
            onCodeSuggested={setSuggestedCode}
          />

          <TextField<JobFunctionFormValues>
            name="code"
            label="Code"
            required
            placeholder="e.g., SW_DEV, PROD_MGMT"
            maxLength={20}
            pattern={/^[A-Z0-9_]+$/}
            patternMessage="Code must contain only uppercase letters, numbers, and underscores"
            transform={value => value.toUpperCase()}
            validate={(value: string) => {
              const error = validateJobFunctionCode(value, usedCodes)
              return error || true
            }}
            dataTestId={`${prefixDataTestId}-code-input`}
          />
        </>
      )}
    </FormWrapperModal>
  )
}
