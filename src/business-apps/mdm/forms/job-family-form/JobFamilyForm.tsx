import { SetStateAction, Dispatch, useMemo, ReactNode, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { FieldValues } from 'react-hook-form'
import { JobFamily } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFamily.types'
import {
  jobFamilySchema,
  JobFamilyFormValues,
  validateJobFamilyCode
} from '@/business-apps/mdm/apps/job-structure-data/validation/JobFamily.validation'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { TextField, TextAreaField } from '@/business-apps/mdm/components/form-fields/FormFields'
import { toast } from '@newwork/nw-design-system'
import { useJobFamilyQueries } from '../../apps/job-structure-data/queries/useJobFamilyQueries.ts'

interface JobFamilyFormProps extends BusinessAppContextProps {
  childAddButton?: ReactNode
  jobFamily?: Partial<JobFamily>
  onCancel?: () => void
  prefixDataTestId: string
  refetch: () => void
  isDrawerActive?: boolean
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  usedCodes?: string[]
}

export default function JobFamilyForm({
  childAddButton,
  jobFamily,
  onCancel,
  prefixDataTestId,
  accessToken,
  refetch,
  isDrawerActive = false,
  open,
  setOpen,
  usedCodes = []
}: Readonly<JobFamilyFormProps>) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { createJobFamily, updateJobFamily } = useJobFamilyQueries(accessToken)

  const dialogOpen = open ?? internalOpen
  const setDialogOpen = setOpen || setInternalOpen

  const handleSubmit = async (values: FieldValues) => {
    // Validate form data with Zod schema
    const validationResult = jobFamilySchema.safeParse(values)
    if (!validationResult.success) {
      throw new Error('Invalid form data: ' + validationResult.error.issues.map(e => e.message).join(', '))
    }

    const validatedValues = validationResult.data

    // Additional code validation for new job families
    if (!jobFamily) {
      const codeError = validateJobFamilyCode(validatedValues.code, usedCodes)
      if (codeError) {
        throw new Error(codeError)
      }
    }

    // Create the job family mutation object
    const payload = {
      jobFamily: {
        code: validatedValues.code,
        name: validatedValues.name,
        description: validatedValues.description || '',
        ...(jobFamily ? { id: jobFamily.id, version: jobFamily.version } : {})
      }
    }

    setLoading(true)
    setError(null)

    try {
      await (jobFamily ? updateJobFamily : createJobFamily)(payload)
      toast.success(jobFamily ? 'Job family updated successfully!' : 'Job family created successfully!')
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
    (): JobFamilyFormValues => ({
      name: jobFamily?.name || '',
      code: jobFamily?.code || '',
      description: jobFamily?.description || ''
    }),
    [jobFamily]
  )

  return (
    <ErrorBoundary>
      <FormWrapperModal
        childAddButton={childAddButton}
        title={jobFamily ? 'Edit Job Family' : 'Create Job Family'}
        description={jobFamily ? 'Update the job family information' : 'Create a new job family'}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        defaultValues={defaultValues}
        isEditing={!!jobFamily}
        loading={loading}
        dataTestId={`${prefixDataTestId}-form-modal`}
        isDrawerActive={isDrawerActive}
        open={dialogOpen}
        setOpen={setDialogOpen}
        errorMessage={error ?? ''}
      >
        <TextField<JobFamilyFormValues>
          name="name"
          label="Name"
          required
          placeholder="e.g., Engineering, Sales, Marketing"
          maxLength={100}
          dataTestId={`${prefixDataTestId}-name-input`}
        />

        {!jobFamily && (
          <TextField<JobFamilyFormValues>
            name="code"
            label="Code"
            required
            placeholder="e.g., ENG, SALES, MKT"
            maxLength={20}
            pattern={/^[A-Z0-9_]+$/}
            patternMessage="Code must contain only uppercase letters, numbers, and underscores"
            transform={value => value.toUpperCase()}
            validate={(value: string) => {
              const error = validateJobFamilyCode(value, usedCodes)
              return error || true
            }}
            dataTestId={`${prefixDataTestId}-code-input`}
          />
        )}

        <TextAreaField<JobFamilyFormValues>
          name="description"
          label="Description"
          placeholder="Describe this job family and the types of roles it contains"
          rows={3}
          maxLength={500}
          dataTestId={`${prefixDataTestId}-description-textarea`}
        />
      </FormWrapperModal>
    </ErrorBoundary>
  )
}
