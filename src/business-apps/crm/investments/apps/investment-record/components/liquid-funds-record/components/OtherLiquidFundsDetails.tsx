import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { TrendingUp, Calendar } from 'lucide-react';
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
          {/* Bank Deposit Fields */}
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

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Currency</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="other-liquid-currency">
              {investment?.currency?.value || investment?.currency?.code || '-'}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Bank Account Number</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:font-mono" data-testid="other-liquid-account-number">
              {formatValueOrDash(liquidFundInvestment?.bankAccountNumber)}
            </p>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Investment Status</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900" data-testid="other-liquid-status">
              {investment?.investmentStatus?.value || investment?.investmentStatus?.code || '-'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OtherLiquidFundsDetails;
