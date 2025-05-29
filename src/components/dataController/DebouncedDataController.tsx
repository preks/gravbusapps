import React, { useState, useCallback } from 'react';
import { DataController, DataControllerProps } from './DataController';
import { useDebounce } from '@/common/hooks/useDebounce';

/**
 * Props for DebouncedDataController component
 * Adds debounce functionality to DataController
 */
export interface DebouncedDataControllerProps extends Omit<DataControllerProps, 'search' | 'setSearch'> {
  /** The actual search value to be used in queries */
  actualSearch: string;
  /** Function to update the actual search value */
  setActualSearch: (value: string) => void;
  /** Optional debounce delay in milliseconds */
  debounceDelay?: number;
  
  // Required by DataControllerProps but handled internally
  search: string; // Default implementation, but will be ignored
  setSearch: (value: string) => void; // Default implementation, but will be ignored
}

/**
 * A wrapper around DataController that debounces search input
 * This delays executing queries until the user has stopped typing
 */
export const DebouncedDataController: React.FC<DebouncedDataControllerProps & { search: string; setSearch: (value: string) => void }> = ({
  actualSearch,
  setActualSearch,
  debounceDelay = 300,
  // We ignore the original search and setSearch as we'll manage them internally
  search: _ignored,
  setSearch: _ignoredSetSearch,
  ...props
}) => {
  // Local state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState<string>(actualSearch);
  
  // Debounce the local search value
  const debouncedSearch = useDebounce(localSearch, debounceDelay);
  
  // Update the actual search value when the debounced value changes
  React.useEffect(() => {
    setActualSearch(debouncedSearch);
  }, [debouncedSearch, setActualSearch]);
  
  // Handle local search changes
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
  }, []);
  
  return (
    <DataController
      {...props}
      search={localSearch}
      setSearch={handleSearchChange}
    />
  );
};
