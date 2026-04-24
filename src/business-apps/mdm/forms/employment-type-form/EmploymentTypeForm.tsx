import React, { useMemo } from 'react'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { EMPLOYMENT_TYPE_CATALOG, EMPLOYMENT_TYPE_VERSION } from '@/business-apps/mdm/apps/employment-data/types'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCodeError } from '@/business-apps/mdm/hooks/useCodeError'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import translations from './_i18n'
import {
  mergeCatalogEntryForPut,
  isEmploymentTypeMarkedDeleted,
  upsertCatalogTranslationForLocale
} from '@/business-apps/mdm/apps/employment-data/utils/catalogEntryMetadata'
import type { CatalogEntry } from '@/common/types/CatalogTypes'

const noLeadingWhitespace = (value: string) => value === value.trimStart()

const buildEmploymentTypeFormSchema = (msgs: {
  nameRequired: string
  nameTooLong: string
  descriptionTooLong: string
  noLeadingWhitespace: string
}) =>
  z.object({
    value: z
      .string({ message: msgs.nameRequired })
      .min(1, msgs.nameRequired)
      .max(64, msgs.nameTooLong)
      .refine(noLeadingWhitespace, msgs.noLeadingWhitespace),
    code: z.string().optional(),
    description: z
      .string()
      .max(100, msgs.descriptionTooLong)
      .refine(val => !val || noLeadingWhitespace(val), msgs.noLeadingWhitespace)
      .optional()
  })

const buildCreateEmploymentTypeFormSchema = (msgs: {
  nameRequired: string
  nameTooLong: string
  codeRequired: string
  codeTooLong: string
  descriptionTooLong: string
  noLeadingWhitespace: string
}) =>
  buildEmploymentTypeFormSchema(msgs).extend({
    code: z
      .string({ message: msgs.codeRequired })
      .min(1, msgs.codeRequired)
      .max(10, msgs.codeTooLong)
      .refine(noLeadingWhitespace, msgs.noLeadingWhitespace)
  })

export interface EmploymentTypeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  employmentType?: {
    id: string
    value: string
    code: string
    description: string
    additionalValue2?: string
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
  const { t } = useTranslation(translations)
  const dataTestId = formatDataTestId(prefixDataTestId, 'EmploymentTypeForm')
  const { codeError, setCodeError, validateCode } = useCodeError(usedCodes)
  const catalogClient = useCatalogManagerClient(accessToken)
  const userLocale = useUserLocale() ?? 'en-US'

  const validationMsgs = useMemo(
    () => ({
      nameRequired: t('validation-name-required'),
      nameTooLong: t('validation-name-too-long'),
      codeRequired: t('validation-code-required'),
      codeTooLong: t('validation-code-too-long'),
      descriptionTooLong: t('validation-description-too-long'),
      noLeadingWhitespace: t('validation-no-leading-whitespace')
    }),
    [t]
  )

  const employmentTypeFormSchema = useMemo(() => buildEmploymentTypeFormSchema(validationMsgs), [validationMsgs])

  const createEmploymentTypeFormSchema = useMemo(
    () => buildCreateEmploymentTypeFormSchema(validationMsgs),
    [validationMsgs]
  )

  const activeSchema = employmentType ? employmentTypeFormSchema : createEmploymentTypeFormSchema

  const handleSubmit = async (data: any) => {
    const trimmedData = {
      ...data,
      value: data.value?.trim() || '',
      code: data.code?.trim() || '',
      description: data.description?.trim() || ''
    }

    const codeForSave = employmentType?.code?.trim() || trimmedData.code

    if (!validateCode(trimmedData.code) && !employmentType) {
      return
    }

    if (employmentType) {
      const fresh = await catalogClient.getCatalogEntryById(employmentType.id)
      const translations = upsertCatalogTranslationForLocale(fresh.translations, userLocale, {
        value: trimmedData.value,
        additionalValue1: trimmedData.description
      })
      const payload = mergeCatalogEntryForPut(fresh, {
        value: trimmedData.value,
        additionalValue1: trimmedData.description,
        isDeleted: isEmploymentTypeMarkedDeleted(fresh),
        translations
      })
      await catalogClient.updateCatalogEntry(
        EMPLOYMENT_TYPE_CATALOG,
        EMPLOYMENT_TYPE_VERSION,
        employmentType.id ?? '',
        payload as Partial<Omit<CatalogEntry, 'id' | 'type'>>
      )
    } else {
      await catalogClient.createCatalogEntry(EMPLOYMENT_TYPE_CATALOG, EMPLOYMENT_TYPE_VERSION, {
        code: codeForSave,
        value: trimmedData.value,
        additionalValue1: trimmedData.description,
        isDeleted: false,
        translations: []
      } as Omit<CatalogEntry, 'id' | 'type'>)
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

  const resolver = useMemo(() => zodResolver(activeSchema) as any, [activeSchema])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={employmentType ? t('form-title-edit') : t('form-title-create')}
      description={t('form-description')}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
      isEditing={!!employmentType}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      isValid={!codeError}
      setCodeError={setCodeError}
      resolver={resolver}
      schema={activeSchema}
    >
      <FormField
        name="value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('field-name-label')}</FormLabel>
            <FormControl>
              <Input placeholder={t('field-name-placeholder')} {...field} data-testid={`${dataTestId}-name-input`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!employmentType && (
        <FormField
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('field-code-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('field-code-placeholder')}
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
            <FormLabel>{t('field-description-label')}</FormLabel>
            <FormControl>
              <Input
                data-testid={`${dataTestId}-description-input`}
                placeholder={t('field-description-placeholder')}
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
