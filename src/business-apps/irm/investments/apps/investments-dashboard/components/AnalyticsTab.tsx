import React from 'react';
import { PieChart } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AnalyticsCharts, AnalyticsMetrics, AnalyticsInsights } from './';

interface AnalyticsTabProps extends BusinessAppContextProps {}

const AnalyticsTab: React.FC<AnalyticsTabProps> = (props) => {
  return (
    <div className="gba:space-y-8" data-testid="analytics-content">
      {/* Analytics Header */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
        <div className="gba:p-3 gba:bg-indigo-500 gba:rounded-lg">
          <PieChart className="gba:h-6 gba:w-6 gba:text-white" />
        </div>
        <div>
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Portfolio Analytics</h2>
          <p className="gba:text-sm gba:text-gray-600">Comprehensive analysis and insights</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="gba:mb-8">
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-4">Key Performance Indicators</h3>
        <AnalyticsMetrics />
      </div>

      {/* Charts and Visualizations */}
      <div className="gba:mb-8">
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-4">Performance Analysis</h3>
        <AnalyticsCharts />
      </div>

      {/* Insights and Recommendations */}
      <div>
        <AnalyticsInsights />
      </div>
    </div>
  );
};

export default AnalyticsTab; 