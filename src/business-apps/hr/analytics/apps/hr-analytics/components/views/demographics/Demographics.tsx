import React from 'react';
import { Button, Spinner, Card, CardContent } from '@newwork/nw-design-system';
import { PiArrowClockwise } from 'react-icons/pi';
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext';
import { useDemographicsDataIntegration } from './hooks/useDemographicsDataIntegration';
import DemographicsChartsView from './components/DemographicsChartsView';
import DemographicsStatistics from './components/DemographicsStatistics';

interface DemographicsProps extends BusinessAppContextProps {}

const Demographics: React.FC<DemographicsProps> = (context) => {
  const {
    demographicsData,
    statistics,
    isLoading,
    error,
    refetch
  } = useDemographicsDataIntegration(context);

  const prefixDataTestId = 'Demographics';

  if (error) {
    return (
      <div 
        data-testid={`${prefixDataTestId}-error`}
        className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
      >
        <Card className="gba:border-red-200 gba:bg-red-50">
          <CardContent className="gba:p-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-red-900 gba:font-medium gba:mb-2">Failed to Load Demographics Data</h3>
                <p className="gba:text-red-700">{error}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={refetch}
                className="gba:flex gba:items-center gba:gap-2"
              >
                <PiArrowClockwise />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div 
        data-testid={`${prefixDataTestId}-loading`}
        className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg gba:flex gba:justify-center gba:items-center gba:flex-col"
      >
        <Spinner className="gba:w-8 gba:h-8" />
        <p className="gba:mt-4 gba:text-gray-600">
          Loading demographics data and analytics...
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid={prefixDataTestId}
      className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:m-0">
            Employee Demographics
          </h2>
          <div className="gba:bg-white gba:px-3 gba:py-1 gba:rounded-full gba:border gba:border-gray-200">
            <span className="gba:font-semibold gba:text-blue-600">
              {statistics.totalEmployees} Employees
            </span>
          </div>
        </div>
        <Button 
          onClick={refetch}
          data-testid={`${prefixDataTestId}-refresh-button`}
          className="gba:flex gba:items-center gba:gap-2"
        >
          <PiArrowClockwise />
          Refresh Data
        </Button>
      </div>

      {/* Statistics Overview */}
      <DemographicsStatistics 
        statistics={statistics}
        isLoading={isLoading}
        dataTestId={prefixDataTestId}
      />

      {/* Interactive Charts with Expandable Tables */}
      <div className="gba:mt-6">
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
            Demographics Breakdown
          </h3>
          <p className="gba:text-sm gba:text-gray-600">
            Click on any chart to view detailed data table
          </p>
        </div>
        
        <DemographicsChartsView 
          demographicsData={demographicsData}
          isLoading={isLoading}
          dataTestId={prefixDataTestId}
        />
      </div>
    </div>
  );
};

export default Demographics; 