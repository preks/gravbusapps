import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Badge } from '@newwork/nw-design-system';
import { Spin, Alert } from 'antd';
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Award, 
  Calendar, 
  Settings,
  Briefcase
} from 'lucide-react';
import { PrivateEquityInvestmentRecord } from '../types';
import { PrivateEquityInvestmentData } from '../hooks/usePrivateEquityRecordData';
import { formatCurrency, formatPercentage, getStatusColor } from '../utils/formatters';

interface InvestmentDetailsHeaderProps {
  data?: PrivateEquityInvestmentRecord;
  privateEquityData?: PrivateEquityInvestmentData;
  isLoading?: boolean;
  error?: string | null;
}

const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR';
};

const InvestmentDetailsHeader: React.FC<InvestmentDetailsHeaderProps> = ({ 
  data, 
  privateEquityData, 
  isLoading, 
  error 
}) => {
  if (isLoading) {
    return (
      <div className="gba:px-6 gba:pt-6 gba:pb-4">
        <Card className="gba:bg-gradient-to-r gba:from-purple-50 gba:to-violet-50 gba:border-purple-200">
          <CardContent className="gba:py-8">
            <div className="gba:flex gba:justify-center gba:items-center">
              <Spin size="large" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:px-6 gba:pt-6 gba:pb-4">
        <Card className="gba:bg-gradient-to-r gba:from-red-50 gba:to-pink-50 gba:border-red-200">
          <CardContent className="gba:py-4">
            <Alert
              message="Error Loading Investment Data"
              description={error}
              type="error"
              showIcon
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use real data if available, otherwise fall back to mock data
  const realInvestmentData = privateEquityData?.investment;
  const mockInvestmentData = data?.investment;
  const companyName = privateEquityData?.investment?.account?.name || data?.company_details?.name || '*Company Name';
  const currencyCode = realInvestmentData?.currency ? extractCurrencyCode(realInvestmentData.currency.code) : 'EUR';

  return (
    <div className="gba:px-6 gba:pt-6 gba:pb-4">
      <Card className="gba:bg-gradient-to-r gba:from-purple-50 gba:to-violet-50 gba:border-purple-200">
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:p-2 gba:bg-purple-100 gba:rounded-md">
              <Briefcase className="gba:h-4 gba:w-4 gba:text-purple-600" />
            </div>
            <div>
              <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900">Investment Details</h2>
              <div className="gba:flex gba:items-center gba:gap-3 gba:mt-0.5">
                <Badge className="gba:bg-purple-100 gba:text-purple-800 gba:text-xs gba:px-2 gba:py-0.5">
                  Private Equity
                </Badge>
                <Badge className="gba:bg-indigo-100 gba:text-indigo-800 gba:text-xs gba:px-2 gba:py-0.5">
                  *Fund Investment
                </Badge>
                <span className="gba:text-xs gba:text-gray-600">{companyName}</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:pt-0">
          <div className="gba:grid gba:gap-4 gba:grid-cols-2 gba:md:grid-cols-4 gba:lg:grid-cols-7">
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <DollarSign className="gba:h-3 gba:w-3 gba:text-green-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Book Value</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {realInvestmentData?.bookValue 
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(realInvestmentData.bookValue)
                  : (mockInvestmentData ? formatCurrency(mockInvestmentData.book_value, mockInvestmentData.currency_ref) : '€0')
                }
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <TrendingUp className="gba:h-3 gba:w-3 gba:text-blue-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Market Value</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {realInvestmentData?.marketValue 
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(realInvestmentData.marketValue)
                  : (mockInvestmentData ? formatCurrency(mockInvestmentData.market_value, mockInvestmentData.currency_ref) : '€0')
                }
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Target className="gba:h-3 gba:w-3 gba:text-purple-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Initial Investment</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {realInvestmentData?.initialInvestmentAmount 
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(realInvestmentData.initialInvestmentAmount)
                  : (mockInvestmentData ? formatCurrency(mockInvestmentData.initial_investment_amount, mockInvestmentData.currency_ref) : '€0')
                }
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <BarChart3 className="gba:h-3 gba:w-3 gba:text-amber-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Total Investment</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {realInvestmentData?.totalInvestmentAmount 
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(realInvestmentData.totalInvestmentAmount)
                  : (mockInvestmentData ? formatCurrency(mockInvestmentData.total_investment_amount, mockInvestmentData.currency_ref) : '€0')
                }
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Award className="gba:h-3 gba:w-3 gba:text-indigo-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Fund Stake %</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {realInvestmentData?.stakePercent 
                  ? `${realInvestmentData.stakePercent}%`
                  : (mockInvestmentData ? formatPercentage(mockInvestmentData.stake_percent) : '0%')
                }
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Calendar className="gba:h-3 gba:w-3 gba:text-gray-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Acquired</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {realInvestmentData?.acquisitionDate 
                  ? new Date(realInvestmentData.acquisitionDate).toLocaleDateString('de-DE')
                  : (mockInvestmentData ? new Date(mockInvestmentData.acquisition_date).toLocaleDateString('de-DE') : '*N/A')
                }
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Settings className="gba:h-3 gba:w-3 gba:text-gray-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Status</span>
              </div>
              <Badge className={`${getStatusColor(realInvestmentData?.investmentStatus?.code || 'active')} gba:text-xs gba:px-1.5 gba:py-0.5`}>
                {realInvestmentData?.investmentStatus?.value || 'Active'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentDetailsHeader; 