import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { 
  Building2, 
  Calendar, 
  DollarSign,
  TrendingUp,
  Percent,
  BarChart3,
  User,
  AlertCircle
} from 'lucide-react';
import { EquityInvestmentRecord } from '../types';
import { EquityInvestmentData } from '../hooks/useEquityRecordData';
import { formatCurrency, formatPercentage, getStatusColor, formatDate } from '@/common/data/investment';
import PlannedExitFlag from '../../shared/PlannedExitFlag';
import { AiSummaryButton } from '../../shared/AiSummaryButton';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface InvestmentDetailsHeaderProps {
  data?: EquityInvestmentRecord; // Legacy mock data
  equityData?: EquityInvestmentData | null; // Real GraphQL data
  isLoading?: boolean;
  error?: string | null;
  context?: BusinessAppContextProps;
  investmentId?: string;
}

const InvestmentDetailsHeader: React.FC<InvestmentDetailsHeaderProps> = ({ 
  data, 
  equityData, 
  isLoading, 
  error,
  context,
  investmentId
}) => {
  // Early return if loading or no data yet
  if (isLoading || !equityData) {
    return (
      <Card className="gba:mb-6">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <div className="gba:text-center">
              <p className="gba:text-gray-500">Loading investment details...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  // Helper function to extract currency code from GraphQL format
  const extractCurrencyCode = (currencyId?: string): string => {
    if (!currencyId) return 'EUR';
    return currencyId.split(':').pop() || 'EUR';
  };

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

  // Use real data from GraphQL only
  const investment = equityData?.investment;
  const companyName = investment?.investmentAccount?.name || '';
  // Map fields to schema-backed values
  const bookValue = investment ? formatCurrencyValue(investment.initialInvestmentAmount ?? null, investment.currency) : 'N/A';
  const marketValue = investment ? formatCurrencyValue(investment.investmentMarketValue ?? null, investment.currency) : 'N/A';
  const initialInvestment = investment ? formatCurrencyValue(investment.initialInvestmentAmount ?? null, investment.currency) : 'N/A';
  const totalInvestment = investment ? formatCurrencyValue(investment.totalInvestmentAmount ?? null, investment.currency) : 'N/A';
  const stakePercent = investment ? (investment.stakePercentage !== null && investment.stakePercentage !== undefined ? `${investment.stakePercentage.toFixed(1)}%` : '-') : 'N/A';
  const acquisitionDate = investment ? formatDate(investment.acquisitionDate ?? null) : 'N/A';
  const status = investment?.investmentStatus?.value || '';

  if (isLoading) {
    return (
      <div className="gba:px-6 gba:pt-6 gba:pb-4">
        <Card className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-indigo-50 gba:border-blue-200">
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

  // Always render the header - no error handling

  return (
    <div className="gba:px-6 gba:pt-6 gba:pb-4">
      <Card className="gba:bg-white gba:border gba:shadow-sm">
        <CardContent className="gba:p-6">
          {/* Company Name and Investment Type */}
          <div className="gba:mb-6">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <div className="gba:flex gba:items-center gba:gap-3">
                <Building2 className="gba:h-6 gba:w-6 gba:text-blue-600" />
                <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {companyName || investment?.name || 'Investment Details'}
                </h1>
              </div>
              {/* AI Summary Button */}
              {context && investmentId && (
                <AiSummaryButton 
                  investmentId={investmentId} 
                  accessToken={context.accessToken} 
                />
              )}
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Badge variant="secondary" className="gba:text-sm">
                {investment?.investmentType?.value || 'Venture/Disruptive Technology'}
              </Badge>
              <Badge variant="outline" className="gba:text-sm">
                {status || 'Unknown'}
              </Badge>
              {investment?.investmentStakeType?.value && (
                <Badge variant="default" className="gba:text-sm">
                  {investment.investmentStakeType.value}
                </Badge>
              )}
              <PlannedExitFlag 
                plannedExit={investment?.planedExit} 
                plannedExitDate={investment?.plannedExitDate}
                variant="default"
                data-testid="equity-record-planned-exit-flag"
              />
            </div>
          </div>

          {/* Core Details Grid */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
            {/* Foundation Date - nw_investment_relations.equity_investment.foundation_date */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Foundation Date</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {equityData?.equityInvestment?.foundationDate ? formatDate(equityData.equityInvestment.foundationDate) : '-'}
              </p>
            </div>

            {/* Acquisition Date - nw_investment_relations.acquisition_date */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Acquisition Date</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {acquisitionDate !== 'N/A' ? acquisitionDate : '-'}
              </p>
            </div>

            {/* Initial Investment Amount - nw_investment_relations.initial_investment_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Initial Investment</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {initialInvestment !== 'N/A' ? initialInvestment : '-'}
              </p>
            </div>

            {/* Total Investment Amount - nw_investment_relations.total_investment_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Total Investment Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {totalInvestment !== 'N/A' ? totalInvestment : '-'}
              </p>
            </div>

            {/* Market Value - nw_investment_relations.equity_investment.market_value */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <TrendingUp className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Market Value</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {equityData?.equityInvestment?.marketValue ? formatCurrencyValue(equityData.equityInvestment.marketValue, investment?.currency) : (marketValue !== 'N/A' ? marketValue : '-')}
              </p>
            </div>

            {/* Stake Percentage - nw_investment_relations.stake_percentage */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Percent className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Stake Percentage</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {stakePercent !== 'N/A' ? stakePercent : '-'}
              </p>
            </div>

            {/* Turnover Amount - nw_investment_relations.equity_investment.turnover_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <BarChart3 className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Turnover Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {equityData?.equityInvestment?.turnoverAmount ? formatCurrencyValue(equityData.equityInvestment.turnoverAmount, investment?.currency) : '-'}
              </p>
            </div>

            {/* EBITDA Amount - nw_investment_relations.equity_investment.ebitda_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <TrendingUp className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">EBITDA Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {equityData?.equityInvestment?.ebitdaAmount ? formatCurrencyValue(equityData.equityInvestment.ebitdaAmount, investment?.currency) : '-'}
              </p>
            </div>

            {/* Investment Role - nw_investment_relations.investment_role */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <User className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Investment Role</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {investment?.investmentRole?.value || '-'}
              </p>
            </div>

            {/* Owner Employee - nw_investment_relations.investment.owner_employee_id */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <User className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Owner Employee</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {investment?.ownerEmployee?.displayName || (investment?.ownerEmployee?.firstName && investment?.ownerEmployee?.lastName ? investment.ownerEmployee.firstName + ' ' + investment.ownerEmployee.lastName : '-')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentDetailsHeader; 