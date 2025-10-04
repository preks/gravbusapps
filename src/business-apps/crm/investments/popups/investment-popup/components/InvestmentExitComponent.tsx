import React, { useEffect } from 'react';
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Alert,
  Spinner,
  Switch
} from '@newwork/nw-design-system';
import { AppActionForm } from '@/components/app-action-form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInvestmentPopupData } from '../hooks/useInvestmentPopupData';
import { InvestmentExitComponentProps, ExitFormData } from '../types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads';

const prefixDataTestId = 'investment-exit-component';

// Form validation schema
const exitFormSchema = z.object({
  plannedExit: z.boolean(),
  plannedExitDate: z.string().nullable(), // Allow null or string
});

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
  };

  // Extract investmentId from additionalData
  const investmentId = additionalData?.investmentId || 
    additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId ||
    additionalData?.id;

  // Use the hook for data loading (always call hooks first)
  const { investment, loading, error } = useInvestmentPopupData({
    context: businessAppContext,
    investmentId,
    scope: 'exit'
  });

  // Form setup with current planned exit data
  const form = useForm<ExitFormData>({
    resolver: zodResolver(exitFormSchema),
    defaultValues: {
      plannedExit: false,
      plannedExitDate: null
    }
  });

  // Sync form with loaded planned exit data
  useEffect(() => {
    if (investment) {
      const plannedExit = investment.planedExit || false;
      const plannedExitDate = investment.plannedExitDate 
        ? new Date(investment.plannedExitDate).toISOString().split('T')[0]
        : null;
      
      form.reset({
        plannedExit,
        plannedExitDate
      });
    }
  }, [investment, form]);


  // Validate required data after hooks have been called
  if (!investmentId) {
    return (
      <Alert
        variant="destructive"
        data-testid={`${prefixDataTestId}-missing-investment-id`}
      >
        {getTranslationFromI18nKeyAndLabel('investment.exit.error.missingId', 'No investment ID found in context data')}
      </Alert>
    );
  }

  // Handle form submission - create payload for AppActionForm
  const handleSubmit = async (formData: ExitFormData) => {
    if (!investment) {
      throw new Error(getTranslationFromI18nKeyAndLabel('investment.exit.error.dataNotLoaded', 'Investment data not loaded'));
    }

    // Convert date string to ISO format or null
    // If plannedExit is false, set to null
    // If plannedExit is true but no date provided, also set to null (clearing the date)
    const plannedExitDate = formData.plannedExit && formData.plannedExitDate && formData.plannedExitDate.trim() !== ''
      ? new Date(formData.plannedExitDate).toISOString() 
      : null;


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
        investmentStatus: investment.investmentStatus, // Full object
        investmentRiskLevel: investment.investmentRiskLevel, // Full object
        acquisitionDate: investment.acquisitionDate,
        planedExit: formData.plannedExit, // This is the field we're updating
        plannedExitDate: plannedExitDate || undefined, // This is the field we're updating
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
      onSave(formData.plannedExit, plannedExitDate);
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
        <span className="gba:ml-2">{getTranslationFromI18nKeyAndLabel('investment.exit.loading', 'Loading investment data...')}</span>
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
                <FormLabel className="gba:!mb-0">{getTranslationFromI18nKeyAndLabel('investment.exit.label.plannedExit', 'Planned Exit')}</FormLabel>
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
                <FormLabel>{getTranslationFromI18nKeyAndLabel('investment.exit.label.plannedExitDate', 'Planned Exit Date')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    placeholder={getTranslationFromI18nKeyAndLabel('investment.exit.placeholder.selectDate', 'Select planned exit date')}
                    value={field.value || ''}
                    data-testid={`${prefixDataTestId}-planned-exit-date-input`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Current planned exit info display */}
        {investment.planedExit && investment.plannedExitDate && (
          <div className="gba:text-sm gba:text-gray-600" data-testid={`${prefixDataTestId}-current-planned-exit`}>
            {getTranslationFromI18nKeyAndLabel('investment.exit.currentDate', 'Current planned exit date')}: {new Date(investment.plannedExitDate).toLocaleDateString()}
          </div>
        )}

      </div>
    </AppActionForm>
  );
};
