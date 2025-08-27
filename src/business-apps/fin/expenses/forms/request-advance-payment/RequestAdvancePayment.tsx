import React, { useState, useEffect } from 'react';
import { 
  Button,
  Input,
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
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useRequestAdvancePaymentData } from './hooks/useRequestAdvancePaymentData';
import { formatCurrency } from './utils/formatters';

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

  const {
    expensePlans,
    currencies,
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
 console.log('expensePlans', expensePlans)
  // Set default values when expense plan is provided
  useEffect(() => {
    if (expensePlanId && expensePlans.length > 0) {
      const plan = expensePlans.find(p => p.id === expensePlanId);
      if (plan) {
        setFormData(prev => ({
          ...prev,
          expensePlanId: plan.id,
          currency: plan.currency?.code || 'EUR',
          costCenter: plan.costCenterId || ''
        }));
        // Fetch detailed information for the selected plan
        fetchExpensePlanDetails(plan.id);
      }
    }
  }, [expensePlanId, expensePlans, fetchExpensePlanDetails]);

  const handleExpensePlanChange = (planId: string) => {
    setFormData(prev => ({ ...prev, expensePlanId: planId }));
    
    // Fetch detailed information for the selected plan
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

    setIsSubmitting(true);
    setError(null);

    try {
      // TODO: Implement actual API call to submit advance payment request
      console.log('Submitting advance payment request:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
    <div className="gba:max-w-4xl gba:mx-auto gba:bg-white gba:rounded-lg gba:shadow-md" data-testid="request-advance-payment-container">
      {/* Header */}
      <div className="gba:border-b gba:border-border gba:px-6 gba:py-4">
        <h1 className="gba:text-xl gba:font-semibold gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:request_advance_payment.title',
            'Request Advance Payment'
          )}
        </h1>
      </div>

      {/* Form Content */}
      <div className="gba:p-6" data-testid="request-advance-payment-content">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="gba:mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Expense Plan Selection */}
        <div className="gba:mb-4" data-testid="request-advance-payment-expense-plan-field">
          <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:request_advance_payment.expense_plan_label',
              'Expense Plan'
            )}
            <span className="gba:text-red-600"> *</span>
          </label>
          <Select
            value={formData.expensePlanId}
            onValueChange={handleExpensePlanChange}
            data-testid="request-advance-payment-expense-plan-select"
          >
            <SelectTrigger>
              <SelectValue placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:request_advance_payment.select_expense_plan',
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
        </div>

        {/* Total Amount Display */}
        {selectedPlan && (
          <div className="gba:flex gba:justify-between gba:items-center gba:p-4 gba:mb-4 gba:bg-gray-100 gba:rounded-md" data-testid="request-advance-payment-total-section">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-2xl gba:font-bold gba:text-foreground">
                {formatCurrency(selectedPlan.totalAmount || 0, selectedPlan.currency?.code || 'EUR')}
              </span>
              <span className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:request_advance_payment.total_label',
                  'Total'
                )}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="gba:bg-blue-100 gba:text-blue-800 gba:border-blue-300"
              data-testid="request-advance-payment-trip-button"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:request_advance_payment.trip_button',
                'Trip'
              )}
            </Button>
          </div>
        )}

        {/* Advance Payment Section Header */}
        <div className="gba:mb-4 gba:pb-2 gba:border-b gba:border-border">
          <h3 className="gba:text-base gba:font-semibold gba:text-foreground gba:m-0" data-testid="request-advance-payment-section-header">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:request_advance_payment.advance_payment_header',
              'Advance Payment'
            )}
          </h3>
        </div>

        {/* Amount and Currency Row */}
        <div className="gba:flex gba:gap-4 gba:mb-4">
          <div className="gba:flex-1" data-testid="request-advance-payment-amount-field">
            <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:request_advance_payment.amount_label',
                'Amount'
              )}
              <span className="gba:text-red-600"> *</span>
            </label>
            <Input
              type="number"
              step="0.01"
              max={maxAmount}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:request_advance_payment.amount_placeholder',
                'Enter Amount'
              )}
              value={formData.amount || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              data-testid="request-advance-payment-amount-input"
            />
            {maxAmount > 0 && (
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                Max available: {formatCurrency(maxAmount, selectedPlan?.currency?.code || 'EUR')}
              </p>
            )}
          </div>

          <div className="gba:flex-1" data-testid="request-advance-payment-currency-field">
            <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:request_advance_payment.currency_label',
                'Currency'
              )}
              <span className="gba:text-red-600"> *</span>
            </label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              data-testid="request-advance-payment-currency-select"
            >
              <SelectTrigger>
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:request_advance_payment.select_currency',
                  'Select Currency'
                )} />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr.id} value={curr.code}>
                    {curr.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cost Center */}
        <div className="gba:mb-4" data-testid="request-advance-payment-cost-center-field">
          <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:request_advance_payment.cost_center_label',
              'Cost Center'
            )}
            <span className="gba:text-red-600"> *</span>
          </label>
          <Select
            value={formData.costCenter}
            onValueChange={(value) => setFormData(prev => ({ ...prev, costCenter: value }))}
            data-testid="request-advance-payment-cost-center-select"
          >
            <SelectTrigger>
              <SelectValue placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:request_advance_payment.select_cost_center',
                'Select Cost Center'
              )} />
            </SelectTrigger>
            <SelectContent>
              {costCenters.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Method */}
        <div className="gba:mb-4" data-testid="request-advance-payment-payment-method-field">
          <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:request_advance_payment.payment_method_label',
              'Payment Method'
            )}
            <span className="gba:text-red-600"> *</span>
          </label>
          <Select
            value={formData.paymentMethod}
            onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
            data-testid="request-advance-payment-payment-method-select"
          >
            <SelectTrigger>
              <SelectValue placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:request_advance_payment.select_payment_method',
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
          <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:request_advance_payment.notes_label',
              'Notes'
            )}
          </label>
          <Textarea
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:request_advance_payment.notes_placeholder',
              'Enter additional notes...'
            )}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="gba:min-h-[80px] gba:resize-y"
            data-testid="request-advance-payment-notes-textarea"
          />
        </div>

        {/* Action Buttons */}
        <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-4 gba:border-t gba:border-border" data-testid="request-advance-payment-actions">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.expensePlanId || !formData.amount || !formData.currency || !formData.costCenter || !formData.paymentMethod}
            data-testid="request-advance-payment-submit-button"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="gba:mr-2" />
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:request_advance_payment.submitting_button',
                  'Submitting...'
                )}
              </>
            ) : (
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:request_advance_payment.submit_button',
                'Submit'
              )
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestAdvancePayment;
