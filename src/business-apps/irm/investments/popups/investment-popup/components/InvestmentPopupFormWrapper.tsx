/**
 * Wrapper component for investment popup forms
 * Handles loading, error, and empty states consistently
 */

import React from 'react'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { UseFormReturn } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { Investment } from '@/common/data/investment/types/investmentTypes'

interface InvestmentPopupFormWrapperProps {
  loading: boolean
  error: string | null
  investment: Investment | null
  onSubmit: (data: any) => Promise<any>
  onClose: () => void
  form: UseFormReturn<any>
  businessAppContext: BusinessAppContextProps
  prefixDataTestId: string
  submitButtonText?: string
  cancelButtonText?: string
  loadingMessage?: string
  children: React.ReactNode
}

export const InvestmentPopupFormWrapper: React.FC<InvestmentPopupFormWrapperProps> = ({
  loading,
  error,
  investment,
  onSubmit,
  onClose,
  form,
  businessAppContext,
  prefixDataTestId,
  submitButtonText,
  cancelButtonText,
  loadingMessage,
  children
}) => {
  // Show loading state
  if (loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-8"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {loadingMessage ||
            getTranslationFromI18nKeyAndLabel('investment.popup.loading', 'Loading investment data...')}
        </span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        {error}
      </Alert>
    )
  }

  // Return null if no investment data
  if (!investment) {
    return null
  }

  // Render form with investment data loaded
  return (
    <AppActionForm
      processType="update"
      onSubmit={onSubmit}
      onCancel={onClose}
      formData={form.getValues()}
      form={form}
      businessAppContext={businessAppContext}
      data-testid={`${prefixDataTestId}-form`}
      submitButtonText={submitButtonText || getTranslationFromI18nKeyAndLabel('common.save', 'Save')}
      cancelButtonText={cancelButtonText || getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
    >
      {children}
    </AppActionForm>
  )
}
