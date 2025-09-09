import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { BarChart3 } from 'lucide-react';
import { formatCurrency, formatPercentage, formatDate as formatCentralDate } from '@/common/data/investment';
import { EquityInvestmentRecord } from '../types';
import { EquityInvestmentData } from '../hooks/useEquityRecordData';

interface EquityDetailsProps {
  data?: EquityInvestmentRecord; // Legacy mock data
  equityData?: EquityInvestmentData | null; // Real GraphQL data
  isLoading?: boolean;
}

const EquityDetails: React.FC<EquityDetailsProps> = ({ data, equityData, isLoading }) => {
  // Helper function to format currency with GraphQL data
  const formatCurrencyValue = (amount: number | null | undefined, currency?: { code: string } | null): string => {
    if (amount === null) return '-'; // Schema field with null value
    if (amount === undefined) return 'N/A'; // Field not in schema
    const currencyCode = currency?.code || 'EUR';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format large numbers
  const formatLargeNumber = (value: number | null | undefined): string => {
    if (value === null) return '-'; // Schema field with null value
    if (value === undefined) return 'N/A'; // Field not in schema
    return new Intl.NumberFormat('de-DE').format(value);
  };

  // Helper function to format dates using central formatter
  const formatDate = (dateString: string | null | undefined): string => {
    if (dateString === null) return '-'; // Schema field with null value
    if (!dateString) return 'N/A'; // Field not in schema
    return formatCentralDate(dateString, 'L', '-');
  };

  // Helper function to format strings
  const formatString = (value: string | null | undefined): string => {
    if (value === null) return '-'; // Schema field with null value
    if (value === undefined) return 'N/A'; // Field not in schema
    return value;
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

  // Use real GraphQL data
  const investment = equityData?.investment;
  const equityInvestment = equityData?.equityInvestment;
  const currency = investment?.currency;

  // Company Information
  const companyName = formatString(investment?.investmentAccount?.name);
  
  // Equity-specific fields from GraphQL
  const foundationDate = formatDate(equityInvestment?.foundationDate);
  const marketValue = formatCurrencyValue(equityInvestment?.marketValue, currency);
  const ebitdaAmount = formatCurrencyValue(equityInvestment?.ebitdaAmount, currency);
  const turnoverAmount = formatCurrencyValue(equityInvestment?.turnoverAmount, currency);
  
  // Investment-level fields
  const initialInvestment = formatCurrencyValue(investment?.initialInvestmentAmount, currency);
  const totalInvestment = formatCurrencyValue(investment?.totalInvestmentAmount, currency);
  const stakePercentage = investment?.stakePercentage ? `${investment.stakePercentage}%` : '-';
  const acquisitionDate = formatDate(investment?.acquisitionDate);
  
  // Additional equity-specific fields
  const businessKey = formatString(equityInvestment?.businessKey);
  const activeFrom = formatDate(equityInvestment?.activeFrom);
  const activeTo = formatDate(equityInvestment?.activeTo);
  const recordState = formatString(equityInvestment?.recordState);
  const processInstanceId = formatString(equityInvestment?.processInstanceId);
  
  // Additional Properties (JSON field that might contain extra data)
  const additionalProps = equityInvestment?.additionalProperties;
  const hasAdditionalProps = additionalProps && typeof additionalProps === 'object' && Object.keys(additionalProps).length > 0;
  
  // Fields not available in schema - show N/A
  const investmentRole = 'N/A'; // Not in current schema
  const numberOfShares = 'N/A'; // Not in current schema
  const currentSharePrice = 'N/A'; // Not in current schema
  const purchaseSharePrice = 'N/A'; // Not in current schema
  const dividendYield = 'N/A'; // Not in current schema
  const peRatio = 'N/A'; // Not in current schema
  const beta = 'N/A'; // Not in current schema
  const sector = 'N/A'; // Not in current schema
  const lastDividendDate = 'N/A'; // Not in current schema

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <BarChart3 className="gba:h-5 gba:w-5 gba:text-blue-600" />
          Equity Details
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
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Foundation Date</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {foundationDate}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Market Value</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {marketValue}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">EBITDA Amount</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {ebitdaAmount}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Turnover Amount</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {turnoverAmount}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Initial Investment</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {initialInvestment}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Total Investment</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {totalInvestment}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Stake Percentage</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {stakePercentage}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Acquisition Date</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {acquisitionDate}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Business Key</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {businessKey}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Active From</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {activeFrom}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Active To</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {activeTo}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Record State</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {recordState}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Investment Role</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {investmentRole}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Number of Shares</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {numberOfShares}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Current Share Price</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {currentSharePrice}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Purchase Share Price</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {purchaseSharePrice}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Dividend Yield</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {dividendYield}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">P/E Ratio</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {peRatio}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Beta</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {beta}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Sector</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {sector}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Last Dividend Date</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {lastDividendDate}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Process Instance ID</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {processInstanceId}
            </p>
          </div>
        </div>
        {hasAdditionalProps && (
          <div className="gba:mt-6 gba:pt-6 gba:border-t gba:border-gray-200">
            <h3 className="gba:text-base gba:font-semibold gba:text-gray-900 gba:mb-4">Additional Properties</h3>
            <div className="gba:bg-gray-50 gba:rounded-lg gba:p-4">
              <pre className="gba:text-xs gba:text-gray-700 gba:whitespace-pre-wrap gba:break-words">
                {JSON.stringify(additionalProps, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquityDetails; 