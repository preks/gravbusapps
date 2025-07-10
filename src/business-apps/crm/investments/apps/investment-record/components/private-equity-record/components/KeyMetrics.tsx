import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { DollarSign, TrendingUp, Target, ArrowUpRight } from 'lucide-react';
import { Spin } from 'antd';
import { PrivateEquityInvestmentRecord } from '../types';
import { PrivateEquityInvestmentData } from '../hooks/usePrivateEquityRecordData';
import { formatCurrency } from '../utils/formatters';

interface KeyMetricsProps {
  data?: PrivateEquityInvestmentRecord;
  privateEquityData?: PrivateEquityInvestmentData;
  isLoading?: boolean;
}

const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR';
};

const calculateKPIs = (investment: any) => {
  if (!investment) return { roi: 0, multiple: 0, annualReturn: 0 };
  
  const initialAmount = investment.initialInvestmentAmount || 0;
  const marketValue = investment.marketValue || 0;
  const bookValue = investment.bookValue || 0;
  const acquisitionDate = investment.acquisitionDate;
  
  // Calculate ROI percentage
  const roi = initialAmount > 0 ? ((marketValue - initialAmount) / initialAmount) * 100 : 0;
  
  // Calculate multiple of invested capital
  const multiple = initialAmount > 0 ? marketValue / initialAmount : 0;
  
  // Calculate annual return if acquisition date is available
  let annualReturn = 0;
  if (acquisitionDate) {
    const yearsHeld = (new Date().getTime() - new Date(acquisitionDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (yearsHeld > 0) {
      annualReturn = (Math.pow(multiple, 1 / yearsHeld) - 1) * 100;
    }
  }
  
  return { roi, multiple, annualReturn };
};

const KeyMetrics: React.FC<KeyMetricsProps> = ({ data, privateEquityData, isLoading }) => {
  if (isLoading) {
    return (
      <div>
        <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-4">Key Investment Metrics</h2>
        <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4">
          {[1, 2, 3, 4].map((index) => (
            <Card key={index} className="gba:hover:shadow-md gba:transition-shadow">
              <CardContent className="gba:py-8">
                <div className="gba:flex gba:justify-center gba:items-center">
                  <Spin size="default" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Use real data if available, otherwise fall back to mock data
  const realInvestmentData = privateEquityData?.investment;
  const mockData = data;
  const currencyCode = realInvestmentData?.currency ? extractCurrencyCode(realInvestmentData.currency.code) : 'EUR';
  
  // Calculate KPIs from real data
  const calculatedKPIs = calculateKPIs(realInvestmentData);

  const keyMetricsData = [
    {
      title: 'IRR',
      value: realInvestmentData 
        ? `${calculatedKPIs.annualReturn.toFixed(2)}%` 
        : `${mockData?.private_equity_investment.irr_percentage}%`,
      icon: TrendingUp,
      color: 'gba:text-green-600',
      bgColor: 'gba:bg-green-50'
    },
    {
      title: 'Multiple (TVPI)',
      value: realInvestmentData 
        ? `${calculatedKPIs.multiple.toFixed(2)}x` 
        : `${mockData?.private_equity_investment.multiple_tvpi}x`,
      icon: Target,
      color: 'gba:text-blue-600',
      bgColor: 'gba:bg-blue-50'
    },
    {
      title: 'Annual Return',
      value: realInvestmentData 
        ? `${calculatedKPIs.annualReturn.toFixed(2)}%` 
        : `${mockData?.metrics.annual_return_percentage}%`,
      icon: ArrowUpRight,
      color: 'gba:text-purple-600',
      bgColor: 'gba:bg-purple-50'
    },
    {
      title: 'Current NAV',
      value: realInvestmentData 
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(realInvestmentData.marketValue || 0)
        : (mockData ? formatCurrency(mockData.private_equity_investment.current_nav, mockData.investment.currency_ref) : '€0'),
      icon: DollarSign,
      color: 'gba:text-amber-600',
      bgColor: 'gba:bg-amber-50'
    }
  ];

  return (
    <div>
      <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-4">Key Investment Metrics</h2>
      <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4">
        {keyMetricsData.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={index} className="gba:hover:shadow-md gba:transition-shadow">
              <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {metric.title}
                </CardTitle>
                <div className={`gba:p-2 gba:rounded-lg ${metric.bgColor}`}>
                  <IconComponent className={`gba:h-4 gba:w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {metric.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default KeyMetrics; 