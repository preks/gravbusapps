import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';

interface DynamicInvestmentFieldsProps {
  investmentData: any; // Generic prop that accepts both lead and opportunity data
  businessAppContext?: BusinessAppContextProps;
}

// Helper function to extract currency code from currency ID (e.g., "Currency:v1:EUR" -> "EUR")
const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR';
};

// Helper function to format currency values with smart currency detection
const formatCurrency = (amount: number | string, investmentData?: any): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return 'N/A';

  // Smart currency detection: opportunities have currencyRef, leads default to EUR
  let currency = 'EUR'; // Default for leads
  if (investmentData?.currencyRef) {
    currency = extractCurrencyCode(investmentData.currencyRef);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericAmount);
};

// Helper function to format date values
const formatDate = (dateValue: string | Date): string => {
  if (!dateValue) return 'N/A';
  
  try {
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
};

// Helper function to format percentage values
const formatPercentage = (value: number | string): string => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return 'N/A';
  
  return `${numericValue.toFixed(2)}%`;
};

// Helper function to get nested object values using dot notation
const getValueByPath = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      // Handle array notation like "realEstateInvestment[0]"
      const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        return current[arrayKey] && current[arrayKey][parseInt(index)];
      }
      return current[key];
    }
    return undefined;
  }, obj);
};

// Helper function to format field values based on type
const formatFieldValue = (value: any, fieldType: string, investmentData: any): string => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }
  
  switch (fieldType) {
    case 'AMOUNT':
      return formatCurrency(value, investmentData);
    case 'PERCENTAGE':
      return formatPercentage(value);
    case 'DATE':
      return formatDate(value);
    case 'TEXT':
    case 'NUMBER':
    default:
      return String(value);
  }
};

const DynamicInvestmentFields: React.FC<DynamicInvestmentFieldsProps> = ({
  investmentData,
  businessAppContext
}) => {
  const [referenceFields, setReferenceFields] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(businessAppContext?.accessToken || '');

  useEffect(() => {
    if (!businessAppContext?.accessToken || !catalogClient) {
      setIsLoading(false);
      return;
    }

    const fetchCatalogData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [groupData, typeData] = await Promise.all([
          // Fetch Investment Group
          investmentData?.investmentGroup?.id ? 
            catalogClient.getCatalogEntryById(investmentData.investmentGroup.id) : Promise.resolve(null),
          
          // Fetch Investment Type
          investmentData?.investmentType?.id ?
            catalogClient.getCatalogEntryById(investmentData.investmentType.id) : Promise.resolve(null)
        ]);

        // Priority: Type's referenceFields, fallback to Group's referenceFields
        let fields: any[] = [];
        if (typeData?.objectValue?.referenceFields) {
          fields = typeData.objectValue.referenceFields;
        } else if (groupData?.objectValue?.referenceFields) {
          fields = groupData.objectValue.referenceFields;
        }

        setReferenceFields(fields || []);
      } catch (err) {
        console.error('Error fetching catalog data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCatalogData();
  }, [investmentData, businessAppContext?.accessToken, catalogClient]);

  // Extract reference fields from catalog data
  const displayFields = useMemo(() => {
    return referenceFields || [];
  }, [referenceFields]);

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
        <span className="gba:text-sm gba:text-gray-600">Loading dynamic fields...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <div>
          <strong>Error</strong>
          <div>Failed to load dynamic fields: {error}</div>
        </div>
      </Alert>
    );
  }

  if (!displayFields || displayFields.length === 0) {
    return (
      <div className="gba:text-sm gba:text-gray-500 gba:py-4" data-testid="no-dynamic-fields">
        No dynamic investment fields configured for this type.
      </div>
    );
  }

  const sortedFields = displayFields.sort((a, b) => {
    return parseInt(a.displayOrder || '0') - parseInt(b.displayOrder || '0');
  });

  return (
    <div data-testid="dynamic-investment-fields">
      {sortedFields.map((field) => {
        const value = getValueByPath(investmentData, field.property);
        const formattedValue = formatFieldValue(value, field.type, investmentData);
        
        return (
          <div 
            key={field.property} 
            style={{ marginBottom: '12px' }}
            data-testid={`investment-field-${field.property}`}
          >
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              {field.label}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
              {formattedValue}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DynamicInvestmentFields;
