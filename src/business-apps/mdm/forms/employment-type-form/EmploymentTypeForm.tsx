import React, { useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { FormWrapperModal } from '@/components/form-wrapper';
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { useTranslation } from 'react-i18next';
import {
  EMPLOYMENT_TYPE_CATALOG,
  EMPLOYMENT_TYPE_VERSION
} from '@/business-apps/hr/core/forms/job-position/hooks/useEmploymentTypes'
import { useCodeError } from '@/business-apps/mdm/hooks/useCodeError'

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
  onCancel,
  childAddButton,
  refetch,
  accessToken,
  isDrawerActive,
  usedCodes = []
}) => {
  const { t } = useTranslation('master-data')
  const dataTestId = formatDataTestId(prefixDataTestId, 'EmploymentTypeForm')
  const catalogClient = useCatalogManagerClient(accessToken)
  const { codeError, setCodeError, validateCode } = useCodeError(usedCodes)

  const handleSubmit = async (values: any) => {
    if (!validateCode(values.code) && !employmentType) {
      return
    }

    const payload = {
      ...(employmentType ? { id: employmentType.id } : {}),
      code: values.code,
      value: values.value,
      additionalValue1: values.description,
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
    >
      <FormField
        name="value"
        rules={{
          required: t('forms.employmentType.fields.name.validation', {
            defaultValue: 'Please enter employment type name'
          })
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('forms.employmentType.fields.name.label', {
                defaultValue: 'Name'
              })}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms.employmentType.fields.name.placeholder', {
                  defaultValue: 'Enter name'
                })}
                {...field}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!employmentType && (
        <FormField
          name="code"
          rules={{
            required: t('forms.employmentType.fields.code.validation', {
              defaultValue: 'Please enter employment type code'
            })
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('forms.employmentType.fields.code.label', {
                  defaultValue: 'Code'
                })}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t('forms.employmentType.fields.code.placeholder', {
                    defaultValue: 'Enter code'
                  })}
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
            <FormLabel>
              {t('forms.employmentType.fields.description.label', {
                defaultValue: 'Description'
              })}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms.employmentType.fields.description.placeholder', {
                  defaultValue: 'Enter description (optional)'
                })}
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

export default EmploymentTypeForm
