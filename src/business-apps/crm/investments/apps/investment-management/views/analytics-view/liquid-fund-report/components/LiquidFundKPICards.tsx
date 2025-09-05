import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system';
import { Building, Percent, Calendar, CheckCircle } from 'lucide-react';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { formatCurrency, formatNumber, formatPercentage } from '@/common/data/investment';
import { LiquidFundInvestmentKPIs } from '../types';

// Typography no longer needed with design system

interface LiquidFundKPICardsProps {
  kpis: LiquidFundInvestmentKPIs;
  prefixDataTestId?: string;
}

export const LiquidFundKPICards: React.FC<LiquidFundKPICardsProps> = ({ 
  kpis, 
  prefixDataTestId = 'LiquidFundKPICards' 
}) => {
  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:gba:grid-cols-2 gba:lg:gba:grid-cols-4 gba:gap-4 gba:mb-6">
      <Card data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalFundValue')}>
        <CardContent className="gba:flex gba:items-center gba:gap-3 gba:p-6">
          <div className="gba:p-3 gba:rounded-lg">
            <Building className="gba:h-6 gba:w-6" />
          </div>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Total Fund Value</p>
            <p className="gba:text-2xl gba:font-bold">{formatCurrency(kpis.totalFundValue)}</p>
          </div>
        </CardContent>
      </Card>

      <Card data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageInterestRate')}>
        <CardContent className="gba:flex gba:items-center gba:gap-3 gba:p-6">
          <div className="gba:p-3 gba:rounded-lg">
            <Percent className="gba:h-6 gba:w-6" />
          </div>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Average Interest Rate</p>
            <p className="gba:text-2xl gba:font-bold">{formatPercentage(kpis.averageInterestRate)}</p>
          </div>
        </CardContent>
      </Card>

      <Card data-testid={formatDataTestId(prefixDataTestId, 'KPICard-MaturingSoon')}>
        <CardContent className="gba:flex gba:items-center gba:gap-3 gba:p-6">
          <div className="gba:p-3 gba:rounded-lg">
            <Calendar className="gba:h-6 gba:w-6" />
          </div>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Maturing Soon</p>
            <p className="gba:text-2xl gba:font-bold">{formatNumber(kpis.maturingSoon)}</p>
          </div>
        </CardContent>
      </Card>

      <Card data-testid={formatDataTestId(prefixDataTestId, 'KPICard-EarlyTerminationAllowed')}>
        <CardContent className="gba:flex gba:items-center gba:gap-3 gba:p-6">
          <div className="gba:p-3 gba:rounded-lg">
            <CheckCircle className="gba:h-6 gba:w-6" />
          </div>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Early Termination Allowed</p>
            <p className="gba:text-2xl gba:font-bold">{formatNumber(kpis.earlyTerminationAllowed)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 