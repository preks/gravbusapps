import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetAdvancePayments } from '../../../hooks/useGetAdvancePayments';
import AdvancePaymentStatistics from './AdvancePaymentStatistics';
import AdvancePaymentsTable from './AdvancePaymentsTable';

export interface AdvancePaymentsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const AdvancePaymentsTab: React.FC<AdvancePaymentsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Fetch all advance payments for statistics
  const { items: allPayments, fetchItems } = useGetAdvancePayments(contextProps);
  
  // State for search coordination
  const [searchTerm, setSearchTerm] = useState('');

  // Load all items for statistics when component mounts
  useEffect(() => {
    if (contextProps.accessToken && allPayments.length === 0) {
      // Fetch all items for statistics display (large page size)
      fetchItems('', 1, 1000);
    }
  }, [contextProps.accessToken]);

  // Create memoized content header with statistics component
  const contentHeader = useMemo(() => {
    return allPayments && allPayments.length > 0 ? (
      <AdvancePaymentStatistics payments={allPayments} />
    ) : null;
  }, [allPayments]);
  
  // Update the content header when it changes
  useEffect(() => {
    if (props.onContentHeaderChange) {
      props.onContentHeaderChange(contentHeader);
    }
  }, [props.onContentHeaderChange, contentHeader]);

  // Handle search term changes from table
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  return (
    <AdvancePaymentsTable
      {...contextProps}
      search={searchTerm}
      onSearchChange={handleSearchChange}
    />
  );
};

export default AdvancePaymentsTab;
