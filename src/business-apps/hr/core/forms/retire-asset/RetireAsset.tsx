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
  Textarea,
  RadioGroup,
  RadioGroupItem,
  useTranslation
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { AssetProcessClient, UpdateAssetPayload } from '../../apps/assets/services/AssetProcessClient'
import { AssetStatus } from '../../apps/assets/types'
import { useAssetService } from '../../apps/assets/services/useAssetService'
import { useAssetFormData } from '../return-asset/hooks/useAssetFormData'
import { useAssetVersion } from '../return-asset/hooks/useAssetVersion'
import { dispatchProcessCompletionEvents } from '../return-asset/utils/processEventUtils'
import { useDisposalOutcomeCatalog } from './hooks/useDisposalOutcomeCatalog'
import { useSanitizationMethodCatalog } from './hooks/useSanitizationMethodCatalog'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import translations from './_i18n'

type FormValues = {
  disposalOutcomeRef: string
  disposalDate: string
  responsibleEmployee: string
  disposalReason: string
  requireSanitization: 'yes' | 'no'
  sanitizationMethod?: string
  sanitizationExecutionDate?: string
  performedBy?: string
}

const RetireAssetContent: React.FC<BusinessAppContextProps> = context => {
  const { additionalData, accessToken, userInfo } = context
  const { t } = useTranslation(translations)
  const { assetId, existingAsset, assetVersion, assetDisplayName } = useAssetFormData(additionalData)
  const { resolveAssetVersion } = useAssetVersion(context, {
    assetId,
    existingAsset,
    fallbackVersion: assetVersion
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [labelsReady, setLabelsReady] = useState(false)

  useEffect(() => {
    setLabelsReady(true)
  }, [])

  const defaultResponsibleEmployee = userInfo?.employeeDetails?.employeeId ?? ''
  const defaultResponsibleDisplayName =
    userInfo?.employeeDetails?.firstName || userInfo?.employeeDetails?.lastName
      ? `${userInfo.employeeDetails.firstName ?? ''} ${userInfo.employeeDetails.lastName ?? ''}`.trim()
      : t('current-user')

  const formSchema = useMemo(
    () =>
      z
        .object({
          disposalOutcomeRef: z.string().min(1, t('disposal-outcome-required')),
          disposalDate: z.string().min(1, t('disposal-date-required')),
          responsibleEmployee: z.string().min(1, t('responsible-person-required')),
          disposalReason: z.string().optional(),
          requireSanitization: z.enum(['yes', 'no']),
          sanitizationMethod: z.string().optional(),
          sanitizationExecutionDate: z.string().optional(),
          performedBy: z.string().optional()
        })
        .refine(
          data => {
            if (data.requireSanitization !== 'yes') return true
            return (
              !!data.sanitizationMethod?.trim() &&
              !!data.sanitizationExecutionDate?.trim() &&
              !!data.performedBy?.trim()
            )
          },
          { message: t('sanitization-fields-required'), path: ['sanitizationMethod'] }
        ),
    [t]
  )

  const assetProcessClient = useMemo(() => {
    const client = new AssetProcessClient()
    client.setAccessToken(accessToken)
    return client
  }, [accessToken])

  const assetService = useAssetService(context)

  const {
    options: disposalOutcomeOptions,
    isLoading: disposalOutcomeLoading,
    error: disposalOutcomeError
  } = useDisposalOutcomeCatalog(accessToken)
  const {
    options: sanitizationMethodOptions,
    isLoading: sanitizationMethodLoading,
    error: sanitizationMethodError
  } = useSanitizationMethodCatalog(accessToken)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    mode: 'onChange',
    defaultValues: {
      disposalOutcomeRef: '',
      disposalDate: new Date().toISOString().split('T')[0],
      responsibleEmployee: defaultResponsibleEmployee,
      disposalReason: '',
      requireSanitization: 'no',
      sanitizationMethod: '',
      sanitizationExecutionDate: new Date().toISOString().split('T')[0],
      performedBy: defaultResponsibleDisplayName
    }
  })

  useEffect(() => {
    if (defaultResponsibleEmployee) {
      form.setValue('responsibleEmployee', defaultResponsibleEmployee)
    }
    if (defaultResponsibleDisplayName) {
      form.setValue('performedBy', defaultResponsibleDisplayName)
    }
  }, [defaultResponsibleEmployee, defaultResponsibleDisplayName, form])

  const requireSanitization = form.watch('requireSanitization')
  const currentLocale = getCurrentActiveUserLocale()

  const title = useMemo(() => t('retire-asset'), [t, labelsReady])
  const submitButtonText = useMemo(() => t('retire-asset'), [t, labelsReady])
  const cancelButtonText = useMemo(() => t('cancel-button'), [t, labelsReady])

  const isSubmitDisabled = useMemo(
    () =>
      isSubmitting ||
      !form.formState.isValid ||
      !existingAsset ||
      !assetId ||
      disposalOutcomeLoading ||
      sanitizationMethodLoading,
    [isSubmitting, form.formState.isValid, existingAsset, assetId, disposalOutcomeLoading, sanitizationMethodLoading]
  )

  const formFields = (
    <div className="gba:flex-1 gba:space-y-4">
      {existingAsset && (
        <div className="gba:mb-4 gba:p-4 gba:bg-muted gba:rounded-lg">
          <p className="gba:text-sm gba:font-medium">
            {t('asset')}: {assetDisplayName}
          </p>
          <p className="gba:text-xs gba:text-muted-foreground">
            {t('serial-number')}: {existingAsset.serialNumber || t('not-available')}
          </p>
        </div>
      )}

      <div className="gba:mb-4 gba:p-4 gba:bg-muted gba:rounded-lg">
        <Label className="gba:text-muted-foreground">{t('disposal-status')}</Label>
        <p className="gba:text-sm gba:font-medium gba:mt-1">{t('status-retired')}</p>
      </div>

      <FormField
        control={form.control}
        name="disposalOutcomeRef"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="disposalOutcomeRef" data-testid="disposal-outcome-label">
              {t('final-disposal-outcome')} *
            </Label>
            <Select onValueChange={field.onChange} value={field.value} disabled={disposalOutcomeLoading}>
              <SelectTrigger id="disposalOutcomeRef" data-testid="disposal-outcome-select">
                <SelectValue placeholder={disposalOutcomeLoading ? t('loading') : t('select-disposal-outcome')} />
              </SelectTrigger>
              <SelectContent>
                {disposalOutcomeOptions.length === 0 && !disposalOutcomeLoading ? (
                  <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                    {disposalOutcomeError || t('no-disposal-outcomes')}
                  </div>
                ) : (
                  disposalOutcomeOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.value} data-testid={`disposal-outcome-option-${opt.id}`}>
                      {opt.label}
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
        name="disposalDate"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="disposalDate" data-testid="disposal-date-label">
              {t('disposal-date')} *
            </Label>
            <Input
              id="disposalDate"
              type="date"
              value={field.value || ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              data-testid="disposal-date-input"
            />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="responsibleEmployee"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="responsibleEmployee" data-testid="responsible-person-label">
              {t('responsible-person')} *
            </Label>
            <Input
              id="responsibleEmployee"
              type="text"
              readOnly
              value={defaultResponsibleDisplayName || field.value}
              className="gba:bg-muted"
              data-testid="responsible-person-input"
            />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="disposalReason"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="disposalReason" data-testid="disposal-reason-label">
              {t('disposal-reason')}
            </Label>
            <Textarea
              id="disposalReason"
              placeholder={t('disposal-reason-placeholder')}
              className="gba:min-h-[80px] gba:w-full"
              value={field.value || ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              data-testid="disposal-reason-textarea"
            />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="requireSanitization"
        render={({ field }) => (
          <FormItem>
            <Label data-testid="sanitization-required-label">{t('data-sanitization-required')} *</Label>
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="gba:flex gba:gap-4 gba:mt-2"
              data-testid="sanitization-required-radio"
            >
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="yes" id="sanitization-yes" data-testid="sanitization-yes" />
                <Label htmlFor="sanitization-yes" className="gba:font-normal gba:cursor-pointer">
                  {t('yes')}
                </Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="no" id="sanitization-no" data-testid="sanitization-no" />
                <Label htmlFor="sanitization-no" className="gba:font-normal gba:cursor-pointer">
                  {t('no')}
                </Label>
              </div>
            </RadioGroup>
          </FormItem>
        )}
      />

      {requireSanitization === 'yes' && (
        <>
          <FormField
            control={form.control}
            name="sanitizationMethod"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="sanitizationMethod" data-testid="sanitization-method-label">
                  {t('sanitization-method')} *
                </Label>
                <Select onValueChange={field.onChange} value={field.value} disabled={sanitizationMethodLoading}>
                  <SelectTrigger id="sanitizationMethod" data-testid="sanitization-method-select">
                    <SelectValue placeholder={sanitizationMethodLoading ? t('loading') : t('select-method')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sanitizationMethodOptions.length === 0 && !sanitizationMethodLoading ? (
                      <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                        {sanitizationMethodError || t('no-sanitization-methods')}
                      </div>
                    ) : (
                      sanitizationMethodOptions.map(opt => (
                        <SelectItem key={opt.id} value={opt.value} data-testid={`sanitization-method-option-${opt.id}`}>
                          {opt.label}
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
            name="sanitizationExecutionDate"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="sanitizationExecutionDate" data-testid="sanitization-date-label">
                  {t('sanitization-execution-date')} *
                </Label>
                <Input
                  id="sanitizationExecutionDate"
                  type="date"
                  value={field.value || ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  data-testid="sanitization-execution-date-input"
                />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="performedBy"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="performedBy" data-testid="performed-by-label">
                  {t('performed-by')} *
                </Label>
                <Input
                  id="performedBy"
                  type="text"
                  placeholder={t('performed-by-placeholder')}
                  value={field.value || ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  data-testid="performed-by-input"
                />
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  )

  if (!existingAsset) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
        data-testid="retire-asset-container"
        lang={currentLocale}
      >
        <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
        <div className="gba:p-6 gba:text-destructive">{t('asset-not-found')}</div>
      </div>
    )
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
      data-testid="retire-asset-container"
      lang={currentLocale}
    >
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='retire-asset-form']]:!py-0"
        data-testid="retire-asset-form-content"
      >
        <AppActionForm
          processType="create"
          form={form as any}
          formData={{}}
          onSubmit={async () => ({})}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          submitButtonTestId="retire-asset-submit-button"
          cancelButtonTestId="retire-asset-cancel-button"
          isSubmitDisabled={isSubmitDisabled}
          submitButtonText={submitButtonText}
          cancelButtonText={cancelButtonText}
          disableFormSubmission={true}
          customActions={
            <div className="gba:flex gba:justify-end gba:gap-2 gba:items-center gba:mt-auto gba:pt-4">
              <Button
                variant="outline"
                data-testid="retire-asset-cancel-button"
                type="button"
                onClick={() => dispatchProcessContinueEvent('pse_abort', {})}
              >
                {cancelButtonText}
              </Button>
              <Button
                data-testid="retire-asset-submit-button"
                type="button"
                variant="default"
                disabled={isSubmitDisabled}
                onClick={async () => {
                  if (isSubmitting || !assetId || !existingAsset) return
                  const isValid = await form.trigger()
                  if (!isValid) return

                  if (!accessToken) {
                    console.error('Access token missing')
                    return
                  }

                  setIsSubmitting(true)
                  try {
                    const values = form.getValues()
                    const today = new Date().toISOString().slice(0, 10)

                    const allocations = await assetService.getAllocationsForAsset(assetId)
                    for (const alloc of allocations) {
                      if (!alloc.endDate) {
                        await assetService.deallocateAsset(alloc.id, alloc.version, today)
                      }
                    }

                    const currentAssetVersion = await resolveAssetVersion()

                    const payload: UpdateAssetPayload = {
                      id: assetId,
                      version: currentAssetVersion,
                      model: existingAsset.model,
                      serialNumber: existingAsset.serialNumber,
                      acquisitionDate: existingAsset.acquisitionDate,
                      warrantyPeriodMonths: existingAsset.warrantyPeriodMonths,
                      inventoryValue: existingAsset.inventoryValue ?? 0,
                      assetStatus: AssetStatus.RETIRED,
                      assetBrandRef: existingAsset.assetBrandRef,
                      assetCategoryRef: existingAsset.assetCategoryRef,
                      currencyRef: existingAsset.currencyRef,
                      siteLocation: existingAsset.siteLocationId,
                      notes: existingAsset.notes,
                      disposalStatus: 'RETIRED_DISPOSAL_STATUS',
                      disposalOutcomeRef: values.disposalOutcomeRef,
                      disposalDate: values.disposalDate,
                      disposalReason: values.disposalReason || undefined,
                      responsibleEmployee: values.responsibleEmployee || undefined,
                      requireSanitization: values.requireSanitization === 'yes',
                      sanitizationMethodRef:
                        values.requireSanitization === 'yes' ? values.sanitizationMethod : undefined,
                      sanitizationExecutionDate:
                        values.requireSanitization === 'yes' ? values.sanitizationExecutionDate : undefined,
                      performerEmployee:
                        values.requireSanitization === 'yes'
                          ? values.performedBy === defaultResponsibleDisplayName
                            ? defaultResponsibleEmployee
                            : values.performedBy
                          : undefined
                    }

                    await assetProcessClient.updateAsset(payload)

                    dispatchProcessContinueEvent('pse_submit', {})

                    dispatchProcessCompletionEvents({
                      resolution: 'success',
                      processName: 'updateAsset',
                      domain: 'employee',
                      response: {
                        asset: {
                          id: assetId,
                          version: currentAssetVersion,
                          assetStatus: AssetStatus.RETIRED
                        }
                      }
                    })
                  } catch (error) {
                    console.error('Error retiring asset:', error)
                    setIsSubmitting(false)
                    throw error
                  }
                }}
              >
                {submitButtonText}
              </Button>
            </div>
          }
          data-testid="retire-asset-form"
        >
          <Form {...(form as any)}>{formFields}</Form>
        </AppActionForm>
      </div>
    </div>
  )
}

export const RetireAsset: React.FC<BusinessAppContextProps> = context => {
  return <RetireAssetContent {...context} />
}

export default RetireAsset
