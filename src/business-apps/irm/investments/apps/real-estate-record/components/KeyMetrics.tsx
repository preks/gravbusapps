import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { DollarSign, TrendingUp, Target, Home } from 'lucide-react';
import { RealEstateInvestmentRecord } from '../types';
import { RealEstateInvestmentData } from '../hooks/useRealEstateRecordData';
import { formatCurrency } from '../../shared/utils/formatters';
import { 
  calculateRealEstateKPIs, 
  formatKPIPercentage, 
  formatKPIMultiplier,
  formatKPICurrency 
} from '../utils/kpiCalculations';

interface KeyMetricsProps {
  data?: RealEstateInvestmentRecord; // Legacy mock data
  realEstateData?: RealEstateInvestmentData | null; // Real GraphQL data
  isLoading?: boolean;
}

const KeyMetrics: React.FC<KeyMetricsProps> = ({ data, realEstateData, isLoading }) => {
  // Helper function to format currency with GraphQL data
  const formatCurrencyValue = (amount: number | null, currency?: { code: string } | null): string => {
    if (!amount && amount !== 0) return 'N/A';
    const currencyCode = currency?.code || 'EUR';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate KPIs from real data or use mock data
  let kpis;
  let currency;
  
  if (realEstateData) {
    kpis = calculateRealEstateKPIs(realEstateData);
    currency = realEstateData.investment.currency;
  } else if (data) {
    // Fallback to mock data with asterisk prefix
    kpis = {
      roi_percentage: data.metrics.roi_percentage,
      multiple_of_invested_capital: data.metrics.multiple_of_invested_capital,
      annual_return_percentage: data.metrics.annual_return_percentage,
      ownership_value: data.metrics.ownership_value,
      occupancy_rate: data.real_estate_investment.occupancy_rate
    };
    currency = { code: 'EUR' }; // Mock currency
  } else {
    // Default empty state
    kpis = {
      roi_percentage: null,
      multiple_of_invested_capital: null,
      annual_return_percentage: null,
      ownership_value: null,
      occupancy_rate: null
    };
    currency = { code: 'EUR' };
  }

  const formatROI = () => {
    if (realEstateData) {
      return formatKPIPercentage(kpis.roi_percentage);
    } else if (data) {
      return `*${kpis.roi_percentage?.toFixed(1)}%`;
    }
    return '*N/A';
  };

  const formatMultiple = () => {
    if (realEstateData) {
      return formatKPIMultiplier(kpis.multiple_of_invested_capital);
    } else if (data) {
      return `*${kpis.multiple_of_invested_capital?.toFixed(2)}x`;
    }
    return '*N/A';
  };

  const formatOccupancyRate = () => {
    if (realEstateData) {
      return formatKPIPercentage(kpis.occupancy_rate);
    } else if (data) {
      return `*${kpis.occupancy_rate?.toFixed(1)}%`;
    }
    return '*N/A';
  };

  const formatPropertyValue = () => {
    if (realEstateData) {
      return formatKPICurrency(kpis.ownership_value, currency);
    } else if (data) {
      return `*${formatCurrency(kpis.ownership_value || 0, data.investment.currency_ref)}`;
    }
    return '*N/A';
  };

  if (isLoading) {
    return (
      <div>
        <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-4">Key Investment Metrics</h2>
        <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="gba:hover:shadow-md gba:transition-shadow">
              <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
                <div className="gba:animate-pulse">
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-20 gba:mb-2"></div>
                  <div className="gba:h-6 gba:bg-gray-200 gba:rounded gba:w-16"></div>
                </div>
                <div className="gba:w-8 gba:h-8 gba:bg-gray-200 gba:rounded-lg gba:animate-pulse"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const keyMetricsData = [
    {
      title: 'ROI',
      value: formatROI(),
      icon: TrendingUp,
      color: 'gba:text-green-600',
      bgColor: 'gba:bg-green-50',
      showCalculated: realEstateData && kpis.roi_percentage !== null
    },
    {
      title: 'Multiple (MOIC)',
      value: formatMultiple(),
      icon: Target,
      color: 'gba:text-blue-600',
      bgColor: 'gba:bg-blue-50',
      showCalculated: realEstateData && kpis.multiple_of_invested_capital !== null
    },
    {
      title: 'Occupancy Rate',
      value: formatOccupancyRate(),
      icon: Home,
      color: 'gba:text-indigo-600',
      bgColor: 'gba:bg-indigo-50',
      showCalculated: realEstateData && kpis.occupancy_rate !== null
    },
    {
      title: 'Property Value',
      value: formatPropertyValue(),
      icon: DollarSign,
      color: 'gba:text-amber-600',
      bgColor: 'gba:bg-amber-50',
      showCalculated: realEstateData && kpis.ownership_value !== null
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
                {metric.showCalculated && (
                  <p className="gba:text-xs gba:text-gray-500 gba:mt-1">Calculated from real data</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default KeyMetrics; 