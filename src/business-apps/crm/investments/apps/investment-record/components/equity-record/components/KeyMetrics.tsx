import React from 'react';
import { Card, CardContent } from '@newwork/nw-design-system';
import { TrendingUp, Target, BarChart3, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../../utils/formatters';
import { EquityInvestmentRecord } from '../types';
import { EquityInvestmentData } from '../hooks/useEquityRecordData';
import { 
  calculateEquityKPIs, 
  formatKPIPercentage, 
  formatKPIMultiplier 
} from '../utils/kpiCalculations';

interface KeyMetricsProps {
  data?: EquityInvestmentRecord; // Legacy mock data
  equityData?: EquityInvestmentData | null; // Real GraphQL data
  isLoading?: boolean;
}

const KeyMetrics: React.FC<KeyMetricsProps> = ({ data, equityData, isLoading }) => {
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
  
  if (equityData) {
    kpis = calculateEquityKPIs(equityData);
    currency = equityData.investment.currency;
  } else if (data) {
    // Fallback to mock data with asterisk prefix
    kpis = {
      roi_percentage: data.metrics.roi_percentage,
      multiple_of_invested_capital: data.metrics.multiple_of_invested_capital,
      annual_return_percentage: data.metrics.annual_return_percentage,
      ownership_value: data.metrics.ownership_value
    };
    currency = { code: 'EUR' }; // Mock currency
  } else {
    // Default empty state
    kpis = {
      roi_percentage: null,
      multiple_of_invested_capital: null,
      annual_return_percentage: null,
      ownership_value: null
    };
    currency = { code: 'EUR' };
  }

  const formatROI = () => {
    if (equityData) {
      return formatKPIPercentage(kpis.roi_percentage);
    } else if (data) {
      return `*${formatPercentage(data.metrics.roi_percentage)}`;
    }
    return '*N/A';
  };

  const formatMultiple = () => {
    if (equityData) {
      return formatKPIMultiplier(kpis.multiple_of_invested_capital);
    } else if (data) {
      return `*${data.metrics.multiple_of_invested_capital.toFixed(2)}x`;
    }
    return '*N/A';
  };

  const formatAnnualReturn = () => {
    if (equityData) {
      return formatKPIPercentage(kpis.annual_return_percentage);
    } else if (data) {
      return `*${formatPercentage(data.metrics.annual_return_percentage)}`;
    }
    return '*N/A';
  };

  const formatOwnershipValue = () => {
    if (equityData) {
      return formatCurrencyValue(kpis.ownership_value, currency);
    } else if (data) {
      return `*${formatCurrency(data.metrics.ownership_value, data.investment.currency_ref)}`;
    }
    return '*N/A';
  };

  if (isLoading) {
    return (
      <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="gba:p-6">
              <div className="gba:animate-pulse">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-12 gba:h-12 gba:bg-gray-200 gba:rounded-lg"></div>
                  <div className="gba:flex-1">
                    <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-24 gba:mb-2"></div>
                    <div className="gba:h-6 gba:bg-gray-200 gba:rounded gba:w-16"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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
                {formatROI()}
              </p>
              {equityData && kpis.roi_percentage !== null && (
                <p className="gba:text-xs gba:text-gray-500">Calculated from real data</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gba:bg-white gba:shadow-sm gba:hover:shadow-md gba:transition-shadow">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-3 gba:bg-blue-100 gba:rounded-lg">
              <Target className="gba:h-6 gba:w-6 gba:text-blue-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">Multiple of Invested Capital</p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {formatMultiple()}
              </p>
              {equityData && kpis.multiple_of_invested_capital !== null && (
                <p className="gba:text-xs gba:text-gray-500">Calculated from real data</p>
              )}
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
                {formatAnnualReturn()}
              </p>
              {equityData && kpis.annual_return_percentage !== null && (
                <p className="gba:text-xs gba:text-gray-500">Calculated from real data</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gba:bg-white gba:shadow-sm gba:hover:shadow-md gba:transition-shadow">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-3 gba:bg-blue-100 gba:rounded-lg">
              <DollarSign className="gba:h-6 gba:w-6 gba:text-blue-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">Ownership Value</p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {formatOwnershipValue()}
              </p>
              {equityData && kpis.ownership_value !== null && (
                <p className="gba:text-xs gba:text-gray-500">Calculated from real data</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyMetrics; 