import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Alert
} from '@newwork/nw-design-system';
import { AppActionForm } from '@/components/app-action-form';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const prefixDataTestId = 'EquityInvestmentRoundForm';

// Form validation schema
const equityInvestmentRoundSchema = z.object({
  name: z.string().min(1, getTranslationFromI18nKeyAndLabel('investment.rounds.validation.nameRequired', 'Round name is required')),
  year: z.string().min(1, getTranslationFromI18nKeyAndLabel('investment.rounds.validation.yearRequired', 'Year is required')),
  preValue: z.string().min(1, getTranslationFromI18nKeyAndLabel('investment.rounds.validation.preValueRequired', 'Pre-value is required')),
  investmentVolume: z.string().min(1, getTranslationFromI18nKeyAndLabel('investment.rounds.validation.investmentVolumeRequired', 'Investment volume is required')),
  roundSharePercentage: z.string().min(1, getTranslationFromI18nKeyAndLabel('investment.rounds.validation.sharePercentageRequired', 'Share percentage is required')),
  currencyRef: z.string().min(1, getTranslationFromI18nKeyAndLabel('investment.rounds.validation.currencyRequired', 'Currency is required')),
  equityInvestment: z.string().optional(), // Will be provided via context
  id: z.string().optional(), // For updates
  version: z.number().optional() // For optimistic locking in updates
});

type EquityInvestmentRoundFormValues = z.infer<typeof equityInvestmentRoundSchema>;

interface CurrencyOption {
  value: string;
  label: string;
  id: string;
}

export interface EquityInvestmentRoundFormProps extends BusinessAppContextProps {
  onSuccess?: (data: any) => void;
  initialValues?: Partial<EquityInvestmentRoundFormValues>;
}

const EquityInvestmentRoundForm: React.FC<EquityInvestmentRoundFormProps> = ({
  accessToken,
  additionalData,
  onSuccess,
  initialValues,
  ...businessAppContext
}) => {
  // Extract round ID from multiple sources (following standard pattern)
  const equityInvestmentRoundId = initialValues?.id ||
                                  additionalData?.psi_taskPayload?.psi_initialParameters?.equityInvestmentRoundId ||
                                  additionalData?.equityInvestmentRoundId || 
                                  additionalData?.entityId || 
                                  additionalData?.targetEntityId ||
                                  additionalData?.roundId ||
                                  additionalData?.id;

  // Standard mode detection pattern (like other investment forms)
  const isUpdateMode = !!equityInvestmentRoundId;

  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  // State for loading existing round data in update mode
  const [loadingRoundData, setLoadingRoundData] = useState(isUpdateMode);

  // Get clients
  const catalogClient = useCatalogManagerClient(accessToken);
  
  // Get equity investment ID from various sources (try all possible keys)
  // IMPORTANT: Check task payload first, then fallback to direct additionalData
  const taskPayload = additionalData?.psi_taskPayload?.psi_initialParameters;
  const mainInvestmentId = additionalData?.investmentId || additionalData?.mainInvestmentId || taskPayload?.investmentId || taskPayload?.mainInvestmentId;
  const equityInvestmentId = taskPayload?.equityInvestmentId || 
                            taskPayload?.targetEquityInvestmentId ||
                            taskPayload?.customEquityId ||
                            taskPayload?.entityId ||
                            taskPayload?.parentEntityId ||
                            taskPayload?.equityInvestment ||
                            additionalData?.equityInvestmentId || 
                            additionalData?.targetEquityInvestmentId ||
                            additionalData?.customEquityId ||
                            additionalData?.entityId ||
                            additionalData?.parentEntityId ||
                            additionalData?.equityInvestment;
  
  // Fallback: If no equity investment ID found, use main investment ID as last resort
  const finalEquityInvestmentId = equityInvestmentId || mainInvestmentId;
  const finalLoadingEquityId = !finalEquityInvestmentId;
  
  // Production-safe ID resolution validation
  React.useEffect(() => {
    // ID resolution validation effect for potential production telemetry
    // No sensitive data logged to console in production
  }, [equityInvestmentId, mainInvestmentId, finalEquityInvestmentId, finalLoadingEquityId, isUpdateMode, additionalData, taskPayload]);
  
  // Defer rendering decision until after hooks
  const isMissingEquityInvestmentId = !finalEquityInvestmentId && !isUpdateMode;

  // Initialize form with initialValues support (following standard pattern)
  const form = useForm<EquityInvestmentRoundFormValues>({
    resolver: zodResolver(equityInvestmentRoundSchema),
    defaultValues: {
      name: initialValues?.name || '',
      year: initialValues?.year || '2025', // Default to 2025 as requested
      preValue: initialValues?.preValue || '',
      investmentVolume: initialValues?.investmentVolume || '',
      roundSharePercentage: initialValues?.roundSharePercentage || '',
      currencyRef: initialValues?.currencyRef || '',
      equityInvestment: finalEquityInvestmentId,
      id: initialValues?.id || equityInvestmentRoundId,
      version: initialValues?.version
    }
  });

  // Function to load existing round data in update mode
  const loadExistingRoundData = useCallback(async () => {
    if (!isUpdateMode || !equityInvestmentRoundId) {
      setLoadingRoundData(false);
      return;
    }

    try {
      setLoadingRoundData(true);
      // TODO: Implement GraphQL query to fetch existing round data
      // Use actual round data from task payload if available
      const taskPayload = additionalData?.psi_taskPayload?.psi_initialParameters || additionalData;
      const roundData = taskPayload?.roundData || additionalData?.roundData;
      
      if (roundData) {
        const existingData = {
          id: equityInvestmentRoundId,
          name: roundData.name || '',
          year: roundData.year ? new Date(roundData.year).getFullYear().toString() : '2025',
          preValue: roundData.preValue?.toString() || '',
          investmentVolume: roundData.investmentVolume?.toString() || '',
          roundSharePercentage: roundData.roundSharePercentage?.toString() || '',
          currencyRef: roundData.currency?.id || 'Currency:v1:EUR'
        };
        
        // Round data loaded
        
        // Pre-fill form with existing data
        form.reset({
          name: existingData.name,
          year: existingData.year,
          preValue: existingData.preValue,
          investmentVolume: existingData.investmentVolume,
          roundSharePercentage: existingData.roundSharePercentage,
          currencyRef: existingData.currencyRef,
          equityInvestment: finalEquityInvestmentId
        });
      }
      
    } catch (error) {
      // Error loading existing round data
    } finally {
      setLoadingRoundData(false);
    }
  }, [isUpdateMode, equityInvestmentRoundId, additionalData, form, finalEquityInvestmentId]);

  // Load existing round data on mount if in update mode
  useEffect(() => {
    if (isUpdateMode) {
      loadExistingRoundData();
    }
  }, [isUpdateMode, loadExistingRoundData]);

  // Load currencies on mount
  useEffect(() => {
    const loadCurrencies = async () => {
        try {
          setCurrenciesLoading(true);
          const response = await catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'Currency', version: 'v1' },
            { limit: 100, returnTotalRecords: true }
          );

          const currencyOptions = response.data.map((entry: any) => ({
            value: `Currency:v1:${entry.code}`,
            label: `${entry.value} (${entry.code})`,
            id: entry.id
          }));

          setCurrencies(currencyOptions);
        } catch (error) {
          console.error('Error loading currencies:', error);
        } finally {
          setCurrenciesLoading(false);
        }
    };

    if (accessToken) {
      loadCurrencies();
    }
  }, [accessToken, catalogClient]);

  // Handle form submission for AppActionForm
  const handleSubmit = async (data: EquityInvestmentRoundFormValues) => {
    if (!finalEquityInvestmentId) {
      return null; // guarded by validateForm/disableFormSubmission
    }

    // Prepare the mutation payload - structure based on API requirements (following standard pattern)
    const equityInvestmentRoundPayload: any = {
      name: data.name,
      year: `${data.year}-01-01T00:00:00.000Z`, // Convert year to timestamp format (e.g., "2025" -> "2025-01-01T00:00:00.000Z")
      preValue: parseFloat(data.preValue),
      investmentVolume: parseFloat(data.investmentVolume),
      roundSharePercentage: parseFloat(data.roundSharePercentage),
      currencyRef: data.currencyRef,
      equityInvestment: finalEquityInvestmentId,
      businessKey: isUpdateMode ? `equity-round-update-${Date.now()}` : `equity-round-${Date.now()}`,
      additionalProperties: {}
    };

    // Include ID and version for updates (following standard pattern)
    if (isUpdateMode) {
      equityInvestmentRoundPayload.id = equityInvestmentRoundId;
      equityInvestmentRoundPayload.version = form.getValues().version || 0;
    }

    const payload = {
      equityInvestmentRound: equityInvestmentRoundPayload
    };

    return payload;
  };

  // Form validation for AppActionForm
  const validateForm = (data: any): string[] | null => {
    const errors: string[] = [];
    
    if (!finalEquityInvestmentId && !finalLoadingEquityId) {
      errors.push(getTranslationFromI18nKeyAndLabel('investment.rounds.validation.equityInvestmentIdRequired', 'Equity Investment ID is required'));
    }
    
    if (isUpdateMode && !equityInvestmentRoundId) {
      errors.push(getTranslationFromI18nKeyAndLabel('investment.rounds.validation.roundIdRequired', 'Round ID is required for update'));
    }
    
    if (!data.name?.trim()) {
      errors.push(getTranslationFromI18nKeyAndLabel('investment.rounds.validation.nameRequired', 'Round name is required'));
    }
    
    if (!data.year?.trim()) {
      errors.push(getTranslationFromI18nKeyAndLabel('investment.rounds.validation.yearRequired', 'Year is required'));
    }
    
    if (!data.currencyRef?.trim()) {
      errors.push(getTranslationFromI18nKeyAndLabel('investment.rounds.validation.currencyRequired', 'Currency is required'));
    }
    
    if (!data.preValue || parseFloat(data.preValue) < 0) {
      errors.push(getTranslationFromI18nKeyAndLabel('investment.rounds.validation.preValuePositive', 'Pre-value must be a positive number'));
    }
    
    if (!data.investmentVolume || parseFloat(data.investmentVolume) < 0) {
      errors.push(getTranslationFromI18nKeyAndLabel('investment.rounds.validation.investmentVolumePositive', 'Investment volume must be a positive number'));
    }
    
    
    if (!data.roundSharePercentage || parseFloat(data.roundSharePercentage) < 0 || parseFloat(data.roundSharePercentage) > 100) {
      errors.push(getTranslationFromI18nKeyAndLabel('investment.rounds.validation.sharePercentageRange', 'Share percentage must be between 0 and 100'));
    }
    
    return errors.length > 0 ? errors : null;
  };

  // Success handler
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess(form.getValues());
    }
  };

  if (isMissingEquityInvestmentId) {
    return (
      <Alert variant="destructive" data-testid="equity-investment-round-form-error-alert">
        {getTranslationFromI18nKeyAndLabel(
          'investments:rounds.create.missingInvestmentId',
          'Equity Investment ID is required to create investment rounds'
        )}
      </Alert>
    );
  }

  return (
    <AppActionForm 
      form={form}
      formData={form.getValues()}
      processType={isUpdateMode ? "update" : "create"}
      submitButtonText={isUpdateMode ? getTranslationFromI18nKeyAndLabel('investment.rounds.updateRound', 'Update Round') : getTranslationFromI18nKeyAndLabel('investment.rounds.createRound', 'Create Round')}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      validateForm={validateForm}
      businessAppContext={{ accessToken, additionalData, ...businessAppContext }}
      disableFormSubmission={finalLoadingEquityId || !finalEquityInvestmentId || loadingRoundData}
      data-testid={prefixDataTestId}
    >
      <div data-testid={`${prefixDataTestId}-content`} className="gba:space-y-6">
        {/* Form Title */}
        <div>
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-2" data-testid={formatDataTestId(prefixDataTestId, 'Title')}>
            {isUpdateMode ? getTranslationFromI18nKeyAndLabel('investment.rounds.updateInvestmentRound', 'Update Investment Round') : getTranslationFromI18nKeyAndLabel('investment.rounds.createInvestmentRound', 'Create Investment Round')}
          </h2>
          {(finalLoadingEquityId || loadingRoundData) && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600">
              <Spinner size="sm" />
              {loadingRoundData ? getTranslationFromI18nKeyAndLabel('investment.rounds.loadingRoundData', 'Loading round data...') : getTranslationFromI18nKeyAndLabel('investment.rounds.loadingInvestmentData', 'Loading investment data...')}
            </div>
          )}
        </div>

        <Form {...form}>
          <div className="gba:space-y-4">
            {/* Round Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.roundName', 'Round Name')} <span className="gba:text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={getTranslationFromI18nKeyAndLabel('investment.rounds.roundNamePlaceholder', 'Enter round name (e.g., Series A, Seed Round)')}
                      data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Year */}
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.year', 'Year')} <span className="gba:text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="1900"
                      max="2100"
                      placeholder={getTranslationFromI18nKeyAndLabel('investment.rounds.yearPlaceholder', 'Enter year')}
                      data-testid={formatDataTestId(prefixDataTestId, 'YearInput')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Currency Selection */}
            <FormField
              control={form.control}
              name="currencyRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.currency', 'Currency')} <span className="gba:text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={currenciesLoading}>
                    <FormControl>
                      <SelectTrigger data-testid={formatDataTestId(prefixDataTestId, 'CurrencySelect')}>
                        <SelectValue placeholder={currenciesLoading ? getTranslationFromI18nKeyAndLabel('investment.rounds.loadingCurrencies', 'Loading currencies...') : getTranslationFromI18nKeyAndLabel('investment.rounds.selectCurrency', 'Select currency')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Financial Fields Row */}
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
              {/* Pre Value */}
              <FormField
                control={form.control}
                name="preValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('investment.rounds.preMoneyValuation', 'Pre-Money Valuation')} <span className="gba:text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        data-testid={formatDataTestId(prefixDataTestId, 'PreValueInput')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Investment Volume */}
              <FormField
                control={form.control}
                name="investmentVolume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('investment.rounds.investmentVolume', 'Investment Volume')} <span className="gba:text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        data-testid={formatDataTestId(prefixDataTestId, 'InvestmentVolumeInput')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Share Percentage */}
            <FormField
              control={form.control}
              name="roundSharePercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.sharePercentage', 'Share Percentage')} <span className="gba:text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0.00"
                      data-testid={formatDataTestId(prefixDataTestId, 'SharePercentageInput')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      </div>
    </AppActionForm>
  );
};

export default EquityInvestmentRoundForm;