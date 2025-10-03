import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  Input, 
  FormField,
  FormItem, 
  FormLabel,
  FormControl, 
  FormMessage,
  Combobox,
  Alert,
  Button
} from '@newwork/nw-design-system';
import { useFormContext } from 'react-hook-form';
import { EmployeeSelect } from '@/components/employee-select';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useInvestmentFormContext } from '../../context/InvestmentFormContext';
import { useGetInvestmentAccounts, useSearchInvestmentAccounts } from '@/common/data/investment';
import { SelectOption } from '../../types';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';

const prefixDataTestId = 'InvestmentForm-InvestmentSegment';

// Helper function to get investment type display name
const getInvestmentTypeName = (group: string): string => {
  if (!group) return 'Investment';
  
  const groupCode = group.split(':').pop() || group;
  
  switch (groupCode) {
    case 'LIQUID_FUND':
      return 'Liquid Fund';
    case 'REAL_ESTATE':
      return 'Real Estate';
    case 'EQUITY':
      return 'Equity';
    default:
      return 'Investment';
  }
};

const InvestmentSegment: React.FC = () => {
  const { control } = useFormContext(); // Get form control from react-hook-form context
  const {
    // Form values to get selected group
    formValues,
    setFormValues,
    // Employee positions for owner selection
    employeePositions,
    employeePositionsLoading,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions,
    // Business app context for API calls
    businessAppContext,
  } = useInvestmentFormContext();

  // Account data loading
  const [accounts, setAccounts] = useState<SelectOption[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  
  // Currency data loading
  const [currencies, setCurrencies] = useState<SelectOption[]>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);
  
  // Error state
  const [accountsError, setAccountsError] = useState<string | null>(null);
  
  // Refs to track current lengths for pagination
  const accountsLengthRef = useRef(0);
  
  // Search state
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [accountsHasMore, setAccountsHasMore] = useState(false);

  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(businessAppContext);
  const { searchInvestmentAccounts } = useSearchInvestmentAccounts(businessAppContext);
  
  const catalogClient = useCatalogManagerClient(businessAppContext.accessToken);

  // Load accounts (initial load)
  const loadAccounts = useCallback(async (searchTerm = '', append = false) => {
    if (!businessAppContext.accessToken) return;
    
    setAccountsLoading(true);
    if (!append) {
      setAccountsError(null); // Clear previous errors on new search
    }
    try {
      const limit = 50; // Decreased from 100 to 50 for better performance
      const offset = append ? accountsLengthRef.current : 0;
      
      let result;
      if (searchTerm.trim()) {
        result = await searchInvestmentAccounts(searchTerm, { limit, offset });
      } else {
        result = await fetchInvestmentAccounts({ limit, offset });
      }
      
      const accountOptions = result.InvestmentAccount.map((account: any) => ({
        id: account.id,
        value: account.id,
        label: account.name,
        name: account.name,
      }));
      
      if (append) {
        setAccounts(prev => {
          const newAccounts = [...prev, ...accountOptions];
          accountsLengthRef.current = newAccounts.length;
          return newAccounts;
        });
      } else {
        setAccounts(accountOptions);
        accountsLengthRef.current = accountOptions.length;
      }
      
      // Check if there are more results
      setAccountsHasMore(result.InvestmentAccount.length === limit);
    } catch (error) {
      console.error('Error loading accounts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load accounts. Please try again.';
      setAccountsError(errorMessage);
      
      // Don't clear existing accounts on append errors, only on initial load errors
      if (!append) {
        setAccounts([]);
        accountsLengthRef.current = 0;
        setAccountsHasMore(false);
      }
    } finally {
      setAccountsLoading(false);
    }
  }, [fetchInvestmentAccounts, searchInvestmentAccounts, businessAppContext.accessToken]);

  // Load data on mount
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);
  
  // Search handlers
  const handleAccountSearch = useCallback((searchTerm: string) => {
    setAccountSearchTerm(searchTerm);
    setAccountsError(null); // Clear errors when starting new search
    loadAccounts(searchTerm, false);
  }, [loadAccounts]);
  
  // Load more handlers
  const handleLoadMoreAccounts = useCallback(() => {
    if (!accountsLoading && accountsHasMore) {
      loadAccounts(accountSearchTerm, true);
    }
  }, [loadAccounts, accountSearchTerm, accountsLoading, accountsHasMore]);

  // Transform SelectOption[] to EmployeeOption[] format that EmployeeSelect expects
  // Load currencies
  const loadCurrencies = useCallback(async () => {
    if (!businessAppContext.accessToken) return;
    
    setCurrenciesLoading(true);
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'Currency',
          version: 'v1',
        },
        {
          limit: 200,
          offset: 0,
          returnTotalRecords: false,
          includeChildCatalogEntries: true,
        }
      );

      const currencyOptions = (response.data || []).map((entry: any) => ({
        id: entry.id,
        value: entry.id,
        label: entry.value || entry.code,
        name: entry.value || entry.code,
      }));

      setCurrencies(currencyOptions);
    } catch (error) {
      console.error('Error loading currencies:', error);
    } finally {
      setCurrenciesLoading(false);
    }
  }, [businessAppContext.accessToken, catalogClient]);

  // Load currencies on mount
  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  const assigneeOptions = useMemo(() => (employeePositions || []).map((emp) => ({
    id: emp.id,
    displayName: emp.label,
    pictureThumbnail: emp.extraInfo?.pictureThumbnail,
    organizationalUnitName: emp.extraInfo?.organizationalUnit,
    jobPositionName: emp.extraInfo?.jobPosition,
  })), [employeePositions]);

  // Get dynamic investment type name
  const investmentTypeName = getInvestmentTypeName(formValues.investment.investmentGroupRef ?? '');

  return (
    <div 
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      className="gba:space-y-6"
    >
      <div>
        <h3 className="gba:m-0 gba:text-foreground gba:text-lg gba:font-semibold gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('investment.form.typeInformation', `${investmentTypeName} Information`)}
        </h3>
        <p className="gba:m-0 gba:text-muted-foreground gba:text-sm">
          {getTranslationFromI18nKeyAndLabel('investment.form.basicInformation', `Basic information about the ${investmentTypeName.toLowerCase()}`)}
        </p>
      </div>

      <div className="gba:space-y-6">
        {/* Owner Selection */}
        <FormField
          control={control as any}
          name="investment.ownerEmployee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.form.typeOwner', `${investmentTypeName} Owner`)} <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <EmployeeSelect
                  employees={assigneeOptions}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  onSearch={searchEmployeePositions}
                  loading={Boolean(employeePositionsLoading)}
                  onLoadMore={loadMoreEmployeePositions}
                  hasMore={Boolean(employeePositionsHasMore)}
                  placeholder={getTranslationFromI18nKeyAndLabel('investment.form.selectTypeOwner', `Select ${investmentTypeName.toLowerCase()} owner`)}
                  data-testid={formatDataTestId(prefixDataTestId, 'OwnerSelect')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Investment Name and Currency Row */}
        <div className="gba:grid gba:grid-cols-5 gba:gap-4 gba:w-full gba:min-w-0">
          {/* Investment Name - 2/3 width */}
          <div className="gba:col-span-3">
            <FormField
              control={control as any}
              name="investment.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('investment.form.typeName', `${investmentTypeName} Name`)} <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder={getTranslationFromI18nKeyAndLabel('investment.form.enterTypeName', `Enter ${investmentTypeName.toLowerCase()} name`)}
                      data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Currency - 1/3 width */}
          <div className="gba:col-span-2 gba:min-w-0">
            <FormField
              control={control as any}
              name="investment.currencyRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('investment.form.currency', 'Currency')} <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="gba:w-full gba:min-w-0">
                      <Combobox
                        className="gba:w-full gba:min-w-0"
                        value={field.value || ''}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Note: setFormValues automatically merges investment fields
                          setFormValues({
                            investment: {
                              currencyRef: value
                            }
                          } as Partial<typeof formValues>);
                        }}
                        options={currencies}
                        placeholder={getTranslationFromI18nKeyAndLabel('investment.form.selectCurrency', 'Select currency...')}
                        searchPlaceholder="Search currencies..."
                        emptyText="No currencies found"
                        disabled={currenciesLoading}
                        loading={currenciesLoading}
                        data-testid={formatDataTestId(prefixDataTestId, 'CurrencySelect')}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Related Account */}
        <FormField
          control={control as any}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.form.relatedAccount', 'Related Account')} <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Combobox
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  options={accounts}
                  placeholder={getTranslationFromI18nKeyAndLabel('investment.form.selectAccount', 'Select account...')}
                  searchPlaceholder="Search accounts..."
                  emptyText="No accounts found"
                  disabled={accountsLoading}
                  loading={accountsLoading}
                  onSearch={handleAccountSearch}
                  onLoadMore={handleLoadMoreAccounts}
                  hasMore={accountsHasMore}
                  data-testid={formatDataTestId(prefixDataTestId, 'AccountSelect')}
                />
              </FormControl>
              <FormMessage />
              {accountsError && (
                <Alert 
                  variant="destructive" 
                  className="gba:mt-2"
                  data-testid={formatDataTestId(prefixDataTestId, 'account-error-alert')}
                >
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span>{accountsError}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setAccountsError(null);
                        loadAccounts(accountSearchTerm, false);
                      }}
                      data-testid={formatDataTestId(prefixDataTestId, 'account-retry-button')}
                    >
                      {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
                    </Button>
                  </div>
                </Alert>
              )}
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default InvestmentSegment;
