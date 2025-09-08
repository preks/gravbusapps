import React, { useState, useEffect } from 'react';
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
import { useGetInvestmentById } from '@/common/data/investment';
import { getInvestmentGroupFromContext } from '../utils/investmentDataTransformer';
import { createInvestmentFormResolver } from '../utils/investmentFormSchema';
import { InvestmentFormValues } from '../types';
import { buildInvestmentPayload } from '@/common/data/investment';

const prefixDataTestId = 'InvestmentForm';

// Generic helper function to map investment data to form fields based on property paths
const mapInvestmentDataToFormFields = (rawInvestment: any, fieldsDef: any): Record<string, any> => {
  const dynamicDefaults: Record<string, any> = {};
  
  if (fieldsDef?.formFields?.length) {
    for (const group of fieldsDef.formFields) {
      for (const field of group.fields) {
        const fieldName = field.property.split('.').pop() || field.property;
        const value = getValueByPath(rawInvestment, field.property);
        
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

// Generic helper to resolve values from object using dot notation paths
const getValueByPath = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      // Handle array access (e.g., realEstateInvestment[0].buildingYear)
      if (Array.isArray(current)) {
        return current[0]?.[key];
      }
      // Special handling: if requesting a relationship object but we need the ID for form field
      if (key === 'loanRecipientInvestmentAccount' && current[key]?.id) {
        // Return the ID of the related object for form compatibility
        return current[key].id;
      }
      return current[key];
    }
    return undefined;
  }, obj);
};

// Helper function to get group display name from catalog data
const getGroupDisplayName = (
  groupRef: string | undefined, 
  investmentCatalogData: any
): string => {
  if (!groupRef || !investmentCatalogData?.investmentGroups) {
      return 'Investment Group';
  }
  
  // Handle both full catalog references and short codes
  const groupCode = groupRef.includes(':') ? groupRef.split(':')[2] : groupRef;
  
  // Find the group in catalog data
  const group = investmentCatalogData.investmentGroups.find((g: any) => g.code === groupCode);
  if (group) {
    // Use translated value if available, otherwise use the value or code
    return group.translations?.[0]?.value || group.value || group.code;
  }
  
  // Fallback to formatted code
  return groupCode ? groupCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Investment Group';
};


type FormStep = 'select' | 'form';

export const InvestmentFormComponent: React.FC = () => {
  const {
    businessAppContext, 
    formValues,
    setFormValues,
    getFormFieldsDefinition,
    currentEmployee,
    investmentCatalogData
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
            };
            
            // Step 4 & 5: If type is selected, map dynamic fields based on property paths
            let dynamicDefaults = {};
            if (typeRef) {
              const fieldsDef = await getFormFieldsDefinition();
              dynamicDefaults = mapInvestmentDataToFormFields(rawInvestment, fieldsDef);
              
              // Debug the mapping process
              console.groupCollapsed('🔍 Investment Form Clean Workflow Debug');
              console.log('Raw investment from GraphQL:', rawInvestment);
              console.log('Extracted group code:', groupCode);
              console.log('Extracted type code:', typeCode);
              console.log('Form fields definition:', fieldsDef);
              console.log('Mapped dynamic defaults:', dynamicDefaults);
              console.log('Final form values:', { ...baseFormData, ...dynamicDefaults });
              console.groupEnd();
            }
            
            // Set form values and go to form step
            setFormValues({ ...baseFormData, ...dynamicDefaults });
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

  // Step 3: Handle group selection from SelectSegment
  const handleGroupSelect = (group: string) => {
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
          const fieldsDef = await getFormFieldsDefinition();
          setFormFieldsDefinition(fieldsDef);
        } catch (error) {
          console.error('Error loading form fields for validation:', error);
        }
      }
    };
    
    loadFormFields();
  }, [formValues.investmentTypeRef, getFormFieldsDefinition]);
  
  const formResolver = createInvestmentFormResolver(formFieldsDefinition);
  
  const form = useForm<InvestmentFormValues>({
    resolver: formResolver as any, // Type assertion to handle the interface mismatch
    defaultValues: formValues,
    // Removed 'values' prop to prevent form reset when formValues change
    // This allows user input to persist when investment type changes
  });

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
        <GroupSelectSegment onGroupSelect={handleGroupSelect} />
      </div>
    );
  }

  // Show main form step  
  return (
      <AppActionForm
      form={form} 
        processType={isUpdate ? 'update' : 'create'}
      onSubmit={async (formData) => {
        console.log('Form submitted:', formData);
        console.log('Current formValues state:', formValues);
        
        // Ensure investmentGroupRef is properly set from formValues state
        // If we only have the group code, convert it to full reference format
        let groupRef = formValues.investmentGroupRef;
        if (!groupRef && formValues.group) {
          // Convert group code to full reference format
          groupRef = `InvestmentGroup:v1:${formValues.group}`;
        }
        
        const formDataWithGroupRef = {
          ...formData,
          investmentGroupRef: groupRef,
          group: formValues.group
        };
        
        console.log('Form data with group ref:', formDataWithGroupRef);
        
        // Use central investment payload builder
        const payload = buildInvestmentPayload(formDataWithGroupRef, businessAppContext, { 
          isUpdate, 
          rawInvestmentData 
        });
        console.log('Built investment payload:', payload);
        
        // TODO: Send payload to API
        return payload;
      }}
        formData={formValues}
        businessAppContext={businessAppContext}
      data-testid={`${prefixDataTestId}-form`}
    >
      <div data-testid={`${prefixDataTestId}-content`} className="gba:space-y-6">
        
        {/* Group Display Header (if group is selected) */}
        {formValues.group && (
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
            {/* Clickable Badge with pencil icon for group changing (only in create mode without pre-selected group) */}
            {!isUpdate && !preSelectedGroup ? (
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
                data-testid={formatDataTestId(`${prefixDataTestId}-change-group-badge`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
              >
                {getGroupDisplayName(formValues.group, investmentCatalogData)}
                <PiSwap style={{ width: '14px', height: '14px', opacity: 0.7 }} />
              </Badge>
            ) : (
              <Badge 
                variant="secondary" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--nw-spacing-xs)',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                {getGroupDisplayName(formValues.group, investmentCatalogData)}
              </Badge>
            )}
            </div>
          )}

        {/* Investment Basic Information */}
          <InvestmentSegment />

        {/* Investment Type Selector */}
        <InvestmentTypeSelector currentGroup={formValues.group} />

        {/* Dynamic Fields (rendered when type is selected) */}
        {formValues.investmentTypeRef && (
          <DynamicGroupSegment />
        )}
          </div>
      </AppActionForm>
  );
};

export default InvestmentFormComponent; 