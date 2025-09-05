import React from 'react';
import { Card, CardContent } from '@newwork/nw-design-system';
import { Badge } from '@newwork/nw-design-system';
import { DollarSign, TrendingUp, Target, BarChart3, Award, Calendar } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/common/data/investment';
import PlannedExitFlag from '../../shared/PlannedExitFlag';
import type { LiquidFundInvestmentData } from '../types';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AiSummaryButton } from '../../shared/AiSummaryButton';

interface InvestmentDetailsHeaderProps {
  liquidFundData: LiquidFundInvestmentData | null;
  context: BusinessAppContextProps;
  investmentId?: string;
}

const InvestmentDetailsHeader: React.FC<InvestmentDetailsHeaderProps> = ({ liquidFundData, context, investmentId }) => {
  if (!liquidFundData) {
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
  const { investment, liquidFundInvestment } = liquidFundData;
  // Helper function to format reference values for display
  const formatReferenceValue = (refValue: string): string => {
    if (!refValue) return 'N/A';
    return refValue.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="gba:px-6 gba:pt-6 gba:pb-4" data-testid="investment-details-header">
      <Card className="gba:bg-white gba:border gba:shadow-sm">
        <CardContent className="gba:p-6">
          {/* Company Name and Investment Type */}
          <div className="gba:mb-6">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <div className="gba:flex gba:items-center gba:gap-3">
                <BarChart3 className="gba:h-6 gba:w-6 gba:text-teal-600" />
                <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {investment.displayName || investment.name || 'Liquid Fund Investment Details'}
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
                {investment.investmentGroup?.value || formatReferenceValue(investment.investmentGroup?.code || '') || 'Liquid Fund'}
              </Badge>
              <Badge variant="outline" className="gba:text-sm">
                {investment.investmentStatus?.value || formatReferenceValue(investment.investmentStatus?.code || '') || 'Unknown'}
              </Badge>
              <PlannedExitFlag 
                plannedExit={investment?.planedExit} 
                plannedExitDate={investment?.plannedExitDate}
                variant="default"
                data-testid="liquid-fund-record-planned-exit-flag"
              />
            </div>
          </div>

          {/* Core Details Grid */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
            {/* Initial Investment */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Initial Investment</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {formatCurrency(
                  investment.initialInvestmentAmount || 0,
                  investment.currency?.code || 'EUR'
                )}
              </p>
            </div>

            {/* Market Value */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <TrendingUp className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Market Value</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {formatCurrency(
                  investment.investmentMarketValue || 0,
                  investment.currency?.code || 'EUR'
                )}
              </p>
            </div>

            {/* Interest Rate */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Award className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Interest Rate</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {formatPercentage(liquidFundInvestment?.interestRate || 0)}
              </p>
            </div>

            {/* Maturity Date */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Maturity Date</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {liquidFundInvestment?.maturityDate ? new Date(liquidFundInvestment.maturityDate).toLocaleDateString('de-DE') : '-'}
              </p>
            </div>

            {/* Bank Name */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <BarChart3 className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Bank</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {liquidFundInvestment?.bankName || '-'}
              </p>
            </div>

            {/* Fund Type */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Target className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Fund Type</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {liquidFundInvestment?.investmentLiquidFundType?.value || formatReferenceValue(liquidFundInvestment?.investmentLiquidFundType?.code || '') || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentDetailsHeader; 