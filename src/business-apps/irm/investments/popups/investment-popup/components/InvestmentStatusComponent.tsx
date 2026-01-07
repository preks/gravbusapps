import React, { useEffect, useMemo } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useInvestmentPopupData } from '../hooks/useInvestmentPopupData'
import { InvestmentPopupFormWrapper } from './InvestmentPopupFormWrapper'
import { InvestmentStatusComponentProps, StatusFormData } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads'

const prefixDataTestId = 'investment-status-component'

// Form validation schema builder
const buildStatusFormSchema = (requiredMessage: string) =>
  z.object({
    statusRef: z.string().min(1, requiredMessage)
  })

export const InvestmentStatusComponent: React.FC<InvestmentStatusComponentProps> = ({
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
  const { investment, statusOptions, loading, error } = useInvestmentPopupData({
    context: businessAppContext,
    investmentId,
    scope: 'status'
  })

  // Form setup with current status
  const form = useForm<StatusFormData>({
    resolver: zodResolver(
      useMemo(
        () =>
          buildStatusFormSchema(
            getTranslationFromI18nKeyAndLabel('investment.status.validation.required', 'Please select a status')
          ),
        []
      )
    ),
    defaultValues: {
      statusRef: ''
    }
  })

  // Sync form with loaded status
  useEffect(() => {
    if (investment?.investmentStatus?.id) {
      form.reset({
        statusRef: investment.investmentStatus.id
      })
    }
  }, [investment?.investmentStatus?.id, form])

  // Validate required data after hooks have been called
  if (!investmentId) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-investment-id`}>
        {getTranslationFromI18nKeyAndLabel(
          'investment.status.error.missingId',
          'No investment ID found in context data'
        )}
      </Alert>
    )
  }

  // Handle form submission - create payload for AppActionForm
  const handleSubmit = async (formData: StatusFormData) => {
    if (!investment) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('investment.status.error.dataNotLoaded', 'Investment data not loaded')
      )
    }

    // Find the selected status catalog entry
    const selectedStatus = statusOptions.find(status => status.id === formData.statusRef)
    if (!selectedStatus) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('investment.status.error.statusNotFound', 'Selected status not found')
      )
    }

    // Create business app context
    const businessAppContext = {
      accessToken,
      userInfo,
      additionalData
    }

    // Spread investment and only override the status field
    const investmentFormData = {
      investment: {
        ...investment,
        investmentStatus: selectedStatus // Only override this field
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
      onSave(selectedStatus.id as string)
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
      loadingMessage={getTranslationFromI18nKeyAndLabel('investment.status.loading', 'Loading investment data...')}
      submitButtonText={getTranslationFromI18nKeyAndLabel('investment.status.button.save', 'Save Status')}
    >
      <div className="gba:space-y-4" data-testid={`${prefixDataTestId}-form-content`}>
        {/* Status Selection Field */}
        <FormField
          control={form.control}
          name="statusRef"
          render={({ field }) => (
            <FormItem data-testid={`${prefixDataTestId}-status-field`}>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('investment.status.label', 'Investment Status')}</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger data-testid={`${prefixDataTestId}-status-select`}>
                    <SelectValue
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'investment.status.placeholder.select',
                        'Select investment status'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem
                        key={status.id}
                        value={status.id}
                        data-testid={`${prefixDataTestId}-status-option-${status.id}`}
                      >
                        {status.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Current status display */}
        {investment?.investmentStatus && (
          <div className="gba:text-sm gba:text-gray-600" data-testid={`${prefixDataTestId}-current-status`}>
            {getTranslationFromI18nKeyAndLabel('investment.status.current', 'Current status')}:{' '}
            {investment.investmentStatus.value}
          </div>
        )}
      </div>
    </InvestmentPopupFormWrapper>
  )
}
