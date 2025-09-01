import React, { useState, useEffect } from 'react';
import { Spinner, Alert, AlertTitle, AlertDescription, Button } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { useRequestAdvancePaymentData } from './hooks/useRequestAdvancePaymentData';
import { getCurrencyWithFallback, formatCurrencyRef } from './utils/currencyUtils';
import { validateForm } from './utils/validationUtils';
import { FormData, FormValidationState, FormSubmissionState } from './types/FormTypes';

// Components
import Header from './components/Header';
import ExpensePlanSelect from './components/ExpensePlanSelect';
import TotalAmountDisplay from './components/TotalAmountDisplay';
import AmountCurrencySection from './components/AmountCurrencySection';
import CostCenterSelect from './components/CostCenterSelect';
import PaymentMethodSelect from './components/PaymentMethodSelect';
import NotesField from './components/NotesField';
import ActionsBar from './components/ActionsBar';

interface RequestAdvancePaymentProps extends BusinessAppContextProps {
  expensePlanId?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

const RequestAdvancePayment: React.FC<RequestAdvancePaymentProps> = ({
  accessToken,
  userInfo,
  additionalData,
  expensePlanId,
  onSuccess,
  onError
}) => {
  const [formData, setFormData] = useState<FormData>({
    expensePlanId: '',
    amount: 0,
    currency: '',
    costCenter: '',
    paymentMethod: '',
    notes: ''
  });
  
  const [validationState, setValidationState] = useState<FormValidationState>({
    isValid: false,
    errors: [],
    validationError: null
  });
  
  const [submissionState, setSubmissionState] = useState<FormSubmissionState>({
    isSubmitting: false,
    error: null
  });

  const {
    expensePlans,
    costCenters,
    paymentMethods,
    isLoading,
    error: dataError,
    refetch,
    fetchExpensePlanDetails
  } = useRequestAdvancePaymentData({
    accessToken,
    userInfo,
    additionalData
  });

  // Set default values when expense plan is provided
  useEffect(() => {
    if (expensePlanId && expensePlans.length > 0) {
      const plan = expensePlans.find(p => p.id === expensePlanId);
      if (plan) {
        // Fetch detailed information for the selected plan
        fetchExpensePlanDetails(plan.id);
      }
    }
  }, [expensePlanId, expensePlans, fetchExpensePlanDetails]);

  // Update form data when expense plans are loaded and we have a pre-selected plan
  useEffect(() => {
    if (expensePlans.length > 0 && expensePlanId) {
      const plan = expensePlans.find(p => p.id === expensePlanId);
      if (plan) {
        setFormData(prev => ({
          ...prev,
          expensePlanId: plan.id,
          currency: getCurrencyWithFallback(plan.currency?.code),
          costCenter: plan.costCenterId || ''
        }));
        
        // Fetch detailed information for the selected plan to get cost center
        fetchExpensePlanDetails(plan.id);
      }
    }
  }, [expensePlans, expensePlanId, fetchExpensePlanDetails]);

  // Update form data when expense plan details are fetched and cost center becomes available
  useEffect(() => {
    if (formData.expensePlanId) {
      const selectedPlan = expensePlans.find(plan => plan.id === formData.expensePlanId);
    
      if (selectedPlan?.costCenterId && !formData.costCenter) {
        setFormData(prev => ({
          ...prev,
          costCenter: selectedPlan.costCenterId || ''
        }));
      }
    }
  }, [expensePlans, formData.expensePlanId, formData.costCenter]);

  const handleExpensePlanChange = (planId: string) => {
    const selectedPlan = expensePlans.find(plan => plan.id === planId);

    setFormData(prev => ({ 
      ...prev, 
      expensePlanId: planId,
      // Prefill currency and cost center from the selected plan
      currency: getCurrencyWithFallback(selectedPlan?.currency?.code),
      costCenter: selectedPlan?.costCenterId || ''
    }));
    
    // Fetch detailed information for the selected plan to get complete cost center data
    if (planId) {
      fetchExpensePlanDetails(planId);
    }
  };

  const handleSubmit = async () => {
    // Validate form using validation utility
    const validation = validateForm(formData, maxAmount);
    
    if (!validation.isValid) {
      setSubmissionState(prev => ({
        ...prev,
        error: validation.errors[0] // Show first error
      }));
      return;
    }

    setSubmissionState(prev => ({
      ...prev,
      isSubmitting: true,
      error: null
    }));

    try {
      const payload = {
        advancePayment: {
          currencyRef: selectedPlan?.currencyRef || formatCurrencyRef(formData.currency),
          amount: formData.amount,
          paymentMethod: formData.paymentMethod,
          expensePlan: formData.expensePlanId,
          costCenter: formData.costCenter,
          description: formData.notes
        },
        event: "pse_submit"
      };

      dispatchProcessContinueEvent('pse_submit', payload);
      onSuccess?.(formData);
    } catch (err) {
      console.error('Error submitting advance payment request:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit request';
      setSubmissionState(prev => ({
        ...prev,
        error: errorMessage
      }));
      onError?.(errorMessage);
    } finally {
      setSubmissionState(prev => ({
        ...prev,
        isSubmitting: false
      }));
    }
  };

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_cancel', {});
  };

  // Get selected expense plan details
  const selectedPlan = expensePlans.find(plan => plan.id === formData.expensePlanId);
  const maxAmount = selectedPlan?.totalRemainingAmount || 0;

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
        <Spinner size="lg" />
      </div>
    );
  }

    if (dataError && !isLoading) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>{dataError}</AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refetch}
          className="gba:mt-2"
        >
          Retry
        </Button>
      </Alert>
    );
  }

  const isSubmitDisabled = !formData.expensePlanId || !formData.amount || 
    !formData.currency || !formData.costCenter || !formData.paymentMethod;

  return (
    <div className="gba:max-w-2xl gba:mx-auto gba:bg-white gba:p-6" data-testid="request-advance-payment-container">
      <Header />

      {/* Form Content */}
      <div data-testid="request-advance-payment-content">
        {/* Error Display */}
        {submissionState.error && (
          <Alert variant="destructive" className="gba:mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{submissionState.error}</AlertDescription>
          </Alert>
        )}

                <ExpensePlanSelect
          plans={expensePlans}
          value={formData.expensePlanId}
          onChange={handleExpensePlanChange}
        />

        {selectedPlan && (
          <TotalAmountDisplay
            totalRemainingAmount={selectedPlan.totalRemainingAmount}
            currencyCode={selectedPlan.currency?.code}
            requestTypeValue={selectedPlan?.requestType?.value}
          />
        )}

        {/* Advance Payment Section Header */}
        <div className="gba:mb-4 gba:pb-2">
          <h3 className="gba:text-base gba:font-semibold gba:text-black gba:m-0" data-testid="request-advance-payment-section-header">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:approve_expense_request.advance_payment',
              'Advance Payment'
            )}
          </h3>
        </div>

        <AmountCurrencySection
          amount={formData.amount}
          currency={formData.currency}
          onAmountChange={(newAmount) => {
            if (!selectedPlan) return;
            setFormData(prev => ({ ...prev, amount: newAmount }));
          }}
          onCurrencyChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
          onValidationError={(error) => setValidationState(prev => ({ ...prev, validationError: error }))}
          maxAmount={maxAmount}
          disabled={!selectedPlan}
        />

        {/* Validation Error Display */}
        {validationState.validationError && (
          <div className="gba:mb-4">
            <p className="gba:text-red-600 gba:text-sm" data-testid="request-advance-payment-validation-error">
              {validationState.validationError}
            </p>
          </div>
        )}

                <CostCenterSelect
          costCenters={costCenters}
          selectedPlanCostCenterId={selectedPlan?.costCenterId}
          value={formData.costCenter}
          onChange={(value) => setFormData(prev => ({ ...prev, costCenter: value }))}
          disabled={!selectedPlan}
        />

        <PaymentMethodSelect
          methods={paymentMethods}
          value={formData.paymentMethod}
          onChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
          disabled={!selectedPlan}
        />

        <NotesField
          value={formData.notes}
          onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
          disabled={!selectedPlan}
        />

        <ActionsBar
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          isSubmitting={submissionState.isSubmitting}
          isSubmitDisabled={isSubmitDisabled}
        />
      </div>
    </div>
  );
};

export default RequestAdvancePayment;
