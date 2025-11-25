import React, { useMemo, useEffect, useState } from 'react'
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
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { AssetProcessClient, UpdateEmployeeAssetPayload } from '../../apps/assets/services/AssetProcessClient'
import { AssetStatus } from '../../apps/assets/types'
import { useAssetService } from '../../apps/assets/services/useAssetService'
import { useAssetConditionCatalog } from '../equipment-registration/hooks/useAssetConditionCatalog'
import { useAssetFormData } from './hooks/useAssetFormData'
import { useAssetVersion } from './hooks/useAssetVersion'
import { dispatchProcessCompletionEvents } from './utils/processEventUtils'

type FormValues = {
  endDate: string
  endAssetConditionRef?: string
  notes?: string
}

const ReturnAssetContent: React.FC<BusinessAppContextProps> = (context: BusinessAppContextProps) => {
  const { additionalData } = context
  const { assetId, existingAsset, assetVersion, assetDisplayName } = useAssetFormData(additionalData)
  const { resolveAssetVersion } = useAssetVersion(context, {
    assetId,
    existingAsset,
    fallbackVersion: assetVersion
  })

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [currentAllocation, setCurrentAllocation] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())

  // Track locale changes to ensure translations update
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

  // Create form schema dynamically based on current locale
  const formSchema = useMemo(
    () =>
      z.object({
        endDate: z
          .string()
          .min(
            1,
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.return_date_required', 'Return date is required')
          )
          .refine(
            date => {
              const selectedDate = new Date(date)
              const today = new Date()
              today.setHours(23, 59, 59, 999) // Set to end of today
              return selectedDate <= today
            },
            {
              message: getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_assets.return_date_future',
                'Return date cannot be in the future'
              )
            }
          ),
        endAssetConditionRef: z.string().optional(),
        notes: z.string().optional()
      }),
    [currentLocale]
  )

  const assetProcessClient = useMemo(() => {
    const client = new AssetProcessClient()
    client.setAccessToken(context.accessToken)
    return client
  }, [context.accessToken])

  const assetService = useAssetService(context)
  const { options: conditionOptions, isLoading: conditionsLoading } = useAssetConditionCatalog(context)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      endDate: new Date().toISOString().split('T')[0],
      endAssetConditionRef: '',
      notes: ''
    }
  })

  const title = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.retrieve_asset', 'Retrieve Asset'),
    [currentLocale]
  )

  const returnButtonText = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.retrieve_asset', 'Retrieve Asset'),
    [currentLocale]
  )

  const cancelButtonText = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel'),
    [currentLocale]
  )

  const isSubmitDisabled = useMemo(() => {
    return (
      isSubmitting || isLoading || conditionsLoading || !form.formState.isValid || !existingAsset || !currentAllocation
    )
  }, [isSubmitting, isLoading, conditionsLoading, form.formState.isValid, existingAsset, currentAllocation])

  useEffect(() => {
    const loadData = async () => {
      if (!assetId) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const allocation = await assetService.getCurrentAllocation(assetId)
        if (allocation) {
          setCurrentAllocation(allocation)
        }
      } catch (err) {
        console.error('Error loading allocation data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [assetId, existingAsset, assetService])

  const employeeDisplayName = currentAllocation?.employee
    ? currentAllocation.employee.displayName ||
      `${currentAllocation.employee.firstName} ${currentAllocation.employee.lastName}`.trim()
    : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.employee', 'Employee')

  const formFields = (
    <div className="gba:flex-1 gba:space-y-4">
      {existingAsset && (
        <div className="gba:mb-4 gba:p-4 gba:bg-muted gba:rounded-lg">
          <p className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.asset', 'Asset')}: {assetDisplayName}
          </p>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.serial_number', 'Serial Number')}:{' '}
            {existingAsset.serialNumber || getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
          </p>
        </div>
      )}

      {currentAllocation && (
        <div className="gba:mb-4 gba:p-4 gba:bg-info-secondary gba:rounded-lg">
          <p className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.currently_allocated_to', 'Currently allocated to')}:
          </p>
          <p className="gba:text-sm">{employeeDisplayName}</p>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.since', 'Since')}:{' '}
            {currentAllocation.startDate
              ? new Date(currentAllocation.startDate).toLocaleDateString()
              : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
          </p>
        </div>
      )}

      <FormField
        control={form.control}
        name="endDate"
        render={({ field }) => {
          const today = new Date().toISOString().split('T')[0]
          return (
            <FormItem>
              <Label htmlFor="endDate" data-testid="end-date-label">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.return_date', 'Return Date')} *
              </Label>
              <Input
                id="endDate"
                type="date"
                max={today}
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                readOnly
                disabled
                data-testid="end-date-input"
              />
            </FormItem>
          )
        }}
      />

      <FormField
        control={form.control}
        name="endAssetConditionRef"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="endAssetConditionRef" data-testid="condition-end-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.condition_at_return', 'Condition at Return')}
            </Label>
            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || conditionsLoading}>
              <SelectTrigger id="endAssetConditionRef" data-testid="condition-end-select">
                <SelectValue
                  placeholder={
                    conditionsLoading
                      ? getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.loading_conditions',
                          'Loading conditions...'
                        )
                      : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.select_condition', 'Select condition')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {conditionOptions.length === 0 ? (
                  <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                    {conditionsLoading
                      ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.loading', 'Loading...')
                      : getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.no_conditions_available',
                          'No conditions available'
                        )}
                  </div>
                ) : (
                  conditionOptions.map(condition => (
                    <SelectItem
                      key={condition.id}
                      value={condition.id}
                      data-testid={`condition-option-${condition.id}`}
                    >
                      {condition.label}
                    </SelectItem>
                  ))
                )}
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
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.notes', 'Notes')}
            </Label>
            <Textarea
              id="notes"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_assets.return_notes_placeholder',
                'Any damage, missing accessories, or other observations...'
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

  if (isLoading) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
        data-testid="return-asset-container"
      >
        <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
        <div className="gba:p-6 gba:text-center">
          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.loading', 'Loading...')}
        </div>
      </div>
    )
  }

  if (!existingAsset) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
        data-testid="return-asset-container"
      >
        <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
        <div className="gba:p-6 gba:text-destructive">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:hr_assets.asset_not_found',
            'Asset not found. Please try again.'
          )}
        </div>
      </div>
    )
  }

  if (!currentAllocation) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
        data-testid="return-asset-container"
      >
        <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
        <div className="gba:p-6 gba:text-warning">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:hr_assets.asset_not_allocated',
            'This asset is not currently allocated to any employee.'
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full" data-testid="return-asset-container">
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='return-asset-form']]:!py-0"
        data-testid="return-asset-form-content"
      >
        <AppActionForm
          processType="create"
          form={form as any}
          formData={{}}
          onSubmit={async () => ({})}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          submitButtonTestId="return-asset-submit-button"
          cancelButtonTestId="return-asset-cancel-button"
          isSubmitDisabled={isSubmitDisabled}
          submitButtonText={returnButtonText}
          cancelButtonText={cancelButtonText}
          disableFormSubmission={true}
          customActions={
            <div className="gba:flex gba:justify-end gba:gap-2 gba:items-center gba:mt-auto gba:pt-4">
              <Button
                variant="outline"
                data-testid="return-asset-cancel-button"
                type="button"
                onClick={() => {
                  dispatchProcessContinueEvent('pse_abort', {})
                }}
              >
                {cancelButtonText}
              </Button>
              <Button
                data-testid="return-asset-submit-button"
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

                    if (!assetId) {
                      throw new Error(
                        getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.asset_id_required',
                          'Asset ID is required'
                        )
                      )
                    }

                    if (!currentAllocation?.id) {
                      throw new Error(
                        getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.allocation_id_required',
                          'Current allocation ID is required'
                        )
                      )
                    }

                    const currentAssetVersion = await resolveAssetVersion()

                    const updateEmployeeAssetPayload: UpdateEmployeeAssetPayload = {
                      id: currentAllocation.id,
                      version: currentAllocation.version,
                      startDate: currentAllocation.startDate,
                      expectedEndDate: currentAllocation.expectedEndDate,
                      endDate: values.endDate,
                      startAssetConditionRef: currentAllocation.startAssetConditionRef,
                      endAssetConditionRef: values.endAssetConditionRef,
                      notes: values.notes || currentAllocation.notes,
                      employee: currentAllocation.employeeId,
                      asset: assetId
                    }

                    await Promise.all([
                      assetProcessClient.updateEmployeeAsset(updateEmployeeAssetPayload),
                      assetProcessClient.updateAsset({
                        id: assetId,
                        version: currentAssetVersion,
                        assetStatus: AssetStatus.AVAILABLE
                      })
                    ])

                    dispatchProcessContinueEvent('pse_submit', {})

                    dispatchProcessCompletionEvents({
                      resolution: 'success',
                      processName: 'returnAsset',
                      domain: 'employee',
                      response: {
                        employeeAsset: {
                          id: currentAllocation.id,
                          assetId: assetId,
                          employeeId: currentAllocation.employeeId,
                          endDate: values.endDate
                        },
                        asset: {
                          id: assetId,
                          version: currentAssetVersion,
                          assetStatus: AssetStatus.AVAILABLE
                        }
                      }
                    })
                  } catch (error) {
                    console.error('Error returning asset:', error)
                    setIsSubmitting(false)
                    throw error
                  }
                }}
              >
                {returnButtonText}
              </Button>
            </div>
          }
          data-testid="return-asset-form"
        >
          <Form {...(form as any)}>{formFields}</Form>
        </AppActionForm>
      </div>
    </div>
  )
}

export const ReturnAsset: React.FC<BusinessAppContextProps> = context => {
  return <ReturnAssetContent {...context} />
}

export default ReturnAsset
