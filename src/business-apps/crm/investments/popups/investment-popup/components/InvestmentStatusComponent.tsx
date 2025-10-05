import React, { useEffect, useMemo } from 'react';
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
  Alert,
  Spinner
} from '@newwork/nw-design-system';
import { AppActionForm } from '@/components/app-action-form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInvestmentPopupData } from '../hooks/useInvestmentPopupData';
import { InvestmentStatusComponentProps, StatusFormData } from '../types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads';

const prefixDataTestId = 'investment-status-component';

// Form validation schema builder
const buildStatusFormSchema = (requiredMessage: string) =>
  z.object({
    statusRef: z.string().min(1, requiredMessage),
  });

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
  };

  // Extract investmentId from additionalData
  const investmentId = additionalData?.investmentId || 
    additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId ||
    additionalData?.id;

  // Use the hook for data loading (always call hooks first)
  const { investment, statusOptions, loading, error } = useInvestmentPopupData({
    context: businessAppContext,
    investmentId,
    scope: 'status'
  });

  // Form setup with current status
  const form = useForm<StatusFormData>({
    resolver: zodResolver(
      useMemo(
        () =>
          buildStatusFormSchema(
            getTranslationFromI18nKeyAndLabel(
              'investment.status.validation.required',
              'Please select a status'
            )
          ),
        []
      )
    ),
    defaultValues: {
      statusRef: ''
    }
  });

  // Sync form with loaded status
  useEffect(() => {
    if (investment?.investmentStatus?.id) {
      form.reset({
        statusRef: investment.investmentStatus.id
      });
    }
  }, [investment?.investmentStatus?.id, form]);


  // Validate required data after hooks have been called
  if (!investmentId) {
    return (
      <Alert
        variant="destructive"
        data-testid={`${prefixDataTestId}-missing-investment-id`}
      >
        {getTranslationFromI18nKeyAndLabel('investment.status.error.missingId', 'No investment ID found in context data')}
      </Alert>
    );
  }

  // Handle form submission - create payload for AppActionForm
  const handleSubmit = async (formData: StatusFormData) => {
    if (!investment) {
      throw new Error(getTranslationFromI18nKeyAndLabel('investment.status.error.dataNotLoaded', 'Investment data not loaded'));
    }

    // Find the selected status catalog entry
    const selectedStatus = statusOptions.find(status => status.id === formData.statusRef);
    if (!selectedStatus) {
      throw new Error(getTranslationFromI18nKeyAndLabel('investment.status.error.statusNotFound', 'Selected status not found'));
    }


    // Create business app context
    const businessAppContext = {
      accessToken,
      userInfo,
      additionalData
    };

    // Determine investment group type
    const groupRef = investment.investmentGroup?.id || '';
    const groupType = groupRef.split(':').pop();
    
    // Create investment form data using new nested structure with full objects
    const investmentFormData: any = {
      investment: {
        id: investmentId,
        version: investment.version,
        name: investment.name || '',
        initialInvestmentAmount: investment.initialInvestmentAmount || 0,
        investmentGroup: investment.investmentGroup, // Full object
        ownerEmployee: investment.ownerEmployee, // Full object
        
        // Include ALL existing investment fields to preserve them
        code: investment.code,
        isin: investment.isin,
        investmentType: investment.investmentType, // Full object
        investmentStakeType: investment.investmentStakeType, // Full object
        investmentPhase: investment.investmentPhase, // Full object
        investmentStatus: selectedStatus, // This is the field we're updating - full object
        investmentRiskLevel: investment.investmentRiskLevel, // Full object
        acquisitionDate: investment.acquisitionDate,
        planedExit: investment.planedExit,
        plannedExitDate: investment.plannedExitDate,
        exitDate: investment.exitDate,
        totalInvestmentAmount: investment.totalInvestmentAmount,
        investmentMarketValue: investment.investmentMarketValue,
        debtFinancingAmount: investment.debtFinancingAmount,
        requiredCapitalAmount: investment.requiredCapitalAmount,
        forecastedRevenueAmount: investment.forecastedRevenueAmount,
        forecastedProfitAmount: investment.forecastedProfitAmount,
        stakePercentage: investment.stakePercentage,
        loanRecipientName: investment.loanRecipientName,
        loanAmount: investment.loanAmount,
        loanOpenCommitmentAmount: investment.loanOpenCommitmentAmount,
        loanInterestRate: investment.loanInterestRate,
        loanStartDate: investment.loanStartDate,
        loanEndDate: investment.loanEndDate,
        loanInterestClaim: investment.loanInterestClaim,
        totalCommitmentAmount: investment.totalCommitmentAmount,
        totalDistributionAmount: investment.totalDistributionAmount,
        currency: investment.currency, // Full object
        fundManagerName: investment.fundManagerName,
        identification: investment.identification,
        investmentAccount: investment.investmentAccount, // Full object
        investmentOpportunity: investment.investmentOpportunity?.id,
        loanRecipientInvestmentAccount: investment.loanRecipientInvestmentAccount?.id,
        additionalProperties: investment.additionalProperties
      }
    };
    
    // CRITICAL: Add the appropriate subtype based on investment group (required by API)
    if (groupType === 'EQUITY') {
      const existingEquity = Array.isArray((investment as any).equityInvestment) 
        ? (investment as any).equityInvestment[0] 
        : (investment as any).equityInvestment;
      investmentFormData.equityInvestment = existingEquity || {};
    } else if (groupType === 'REAL_ESTATE') {
      const existingRealEstate = Array.isArray((investment as any).realEstateInvestment)
        ? (investment as any).realEstateInvestment[0]
        : (investment as any).realEstateInvestment;
      investmentFormData.realEstateInvestment = existingRealEstate || {};
    } else if (groupType === 'LIQUID_FUND') {
      const existingLiquidFund = Array.isArray((investment as any).liquidFundInvestment)
        ? (investment as any).liquidFundInvestment[0]
        : (investment as any).liquidFundInvestment;
      investmentFormData.liquidFundInvestment = existingLiquidFund || {};
    }

    // Use the central payload builder to preserve all existing data
    const payload = buildInvestmentPayload(
      investmentFormData,
      businessAppContext,
      {
        isUpdate: true,
        rawInvestmentData: investment
      }
    );

    // Add changeMode to the payload
    (payload as any).changeMode = 'UPDATE';

    // Call success callback with updated values
    if (onSave) {
      onSave(selectedStatus.id as string);
    }

    // Return the payload for AppActionForm to handle
    return payload;
  };

  // Show loading state
  if (loading) {
    return (
      <div 
        className="gba:flex gba:items-center gba:justify-center gba:py-8"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-2">{getTranslationFromI18nKeyAndLabel('investment.status.loading', 'Loading investment data...')}</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert
        variant="destructive"
        data-testid={`${prefixDataTestId}-error`}
      >
        {error}
      </Alert>
    );
  }

  // Show form when investment data is loaded
  if (!investment) {
    return null;
  }

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      onCancel={onClose}
      formData={form.getValues()}
      form={form}
      businessAppContext={businessAppContext}
      data-testid={`${prefixDataTestId}-form`}
      submitButtonText={getTranslationFromI18nKeyAndLabel('investment.status.button.save', 'Save Status')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
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
                    <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('investment.status.placeholder.select', 'Select investment status')} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
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
        {investment.investmentStatus && (
          <div className="gba:text-sm gba:text-gray-600" data-testid={`${prefixDataTestId}-current-status`}>
            {getTranslationFromI18nKeyAndLabel('investment.status.current', 'Current status')}: {investment.investmentStatus.value}
          </div>
        )}

      </div>
    </AppActionForm>
  );
};
