import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  EMPLOYMENT_TYPE_CATALOG,
  EMPLOYMENT_TYPE_VERSION
} from '@/business-apps/hr/core/forms/job-position/hooks/useEmploymentTypes'
import { useCodeError } from '@/business-apps/mdm/hooks/useCodeError'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

// Helper to validate no leading whitespace (trailing will be trimmed on submit)
const noLeadingWhitespace = (value: string) => value === value.trimStart()
const noLeadingWhitespaceMessage = 'Cannot start with whitespace'

// Zod validation schema (for editing - code is optional)
const employmentTypeFormSchema = z.object({
  value: z
    .string({ message: 'Please enter employment type name' })
    .min(1, 'Please enter employment type name')
    .max(64, 'Employment type name must be less than 64 characters')
    .refine(noLeadingWhitespace, noLeadingWhitespaceMessage),
  code: z.string().optional(),
  description: z
    .string()
    .max(100, 'Description must be less than 100 characters')
    .refine(val => !val || noLeadingWhitespace(val), noLeadingWhitespaceMessage)
    .optional()
})

// Schema for creating new employment type (code is required)
const createEmploymentTypeFormSchema = employmentTypeFormSchema.extend({
  code: z
    .string({ message: 'Please enter employment type code' })
    .min(1, 'Please enter employment type code')
    .max(10, 'Employment type code must be less than 10 characters')
    .refine(noLeadingWhitespace, noLeadingWhitespaceMessage)
})

export interface EmploymentTypeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  employmentType?: {
    id: string
    value: string
    code: string
    description: string
  }
  onCancel?: () => void
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  isDrawerActive?: boolean
  usedCodes: string[]
}

const EmploymentTypeForm: React.FC<EmploymentTypeFormProps> = ({
  prefixDataTestId,
  employmentType,
  childAddButton,
  onCancel,
  refetch,
  accessToken,
  usedCodes = [],
  isDrawerActive
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, 'EmploymentTypeForm')
  const { codeError, setCodeError, validateCode } = useCodeError(usedCodes)
  const catalogClient = useCatalogManagerClient(accessToken)

  const handleSubmit = async (data: any) => {
    // Trim all string values before processing
    const trimmedData = {
      ...data,
      value: data.value?.trim() || '',
      code: data.code?.trim() || '',
      description: data.description?.trim() || ''
    }

    if (!validateCode(trimmedData.code) && !employmentType) {
      return
    }

    const payload = {
      ...(employmentType ? { id: employmentType.id } : {}),
      code: trimmedData.code,
      value: trimmedData.value,
      additionalValue1: trimmedData.description,
      translations: []
    }

    if (employmentType) {
      await catalogClient.updateCatalogEntry(
        EMPLOYMENT_TYPE_CATALOG,
        EMPLOYMENT_TYPE_VERSION,
        employmentType.id ?? '',
        payload
      )
    } else {
      await catalogClient.createCatalogEntry(EMPLOYMENT_TYPE_CATALOG, EMPLOYMENT_TYPE_VERSION, payload)
    }

    refetch()
  }

  const defaultValues = useMemo(
    () => ({
      value: employmentType?.value || '',
      code: employmentType?.code || '',
      description: employmentType?.description || ''
    }),
    [employmentType]
  )

  // Use different schema for create vs edit (code required only on create)
  const resolver = useMemo(
    () => zodResolver(employmentType ? employmentTypeFormSchema : createEmploymentTypeFormSchema) as any,
    [employmentType]
  )

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={employmentType ? 'Edit Employment Type' : 'Create Employment Type'}
      description="Configure employment type details and additional information"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
      isEditing={!!employmentType}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      isValid={!codeError}
      setCodeError={setCodeError}
      resolver={resolver}
      schema={employmentType ? employmentTypeFormSchema : createEmploymentTypeFormSchema}
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

      {!employmentType && (
        <FormField
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter code"
                  {...field}
                  data-testid={`${dataTestId}-code-input`}
                  onChange={e => {
                    field.onChange(e)
                    validateCode(e.target.value)
                  }}
                />
              </FormControl>
              <FormMessage>{codeError}</FormMessage>
            </FormItem>
          )}
          name="code"
        />
      )}

      <FormField
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input
                data-testid={`${dataTestId}-description-input`}
                placeholder="Enter description (optional)"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
        name="description"
      />
    </FormWrapperModal>
  )
}

export default EmploymentTypeForm
