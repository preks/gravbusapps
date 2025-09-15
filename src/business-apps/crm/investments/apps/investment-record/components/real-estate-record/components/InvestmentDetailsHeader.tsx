import React, { useState } from 'react';
import { Card, CardContent, Badge } from '@newwork/nw-design-system';
import { 
  Building2,
  Calendar, 
  DollarSign,
  Home,
  Ruler,
  Percent,
  User,
  AlertCircle,
  Clock
} from 'lucide-react';
import type { RealEstateInvestmentData } from '../types';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { getStatusColor } from '@/common/data/investment';
import PlannedExitFlag from '../../shared/PlannedExitFlag';
import { AiSummaryButton } from '@/common/components/common-relations/record-sections/header-section/ai-summary-button';
import { useInvestmentAiSummary } from '../../../hooks/useInvestmentAiSummary';

export interface InvestmentDetailsHeaderProps {
  realEstateData?: RealEstateInvestmentData | null;
  isLoading?: boolean;
  error?: string | null;
  context?: BusinessAppContextProps;
  investmentId?: string;
}

const InvestmentDetailsHeader: React.FC<InvestmentDetailsHeaderProps> = ({ 
  realEstateData, 
  isLoading, 
  error,
  context,
  investmentId
}) => {
  // Early return if loading or no data yet
  if (isLoading || !realEstateData) {
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
  
  // Core Details as specified in requirements
  const investmentType = investment?.investmentType?.value || '';
  const buildingYear = realEstate?.buildingYear || '';
  const size = realEstate?.size || null;
  const sizeMeasurementUnit = realEstate?.sizeMeasurementUnit?.value || '';
  const occupancyPercent = realEstate?.occupancyPercent || null;
  const totalInvestmentAmount = investment ? formatCurrencyValue(investment.totalInvestmentAmount ?? null, investment.currency) : 'N/A';
  const annualNetColdRent = realEstate ? formatCurrencyValue(realEstate.annualNetColdRent ?? null, investment?.currency) : 'N/A';
  const funding = realEstate ? formatCurrencyValue(realEstate.funding ?? null, investment?.currency) : 'N/A';
  const investmentRole = investment?.investmentRole?.value || '';
  const stakePercentage = investment ? formatPercentageValue(investment.stakePercentage ?? null) : 'N/A';
  const holdingPeriod = calculateHoldingPeriod(investment?.acquisitionDate ?? null);
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
                <Building2 className="gba:h-6 gba:w-6 gba:text-green-600" />
                <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {companyName || investment?.name || 'Real Estate Investment Details'}
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
                {investmentType || 'Existing Properties'}
              </Badge>
              <Badge variant="outline" className="gba:text-sm">
                {status || 'Unknown'}
              </Badge>
              <PlannedExitFlag 
                plannedExit={investment?.planedExit} 
                plannedExitDate={investment?.plannedExitDate}
                variant="default"
                data-testid="real-estate-record-planned-exit-flag"
              />
            </div>
          </div>

          {/* Core Details Grid */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
            {/* Building Year - nw_investment_relations.real_estate_investment.building_year */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Building Year</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {buildingYear || '-'}
              </p>
            </div>

            {/* Size - nw_investment_relations.real_estate_investment.size + size_measurement_unit_ref */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Ruler className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Size</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {size !== null ? `${size} ${sizeMeasurementUnit}` : '-'}
              </p>
            </div>

            {/* Occupancy Percent - nw_investment_relations.real_estate_investment.occupancy_percent */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Percent className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Occupancy Percent</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {occupancyPercent !== null ? `${occupancyPercent}%` : '-'}
              </p>
            </div>

            {/* Total Investment Amount - nw_investment_relations.total_investment_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Total Investment Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {totalInvestmentAmount !== 'N/A' ? totalInvestmentAmount : '-'}
              </p>
            </div>

            {/* Annual Net Cold Rent - nw_investment_relations.real_estate_investment.annual_net_cold_rent */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Annual Net Cold Rent</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {annualNetColdRent !== 'N/A' ? annualNetColdRent : '-'}
              </p>
            </div>

            {/* Funding - nw_investment_relations.real_estate_investment.funding */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Funding</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {funding !== 'N/A' ? funding : '-'}
              </p>
            </div>

            {/* Investment Role - nw_investment_relations.investment_role */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <User className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Investment Role</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {investmentRole || '-'}
              </p>
            </div>

            {/* Stake Percentage - nw_investment_relations.investment.stake_percentage */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Percent className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Stake Percentage</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {stakePercentage !== 'N/A' ? stakePercentage : '-'}
              </p>
            </div>

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
          </div>

          {/* Liquidity Forecast Section - nw_investment_relations.real_estate_investment.liquidity_forecast */}
          {realEstate?.liquidityForecast && (
            <div className="gba:mt-8 gba:pt-6 gba:border-t gba:border-gray-200">
              <div className="gba:mb-4">
                <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('crm.investments.liquidity.forecast', 'Liquidity Forecast')}
                </h3>
              </div>
              <div className="gba:bg-gray-50 gba:p-4 gba:rounded-lg">
                <pre className="gba:text-sm gba:text-gray-700 gba:whitespace-pre-wrap">
                  {JSON.stringify(realEstate.liquidityForecast, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentDetailsHeader; 