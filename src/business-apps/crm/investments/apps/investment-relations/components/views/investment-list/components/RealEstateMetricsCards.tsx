import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@newwork/nw-design-system";
import { DollarSign, TrendingUp, Target, Clock } from "lucide-react";
import { EnhancedInvestment } from "../hooks";

interface RealEstateMetricsCardsProps {
  investments: EnhancedInvestment[];
}

/**
 * Component displaying key real estate metrics cards for the real estate tab
 */
const RealEstateMetricsCards: React.FC<RealEstateMetricsCardsProps> = ({ investments }) => {
  // Filter real estate investments
  const realEstateInvestments = investments.filter(inv => inv.type === 'Real Estate');

  // Calculate metrics
  const totalInvested = realEstateInvestments.reduce((sum, inv) => 
    sum + inv.rawData.investment.initialInvestmentAmount, 0
  );
  
  const totalBookValue = realEstateInvestments.reduce((sum, inv) => 
    sum + inv.rawData.investment.bookValue, 0
  );

  const bookValueChange = totalBookValue - totalInvested;
  const changePercent = totalInvested > 0 ? (bookValueChange / totalInvested) * 100 : 0;

  const avgROI = realEstateInvestments.length > 0 ? 
    realEstateInvestments.reduce((sum, inv) => {
      const roi = ((inv.rawData.investment.bookValue - inv.rawData.investment.initialInvestmentAmount) / inv.rawData.investment.initialInvestmentAmount) * 100;
      return sum + roi;
    }, 0) / realEstateInvestments.length : 0;

  const activeInvestments = realEstateInvestments.filter(inv => inv.status === 'active' || inv.status === 'Active').length;

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-4">
      {/* Total Invested Card */}
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
          <CardTitle className="gba:text-sm gba:font-medium">Total Invested</CardTitle>
          <DollarSign className="gba:h-4 gba:w-4 gba:text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="gba:text-2xl gba:font-bold">{formatCurrency(totalInvested)}</div>
          <p className="gba:text-xs gba:text-muted-foreground">
            {formatCurrency(bookValueChange)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
          </p>
        </CardContent>
      </Card>
      
      {/* Book Value Card */}
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
          <CardTitle className="gba:text-sm gba:font-medium">Book Value</CardTitle>
          <TrendingUp className="gba:h-4 gba:w-4 gba:text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="gba:text-2xl gba:font-bold">{formatCurrency(totalBookValue)}</div>
          <p className="gba:text-xs gba:text-muted-foreground">
            {formatCurrency(bookValueChange)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
          </p>
        </CardContent>
      </Card>
      
      {/* Avg. Expected ROI Card */}
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
          <CardTitle className="gba:text-sm gba:font-medium">Avg. Expected ROI</CardTitle>
          <Target className="gba:h-4 gba:w-4 gba:text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="gba:text-2xl gba:font-bold">{avgROI.toFixed(1)}%</div>
          <p className="gba:text-xs gba:text-muted-foreground">
            across {realEstateInvestments.length} real estate investments
          </p>
        </CardContent>
      </Card>
      
      {/* Active Investments Card */}
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
          <CardTitle className="gba:text-sm gba:font-medium">Active Investments</CardTitle>
          <Clock className="gba:h-4 gba:w-4 gba:text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="gba:text-2xl gba:font-bold">{activeInvestments}</div>
          <p className="gba:text-xs gba:text-muted-foreground">
            of {realEstateInvestments.length} total
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealEstateMetricsCards;