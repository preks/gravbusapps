import React from 'react';
import { Card, CardContent } from '@newwork/nw-design-system';
import { TrendingUp, Target, BarChart3, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../shared/utils/formatters';
import { LiquidFundInvestmentRecord } from '../types';

interface KeyMetricsProps {
  data: LiquidFundInvestmentRecord;
}

const KeyMetrics: React.FC<KeyMetricsProps> = ({ data }) => {
  const metrics = data.metrics;
  
  return (
    <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4">
      <Card className="gba:bg-white gba:shadow-sm gba:hover:shadow-md gba:transition-shadow">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-3 gba:bg-green-100 gba:rounded-lg">
              <TrendingUp className="gba:h-6 gba:w-6 gba:text-green-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">ROI</p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {formatPercentage(metrics.roi_percentage)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gba:bg-white gba:shadow-sm gba:hover:shadow-md gba:transition-shadow">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-3 gba:bg-teal-100 gba:rounded-lg">
              <Target className="gba:h-6 gba:w-6 gba:text-teal-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">Multiple of Invested Capital</p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {metrics.multiple_of_invested_capital.toFixed(2)}x
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gba:bg-white gba:shadow-sm gba:hover:shadow-md gba:transition-shadow">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-3 gba:bg-amber-100 gba:rounded-lg">
              <BarChart3 className="gba:h-6 gba:w-6 gba:text-amber-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">Annual Return</p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {formatPercentage(metrics.annual_return_percentage)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gba:bg-white gba:shadow-sm gba:hover:shadow-md gba:transition-shadow">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-3 gba:bg-teal-100 gba:rounded-lg">
              <DollarSign className="gba:h-6 gba:w-6 gba:text-teal-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">Ownership Value</p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {formatCurrency(metrics.ownership_value, data.investment.currency_ref)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyMetrics; 