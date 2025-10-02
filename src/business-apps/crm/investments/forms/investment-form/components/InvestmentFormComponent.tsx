import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Badge } from '@newwork/nw-design-system';
import { PiSwap } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { AppActionForm } from '@/components/app-action-form';
import { useInvestmentFormContext } from '../context/InvestmentFormContext';
import { 
  GroupSelectSegment, 
  InvestmentSegment, 
  DynamicGroupSegment
} from './segments';
import InvestmentTypeSelector from './InvestmentTypeSelector';
import InvestmentLiquidFundTypeSelector from './InvestmentLiquidFundTypeSelector';
import { useGetInvestmentById } from '@/common/data/investment';
import { getInvestmentGroupFromContext } from '../utils/investmentDataTransformer';
import { createInvestmentFormResolver } from '../utils/investmentFormSchema';
import { InvestmentFormValues } from '../types';
import { buildInvestmentPayload } from '@/common/data/investment';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getValueByPath } from '@/common/utils/objectUtils';

const prefixDataTestId = 'InvestmentForm';

// ============================================================================
// CLEAN ARCHITECTURE: Data Transformation Layer
// ============================================================================

/**
 * Unified data transformation hook that computes all derived fields
 * Eliminates the need for manual synchronization and workarounds
 */
const useUnifiedInvestmentData = (
  rawFormValues: InvestmentFormValues,
  businessAppContext: BusinessAppContextProps,
  currentEmployee?: any
): InvestmentFormValues => {
  return useMemo(() => {
    // Compute group reference
    const investmentGroupRef = rawFormValues.investmentGroupRef || 
      (rawFormValues.group ? `InvestmentGroup:v1:${rawFormValues.group}` : '');
    
    // Compute owner with clear priority order
    const ownerEmployeeId = rawFormValues.ownerEmployeeId || 
      businessAppContext.userInfo?.employeeDetails?.employeeId || 
      currentEmployee?.id || 
      '';
    
    return {
      ...rawFormValues,
      investmentGroupRef,
      ownerEmployeeId,
    };
  }, [
    // Recalculate when any form values change (including additional properties)
    rawFormValues,
    businessAppContext.userInfo?.employeeDetails?.employeeId,
    currentEmployee?.id
  ]);
};


// ============================================================================

// Helper function to extract field name from property path, matching schema logic
const getFormFieldName = (property: string): string => {
  const parts = property.split('.');
  
  // Handle additionalProperties fields with special naming
  if (parts.includes('additionalProperties') && parts.length >= 3) {
    const additionalPropsIndex = parts.indexOf('additionalProperties');
    // Create flattened name: additionalProperties_fieldName
    const fieldName = parts.slice(additionalPropsIndex + 1).join('_');
    return `additionalProperties_${fieldName}`;
  }
  
  // Default behavior for regular fields
  return parts.pop() || property;
};

// Generic helper function to map investment data to form fields based on property paths
const mapInvestmentDataToFormFields = (rawInvestment: any, fieldsDef: any): Record<string, any> => {
  const dynamicDefaults: Record<string, any> = {};
  
  if (fieldsDef?.formFields?.length) {
    for (const group of fieldsDef.formFields) {
      for (const field of group.fields) {
        const fieldName = getFormFieldName(field.property);
        let value = getValueByPath(rawInvestment, field.property);
        
        // SPECIAL FIX: If looking for liquidFundInvestment.additionalProperties but not found,
        // try the investment.additionalProperties instead (common case for our setup)
        if (value === undefined && field.property.startsWith('liquidFundInvestment.additionalProperties.')) {
          const propertyName = field.property.replace('liquidFundInvestment.additionalProperties.', '');
          value = getValueByPath(rawInvestment, `additionalProperties.${propertyName}`);
        }
        
        if (value !== undefined && value !== null) {
          // Handle different field types
          if (field.type === 'DATE') {
            // Convert ISO datetime to YYYY-MM-DD format for date inputs
            dynamicDefaults[fieldName] = formatDateForInput(value);
          } else {
            // Convert other values to strings for form compatibility
            dynamicDefaults[fieldName] = typeof value === 'string' ? value : String(value);
          }
        }
      }
    }
  }
  
  return dynamicDefaults;
};

// Helper function to format date values for HTML date inputs
const formatDateForInput = (dateValue: any): string => {
  if (!dateValue) return '';
  
  try {
    // Handle various date formats
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    // Convert to YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Failed to format date:', dateValue, error);
    return '';
  }
};




type FormStep = 'select' | 'form';

export const InvestmentFormComponent: React.FC = () => {
  const {
    businessAppContext, 
    formValues,
    setFormValues,
    getFormFieldsDefinition,
    currentEmployee,
    investmentCatalogData,
    investmentCatalogLoading
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
  const externalInvestmentId = formValues.id || 
    businessAppContext.additionalData?.investmentId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId;
  const preSelectedGroup = getInvestmentGroupFromContext(businessAppContext.additionalData);
  const isUpdate = Boolean(externalInvestmentId);
  
  // Debug logging with expanded objects
  console.log('=== InvestmentFormComponent Debug ===');
  console.log('additionalData (expanded):', JSON.stringify(businessAppContext.additionalData, null, 2));
  console.log('preSelectedGroup:', preSelectedGroup);
  console.log('isUpdate:', isUpdate);
  console.log('====================================');
  
  // Helper function to detect if current context is Overview tab
  const isOverviewContext = () => {
    const additionalData = businessAppContext.additionalData;
    const fromSubView = additionalData?.fromSubView || additionalData?.subView;
    return fromSubView === 'overview' || fromSubView === 'all' || (!fromSubView && !preSelectedGroup);
  };


  // Liquid fund flow states
  const isLiquidFund = formValues.group === 'LIQUID_FUND';
  const hasInvestmentType = Boolean(formValues.investmentTypeRef);
  const hasLiquidFundType = Boolean(formValues.investmentLiquidFundTypeRef);

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
            
             // Prepare base form data
             const baseFormData = {
               id: rawInvestment.id,
               name: rawInvestment.name || '',
               code: rawInvestment.code || '',
               ownerEmployeeId: rawInvestment.ownerEmployee?.id || '',
               version: (rawInvestment as any).version || 1,
               group: groupCode,
               investmentGroupRef: groupRef,
               investmentTypeRef: typeRef,
               // Related entities - extract from investment data
               accountId: rawInvestment.investmentAccount?.id || '',
               contactId: rawInvestment.investmentAccount?.investmentAccountContact?.[0]?.contact?.id || '',
               // Basic investment fields
              initialInvestmentAmount: rawInvestment.initialInvestmentAmount?.toString() || '',
              totalInvestmentAmount: rawInvestment.totalInvestmentAmount?.toString() || '',
              stakePercentage: rawInvestment.stakePercentage?.toString() || '',
              acquisitionDate: formatDateForInput(rawInvestment.acquisitionDate),
              // Loan fields from base investment - format dates properly
              loanRecipientName: rawInvestment.loanRecipientName || '',
              loanRecipientInvestmentAccountId: rawInvestment.loanRecipientInvestmentAccount?.id || '',
              loanAmount: rawInvestment.loanAmount?.toString() || '',
              loanOpenCommitmentAmount: rawInvestment.loanOpenCommitmentAmount?.toString() || '',
              loanInterestRate: rawInvestment.loanInterestRate?.toString() || '',
              loanStartDate: formatDateForInput(rawInvestment.loanStartDate),
              loanEndDate: formatDateForInput(rawInvestment.loanEndDate),
              loanInterestClaim: rawInvestment.loanInterestClaim?.toString() || '',
              // Liquid fund type (for liquid fund investments)
              investmentLiquidFundTypeRef: (rawInvestment as any).liquidFundInvestment?.[0]?.investmentLiquidFundType?.code 
                ? `InvestmentLiquidFundType:v1:${(rawInvestment as any).liquidFundInvestment[0].investmentLiquidFundType.code}`
                : '',
            };
            
            // Set base form values immediately (dynamic fields will be mapped separately after catalog loads)
            setFormValues(baseFormData);
            setCurrentStep('form');
          } else {
            setLoadingError('Investment not found');
          }
      } else if (preSelectedGroup) {
          // Create mode with pre-selected group: Skip selection step, show investment segment
          const groupCode = preSelectedGroup?.includes(':') ? preSelectedGroup.split(':')[2] : preSelectedGroup;
          setFormValues({ 
            group: groupCode, // Store just the code for internal logic
            investmentGroupRef: preSelectedGroup, // Store the full reference for API
            ownerEmployeeId: currentEmployee?.id || ''
          });
        setCurrentStep('form');
      } else {
          // Create mode without group: Start with group selection step, ensure owner is set
          const initialOwnerId = formValues.ownerEmployeeId || 
                                currentEmployee?.id || 
                                businessAppContext.userInfo?.employeeDetails?.employeeId || 
                                '';
          if (initialOwnerId && !formValues.ownerEmployeeId) {
            setFormValues({ ownerEmployeeId: initialOwnerId });
          }
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

  // Ref to track mapping state per investment ID
  const lastMappedInvestmentId = useRef<string | null>(null);

  // Separate effect: Map dynamic fields after catalog data is loaded
  useEffect(() => {
    if (!rawInvestmentData || !investmentCatalogData || investmentCatalogLoading) {
      return; // Wait for both raw data and catalog to be available
    }

    const currentInvestmentId = formValues.id || 'create-mode';
    
    // Check if we've already mapped for this specific investment
    if (lastMappedInvestmentId.current === currentInvestmentId) {
      return; // Already mapped for this investment
    }

    const mapDynamicFields = () => {
      const fieldsDef = getFormFieldsDefinition();
      
      if (fieldsDef) {
        const dynamicDefaults = mapInvestmentDataToFormFields(rawInvestmentData, fieldsDef);
        
        if (Object.keys(dynamicDefaults).length > 0) {
          // Create merged object directly and set form values
          const mergedFormValues = { ...formValues, ...dynamicDefaults };
          setFormValues(mergedFormValues);
          
          // Mark this investment as mapped
          lastMappedInvestmentId.current = currentInvestmentId;
        }
      }
    };

    mapDynamicFields();
  }, [rawInvestmentData, investmentCatalogData, investmentCatalogLoading, formValues.id, getFormFieldsDefinition]);

  // Reset dynamic fields mapping when investment type or liquid fund type changes (only for create mode)
  useEffect(() => {
    const isUpdateMode = Boolean(formValues.id);
    if (!isUpdateMode) {
      lastMappedInvestmentId.current = null; // Reset for create mode when type changes
    }
  }, [formValues.investmentTypeRef, formValues.investmentLiquidFundTypeRef, formValues.id]);

  // Step 3: Handle group selection from SelectSegment
  const handleGroupSelect = (group: string) => {
    // Reset dynamic fields mapping when group changes (only for create mode)
    const isUpdateMode = Boolean(formValues.id);
    if (!isUpdateMode) {
      lastMappedInvestmentId.current = null;
    }
    
    // Clean form values when switching groups in create mode
    // Preserve existing ownerEmployeeId if it exists, fallback to currentEmployee or businessAppContext
    const preservedOwnerId = formValues.ownerEmployeeId || 
                           currentEmployee?.id || 
                           businessAppContext.userInfo?.employeeDetails?.employeeId || 
                           '';
    
    // Extract group code from the full reference for internal use
    const groupCode = group?.includes(':') ? group.split(':')[2] : group;
    
    const cleanFormValues = {
      ownerEmployeeId: preservedOwnerId,
      name: formValues.name || '',
      group: groupCode, // Store just the code for internal logic
      investmentGroupRef: group, // Store the full reference for API
      // Keep system fields if updating
      ...(isUpdate && { 
        id: formValues.id, 
        version: formValues.version 
      }),
    };
    
    setFormValues(cleanFormValues);
    setCurrentStep('form');
  };

  // Handle going back to group selection (only for create mode without pre-selected group)
  const handleBack = () => {
    if (!isUpdate && !preSelectedGroup) {
      // Preserve the owner employee ID when going back
      const preservedOwnerId = formValues.ownerEmployeeId || 
                             currentEmployee?.id || 
                             businessAppContext.userInfo?.employeeDetails?.employeeId || 
                             '';
      setFormValues({ ownerEmployeeId: preservedOwnerId });
      setCurrentStep('select');
    }
  };

  // Create form resolver based on current form state and dynamic fields
  const [formFieldsDefinition, setFormFieldsDefinition] = useState<any>(null);
  
  // Get form fields definition for validation
  useEffect(() => {
    const loadFormFields = async () => {
      if (formValues.investmentTypeRef) {
        try {
          const fieldsDef = getFormFieldsDefinition();
          setFormFieldsDefinition(fieldsDef);
        } catch (error) {
          console.error('Error loading form fields for validation:', error);
        }
      }
    };
    
    loadFormFields();
  }, [formValues.group, formValues.investmentTypeRef, formValues.investmentLiquidFundTypeRef, getFormFieldsDefinition]);
  
  const formResolver = createInvestmentFormResolver(formFieldsDefinition);
  
  // CLEAN ARCHITECTURE: Use unified data transformation
  const unifiedFormValues = useUnifiedInvestmentData(formValues, businessAppContext, currentEmployee);
  
  // Debug logging for form values (can be removed in production)
  // useEffect(() => {
  //   console.log('Current formValues:', formValues);
  //   console.log('Unified form values:', unifiedFormValues);
  // }, [formValues, unifiedFormValues]);
  
  const form = useForm<InvestmentFormValues>({
    resolver: formResolver as any,
    values: unifiedFormValues, // Always sync with unified data
    resetOptions: {
      keepDirtyValues: true, // Preserve user input during resets
    },
  });


  // CLEAN ARCHITECTURE: No manual form reset needed
  // The 'values' prop with 'keepDirtyValues: true' handles this automatically


  // Show loading spinner
  if (isLoadingInvestment) {
  return (
      <div className="loading-container" data-testid={`${prefixDataTestId}-loading`}>
        <div className="loading-content">
          <div className="loading-spinner" />
          <p>Loading investment data...</p>
                </div>
              </div>
    );
  }

  // Show error state
  if (loadingError) {
    return (
      <div className="error-container" data-testid={`${prefixDataTestId}-error`}>
        <div className="error-content">
          <h3>Error Loading Investment</h3>
          <p>{loadingError}</p>
          <div className="error-actions">
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
        formData={unifiedFormValues}
        processType={isUpdate ? 'update' : 'create'}
        submitButtonText={isUpdate ? 'Update' : 'Create'}
        validateForm={() => {
          // Use react-hook-form validation state instead of bypassing validation entirely
          const errors = form.formState.errors;
          if (Object.keys(errors).length > 0) {
            const errorMessages = Object.entries(errors).map(([field, error]) => 
              `${field}: ${error?.message || 'Invalid value'}`
            );
            return errorMessages; // Return array of error messages
          }
          return null; // Return null when validation passes
        }}
        onSubmit={async (formData) => {
          try {
            // CLEAN ARCHITECTURE: Ensure investmentGroupRef is properly formatted and required fields are present
            const enhancedFormData = {
              ...formData,
              // Ensure investmentGroupRef is in correct format
              investmentGroupRef: formData.investmentGroupRef || (formData.group ? `InvestmentGroup:v1:${formData.group}` : ''),
              // Ensure ownerEmployeeId is present (should already be from unified data)
              ownerEmployeeId: formData.ownerEmployeeId || businessAppContext.userInfo?.employeeDetails?.employeeId || '',
              // Don't override accountId and contactId - let validation handle missing value
            };
            
            // Build payload directly - no manual field injection needed
            const payload = buildInvestmentPayload(enhancedFormData, businessAppContext, { 
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
        {formValues.group && isOverviewContext() && (
          <div 
            data-testid={`${prefixDataTestId}-selected-group`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--nw-spacing-sm)', 
              padding: 'var(--nw-spacing-md)',
              backgroundColor: 'var(--nw-color-surface-secondary)',
              borderRadius: 'var(--nw-border-radius-md)',
              border: '1px solid var(--nw-color-border-default)'
            }}
          >
            {/* Back Button for overview context (only in create mode) */}
            {!isUpdate ? (
              <Badge 
                variant="secondary" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--nw-spacing-xs)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onClick={handleBack}
                data-testid={formatDataTestId(`${prefixDataTestId}-back-badge`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
              >
                Back
                <PiSwap style={{ width: '14px', height: '14px', opacity: 0.7 }} />
              </Badge>
            ) : null}
            </div>
          )}

        {/* Investment Basic Information */}
          <InvestmentSegment />

        {/* Investment Type Selector */}
        <InvestmentTypeSelector currentGroup={formValues.group} />

        {/* NEW: Liquid Fund Type Selector (for liquid funds with investment type selected) */}
        {isLiquidFund && hasInvestmentType && (
          <InvestmentLiquidFundTypeSelector currentInvestmentType={formValues.investmentTypeRef || ''} />
        )}

        {/* Dynamic Fields - Conditional Display:
             - For NON-liquid funds: Show when investment type is selected
             - For liquid funds: Show when BOTH investment type AND liquid fund type are selected */}
        {((formValues.investmentTypeRef && !isLiquidFund) || 
          (isLiquidFund && hasInvestmentType && hasLiquidFundType)) && (
          <DynamicGroupSegment />
        )}
          </div>
      </AppActionForm>
  );
};

export default InvestmentFormComponent; 