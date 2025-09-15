import React from 'react';
import { Card, CardContent, Badge } from '@newwork/nw-design-system';
import { 
  Building2,
  User,
  DollarSign,
  TrendingUp,
  ArrowDownCircle,
  Target
} from 'lucide-react';
import type { RealEstateInvestmentData } from '../hooks/useRealEstateRecordData';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { getStatusColor } from '@/common/data/investment';
import PlannedExitFlag from '../../shared/PlannedExitFlag';
import { AiSummaryButton } from '@/common/components/common-relations/record-sections/header-section/ai-summary-button';
import { useInvestmentAiSummary } from '../../../hooks/useInvestmentAiSummary';

export interface OthersDetailsHeaderProps {
  realEstateData?: RealEstateInvestmentData | null;
  isLoading?: boolean;
  error?: string | null;
  context?: BusinessAppContextProps;
  investmentId?: string;
}

const OthersDetailsHeader: React.FC<OthersDetailsHeaderProps> = ({ 
  realEstateData, 
  isLoading, 
  error,
  context,
  investmentId
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

  // Use real data from GraphQL
  const investment = realEstateData?.investment;
  const companyName = investment?.investmentAccount?.name || '';
  
  // Core Details as specified in requirements for Others type
  const investmentType = investment?.investmentType?.value || '';
  const fundManagerName = investment?.fundManagerName || '';
  const totalCommitmentAmount = investment ? formatCurrencyValue(investment.totalCommitmentAmount ?? null, investment.currency) : 'N/A';
  const totalInvestmentAmount = investment ? formatCurrencyValue(investment.totalInvestmentAmount ?? null, investment.currency) : 'N/A'; // Called "Contribution" in FE
  const totalDistributionAmount = investment ? formatCurrencyValue(investment.totalDistributionAmount ?? null, investment.currency) : 'N/A';
  const forecastedProfitAmount = investment ? formatCurrencyValue(investment.forecastedProfitAmount ?? null, investment.currency) : 'N/A';
  const status = investment?.investmentStatus?.value || '';

  if (isLoading) {
    return (
      <div className="gba:px-6 gba:pt-6 gba:pb-4">
        <Card className="gba:bg-white gba:border gba:shadow-sm">
          <CardContent className="gba:p-6">
            <div className="gba:animate-pulse">
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4 gba:mb-4"></div>
              <div className="gba:grid gba:gap-4 gba:grid-cols-2 gba:md:grid-cols-4 gba:lg:grid-cols-7">
                {Array.from({ length: 6 }).map((_, i) => (
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
                <Building2 className="gba:h-6 gba:w-6 gba:text-purple-600" />
                <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {companyName || investment?.name || 'Others Investment Details'}
                </h1>
              </div>
              {/* AI Summary Button */}
              {context && investmentId && (
                <AiSummaryButton
                  config={{
                    entityType: 'investment',
                    loadingMessage: 'Generating AI Summary...',
                    loadingSubtitle: 'Analyzing investment data and activities'
                  }}
                  summaryHook={useInvestmentAiSummary(investmentId, context.accessToken)}
                  dataTestId={`investment-update-button-${investmentId}`}
                />
              )}
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Badge variant="secondary" className="gba:text-sm">
                {investmentType || 'Others'}
              </Badge>
              <Badge variant="outline" className="gba:text-sm">
                {status || 'Unknown'}
              </Badge>
              <PlannedExitFlag 
                plannedExit={investment?.planedExit} 
                plannedExitDate={investment?.plannedExitDate}
                variant="default"
                data-testid="others-record-planned-exit-flag"
              />
            </div>
          </div>

          {/* Core Details Grid */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
            {/* Fund Manager Name - nw_investment_relations.investment.fund_manager_name */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <User className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Fund Manager Name</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {fundManagerName || '-'}
              </p>
            </div>

            {/* Total Commitment Amount - nw_investment_relations.investment.total_commitment_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Target className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Total Commitment Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {totalCommitmentAmount !== 'N/A' ? totalCommitmentAmount : '-'}
              </p>
            </div>

            {/* Contribution (Total Investment Amount) - nw_investment_relations.investment.total_investment_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Contribution</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {totalInvestmentAmount !== 'N/A' ? totalInvestmentAmount : '-'}
              </p>
            </div>

            {/* Total Distribution Amount - nw_investment_relations.investment.total_distribution_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <ArrowDownCircle className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Total Distribution Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {totalDistributionAmount !== 'N/A' ? totalDistributionAmount : '-'}
              </p>
            </div>

            {/* Forecasted Profit Amount - nw_investment_relations.investment.forecasted_profit_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <TrendingUp className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Forecasted Profit Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {forecastedProfitAmount !== 'N/A' ? forecastedProfitAmount : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OthersDetailsHeader;

