import React, { useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  Label,
  Input,
  Button,
  Combobox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  DateInput,
  LocalizationProvider,
  useTranslation
} from '@newwork/nw-design-system'
import { useForm, UseFormReturn, Control } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { extractCurrencyCode } from '@/common/utils/numberFormatter'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useCurrencyCatalog } from './hooks/useCurrencyCatalog'
import type { CurrencyOption } from './hooks/useCurrencyCatalog'
import { useActiveStructureCurrencies } from './hooks/useActiveStructureCurrencies'
import { useAssetsCatalog } from './hooks/useAssetsCatalog'
import { useBrandsCatalog } from './hooks/useBrandsCatalog'
import { useSiteLocations } from './hooks/useSiteLocations'
import { AssetProcessClient } from '../../apps/assets/services/AssetProcessClient'
import { useAssetService } from '../../apps/assets/services/useAssetService'
import { AssetStatus } from '../../apps/assets/types'
import translations from './_i18n'

type SupportedLocale = 'en-US' | 'de-DE' | 'ro-RO'

const createEquipmentFormSchema = (t: (key: string) => string) =>
  z.object({
    category: z.string().min(1, t('equipment-registration-validation-category-required')),
    brand: z.string().min(1, t('equipment-registration-validation-producer-required')),
    model: z.string().min(2, t('equipment-registration-validation-model-min-length')),
    serialNumber: z
      .string()
      .transform(s => (s ?? '').trim())
      .refine(
        val => val.length === 0 || val.length >= 3,
        t('equipment-registration-validation-serial-number-min-length')
      ),
    location: z.string().optional(),
    acquisitionDate: z.string().optional(),
    warrantyPeriodMonths: z.number().min(0, t('equipment-registration-validation-warranty-min')),
    inventoryValue: z.number().min(0, t('equipment-registration-validation-inventory-value-min')),
    currency: z.string().min(1, t('equipment-registration-validation-currency-required')),
    status: z.nativeEnum(AssetStatus),
    notes: z.string().optional()
  })

type FormValues = {
  category: string
  brand: string
  model: string
  serialNumber: string
  location?: string
  acquisitionDate?: string
  warrantyPeriodMonths: number
  inventoryValue: number
  currency: string
  status: AssetStatus
  notes?: string
}

type AssetFormSource = {
  assetCategoryRef?: string | null
  assetBrandRef?: string | null
  model?: string | null
  serialNumber?: string | null
  siteLocationId?: string | null
  acquisitionDate?: string | null
  warrantyPeriodMonths?: number | null
  inventoryValue?: number | null
  currencyRef?: string | null
  assetStatus?: AssetStatus | null
  notes?: string | null
}

const buildFormValues = (asset?: AssetFormSource | null): FormValues => ({
  category: asset?.assetCategoryRef || '',
  brand: asset?.assetBrandRef || '',
  model: asset?.model || '',
  serialNumber: asset?.serialNumber || '',
  location: asset?.siteLocationId || '',
  acquisitionDate: asset?.acquisitionDate || '',
  warrantyPeriodMonths: asset?.warrantyPeriodMonths || 0,
  inventoryValue: asset?.inventoryValue || 0,
  currency: asset?.currencyRef || '',
  status: asset?.assetStatus || AssetStatus.AVAILABLE,
  notes: asset?.notes || ''
})

function currencyOptionMatchesRefs(option: CurrencyOption, structureCurrencyRefs: string[]): boolean {
  return structureCurrencyRefs.some(ref => {
    const currencyCode = extractCurrencyCode(ref)
    return option.id === ref || option.value === ref || option.code === currencyCode || option.label === currencyCode
  })
}

type FullWidthSelectProps = {
  id: string
  'data-testid': string
  value: string | undefined
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: React.ReactNode
  children: React.ReactNode
}

// DS SelectTrigger renders an inner shell with nw:w-fit; override so triggers fill their column.
const SELECT_FULL_WIDTH_CLASSES =
  'gba:w-full gba:**:data-[slot=select-trigger-shell]:w-full gba:**:data-[slot=select-trigger]:w-full'

const FORM_FIELD_GRID_CLASSES = `gba:grid gba:grid-cols-2 gba:gap-4 ${SELECT_FULL_WIDTH_CLASSES}`

function FullWidthSelect({
  id,
  'data-testid': dataTestId,
  value,
  onValueChange,
  disabled,
  placeholder,
  children
}: FullWidthSelectProps) {
  return (
    <div className={SELECT_FULL_WIDTH_CLASSES}>
      <Select onValueChange={onValueChange} value={value ?? ''} disabled={disabled}>
        <FormControl className="gba:w-full">
          <SelectTrigger id={id} className="gba:w-full! gba:min-w-full" data-testid={dataTestId}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}

type SerialNumberFieldProps = {
  form: UseFormReturn<FormValues>
  control: Control<FormValues>
  isEditMode: boolean
  assetId: string | null
  getAssets: (variables: { where?: { _and: unknown[] }; limit?: number }) => Promise<{ assets: unknown[] }>
  t: (key: string) => string
}

const SerialNumberField: React.FC<SerialNumberFieldProps> = ({ form, control, isEditMode, assetId, getAssets, t }) => {
  const [isCheckingDuplicate, setIsCheckingDuplicate] = React.useState(false)
  const [duplicateError, setDuplicateError] = React.useState<string | null>(null)
  const category = form.watch('category')
  const brand = form.watch('brand')

  const checkDuplicate = React.useCallback(
    async (value: string) => {
      const trimmed = (value ?? '').trim()
      if (trimmed.length === 0 || trimmed.length < 3) {
        setDuplicateError(null)
        return
      }

      const categoryVal = form.getValues('category')
      const brandVal = form.getValues('brand')
      if (!categoryVal || !brandVal) {
        setDuplicateError(null)
        return
      }

      setIsCheckingDuplicate(true)
      try {
        const whereConditions: Array<
          | { serialNumber: { _eq: string } }
          | { assetCategoryRef: { _eq: string } }
          | { assetBrandRef: { _eq: string } }
          | { id: { _neq: string } }
        > = [
          { serialNumber: { _eq: trimmed } },
          { assetCategoryRef: { _eq: categoryVal } },
          { assetBrandRef: { _eq: brandVal } }
        ]
        if (isEditMode && assetId) {
          whereConditions.push({ id: { _neq: assetId } })
        }
        const result = await getAssets({
          where: { _and: whereConditions },
          limit: 1
        })

        if (result.assets.length > 0) {
          const errorMsg = t('equipment-registration-serial-number-duplicate')
          setDuplicateError(errorMsg)
          form.setError('serialNumber', { type: 'manual', message: errorMsg })
        } else {
          setDuplicateError(null)
          form.clearErrors('serialNumber')
        }
      } catch (error) {
        console.error('Error checking duplicate serial number:', error)
        setDuplicateError(null)
      } finally {
        setIsCheckingDuplicate(false)
      }
    },
    [form, getAssets, isEditMode, assetId, t]
  )

  React.useEffect(() => {
    checkDuplicate(form.getValues('serialNumber'))
  }, [category, brand, checkDuplicate, form])

  return (
    <FormField
      control={control}
      name="serialNumber"
      render={({ field, fieldState }) => {
        const handleBlur = async () => {
          field.onBlur()
          await checkDuplicate(field.value)
        }

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          field.onChange(e)
          if (duplicateError) {
            setDuplicateError(null)
            form.clearErrors('serialNumber')
          }
        }

        return (
          <FormItem className="gba:w-full">
            <Label htmlFor="serialNumber" data-testid="serial-number-label">
              {t('equipment-registration-serial-number')}
            </Label>
            <Input
              id="serialNumber"
              className="gba:w-full"
              placeholder={t('equipment-registration-serial-number-placeholder')}
              value={field.value || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              data-testid="serial-number-input"
              disabled={isEditMode || isCheckingDuplicate}
            />
            {(fieldState.error || duplicateError) && (
              <p className="gba:text-sm gba:font-medium gba:text-destructive" data-testid="serial-number-error">
                {fieldState.error?.message || duplicateError}
              </p>
            )}
          </FormItem>
        )
      }}
    />
  )
}

const EquipmentRegistrationContent: React.FC<BusinessAppContextProps> = (context: BusinessAppContextProps) => {
  const { additionalData } = context
  const { t } = useTranslation(translations)
  const assetId =
    additionalData?.assetId ||
    additionalData?.psi_taskPayload?.assetId ||
    additionalData?.psi_taskPayload?.initialParameters?.assetId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.assetId ||
    null

  const existingAsset =
    additionalData?.asset ||
    additionalData?.psi_taskPayload?.asset ||
    additionalData?.psi_taskPayload?.initialParameters?.asset ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.asset ||
    null

  const assetVersion = useMemo(() => {
    if (existingAsset?.version !== undefined) {
      return existingAsset.version
    }
    if (additionalData?.version !== undefined) {
      return additionalData.version
    }
    if (additionalData?.psi_taskPayload?.version !== undefined) {
      return additionalData.psi_taskPayload.version
    }
    if (additionalData?.psi_taskPayload?.initialParameters?.version !== undefined) {
      return additionalData.psi_taskPayload.initialParameters.version
    }
    if (additionalData?.psi_taskPayload?.psi_initialParameters?.version !== undefined) {
      return additionalData.psi_taskPayload.psi_initialParameters.version
    }
    return 0
  }, [existingAsset, additionalData])

  const isEditMode = !!assetId

  const { options: allCurrencyOptions, isLoading: currenciesLoading } = useCurrencyCatalog(context)
  const { structureCurrencyRefs, isLoading: structureCurrencyLoading } = useActiveStructureCurrencies(
    context.accessToken
  )
  const currencyFieldsLoading = currenciesLoading || structureCurrencyLoading
  const currencyOptions = useMemo(() => {
    if (allCurrencyOptions.length === 0) {
      return []
    }

    if (structureCurrencyRefs.length === 0) {
      return allCurrencyOptions
    }

    const matchedOptions = allCurrencyOptions.filter(option => currencyOptionMatchesRefs(option, structureCurrencyRefs))

    return matchedOptions.length > 0 ? matchedOptions : allCurrencyOptions
  }, [allCurrencyOptions, structureCurrencyRefs])
  const { options: assetOptions, isLoading: assetsLoading } = useAssetsCatalog(context)
  const { options: brandOptions, isLoading: brandsLoading } = useBrandsCatalog(context)
  const { options: locationOptions, isLoading: locationsLoading } = useSiteLocations(context)
  const { getAssetById, getAssets, getCurrentAllocation, getAllocationsForAsset, deallocateAsset } =
    useAssetService(context)

  const [currentAllocation, setCurrentAllocation] = React.useState<any>(null)

  const assetProcessClient = useMemo(() => {
    const client = new AssetProcessClient()
    client.setAccessToken(context.accessToken)
    return client
  }, [context.accessToken])

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const formSchema = useMemo(() => createEquipmentFormSchema(t), [t])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: buildFormValues()
  })

  const watchedValues = form.watch()
  const selectedCategory = watchedValues.category
  const selectedBrand = watchedValues.brand
  const visibleCurrencyOptions = useMemo(() => {
    const selectedCurrency = watchedValues.currency

    if (!isEditMode || !selectedCurrency) {
      return currencyOptions
    }

    const selectedOption = allCurrencyOptions.find(
      option => option.value === selectedCurrency || option.id === selectedCurrency
    )
    const selectedOptionIsVisible = currencyOptions.some(
      option => option.value === selectedCurrency || option.id === selectedCurrency
    )

    if (selectedOption && !selectedOptionIsVisible) {
      return [selectedOption, ...currencyOptions]
    }

    return currencyOptions
  }, [allCurrencyOptions, currencyOptions, isEditMode, watchedValues.currency])
  const currencyComboboxOptions = useMemo(
    () =>
      visibleCurrencyOptions.map(currency => ({
        value: currency.value,
        label: currency.label
      })),
    [visibleCurrencyOptions]
  )
  const filteredBrandOptions = useMemo(
    () => brandOptions.filter(brand => brand.parentEntryId === selectedCategory),
    [brandOptions, selectedCategory]
  )
  const visibleBrandOptions = useMemo(() => {
    if (!isEditMode || !selectedBrand) {
      return filteredBrandOptions
    }

    const selectedOption = brandOptions.find(brand => brand.id === selectedBrand)
    const selectedOptionIsVisible = filteredBrandOptions.some(brand => brand.id === selectedBrand)

    if (selectedOption && !selectedOptionIsVisible) {
      return [selectedOption, ...filteredBrandOptions]
    }

    return filteredBrandOptions
  }, [brandOptions, filteredBrandOptions, isEditMode, selectedBrand])
  const initialValuesRef = React.useRef<FormValues>(buildFormValues(existingAsset))

  const isUnchangedNow = useMemo(() => {
    return JSON.stringify(watchedValues) === JSON.stringify(initialValuesRef.current)
  }, [watchedValues])

  useEffect(() => {
    if (isEditMode) return

    const selectedBrandMatchesCategory = filteredBrandOptions.some(brand => brand.id === selectedBrand)

    if (selectedBrand && !selectedBrandMatchesCategory) {
      form.setValue('brand', '', { shouldDirty: true, shouldValidate: true })
    }
  }, [filteredBrandOptions, form, isEditMode, selectedBrand])

  useEffect(() => {
    if (isEditMode || currencyFieldsLoading || currencyOptions.length !== 1) {
      return
    }

    const currentCurrency = form.getValues('currency')
    if (!currentCurrency) {
      form.setValue('currency', currencyOptions[0].value, { shouldValidate: true })
    }
  }, [currencyFieldsLoading, currencyOptions, form, isEditMode])

  React.useEffect(() => {
    const loadAsset = async () => {
      if (isEditMode && assetId && !existingAsset) {
        try {
          const asset = await getAssetById(assetId)
          if (asset) {
            const nextValues = buildFormValues(asset)
            initialValuesRef.current = nextValues
            form.reset(nextValues)
            void form.trigger()

            // Load current allocation to determine valid status transitions
            try {
              const allocation = await getCurrentAllocation(assetId)
              setCurrentAllocation(allocation)
            } catch (err) {
              console.error('Error loading allocation:', err)
              setCurrentAllocation(null)
            }
          }
        } catch (error) {
          console.error('Error loading asset:', error)
        }
      } else if (isEditMode && existingAsset) {
        const nextValues = buildFormValues(existingAsset)
        initialValuesRef.current = nextValues
        form.reset(nextValues)
        void form.trigger()

        // Load current allocation to determine valid status transitions
        if (assetId) {
          try {
            const allocation = await getCurrentAllocation(assetId)
            setCurrentAllocation(allocation)
          } catch (err) {
            console.error('Error loading allocation:', err)
            setCurrentAllocation(null)
          }
        }
      }
    }

    loadAsset()
  }, [isEditMode, assetId, existingAsset, getAssetById, getCurrentAllocation, form])

  const defaultValues: FormValues = useMemo(() => buildFormValues(existingAsset), [existingAsset])

  const title = useMemo(
    () => (isEditMode ? t('equipment-registration-title-edit') : t('equipment-registration-title')),
    [isEditMode, t]
  )

  const updateButtonText = useMemo(() => t('equipment-registration-submit-edit'), [t])

  const registerButtonText = useMemo(() => t('equipment-registration-submit'), [t])

  const cancelButtonText = useMemo(() => t('equipment-registration-cancel'), [t])

  const brandPlaceholder = useMemo(() => {
    if (brandsLoading) {
      return t('equipment-registration-loading-brands')
    }

    if (!selectedCategory) {
      return t('equipment-registration-select-category-first')
    }

    return t('equipment-registration-select-producer')
  }, [brandsLoading, selectedCategory, t])

  const isSubmitDisabled = useMemo(() => {
    const hasValidationErrors = Object.keys(form.formState.errors || {}).length > 0

    return (
      isSubmitting ||
      currencyFieldsLoading ||
      assetsLoading ||
      brandsLoading ||
      locationsLoading ||
      !form.formState.isValid ||
      hasValidationErrors ||
      (isEditMode && isUnchangedNow)
    )
  }, [
    isSubmitting,
    currencyFieldsLoading,
    assetsLoading,
    brandsLoading,
    locationsLoading,
    form.formState.errors,
    form.formState.isValid,
    isEditMode,
    isUnchangedNow
  ])

  const handleCreateSubmit = async (values: FormValues) => {
    try {
      const siteLocation = values.location && values.location.trim() !== '' ? values.location.trim() : undefined

      const serialNumber =
        values.serialNumber?.trim() && values.serialNumber.trim().length > 0 ? values.serialNumber.trim() : undefined
      const acquisitionDate =
        values.acquisitionDate?.trim() && values.acquisitionDate.trim().length > 0
          ? values.acquisitionDate.trim()
          : undefined
      const warrantyPeriodMonths =
        typeof values.warrantyPeriodMonths === 'number' && values.warrantyPeriodMonths > 0
          ? values.warrantyPeriodMonths
          : undefined
      const response = await assetProcessClient.createAsset({
        model: values.model,
        ...(serialNumber !== undefined && { serialNumber }),
        ...(acquisitionDate !== undefined && { acquisitionDate }),
        ...(warrantyPeriodMonths !== undefined && { warrantyPeriodMonths }),
        inventoryValue: values.inventoryValue,
        assetStatus: values.status,
        assetBrandRef: values.brand,
        assetCategoryRef: values.category,
        currencyRef: values.currency,
        siteLocation,
        notes: values.notes
      })

      return {
        asset: {
          id: response.assetId,
          model: values.model,
          serialNumber: serialNumber ?? values.serialNumber
        }
      }
    } catch (error) {
      console.error('Error creating asset:', error)
      throw error
    }
  }

  const handleEditSubmit = async (values: FormValues) => {
    if (!assetId) {
      throw new Error(t('equipment-registration-asset-id-required'))
    }

    if (assetVersion === undefined || assetVersion === null) {
      throw new Error(t('equipment-registration-asset-version-required'))
    }

    try {
      const siteLocation = values.location && values.location.trim() !== '' ? values.location.trim() : undefined

      const serialNumber =
        values.serialNumber?.trim() && values.serialNumber.trim().length > 0 ? values.serialNumber.trim() : undefined
      const acquisitionDate =
        values.acquisitionDate?.trim() && values.acquisitionDate.trim().length > 0
          ? values.acquisitionDate.trim()
          : undefined
      const warrantyPeriodMonths =
        typeof values.warrantyPeriodMonths === 'number' && values.warrantyPeriodMonths > 0
          ? values.warrantyPeriodMonths
          : undefined

      // When setting asset to "in repair", close any active allocation with end date = today
      if (values.status === AssetStatus.UNDER_REPAIR) {
        const allocations = await getAllocationsForAsset(assetId)
        const today = new Date().toISOString().slice(0, 10)
        for (const alloc of allocations) {
          if (!alloc.endDate) {
            await deallocateAsset(alloc.id, alloc.version, today)
          }
        }
      }

      await assetProcessClient.updateAsset({
        id: assetId,
        version: assetVersion,
        model: values.model,
        ...(serialNumber !== undefined && { serialNumber }),
        ...(acquisitionDate !== undefined && { acquisitionDate }),
        ...(warrantyPeriodMonths !== undefined && { warrantyPeriodMonths }),
        inventoryValue: values.inventoryValue,
        assetStatus: values.status,
        assetBrandRef: values.brand,
        assetCategoryRef: values.category,
        currencyRef: values.currency,
        siteLocation,
        notes: values.notes
      })

      const completionPayload = {
        resolution: 'success',
        processName: 'updateAsset',
        domain: 'employee',
        response: {
          asset: {
            id: assetId,
            model: values.model,
            serialNumber: serialNumber ?? values.serialNumber
          }
        }
      }

      window.dispatchEvent(
        new CustomEvent('com.newwork.process.processCompletion', {
          detail: completionPayload
        })
      )

      window.dispatchEvent(
        new CustomEvent('com.newwork.process.taskCompletion', {
          detail: completionPayload
        })
      )

      if (additionalData?.onSuccess) {
        additionalData.onSuccess()
      }

      return completionPayload.response
    } catch (error) {
      console.error('Error updating asset:', error)
      throw error
    }
  }

  const formFields = (
    <div className={`gba:w-full gba:flex-1 gba:space-y-4 ${SELECT_FULL_WIDTH_CLASSES}`}>
      <div className={FORM_FIELD_GRID_CLASSES}>
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="gba:w-full gba:min-w-0">
              <Label htmlFor="category" data-testid="category-label">
                {t('equipment-registration-category')} *
              </Label>
              <FullWidthSelect
                id="category"
                data-testid="category-select"
                value={field.value}
                onValueChange={field.onChange}
                disabled={assetsLoading || isEditMode}
                placeholder={
                  assetsLoading
                    ? t('equipment-registration-loading-categories')
                    : t('equipment-registration-select-category')
                }
              >
                {assetOptions.map(asset => (
                  <SelectItem key={asset.id} value={asset.value} data-testid={`category-option-${asset.code}`}>
                    {asset.label}
                  </SelectItem>
                ))}
              </FullWidthSelect>
            </FormItem>
          )}
        />
      </div>

      <div className={FORM_FIELD_GRID_CLASSES}>
        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem className="gba:w-full gba:min-w-0">
              <Label htmlFor="brand" data-testid="brand-label">
                {t('equipment-registration-producer')} *
              </Label>
              <FullWidthSelect
                id="brand"
                data-testid="brand-select"
                value={field.value}
                onValueChange={field.onChange}
                disabled={brandsLoading || isEditMode || !selectedCategory}
                placeholder={brandPlaceholder}
              >
                {visibleBrandOptions.map(brand => (
                  <SelectItem key={brand.id} value={brand.id} data-testid={`brand-option-${brand.code}`}>
                    {brand.label}
                  </SelectItem>
                ))}
              </FullWidthSelect>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem className="gba:w-full gba:min-w-0">
              <Label htmlFor="model" data-testid="model-label">
                {t('equipment-registration-model')} *
              </Label>
              <Input
                id="model"
                className="gba:w-full"
                placeholder={t('equipment-registration-model-placeholder')}
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                data-testid="model-input"
              />
            </FormItem>
          )}
        />
      </div>

      <SerialNumberField
        form={form}
        control={form.control}
        isEditMode={isEditMode}
        assetId={assetId}
        getAssets={getAssets}
        t={t}
      />

      <div className={FORM_FIELD_GRID_CLASSES}>
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem className="gba:w-full gba:min-w-0">
              <Label htmlFor="location" data-testid="location-label">
                {t('equipment-registration-location')}
              </Label>
              <FullWidthSelect
                id="location"
                data-testid="location-select"
                value={field.value}
                onValueChange={field.onChange}
                disabled={locationsLoading}
                placeholder={
                  locationsLoading
                    ? t('equipment-registration-loading-locations')
                    : t('equipment-registration-select-location')
                }
              >
                {locationOptions.map(location => (
                  <SelectItem key={location.id} value={location.value} data-testid={`location-option-${location.code}`}>
                    {location.label}
                  </SelectItem>
                ))}
              </FullWidthSelect>
            </FormItem>
          )}
        />
      </div>

      <div className={FORM_FIELD_GRID_CLASSES}>
        <FormField
          control={form.control}
          name="acquisitionDate"
          render={({ field }) => (
            <FormItem className="gba:w-full gba:min-w-0">
              <Label htmlFor="acquisitionDate" data-testid="acquisition-date-label">
                {t('equipment-registration-acquisition-date')}
              </Label>
              <DateInput
                type="date"
                value={(field.value as string) || ''}
                onChange={(value: string | [string | null, string | null] | null) => {
                  if (typeof value === 'string') {
                    field.onChange(value)
                  } else {
                    field.onChange('')
                  }
                }}
                placeholder={t('equipment-registration-select-placeholder')}
                className="gba:w-full"
                disabled={isEditMode}
                data-testid="acquisition-date-input"
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="warrantyPeriodMonths"
          render={({ field }) => {
            const [isFocused, setIsFocused] = React.useState(false)
            // Show empty string when focused and value is 0, otherwise show the actual value
            const displayValue = isFocused && field.value === 0 ? '' : (field.value ?? '')

            return (
              <FormItem className="gba:w-full gba:min-w-0">
                <Label htmlFor="warrantyPeriodMonths" data-testid="warranty-period-label">
                  {t('equipment-registration-warranty-months')}
                </Label>
                <Input
                  id="warrantyPeriodMonths"
                  className="gba:w-full"
                  type="number"
                  min="0"
                  value={displayValue}
                  onChange={e => {
                    const inputValue = e.target.value
                    // If input is empty, set to 0
                    if (inputValue === '') {
                      field.onChange(0)
                      return
                    }
                    // Parse the value
                    const numValue = Number.parseInt(inputValue, 10)
                    // If it's a valid number, update the field
                    if (!isNaN(numValue)) {
                      field.onChange(numValue)
                    }
                  }}
                  onFocus={() => {
                    setIsFocused(true)
                  }}
                  onBlur={e => {
                    setIsFocused(false)
                    field.onBlur()
                    // If empty on blur, set back to 0
                    if (e.target.value === '') {
                      field.onChange(0)
                    }
                  }}
                  data-testid="warranty-period-input"
                />
              </FormItem>
            )
          }}
        />
      </div>

      <div className={`${FORM_FIELD_GRID_CLASSES} gba:items-start`}>
        <FormField
          control={form.control}
          name="inventoryValue"
          render={({ field }) => {
            const [isFocused, setIsFocused] = React.useState(false)
            // Show empty string when focused and value is 0, otherwise show the actual value
            const displayValue = isFocused && field.value === 0 ? '' : (field.value ?? '')

            return (
              <FormItem className="gba:w-full gba:min-w-0">
                <Label htmlFor="inventoryValue" data-testid="inventory-value-label">
                  {t('equipment-registration-inventory-value')} *
                </Label>
                <Input
                  id="inventoryValue"
                  className="gba:w-full"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={displayValue}
                  onChange={e => {
                    const inputValue = e.target.value
                    // If input is empty, set to 0
                    if (inputValue === '') {
                      field.onChange(0)
                      return
                    }
                    // Parse the value
                    const numValue = parseFloat(inputValue)
                    // If it's a valid number, update the field
                    if (!isNaN(numValue)) {
                      field.onChange(numValue)
                    }
                  }}
                  onFocus={() => {
                    setIsFocused(true)
                  }}
                  onBlur={e => {
                    setIsFocused(false)
                    field.onBlur()
                    // If empty on blur, set back to 0
                    if (e.target.value === '') {
                      field.onChange(0)
                    }
                  }}
                  data-testid="inventory-value-input"
                />
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem className="gba:w-full gba:min-w-0">
              <Label htmlFor="currency" data-testid="currency-label">
                {t('equipment-registration-currency')} *
              </Label>
              <FormControl>
                <Combobox
                  className="gba:[&&]:h-auto gba:w-full"
                  options={currencyComboboxOptions}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={currencyFieldsLoading}
                  loading={currencyFieldsLoading}
                  placeholder={
                    currencyFieldsLoading
                      ? t('equipment-registration-loading')
                      : t('equipment-registration-select-currency')
                  }
                  searchPlaceholder={t('equipment-registration-search-currency')}
                  emptyText={t('equipment-registration-no-currencies-found')}
                  loadingText={t('equipment-registration-loading')}
                  data-testid="currency-select"
                  align="start"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {isEditMode &&
        (() => {
          const currentStatus = form.watch('status') || existingAsset?.assetStatus
          const isAllocated = !!currentAllocation
          const isInRepair = currentStatus === AssetStatus.UNDER_REPAIR
          const isPending = currentStatus === AssetStatus.PENDING

          // Determine available status options based on current state
          const availableStatuses: AssetStatus[] = []

          if (isPending) {
            availableStatuses.push(AssetStatus.PENDING)
          }

          // Can always set to "In Repair" if status is "Available" or "Allocated"
          if (currentStatus === AssetStatus.AVAILABLE || currentStatus === AssetStatus.ALLOCATED) {
            availableStatuses.push(AssetStatus.UNDER_REPAIR)
          }

          // If currently "In Repair":
          if (isInRepair) {
            if (isAllocated) {
              // If allocated and in repair, can change to "Allocated"
              availableStatuses.push(AssetStatus.ALLOCATED)
            } else {
              // If not allocated and in repair, can change to "Available"
              availableStatuses.push(AssetStatus.AVAILABLE)
            }
          }

          // Always include current status
          if (currentStatus && !availableStatuses.includes(currentStatus)) {
            availableStatuses.push(currentStatus)
          }

          return (
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="gba:w-full">
                  <Label htmlFor="status" data-testid="status-label">
                    {t('equipment-registration-status')} *
                  </Label>
                  <FullWidthSelect
                    id="status"
                    data-testid="status-select"
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isPending}
                    placeholder={t('equipment-registration-select-status')}
                  >
                    {availableStatuses.includes(AssetStatus.PENDING) && (
                      <SelectItem value={AssetStatus.PENDING} data-testid="status-pending">
                        {t('equipment-registration-status-pending')}
                      </SelectItem>
                    )}
                    {availableStatuses.includes(AssetStatus.AVAILABLE) && (
                      <SelectItem value={AssetStatus.AVAILABLE} data-testid="status-available">
                        {t('equipment-registration-status-available')}
                      </SelectItem>
                    )}
                    {availableStatuses.includes(AssetStatus.ALLOCATED) && (
                      <SelectItem value={AssetStatus.ALLOCATED} data-testid="status-allocated">
                        {t('equipment-registration-status-allocated')}
                      </SelectItem>
                    )}
                    {availableStatuses.includes(AssetStatus.UNDER_REPAIR) && (
                      <SelectItem value={AssetStatus.UNDER_REPAIR} data-testid="status-under-repair">
                        {t('equipment-registration-status-in-repair')}
                      </SelectItem>
                    )}
                  </FullWidthSelect>
                </FormItem>
              )}
            />
          )
        })()}

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="notes" data-testid="notes-label">
              {t('equipment-registration-notes')}
            </Label>
            <Textarea
              id="notes"
              placeholder={t('equipment-registration-notes-placeholder')}
              className="gba:min-h-[80px] gba:w-full"
              value={field.value || ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              data-testid="notes-textarea"
            />
          </FormItem>
        )}
      />
    </div>
  )

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
      data-testid="equipment-registration-container"
    >
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='equipment-registration-form']]:!py-0"
        data-testid="equipment-registration-form-content"
      >
        {isEditMode ? (
          <AppActionForm
            processType="update"
            form={form as any}
            formData={defaultValues}
            submitEventType="pse_submit"
            cancelEventType="pse_abort"
            submitButtonTestId="edit-equipment-submit-button"
            cancelButtonTestId="edit-equipment-cancel-button"
            isSubmitDisabled={isSubmitDisabled}
            submitButtonText={updateButtonText}
            cancelButtonText={cancelButtonText}
            onSubmit={handleEditSubmit}
            disableFormSubmission={true}
            customActions={
              <div className="gba:flex gba:justify-end gba:gap-2 gba:items-center gba:mt-auto gba:pt-4">
                <Button
                  variant="outline"
                  data-testid="edit-equipment-cancel-button"
                  type="button"
                  onClick={() => {
                    dispatchProcessContinueEvent('pse_abort', {})
                  }}
                >
                  {cancelButtonText}
                </Button>
                <Button
                  data-testid="edit-equipment-submit-button"
                  type="button"
                  variant="default"
                  disabled={isSubmitDisabled}
                  onClick={async () => {
                    if (isSubmitting) return
                    const isValid = await form.trigger()
                    if (!isValid) {
                      return
                    }
                    setIsSubmitting(true)
                    try {
                      const values = form.getValues()
                      const result = await handleEditSubmit(values)

                      window.dispatchEvent(
                        new CustomEvent('com.newwork.process.processCompletion', {
                          detail: {
                            resolution: 'success',
                            processName: 'updateAsset',
                            domain: 'employee',
                            response: result
                          }
                        })
                      )

                      if (additionalData?.onSuccess) {
                        additionalData.onSuccess()
                      }
                    } catch (error) {
                      setIsSubmitting(false)
                      throw error
                    }
                  }}
                >
                  {updateButtonText}
                </Button>
              </div>
            }
            onProcessCompletion={() => {}}
            data-testid="equipment-registration-form"
          >
            <Form {...(form as any)}>{formFields}</Form>
          </AppActionForm>
        ) : (
          <AppActionForm
            processType="create"
            form={form as any}
            formData={defaultValues}
            submitEventType="pse_submit"
            cancelEventType="pse_abort"
            submitButtonTestId="register-equipment-submit-button"
            cancelButtonTestId="register-equipment-cancel-button"
            isSubmitDisabled={isSubmitDisabled}
            submitButtonText={registerButtonText}
            cancelButtonText={cancelButtonText}
            onSubmit={handleCreateSubmit}
            disableFormSubmission={true}
            customActions={
              <div className="gba:flex gba:justify-end gba:gap-2 gba:items-center gba:mt-auto gba:pt-4">
                <Button
                  variant="outline"
                  data-testid="register-equipment-cancel-button"
                  type="button"
                  onClick={() => {
                    dispatchProcessContinueEvent('pse_abort', {})
                  }}
                >
                  {cancelButtonText}
                </Button>
                <Button
                  data-testid="register-equipment-submit-button"
                  type="button"
                  variant="default"
                  disabled={isSubmitDisabled}
                  onClick={async () => {
                    if (isSubmitting) return
                    const isValid = await form.trigger()
                    if (!isValid) {
                      return
                    }
                    setIsSubmitting(true)
                    try {
                      const values = form.getValues()
                      const result = await handleCreateSubmit(values)
                      dispatchProcessContinueEvent('pse_submit', result)

                      window.dispatchEvent(
                        new CustomEvent('com.newwork.process.processCompletion', {
                          detail: {
                            resolution: 'success',
                            processName: 'createAsset',
                            domain: 'employee',
                            response: result
                          }
                        })
                      )

                      if (additionalData?.onSuccess) {
                        additionalData.onSuccess()
                      }
                    } catch (error) {
                      setIsSubmitting(false)
                      throw error
                    }
                  }}
                >
                  {registerButtonText}
                </Button>
              </div>
            }
            data-testid="equipment-registration-form"
          >
            <Form {...(form as any)}>{formFields}</Form>
          </AppActionForm>
        )}
      </div>
    </div>
  )
}

export const EquipmentRegistration: React.FC<BusinessAppContextProps> = context => {
  const locale = useMemo(() => getCurrentActiveUserLocale() as SupportedLocale, [])

  return (
    <LocalizationProvider locale={locale}>
      <EquipmentRegistrationContent {...context} />
    </LocalizationProvider>
  )
}

export default EquipmentRegistration
