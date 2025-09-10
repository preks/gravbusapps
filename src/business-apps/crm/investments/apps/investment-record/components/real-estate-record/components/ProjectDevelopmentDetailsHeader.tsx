import React from 'react';
import { Card, CardContent, Badge } from '@newwork/nw-design-system';
import { 
  Building2,
  Calendar, 
  DollarSign,
  Clock,
  Target,
  TrendingUp,
  BarChart3,
  Banknote
} from 'lucide-react';
import type { RealEstateInvestmentData } from '../hooks/useRealEstateRecordData';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { getStatusColor } from '@/common/data/investment';
import PlannedExitFlag from '../../shared/PlannedExitFlag';
import { AiSummaryButton } from '../../shared/AiSummaryButton';

export interface ProjectDevelopmentDetailsHeaderProps {
  realEstateData?: RealEstateInvestmentData | null;
  isLoading?: boolean;
  error?: string | null;
  context?: BusinessAppContextProps;
  investmentId?: string;
}

const ProjectDevelopmentDetailsHeader: React.FC<ProjectDevelopmentDetailsHeaderProps> = ({ 
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

  // Helper function to calculate holding period
  const calculateHoldingPeriod = (acquisitionDate: string | null): string => {
    if (!acquisitionDate) return 'N/A';
    try {
      const startDate = new Date(acquisitionDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 30) {
        return `${diffDays} days`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''}`;
      } else {
        const years = Math.floor(diffDays / 365);
        const remainingMonths = Math.floor((diffDays % 365) / 30);
        if (remainingMonths > 0) {
          return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
        }
        return `${years} year${years > 1 ? 's' : ''}`;
      }
    } catch {
      return 'N/A';
    }
  };

  // Use real data from GraphQL
  const investment = realEstateData?.investment;
  const realEstate = realEstateData?.realEstateInvestment;
  const companyName = investment?.investmentAccount?.name || '';
  
  // Core Details as specified in requirements for Project Development
  const investmentType = investment?.investmentType?.value || '';
  const holdingPeriod = calculateHoldingPeriod(investment?.acquisitionDate ?? null);
  const acquisitionDate = investment ? formatDate(investment.acquisitionDate ?? null) : 'N/A';
  const plannedExitDate = investment ? formatDate(investment.plannedExitDate ?? null) : 'N/A';
  const totalInvestmentAmount = investment ? formatCurrencyValue(investment.totalInvestmentAmount ?? null, investment.currency) : 'N/A';
  const requiredCapitalAmount = investment ? formatCurrencyValue(investment.requiredCapitalAmount ?? null, investment.currency) : 'N/A';
  const debtFinancingAmount = investment ? formatCurrencyValue(investment.debtFinancingAmount ?? null, investment.currency) : 'N/A';
  const targetAnnualExpenses = realEstate ? formatCurrencyValue(realEstate.targetAnnualExpenses ?? null, investment?.currency) : 'N/A';
  const forecastedRevenueAmount = investment ? formatCurrencyValue(investment.forecastedRevenueAmount ?? null, investment.currency) : 'N/A';
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
                {Array.from({ length: 10 }).map((_, i) => (
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
                <Building2 className="gba:h-6 gba:w-6 gba:text-orange-600" />
                <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {companyName || investment?.name || 'Project Development Investment Details'}
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
                {investmentType || 'Project Development'}
              </Badge>
              <Badge variant="outline" className="gba:text-sm">
                {status || 'Unknown'}
              </Badge>
              <PlannedExitFlag 
                plannedExit={investment?.planedExit} 
                plannedExitDate={investment?.plannedExitDate}
                variant="default"
                data-testid="project-development-record-planned-exit-flag"
              />
            </div>
          </div>

          {/* Core Details Grid */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
            {/* Holding Period - Today - nw_investment_relations.investment.acquisition_date */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Clock className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Holding Period</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {holdingPeriod !== 'N/A' ? holdingPeriod : '-'}
              </p>
            </div>

            {/* Acquisition Date - nw_investment_relations.investment.acquisition_date */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Acquisition Date</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {acquisitionDate !== 'N/A' ? acquisitionDate : '-'}
              </p>
            </div>

            {/* Planned Exit Date - nw_investment_relations.investment.planned_exit_date */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Target className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Planned Exit Date</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {plannedExitDate !== 'N/A' ? plannedExitDate : '-'}
              </p>
            </div>

            {/* Total Investment Amount - nw_investment_relations.investment.total_investment_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Total Investment Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {totalInvestmentAmount !== 'N/A' ? totalInvestmentAmount : '-'}
              </p>
            </div>

            {/* Required Capital Amount - nw_investment_relations.investment.required_capital_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Banknote className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Required Capital Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {requiredCapitalAmount !== 'N/A' ? requiredCapitalAmount : '-'}
              </p>
            </div>

            {/* Debt Financing Amount - nw_investment_relations.investment.debt_financing_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <BarChart3 className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Debt Financing Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {debtFinancingAmount !== 'N/A' ? debtFinancingAmount : '-'}
              </p>
            </div>

            {/* Target Annual Expenses - nw_investment_relations.real_estate_investment.target_annual_expenses */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Target Annual Expenses</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {targetAnnualExpenses !== 'N/A' ? targetAnnualExpenses : '-'}
              </p>
            </div>

            {/* Forecasted Revenue Amount - nw_investment_relations.investment.forecasted_revenue_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <TrendingUp className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Forecasted Revenue Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {forecastedRevenueAmount !== 'N/A' ? forecastedRevenueAmount : '-'}
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

export default ProjectDevelopmentDetailsHeader;
