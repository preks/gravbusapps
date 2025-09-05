import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Building2, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/common/data/investment';
import type { LiquidFundInvestmentData } from '../types';

interface BankDepositsDetailsProps {
  liquidFundData: LiquidFundInvestmentData | null;
}

const BankDepositsDetails: React.FC<BankDepositsDetailsProps> = ({ liquidFundData }) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <Building2 className="gba:h-5 gba:w-5 gba:text-blue-600" />
          Bank Deposits Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
          {/* Required Bank Deposit Fields */}
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Proprietor Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="bank-deposits-proprietor-name">
              {formatValueOrDash(liquidFundInvestment?.proprietorName)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Bank Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="bank-deposits-bank-name">
              {formatValueOrDash(liquidFundInvestment?.bankName)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Initial Investment Amount</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-green-600" data-testid="bank-deposits-initial-amount">
              {formatCurrencyOrDash(investment?.initialInvestmentAmount, investment?.currency?.code)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Total Investment Amount</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-blue-600" data-testid="bank-deposits-total-amount">
              {formatCurrencyOrDash(investment?.totalInvestmentAmount, investment?.currency?.code)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Current Market Value</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-purple-600" data-testid="bank-deposits-market-value">
              {formatCurrencyOrDash(investment?.investmentMarketValue, investment?.currency?.code)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Acquisition Date</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="bank-deposits-acquisition-date">
              <Calendar className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
              {formatDateOrDash(investment?.acquisitionDate)}
            </p>
          </div>

          {/* Additional Information */}
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Currency</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="bank-deposits-currency">
              {investment?.currency?.value || investment?.currency?.code || '-'}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Bank Account Number</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:font-mono" data-testid="bank-deposits-account-number">
              {formatValueOrDash(liquidFundInvestment?.bankAccountNumber)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Investment Status</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="bank-deposits-status">
              {investment?.investmentStatus?.value || investment?.investmentStatus?.code || '-'}
            </p>
          </div>
        </div>

        {/* Performance Summary */}
        {investment?.initialInvestmentAmount && investment?.investmentMarketValue && (
          <div className="gba:mt-6 gba:pt-6 gba:border-t gba:border-gray-200">
            <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-4 gba:flex gba:items-center gba:gap-2">
              <DollarSign className="gba:h-4 gba:w-4 gba:text-green-500" />
              Performance Overview
            </h3>
            <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-3">
              {(() => {
                const performanceAmount = investment.investmentMarketValue - investment.initialInvestmentAmount;
                const performancePercentage = investment.initialInvestmentAmount > 0 ? (performanceAmount / investment.initialInvestmentAmount) * 100 : 0;
                const returnBackgroundColor = performancePercentage === 0 ? 'gba:bg-gray-50' : performancePercentage > 0 ? 'gba:bg-green-50' : 'gba:bg-red-50';
                const returnTextColor = performancePercentage === 0 ? 'gba:text-gray-700' : performancePercentage > 0 ? 'gba:text-green-700' : 'gba:text-red-700';
                const returnValueColor = performancePercentage === 0 ? 'gba:text-gray-900' : performancePercentage > 0 ? 'gba:text-green-900' : 'gba:text-red-900';
                
                return (
                  <>
                    <div className={`${returnBackgroundColor} gba:p-4 gba:rounded-lg`}>
                      <h4 className={`gba:text-sm gba:font-medium ${returnTextColor} gba:mb-1`}>Total Return</h4>
                      <p className={`gba:text-lg gba:font-bold ${returnValueColor}`} data-testid="bank-deposits-total-return">
                        {formatCurrencyOrDash(performanceAmount, investment?.currency?.code)}
                      </p>
                    </div>
                    <div className={`${returnBackgroundColor} gba:p-4 gba:rounded-lg`}>
                      <h4 className={`gba:text-sm gba:font-medium ${returnTextColor} gba:mb-1`}>Return Percentage</h4>
                      <p className={`gba:text-lg gba:font-bold ${returnValueColor}`} data-testid="bank-deposits-return-percentage">
                        {investment.initialInvestmentAmount > 0 
                          ? `${performancePercentage === 0 ? '' : performancePercentage > 0 ? '+' : ''}${performancePercentage.toFixed(2)}%`
                          : '-'
                        }
                      </p>
                    </div>
                    <div className="gba:bg-purple-50 gba:p-4 gba:rounded-lg">
                      <h4 className="gba:text-sm gba:font-medium gba:text-purple-700 gba:mb-1">Investment Multiple</h4>
                      <p className="gba:text-lg gba:font-bold gba:text-purple-900" data-testid="bank-deposits-multiple">
                        {investment.initialInvestmentAmount > 0 
                          ? `${(investment.investmentMarketValue / investment.initialInvestmentAmount).toFixed(2)}x`
                          : '-'
                        }
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BankDepositsDetails;
