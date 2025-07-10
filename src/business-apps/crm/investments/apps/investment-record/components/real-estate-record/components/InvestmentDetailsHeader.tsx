import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Badge } from '@newwork/nw-design-system';
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Award, 
  Calendar, 
  Settings,
  Home,
  AlertCircle
} from 'lucide-react';
import { RealEstateInvestmentRecord } from '../types';
import { RealEstateInvestmentData } from '../hooks/useRealEstateRecordData';
import { formatCurrency, formatPercentage, getStatusColor } from '../../../utils/formatters';

interface InvestmentDetailsHeaderProps {
  data?: RealEstateInvestmentRecord; // Legacy mock data
  realEstateData?: RealEstateInvestmentData | null; // Real GraphQL data
  isLoading?: boolean;
  error?: string | null;
}

const InvestmentDetailsHeader: React.FC<InvestmentDetailsHeaderProps> = ({ 
  data, 
  realEstateData, 
  isLoading, 
  error 
}) => {
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

  // Helper function to format percentage
  const formatPercentageValue = (value: number | null): string => {
    if (!value && value !== 0) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  // Helper function to format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch {
      return 'N/A';
    }
  };

  // Use real data if available, otherwise fall back to mock data
  const investment = realEstateData?.investment;
  const companyName = investment?.account?.name || (data ? `*${data.company_details.name}` : '*Mock Company');
  const bookValue = investment ? formatCurrencyValue(investment.bookValue, investment.currency) : 
    (data ? `*${formatCurrency(data.investment.book_value, data.investment.currency_ref)}` : '*N/A');
  const marketValue = investment ? formatCurrencyValue(investment.marketValue, investment.currency) : 
    (data ? `*${formatCurrency(data.investment.market_value, data.investment.currency_ref)}` : '*N/A');
  const initialInvestment = investment ? formatCurrencyValue(investment.initialInvestmentAmount, investment.currency) : 
    (data ? `*${formatCurrency(data.investment.initial_investment_amount, data.investment.currency_ref)}` : '*N/A');
  const totalInvestment = investment ? formatCurrencyValue(investment.totalInvestmentAmount, investment.currency) : 
    (data ? `*${formatCurrency(data.investment.total_investment_amount, data.investment.currency_ref)}` : '*N/A');
  const stakePercent = investment ? formatPercentageValue(investment.stakePercent) : 
    (data ? `*${formatPercentage(data.investment.stake_percent)}` : '*N/A');
  const acquisitionDate = investment ? formatDate(investment.acquisitionDate) : 
    (data ? `*${new Date(data.investment.acquisition_date).toLocaleDateString('de-DE')}` : '*N/A');
  const status = investment?.investmentStatus?.value || (data ? '*Active' : '*Unknown');
  const statusColor = investment?.investmentStatus ? getStatusColor(investment.investmentStatus.code) : 
    (data ? getStatusColor(data.investment.investment_status_ref) : 'gba:bg-gray-100 gba:text-gray-800');

  if (isLoading) {
    return (
      <div className="gba:px-6 gba:pt-6 gba:pb-4">
        <Card className="gba:bg-gradient-to-r gba:from-green-50 gba:to-emerald-50 gba:border-green-200">
          <CardContent className="gba:p-6">
            <div className="gba:animate-pulse">
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4 gba:mb-4"></div>
              <div className="gba:grid gba:gap-4 gba:grid-cols-2 gba:md:grid-cols-4 gba:lg:grid-cols-7">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i}>
                    <div className="gba:h-3 gba:bg-gray-200 gba:rounded gba:w-2/3 gba:mb-2"></div>
                    <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:px-6 gba:pt-6 gba:pb-4">
        <Card className="gba:bg-gradient-to-r gba:from-orange-50 gba:to-yellow-50 gba:border-orange-200">
          <CardContent className="gba:p-6">
            <div className="gba:flex gba:items-start gba:gap-3">
              <AlertCircle className="gba:h-5 gba:w-5 gba:text-orange-600 gba:mt-0.5 gba:flex-shrink-0" />
              <div className="gba:flex-1">
                <p className="gba:font-semibold gba:text-orange-800 gba:mb-2">Development Mode - Using Sample Data</p>
                <p className="gba:text-sm gba:text-orange-700 gba:mb-3">
                  The specific real estate investment was not found, but sample data is being used for development purposes.
                </p>
                <details className="gba:text-xs gba:text-orange-600">
                  <summary className="gba:cursor-pointer gba:font-medium gba:mb-1">Technical Details</summary>
                  <pre className="gba:whitespace-pre-wrap gba:bg-orange-100 gba:p-2 gba:rounded gba:mt-1">{error}</pre>
                </details>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="gba:px-6 gba:pt-6 gba:pb-4">
      <Card className="gba:bg-gradient-to-r gba:from-green-50 gba:to-emerald-50 gba:border-green-200">
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:p-2 gba:bg-green-100 gba:rounded-md">
              <Home className="gba:h-4 gba:w-4 gba:text-green-600" />
            </div>
            <div>
              <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {investment?.name || (data ? `*${data.investment.name}` : '*Investment Details')}
              </h2>
              <div className="gba:flex gba:items-center gba:gap-3 gba:mt-0.5">
                <Badge className="gba:bg-green-100 gba:text-green-800 gba:text-xs gba:px-2 gba:py-0.5">
                  {investment?.investmentGroup?.value || 'Real Estate'}
                </Badge>
                <Badge className="gba:bg-indigo-100 gba:text-indigo-800 gba:text-xs gba:px-2 gba:py-0.5">
                  {realEstateData?.realEstateType?.value || '*Property Investment'}
                </Badge>
                <span className="gba:text-xs gba:text-gray-600">{companyName}</span>
                {realEstateData && investment?.name && !investment.name.includes('*') && (
                  <Badge className="gba:bg-green-100 gba:text-green-800 gba:text-xs gba:px-2 gba:py-0.5">
                    Real Data
                  </Badge>
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:pt-0">
          <div className="gba:grid gba:gap-4 gba:grid-cols-2 gba:md:grid-cols-4 gba:lg:grid-cols-7">
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <DollarSign className="gba:h-3 gba:w-3 gba:text-green-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Book Value</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {bookValue}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <TrendingUp className="gba:h-3 gba:w-3 gba:text-blue-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Market Value</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {marketValue}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Target className="gba:h-3 gba:w-3 gba:text-green-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Initial Investment</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {initialInvestment}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <BarChart3 className="gba:h-3 gba:w-3 gba:text-amber-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Total Investment</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {totalInvestment}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Award className="gba:h-3 gba:w-3 gba:text-indigo-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Ownership %</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {stakePercent}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Calendar className="gba:h-3 gba:w-3 gba:text-gray-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Acquired</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {acquisitionDate}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Settings className="gba:h-3 gba:w-3 gba:text-gray-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Status</span>
              </div>
              <Badge className={`${statusColor} gba:text-xs gba:px-1.5 gba:py-0.5`}>
                {status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentDetailsHeader; 