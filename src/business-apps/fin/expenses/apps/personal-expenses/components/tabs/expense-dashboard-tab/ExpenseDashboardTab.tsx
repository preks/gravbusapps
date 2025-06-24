import React, { useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Space } from 'antd';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { useGetExpenseDashboard } from '../../../hooks/useGetExpenseDashboard';
import { DataControllerProps } from '@/components/dataController/DataController';
import {
  SummaryStatistics,
  SpendingOverview,
  ActionFeed,
  QuickActionCards,
  AiAssistant
} from './components';
// We don't need React Router navigation for tab switching

// Custom DataController without search button
const CustomDataController: React.FC<DataControllerProps> = () => {
  // Return empty fragment (no search, no filter controls)
  return <></>;
};

export interface ExpenseDashboardTabProps extends BusinessAppContextProps {}

const ExpenseDashboardTab: React.FC<ExpenseDashboardTabProps> = (props) => {
  const { stats, isLoading, error } = useGetExpenseDashboard(props);
  const [chartView, setChartView] = useState<string | number>('Monthly');
  // Function to navigate to expense items with a specific filter
  const navigateToExpenseItems = (filter: string) => {
    console.log('ExpenseDashboardTab: navigateToExpenseItems called with filter:', filter);
    try {
      // Save the filter to sessionStorage for the tab component to read
      sessionStorage.setItem('expenseItemsFilter', filter);
      
      // Use the global API to switch tabs if it's available
      if (window.tabNavigationAPI) {
        // Set the filter in the API
        window.tabNavigationAPI.filter = filter;
        
        // Switch to the expense-items tab
        window.tabNavigationAPI.setActiveTab('expense-items');
        console.log('ExpenseDashboardTab: Switched to expense-items tab using global API');
      } else {
        console.error('ExpenseDashboardTab: Global tab navigation API not available');
      }
      
      console.log('ExpenseDashboardTab: Tab navigation request completed');
    } catch (error) {
      console.error('ExpenseDashboardTab: Tab navigation error:', error);
    }
  };

  const renderDataBody = () => {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <SummaryStatistics stats={stats ?? undefined} isLoading={isLoading} error={error ? new Error(error) : null} />
        </div>
        
        <div>
          <AiAssistant 
            stats={stats ?? undefined} 
            isLoading={isLoading} 
            error={error ? new Error(error) : null}
            navigateToExpenseItems={navigateToExpenseItems}
          />
        </div>

        <div>
          <QuickActionCards />
        </div>

        <div>
          <SpendingOverview
            stats={stats ?? undefined}
            isLoading={isLoading}
            error={error ? new Error(error) : null}
            chartView={chartView}
            setChartView={setChartView}
          />
        </div>

        <div>
          <ActionFeed stats={stats ?? undefined} isLoading={isLoading} error={error ? new Error(error) : null} />
        </div>
      </Space>
    );
  };

  return (
    <DataContainer
      dataControllerComponent={CustomDataController}
      dataControllerProps={{
        search: '',
        filter: [],
        setSearch: () => {},
        setFilter: () => {},
      }}
      dataFilterProps={{}}
      hideFilter={true}
      dataBody={renderDataBody()}
      contentBackground="white"
    />
  );
};

export default ExpenseDashboardTab;
