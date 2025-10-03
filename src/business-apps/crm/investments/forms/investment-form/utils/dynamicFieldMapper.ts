/**
 * Dynamic field mapping utilities for investment forms
 * Maps raw GraphQL investment data to nested form structure based on catalog field definitions
 */

import { getValueByPath } from '@/common/utils/objectUtils';
import { InvestmentFormValues } from '../types';
import { setNestedValue } from './nestedValueUtils';
import { formatDateForInput } from './dateFormatUtils';

/**
 * Maps raw investment data from GraphQL to the nested form structure
 * based on dynamic field definitions from the catalog
 * 
 * @param rawInvestment - Raw investment object from GraphQL query
 * @param fieldsDef - Dynamic field definitions from investment catalog
 * @returns Partial nested form values with mapped dynamic fields
 * 
 * @example
 * const formData = mapInvestmentDataToFormFields(rawInvestment, fieldsDef);
 * // Returns: { investment: { totalInvestmentAmount: "12000" }, equityInvestment: { marketValue: "50000" } }
 */
export const mapInvestmentDataToFormFields = (
  rawInvestment: any,
  fieldsDef: any
): Partial<InvestmentFormValues> => {
  const nestedData: any = {};
  
  if (!fieldsDef?.formFields?.length) {
    return nestedData;
  }
  
  for (const group of fieldsDef.formFields) {
    for (const field of group.fields) {
      // IMPORTANT: rawInvestment is the full investment object from GraphQL
      // For investment.* fields, we need to strip the "investment." prefix since rawInvestment IS the investment
      let lookupPath = field.property;
      if (field.property.startsWith('investment.')) {
        lookupPath = field.property.replace('investment.', '');
      }
      
      let value = getValueByPath(rawInvestment, lookupPath);
      
      // SPECIAL FIX: If looking for liquidFundInvestment.additionalProperties but not found,
      // try the investment.additionalProperties instead
      if (value === undefined && field.property.startsWith('liquidFundInvestment.additionalProperties.')) {
        const propertyName = field.property.replace('liquidFundInvestment.additionalProperties.', '');
        value = getValueByPath(rawInvestment, `additionalProperties.${propertyName}`);
      }
      
      // CATALOG_ FIELD FIX: If the Ref field is empty but catalog entry object exists, use that
      if ((value === undefined || value === null || value === '') && field.type.startsWith('CATALOG_')) {
        const catalogObjectPath = lookupPath.endsWith('Ref') 
          ? lookupPath.replace(/Ref$/, '') 
          : lookupPath;
        const catalogEntry = getValueByPath(rawInvestment, catalogObjectPath);
        if (catalogEntry && typeof catalogEntry === 'object' && catalogEntry.id) {
          value = catalogEntry.id;
        }
      }
      
      if (value !== undefined && value !== null && value !== '') {
        // Format the value based on field type
        let formattedValue = value;
        if (field.type === 'DATE') {
          formattedValue = formatDateForInput(value);
        } else if (field.type.startsWith('CATALOG_')) {
          formattedValue = String(value);
        } else if (typeof value !== 'string') {
          formattedValue = String(value);
        }
        
        // Set value at the nested path in the result object
        // E.g., "equityInvestment.marketValue" creates { equityInvestment: { marketValue: ... } }
        setNestedValue(nestedData, field.property, formattedValue);
      }
    }
  }
  
  return nestedData;
};

