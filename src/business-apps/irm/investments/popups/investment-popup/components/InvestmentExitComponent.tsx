import React, { useEffect } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput,
  Alert,
  Switch
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useInvestmentPopupData } from '../hooks/useInvestmentPopupData'
import { InvestmentPopupFormWrapper } from './InvestmentPopupFormWrapper'
import { InvestmentExitComponentProps, ExitFormData } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads'

const prefixDataTestId = 'investment-exit-component'

// Form validation schema
const exitFormSchema = z.object({
  plannedExit: z.boolean(),
  plannedExitDate: z.string().nullable() // Allow null or string
})

export const InvestmentExitComponent: React.FC<InvestmentExitComponentProps> = ({
  onClose,
  onSave,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Create business app context
  const businessAppContext = {
    accessToken,
    userInfo,
    additionalData
  }

  // Extract investmentId from additionalData
  const investmentId =
    additionalData?.investmentId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId ||
    additionalData?.id

  // Use the hook for data loading (always call hooks first)
  const { investment, loading, error } = useInvestmentPopupData({
    context: businessAppContext,
    investmentId,
    scope: 'exit'
  })

  // Form setup with current planned exit data
  const form = useForm<ExitFormData>({
    resolver: zodResolver(exitFormSchema),
    defaultValues: {
      plannedExit: false,
      plannedExitDate: null
    }
  })

  // Sync form with loaded planned exit data
  useEffect(() => {
    if (investment) {
      const plannedExit = investment.planedExit || false
      const plannedExitDate = investment.plannedExitDate
        ? new Date(investment.plannedExitDate).toISOString().split('T')[0]
        : null

      form.reset({
        plannedExit,
        plannedExitDate
      })
    }
  }, [investment, form])

  // Validate required data after hooks have been called
  if (!investmentId) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-investment-id`}>
        {getTranslationFromI18nKeyAndLabel('investment.exit.error.missingId', 'No investment ID found in context data')}
      </Alert>
    )
  }

  // Handle form submission - create payload for AppActionForm
  const handleSubmit = async (formData: ExitFormData) => {
    if (!investment) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('investment.exit.error.dataNotLoaded', 'Investment data not loaded')
      )
    }

    // Convert date string to ISO format or null
    // If plannedExit is false, set to null
    // If plannedExit is true but no date provided, also set to null (clearing the date)
    const plannedExitDate =
      formData.plannedExit && formData.plannedExitDate && formData.plannedExitDate.trim() !== ''
        ? new Date(formData.plannedExitDate).toISOString()
        : null

    // Create business app context
    const businessAppContext = {
      accessToken,
      userInfo,
      additionalData
    }

    // Spread investment and only override the exit fields
    const investmentFormData = {
      investment: {
        ...investment,
        planedExit: formData.plannedExit,
        plannedExitDate: plannedExitDate || undefined
      }
    }

    // Use the central payload builder (it will extract subtypes from rawInvestmentData)
    const payload = buildInvestmentPayload(investmentFormData as any, businessAppContext, {
      isUpdate: true,
      rawInvestmentData: investment
    })

    // Add changeMode to the payload
    ;(payload as any).changeMode = 'UPDATE'

    // Call success callback with updated values
    if (onSave) {
      onSave(formData.plannedExit, plannedExitDate)
    }

    // Return the payload for AppActionForm to handle
    return payload
  }

  return (
    <InvestmentPopupFormWrapper
      loading={loading}
      error={error}
      investment={investment}
      onSubmit={handleSubmit}
      onClose={onClose}
      form={form}
      businessAppContext={businessAppContext}
      prefixDataTestId={prefixDataTestId}
      loadingMessage={getTranslationFromI18nKeyAndLabel('investment.exit.loading', 'Loading investment data...')}
      data-testid={`${prefixDataTestId}-form`}
      submitButtonText={getTranslationFromI18nKeyAndLabel('investment.exit.button.save', 'Save Planned Exit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
    >
      <div className="gba:space-y-4" data-testid={`${prefixDataTestId}-form-content`}>
        {/* Planned Exit Switch */}
        <FormField
          control={form.control}
          name="plannedExit"
          render={({ field }) => (
            <FormItem data-testid={`${prefixDataTestId}-planned-exit-field`}>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid={`${prefixDataTestId}-planned-exit-switch`}
                  />
                </FormControl>
                <FormLabel className="gba:!mb-0">
                  {getTranslationFromI18nKeyAndLabel('investment.exit.label.plannedExit', 'Planned Exit')}
                </FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Planned Exit Date Field - Only shown when planned exit is enabled */}
        {form.watch('plannedExit') && (
          <FormField
            control={form.control}
            name="plannedExitDate"
            render={({ field }) => (
              <FormItem data-testid={`${prefixDataTestId}-planned-exit-date-field`}>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel('investment.exit.label.plannedExitDate', 'Planned Exit Date')}
                </FormLabel>
                <FormControl>
                  <DateInput
                    type="date"
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'investment.exit.placeholder.selectDate',
                      'Select planned exit date'
                    )}
                    value={field.value || ''}
                    onChange={value => field.onChange(typeof value === 'string' ? value : '')}
                    data-testid={`${prefixDataTestId}-planned-exit-date-input`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Current planned exit info display */}
        {investment && investment.planedExit && investment.plannedExitDate && (
          <div className="gba:text-sm gba:text-gray-600" data-testid={`${prefixDataTestId}-current-planned-exit`}>
            {getTranslationFromI18nKeyAndLabel('investment.exit.currentDate', 'Current planned exit date')}:{' '}
            {new Date(investment.plannedExitDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </InvestmentPopupFormWrapper>
  )
}
