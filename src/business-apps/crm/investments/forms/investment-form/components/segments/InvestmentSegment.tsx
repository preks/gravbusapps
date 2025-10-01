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
import { useGetInvestmentAccounts, useGetInvestmentContacts, useSearchInvestmentAccounts, useSearchInvestmentContacts } from '@/common/data/investment';
import { SelectOption } from '../../types';

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
    // Employee positions for owner selection
    employeePositions,
    employeePositionsLoading,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions,
    // Business app context for API calls
    businessAppContext,
  } = useInvestmentFormContext();

  // Account and contact data loading
  const [accounts, setAccounts] = useState<SelectOption[]>([]);
  const [contacts, setContacts] = useState<SelectOption[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  
  // Error state
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);
  
  // Refs to track current lengths for pagination
  const accountsLengthRef = useRef(0);
  const contactsLengthRef = useRef(0);
  
  // Search state
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [accountsHasMore, setAccountsHasMore] = useState(false);
  const [contactsHasMore, setContactsHasMore] = useState(false);

  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(businessAppContext);
  const { fetchInvestmentContacts } = useGetInvestmentContacts(businessAppContext);
  const { searchInvestmentAccounts } = useSearchInvestmentAccounts(businessAppContext);
  const { searchInvestmentContacts } = useSearchInvestmentContacts(businessAppContext);

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

  // Load contacts (initial load)
  const loadContacts = useCallback(async (searchTerm = '', append = false) => {
    if (!businessAppContext.accessToken) return;
    
    setContactsLoading(true);
    if (!append) {
      setContactsError(null); // Clear previous errors on new search
    }
    try {
      const limit = 50; // Decreased from 100 to 50 for better performance
      const offset = append ? contactsLengthRef.current : 0;
      
      let result;
      if (searchTerm.trim()) {
        result = await searchInvestmentContacts(searchTerm, { limit, offset });
      } else {
        result = await fetchInvestmentContacts({ limit, offset });
      }
      
      const contactOptions = result.InvestmentContact.map((contact: any) => ({
        id: contact.id,
        value: contact.id,
        label: `${contact.firstName} ${contact.lastName}${contact.companyName ? ` (${contact.companyName})` : ''}`,
        name: `${contact.firstName} ${contact.lastName}`,
        extraInfo: {
          email: contact.email,
          companyName: contact.companyName,
        },
      }));
      
      if (append) {
        setContacts(prev => {
          const newContacts = [...prev, ...contactOptions];
          contactsLengthRef.current = newContacts.length;
          return newContacts;
        });
      } else {
        setContacts(contactOptions);
        contactsLengthRef.current = contactOptions.length;
      }
      
      // Check if there are more results
      setContactsHasMore(result.InvestmentContact.length === limit);
    } catch (error) {
      console.error('Error loading contacts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load contacts. Please try again.';
      setContactsError(errorMessage);
      
      // Don't clear existing contacts on append errors, only on initial load errors
      if (!append) {
        setContacts([]);
        contactsLengthRef.current = 0;
        setContactsHasMore(false);
      }
    } finally {
      setContactsLoading(false);
    }
  }, [fetchInvestmentContacts, searchInvestmentContacts, businessAppContext.accessToken]);

  // Load data on mount
  useEffect(() => {
    loadAccounts();
    loadContacts();
  }, [loadAccounts, loadContacts]);
  
  // Search handlers
  const handleAccountSearch = useCallback((searchTerm: string) => {
    setAccountSearchTerm(searchTerm);
    setAccountsError(null); // Clear errors when starting new search
    loadAccounts(searchTerm, false);
  }, [loadAccounts]);
  
  const handleContactSearch = useCallback((searchTerm: string) => {
    setContactSearchTerm(searchTerm);
    setContactsError(null); // Clear errors when starting new search
    loadContacts(searchTerm, false);
  }, [loadContacts]);
  
  // Load more handlers
  const handleLoadMoreAccounts = useCallback(() => {
    if (!accountsLoading && accountsHasMore) {
      loadAccounts(accountSearchTerm, true);
    }
  }, [loadAccounts, accountSearchTerm, accountsLoading, accountsHasMore]);
  
  const handleLoadMoreContacts = useCallback(() => {
    if (!contactsLoading && contactsHasMore) {
      loadContacts(contactSearchTerm, true);
    }
  }, [loadContacts, contactSearchTerm, contactsLoading, contactsHasMore]);

  // Transform SelectOption[] to EmployeeOption[] format that EmployeeSelect expects
  const assigneeOptions = useMemo(() => (employeePositions || []).map((emp) => ({
    id: emp.id,
    displayName: emp.label,
    pictureThumbnail: emp.extraInfo?.pictureThumbnail,
    organizationalUnitName: emp.extraInfo?.organizationalUnit,
    jobPositionName: emp.extraInfo?.jobPosition,
  })), [employeePositions]);

  // Get dynamic investment type name
  const investmentTypeName = getInvestmentTypeName(formValues.group);

  return (
    <div 
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      className="gba:space-y-6"
    >
      <div>
        <h3 style={{ 
          margin: 0, 
          color: 'var(--nw-color-text-primary)', 
          fontSize: '1.125rem', 
          fontWeight: 600,
          marginBottom: 'var(--nw-spacing-xs)'
        }}>
          {getTranslationFromI18nKeyAndLabel('investment.form.typeInformation', `${investmentTypeName} Information`)}
        </h3>
        <p style={{
          margin: 0,
          color: 'var(--nw-color-text-secondary)',
          fontSize: '0.875rem'
        }}>
          {getTranslationFromI18nKeyAndLabel('investment.form.basicInformation', `Basic information about the ${investmentTypeName.toLowerCase()}`)}
        </p>
      </div>

      <div className="gba:space-y-6">
        {/* Owner Selection */}
        <FormField
          control={control as any}
          name="ownerEmployeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.form.typeOwner', `${investmentTypeName} Owner`)} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
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

        {/* Investment Name */}
        <FormField
          control={control as any}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.form.typeName', `${investmentTypeName} Name`)} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
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

        {/* Related Account */}
        <FormField
          control={control as any}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.form.relatedAccount', 'Related Account')} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
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

        {/* Related Contact */}
        <FormField
          control={control as any}
          name="contactId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.form.relatedContact', 'Related Contact')} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
              </FormLabel>
              <FormControl>
                <Combobox
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  options={contacts}
                  placeholder={getTranslationFromI18nKeyAndLabel('investment.form.selectContact', 'Select contact...')}
                  searchPlaceholder={getTranslationFromI18nKeyAndLabel('investment.form.searchContacts', 'Search contacts...')}
                  emptyText={getTranslationFromI18nKeyAndLabel('investment.form.noContactsFound', 'No contacts found')}
                  disabled={contactsLoading}
                  loading={contactsLoading}
                  onSearch={handleContactSearch}
                  onLoadMore={handleLoadMoreContacts}
                  hasMore={contactsHasMore}
                  data-testid={formatDataTestId(prefixDataTestId, 'ContactSelect')}
                />
              </FormControl>
              <FormMessage />
              {contactsError && (
                <Alert 
                  variant="destructive" 
                  style={{ marginTop: 'var(--nw-spacing-sm)' }}
                  data-testid={formatDataTestId(prefixDataTestId, 'contact-error-alert')}
                >
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span>{contactsError}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setContactsError(null);
                        loadContacts(contactSearchTerm, false);
                      }}
                      data-testid={formatDataTestId(prefixDataTestId, 'contact-retry-button')}
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
