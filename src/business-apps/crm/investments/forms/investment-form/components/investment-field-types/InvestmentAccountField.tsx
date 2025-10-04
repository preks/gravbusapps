import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Controller, Control, FieldValues } from 'react-hook-form';
import { Combobox, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useGetInvestmentAccounts, useSearchInvestmentAccounts } from '@/common/data/investment';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DynamicFormFieldDefinition } from '@/components/dynamic-form';
import { SelectOption } from '../../types';

interface InvestmentAccountFieldProps {
  field: DynamicFormFieldDefinition;
  fieldName: string;
  control: Control<FieldValues>;
  businessAppContext: BusinessAppContextProps;
  testIdPrefix?: string;
}

export const InvestmentAccountField: React.FC<InvestmentAccountFieldProps> = ({
  field,
  fieldName,
  control,
  businessAppContext,
  testIdPrefix = 'InvestmentForm',
}) => {
  const [investmentAccounts, setInvestmentAccounts] = useState<SelectOption[]>([]);
  const [investmentAccountsLoading, setInvestmentAccountsLoading] = useState(false);
  const [investmentAccountsHasMore, setInvestmentAccountsHasMore] = useState(false);
  const investmentAccountsLengthRef = useRef(0);
  const [investmentAccountSearchTerm, setInvestmentAccountSearchTerm] = useState('');
  
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(businessAppContext);
  const { searchInvestmentAccounts } = useSearchInvestmentAccounts(businessAppContext);
  
  // Load investment accounts
  const loadInvestmentAccounts = useCallback(async (searchTerm = '', append = false) => {
    if (!businessAppContext.accessToken) return;
    
    setInvestmentAccountsLoading(true);
    try {
      const limit = 50;
      const offset = append ? investmentAccountsLengthRef.current : 0;
      
      let response;
      if (searchTerm) {
        response = await searchInvestmentAccounts(searchTerm, { limit, offset });
      } else {
        response = await fetchInvestmentAccounts({ limit, offset });
      }
      
      const newAccounts: SelectOption[] = (response?.InvestmentAccount || []).map((account: any) => ({
        id: account.id,
        value: account.id,
        label: account.name || 'Unnamed Account',
        name: account.name || 'Unnamed Account',
      }));
      
      if (append) {
        setInvestmentAccounts((prev) => [...prev, ...newAccounts]);
        investmentAccountsLengthRef.current += newAccounts.length;
      } else {
        setInvestmentAccounts(newAccounts);
        investmentAccountsLengthRef.current = newAccounts.length;
      }
      
      const totalCount = response?.InvestmentAccountAggregate?.aggregate?.count || 0;
      setInvestmentAccountsHasMore(investmentAccountsLengthRef.current < totalCount);
    } catch (error) {
      console.error('Error loading investment accounts:', error);
    } finally {
      setInvestmentAccountsLoading(false);
    }
  }, [businessAppContext.accessToken, fetchInvestmentAccounts, searchInvestmentAccounts]);
  
  // Load investment accounts on mount
  useEffect(() => {
    if (businessAppContext.accessToken) {
      loadInvestmentAccounts();
    }
  }, [businessAppContext.accessToken, loadInvestmentAccounts]);
  
  // Handle investment account search
  const handleInvestmentAccountSearch = useCallback((searchTerm: string) => {
    setInvestmentAccountSearchTerm(searchTerm);
    investmentAccountsLengthRef.current = 0;
    loadInvestmentAccounts(searchTerm, false);
  }, [loadInvestmentAccounts]);
  
  // Handle load more investment accounts
  const handleLoadMoreInvestmentAccounts = useCallback(() => {
    if (!investmentAccountsLoading && investmentAccountsHasMore) {
      loadInvestmentAccounts(investmentAccountSearchTerm, true);
    }
  }, [investmentAccountsLoading, investmentAccountsHasMore, investmentAccountSearchTerm, loadInvestmentAccounts]);

  return (
    <Controller
      name={fieldName as any}
      control={control}
      render={({ field: formField, fieldState }) => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.required && <span className="gba:text-destructive"> *</span>}
          </FormLabel>
          <FormControl>
            <Combobox
              value={typeof formField.value === 'object' ? formField.value?.id || '' : (formField.value || '')}
              onValueChange={(value) => {
                // Store as object if value exists, undefined if cleared
                formField.onChange(value ? { id: value } as any : undefined);
              }}
              options={investmentAccounts}
              placeholder={getTranslationFromI18nKeyAndLabel('investment.form.selectInvestmentAccount', 'Select investment account...')}
              searchPlaceholder="Search investment accounts..."
              emptyText="No investment accounts found"
              disabled={investmentAccountsLoading}
              loading={investmentAccountsLoading}
              onSearch={handleInvestmentAccountSearch}
              onLoadMore={handleLoadMoreInvestmentAccounts}
              hasMore={investmentAccountsHasMore}
              data-testid={formatDataTestId(testIdPrefix, `${fieldName}Select`)}
            />
          </FormControl>
          <FormMessage>{fieldState.error?.message}</FormMessage>
        </FormItem>
      )}
    />
  );
};

