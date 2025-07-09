import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { BarChart3 } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../shared/utils/formatters';
import { EquityInvestmentRecord } from '../types';
import { EquityInvestmentData } from '../hooks/useEquityRecordData';

interface EquityDetailsProps {
  data?: EquityInvestmentRecord; // Legacy mock data
  equityData?: EquityInvestmentData | null; // Real GraphQL data
  isLoading?: boolean;
}

const EquityDetails: React.FC<EquityDetailsProps> = ({ data, equityData, isLoading }) => {
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

  // Helper function to format large numbers
  const formatLargeNumber = (value: number | null): string => {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('de-DE').format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <BarChart3 className="gba:h-5 gba:w-5 gba:text-blue-600" />
            Equity Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i}>
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-24 gba:mb-2"></div>
                <div className="gba:h-5 gba:bg-gray-200 gba:rounded gba:w-32"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use real data if available, otherwise fall back to mock data
  const investment = equityData?.investment;
  const companyName = investment?.account?.name || (data ? `*${data.equity_investment.company_name}` : '*N/A');
  const currentCompanyValuation = equityData?.currentCompanyValuation;
  const lastReportedEbitda = equityData?.lastReportedEbitda;
  const lastReportedTurnover = equityData?.lastReportedTurnover;
  const investmentRole = equityData?.investmentRole?.value;
  const currency = investment?.currency;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <BarChart3 className="gba:h-5 gba:w-5 gba:text-blue-600" />
          Equity Details
          {equityData && (
            <span className="gba:ml-2 gba:px-2 gba:py-1 gba:bg-green-100 gba:text-green-800 gba:text-xs gba:rounded">
              Real Data
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Company Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {companyName}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Investment Role</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {investmentRole || (data ? '*Co-Investor' : '*N/A')}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Current Company Valuation</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {currentCompanyValuation ? formatCurrencyValue(currentCompanyValuation, currency) : 
               (data ? `*${formatCurrency(data.equity_investment.market_cap, data.investment.currency_ref)}` : '*N/A')}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Last Reported EBITDA</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {lastReportedEbitda ? formatCurrencyValue(lastReportedEbitda, currency) : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Last Reported Turnover</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {lastReportedTurnover ? formatCurrencyValue(lastReportedTurnover, currency) : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Number of Shares</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {data ? `*${data.equity_investment.number_of_shares.toLocaleString()}` : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Current Share Price</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {data ? `*${formatCurrency(data.equity_investment.share_price_current, data.investment.currency_ref)}` : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Purchase Share Price</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {data ? `*${formatCurrency(data.equity_investment.share_price_purchase, data.investment.currency_ref)}` : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Dividend Yield</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {data ? `*${formatPercentage(data.equity_investment.dividend_yield_percentage)}` : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">P/E Ratio</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {data ? `*${data.equity_investment.pe_ratio}x` : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Beta</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {data ? `*${data.equity_investment.beta}` : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Sector</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              *Technology
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Last Dividend Date</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {data ? `*${new Date(data.equity_investment.last_dividend_date).toLocaleDateString('de-DE')}` : '*N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquityDetails; 