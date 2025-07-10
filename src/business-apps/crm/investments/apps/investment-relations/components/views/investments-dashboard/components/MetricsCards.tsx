import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@newwork/nw-design-system";
import { ArrowDown, ArrowUpRight, DollarSign, TrendingUp, Target, Clock } from "lucide-react";
import { InvestmentMetrics } from "../hooks/useInvestmentDataIntegration";

interface MetricsCardsProps {
  metrics: InvestmentMetrics | null;
}

/**
 * Component displaying key investment metrics cards at the top of the dashboard
 */
const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
              <CardTitle className="gba:text-sm gba:font-medium gba:h-4 gba:bg-gray-200 gba:animate-pulse gba:rounded"></CardTitle>
              <div className="gba:h-4 gba:w-4 gba:bg-gray-200 gba:animate-pulse gba:rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="gba:h-8 gba:bg-gray-200 gba:animate-pulse gba:rounded gba:mb-2"></div>
              <div className="gba:h-4 gba:bg-gray-200 gba:animate-pulse gba:rounded gba:w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-4">
      {/* Total Invested Card */}
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
          <CardTitle className="gba:text-sm gba:font-medium">Total Invested</CardTitle>
          <DollarSign className="gba:h-4 gba:w-4 gba:text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="gba:text-2xl gba:font-bold">{metrics.totalInvested}</div>
          <p className="gba:text-xs gba:text-muted-foreground">
            {metrics.bookValueChange} from initial investment
          </p>
        </CardContent>
      </Card>
      
      {/* Current Book Value Card */}
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
          <CardTitle className="gba:text-sm gba:font-medium">Current Book Value</CardTitle>
          <TrendingUp className="gba:h-4 gba:w-4 gba:text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="gba:text-2xl gba:font-bold">{metrics.currentBookValue}</div>
          <p className="gba:text-xs gba:text-muted-foreground">
            {metrics.bookValueChange} from initial investment
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
          <div className="gba:text-2xl gba:font-bold">{metrics.avgExpectedROI}</div>
          <p className="gba:text-xs gba:text-muted-foreground">
            across all investment types
          </p>
        </CardContent>
      </Card>
      
      {/* Total Investments Card */}
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
          <CardTitle className="gba:text-sm gba:font-medium">Total Investments</CardTitle>
          <Clock className="gba:h-4 gba:w-4 gba:text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="gba:text-2xl gba:font-bold">{metrics.totalInvestments}</div>
          <p className="gba:text-xs gba:text-muted-foreground">
            {metrics.investmentTypes} types
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsCards;