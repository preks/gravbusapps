import React, { useState, useEffect, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useMainViewAdvancePayments } from '../../../hooks/useMainViewAdvancePayments';
import AdvancePaymentStatistics from './AdvancePaymentStatistics';
import AdvancePaymentsTable from './AdvancePaymentsTable';

interface AdvancePaymentsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: React.ReactNode) => void;
}

const AdvancePaymentsTab: React.FC<AdvancePaymentsTabProps> = (props) => {
  const { onContentHeaderChange } = props;
  
  // Search term state for synchronization with table
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);

  // Use the new main view hook for advance payments
  const {
    paymentStats: advancePaymentStats,
    statsLoading,
    statsError,
    fetchPaymentStatistics: fetchAdvancePaymentStatistics,
  } = useMainViewAdvancePayments({
    ...contextProps,
    pageSize: 1000, // Large page size for statistics
  });
  
  // Fetch statistics on component mount
  useEffect(() => {
    fetchAdvancePaymentStatistics();
  }, [fetchAdvancePaymentStatistics]);

  // Update the content header when statistics change
  useEffect(() => {
    if (onContentHeaderChange) {
      const headerContent = (
        <AdvancePaymentStatistics 
          advancePaymentStats={advancePaymentStats} 
          statsLoading={statsLoading} 
          statsError={statsError} 
          fetchAdvancePaymentStatistics={fetchAdvancePaymentStatistics} 
        />
      );
      onContentHeaderChange(headerContent);
    }
  }, [advancePaymentStats, statsLoading, statsError, onContentHeaderChange, fetchAdvancePaymentStatistics]);

  // Handle search changes from the table
  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
  };





  return (
    <AdvancePaymentsTable
      {...contextProps}
      search={searchTerm}
      onSearchChange={handleSearchChange}
    />
  );
};

export default AdvancePaymentsTab;
