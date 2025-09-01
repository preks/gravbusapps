import React, { useState, useEffect } from 'react';
import { 
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription
} from '@newwork/nw-design-system';
import AmountInput from './components/AmountInput';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel, formatNumberFunction } from '@/common/utils/windowUtils';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { useRequestAdvancePaymentData } from './hooks/useRequestAdvancePaymentData';

interface RequestAdvancePaymentProps extends BusinessAppContextProps {
  expensePlanId?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface FormData {
  expensePlanId: string;
  amount: number;
  currency: string;
  costCenter: string;
  paymentMethod: string;
  notes: string;
}

// Constants to avoid duplication
const DEFAULT_CURRENCY = 'EUR';

// Utility function to get currency with fallback
const getCurrencyWithFallback = (currencyCode?: string): string => {
  return currencyCode || DEFAULT_CURRENCY;
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

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
    if (!formData.expensePlanId || !formData.amount || !formData.currency || !formData.costCenter || !formData.paymentMethod) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Check if amount exceeds maximum available
    if (selectedPlan && formData.amount > maxAmount) {
      setError('Advance Payment amount can\'t be greater than Estimated Expenses and Allowances amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        advancePayment: {
          currencyRef: selectedPlan?.currencyRef || `Currency:v1:${formData.currency}`,
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
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="gba:max-w-2xl gba:mx-auto gba:bg-white gba:p-6" data-testid="request-advance-payment-container">
      {/* Header */}
      <div className="gba:mb-6">
        <h1 className="gba:text-2xl gba:font-bold gba:text-black gba:m-0 gba:pb-3 gba:text-center gba:flex-1 gba:flex gba:justify-center">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:add_items_to_plan.add_trip_info_to_plan.skip_advance_payment_label',
            'Request Advance Payment'
          )}
        </h1>
        <div className="gba:border-b gba:border-text-[#E0E0E0]"></div>
      </div>

      {/* Form Content */}
      <div data-testid="request-advance-payment-content">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="gba:mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Expense Plan Selection */}
        <div className="gba:mb-6 gba:bg-gray-100" data-testid="request-advance-payment-expense-plan-field">
          <label className="gba:block gba:text-xs gba:font-medium gba:text-black  gba:px-3 gba:py-1 gba:rounded">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.initial_expense_plan_select_label',
              'Expense Plan'
            )}
            <span className="gba:text-[#707070]"> *</span>
          </label> 
          {expensePlans.length > 0 ? (
            <Select
              value={formData.expensePlanId}
              onValueChange={handleExpensePlanChange}
              data-testid="request-advance-payment-expense-plan-select"
            >
              <SelectTrigger className="gba:w-full gba:h-10 gba:bg-gray-100 gba:border-none">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.initial_expense_plan_select_placeholder',
                  'Select Expense Plan'
                )} />
              </SelectTrigger>
              <SelectContent>
                {expensePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.code} - {plan.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="gba:w-full gba:h-10 gba:bg-gray-100 gba:border-none gba:flex gba:items-center gba:justify-between gba:px-3">
              <span className="gba:text-gray-500 gba:text-sm">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:request_advance_payment.no_expense_plans',
                  'No approved expense plans available'
                )}
              </span>
              <div className="gba:w-4 gba:h-4 gba:flex gba:items-center gba:justify-center">
                <svg className="gba:w-4 gba:h-4 gba:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Total Amount Display */}
        {selectedPlan && (
          <div className="gba:mb-6" data-testid="request-advance-payment-total-section">
            <div className="gba:flex gba:justify-between gba:items-center">
              <div className="gba:flex-1 gba:flex gba:justify-center">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-2xl gba:font-bold gba:text-black">
                    {formatNumberFunction((selectedPlan.totalRemainingAmount || 0).toString(), "0.00[,]00")} {getCurrencyWithFallback(selectedPlan.currency?.code)}
                  </span>
                  <span className="gba:text-sm gba:text-gray-500 gba:font-bold gba:mt-3">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_request.initiate_advance_payment.total',
                      'Total'
                    )}
                  </span>
                </div>
              </div>
              <div 
                className="gba:rounded-full gba:px-8 gba:py-1 gba:bg-[#C15FB1] gba:text-white gba:border gba:border-[#C15FB1] gba:text-sm gba:font-medium"
                data-testid="request-advance-payment-trip-badge"
              >
                {selectedPlan?.requestType?.value || 'Trip'}
              </div>
            </div>
          </div>
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

        {/* Amount and Currency Row */}
        <div className="gba:flex gba:gap-4 gba:mb-4">
          <div className="gba:flex-1 gba:bg-gray-100" data-testid="request-advance-payment-amount-field">
            <label className="gba:block gba:text-xs gba:font-medium gba:text-black  gba:bg-gray-100 gba:px-3 gba:py-1 gba:rounded">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:calculation_allowance_code_list.calculation_allowance_code_modal.current_amount_label',
                'Amount'
              )}
              <span className="gba:text-[#707070]"> *</span>
            </label>
            <AmountInput
              value={formData.amount}
              onChange={(newAmount) => {
                // Only allow changes if a plan is selected
                if (!selectedPlan) return;
                
                setFormData(prev => ({ ...prev, amount: newAmount }));
                
                // Validate against max amount
                if (selectedPlan && newAmount > maxAmount) {
                  setValidationError(getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.amount_error', 'Advance Payment amount can\'t be greater than Estimated Expenses and Allowances amount'));
                } else {
                  setValidationError(null);
                }
              }}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:calculation_allowance_code_list.calculation_allowance_code_modal.current_amount_placeholder',
                'Enter Amount'
              )}
              disabled={!selectedPlan}
              data-testid="request-advance-payment-amount-input"
              required={true}
            />
          </div>

          <div className="gba:flex-1 gba:bg-gray-100" data-testid="request-advance-payment-currency-field">
            <label className="gba:block gba:text-xs gba:font-medium gba:text-black  gba:bg-gray-100 gba:px-2 gba:py-1 gba:rounded">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
                'Currency'
              )}
              <span className="gba:text-[#707070]"> *</span>
            </label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              disabled={true}
              data-testid="request-advance-payment-currency-select"
            >
              <SelectTrigger className="gba:w-full gba:h-10 gba:border gba:border-none gba:bg-gray-100">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:request_advance_payment.select_currency',
                  'Select Currency'
                )} />
              </SelectTrigger>
              <SelectContent >
                {/* Only show the plan's currency */}
                {formData.currency && (
                  <SelectItem key={formData.currency} value={formData.currency}>
                    {formData.currency}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {/* Show prefilled currency info */}
            {selectedPlan?.currency?.code && formData.currency === selectedPlan.currency.code}
          </div>
        </div>

        {/* Validation Error Display */}
        {validationError && (
          <div className="gba:mb-4">
            <p className="gba:text-red-600 gba:text-sm" data-testid="request-advance-payment-validation-error">
              {validationError}
            </p>
          </div>
        )}

        {/* Cost Center */}
        <div className="gba:mb-4 gba:bg-gray-100" data-testid="request-advance-payment-cost-center-field">
          <label className="gba:block gba:text-xs gba:font-medium gba:text-black  gba:bg-gray-100 gba:px-3 gba:py-1 gba:rounded">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
              'Cost Center'
            )}
            <span className="gba:text-[#707070]"> *</span>
          </label>
          <Select
            value={formData.costCenter}
            onValueChange={(value) => setFormData(prev => ({ ...prev, costCenter: value }))}
            disabled={!selectedPlan}
            data-testid="request-advance-payment-cost-center-select"
          >
            <SelectTrigger className="gba:w-full gba:h-10 gba:border-none gba:bg-gray-100">
              <SelectValue placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.expense_request_container.current_cost_center_placeholder',
                'Select Cost Center'
              )} />
            </SelectTrigger>
            <SelectContent>
              {/* Show plan's cost center first if it exists */}
              {selectedPlan?.costCenterId && (
                <SelectItem key={selectedPlan.costCenterId} value={selectedPlan.costCenterId}>
                  {costCenters.find(cc => cc.id === selectedPlan.costCenterId)?.name || `Cost Center ${selectedPlan.costCenterId}`} (Plan Default)
                </SelectItem>
              )}
              {/* Show all other cost centers */}
              {costCenters
                .filter(cc => !selectedPlan?.costCenterId || cc.id !== selectedPlan.costCenterId)
                .map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {/* Show prefilled cost center info */}
          {selectedPlan?.costCenterId && formData.costCenter === selectedPlan.costCenterId}
        </div>

        {/* Payment Method */}
        <div className="gba:mb-4 gba:bg-gray-100" data-testid="request-advance-payment-payment-method-field">
          <label className="gba:block gba:text-xs gba:font-medium gba:text-black  gba:bg-gray-100 gba:px-3 gba:py-1 gba:rounded">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:initiate_advance_payment.select_payment_method',
              'Payment Method'
            )}
            <span className="gba:text-[#707070]"> *</span>
          </label>
          <Select
            value={formData.paymentMethod}
            onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
            disabled={!selectedPlan}
            data-testid="request-advance-payment-payment-method-select"
          >
            <SelectTrigger className="gba:w-full gba:h-10 gba:border-none gba:bg-gray-100">
              <SelectValue placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.add_request_trip_details.payment_method',
                'Select Payment Method'
              )} />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((method) => (
                <SelectItem key={method.id} value={method.id}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="gba:mb-6" data-testid="request-advance-payment-notes-field">
          <label className="gba:block gba:text-xs gba:font-medium gba:text-black gba:px-3 gba:py-1">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:approve_expense_request.notes_area_label',
              'Note'
            )}
          </label>
          <Textarea
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:request_advance_payment.notes_placeholder',
              'Enter additional notes...'
            )}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            disabled={!selectedPlan}
            className="gba:w-full gba:min-h-[80px] gba:border-none gba:rounded-none gba:px-3 gba:py-2 gba:resize-y"
            style={{ backgroundColor: '#f3f4f6' }}
            data-testid="request-advance-payment-notes-textarea"
          />
        </div>

        {/* Action Buttons */}
        <div className="gba:flex gba:justify-between gba:gap-3 gba:pt-6 gba:border-t gba:border-gray-300" data-testid="request-advance-payment-actions">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="gba:px-6 gba:py-2 gba:border gba:border-gray-300 gba:text-black gba:hover:bg-gray-50"
            data-testid="request-advance-payment-cancel-button"
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:initiate_expense_plan.cancel_button',
              'Cancel'
            )}
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.expensePlanId || !formData.amount || !formData.currency || !formData.costCenter || !formData.paymentMethod}
            className="gba:px-6 gba:py-2 gba:bg-blue-600 gba:text-white gba:hover:bg-blue-700 gba:disabled:bg-gray-300"
            data-testid="request-advance-payment-submit-button"
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_absences.create_absence.submit',
              'Submit'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestAdvancePayment;
