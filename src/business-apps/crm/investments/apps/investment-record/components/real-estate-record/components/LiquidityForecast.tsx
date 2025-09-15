import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@newwork/nw-design-system';
import { TrendingUp } from 'lucide-react';
import { RealEstateInvestmentData } from '../hooks/useRealEstateRecordData';
import { 
  parseLiquidityForecast, 
  formatLiquidityAmount,
  LiquidityForecastData 
} from '../types/liquidityForecastTypes';

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

  // Check liquidity forecast data availability
  React.useEffect(() => {
    if (realEstateData?.realEstateInvestment) {
      const hasLiquidityData = realEstateData.realEstateInvestment.liquidityForecast !== null;
      // Track liquidity forecast data availability
    }
  }, [realEstateData]);

  // Parse liquidity forecast data from real estate investment
  const forecastData: LiquidityForecastData | null = parseLiquidityForecast(
    realEstateData?.realEstateInvestment?.liquidityForecast
  );

  // Check if we have real liquidity forecast data vs placeholder data
  const hasRealData = forecastData && forecastData.amounts.some(amount => 
    typeof amount === 'number' || (typeof amount === 'string' && amount !== 'xxx Mio.')
  );

  // Get currency from investment data
  const currencyCode = realEstateData?.investment?.currency?.code || 'EUR';

  // If no real data, show empty state message
  if (!hasRealData) {
    return (
      <Card data-testid={dataTestId}>
        <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
          <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />
          Liquidity Forecast
        </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:py-8 gba:text-gray-500">
            <p>No liquidity forecast data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show real data in table format
  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
          <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />
          Liquidity Forecast
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
                {forecastData!.years.map((year) => (
                  <th 
                    key={year}
                    className="gba:text-center gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900"
                  >
                    {year}
                  </th>
                ))}
                <th className="gba:text-center gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">
                  Balanced Cashflow<br/>until {forecastData!.balancedCashflowDate}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="gba:border-b gba:border-gray-100">
                <td className="gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">
                  Amount (Mio.)
                </td>
                {forecastData!.amounts.map((amount, index) => (
                  <td 
                    key={index}
                    className="gba:text-center gba:py-3 gba:px-4 gba:text-gray-700"
                  >
                    {formatLiquidityAmount(amount, currencyCode)}
                  </td>
                ))}
                <td className="gba:text-center gba:py-3 gba:px-4 gba:text-gray-700 gba:font-medium">
                  {formatLiquidityAmount(forecastData!.balancedAmount, currencyCode)}
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
