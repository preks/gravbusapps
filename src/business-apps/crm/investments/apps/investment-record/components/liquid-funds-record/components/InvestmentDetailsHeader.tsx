import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Badge, Button } from '@newwork/nw-design-system';
import { DollarSign, TrendingUp, Target, BarChart3, Award, Calendar, Settings, Info } from 'lucide-react';
import AuditInfoPanel from '../../shared/AuditInfoPanel';
import { formatCurrency, formatPercentage, getStatusColor } from '../../../utils/formatters';
import type { LiquidFundInvestmentData } from '../types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface InvestmentDetailsHeaderProps {
  liquidFundData: LiquidFundInvestmentData | null;
  context: BusinessAppContextProps;
}

const InvestmentDetailsHeader: React.FC<InvestmentDetailsHeaderProps> = ({ liquidFundData, context }) => {
  if (!liquidFundData) {
    return null;
  }
  const { investment, liquidFundInvestment } = liquidFundData;
  const [showAudit, setShowAudit] = useState(false);
  // Helper function to format reference values for display
  const formatReferenceValue = (refValue: string): string => {
    if (!refValue) return 'N/A';
    return refValue.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="gba:px-6 gba:pt-6 gba:pb-4" data-testid="investment-details-header">
      <Card>
        <CardHeader className="gba:pb-3">
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:p-2 gba:bg-teal-100 gba:rounded-md">
                <BarChart3 className="gba:h-4 gba:w-4 gba:text-teal-600" />
              </div>
              <div>
                <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900">
                  {investment.displayName || investment.name || 'Investment Details'}
                </h2>
                <div className="gba:flex gba:items-center gba:gap-3 gba:mt-0.5">
                  <Badge className="gba:bg-teal-100 gba:text-teal-800 gba:text-xs gba:px-2 gba:py-0.5">
                    {investment.investmentGroup?.value || formatReferenceValue(investment.investmentGroup?.code || '')}
                  </Badge>
                  <Badge className="gba:bg-cyan-100 gba:text-cyan-800 gba:text-xs gba:px-2 gba:py-0.5">
                    {investment.investmentType?.value || formatReferenceValue(investment.investmentType?.code || '')}
                  </Badge>
                  <span className="gba:text-xs gba:text-gray-600">
                    {investment.investmentAccount?.name || ''}
                  </span>
                </div>
              </div>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAudit(v => !v)}
              className="gba:flex gba:items-center"
              data-testid="audit-toggle-button"
            >
              <Info className="gba:h-4 gba:w-4 gba:mr-1" />
              {getTranslationFromI18nKeyAndLabel('crm.investments.audit.info', 'Audit Info')}
            </Button>
          </div>
          <AuditInfoPanel show={showAudit} investment={investment} context={context} data-testid="audit-info-panel" />
        </CardHeader>
        <CardContent className="gba:pt-0">
          <div className="gba:grid gba:gap-4 gba:grid-cols-2 gba:md:grid-cols-4 gba:lg:grid-cols-7">
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <DollarSign className="gba:h-3 gba:w-3 gba:text-green-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Book Value</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {formatCurrency(
                  investment.initialInvestmentAmount || 0,
                  investment.currency?.code || 'EUR'
                )}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <TrendingUp className="gba:h-3 gba:w-3 gba:text-teal-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Market Value</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {formatCurrency(
                  investment.investmentMarketValue || 0,
                  investment.currency?.code || 'EUR'
                )}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Target className="gba:h-3 gba:w-3 gba:text-teal-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Initial Investment</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {formatCurrency(
                  investment.initialInvestmentAmount || 0,
                  investment.currency?.code || 'EUR'
                )}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <BarChart3 className="gba:h-3 gba:w-3 gba:text-amber-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Total Investment</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {formatCurrency(
                  investment.totalInvestmentAmount || 0,
                  investment.currency?.code || 'EUR'
                )}
                {formatCurrency(
                  investment.totalInvestmentAmount || 0,
                  investment.currency?.code || 'EUR'
                )}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Award className="gba:h-3 gba:w-3 gba:text-cyan-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Interest Rate</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {formatPercentage(liquidFundInvestment?.interestRate || 0)}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Calendar className="gba:h-3 gba:w-3 gba:text-gray-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Acquired</span>
              </div>
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {investment.acquisitionDate ? new Date(investment.acquisitionDate).toLocaleDateString('de-DE') : ''}
              </p>
            </div>
            <div>
              <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                <Settings className="gba:h-3 gba:w-3 gba:text-gray-600" />
                <span className="gba:text-xs gba:font-medium gba:text-gray-700">Status</span>
              </div>
              <Badge className={`${getStatusColor((investment.investmentStatus?.code || ''))} gba:text-xs gba:px-1.5 gba:py-0.5`}>
                {investment.investmentStatus?.value || formatReferenceValue(investment.investmentStatus?.code || '')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentDetailsHeader; 