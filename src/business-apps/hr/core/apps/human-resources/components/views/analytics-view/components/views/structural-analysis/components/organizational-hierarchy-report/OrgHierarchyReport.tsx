import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useHierarchyDataIntegration } from './hooks/useHierarchyData';
import RadialBarChart from './components/RadialBarChart';

export interface OrganizationalHierarchyReportProps extends BusinessAppContextProps {
  // Add any additional props if needed
}

const OrganizationalHierarchyReport: React.FC<OrganizationalHierarchyReportProps> = (context) => {
  const {
    sunburstData,
    statistics,
    tableData,
    isLoading,
    error,
    viewMode,
    setViewMode,
    refetch
  } = useHierarchyDataIntegration(context);

  const prefixDataTestId = 'OrganizationalHierarchyReport';

  if (isLoading) {
    return (
      <div 
        data-testid={`${prefixDataTestId}-Loading`}
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px' 
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h3>Loading hierarchy data...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        data-testid={`${prefixDataTestId}-Error`}
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px' 
        }}
      >
        <div style={{ textAlign: 'center', color: 'red' }}>
          <h3>Error loading hierarchy data</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid={prefixDataTestId} style={{ width: '100%', height: '100%' }}>
      <RadialBarChart
        data={sunburstData}
        statistics={statistics}
        tableData={tableData}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </div>
  );
};

export default OrganizationalHierarchyReport; 