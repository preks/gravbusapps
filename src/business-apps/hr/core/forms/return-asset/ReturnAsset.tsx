import React, { useMemo, useEffect } from 'react'
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
import { AssetProcessClient, UpdateEmployeeAssetPayload } from '../../apps/assets/services/AssetProcessClient'
import { AssetStatus } from '../../apps/assets/types'
import { useAssetService } from '../../apps/assets/services/useAssetService'
import { useAssetConditionCatalog } from '../equipment-registration/hooks/useAssetConditionCatalog'

const formSchema = z.object({
  endDate: z.string().min(1, 'Return date is required'),
  endAssetConditionRef: z.string().optional(),
  notes: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

const ReturnAssetContent: React.FC<BusinessAppContextProps> = (context: BusinessAppContextProps) => {
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

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [asset, setAsset] = React.useState(existingAsset)
  const [currentAllocation, setCurrentAllocation] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)

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
    () => getTranslationFromI18nKeyAndLabel('lowcoder:equipment.return_asset_form', 'Return Asset'),
    []
  )

  const isSubmitDisabled = useMemo(() => {
    return isSubmitting || isLoading || conditionsLoading || !form.formState.isValid || !asset || !currentAllocation
  }, [isSubmitting, isLoading, conditionsLoading, form.formState.isValid, asset, currentAllocation])

  useEffect(() => {
    const loadData = async () => {
      if (!assetId) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        let assetData = existingAsset

        if (!assetData) {
          assetData = await assetService.getAssetById(assetId)
        }

        if (assetData) {
          setAsset(assetData)
        }

        const allocation = await assetService.getCurrentAllocation(assetId)
        if (allocation) {
          setCurrentAllocation(allocation)
        }
      } catch (err) {
        console.error('Error loading asset data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [assetId, existingAsset, assetService])

  const assetDisplayName = asset ? `${asset.assetBrand?.value || ''} ${asset.model || ''}`.trim() : 'Asset'

  const employeeDisplayName = currentAllocation?.employee
    ? currentAllocation.employee.displayName ||
      `${currentAllocation.employee.firstName} ${currentAllocation.employee.lastName}`.trim()
    : 'Employee'

  const formFields = (
    <div className="gba:flex-1 gba:space-y-4">
      {asset && (
        <div className="gba:mb-4 gba:p-4 gba:bg-muted gba:rounded-lg">
          <p className="gba:text-sm gba:font-medium">Asset: {assetDisplayName}</p>
          <p className="gba:text-xs gba:text-muted-foreground">Serial: {asset.serialNumber || 'N/A'}</p>
        </div>
      )}

      {currentAllocation && (
        <div className="gba:mb-4 gba:p-4 gba:bg-info-secondary gba:rounded-lg">
          <p className="gba:text-sm gba:font-medium">Currently allocated to:</p>
          <p className="gba:text-sm">{employeeDisplayName}</p>
          <p className="gba:text-xs gba:text-muted-foreground">
            Since: {currentAllocation.startDate ? new Date(currentAllocation.startDate).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      )}

      <FormField
        control={form.control}
        name="endDate"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="endDate" data-testid="end-date-label">
              Return Date *
            </Label>
            <Input
              id="endDate"
              type="date"
              value={field.value || ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              data-testid="end-date-input"
            />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="endAssetConditionRef"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="endAssetConditionRef" data-testid="condition-end-label">
              Condition at Return
            </Label>
            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || conditionsLoading}>
              <SelectTrigger id="endAssetConditionRef" data-testid="condition-end-select">
                <SelectValue placeholder={conditionsLoading ? 'Loading conditions...' : 'Select condition'} />
              </SelectTrigger>
              <SelectContent>
                {conditionOptions.length === 0 ? (
                  <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                    {conditionsLoading ? 'Loading...' : 'No conditions available'}
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
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any damage, missing accessories, or other observations..."
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
        <div className="gba:p-6 gba:text-center">Loading...</div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
        data-testid="return-asset-container"
      >
        <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
        <div className="gba:p-6 gba:text-destructive">Asset not found. Please try again.</div>
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
        <div className="gba:p-6 gba:text-warning">This asset is not currently allocated to any employee.</div>
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
          submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:equipment.return_asset', 'Return Asset')}
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.initiate_cancel_button',
            'Cancel'
          )}
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
                {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
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
                      throw new Error('Asset ID is required')
                    }

                    if (!currentAllocation?.id) {
                      throw new Error('Current allocation ID is required')
                    }

                    let currentAssetVersion: number | null = null

                    if (existingAsset?.version !== undefined && existingAsset.version !== null) {
                      currentAssetVersion = existingAsset.version
                    } else {
                      try {
                        const currentAsset = await assetService.getAssetById(assetId)
                        if (currentAsset?.version !== undefined) {
                          currentAssetVersion = currentAsset.version
                        }
                      } catch (error) {
                        console.error('Error fetching asset version from API:', error)
                      }
                    }

                    if (currentAssetVersion === null && assetVersion !== 0 && assetVersion !== undefined) {
                      currentAssetVersion = assetVersion
                    }

                    if (currentAssetVersion === null || currentAssetVersion === undefined) {
                      throw new Error(
                        `Cannot update asset: version is required but not available. Asset ID: ${assetId}`
                      )
                    }

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

                    const completionPayload = {
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
                  } catch (error) {
                    console.error('Error returning asset:', error)
                    setIsSubmitting(false)
                    throw error
                  }
                }}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:equipment.return_asset', 'Return Asset')}
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
