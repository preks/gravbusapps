import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { TrendingUp, Hash, Tag, Calendar, Building2, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/common/data/investment';
import type { LiquidFundInvestmentData } from '../types';

interface OtherLiquidFundsDetailsProps {
  liquidFundData: LiquidFundInvestmentData | null;
}

const OtherLiquidFundsDetails: React.FC<OtherLiquidFundsDetailsProps> = ({ liquidFundData }) => {
  if (!liquidFundData) {
    return null;
  }

  const { liquidFundInvestment, investment } = liquidFundData;

  const formatValueOrDash = (value?: string | number | null): string => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  };

  const formatCurrencyOrDash = (amount?: number | null, currencyCode?: string): string => {
    if (amount === null || amount === undefined) return '-';
    return formatCurrency(amount, currencyCode);
  };

  const formatDateOrDash = (dateString?: string | null): string => {
    if (!dateString) return '-';
    return formatDate(dateString);
  };

  // Get the investment type for display
  const getInvestmentTypeDisplay = () => {
    const liquidFundType = liquidFundInvestment?.investmentLiquidFundType;
    if (liquidFundType?.value) return liquidFundType.value;
    if (liquidFundType?.code) {
      return liquidFundType.code.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    return 'Other Liquid Fund';
  };

  // Get appropriate icon color based on type
  const getTypeColor = () => {
    const code = liquidFundInvestment?.investmentLiquidFundType?.code;
    switch (code) {
      case 'EQUITY': return 'text-green-600';
      case 'BONDS': return 'text-blue-600';
      case 'PENSION_FUNDS': return 'text-purple-600';
      case 'MONEY_MARKET_FUNDS': return 'text-teal-600';
      default: return 'text-gray-600';
    }
  };

  const typeColor = getTypeColor();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <TrendingUp className={`gba:h-5 gba:w-5 ${typeColor}`} />
          {getInvestmentTypeDisplay()} Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
          {/* Investment Type Highlight */}
          <div className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-purple-50 gba:p-4 gba:rounded-lg gba:border gba:border-blue-200 gba:col-span-full gba:md:col-span-1">
            <h4 className="gba:text-sm gba:font-medium gba:text-blue-700 gba:mb-2 gba:flex gba:items-center gba:gap-1">
              <Tag className="gba:h-4 gba:w-4" />
              Investment Type
            </h4>
            <p className="gba:text-lg gba:font-bold gba:text-blue-900" data-testid="other-liquid-type">
              {getInvestmentTypeDisplay()}
            </p>
          </div>

          {/* ISIN Code Highlight */}
          <div className="gba:bg-gradient-to-r gba:from-green-50 gba:to-teal-50 gba:p-4 gba:rounded-lg gba:border gba:border-green-200 gba:col-span-full gba:md:col-span-2">
            <h4 className="gba:text-sm gba:font-medium gba:text-green-700 gba:mb-2 gba:flex gba:items-center gba:gap-1">
              <Hash className="gba:h-4 gba:w-4" />
              ISIN Code
            </h4>
            <p className="gba:text-xl gba:font-bold gba:text-green-900 gba:font-mono" data-testid="other-liquid-isin">
              {formatValueOrDash(investment?.isin)}
            </p>
          </div>

          {/* Core Bank Deposit Fields */}
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Proprietor Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="other-liquid-proprietor-name">
              {formatValueOrDash(liquidFundInvestment?.proprietorName)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Bank Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="other-liquid-bank-name">
              {formatValueOrDash(liquidFundInvestment?.bankName)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Initial Investment Amount</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-green-600" data-testid="other-liquid-initial-amount">
              {formatCurrencyOrDash(investment?.initialInvestmentAmount, investment?.currency?.code)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Total Investment Amount</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-blue-600" data-testid="other-liquid-total-amount">
              {formatCurrencyOrDash(investment?.totalInvestmentAmount, investment?.currency?.code)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Current Market Value</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-purple-600" data-testid="other-liquid-market-value">
              {formatCurrencyOrDash(investment?.investmentMarketValue, investment?.currency?.code)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Acquisition Date</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="other-liquid-acquisition-date">
              <Calendar className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
              {formatDateOrDash(investment?.acquisitionDate)}
            </p>
          </div>

          {/* Additional Information */}
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Currency</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="other-liquid-currency">
              {investment?.currency?.value || investment?.currency?.code || '-'}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Fund Manager</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="other-liquid-fund-manager">
              {formatValueOrDash(investment?.fundManagerName)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Investment Status</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="other-liquid-status">
              {investment?.investmentStatus?.value || investment?.investmentStatus?.code || '-'}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Bank Account Number</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:font-mono" data-testid="other-liquid-account-number">
              {formatValueOrDash(liquidFundInvestment?.bankAccountNumber)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Risk Level</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="other-liquid-risk-level">
              {investment?.investmentRiskLevel?.value || investment?.investmentRiskLevel?.code || '-'}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Investment Code</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:font-mono" data-testid="other-liquid-code">
              {formatValueOrDash(investment?.code)}
            </p>
          </div>
        </div>

        {/* Investment Overview */}
        <div className="gba:mt-6 gba:pt-6 gba:border-t gba:border-gray-200">
          <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-4 gba:flex gba:items-center gba:gap-2">
            <TrendingUp className={`gba:h-4 gba:w-4 ${typeColor}`} />
            Investment Overview
          </h3>
          <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4">
            <div className="gba:bg-blue-50 gba:p-4 gba:rounded-lg">
              <h4 className="gba:text-sm gba:font-medium gba:text-blue-700 gba:mb-1">Type</h4>
              <p className="gba:text-lg gba:font-bold gba:text-blue-900" data-testid="other-liquid-overview-type">
                {getInvestmentTypeDisplay()}
              </p>
            </div>
            <div className="gba:bg-green-50 gba:p-4 gba:rounded-lg">
              <h4 className="gba:text-sm gba:font-medium gba:text-green-700 gba:mb-1">ISIN</h4>
              <p className="gba:text-lg gba:font-bold gba:text-green-900 gba:font-mono" data-testid="other-liquid-overview-isin">
                {investment?.isin || '-'}
              </p>
            </div>
            {investment?.initialInvestmentAmount && investment?.investmentMarketValue && (() => {
              const performanceAmount = investment.investmentMarketValue - investment.initialInvestmentAmount;
              const performancePercentage = investment.initialInvestmentAmount > 0 ? (performanceAmount / investment.initialInvestmentAmount) * 100 : 0;
              const returnBackgroundColor = performancePercentage === 0 ? 'gba:bg-gray-50' : performancePercentage > 0 ? 'gba:bg-purple-50' : 'gba:bg-red-50';
              const returnTextColor = performancePercentage === 0 ? 'gba:text-gray-700' : performancePercentage > 0 ? 'gba:text-purple-700' : 'gba:text-red-700';
              const returnValueColor = performancePercentage === 0 ? 'gba:text-gray-900' : performancePercentage > 0 ? 'gba:text-purple-900' : 'gba:text-red-900';
              const percentageBackgroundColor = performancePercentage === 0 ? 'gba:bg-gray-50' : performancePercentage > 0 ? 'gba:bg-teal-50' : 'gba:bg-red-50';
              const percentageTextColor = performancePercentage === 0 ? 'gba:text-gray-700' : performancePercentage > 0 ? 'gba:text-teal-700' : 'gba:text-red-700';
              const percentageValueColor = performancePercentage === 0 ? 'gba:text-gray-900' : performancePercentage > 0 ? 'gba:text-teal-900' : 'gba:text-red-900';
              
              return (
                <>
                  <div className={`${returnBackgroundColor} gba:p-4 gba:rounded-lg`}>
                    <h4 className={`gba:text-sm gba:font-medium ${returnTextColor} gba:mb-1`}>Total Return</h4>
                    <p className={`gba:text-lg gba:font-bold ${returnValueColor}`} data-testid="other-liquid-overview-return">
                      {formatCurrencyOrDash(performanceAmount, investment?.currency?.code)}
                    </p>
                  </div>
                  <div className={`${percentageBackgroundColor} gba:p-4 gba:rounded-lg`}>
                    <h4 className={`gba:text-sm gba:font-medium ${percentageTextColor} gba:mb-1`}>Return %</h4>
                    <p className={`gba:text-lg gba:font-bold ${percentageValueColor}`} data-testid="other-liquid-overview-percentage">
                      {investment.initialInvestmentAmount > 0 
                        ? `${performancePercentage === 0 ? '' : performancePercentage > 0 ? '+' : ''}${performancePercentage.toFixed(2)}%`
                        : '-'
                      }
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OtherLiquidFundsDetails;
