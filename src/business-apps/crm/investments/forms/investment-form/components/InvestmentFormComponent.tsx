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
import { useGetInvestmentById, useGetInvestmentOpportunityById } from '@/common/data/investment';
import { getInvestmentGroupFromContext } from '../utils/investmentDataTransformer';
import { createInvestmentFormResolver } from '../utils/investmentFormSchema';
import { InvestmentFormValues } from '../types';
import { buildInvestmentPayload } from '@/common/data/investment';
import { mapOpportunityToInvestmentFormValues } from '../utils/opportunityToInvestmentMapper';

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
  
  // Add the investment and opportunity fetch hooks
  const { fetchInvestmentById } = useGetInvestmentById(businessAppContext);
  const { fetchInvestmentOpportunityById } = useGetInvestmentOpportunityById(businessAppContext);
  
  // UI state
  const [currentStep, setCurrentStep] = useState<FormStep>('select');
  const [isLoadingInvestment, setIsLoadingInvestment] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [skipAutoDetection, setSkipAutoDetection] = useState(false);

  // Store raw investment data for payload building
  const [rawInvestmentData, setRawInvestmentData] = useState<any>(null);

  // Extract investmentId and opportunityId from additionalData
  const externalInvestmentId = formValues.investment.id || 
    businessAppContext.additionalData?.investmentId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId;
  const externalOpportunityId = 
    businessAppContext.additionalData?.opportunityId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId;
  const preSelectedGroup = getInvestmentGroupFromContext(businessAppContext.additionalData);
  const isUpdate = Boolean(externalInvestmentId);
  
  // Helper function to detect if current context is Overview tab
  const isOverviewContext = () => {
    const additionalData = businessAppContext.additionalData;
    const fromSubView = additionalData?.fromSubView || additionalData?.subView;
    return fromSubView === 'overview' || fromSubView === 'all' || (!fromSubView && !preSelectedGroup);
  };


  // Liquid fund flow states
  // NOTE: Form state can store catalog objects or string IDs (for backward compatibility)
  // Extract ID from object if needed: object.id or string directly
  const getGroupId = (group: any): string => {
    if (!group) return '';
    return typeof group === 'object' ? group.id : group;
  };
  const groupId = getGroupId(formValues.investment.investmentGroup);
  const groupCode = groupId?.split(':').pop();
  const isLiquidFund = groupCode === 'LIQUID_FUND';
  const hasInvestmentType = Boolean(formValues.investment.investmentType);
  const hasLiquidFundType = Boolean(formValues.liquidFundInvestment?.investmentLiquidFundType);

  // Clean workflow initialization
  useEffect(() => {
    const initializeForm = async () => {
        setIsLoadingInvestment(true);
        setLoadingError(null);
        
        try {
        // Step 1: Investment group & type hierarchy is loaded by context
        
        // Step 2: Conditional flow based on opportunityId or investmentId
        if (externalOpportunityId && !externalInvestmentId) {
          // Opportunity pre-fill mode: Load opportunity data and map to investment form
          const { opportunity } = await fetchInvestmentOpportunityById(externalOpportunityId);
          
          if (opportunity) {
            // Extract form fields definition directly from the opportunity's investment group
            // The opportunity already contains the full catalog entry with objectValue.formFields
            const formFieldsDefinition = opportunity.investmentGroup?.objectValue as any;
            
            // Map ALL fields (static + dynamic) using the form fields definition from opportunity
            const allMappedValues = mapOpportunityToInvestmentFormValues(opportunity, formFieldsDefinition);
            
            setFormValues(allMappedValues);
            setCurrentStep('form');
          } else {
            setLoadingError('Opportunity not found');
          }
        } else if (externalInvestmentId) {
          // Update mode: Execute GET_INVESTMENT_BY_ID
          const result = await fetchInvestmentById(externalInvestmentId);
          const rawInvestment = result?.investment;
          
          if (rawInvestment) {
            // Store raw investment data for payload building
            setRawInvestmentData(rawInvestment);
            
            // Validate investment has required data
            if (!rawInvestment.investmentGroup) {
              setLoadingError('Investment must have a group');
              return;
            }
            
            // Prepare form data in nested structure
            // NOTE: Form state stores FULL OBJECTS for catalog/entity fields
            // This avoids redundant API calls and simplifies component code
            const nestedFormData: InvestmentFormValues = {
              investment: {
                id: rawInvestment.id,
                version: (rawInvestment as any).version || 1,
                name: rawInvestment.name || '',
                investmentGroup: rawInvestment.investmentGroup, // Full catalog object
                ownerEmployee: rawInvestment.ownerEmployee, // Full employee object
                investmentStatus: rawInvestment.investmentStatus || { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' },
                ...(rawInvestment.code && { code: rawInvestment.code }),
                ...(rawInvestment.currency && { currency: rawInvestment.currency }), // Full catalog object
                ...(rawInvestment.investmentAccount && { investmentAccount: rawInvestment.investmentAccount }), // Full account object
                ...(rawInvestment.investmentType && { investmentType: rawInvestment.investmentType }), // Full catalog object
              },
              // Load subtype data (keep full catalog objects)
              ...((rawInvestment as any).liquidFundInvestment?.[0]?.investmentLiquidFundType && {
                liquidFundInvestment: {
                  investmentLiquidFundType: (rawInvestment as any).liquidFundInvestment[0].investmentLiquidFundType, // Full catalog object
                }
              }),
            };
            
            // Set form values immediately (dynamic fields will be mapped separately after catalog loads)
            setFormValues(nestedFormData);
            setCurrentStep('form');
          } else {
            setLoadingError('Investment not found');
          }
      } else if (preSelectedGroup) {
          // Create mode with pre-selected group: Skip selection step, show investment segment
          // NOTE: Form state stores full objects (or IDs for backward compatibility)
          // For preSelectedGroup, it's already a string ID - create minimal object
          setFormValues({ 
            investment: {
              investmentGroup: { id: preSelectedGroup } as any, // Minimal catalog object (will be enriched by components)
              ownerEmployee: currentEmployee as any, // Full employee object
              name: '',
              investmentStatus: { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' } as any, // Default status as object
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
  }, [externalInvestmentId, externalOpportunityId, preSelectedGroup]);


  // Handle group selection from SelectSegment
  const handleGroupSelect = (group: string) => {
    // Clean form values when switching groups in create mode
    // NOTE: Form state stores full objects for catalog/entity fields
    // Preserve existing owner if it exists, fallback to currentEmployee
    const preservedOwner = formValues.investment.ownerEmployee || currentEmployee;
    
    setFormValues({ 
      investment: {
        ownerEmployee: preservedOwner as any, // Full employee object
        name: formValues.investment.name || '',
        investmentGroup: { id: group } as any, // Minimal catalog object (will be enriched by components)
        investmentStatus: { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' } as any, // Default status as object
        // Explicitly clear type and other fields when group changes
        investmentType: undefined,
        currency: undefined,
        investmentAccount: undefined,
        // Keep system fields if updating
        ...(isUpdate && { 
          id: formValues.investment.id, 
          version: formValues.investment.version 
        }),
      } as any,
      // Clear all subtype data when group changes
      equityInvestment: undefined,
      realEstateInvestment: undefined,
      liquidFundInvestment: undefined,
    } as Partial<InvestmentFormValues>);
    // Reset skip auto-detection flag after selection
    setSkipAutoDetection(false);
    setCurrentStep('form');
  };

  // Handle going back to group selection (only for create mode without pre-selected group)
  const handleBack = () => {
    if (!isUpdate && !preSelectedGroup) {
      // Preserve the owner employee when going back, clear everything else
      const preservedOwner = formValues.investment.ownerEmployee || currentEmployee;
      
      // Create a new form state with only ownerEmployee preserved
      const newFormValues: Partial<InvestmentFormValues> = {
        investment: { 
          ownerEmployee: preservedOwner,
          name: '',
          investmentStatus: { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' } as any,
          // Explicitly set to undefined to clear them
          investmentGroup: undefined,
          investmentType: undefined,
          currency: undefined,
          investmentAccount: undefined,
        } as any,
        // Clear all subtype data
        equityInvestment: undefined,
        realEstateInvestment: undefined,
        liquidFundInvestment: undefined,
      };
      
      setFormValues(newFormValues);
      // Skip auto-detection when user explicitly clicks Back button
      setSkipAutoDetection(true);
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
      if (formValues.investment.investmentType) { // Without Ref suffix
        try {
          const fieldsDef = getFormFieldsDefinition();
          setFormFieldsDefinition(fieldsDef);
        } catch (error) {
          console.error('Error loading form fields for validation:', error);
        }
      }
    };
    
    loadFormFields();
  }, [formValues.investment.investmentGroup, formValues.investment.investmentType, formValues.liquidFundInvestment?.investmentLiquidFundType, getFormFieldsDefinition]); // Without Ref suffixes
  
  const formResolver = createInvestmentFormResolver(formFieldsDefinition);
  
  // Form already uses nested structure - no transformation needed!
  const form = useForm<InvestmentFormValues>({
    resolver: formResolver as any,
    values: formValues, // Direct nested structure
    resetOptions: {
      keepDirtyValues: true, // Preserve user input during resets
    },
  });

  // Watch the currency field for real-time updates (without Ref suffix)
  const selectedCurrencyRef = useWatch({
    control: form.control,
    name: 'investment.currency', // Without Ref suffix
  });
  
  // Load currency entry when currency changes
  useEffect(() => {
    const loadCurrencyEntry = async () => {
      if (!selectedCurrencyRef || !businessAppContext.accessToken) {
        setCurrencyEntry(null);
        return;
      }
      
      // If selectedCurrencyRef is already a catalog object, use it directly
      if (typeof selectedCurrencyRef === 'object' && selectedCurrencyRef.id) {
        setCurrencyEntry(selectedCurrencyRef);
        return;
      }
      
      try {
        // selectedCurrencyRef is a string ID (e.g., "Currency:v1:EUR")
        const response = await catalogClient.getCatalogEntryById(selectedCurrencyRef as unknown as string);
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
          {...businessAppContext}
          onGroupSelect={handleGroupSelect}
          skipAutoDetection={skipAutoDetection}
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
            // Merge context data (selections) with form data (user input) to get complete state
            const mergedData = {
              investment: {
                ...formValues.investment,  // Context data (selections, defaults)
                ...formData.investment     // Form data (user input)
              },
              equityInvestment: formData.equityInvestment || formValues.equityInvestment,
              realEstateInvestment: formData.realEstateInvestment || formValues.realEstateInvestment,
              liquidFundInvestment: formData.liquidFundInvestment || formValues.liquidFundInvestment,
            };
            
            const payload = buildInvestmentPayload(mergedData, businessAppContext, { 
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
                  currentInvestmentType={
                    typeof formValues.investment.investmentType === 'object' 
                      ? formValues.investment.investmentType.id 
                      : (formValues.investment.investmentType || '')
                  }
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