import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import AdvancePaymentStatistics from './AdvancePaymentStatistics';
import AdvancePaymentsTable from './AdvancePaymentsTable';
import { useAdvancePaymentFilters } from '../../../hooks/useAdvancePaymentFilters';

export interface AdvancePaymentsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const AdvancePaymentsTab: React.FC<AdvancePaymentsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use the advance payment filters hook
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    amountRange,
    setAmountRange,
    advanceRange,
    setAdvanceRange,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
  } = useAdvancePaymentFilters();

  // Create memoized content header with statistics component
  const contentHeader = useMemo(() => {
    return <AdvancePaymentStatistics 
      accessToken={contextProps.accessToken}
      userInfo={contextProps.userInfo}
    />;
  }, [contextProps.accessToken, contextProps.userInfo]);
  
  // Update the content header when it changes
  useEffect(() => {
    if (props.onContentHeaderChange) {
      props.onContentHeaderChange(contentHeader);
    }
  }, [props.onContentHeaderChange, contentHeader]);

  // Handle search term changes from table
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, [setSearchTerm]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    handleDataFilterChange(filterId, selected);
  }, [handleDataFilterChange]);

  // Handle clearing all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter([]);
    setAmountRange(null);
    setAdvanceRange(null);
  }, [setSearchTerm, setStatusFilter, setAmountRange, setAdvanceRange]);

  return (
    <AdvancePaymentsTable
      {...contextProps}
      search={searchTerm}
      onSearchChange={handleSearchChange}
      activeFilter={statusFilter} // Pass raw status values - DataController will handle display
      onFilterChange={(filter) => {
        // Update status filter when pills are removed
        setStatusFilter(filter);
      }}
      onClearFilters={clearAllFilters}
      filterGroups={filterGroups}
      handleFilterChange={handleFilterChange}
      filterLabelMap={filterLabelMap}
      amountRange={amountRange}
      advanceRange={advanceRange}
    />
  );
};

export default AdvancePaymentsTab;
