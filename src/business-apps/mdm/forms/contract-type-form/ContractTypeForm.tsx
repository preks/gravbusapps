import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  CONTRACT_TYPE_CATALOG,
  CONTRACT_TYPE_VERSION
} from '@/business-apps/hr/core/forms/job-position/hooks/useContractTypes'
import { useCodeError } from '@/business-apps/mdm/hooks/useCodeError'
import { ContractTypeTable } from '../../apps/employment-data/components/tabs/ContractTypesTab'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

export interface ProbationPeriod {
  value: number | null
  unit: 'day' | 'week' | 'month' | ''
}

const PROBATION_UNIT_OPTIONS = [
  { value: 'day', label: 'Day(s)' },
  { value: 'week', label: 'Week(s)' },
  { value: 'month', label: 'Month(s)' }
] as const

// Component for Probation Period fields with shared error message
const ProbationPeriodFields: React.FC<{ dataTestId: string }> = ({ dataTestId }) => {
  const form = useFormContext()
  const probationUnitError = form.formState.errors.probationUnit?.message as string | undefined

  return (
    <div className="gba:space-y-2">
      <FormLabel>Probation Period</FormLabel>
      <div className="gba:flex gba:gap-3">
        <FormField
          name="probationValue"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter value"
                  {...field}
                  data-testid={`${dataTestId}-probation-value-input`}
                  onChange={e => {
                    const value = e.target.value
                    // Only allow digits, no leading zeros (except empty), max 4 digits
                    if (value === '' || /^[1-9][0-9]{0,3}$/.test(value)) {
                      field.onChange(value)
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name="probationUnit"
          render={({ field, fieldState }) => (
            <FormItem className="gba:flex-1">
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <SelectTrigger
                    data-testid={`${dataTestId}-probation-unit-select`}
                    className={fieldState.error ? 'gba:border-destructive' : ''}
                  >
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROBATION_UNIT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      {probationUnitError && (
        <p className="gba:text-sm gba:text-destructive" role="alert">
          {probationUnitError}
        </p>
      )}
    </div>
  )
}

// Helper to validate no leading whitespace (trailing will be trimmed on submit)
const noLeadingWhitespace = (value: string) => value === value.trimStart()
const noLeadingWhitespaceMessage = 'Cannot start with whitespace'

// Zod validation schema
const contractTypeFormSchema = z
  .object({
    value: z
      .string({ message: 'Please enter contract type name' })
      .min(1, 'Please enter contract type name')
      .max(64, 'Contract type name must be less than 64 characters')
      .refine(noLeadingWhitespace, noLeadingWhitespaceMessage),
    code: z.string().optional(),
    description: z
      .string()
      .max(100, 'Description must be less than 100 characters')
      .refine(val => !val || noLeadingWhitespace(val), noLeadingWhitespaceMessage)
      .optional(),
    probationValue: z
      .string()
      .refine(val => !val || /^[1-9][0-9]{0,3}$/.test(val), 'Must be a positive number with maximum 4 digits')
      .optional(),
    probationUnit: z.enum(['day', 'week', 'month', '']).optional()
  })
  .superRefine((data, ctx) => {
    // If probationValue is provided, probationUnit must be provided and not empty
    const hasValue = data.probationValue && data.probationValue.trim() !== ''
    if (hasValue) {
      // probationUnit must be one of the valid units (not undefined, not empty string)
      const validUnits: ('day' | 'week' | 'month')[] = ['day', 'week', 'month']
      const hasValidUnit =
        data.probationUnit !== undefined &&
        data.probationUnit !== '' &&
        validUnits.includes(data.probationUnit as 'day' | 'week' | 'month')

      if (!hasValidUnit) {
        ctx.addIssue({
          code: 'custom',
          message: 'Time unit is required when a value is entered. Either remove the value or select a time unit.',
          path: ['probationUnit']
        })
      }
    }
  })

// Schema for creating new contract type (code is required)
const createContractTypeFormSchema = contractTypeFormSchema.safeExtend({
  code: z
    .string({ message: 'Please enter contract type code' })
    .min(1, 'Please enter contract type code')
    .max(10, 'Contract type code must be less than 10 characters')
    .refine(noLeadingWhitespace, noLeadingWhitespaceMessage)
})

export interface ContractTypeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  contractType?: ContractTypeTable
  onCancel?: () => void
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  isDrawerActive?: boolean
  usedCodes?: string[]
}

const ContractTypeForm: React.FC<ContractTypeFormProps> = ({
  prefixDataTestId,
  contractType,
  onCancel,
  childAddButton,
  refetch,
  accessToken,
  isDrawerActive,
  usedCodes = []
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, 'ContractTypeForm')
  const catalogClient = useCatalogManagerClient(accessToken)
  const { codeError, setCodeError, validateCode } = useCodeError(usedCodes)

  const handleSubmit = async (data: any) => {
    // Trim all string values before processing
    const trimmedData = {
      ...data,
      value: data.value?.trim() || '',
      code: data.code?.trim() || '',
      description: data.description?.trim() || ''
    }

    if (!validateCode(trimmedData.code) && !contractType) {
      return
    }

    // Build probation period JSON for additionalValue2
    // Only save if both value and unit are provided, or if neither is provided
    const hasProbationValue = trimmedData.probationValue && trimmedData.probationValue.trim() !== ''
    const hasProbationUnit = trimmedData.probationUnit && trimmedData.probationUnit.trim() !== ''

    const probationPeriod: ProbationPeriod = {
      value: hasProbationValue ? Number(trimmedData.probationValue) : null,
      unit: hasProbationUnit ? trimmedData.probationUnit : ''
    }
    // Only save if both are provided
    const additionalValue2 = hasProbationValue && hasProbationUnit ? JSON.stringify(probationPeriod) : ''

    const payload = {
      ...(contractType ? { id: contractType.id } : {}),
      code: trimmedData.code,
      value: trimmedData.value,
      additionalValue1: trimmedData.description,
      additionalValue2,
      translations: []
    }
    if (contractType) {
      await catalogClient.updateCatalogEntry(
        CONTRACT_TYPE_CATALOG,
        CONTRACT_TYPE_VERSION,
        contractType.id ?? '',
        payload
      )
    } else {
      await catalogClient.createCatalogEntry(CONTRACT_TYPE_CATALOG, CONTRACT_TYPE_VERSION, payload)
    }

    refetch()
  }

  const parseProbationPeriod = (additionalValue2?: string): ProbationPeriod => {
    if (!additionalValue2) return { value: null, unit: '' }
    try {
      const parsed = JSON.parse(additionalValue2)
      return {
        value: parsed.value ?? null,
        unit: parsed.unit ?? ''
      }
    } catch {
      return { value: null, unit: '' }
    }
  }

  const existingProbation = useMemo(
    () => parseProbationPeriod(contractType?.probationPeriod),
    [contractType?.probationPeriod]
  )

  const defaultValues = useMemo(
    () => ({
      value: contractType?.value || '',
      code: contractType?.code || '',
      description: contractType?.description || '',
      probationValue: existingProbation.value?.toString() || '',
      probationUnit: existingProbation.unit || undefined
    }),
    [contractType, existingProbation]
  )

  // Use different schema for create vs edit (code required only on create)
  const resolver = useMemo(
    () => zodResolver(contractType ? contractTypeFormSchema : createContractTypeFormSchema) as any,
    [contractType]
  )

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={contractType ? 'Edit Contract Type' : 'Create Contract Type'}
      description="Configure contract type details and additional information"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
      isEditing={!!contractType}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      isValid={!codeError}
      setCodeError={setCodeError}
      resolver={resolver}
      schema={contractType ? contractTypeFormSchema : createContractTypeFormSchema}
      validateBeforeSubmit={false}
    >
      <FormField
        name="value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter name" {...field} data-testid={`${dataTestId}-name-input`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!contractType && (
        <FormField
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter code"
                  {...field}
                  onChange={e => {
                    field.onChange(e)
                    validateCode(e.target.value)
                  }}
                  data-testid={`${dataTestId}-code-input`}
                />
              </FormControl>
              <FormMessage>{codeError}</FormMessage>
            </FormItem>
          )}
        />
      )}

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter description (optional)"
                {...field}
                data-testid={`${dataTestId}-description-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <ProbationPeriodFields dataTestId={dataTestId} />
    </FormWrapperModal>
  )
}

export default ContractTypeForm
