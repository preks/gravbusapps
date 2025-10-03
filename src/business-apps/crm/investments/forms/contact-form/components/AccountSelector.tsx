import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Button,
  Badge,
  Alert,
  AlertDescription,
} from '@newwork/nw-design-system';
import { PiMagnifyingGlass } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { SelectOption } from '../types';
import { useContactFormContext } from '../context/ContactFormContext';

interface AccountSelectorProps {
  value: string[];
  onChange: (accountIds: string[]) => void;
  dataTestId?: string;
  error?: string | null;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
  value,
  onChange,
  dataTestId,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    accounts,
    accountsLoading: loading,
    accountsError,
    accountsHasMore: hasMore,
    searchAccounts: search,
    loadMoreAccounts: loadMore,
    clearAccountSearch: clearSearch,
  } = useContactFormContext();

  // Load initial accounts
  useEffect(() => {
    if (accounts.length === 0 && !loading) {
      clearSearch();
    }
  }, [accounts.length, loading, clearSearch]);

  // Handle search
  useEffect(() => {
    if (searchTerm !== '') {
      search(searchTerm);
    } else {
      clearSearch();
    }
  }, [searchTerm, search, clearSearch]);

  // Get selected accounts for display
  const selectedAccounts = accounts.filter(account => 
    value.includes(account.value)
  );


  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMore();
    }
  };

  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
        Related Account
      </Label>
      

      {/* Account Selection Dropdown */}
      <Select
        value={value.length > 0 ? value[0] : ""}
        onValueChange={(selectedValue) => {
          if (selectedValue && selectedValue !== value[0]) {
            onChange([selectedValue]);
          }
        }}
        open={isOpen}
        onOpenChange={setIsOpen}
        data-testid={dataTestId || 'account-selector'}
      >
        <SelectTrigger className="gba:border-gray-300 gba:bg-white">
          <SelectValue placeholder="Search and select account..." />
        </SelectTrigger>
        <SelectContent className="gba:border-gray-300 gba:bg-white">
          {/* Search Input */}
          <div
            className="gba:p-2 gba:border-b gba:border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gba:relative">
              <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-2 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                <PiMagnifyingGlass className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="gba:w-full gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:text-sm gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
                style={{ paddingLeft: "28px" }}
                data-testid={formatDataTestId(dataTestId || 'account-selector', 'search-input')}
                autoFocus
              />
            </div>
          </div>

          {/* Account Options */}
          <div className="gba:max-h-48 gba:overflow-y-auto">
            {accounts.map((account) => (
              <SelectItem
                key={account.id}
                value={account.value}
                data-testid={formatDataTestId(dataTestId || 'account-selector', `account-option-${account.value}`)}
              >
                <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
                  <span className="gba:truncate">{account.label}</span>
                </div>
              </SelectItem>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="gba:px-3 gba:py-2 gba:border-t gba:border-gray-200">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={loading}
                className="gba:w-full gba:justify-center"
                data-testid={formatDataTestId(dataTestId || 'account-selector', 'load-more-button')}
              >
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}

          {/* No Results */}
          {!loading && accounts.length === 0 && searchTerm && (
            <div className="gba:px-3 gba:py-4 gba:text-center gba:text-gray-500 gba:text-sm">
              No accounts found for "{searchTerm}"
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Error Display */}
      {(error || accountsError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {error || accountsError}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AccountSelector;
