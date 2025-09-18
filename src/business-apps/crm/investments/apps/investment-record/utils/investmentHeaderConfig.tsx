// Investment Header Configuration Utilities
import React from 'react';
import { Badge } from '@newwork/nw-design-system';
import { formatCurrency, extractCurrencyCode } from '@/business-apps/crm/common/utils/currencyUtils';
// Remove dependency on investmentTypeUtils - now using dynamic types
import { FormFieldsDefinition, FormFieldDefinition } from '@/business-apps/crm/investments/forms/investment-form/queries/InvestmentCatalogQueries';

/**
 * Format date helper
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('de-DE');
  } catch {
    return '-';
  }
};

/**
 * Helper function to get value from object using dot notation path
 */
const getValueByPath = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * Formats a field value based on its type
 */
const formatFieldValue = (value: any, fieldType: string, currencyCode: string): string => {
  if (value === null || value === undefined) return '-';
  
  switch (fieldType) {
    case 'DATE':
    case 'DATETIME':
      return formatDate(value);
    
    case 'AMOUNT':
      return typeof value === 'number' ? formatCurrency(value, currencyCode) : '-';
    
    case 'PERCENTAGE':
      return typeof value === 'number' ? `${value}%` : '-';
    
    case 'NUMBER':
      return typeof value === 'number' ? value.toString() : '-';
    
    case 'TEXT':
    case 'TEXTAREA':
      return value.toString();
    
    default:
      // Handle catalog fields
      if (fieldType.startsWith('CATALOG_') || fieldType.startsWith('REF_')) {
        if (typeof value === 'object' && value.value) {
          return value.value; // Catalog entry
        }
        if (typeof value === 'object' && value.name) {
          return value.name; // Entity reference
        }
      }
      return value.toString();
  }
};

/**
 * Gets the investment type's form field definition from catalog data
 */
export const getInvestmentTypeFieldDefinition = (
  investmentTypeCode: string,
  catalogData: any
): FormFieldsDefinition | null => {
  if (!catalogData || !investmentTypeCode) return null;
  
  // Look through investment types for matching code
  const investmentTypes = catalogData.investmentTypes || [];
  const matchingType = investmentTypes.find((type: any) => type.code === investmentTypeCode);
  
  if (matchingType?.objectValue) {
    return matchingType.objectValue as FormFieldsDefinition;
  }
  
  // If not found in direct types, look in group's child entries
  const investmentGroups = catalogData.investmentGroups || [];
  for (const group of investmentGroups) {
    if (group.childEntries) {
      const childType = group.childEntries.find((child: any) => child.code === investmentTypeCode);
      if (childType?.objectValue) {
        return childType.objectValue as FormFieldsDefinition;
      }
    }
  }
  
  return null;
};

/**
 * Transforms form field definitions into header detail items
 */
export const transformFormFieldsToHeaderItems = (
  formFieldsDefinition: FormFieldsDefinition | null,
  investment: any,
  typeSpecificData: any
) => {
  if (!formFieldsDefinition?.formFields) return [];
  
  const currencyCode = extractCurrencyCode(investment?.currency?.code || '');
  const items: Array<{ label: string; value: string }> = [];
  
  // Combine all field definitions from all groups
  const allFields: FormFieldDefinition[] = [];
  formFieldsDefinition.formFields.forEach(group => {
    allFields.push(...group.fields);
  });
  
  // Sort fields by display order
  allFields.sort((a, b) => {
    const orderA = parseFloat(a.displayOrder || '999');
    const orderB = parseFloat(b.displayOrder || '999');
    return orderA - orderB;
  });
  
  // Transform each field to a header item
  allFields.forEach(field => {
    // Get the value using the property path
    let value = getValueByPath(investment, field.property);
    
    // If not found in main investment, try type-specific data
    if (value === undefined) {
      value = getValueByPath(typeSpecificData, field.property);
    }
    
    // Format the value
    const formattedValue = formatFieldValue(value, field.type, currencyCode);
    
    items.push({
      label: field.label,
      value: formattedValue
    });
  });
  
  return items;
};

/**
 * Groups header items into logical sections for better display
 */
export const groupHeaderItems = (items: Array<{ label: string; value: string }>) => {
  // Split items into groups of reasonable size (5-6 items per group)
  const groups = [];
  const itemsPerGroup = 5;
  
  for (let i = 0; i < items.length; i += itemsPerGroup) {
    const groupItems = items.slice(i, i + itemsPerGroup);
    groups.push({
      id: `dynamic-group-${Math.floor(i / itemsPerGroup) + 1}`,
      items: groupItems
    });
  }
  
  return groups;
};

/**
 * Gets type-specific badges for the header
 */
export const getTypeSpecificBadges = (investmentType: string, typeSpecificData: any) => {
  switch (investmentType) {
    case 'equity':
      return typeSpecificData?.equityInvestment?.investmentStakeType?.value && (
        <Badge variant="default" className="gba:text-sm">
          {typeSpecificData.equityInvestment.investmentStakeType.value}
        </Badge>
      );
    case 'real_estate':
      return typeSpecificData?.realEstateInvestment?.propertyType?.value && (
        <Badge variant="outline" className="gba:border-orange-200 gba:text-orange-800">
          {typeSpecificData.realEstateInvestment.propertyType.value}
        </Badge>
      );
    default:
      return null;
  }
};

/**
 * Creates the header meta badges
 */
export const createHeaderMeta = (investment: any, investmentType: string, typeSpecificData: any) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <Badge variant="secondary" className="gba:text-sm">
      {investment?.investmentType?.value || 'Investment'}
    </Badge>
    <Badge variant="outline" className="gba:text-sm">
      {investment?.investmentStatus?.value || 'Unknown'}
    </Badge>
    {/* Planned Exit Badge */}
    {investment?.plannedExitDate && (
      <Badge variant="destructive" className="gba:text-sm gba:flex gba:items-center gba:gap-1">
        <span>📅</span>
        Planned Exit: {formatDate(investment.plannedExitDate)}
      </Badge>
    )}
    {/* Type-specific badges */}
    {getTypeSpecificBadges(investmentType, typeSpecificData)}
  </div>
);

/**
 * Gets type-specific detail groups for the header - now supports dynamic fields
 */
export const getTypeSpecificDetailGroups = (
  investmentType: string, 
  typeSpecificData: any, 
  investment: any,
  catalogData?: any // Optional catalog data for dynamic fields
) => {
  const currencyCode = extractCurrencyCode(investment?.currency?.code || '');
  
  // Try dynamic fields first if catalog data is available
  if (catalogData && investment?.investmentType?.code) {
    const formFieldsDefinition = getInvestmentTypeFieldDefinition(
      investment.investmentType.code,
      catalogData
    );
    
    if (formFieldsDefinition) {
      const dynamicItems = transformFormFieldsToHeaderItems(
        formFieldsDefinition,
        investment,
        typeSpecificData
      );
      
      if (dynamicItems.length > 0) {
        return groupHeaderItems(dynamicItems);
      }
    }
  }
  
  // Fallback to static field configurations based on investment group
  const group = investment?.investmentGroup?.code || '';
  
  if (group.includes('EQUITY') || investmentType === 'equity') {
      const equity = typeSpecificData?.equityInvestment;
      return [
        {
          id: 'equity-details',
          items: [
            { 
              label: 'Initial Investment', 
              value: investment?.initialInvestmentAmount 
                ? formatCurrency(investment.initialInvestmentAmount, currencyCode)
                : '-'
            },
            { 
              label: 'Total Investment', 
              value: investment?.totalInvestmentAmount 
                ? formatCurrency(investment.totalInvestmentAmount, currencyCode)
                : '-'
            },
            { 
              label: 'Market Value', 
              value: investment?.investmentMarketValue 
                ? formatCurrency(investment.investmentMarketValue, currencyCode)
                : '-'
            },
            { 
              label: 'Stake Percentage', 
              value: equity?.stakePercentage ? `${equity.stakePercentage}%` : '-'
            },
            { 
              label: 'Foundation Date', 
              value: formatDate(equity?.foundationDate)
            }
          ]
        },
        {
          id: 'equity-details-2',
          items: [
            { 
              label: 'Acquisition Date', 
              value: formatDate(investment?.acquisitionDate)
            },
            { 
              label: 'Turnover Amount', 
              value: equity?.turnoverAmount 
                ? formatCurrency(equity.turnoverAmount, currencyCode)
                : '-'
            },
            { 
              label: 'EBITDA Amount', 
              value: equity?.ebitdaAmount 
                ? formatCurrency(equity.ebitdaAmount, currencyCode)
                : '-'
            },
            { 
              label: 'Owner Employee', 
              value: investment?.ownerEmployee 
                ? `${investment.ownerEmployee.firstName || ''} ${investment.ownerEmployee.lastName || ''}`.trim()
                : '-'
            }
          ]
        }
      ];
  } else if (group.includes('REAL_ESTATE') || investmentType === 'real_estate') {
      const realEstate = typeSpecificData?.realEstateInvestment;
      return realEstate ? [
        {
          id: 'real-estate-details',
          items: [
            { label: 'Size', value: realEstate.propertySize ? `${realEstate.propertySize} m²` : '-' },
            { label: 'Location', value: realEstate.propertyLocation || '-' },
            { label: 'Type', value: realEstate.propertyType?.value || '-' }
          ]
        }
      ] : [];
  } else if (group.includes('LIQUID_FUND') || investmentType === 'liquid_fund') {
      const liquidFund = typeSpecificData?.liquidFundInvestment;
      return [
        {
          id: 'liquid-fund-details',
          items: [
            { 
              label: 'Initial Investment', 
              value: investment?.initialInvestmentAmount 
                ? formatCurrency(investment.initialInvestmentAmount, currencyCode)
                : '-'
            },
            { 
              label: 'Total Investment', 
              value: investment?.totalInvestmentAmount 
                ? formatCurrency(investment.totalInvestmentAmount, currencyCode)
                : '-'
            },
            { 
              label: 'Market Value', 
              value: investment?.investmentMarketValue 
                ? formatCurrency(investment.investmentMarketValue, currencyCode)
                : '-'
            },
            { 
              label: 'Fund Type', 
              value: liquidFund?.investmentLiquidFundType?.value || '-'
            },
            { 
              label: 'ISIN Code', 
              value: investment?.isin || '-'
            }
          ]
        },
        {
          id: 'liquid-fund-details-2',
          items: [
            { 
              label: 'Bank Name', 
              value: liquidFund?.bankName || '-'
            },
            { 
              label: 'Interest Rate', 
              value: liquidFund?.interestRate ? `${liquidFund.interestRate}%` : '-'
            },
            { 
              label: 'Acquisition Date', 
              value: formatDate(investment?.acquisitionDate)
            },
            { 
              label: 'Owner Employee', 
              value: investment?.ownerEmployee 
                ? `${investment.ownerEmployee.firstName || ''} ${investment.ownerEmployee.lastName || ''}`.trim()
                : '-'
            }
          ]
        }
      ];
  } else {
    // Default/generic investment fields
      return [
        {
          id: 'general-details',
          items: [
            { 
              label: 'Initial Investment', 
              value: investment?.initialInvestmentAmount 
                ? formatCurrency(investment.initialInvestmentAmount, currencyCode)
                : '-'
            },
            { 
              label: 'Total Investment', 
              value: investment?.totalInvestmentAmount 
                ? formatCurrency(investment.totalInvestmentAmount, currencyCode)
                : '-'
            },
            { 
              label: 'Market Value', 
              value: investment?.investmentMarketValue 
                ? formatCurrency(investment.investmentMarketValue, currencyCode)
                : '-'
            },
            { 
              label: 'Acquisition Date', 
              value: formatDate(investment?.acquisitionDate)
            },
            { 
              label: 'Owner Employee', 
              value: investment?.ownerEmployee 
                ? `${investment.ownerEmployee.firstName || ''} ${investment.ownerEmployee.lastName || ''}`.trim()
                : '-'
            }
          ]
        }
      ];
  }
};
