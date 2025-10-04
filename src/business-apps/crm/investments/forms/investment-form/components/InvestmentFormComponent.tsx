import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button, Badge } from '@newwork/nw-design-system';
import { PiSwap } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { AppActionForm } from '@/components/app-action-form';
import { useInvestmentFormContext } from '../context/InvestmentFormContext';
import { 
  GroupSelectSegment, 
  InvestmentSegment,
  TypeSelectSegment,
  LiquidFundTypeSelectSegment,
  DynamicSegment
} from './segments';
import { getCurrencySymbol } from '@/common/utils/currencyUtils';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { useGetInvestmentById } from '@/common/data/investment';
import { getInvestmentGroupFromContext } from '../utils/investmentDataTransformer';
import { createInvestmentFormResolver } from '../utils/investmentFormSchema';
import { InvestmentFormValues } from '../types';
import { buildInvestmentPayload } from '@/common/data/investment';

const prefixDataTestId = 'InvestmentForm';




type FormStep = 'select' | 'form';

export const InvestmentFormComponent: React.FC = () => {
  const {
    businessAppContext, 
    formValues,
    setFormValues,
    getFormFieldsDefinition,
    currentEmployee,
  } = useInvestmentFormContext();
  
  // Add the investment fetch hook
  const { fetchInvestmentById } = useGetInvestmentById(businessAppContext);
  
  // UI state
  const [currentStep, setCurrentStep] = useState<FormStep>('select');
  const [isLoadingInvestment, setIsLoadingInvestment] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Store raw investment data for payload building
  const [rawInvestmentData, setRawInvestmentData] = useState<any>(null);

  // Extract investmentId the same way as lead forms
  const externalInvestmentId = formValues.investment.id || 
    businessAppContext.additionalData?.investmentId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId;
  const preSelectedGroup = getInvestmentGroupFromContext(businessAppContext.additionalData);
  const isUpdate = Boolean(externalInvestmentId);
  
  // Helper function to detect if current context is Overview tab
  const isOverviewContext = () => {
    const additionalData = businessAppContext.additionalData;
    const fromSubView = additionalData?.fromSubView || additionalData?.subView;
    return fromSubView === 'overview' || fromSubView === 'all' || (!fromSubView && !preSelectedGroup);
  };


  // Liquid fund flow states
  const groupCode = formValues.investment.investmentGroupRef?.split(':').pop();
  const isLiquidFund = groupCode === 'LIQUID_FUND';
  const hasInvestmentType = Boolean(formValues.investment.investmentTypeRef);
  const hasLiquidFundType = Boolean(formValues.liquidFundInvestment?.investmentLiquidFundTypeRef);

  // Clean workflow initialization
  useEffect(() => {
    const initializeForm = async () => {
        setIsLoadingInvestment(true);
        setLoadingError(null);
        
        try {
        // Step 1: Investment group & type hierarchy is loaded by context
        
        // Step 2: Conditional flow based on investmentId
        if (externalInvestmentId) {
          // Update mode: Execute GET_INVESTMENT_BY_ID
          const result = await fetchInvestmentById(externalInvestmentId);
          const rawInvestment = result?.investment;
          
          if (rawInvestment) {
            // Store raw investment data for payload building
            setRawInvestmentData(rawInvestment);
            
            // Step 3: Investment always has a group - extract and show investment segment
            const groupCode = rawInvestment.investmentGroup?.code;
            const typeCode = rawInvestment.investmentType?.code;
            
            if (!groupCode) {
              setLoadingError('Investment must have a group');
              return;
            }
            
            // Build catalog refs
            const groupRef = `InvestmentGroup:v1:${groupCode}`;
            const typeRef = typeCode ? `InvestmentType:v1:${typeCode}` : '';
            
            // Prepare form data in nested structure
            const nestedFormData: InvestmentFormValues = {
              investment: {
                id: rawInvestment.id,
                version: (rawInvestment as any).version || 1,
                name: rawInvestment.name || '',
                initialInvestmentAmount: rawInvestment.initialInvestmentAmount || '',
                investmentGroupRef: groupRef,
                ownerEmployee: rawInvestment.ownerEmployee?.id || '',
                investmentStatusRef: rawInvestment.investmentStatus?.id || 'InvestmentStatus:v1:ACTIVE',
                ...(rawInvestment.code && { code: rawInvestment.code }),
                ...(rawInvestment.currency?.id && { currencyRef: rawInvestment.currency.id }),
                ...(rawInvestment.investmentAccount?.id && { investmentAccount: rawInvestment.investmentAccount.id }),
                ...(typeRef && { investmentTypeRef: typeRef }),
              },
              // Load subtype data (for liquid funds, this includes investmentLiquidFundTypeRef)
              ...((rawInvestment as any).liquidFundInvestment?.[0]?.investmentLiquidFundType && {
                liquidFundInvestment: {
                  investmentLiquidFundTypeRef: (rawInvestment as any).liquidFundInvestment[0].investmentLiquidFundType.id || '',
                }
              }),
              // Form helper fields for selects (accountId is for UX, not sent to API)
              accountId: rawInvestment.investmentAccount?.id || '',
            };
            
            // Set form values immediately (dynamic fields will be mapped separately after catalog loads)
            setFormValues(nestedFormData);
            setCurrentStep('form');
          } else {
            setLoadingError('Investment not found');
          }
      } else if (preSelectedGroup) {
          // Create mode with pre-selected group: Skip selection step, show investment segment
          setFormValues({ 
            investment: {
              investmentGroupRef: preSelectedGroup,
              ownerEmployee: currentEmployee?.id || businessAppContext.userInfo?.employeeDetails?.employeeId || '',
              name: '',
              initialInvestmentAmount: '',
              investmentStatusRef: 'InvestmentStatus:v1:ACTIVE',
            }
          } as Partial<InvestmentFormValues>);
        setCurrentStep('form');
      } else {
          // Create mode without group: Start with group selection step
        setCurrentStep('select');
          }
    } catch (err) {
        console.error('Error initializing form:', err);
        setLoadingError(err instanceof Error ? err.message : 'Failed to initialize form');
    } finally {
          setIsLoadingInvestment(false);
      }
    };

    initializeForm();
  }, [externalInvestmentId, preSelectedGroup]);


  // Handle group selection from SelectSegment
  const handleGroupSelect = (group: string) => {
    // Clean form values when switching groups in create mode
    // Preserve existing owner if it exists, fallback to currentEmployee or businessAppContext
    const preservedOwnerId = formValues.investment.ownerEmployee || 
                           currentEmployee?.id || 
                           businessAppContext.userInfo?.employeeDetails?.employeeId || 
                           '';
    
    const cleanFormValues: InvestmentFormValues = {
      investment: {
        ownerEmployee: preservedOwnerId,
        name: formValues.investment.name || '',
        initialInvestmentAmount: '',
        investmentGroupRef: group,
        investmentStatusRef: 'InvestmentStatus:v1:ACTIVE',
        // Keep system fields if updating
        ...(isUpdate && { 
          id: formValues.investment.id, 
          version: formValues.investment.version 
        }),
      }
    };
    
    setFormValues(cleanFormValues);
    setCurrentStep('form');
  };

  // Handle going back to group selection (only for create mode without pre-selected group)
  const handleBack = () => {
    if (!isUpdate && !preSelectedGroup) {
      // Preserve the owner employee when going back
      const preservedOwnerId = formValues.investment.ownerEmployee || 
                             currentEmployee?.id || 
                             businessAppContext.userInfo?.employeeDetails?.employeeId || 
                             '';
      setFormValues({ 
        investment: { ownerEmployee: preservedOwnerId }
      } as Partial<InvestmentFormValues>);
      setCurrentStep('select');
    }
  };

  // Create form resolver based on current form state and dynamic fields
  const [formFieldsDefinition, setFormFieldsDefinition] = useState<any>(null);
  
  // State to store the current currency catalog entry
  const [currencyEntry, setCurrencyEntry] = useState<any>(null);
  
  const catalogClient = useCatalogManagerClient(businessAppContext.accessToken);
  
  // Get form fields definition for validation
  useEffect(() => {
    const loadFormFields = async () => {
      if (formValues.investment.investmentTypeRef) {
        try {
          const fieldsDef = getFormFieldsDefinition();
          setFormFieldsDefinition(fieldsDef);
        } catch (error) {
          console.error('Error loading form fields for validation:', error);
        }
      }
    };
    
    loadFormFields();
  }, [formValues.investment.investmentGroupRef, formValues.investment.investmentTypeRef, formValues.liquidFundInvestment?.investmentLiquidFundTypeRef, getFormFieldsDefinition]);
  
  const formResolver = createInvestmentFormResolver(formFieldsDefinition);
  
  // Form already uses nested structure - no transformation needed!
  const form = useForm<InvestmentFormValues>({
    resolver: formResolver as any,
    values: formValues, // Direct nested structure
    resetOptions: {
      keepDirtyValues: true, // Preserve user input during resets
    },
  });

  // Watch the currencyRef field for real-time updates
  const selectedCurrencyRef = useWatch({
    control: form.control,
    name: 'investment.currencyRef',
  });
  
  // Load currency entry when currencyRef changes
  useEffect(() => {
    const loadCurrencyEntry = async () => {
      if (!selectedCurrencyRef || !businessAppContext.accessToken) {
        setCurrencyEntry(null);
        return;
      }
      
      try {
        // selectedCurrencyRef is the catalog entry ID (e.g., "Currency:v1:EUR")
        const response = await catalogClient.getCatalogEntryById(selectedCurrencyRef);
        setCurrencyEntry(response);
      } catch (error) {
        console.error('Error loading currency entry:', error);
        setCurrencyEntry(null);
      }
    };
    
    loadCurrencyEntry();
  }, [selectedCurrencyRef, businessAppContext.accessToken, catalogClient]);
  
  // Get currency symbol from currency entry or raw investment data
  const currencySymbol = useMemo(() => {
    // Priority 1: Use the currently selected currency from the form
    if (currencyEntry) {
      return getCurrencySymbol(currencyEntry);
    }
    
    // Priority 2: Try to get from raw investment data (for update mode initial load)
    if (rawInvestmentData?.currency) {
      return getCurrencySymbol(rawInvestmentData.currency);
    }
    
    // Fallback to empty string (user needs to select currency)
    return '';
  }, [currencyEntry, rawInvestmentData]);


  // Show loading spinner
  if (isLoadingInvestment) {
  return (
      <div className="gba:flex gba:justify-center gba:items-center gba:p-8" data-testid={`${prefixDataTestId}-loading`}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
          <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary" />
          <p className="gba:text-muted-foreground">Loading investment data...</p>
                </div>
              </div>
    );
  }

  // Show error state
  if (loadingError) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:p-8" data-testid={`${prefixDataTestId}-error`}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:max-w-md gba:text-center">
          <h3 className="gba:text-lg gba:font-semibold gba:text-destructive">Error Loading Investment</h3>
          <p className="gba:text-muted-foreground">{loadingError}</p>
          <div className="gba:flex gba:gap-2 gba:mt-2">
            <Button
              variant="outline" 
              onClick={() => window.location.reload()}
              data-testid={`${prefixDataTestId}-retry-button`}
            >
              Retry
            </Button>
            <Button
              variant="ghost" 
              onClick={() => window.history.back()}
              data-testid={`${prefixDataTestId}-back-button`}
            >
              Go Back
            </Button>
                </div>
              </div>
            </div>
    );
  }

  // Show group selection step
  if (currentStep === 'select') {
    return (
      <div data-testid={`${prefixDataTestId}-group-selection`}>
        <GroupSelectSegment 
          onGroupSelect={handleGroupSelect} 
          {...businessAppContext}
        />
      </div>
    );
  }

  // Show main form step
  

  return (
      <AppActionForm
        form={form} 
        formData={formValues}
        processType={isUpdate ? 'update' : 'create'}
        submitButtonText={isUpdate ? 'Update' : 'Create'}
        onSubmit={async (formData) => {
          try {
            const payload = buildInvestmentPayload(formData, businessAppContext, { 
              isUpdate, 
              rawInvestmentData 
            });
            return payload;
          } catch (error) {
            console.error('❌ Error building payload:', error);
            throw error;
          }
        }}
        businessAppContext={businessAppContext}
        data-testid={`${prefixDataTestId}-form`}
      >
      <div data-testid={`${prefixDataTestId}-content`} className="gba:space-y-6">
        
        {/* Group Display Header (only show for overview context) */}
        {groupCode && isOverviewContext() && (
          <div 
            data-testid={`${prefixDataTestId}-selected-group`}
          >
            {/* Back Button for overview context (only in create mode) */}
            {!isUpdate ? (
              <Badge 
                variant="secondary" 
                className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:font-medium gba:cursor-pointer gba:transition-colors gba:hover:bg-accent"
                onClick={handleBack}
                data-testid={formatDataTestId(`${prefixDataTestId}-back-badge`)}
              >
                Back
                <PiSwap className="gba:w-3.5 gba:h-3.5 gba:opacity-70" />
              </Badge>
            ) : null}
            </div>
          )}

              {/* Investment Basic Information */}
              <InvestmentSegment />

              {/* Investment Type Selector */}
              <TypeSelectSegment currentGroup={groupCode || ''} isUpdate={isUpdate} />

              {/* Liquid Fund Type Selector (for liquid funds with investment type selected) */}
              {isLiquidFund && hasInvestmentType && (
                <LiquidFundTypeSelectSegment 
                  currentInvestmentType={formValues.investment.investmentTypeRef || ''} 
                  isUpdate={isUpdate}
                />
              )}

        {/* Dynamic Fields - Conditional Display:
             - For NON-liquid funds: Show when investment type is selected
             - For liquid funds: Show when BOTH investment type AND liquid fund type are selected */}
        {((hasInvestmentType && !isLiquidFund) || 
            (isLiquidFund && hasInvestmentType && hasLiquidFundType)) && (
          <DynamicSegment
            currencySymbol={currencySymbol}
            testIdPrefix={prefixDataTestId}
            rawInvestmentData={rawInvestmentData}
            isUpdate={isUpdate}
          />
        )}
          </div>
      </AppActionForm>
  );
};

export default InvestmentFormComponent; 