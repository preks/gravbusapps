import React, { useEffect, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useMainViewAdvancePayments } from '../../../hooks/useMainViewAdvancePayments';
import { useAdvancePaymentFilters } from '../../../hooks/useAdvancePaymentFilters';
import AdvancePaymentStatistics from './AdvancePaymentStatistics';
import AdvancePaymentsTable from './AdvancePaymentsTable';

interface AdvancePaymentsTabProps extends BusinessAppContextProps {}

const AdvancePaymentsTab: React.FC<AdvancePaymentsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Get managerId from userInfo for currency filtering
  const managerId = props.userInfo?.employeeDetails?.employeeId || '';
  
  // Use the advance payment filters hook with accessToken and managerId for dynamic currency data
  const { currencyFilter } = useAdvancePaymentFilters({
    accessToken: props.accessToken,
    managerId
  });

  // Use the new main view hook for advance payments with currency filter
  const {
    paymentStats: advancePaymentStats,
    statsLoading,
    statsError,
    fetchPaymentStatistics: fetchAdvancePaymentStatistics,
  } = useMainViewAdvancePayments({
    ...contextProps,
    pageSize: 1000, // Large page size for statistics
    currentCurrencyFilter: currencyFilter, // Use the dynamic currency filter
  });
  
  // Fetch statistics on component mount
  useEffect(() => {
    fetchAdvancePaymentStatistics();
  }, [fetchAdvancePaymentStatistics]);

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      {/* Statistics Section - Now inside the tab content */}
      <div className="gba:mb-6">
        <AdvancePaymentStatistics 
          advancePaymentStats={advancePaymentStats} 
          statsLoading={statsLoading} 
          statsError={statsError} 
          fetchAdvancePaymentStatistics={fetchAdvancePaymentStatistics} 
        />
      </div>
      
      {/* Table Container */}
      <div className="gba:flex-1">
        <div data-testid="advance-payments-table-container">
          <AdvancePaymentsTable
            {...contextProps}
          />
        </div>
      </div>
    </div>
  );
};

export default AdvancePaymentsTab;
