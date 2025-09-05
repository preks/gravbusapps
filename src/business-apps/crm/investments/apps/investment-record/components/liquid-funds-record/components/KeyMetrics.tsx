import React from 'react';
import { Card, CardContent } from '@newwork/nw-design-system';
import { TrendingUp, Target, BarChart3, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/common/data/investment';
import type { LiquidFundInvestmentData } from '../types';

interface KeyMetricsProps {
  liquidFundData: LiquidFundInvestmentData | null;
}

const KeyMetrics: React.FC<KeyMetricsProps> = ({ liquidFundData }) => {
  if (!liquidFundData) {
    return null;
  }
  const { investment } = liquidFundData;

  const marketValue = investment.investmentMarketValue ?? null;
  const initialInvestment = investment.initialInvestmentAmount ?? null;
  const totalInvestment = investment.totalInvestmentAmount ?? null;
  const stakePercentage = investment.stakePercentage ?? null;
  const acquisitionDate = investment.acquisitionDate ?? null;

  // ROI = (Market - Initial) / Initial
  const roi: number | null = marketValue !== null && initialInvestment !== null && initialInvestment > 0
    ? ((marketValue - initialInvestment) / initialInvestment) * 100
    : null;

  // MOIC = Market / Total Investment Amount
  const multipleOfInvestedCapital: number | null = marketValue !== null && totalInvestment !== null && totalInvestment > 0
    ? marketValue / totalInvestment
    : null;

  // Annual Return (CAGR) = (Market / Initial)^(1/years) - 1
  const yearsHeld: number | null = acquisitionDate
    ? Math.max(0, (Date.now() - new Date(acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null;
  const annualReturn: number | null = marketValue !== null && initialInvestment !== null && initialInvestment > 0 && yearsHeld && yearsHeld > 0
    ? (Math.pow(marketValue / initialInvestment, 1 / yearsHeld) - 1) * 100
    : null;

  // Ownership Value = Market * Stake% (fallback to Market if no stake)
  const ownershipValue = marketValue !== null
    ? (stakePercentage !== null ? marketValue * (stakePercentage / 100) : marketValue)
    : 0;
  
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
                {roi === null ? 'N/A' : formatPercentage(roi)}
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
                {multipleOfInvestedCapital === null ? 'N/A' : `${multipleOfInvestedCapital.toFixed(2)}x`}
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
                {annualReturn === null ? 'N/A' : formatPercentage(annualReturn)}
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