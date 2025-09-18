import { useState, useCallback } from 'react';
import type { InvestmentAccount } from '@/common/data/investment/types';

export interface UseAccountViewReturn {
  selectedAccounts: Set<string>;
  toggleAccountSelection: (accountId: string) => void;
  selectAllAccounts: () => void;
  clearSelection: () => void;
  getSelectedAccounts: () => InvestmentAccount[];
  hasSelection: boolean;
}

export const useAccountView = (accounts: InvestmentAccount[]): UseAccountViewReturn => {
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());

  const toggleAccountSelection = useCallback((accountId: string) => {
    setSelectedAccounts(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(accountId)) {
        newSelection.delete(accountId);
      } else {
        newSelection.add(accountId);
      }
      return newSelection;
    });
  }, []);

  const selectAllAccounts = useCallback(() => {
    setSelectedAccounts(new Set(accounts.map(account => account.id)));
  }, [accounts]);

  const clearSelection = useCallback(() => {
    setSelectedAccounts(new Set());
  }, []);

  const getSelectedAccounts = useCallback(() => {
    return accounts.filter(account => selectedAccounts.has(account.id));
  }, [accounts, selectedAccounts]);

  const hasSelection = selectedAccounts.size > 0;

  return {
    selectedAccounts,
    toggleAccountSelection,
    selectAllAccounts,
    clearSelection,
    getSelectedAccounts,
    hasSelection
  };
};

