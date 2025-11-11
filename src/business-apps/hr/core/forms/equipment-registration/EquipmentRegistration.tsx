import React, { useMemo } from 'react'
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
  Textarea
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
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

const formSchema = z.object({
  category: z.string().min(1, 'Please select a category'),
  brand: z.string().min(1, 'Please select a brand'),
  model: z.string().min(2, 'Model must be at least 2 characters'),
  serialNumber: z.string().min(3, 'Serial number must be at least 3 characters'),
  location: z.string().optional(),
  acquisitionDate: z.string().min(1, 'Acquisition date is required'),
  warrantyPeriodMonths: z
    .number()
    .min(0, 'Warranty period must be 0 or greater')
    .max(120, 'Warranty period cannot exceed 120 months'),
  inventoryValue: z.number().min(0, 'Inventory value must be 0 or greater'),
  currency: z.string().min(1, 'Currency is required'),
  status: z.nativeEnum(AssetStatus),
  notes: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

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
  const { getAssetById } = useAssetService(context)

  const assetProcessClient = useMemo(() => {
    const client = new AssetProcessClient()
    client.setAccessToken(context.accessToken)
    return client
  }, [context.accessToken])

  const [isSubmitting, setIsSubmitting] = React.useState(false)

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
      }
    }

    loadAsset()
  }, [isEditMode, assetId, existingAsset, getAssetById, form])

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
        ? getTranslationFromI18nKeyAndLabel('lowcoder:equipment.edit_equipment_form', 'Edit Equipment')
        : getTranslationFromI18nKeyAndLabel('lowcoder:equipment.register_equipment_form', 'Register Equipment'),
    [isEditMode]
  )

  const isSubmitDisabled = useMemo(() => {
    return (
      isSubmitting || currenciesLoading || assetsLoading || brandsLoading || locationsLoading || !form.formState.isValid
    )
  }, [isSubmitting, currenciesLoading, assetsLoading, brandsLoading, locationsLoading, form.formState.isValid])

  const handleCreateSubmit = async (values: FormValues) => {
    try {
      const siteLocation = values.location && values.location.trim() !== '' ? values.location.trim() : undefined

      const response = await assetProcessClient.createAsset({
        model: values.model,
        serialNumber: values.serialNumber,
        acquisitionDate: values.acquisitionDate,
        warrantyPeriodMonths: values.warrantyPeriodMonths,
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
          serialNumber: values.serialNumber
        }
      }
    } catch (error) {
      console.error('Error creating asset:', error)
      throw error
    }
  }

  const handleEditSubmit = async (values: FormValues) => {
    if (!assetId) {
      throw new Error('Asset ID is required for editing')
    }

    if (assetVersion === undefined || assetVersion === null) {
      throw new Error('Asset version is required for editing. Please ensure the asset is loaded correctly.')
    }

    try {
      const siteLocation = values.location && values.location.trim() !== '' ? values.location.trim() : undefined

      await assetProcessClient.updateAsset({
        id: assetId,
        version: assetVersion,
        model: values.model,
        serialNumber: values.serialNumber,
        acquisitionDate: values.acquisitionDate,
        warrantyPeriodMonths: values.warrantyPeriodMonths,
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
            serialNumber: values.serialNumber
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
              Category *
            </Label>
            <Select onValueChange={field.onChange} value={field.value} disabled={assetsLoading || isEditMode}>
              <SelectTrigger id="category" data-testid="category-select">
                <SelectValue placeholder={assetsLoading ? 'Loading categories...' : 'Select equipment category'} />
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
                Brand *
              </Label>
              <Select onValueChange={field.onChange} value={field.value} disabled={brandsLoading || isEditMode}>
                <SelectTrigger id="brand" data-testid="brand-select">
                  <SelectValue placeholder={brandsLoading ? 'Loading brands...' : 'Select brand'} />
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
                Model *
              </Label>
              <Input
                id="model"
                placeholder="e.g., MacBook Pro 14"
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                data-testid="model-input"
              />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="serialNumber"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="serialNumber" data-testid="serial-number-label">
              Serial Number *
            </Label>
            <Input
              id="serialNumber"
              placeholder="Unique serial number"
              value={field.value || ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              data-testid="serial-number-input"
              className="gba:font-mono"
              disabled={isEditMode}
            />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="location" data-testid="location-label">
              Location
            </Label>
            <Select onValueChange={field.onChange} value={field.value} disabled={locationsLoading || isEditMode}>
              <SelectTrigger id="location" data-testid="location-select">
                <SelectValue placeholder={locationsLoading ? 'Loading locations...' : 'Select location'} />
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
                Acquisition Date *
              </Label>
              <Input
                id="acquisitionDate"
                type="date"
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                data-testid="acquisition-date-input"
                disabled={isEditMode}
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="warrantyPeriodMonths"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="warrantyPeriodMonths" data-testid="warranty-period-label">
                Warranty (months) *
              </Label>
              <Input
                id="warrantyPeriodMonths"
                type="number"
                min="0"
                max="120"
                value={field.value ?? ''}
                onChange={e => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0
                  field.onChange(value)
                }}
                onBlur={field.onBlur}
                data-testid="warranty-period-input"
              />
            </FormItem>
          )}
        />
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:items-start">
        <FormField
          control={form.control}
          name="inventoryValue"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="inventoryValue" data-testid="inventory-value-label">
                Inventory Value *
              </Label>
              <Input
                id="inventoryValue"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={field.value ?? ''}
                onChange={e => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                  field.onChange(value)
                }}
                onBlur={field.onBlur}
                data-testid="inventory-value-input"
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="currency" data-testid="currency-label">
                Currency *
              </Label>
              <Select onValueChange={field.onChange} value={field.value} disabled={currenciesLoading || isEditMode}>
                <SelectTrigger id="currency" data-testid="currency-select">
                  <SelectValue placeholder={currenciesLoading ? 'Loading...' : 'Select currency'} />
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

      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="status" data-testid="status-label">
              Status *
            </Label>
            <Select onValueChange={field.onChange} value={field.value} disabled={!isEditMode}>
              <SelectTrigger id="status" data-testid="status-select">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AssetStatus.AVAILABLE} data-testid="status-available">
                  Available
                </SelectItem>
                <SelectItem value={AssetStatus.ALLOCATED} data-testid="status-allocated">
                  Allocated
                </SelectItem>
                <SelectItem value={AssetStatus.UNDER_REPAIR} data-testid="status-under-repair">
                  In Repair
                </SelectItem>
                <SelectItem value={AssetStatus.RETIRED} data-testid="status-retired">
                  Retired
                </SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="notes" data-testid="notes-label">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Additional information about this equipment..."
              className="gba:min-h-[80px] gba:w-full"
              value={field.value || ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              data-testid="notes-textarea"
              disabled={isEditMode}
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
            submitButtonText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:equipment.update_equipment',
              'Update Equipment'
            )}
            cancelButtonText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.initiate_cancel_button',
              'Cancel'
            )}
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
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.initiate_cancel_button',
                    'Cancel'
                  )}
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
                  {getTranslationFromI18nKeyAndLabel('lowcoder:equipment.update_equipment', 'Update Equipment')}
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
            submitButtonText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:equipment.register_equipment',
              'Register Equipment'
            )}
            cancelButtonText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.initiate_cancel_button',
              'Cancel'
            )}
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
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.initiate_cancel_button',
                    'Cancel'
                  )}
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
                  {getTranslationFromI18nKeyAndLabel('lowcoder:equipment.register_equipment', 'Register Equipment')}
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
