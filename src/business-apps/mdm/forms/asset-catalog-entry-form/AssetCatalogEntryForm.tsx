import React, { useMemo } from 'react'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import type { FieldValues, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCodeError } from '@/business-apps/mdm/hooks/useCodeError'
import { ASSET_CATALOG_VERSION, type AssetCatalogIdentifier } from '@/business-apps/mdm/apps/assets-master-data/types'
import {
  isAssetCatalogEntryMarkedDeleted,
  mergeAssetCatalogEntryForPut,
  upsertAssetCatalogTranslationForLocale
} from '@/business-apps/mdm/apps/assets-master-data/utils/catalogEntryMetadata'
import translations from './_i18n'

const noLeadingWhitespace = (value: string) => value === value.trimStart()

const buildAssetCatalogEntryFormSchema = (msgs: {
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

const buildCreateAssetCatalogEntryFormSchema = (msgs: {
  nameRequired: string
  nameTooLong: string
  codeRequired: string
  codeTooLong: string
  descriptionTooLong: string
  noLeadingWhitespace: string
}) =>
  buildAssetCatalogEntryFormSchema(msgs).extend({
    code: z
      .string({ message: msgs.codeRequired })
      .min(1, msgs.codeRequired)
      .max(10, msgs.codeTooLong)
      .refine(noLeadingWhitespace, msgs.noLeadingWhitespace)
  })

export interface AssetCatalogEntryFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  catalogIdentifier: AssetCatalogIdentifier
  catalogVersion?: typeof ASSET_CATALOG_VERSION
  catalogName: string
  assetCatalogEntry?: {
    id: string
    value: string
    code: string
    description?: string
  }
  onCancel?: () => void
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  isDrawerActive?: boolean
  usedCodes?: string[]
}

const AssetCatalogEntryForm: React.FC<AssetCatalogEntryFormProps> = ({
  prefixDataTestId,
  catalogIdentifier,
  catalogVersion = ASSET_CATALOG_VERSION,
  catalogName,
  assetCatalogEntry,
  childAddButton,
  onCancel,
  refetch,
  accessToken,
  usedCodes = [],
  isDrawerActive
}) => {
  const { t } = useTranslation(translations)
  const dataTestId = formatDataTestId(prefixDataTestId, 'AssetCatalogEntryForm')
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

  const editSchema = useMemo(() => buildAssetCatalogEntryFormSchema(validationMsgs), [validationMsgs])
  const createSchema = useMemo(() => buildCreateAssetCatalogEntryFormSchema(validationMsgs), [validationMsgs])
  const activeSchema = assetCatalogEntry ? editSchema : createSchema

  const handleSubmit = async (data: FieldValues) => {
    const trimmedData = {
      value: String(data.value ?? '').trim(),
      code: String(data.code ?? '').trim(),
      description: String(data.description ?? '').trim()
    }
    const codeForSave = assetCatalogEntry?.code?.trim() || trimmedData.code

    if (!validateCode(trimmedData.code) && !assetCatalogEntry) {
      return
    }

    if (assetCatalogEntry) {
      const fresh = await catalogClient.getCatalogEntryById(assetCatalogEntry.id)
      const translations = upsertAssetCatalogTranslationForLocale(fresh.translations, userLocale, {
        value: trimmedData.value,
        additionalValue1: trimmedData.description
      })
      const payload = mergeAssetCatalogEntryForPut(fresh, {
        value: trimmedData.value,
        additionalValue1: trimmedData.description,
        isDeleted: isAssetCatalogEntryMarkedDeleted(fresh),
        translations
      })

      await catalogClient.updateCatalogEntry(catalogIdentifier, catalogVersion, assetCatalogEntry.id, payload)
    } else {
      await catalogClient.createCatalogEntry(catalogIdentifier, catalogVersion, {
        code: codeForSave,
        value: trimmedData.value,
        additionalValue1: trimmedData.description,
        isDeleted: false,
        translations: []
      })
    }

    refetch()
  }

  const defaultValues = useMemo(
    () => ({
      value: assetCatalogEntry?.value || '',
      code: assetCatalogEntry?.code || '',
      description: assetCatalogEntry?.description || ''
    }),
    [assetCatalogEntry]
  )

  const resolver = useMemo(() => zodResolver(activeSchema) as unknown as Resolver<FieldValues>, [activeSchema])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={assetCatalogEntry ? t('form-title-edit') : t('form-title-create')}
      description={`${t('form-description')} ${catalogName}.`}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
      isEditing={!!assetCatalogEntry}
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

      {!assetCatalogEntry && (
        <FormField
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('field-code-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('field-code-placeholder')}
                  {...field}
                  data-testid={`${dataTestId}-code-input`}
                  onChange={event => {
                    field.onChange(event)
                    validateCode(event.target.value)
                  }}
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
      />
    </FormWrapperModal>
  )
}

export default AssetCatalogEntryForm
