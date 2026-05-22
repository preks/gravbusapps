import { useCurrencyCatalogOptions } from '@/business-apps/hr/compensation-planning/apps/compensation-planning/hooks/useCurrencyCatalogOptions.ts'
import { SetStateAction, Dispatch, useMemo, ReactNode, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext.ts'
import { FormWrapperModal } from '@/components/form-wrapper'
import { FieldValues } from 'react-hook-form'
import { useCompensationBandQueries } from '@/business-apps/mdm/apps/compensation-data/queries/CompensationBandQueries.ts'
import {
  CompensationBand,
  CompensationBandMutationPayload
} from '@/business-apps/mdm/apps/compensation-data/utils/CompensationBand.types.ts'
import {
  compensationBandSchema,
  CompensationBandFormValues,
  validateCompensationBandName
} from '@/business-apps/mdm/apps/compensation-data/validation/CompensationBand.validation.ts'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary.tsx'
import {
  TextField,
  TextAreaField,
  SelectField,
  NumberField
} from '@/business-apps/mdm/components/form-fields/FormFields.tsx'
import { toast } from '@newwork/nw-design-system'

interface CompensationBandFormProps extends BusinessAppContextProps {
  childAddButton?: ReactNode
  compensationBand?: Partial<CompensationBand>
  onCancel?: () => void
  prefixDataTestId: string
  refetch: () => void
  isDrawerActive?: boolean
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  usedNames?: string[]
}

export default function CompensationBandForm({
  childAddButton,
  compensationBand,
  onCancel,
  prefixDataTestId,
  accessToken,
  refetch,
  isDrawerActive = false,
  open,
  setOpen,
  usedNames = []
}: Readonly<CompensationBandFormProps>) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { options: currencyOptions, loading: loadingCurrencies } = useCurrencyCatalogOptions(accessToken)
  const { createCompensationBand, updateCompensationBand } = useCompensationBandQueries(accessToken)

  // Parse currency options from Catalog
  const currencies = currencyOptions.map(option => ({
    value: option.id,
    label: option.label
  }))

  // Use external state if provided, otherwise use internal
  const dialogOpen = open ?? internalOpen
  const setDialogOpen = setOpen || setInternalOpen

  const handleSubmit = async (values: FieldValues) => {
    // Validate form data with Zod schema
    const validationResult = compensationBandSchema.safeParse(values)
    if (!validationResult.success) {
      throw new Error('Invalid form data: ' + validationResult.error.issues.map(e => e.message).join(', '))
    }

    const validatedValues = validationResult.data

    // Additional name validation for new compensation bands
    if (!compensationBand) {
      const nameError = validateCompensationBandName(validatedValues.name, usedNames)
      if (nameError) {
        throw new Error(nameError)
      }
    }

    const payload: CompensationBandMutationPayload = {
      changeMode: 'INSERT',
      compensationBand: {
        name: validatedValues.name,
        description: validatedValues.description || '',
        currencyRef: validatedValues.currencyRef,
        minSalary: validatedValues.minSalary,
        maxSalary: validatedValues.maxSalary,
        ...(compensationBand ? { id: compensationBand.id, version: compensationBand.version } : {})
      }
    }

    setLoading(true)
    setError(null)

    try {
      await (compensationBand ? updateCompensationBand : createCompensationBand)(payload)
      toast.success(
        compensationBand ? 'Compensation band updated successfully!' : 'Compensation band created successfully!'
      )
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
    (): CompensationBandFormValues => ({
      name: compensationBand?.name || '',
      description: compensationBand?.description || '',
      minSalary: compensationBand?.minSalary ?? 0,
      maxSalary: compensationBand?.maxSalary ?? 0,
      currencyRef: compensationBand?.currencyRef || 'Currency:v1:EUR'
    }),
    [compensationBand]
  )

  return (
    <ErrorBoundary>
      <FormWrapperModal
        childAddButton={childAddButton}
        title={compensationBand ? 'Edit Compensation Band' : 'Create Compensation Band'}
        description={compensationBand ? 'Update the compensation band information' : 'Create a new compensation band'}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        defaultValues={defaultValues}
        isEditing={!!compensationBand}
        loading={loading || loadingCurrencies}
        dataTestId={`${prefixDataTestId}-form-modal`}
        isDrawerActive={isDrawerActive}
        open={dialogOpen}
        setOpen={setDialogOpen}
        errorMessage={error ?? ''}
      >
        <TextField<CompensationBandFormValues>
          name="name"
          label="Name"
          required
          placeholder="e.g., Band A, Senior Level, Executive"
          maxLength={100}
          dataTestId={`${prefixDataTestId}-name-input`}
          validate={(value: string) => {
            if (!compensationBand) {
              const error = validateCompensationBandName(value, usedNames)
              return error || true
            }
            return true
          }}
        />

        <TextAreaField<CompensationBandFormValues>
          name="description"
          label="Description"
          placeholder="Describe the compensation band and its purpose"
          rows={3}
          maxLength={500}
          dataTestId={`${prefixDataTestId}-description-textarea`}
        />

        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <NumberField<CompensationBandFormValues>
            name="minSalary"
            label="Minimum Salary"
            required
            placeholder="0"
            min={0}
            step={50}
            dataTestId={`${prefixDataTestId}-min-salary-input`}
          />

          <NumberField<CompensationBandFormValues>
            name="maxSalary"
            label="Maximum Salary"
            required
            placeholder="0"
            min={0}
            step={50}
            dataTestId={`${prefixDataTestId}-max-salary-input`}
          />
        </div>

        <SelectField<CompensationBandFormValues>
          name="currencyRef"
          label="Currency"
          required
          options={currencies}
          placeholder="Select currency"
          dataTestId={`${prefixDataTestId}-currency-select`}
        />
      </FormWrapperModal>
    </ErrorBoundary>
  )
}
