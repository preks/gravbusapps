import React, { useMemo, useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Form,
  FormField,
  FormItem,
  Label,
  Input,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  DateInput
} from '@newwork/nw-design-system'
import { useForm, UseFormReturn, Control } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useCurrencyCatalog } from './hooks/useCurrencyCatalog'
import { useAssetsCatalog } from './hooks/useAssetsCatalog'
import { useBrandsCatalog } from './hooks/useBrandsCatalog'
import { useSiteLocations } from './hooks/useSiteLocations'
import { AssetProcessClient } from '../../apps/assets/services/AssetProcessClient'
import { useAssetService } from '../../apps/assets/services/useAssetService'
import { AssetStatus } from '../../apps/assets/types'

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

type SerialNumberFieldProps = {
  form: UseFormReturn<FormValues>
  control: Control<FormValues>
  isEditMode: boolean
  assetId: string | null
  getAssets: (variables: { where?: { _and: unknown[] }; limit?: number }) => Promise<{ assets: unknown[] }>
}

const SerialNumberField: React.FC<SerialNumberFieldProps> = ({ form, control, isEditMode, assetId, getAssets }) => {
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
          const errorMsg = getTranslationFromI18nKeyAndLabel(
            'lowcoder:hr_assets.serial_number_duplicate',
            'A serial number with this combination of category and producer already exists'
          )
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
    [form, getAssets, isEditMode, assetId]
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
          <FormItem>
            <Label htmlFor="serialNumber" data-testid="serial-number-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.serial_number', 'Serial Number')}
            </Label>
            <Input
              id="serialNumber"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_assets.serial_number_placeholder',
                'Unique serial number'
              )}
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

  const { options: currencyOptions, isLoading: currenciesLoading } = useCurrencyCatalog(context)
  const { options: assetOptions, isLoading: assetsLoading } = useAssetsCatalog(context)
  const { options: brandOptions, isLoading: brandsLoading } = useBrandsCatalog(context)
  const { options: locationOptions, isLoading: locationsLoading } = useSiteLocations(context)
  const { getAssetById, getAssets, getCurrentAllocation } = useAssetService(context)

  const [currentAllocation, setCurrentAllocation] = React.useState<any>(null)

  const assetProcessClient = useMemo(() => {
    const client = new AssetProcessClient()
    client.setAccessToken(context.accessToken)
    return client
  }, [context.accessToken])

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())

  useEffect(() => {
    const checkLocale = () => {
      const newLocale = getCurrentActiveUserLocale()
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale)
      }
    }

    checkLocale()
    const interval = setInterval(checkLocale, 500)
    return () => clearInterval(interval)
  }, [currentLocale])

  const formSchema = useMemo(
    () =>
      z.object({
        category: z
          .string()
          .min(
            1,
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.please_select_category', 'Please select a category')
          ),
        brand: z
          .string()
          .min(1, getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.please_select_brand', 'Please select a brand')),
        model: z
          .string()
          .min(
            2,
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_assets.model_min_length',
              'Model must be at least 2 characters'
            )
          ),
        serialNumber: z
          .string()
          .transform(s => (s ?? '').trim())
          .refine(
            val => val.length === 0 || val.length >= 3,
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_assets.serial_number_min_length',
              'Serial number must be at least 3 characters'
            )
          ),
        location: z.string().optional(),
        acquisitionDate: z.string().optional(),
        warrantyPeriodMonths: z
          .number()
          .min(
            0,
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_assets.warranty_period_min',
              'Warranty period must be 0 or greater'
            )
          ),
        inventoryValue: z
          .number()
          .min(
            0,
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_assets.inventory_value_min',
              'Inventory value must be 0 or greater'
            )
          ),
        currency: z
          .string()
          .min(1, getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.currency_required', 'Currency is required')),
        status: z.nativeEnum(AssetStatus),
        notes: z.string().optional()
      }),
    [currentLocale]
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      category: '',
      brand: '',
      model: '',
      serialNumber: '',
      location: '',
      acquisitionDate: '',
      warrantyPeriodMonths: 0,
      inventoryValue: 0,
      currency: '',
      status: AssetStatus.AVAILABLE,
      notes: ''
    }
  })

  React.useEffect(() => {
    const loadAsset = async () => {
      if (isEditMode && assetId && !existingAsset) {
        try {
          const asset = await getAssetById(assetId)
          if (asset) {
            form.reset({
              category: asset.assetCategoryRef || '',
              brand: asset.assetBrandRef || '',
              model: asset.model || '',
              serialNumber: asset.serialNumber || '',
              location: asset.siteLocationId || '',
              acquisitionDate: asset.acquisitionDate || '',
              warrantyPeriodMonths: asset.warrantyPeriodMonths,
              inventoryValue: asset.inventoryValue,
              currency: asset.currencyRef || '',
              status: asset.assetStatus || AssetStatus.AVAILABLE,
              notes: asset.notes || ''
            })

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
        form.reset({
          category: existingAsset.assetCategoryRef || '',
          brand: existingAsset.assetBrandRef || '',
          model: existingAsset.model || '',
          serialNumber: existingAsset.serialNumber || '',
          location: existingAsset.siteLocationId || '',
          acquisitionDate: existingAsset.acquisitionDate || '',
          warrantyPeriodMonths: existingAsset.warrantyPeriodMonths,
          inventoryValue: existingAsset.inventoryValue,
          currency: existingAsset.currencyRef || '',
          status: existingAsset.assetStatus || AssetStatus.AVAILABLE,
          notes: existingAsset.notes || ''
        })

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

  const defaultValues: FormValues = useMemo(
    () => ({
      category: existingAsset?.assetCategoryRef || '',
      brand: existingAsset?.assetBrandRef || '',
      model: existingAsset?.model || '',
      serialNumber: existingAsset?.serialNumber || '',
      location: existingAsset?.siteLocationId || '',
      acquisitionDate: existingAsset?.acquisitionDate || '',
      warrantyPeriodMonths: existingAsset?.warrantyPeriodMonths || 0,
      inventoryValue: existingAsset?.inventoryValue || 0,
      currency: existingAsset?.currencyRef || '',
      status: existingAsset?.assetStatus || AssetStatus.AVAILABLE,
      notes: existingAsset?.notes || ''
    }),
    [existingAsset]
  )

  const title = useMemo(
    () =>
      isEditMode
        ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.update_equipment', 'Update Equipment')
        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.register_equipment_form', 'Register Equipment'),
    [isEditMode, currentLocale]
  )

  // Memoize button texts with locale dependency
  const updateButtonText = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.update_equipment', 'Update Equipment'),
    [currentLocale]
  )

  const registerButtonText = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.register_equipment', 'Register Equipment'),
    [currentLocale]
  )

  const cancelButtonText = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel'),
    [currentLocale]
  )

  const isSubmitDisabled = useMemo(() => {
    return (
      isSubmitting || currenciesLoading || assetsLoading || brandsLoading || locationsLoading || !form.formState.isValid
    )
  }, [isSubmitting, currenciesLoading, assetsLoading, brandsLoading, locationsLoading, form.formState.isValid])

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
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_assets.asset_id_required_editing',
          'Asset ID is required for editing'
        )
      )
    }

    if (assetVersion === undefined || assetVersion === null) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_assets.asset_version_required',
          'Asset version is required for editing. Please ensure the asset is loaded correctly.'
        )
      )
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
    <div className="gba:flex-1 gba:space-y-4">
      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="category" data-testid="category-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.category', 'Category')} *
            </Label>
            <Select onValueChange={field.onChange} value={field.value} disabled={assetsLoading || isEditMode}>
              <SelectTrigger id="category" data-testid="category-select">
                <SelectValue
                  placeholder={
                    assetsLoading
                      ? getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.loading_categories',
                          'Loading categories...'
                        )
                      : getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.select_equipment_category',
                          'Select equipment category'
                        )
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {assetOptions.map(asset => (
                  <SelectItem key={asset.id} value={asset.value} data-testid={`category-option-${asset.code}`}>
                    {asset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="brand" data-testid="brand-label">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.producer', 'Producer')} *
              </Label>
              <Select onValueChange={field.onChange} value={field.value} disabled={brandsLoading || isEditMode}>
                <SelectTrigger id="brand" data-testid="brand-select">
                  <SelectValue
                    placeholder={
                      brandsLoading
                        ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.loading_brands', 'Loading brands...')
                        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.select_brand', 'Select brand')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {brandOptions.map(brand => (
                    <SelectItem key={brand.id} value={brand.id} data-testid={`brand-option-${brand.code}`}>
                      {brand.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="model" data-testid="model-label">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.model', 'Model')} *
              </Label>
              <Input
                id="model"
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:hr_assets.model_placeholder',
                  'e.g., MacBook Pro 14'
                )}
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
      />

      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="location" data-testid="location-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.location', 'Location')}
            </Label>
            <Select onValueChange={field.onChange} value={field.value} disabled={locationsLoading || isEditMode}>
              <SelectTrigger id="location" data-testid="location-select">
                <SelectValue
                  placeholder={
                    locationsLoading
                      ? getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.loading_locations',
                          'Loading locations...'
                        )
                      : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.select_location', 'Select location')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map(location => (
                  <SelectItem key={location.id} value={location.value} data-testid={`location-option-${location.code}`}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name="acquisitionDate"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="acquisitionDate" data-testid="acquisition-date-label">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.acquisition_date', 'Acquisition Date')}
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
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
                  'Please Select'
                )}
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
              <FormItem>
                <Label htmlFor="warrantyPeriodMonths" data-testid="warranty-period-label">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.warranty_months', 'Warranty (months)')}
                </Label>
                <Input
                  id="warrantyPeriodMonths"
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

      <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:items-start">
        <FormField
          control={form.control}
          name="inventoryValue"
          render={({ field }) => {
            const [isFocused, setIsFocused] = React.useState(false)
            // Show empty string when focused and value is 0, otherwise show the actual value
            const displayValue = isFocused && field.value === 0 ? '' : (field.value ?? '')

            return (
              <FormItem>
                <Label htmlFor="inventoryValue" data-testid="inventory-value-label">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.inventory_value', 'Inventory Value')} *
                </Label>
                <Input
                  id="inventoryValue"
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
            <FormItem>
              <Label htmlFor="currency" data-testid="currency-label">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.currency', 'Currency')} *
              </Label>
              <Select onValueChange={field.onChange} value={field.value} disabled={currenciesLoading}>
                <SelectTrigger id="currency" data-testid="currency-select">
                  <SelectValue
                    placeholder={
                      currenciesLoading
                        ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.loading', 'Loading...')
                        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.select_currency', 'Select currency')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map(currency => (
                    <SelectItem
                      key={currency.id}
                      value={currency.value}
                      data-testid={`currency-option-${currency.name}`}
                    >
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>

      {isEditMode &&
        (() => {
          const currentStatus = form.watch('status') || existingAsset?.assetStatus
          const isAllocated = !!currentAllocation
          const isInRepair = currentStatus === AssetStatus.UNDER_REPAIR

          // Determine available status options based on current state
          const availableStatuses: AssetStatus[] = []

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
                <FormItem>
                  <Label htmlFor="status" data-testid="status-label">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status', 'Status')} *
                  </Label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="status" data-testid="status-select">
                      <SelectValue
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.select_status',
                          'Select status'
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.includes(AssetStatus.AVAILABLE) && (
                        <SelectItem value={AssetStatus.AVAILABLE} data-testid="status-available">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_available', 'Available')}
                        </SelectItem>
                      )}
                      {availableStatuses.includes(AssetStatus.ALLOCATED) && (
                        <SelectItem value={AssetStatus.ALLOCATED} data-testid="status-allocated">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_allocated', 'Allocated')}
                        </SelectItem>
                      )}
                      {availableStatuses.includes(AssetStatus.UNDER_REPAIR) && (
                        <SelectItem value={AssetStatus.UNDER_REPAIR} data-testid="status-under-repair">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_in_repair', 'In Repair')}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
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
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.notes', 'Notes')}
            </Label>
            <Textarea
              id="notes"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_assets.equipment_notes_placeholder',
                'Additional information about this equipment...'
              )}
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
  return <EquipmentRegistrationContent {...context} />
}

export default EquipmentRegistration
