import React from 'react';
import { Card, CardContent } from '@newwork/nw-design-system';
import { TrendingUp, Trophy, LineChart, Activity } from 'lucide-react';

const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    return `${currencyCode} ${amount.toLocaleString()}`;
  }
};

export interface PipelineStatisticsMetrics {
  totalValue: number;
  avgDealSize: number;
  conversionRate: number;
  avgSalesCycle: number; // days
}

export interface PipelineStatisticsProps {
  pipelineId: string;
  metrics: PipelineStatisticsMetrics;
}

export const PipelineStatistics: React.FC<PipelineStatisticsProps> = ({ pipelineId, metrics }) => {
  return (
    <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4">
      <Card>
        <CardContent className="gba:p-6">
          <div data-testid={`pipeline-${pipelineId}-total-value`} className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <TrendingUp className="gba:text-blue-600 gba:h-5 gba:w-5 gba:mr-2" />
              <span className="gba:text-blue-700 gba:text-sm gba:font-medium">Total Pipeline Value</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">
              {formatCurrency(metrics.totalValue)}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="gba:p-6">
          <div data-testid={`pipeline-${pipelineId}-avg-deal-size`} className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <Trophy className="gba:text-green-600 gba:h-5 gba:w-5 gba:mr-2" />
              <span className="gba:text-green-700 gba:text-sm gba:font-medium">Avg Deal Size</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-green-900">
              {formatCurrency(metrics.avgDealSize)}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="gba:p-6">
          <div data-testid={`pipeline-${pipelineId}-conversion-rate`} className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <LineChart className="gba:text-orange-600 gba:h-5 gba:w-5 gba:mr-2" />
              <span className="gba:text-orange-700 gba:text-sm gba:font-medium">Conversion Rate</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-orange-900">
              {metrics.conversionRate.toFixed(1)}%
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="gba:p-6">
          <div data-testid={`pipeline-${pipelineId}-sales-cycle`} className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <Activity className="gba:text-purple-600 gba:h-5 gba:w-5 gba:mr-2" />
              <span className="gba:text-purple-700 gba:text-sm gba:font-medium">Avg Sales Cycle</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-purple-900">
              {Math.round(metrics.avgSalesCycle)} days
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PipelineStatistics;

