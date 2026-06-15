import React, { useEffect, useMemo, useState } from 'react'
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
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCodeError } from '@/business-apps/mdm/hooks/useCodeError'
import {
  ASSET_BRAND_CATALOG,
  ASSET_CATALOG_VERSION,
  type AssetCatalogIdentifier
} from '@/business-apps/mdm/apps/assets-master-data/types'
import {
  isAssetCatalogEntryMarkedDeleted,
  mergeAssetCatalogEntryForPut
} from '@/business-apps/mdm/apps/assets-master-data/utils/catalogEntryMetadata'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import { AssetCategoryParentField } from './AssetCategoryParentField'
import { AssetCatalogTranslationFields } from './AssetCatalogTranslationFields'
import {
  buildAssetCatalogEntryFormSchema,
  buildCreateAssetCatalogEntryFormSchema,
  buildCreateTranslations,
  buildUpdateTranslations,
  getTranslationValue
} from './assetCatalogTranslationUtils'
import { useAssetCategoryOptions } from './useAssetCategoryOptions'
import translations from './_i18n'

export interface AssetCatalogEntryFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  catalogIdentifier: AssetCatalogIdentifier
  catalogVersion?: typeof ASSET_CATALOG_VERSION
  catalogName: string
  assetCatalogEntry?: {
    id: string
    value: string
    code: string
    parentEntryId?: string
    description?: string
    translations?: CatalogEntry['translations']
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
  const isAssetBrandForm = catalogIdentifier === ASSET_BRAND_CATALOG
  const [isOpen, setIsOpen] = useState(false)
  const [translationUpdateValues, setTranslationUpdateValues] = useState<FieldValues>({})
  const { loading: assetCategoryOptionsLoading, options: assetCategoryOptions } = useAssetCategoryOptions({
    catalogClient,
    enabled: isOpen && isAssetBrandForm,
    userLocale
  })

  useEffect(() => {
    if (!isOpen || !assetCatalogEntry) {
      setTranslationUpdateValues({})
      return
    }

    let isMounted = true

    const loadTranslations = async () => {
      try {
        const fresh = await catalogClient.getCatalogEntryById(assetCatalogEntry.id, {
          params: {
            localeCode: userLocale,
            includeTranslations: true
          }
        })

        if (!isMounted) return

        setTranslationUpdateValues({
          parentEntryId: fresh.parentEntryId ?? '',
          translationEnUs: getTranslationValue(fresh.translations, 'en-US'),
          translationDeDe: getTranslationValue(fresh.translations, 'de-DE'),
          translationRoRo: getTranslationValue(fresh.translations, 'ro-RO')
        })
      } catch {
        if (isMounted) {
          setTranslationUpdateValues({})
        }
      }
    }

    loadTranslations()

    return () => {
      isMounted = false
    }
  }, [assetCatalogEntry, catalogClient, isOpen, userLocale])

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
      parentEntryId: String(data.parentEntryId ?? '').trim(),
      description: String(data.description ?? '').trim()
    }
    const codeForSave = assetCatalogEntry?.code?.trim() || trimmedData.code

    if (!validateCode(trimmedData.code) && !assetCatalogEntry) {
      return
    }

    if (assetCatalogEntry) {
      const fresh = await catalogClient.getCatalogEntryById(assetCatalogEntry.id, {
        params: {
          localeCode: userLocale,
          includeTranslations: true
        }
      })
      const translations = buildUpdateTranslations(
        fresh.translations,
        data,
        userLocale,
        trimmedData.description,
        trimmedData.value
      )
      const parentEntryIdOverride = trimmedData.parentEntryId || (fresh.parentEntryId ? null : undefined)
      const payload = mergeAssetCatalogEntryForPut(fresh, {
        value: trimmedData.value,
        additionalValue1: trimmedData.description,
        ...(isAssetBrandForm ? { parentEntryId: parentEntryIdOverride } : {}),
        isDeleted: isAssetCatalogEntryMarkedDeleted(fresh),
        translations
      })

      await catalogClient.updateCatalogEntry(catalogIdentifier, catalogVersion, assetCatalogEntry.id, payload)
    } else {
      await catalogClient.createCatalogEntry(catalogIdentifier, catalogVersion, {
        code: codeForSave,
        value: trimmedData.value,
        ...(isAssetBrandForm ? { parentEntryId: trimmedData.parentEntryId || undefined } : {}),
        additionalValue1: trimmedData.description,
        isDeleted: false,
        translations: buildCreateTranslations(data)
      })
    }

    refetch()
  }

  const defaultValues = useMemo(
    () => ({
      value: assetCatalogEntry?.value || '',
      code: assetCatalogEntry?.code || '',
      parentEntryId: assetCatalogEntry?.parentEntryId || '',
      description: assetCatalogEntry?.description || '',
      translationEnUs: getTranslationValue(assetCatalogEntry?.translations, 'en-US'),
      translationDeDe: getTranslationValue(assetCatalogEntry?.translations, 'de-DE'),
      translationRoRo: getTranslationValue(assetCatalogEntry?.translations, 'ro-RO')
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
      open={isOpen}
      setOpen={setIsOpen}
      isEditing={!!assetCatalogEntry}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      isValid={!codeError}
      setCodeError={setCodeError}
      resolver={resolver}
      schema={activeSchema}
      updateValues={translationUpdateValues}
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

      <AssetCatalogTranslationFields dataTestId={dataTestId} t={t} />

      {isAssetBrandForm && (
        <AssetCategoryParentField
          dataTestId={dataTestId}
          loading={assetCategoryOptionsLoading}
          options={assetCategoryOptions}
          t={t}
        />
      )}

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
