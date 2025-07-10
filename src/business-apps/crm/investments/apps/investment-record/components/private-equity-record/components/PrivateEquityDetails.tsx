import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { PieChart } from 'lucide-react';
import { Spin } from 'antd';
import { PrivateEquityInvestmentRecord } from '../types';
import { PrivateEquityInvestmentData } from '../hooks/usePrivateEquityRecordData';
import { formatCurrency } from '../utils/formatters';

interface PrivateEquityDetailsProps {
  data?: PrivateEquityInvestmentRecord;
  privateEquityData?: PrivateEquityInvestmentData;
  isLoading?: boolean;
}

const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR';
};

const PrivateEquityDetails: React.FC<PrivateEquityDetailsProps> = ({ data, privateEquityData, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PieChart className="gba:h-5 gba:w-5" />
            Private Equity Details
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:py-8">
          <div className="gba:flex gba:justify-center gba:items-center">
            <Spin size="large" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use real data if available, otherwise fall back to mock data
  const realInvestmentData = privateEquityData?.investment;
  const mockData = data;
  const currencyCode = realInvestmentData?.currency ? extractCurrencyCode(realInvestmentData.currency.code) : 'EUR';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PieChart className="gba:h-5 gba:w-5" />
          Private Equity Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Fund Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? realInvestmentData.name || '*N/A' 
                : mockData?.private_equity_investment.fund_name}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Vintage Year</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? (realInvestmentData.acquisitionDate ? new Date(realInvestmentData.acquisitionDate).getFullYear() : '*N/A')
                : mockData?.private_equity_investment.fund_vintage_year}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Fund Size</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? `*${new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(0)}` 
                : (mockData ? formatCurrency(mockData.private_equity_investment.fund_size, mockData.investment.currency_ref) : '€0')}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Committed Capital</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(realInvestmentData.totalInvestmentAmount || 0)
                : (mockData ? formatCurrency(mockData.private_equity_investment.committed_capital, mockData.investment.currency_ref) : '€0')}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Called Capital</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(realInvestmentData.initialInvestmentAmount || 0)
                : (mockData ? formatCurrency(mockData.private_equity_investment.called_capital, mockData.investment.currency_ref) : '€0')}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Distributed Capital</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? `*${new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(0)}` 
                : (mockData ? formatCurrency(mockData.private_equity_investment.distributed_capital, mockData.investment.currency_ref) : '€0')}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Investment Strategy</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? realInvestmentData.investmentPhase?.value || '*N/A' 
                : mockData?.private_equity_investment.investment_strategy}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Geographic Focus</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? `*N/A` 
                : mockData?.private_equity_investment.geographic_focus}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Sector Focus</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? `*N/A` 
                : mockData?.private_equity_investment.sector_focus}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrivateEquityDetails; 