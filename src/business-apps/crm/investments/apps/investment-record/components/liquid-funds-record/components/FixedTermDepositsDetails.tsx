import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Clock, Calendar, Percent, Building2, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage } from '@/common/data/investment';
import type { LiquidFundInvestmentData } from '../types';

interface FixedTermDepositsDetailsProps {
  liquidFundData: LiquidFundInvestmentData | null;
}

const FixedTermDepositsDetails: React.FC<FixedTermDepositsDetailsProps> = ({ liquidFundData }) => {
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

  const formatPercentOrDash = (value?: number | null): string => {
    if (value === null || value === undefined) return '-';
    return formatPercentage(value);
  };

  // Calculate time to maturity
  const calculateTimeToMaturity = (maturityDate?: string | null): string => {
    if (!maturityDate) return '-';
    try {
      const maturity = new Date(maturityDate);
      const now = new Date();
      const diffTime = maturity.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'Matured';
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day';
      if (diffDays < 30) return `${diffDays} days`;
      if (diffDays < 365) return `${Math.round(diffDays / 30)} months`;
      return `${Math.round(diffDays / 365)} years`;
    } catch {
      return '-';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <Clock className="gba:h-5 gba:w-5 gba:text-orange-600" />
          Fixed-Term Deposits Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
          {/* Core Bank Deposit Fields */}
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Proprietor Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="fixed-term-proprietor-name">
              {formatValueOrDash(liquidFundInvestment?.proprietorName)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Bank Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="fixed-term-bank-name">
              {formatValueOrDash(liquidFundInvestment?.bankName)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Initial Investment Amount</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-green-600" data-testid="fixed-term-initial-amount">
              {formatCurrencyOrDash(investment?.initialInvestmentAmount, investment?.currency?.code)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Total Investment Amount</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-blue-600" data-testid="fixed-term-total-amount">
              {formatCurrencyOrDash(investment?.totalInvestmentAmount, investment?.currency?.code)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Current Market Value</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-purple-600" data-testid="fixed-term-market-value">
              {formatCurrencyOrDash(investment?.investmentMarketValue, investment?.currency?.code)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Acquisition Date</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="fixed-term-acquisition-date">
              <Calendar className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
              {formatDateOrDash(investment?.acquisitionDate)}
            </p>
          </div>

          {/* Fixed-Term Specific Fields - Highlighted */}
          <div className="gba:bg-orange-50 gba:p-4 gba:rounded-lg gba:border gba:border-orange-200 gba:col-span-full gba:md:col-span-1">
            <h4 className="gba:text-sm gba:font-medium gba:text-orange-700 gba:mb-2 gba:flex gba:items-center gba:gap-1">
              <Calendar className="gba:h-4 gba:w-4" />
              Maturity Date
            </h4>
            <p className="gba:text-lg gba:font-bold gba:text-orange-900" data-testid="fixed-term-maturity-date">
              {formatDateOrDash(liquidFundInvestment?.maturityDate)}
            </p>
            <p className="gba:text-xs gba:text-orange-600 gba:mt-1" data-testid="fixed-term-time-to-maturity">
              {calculateTimeToMaturity(liquidFundInvestment?.maturityDate)}
            </p>
          </div>

          <div className="gba:bg-green-50 gba:p-4 gba:rounded-lg gba:border gba:border-green-200 gba:col-span-full gba:md:col-span-2">
            <h4 className="gba:text-sm gba:font-medium gba:text-green-700 gba:mb-2 gba:flex gba:items-center gba:gap-1">
              <Percent className="gba:h-4 gba:w-4" />
              Interest Rate
            </h4>
            <p className="gba:text-2xl gba:font-bold gba:text-green-900" data-testid="fixed-term-interest-rate">
              {formatPercentOrDash(liquidFundInvestment?.interestRate)}
            </p>
          </div>

          {/* Additional Information */}
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Payment Frequency</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="fixed-term-payment-frequency">
              {liquidFundInvestment?.interestPaymentFrequency?.value || 
               liquidFundInvestment?.interestPaymentFrequency?.code || '-'}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Early Termination</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="fixed-term-early-termination">
              {liquidFundInvestment?.earlyTerminationAllowed === true
                ? 'Allowed'
                : liquidFundInvestment?.earlyTerminationAllowed === false
                ? 'Not Allowed'
                : '-'}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Currency</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="fixed-term-currency">
              {investment?.currency?.value || investment?.currency?.code || '-'}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Bank Account Number</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:font-mono" data-testid="fixed-term-account-number">
              {formatValueOrDash(liquidFundInvestment?.bankAccountNumber)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Investment Status</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="fixed-term-status">
              {investment?.investmentStatus?.value || investment?.investmentStatus?.code || '-'}
            </p>
          </div>
        </div>

        {/* Fixed-Term Summary */}
        <div className="gba:mt-6 gba:pt-6 gba:border-t gba:border-gray-200">
          <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-4 gba:flex gba:items-center gba:gap-2">
            <Clock className="gba:h-4 gba:w-4 gba:text-orange-500" />
            Fixed-Term Overview
          </h3>
          <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4">
            <div className="gba:bg-green-50 gba:p-4 gba:rounded-lg">
              <h4 className="gba:text-sm gba:font-medium gba:text-green-700 gba:mb-1">Interest Rate</h4>
              <p className="gba:text-xl gba:font-bold gba:text-green-900" data-testid="fixed-term-overview-rate">
                {formatPercentOrDash(liquidFundInvestment?.interestRate)}
              </p>
            </div>
            <div className="gba:bg-orange-50 gba:p-4 gba:rounded-lg">
              <h4 className="gba:text-sm gba:font-medium gba:text-orange-700 gba:mb-1">Time to Maturity</h4>
              <p className="gba:text-xl gba:font-bold gba:text-orange-900" data-testid="fixed-term-overview-maturity">
                {calculateTimeToMaturity(liquidFundInvestment?.maturityDate)}
              </p>
            </div>
            {investment?.initialInvestmentAmount && investment?.investmentMarketValue && (() => {
              const performanceAmount = investment.investmentMarketValue - investment.initialInvestmentAmount;
              const performancePercentage = investment.initialInvestmentAmount > 0 ? (performanceAmount / investment.initialInvestmentAmount) * 100 : 0;
              const returnBackgroundColor = performancePercentage === 0 ? 'gba:bg-gray-50' : performancePercentage > 0 ? 'gba:bg-blue-50' : 'gba:bg-red-50';
              const returnTextColor = performancePercentage === 0 ? 'gba:text-gray-700' : performancePercentage > 0 ? 'gba:text-blue-700' : 'gba:text-red-700';
              const returnValueColor = performancePercentage === 0 ? 'gba:text-gray-900' : performancePercentage > 0 ? 'gba:text-blue-900' : 'gba:text-red-900';
              
              return (
                <>
                  <div className={`${returnBackgroundColor} gba:p-4 gba:rounded-lg`}>
                    <h4 className={`gba:text-sm gba:font-medium ${returnTextColor} gba:mb-1`}>Total Return</h4>
                    <p className={`gba:text-xl gba:font-bold ${returnValueColor}`} data-testid="fixed-term-overview-return">
                      {formatCurrencyOrDash(performanceAmount, investment?.currency?.code)}
                    </p>
                  </div>
                  <div className={`${returnBackgroundColor} gba:p-4 gba:rounded-lg`}>
                    <h4 className={`gba:text-sm gba:font-medium ${returnTextColor} gba:mb-1`}>Return %</h4>
                    <p className={`gba:text-xl gba:font-bold ${returnValueColor}`} data-testid="fixed-term-overview-percentage">
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

export default FixedTermDepositsDetails;
