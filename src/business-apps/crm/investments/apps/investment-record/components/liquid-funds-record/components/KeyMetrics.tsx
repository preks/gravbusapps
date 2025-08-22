import React from 'react';
import { Card, CardContent } from '@newwork/nw-design-system';
import { TrendingUp, Target, BarChart3, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../../utils/formatters';
import type { LiquidFundInvestmentData } from '../types';

interface KeyMetricsProps {
  liquidFundData: LiquidFundInvestmentData | null;
}

const KeyMetrics: React.FC<KeyMetricsProps> = ({ liquidFundData }) => {
  if (!liquidFundData) {
    return null;
  }
  // Placeholder computations until metrics are provided by API
  const { investment, liquidFundInvestment } = liquidFundData;
  const roi = 0; // derive when available
  const multipleOfInvestedCapital = (investment.investmentMarketValue || 0) / (investment.totalInvestmentAmount || 1);
  const annualReturn = 0; // derive when available
  const ownershipValue = investment.investmentMarketValue || 0;
  
  return (
    <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4">
      <Card className="gba:bg-white gba:shadow-sm gba:hover:shadow-md gba:transition-shadow" data-testid="key-metrics-roi">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-3 gba:bg-green-100 gba:rounded-lg">
              <TrendingUp className="gba:h-6 gba:w-6 gba:text-green-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">ROI</p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {formatPercentage(roi)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gba:bg-white gba:shadow-sm gba:hover:shadow-md gba:transition-shadow" data-testid="key-metrics-multiple">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-3 gba:bg-teal-100 gba:rounded-lg">
              <Target className="gba:h-6 gba:w-6 gba:text-teal-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">Multiple of Invested Capital</p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {multipleOfInvestedCapital.toFixed(2)}x
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gba:bg-white gba:shadow-sm gba:hover:shadow-md gba:transition-shadow" data-testid="key-metrics-annual-return">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-3 gba:bg-amber-100 gba:rounded-lg">
              <BarChart3 className="gba:h-6 gba:w-6 gba:text-amber-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">Annual Return</p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {formatPercentage(annualReturn)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gba:bg-white gba:shadow-sm gba:hover:shadow-md gba:transition-shadow" data-testid="key-metrics-ownership-value">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-3 gba:bg-teal-100 gba:rounded-lg">
              <DollarSign className="gba:h-6 gba:w-6 gba:text-teal-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">Ownership Value</p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {formatCurrency(ownershipValue, investment.currency?.code || 'EUR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyMetrics; 