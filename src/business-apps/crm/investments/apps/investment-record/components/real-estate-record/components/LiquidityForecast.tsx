import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@newwork/nw-design-system';
import { TrendingUp } from 'lucide-react';
import { RealEstateInvestmentData } from '../hooks/useRealEstateRecordData';

interface LiquidityForecastProps {
  realEstateData?: RealEstateInvestmentData | null;
  isLoading?: boolean;
  'data-testid'?: string;
}

const LiquidityForecast: React.FC<LiquidityForecastProps> = ({
  realEstateData,
  isLoading,
  'data-testid': dataTestId = 'liquidity-forecast'
}) => {
  if (isLoading) {
    return (
      <Card data-testid={dataTestId}>
        <CardHeader>
          <div className="gba:animate-pulse">
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse">
            <div className="gba:space-y-3">
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // For now, this is hardcoded data as requested
  // In the future, this could be pulled from realEstateData?.realEstateInvestment?.liquidityForecast
  const forecastData = {
    years: [2025, 2026, 2027, 2028, 2029],
    balancedCashflowDate: '31.12.2029',
    amounts: [
      'xxx Mio.',
      'xxx Mio.',
      'xxx Mio.',
      'xxx Mio.',
      'xxx Mio.'
    ],
    balancedAmount: 'xxx Mio.'
  };

  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
          <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />
          Liquidity Forecast 5 Years
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:overflow-x-auto">
          <table className="gba:w-full gba:border-collapse" data-testid={`${dataTestId}-table`}>
            <thead>
              <tr className="gba:border-b gba:border-gray-200">
                <th className="gba:text-left gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">
                  Year
                </th>
                {forecastData.years.map((year) => (
                  <th 
                    key={year}
                    className="gba:text-center gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900"
                  >
                    {year}
                  </th>
                ))}
                <th className="gba:text-center gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">
                  Balanced Cashflow<br/>until {forecastData.balancedCashflowDate}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="gba:border-b gba:border-gray-100">
                <td className="gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">
                  Amount (Mio.)
                </td>
                {forecastData.amounts.map((amount, index) => (
                  <td 
                    key={index}
                    className="gba:text-center gba:py-3 gba:px-4 gba:text-gray-700"
                  >
                    {amount}
                  </td>
                ))}
                <td className="gba:text-center gba:py-3 gba:px-4 gba:text-gray-700 gba:font-medium">
                  {forecastData.balancedAmount}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiquidityForecast;
