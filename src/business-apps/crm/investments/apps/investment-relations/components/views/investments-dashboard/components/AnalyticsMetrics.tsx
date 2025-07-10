import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@newwork/nw-design-system";
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar, Award } from "lucide-react";

/**
 * Component displaying key analytics metrics and KPIs
 */
const AnalyticsMetrics = () => {
  const metrics = [
    {
      title: "Portfolio Growth",
      value: "+8.9%",
      change: "+2.1%",
      changeType: "positive",
      icon: TrendingUp,
      description: "Year over year",
      color: "gba:text-green-600"
    },
    {
      title: "Average ROI",
      value: "18.5%",
      change: "+1.2%",
      changeType: "positive", 
      icon: Target,
      description: "Across all investments",
      color: "gba:text-blue-600"
    },
    {
      title: "Risk-Adjusted Return",
      value: "15.2%",
      change: "+0.8%",
      changeType: "positive",
      icon: Award,
      description: "Sharpe ratio: 1.24",
      color: "gba:text-purple-600"
    },
    {
      title: "Liquidity Ratio",
      value: "12.5%",
      change: "-1.5%",
      changeType: "negative",
      icon: DollarSign,
      description: "Available for deployment",
      color: "gba:text-amber-600"
    },
    {
      title: "Investment Velocity",
      value: "4.2M€",
      change: "+15%",
      changeType: "positive",
      icon: Calendar,
      description: "Deployed this quarter",
      color: "gba:text-indigo-600"
    },
    {
      title: "Portfolio Diversification",
      value: "0.78",
      change: "+0.05",
      changeType: "positive",
      icon: TrendingUp,
      description: "Herfindahl index",
      color: "gba:text-teal-600"
    }
  ];

  return (
    <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        const isPositive = metric.changeType === "positive";
        
        return (
          <Card key={index} className="gba:hover:shadow-md gba:transition-shadow">
            <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
              <CardTitle className="gba:text-sm gba:font-medium gba:text-gray-700">
                {metric.title}
              </CardTitle>
              <IconComponent className={`gba:h-4 gba:w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-2">
                <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {metric.value}
                </div>
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-1">
                    {isPositive ? (
                      <TrendingUp className="gba:h-3 gba:w-3 gba:text-green-500" />
                    ) : (
                      <TrendingDown className="gba:h-3 gba:w-3 gba:text-red-500" />
                    )}
                    <span className={`gba:text-xs gba:font-medium ${
                      isPositive ? 'gba:text-green-600' : 'gba:text-red-600'
                    }`}>
                      {metric.change}
                    </span>
                  </div>
                  <span className="gba:text-xs gba:text-gray-500">
                    {metric.description}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AnalyticsMetrics;