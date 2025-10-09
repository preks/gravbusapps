import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import FormWrapperModal from '../../apps/generic-components/form-wrapper/FormWrapperModal'
import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  CONTRACT_TYPE_CATALOG,
  CONTRACT_TYPE_VERSION
} from '@/business-apps/hr/core/forms/job-position/hooks/useContractTypes'
import { useCodeError } from '@/business-apps/mdm/hooks/useCodeError'
import { ContractTypeTable } from '../../apps/employment-data/components/tabs/ContractTypesTab'

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
    if (!validateCode(data.code)) {
      return
    }

    const payload = {
      ...(contractType ? { id: contractType.id } : {}),
      code: data.code,
      value: data.value,
      additionalValue1: data.description,
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

  const defaultValues = useMemo(
    () => ({
      value: contractType?.value || '',
      code: contractType?.code || '',
      description: contractType?.description || ''
    }),
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
    </FormWrapperModal>
  )
}

export default ContractTypeForm
