import { SetStateAction, Dispatch, useMemo, ReactNode, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { FieldValues } from 'react-hook-form'
import { useJobLevelQueries } from '@/business-apps/mdm/apps/job-structure-data/queries/useJobLevelQueries.ts'
import { JobLevel, JobLevelMutationPayload } from '@/business-apps/mdm/apps/job-structure-data/utils/JobLevel.types'
import {
  jobLevelSchema,
  JobLevelFormValues,
  validateJobLevelCode
} from '@/business-apps/mdm/apps/job-structure-data/validation/JobLevel.validation'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { TextField, TextAreaField, NumberField } from '@/business-apps/mdm/components/form-fields/FormFields'
import { toast } from '@newwork/nw-design-system'

interface JobLevelFormProps extends BusinessAppContextProps {
  childAddButton?: ReactNode
  jobLevel?: Partial<JobLevel>
  onCancel?: () => void
  prefixDataTestId: string
  refetch: () => void
  isDrawerActive?: boolean
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  usedCodes?: string[]
}

export default function JobLevelForm({
  childAddButton,
  jobLevel,
  onCancel,
  prefixDataTestId,
  accessToken,
  refetch,
  isDrawerActive = false,
  open,
  setOpen,
  usedCodes = []
}: Readonly<JobLevelFormProps>) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { createJobLevel, updateJobLevel } = useJobLevelQueries(accessToken)

  const dialogOpen = open ?? internalOpen
  const setDialogOpen = setOpen || setInternalOpen

  const handleSubmit = async (values: FieldValues) => {
    const validationResult = jobLevelSchema.safeParse(values)
    if (!validationResult.success) {
      throw new Error('Invalid form data: ' + validationResult.error.issues.map(e => e.message).join(', '))
    }

    const validatedValues = validationResult.data

    if (!jobLevel) {
      const codeError = validateJobLevelCode(validatedValues.code, usedCodes)
      if (codeError) {
        throw new Error(codeError)
      }
    }

    const payload: JobLevelMutationPayload = {
      changeMode: 'INSERT',
      jobLevel: {
        code: validatedValues.code,
        name: validatedValues.name,
        description: validatedValues.description || '',
        hierarchyOrder: validatedValues.hierarchyOrder,
        ...(jobLevel ? { id: jobLevel.id, version: jobLevel.version } : {})
      }
    }

    setLoading(true)
    setError(null)

    try {
      await (jobLevel ? updateJobLevel : createJobLevel)(payload)
      toast.success(jobLevel ? 'Job level updated successfully!' : 'Job level created successfully!')
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
    (): JobLevelFormValues => ({
      name: jobLevel?.name || '',
      code: jobLevel?.code || '',
      description: jobLevel?.description || '',
      hierarchyOrder: jobLevel?.hierarchyOrder || 1
    }),
    [jobLevel]
  )

  return (
    <ErrorBoundary>
      <FormWrapperModal
        childAddButton={childAddButton}
        title={jobLevel ? 'Edit Job Level' : 'Create Job Level'}
        description={
          jobLevel ? 'Update the job level information' : 'Create a new job level to define career progression stages'
        }
        onSubmit={handleSubmit}
        onCancel={onCancel}
        defaultValues={defaultValues}
        isEditing={!!jobLevel}
        loading={loading}
        dataTestId={`${prefixDataTestId}-form-modal`}
        isDrawerActive={isDrawerActive}
        open={dialogOpen}
        setOpen={setDialogOpen}
        errorMessage={error ?? ''}
      >
        <TextField<JobLevelFormValues>
          name="name"
          label="Name"
          required
          placeholder="e.g., Junior, Senior, Principal"
          maxLength={100}
          dataTestId={`${prefixDataTestId}-name-input`}
        />

        {!jobLevel && (
          <TextField<JobLevelFormValues>
            name="code"
            label="Code"
            required
            placeholder="e.g., JNR, SNR, PRIN"
            maxLength={20}
            pattern={/^[A-Z0-9_]+$/}
            patternMessage="Code must contain only uppercase letters, numbers, and underscores"
            transform={value => value.toUpperCase()}
            validate={(value: string) => {
              const error = validateJobLevelCode(value, usedCodes)
              return error || true
            }}
            dataTestId={`${prefixDataTestId}-code-input`}
          />
        )}

        <NumberField<JobLevelFormValues>
          name="hierarchyOrder"
          label="Hierarchy Order"
          required
          placeholder="e.g., 1, 2, 3"
          min={1}
          max={99}
          step={1}
          dataTestId={`${prefixDataTestId}-hierarchy-order-input`}
        />

        <TextAreaField<JobLevelFormValues>
          name="description"
          label="Description"
          placeholder="Describe the responsibilities and expectations for this level"
          rows={3}
          maxLength={500}
          dataTestId={`${prefixDataTestId}-description-textarea`}
        />
      </FormWrapperModal>
    </ErrorBoundary>
  )
}
