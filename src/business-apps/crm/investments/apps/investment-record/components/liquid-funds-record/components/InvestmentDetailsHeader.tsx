import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Badge } from '@newwork/nw-design-system';
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Award, 
  Calendar, 
  Settings
} from 'lucide-react';
import { LiquidFundInvestmentRecord } from '../types';
import { formatCurrency, formatPercentage, getStatusColor } from '../../../utils/formatters';

interface InvestmentDetailsHeaderProps {
  data: LiquidFundInvestmentRecord;
}

const InvestmentDetailsHeader: React.FC<InvestmentDetailsHeaderProps> = ({ data }) => {
  // Helper function to format reference values for display
  const formatReferenceValue = (refValue: string): string => {
    return refValue.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="gba:px-6 gba:pt-6 gba:pb-4">
      <Card className="gba:bg-gradient-to-r gba:from-teal-50 gba:to-cyan-50 gba:border-teal-200">
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:p-2 gba:bg-teal-100 gba:rounded-md">
              <BarChart3 className="gba:h-4 gba:w-4 gba:text-teal-600" />
            </div>
            <div>
              <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {data.investment.name || 'Investment Details'}
              </h2>
              <div className="gba:flex gba:items-center gba:gap-3 gba:mt-0.5">
                <Badge className="gba:bg-teal-100 gba:text-teal-800 gba:text-xs gba:px-2 gba:py-0.5">
                  {formatReferenceValue(data.investment.investment_group_ref)}
                </Badge>
                <Badge className="gba:bg-cyan-100 gba:text-cyan-800 gba:text-xs gba:px-2 gba:py-0.5">
                  {formatReferenceValue(data.investment.investment_type_ref)}
                </Badge>
                <span className="gba:text-xs gba:text-gray-600">
                  {data.investment.account_name}
                </span>
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
                {formatCurrency(data.investment.book_value, data.investment.currency_ref)}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <TrendingUp className="gba:h-3 gba:w-3 gba:text-teal-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Market Value</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {formatCurrency(data.investment.market_value, data.investment.currency_ref)}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Target className="gba:h-3 gba:w-3 gba:text-teal-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Initial Investment</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {formatCurrency(data.investment.initial_investment_amount, data.investment.currency_ref)}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <BarChart3 className="gba:h-3 gba:w-3 gba:text-amber-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Total Investment</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {formatCurrency(data.investment.total_investment_amount, data.investment.currency_ref)}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Award className="gba:h-3 gba:w-3 gba:text-cyan-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Interest Rate</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {formatPercentage(data.liquid_fund_investment.interest_rate)}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Calendar className="gba:h-3 gba:w-3 gba:text-gray-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Acquired</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {new Date(data.investment.acquisition_date).toLocaleDateString('de-DE')}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Settings className="gba:h-3 gba:w-3 gba:text-gray-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Status</span>
              </div>
              <Badge className={`${getStatusColor(data.investment.investment_status_ref)} gba:text-xs gba:px-1.5 gba:py-0.5`}>
                {formatReferenceValue(data.investment.investment_status_ref)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentDetailsHeader; 