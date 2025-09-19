import React, { useState, useEffect, useCallback } from 'react';
import { 
  Input, 
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@newwork/nw-design-system';
import { useFormContext } from 'react-hook-form';
import { PiCurrencyDollar } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useInvestmentFormContext } from '../../context/InvestmentFormContext';
import FormattedNumberInput from '../FormattedNumberInput';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { FormFieldDefinition } from '../../queries/InvestmentCatalogQueries';
import { useGetInvestmentAccounts } from '@/common/data/investment';
import EntitySelect from '@/common/components/common-relations/form-segments/shared/components/EntitySelect';

const prefixDataTestId = 'InvestmentForm-DynamicGroupSegment';

// InvestmentAccountSelect component for REF_InvestmentAccount fields using EntitySelect
const InvestmentAccountSelect = React.forwardRef<HTMLButtonElement, {
  name: string;
  label: string;
  required: boolean;
  value?: string;
  onChange?: (value: string | null) => void;
  onBlur?: () => void;
  'data-testid'?: string;
}>(({ name, label, required, value, onChange, onBlur, 'data-testid': dataTestId }, ref) => {
  const { businessAppContext } = useInvestmentFormContext();
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(businessAppContext);
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentSearch, setCurrentSearch] = useState('');

  // Load investment accounts
  const loadAccounts = useCallback(async (search: string = '', append: boolean = false) => {
    setLoading(true);
    try {
      const result = await fetchInvestmentAccounts({ 
        search: search.trim() || undefined,
        limit: 50,
        offset: append ? accounts.length : 0
      });
      
      const newAccounts = result.InvestmentAccount || [];
      const transformedAccounts = newAccounts.map(account => ({
        id: account.id,
        name: account.name || account.code || account.id,
        type: 'account' as const,
        subtitle: account.code || account.email || account.geographicPresence || 'Investment Account',
        pictureThumbnail: undefined, // Investment accounts don't typically have pictures
      }));

      if (append) {
        setAccounts(prev => [...prev, ...transformedAccounts]);
      } else {
        setAccounts(transformedAccounts);
      }
      
      setHasMore(newAccounts.length === 50); // Assume more if we got a full page
    } catch (error) {
      console.error('Error loading investment accounts:', error);
      if (!append) setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [fetchInvestmentAccounts, accounts.length]);

  // Initial load
  useEffect(() => {
    loadAccounts('');
  }, []);

  // Load specific account if value is set but not found in current accounts  
  useEffect(() => {
    if (value && !loading && accounts.length > 0 && !accounts.some(a => a.id === value)) {
      // The selected value is not in our current account list
      // We need to load the specific account
      console.log('Loading specific account:', value);
      loadSpecificAccount(value);
    }
  }, [value, accounts, loading]);

  // Load a specific account by ID and add it to the list
  const loadSpecificAccount = useCallback(async (accountId: string) => {
    try {
      // Try to fetch accounts that might contain our specific ID
      const result = await fetchInvestmentAccounts({ 
        search: accountId,
        limit: 10
      });
      
      const foundAccount = result.InvestmentAccount?.find(acc => acc.id === accountId);
      if (foundAccount) {
        const transformedAccount = {
          id: foundAccount.id,
          name: foundAccount.name || foundAccount.code || foundAccount.id,
          type: 'account' as const,
          subtitle: foundAccount.code || foundAccount.email || foundAccount.geographicPresence || 'Investment Account',
          pictureThumbnail: undefined,
        };
        
        // Add the specific account to the list if not already present
        setAccounts(prev => {
          if (prev.some(a => a.id === accountId)) return prev;
          return [transformedAccount, ...prev];
        });
      }
    } catch (error) {
      console.error('Error loading specific account:', error);
    }
  }, [fetchInvestmentAccounts]);

  // Debug: Log the current value and available accounts (can be removed once fully working)
  useEffect(() => {
    if (value) {
      console.log('InvestmentAccountSelect:', {
        fieldName: name,
        currentValue: value,
        valueFoundInAccounts: accounts.some(a => a.id === value)
      });
    }
  }, [name, value, accounts]);

  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    setCurrentSearch(searchTerm);
    loadAccounts(searchTerm, false);
  }, [loadAccounts]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadAccounts(currentSearch, true);
    }
  }, [loading, hasMore, currentSearch, loadAccounts]);

  return (
    <EntitySelect
      ref={ref}
      value={value || null}
      entities={accounts}
      onValueChange={onChange}
      onBlur={onBlur}
      onSearch={handleSearch}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
      placeholder={`Select ${label}${required ? ' *' : ''}...`}
      searchPlaceholder="Type to search investment accounts..."
      data-testid={dataTestId}
    />
  );
});

InvestmentAccountSelect.displayName = 'InvestmentAccountSelect';

const DynamicGroupSegment: React.FC = () => {
  const { control } = useFormContext(); // Get form control from react-hook-form context
  const {
    formValues,
    businessAppContext,
    // Investment catalog data from context (not directly used, but available)
    investmentCatalogLoading,
    investmentCatalogError,
    getFormFieldsDefinition,
  } = useInvestmentFormContext();

  const [catalogCache, setCatalogCache] = useState<Record<string, any[]>>({});
  const catalogClient = useCatalogManagerClient(businessAppContext.accessToken);

  // Get form fields definition from context (already loaded)
  const formFieldsDefinition = getFormFieldsDefinition();
  const isLoading = investmentCatalogLoading;
  const error = investmentCatalogError;

  // Debug: surface inputs to help verify prefill
  console.debug('DynamicGroupSegment fields snapshot', {
    formValues,
    hasFields: Boolean(formFieldsDefinition?.formFields?.length),
    groups: formFieldsDefinition?.formFields?.map(g => ({ id: g.groupId, label: g.groupLabel, order: g.displayOrder, fields: g.fields.length }))
  });

  // Extract property name from full property path (e.g., "investment.acquisitionDate" -> "acquisitionDate")
  // For additionalProperties, we flatten the path: "investment.additionalProperties.openingBalance" -> "additionalProperties_openingBalance"
  const getPropertyName = (property: string, fieldType?: string): string => {
    const parts = property.split('.');
    
    // Handle additionalProperties fields with special naming
    if (parts.includes('additionalProperties') && parts.length >= 3) {
      const additionalPropsIndex = parts.indexOf('additionalProperties');
      // Create flattened name: additionalProperties_fieldName
      const fieldName = parts.slice(additionalPropsIndex + 1).join('_');
      return `additionalProperties_${fieldName}`;
    }
    
    // Default behavior for regular fields
    const baseName = parts.pop() || property;
    
    // For REF_ types, if the property points to a relationship, add "Id" suffix for form field
    if (fieldType?.startsWith('REF_') && !baseName.endsWith('Id')) {
      return baseName + 'Id';
    }
    
    return baseName;
  };

  // Fetch catalog entries for CATALOG_ fields
  const fetchCatalogData = async (catalogName: string) => {
    if (catalogCache[catalogName]) return catalogCache[catalogName];

    try {
      const [catalog, version] = catalogName.split(':');
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: catalog, version: version || 'v1' },
        { limit: 100, returnTotalRecords: true }
      );

      const options = response.data.map((entry: any) => ({
        value: `${catalog}:${version || 'v1'}:${entry.code}`,
        label: entry.value || entry.code,
        id: entry.id
      }));

      setCatalogCache(prev => ({ ...prev, [catalogName]: options }));
      return options;
    } catch (error) {
      console.error(`Error fetching catalog ${catalogName}:`, error);
      return [];
    }
  };

  // Render field based on type
  const renderField = (field: FormFieldDefinition) => {
    const fieldName = getPropertyName(field.property, field.type);
    
    // Debug: Log field rendering details (can be removed once fully working)
    if (field.type === 'REF_InvestmentAccount') {
      console.log('REF_InvestmentAccount field:', {
        property: field.property,
        fieldName: fieldName
      });
    }
    
    switch (field.type) {
      case 'DATE':
        return (
          <FormField
            key={fieldName}
            control={control as any}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    value={formField.value || ''}
                    type="date"
                    data-testid={formatDataTestId(prefixDataTestId, `${fieldName}Input`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'DATETIME':
        return (
          <FormField
            key={fieldName}
            control={control as any}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>}
                </FormLabel>
                <FormControl>
                  <div className="gba:flex gba:gap-2">
                    <div className="gba:flex-1 gba:space-y-1">
                      <FormLabel htmlFor={`${fieldName}Date`} className="gba:text-sm">Date</FormLabel>
                      <Input
                        id={`${fieldName}Date`}
                        type="date"
                        value={formField.value ? formField.value.split('T')[0] : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const timeValue = formField.value ? formField.value.split('T')[1] || '00:00' : '00:00';
                          formField.onChange(`${e.target.value}T${timeValue}`);
                        }}
                        data-testid={formatDataTestId(prefixDataTestId, `${fieldName}DateInput`)}
                      />
                    </div>
                    <div className="gba:flex-1 gba:space-y-1">
                      <FormLabel htmlFor={`${fieldName}Time`} className="gba:text-sm">Time</FormLabel>
                      <Input
                        id={`${fieldName}Time`}
                        type="time"
                        value={formField.value ? formField.value.split('T')[1] || '00:00' : '00:00'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const dateValue = formField.value ? formField.value.split('T')[0] : new Date().toISOString().split('T')[0];
                          formField.onChange(`${dateValue}T${e.target.value}`);
                        }}
                        data-testid={formatDataTestId(prefixDataTestId, `${fieldName}TimeInput`)}
                      />
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'AMOUNT':
        return (
          <FormField
            key={fieldName}
            control={control as any}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>}
                </FormLabel>
                <FormControl>
                  <div className="gba:relative">
                    <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-3 gba:flex gba:items-center gba:pointer-events-none">
                      <PiCurrencyDollar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                    </div>
                    <FormattedNumberInput
                      {...formField}
                      placeholder="0.00"
                      className="gba:pl-10"
                      data-testid={formatDataTestId(prefixDataTestId, `${fieldName}Input`)}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'PERCENTAGE':
        return (
          <FormField
            key={fieldName}
            control={control as any}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>}
                </FormLabel>
                <FormControl>
                  <div className="gba:relative">
                    <FormattedNumberInput
                      {...formField}
                      placeholder="0"
                      min={0}
                      max={100}
                      data-testid={formatDataTestId(prefixDataTestId, `${fieldName}Input`)}
                    />
                    <div className="gba:absolute gba:inset-y-0 gba:right-0 gba:pr-3 gba:flex gba:items-center gba:pointer-events-none">
                      <span className="gba:text-gray-400 gba:text-sm">%</span>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'NUMBER':
        return (
          <FormField
            key={fieldName}
            control={control as any}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>}
                </FormLabel>
                <FormControl>
                  <FormattedNumberInput
                    {...formField}
                    placeholder="Enter number"
                    data-testid={formatDataTestId(prefixDataTestId, `${fieldName}Input`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'TEXT':
        return (
          <FormField
            key={fieldName}
            control={control as any}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    value={formField.value || ''}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    data-testid={formatDataTestId(prefixDataTestId, `${fieldName}Input`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'TEXTAREA':
        return (
          <FormField
            key={fieldName}
            control={control as any}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...formField}
                    value={formField.value || ''}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    data-testid={formatDataTestId(prefixDataTestId, `${fieldName}Textarea`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        // Handle CATALOG_ types
        if (field.type.startsWith('CATALOG_')) {
          const catalogName = field.type.replace('CATALOG_', '');
          
          return (
            <FormField
              key={fieldName}
              control={control as any}
              name={fieldName}
              render={({ field: formField }) => (
                <CatalogSelectField
                  field={field}
                  fieldName={fieldName}
                  catalogName={catalogName}
                  formField={formField}
                  fetchCatalogData={fetchCatalogData}
                />
              )}
            />
          );
        }

        // Handle REF_ types (references to other entities)
        if (field.type.startsWith('REF_')) {
          const entityType = field.type.replace('REF_', '');
          
          // Special handling for InvestmentAccount references
          if (entityType === 'InvestmentAccount') {
            return (
              <FormField
                key={fieldName}
                control={control as any}
                name={fieldName}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>
                      {field.label} {field.required && <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>}
                    </FormLabel>
                    <FormControl>
                      <InvestmentAccountSelect
                        {...formField}
                        name={fieldName}
                        label={field.label}
                        required={field.required}
                        data-testid={formatDataTestId(prefixDataTestId, `${fieldName}Select`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          }
          
          // Fallback for other REF_ types - render as text input for now
          return (
            <FormField
              key={fieldName}
              control={control as any}
              name={fieldName}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>
                    {field.label} {field.required && <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...formField}
                      placeholder={`Enter ${entityType} reference`}
                      data-testid={formatDataTestId(prefixDataTestId, `${fieldName}Input`)}
                    />
                  </FormControl>
                  <div className="gba:text-xs gba:text-gray-500">
                    Reference to {entityType} entity
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }

        // Unknown type - render as text input
        return renderField({ ...field, type: 'TEXT' });
    }
  };

  // Group fields by display order for layout
  const groupFieldsByDisplayOrder = (fields: FormFieldDefinition[]) => {
    const groups: Record<string, FormFieldDefinition[]> = {};
    
    fields.forEach(field => {
      const orderBase = String(field.displayOrder).split('.')[0];
      if (!groups[orderBase]) groups[orderBase] = [];
      groups[orderBase].push(field);
    });

    // Sort each group by full display order
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => String(a.displayOrder).localeCompare(String(b.displayOrder)));
    });

    return groups;
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="gba:text-center gba:text-gray-500 gba:py-8">
        Loading form fields...
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4">
        <div className="gba:text-red-800 gba:text-sm">
          Error loading form fields: {error}
        </div>
      </div>
    );
  }

  // Handle no form fields
  if (!formFieldsDefinition || !formFieldsDefinition.formFields.length) {
    return (
      <div className="gba:text-center gba:text-gray-500 gba:py-8">
        No dynamic fields available for this investment type
      </div>
    );
  }

  return (
    <div data-testid={formatDataTestId(prefixDataTestId, 'Container')}>
      {formFieldsDefinition.formFields
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((group) => {
          const fieldGroups = groupFieldsByDisplayOrder(group.fields);
          
          return (
            <div 
              key={group.groupId}
              className="gba:space-y-6"
              data-testid={formatDataTestId(prefixDataTestId, `${group.groupId}Group`)}
            >
              {/* Group Header */}
              <div>
                <h3 style={{ 
                  margin: 0, 
                  marginBottom: 'var(--nw-spacing-xs)',
                  color: 'var(--nw-color-text-primary)', 
                  fontSize: '1.125rem', 
                  fontWeight: 600
                }}>
                  {group.groupLabel}
                </h3>
              </div>

              {/* Render fields grouped by display order */}
              {Object.keys(fieldGroups)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((orderBase) => {
                  const fieldsInOrder = fieldGroups[orderBase];
                  
                  if (fieldsInOrder.length === 1) {
                    // Single field - full width
                    return (
                      <div key={orderBase}>
                        {renderField(fieldsInOrder[0])}
                      </div>
                    );
                  } else {
                    // Multiple fields - same row
                    return (
                      <div 
                        key={orderBase} 
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${fieldsInOrder.length}, 1fr)`,
                          gap: 'var(--nw-spacing-lg)'
                        }}
                      >
                        {fieldsInOrder.map((field) => (
                          <div key={field.property}>
                            {renderField(field)}
                          </div>
                        ))}
                      </div>
                    );
                  }
                })}
            </div>
          );
        })}
    </div>
  );
};

// Separate component for catalog select fields to handle async data
const CatalogSelectField: React.FC<{
  field: FormFieldDefinition;
  fieldName: string;
  catalogName: string;
  formField: any; // react-hook-form field
  fetchCatalogData: (catalogName: string) => Promise<any[]>;
}> = ({ field, fieldName, catalogName, formField, fetchCatalogData }) => {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCatalogData = async () => {
      setLoading(true);
      try {
        const catalogOptions = await fetchCatalogData(catalogName);
        setOptions(catalogOptions);
      } finally {
        setLoading(false);
      }
    };

    loadCatalogData();
  }, [catalogName, fetchCatalogData]);

  return (
    <FormItem>
      <FormLabel>
        {field.label} {field.required && <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>}
      </FormLabel>
      <Select
        onValueChange={formField.onChange}
        value={formField.value}
        disabled={loading}
      >
        <FormControl>
          <SelectTrigger data-testid={formatDataTestId(prefixDataTestId, `${fieldName}Select`)}>
            <SelectValue
              placeholder={loading ? "Loading..." : `Select ${field.label.toLowerCase()}`}
            />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && (
        <div className="gba:text-xs gba:text-gray-500">Loading catalog options...</div>
      )}
      <FormMessage />
    </FormItem>
  );
};

export default DynamicGroupSegment;
