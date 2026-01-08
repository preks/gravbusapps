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
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  CONTRACT_TYPE_CATALOG,
  CONTRACT_TYPE_VERSION
} from '@/business-apps/hr/core/forms/job-position/hooks/useContractTypes'
import { useCodeError } from '@/business-apps/mdm/hooks/useCodeError'
import { ContractTypeTable } from '../../apps/employment-data/components/tabs/ContractTypesTab'

export interface ProbationPeriod {
  value: number | null
  unit: 'day' | 'week' | 'month' | ''
}

const PROBATION_UNIT_OPTIONS = [
  { value: 'day', label: 'Day(s)' },
  { value: 'week', label: 'Week(s)' },
  { value: 'month', label: 'Month(s)' },
  { value: '', label: 'None' }
] as const

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
    if (!validateCode(data.code) && !contractType) {
      return
    }

    // Build probation period JSON for additionalValue2
    const probationPeriod: ProbationPeriod = {
      value: data.probationValue ? Number(data.probationValue) : null,
      unit: data.probationUnit || ''
    }
    const additionalValue2 = probationPeriod.value && probationPeriod.unit ? JSON.stringify(probationPeriod) : ''

    const payload = {
      ...(contractType ? { id: contractType.id } : {}),
      code: data.code,
      value: data.value,
      additionalValue1: data.description,
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
      probationUnit: existingProbation.unit || ''
    }),
    [contractType, existingProbation]
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
    >
      <FormField
        name="value"
        rules={{ required: 'Please enter contract type name' }}
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
          rules={{ required: 'Please enter contract type code' }}
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

      <div className="gba:space-y-2">
        <FormLabel>Probation Period</FormLabel>
        <div className="gba:flex gba:gap-3">
          <FormField
            name="probationValue"
            render={({ field }) => (
              <FormItem className="gba:flex-1">
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Enter value"
                    {...field}
                    data-testid={`${dataTestId}-probation-value-input`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="probationUnit"
            render={({ field }) => (
              <FormItem className="gba:flex-1">
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger data-testid={`${dataTestId}-probation-unit-select`}>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </FormWrapperModal>
  )
}

export default ContractTypeForm
