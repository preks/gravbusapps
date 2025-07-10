import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@newwork/nw-design-system";
import { Badge } from "@newwork/nw-design-system";
import { AlertTriangle, CheckCircle, TrendingUp, Info } from "lucide-react";

/**
 * Component displaying analytics insights and recommendations
 */
const AnalyticsInsights = () => {
  const insights = [
    {
      type: "success",
      icon: CheckCircle,
      title: "Strong Equity Performance",
      description: "Equity investments are outperforming targets by 2.5%, driven by TechCorp and Biotech acquisitions.",
      recommendation: "Consider increasing equity allocation by 5-10% in Q2 2024.",
      priority: "Medium"
    },
    {
      type: "warning", 
      icon: AlertTriangle,
      title: "Real Estate Concentration Risk",
      description: "45.8% of portfolio is in real estate, above recommended 40% threshold for diversification.",
      recommendation: "Reduce real estate exposure or increase other asset classes to rebalance.",
      priority: "High"
    },
    {
      type: "info",
      icon: TrendingUp,
      title: "Private Equity Opportunity",
      description: "Private equity showing consistent 22% ROI with low correlation to other assets.",
      recommendation: "Explore additional private equity opportunities in healthcare and technology sectors.",
      priority: "Low"
    },
    {
      type: "info",
      icon: Info,
      title: "Liquidity Management",
      description: "Current liquidity ratio of 12.5% provides good flexibility for new opportunities.",
      recommendation: "Maintain current liquidity levels while monitoring market conditions.",
      priority: "Low"
    }
  ];

  const getInsightStyles = (type: string) => {
    switch (type) {
      case "success":
        return {
          border: "gba:border-green-200",
          bg: "gba:bg-green-50",
          iconColor: "gba:text-green-600"
        };
      case "warning":
        return {
          border: "gba:border-yellow-200", 
          bg: "gba:bg-yellow-50",
          iconColor: "gba:text-yellow-600"
        };
      case "info":
      default:
        return {
          border: "gba:border-blue-200",
          bg: "gba:bg-blue-50", 
          iconColor: "gba:text-blue-600"
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return <Badge className="gba:bg-red-100 gba:text-red-700 gba:border-red-200">High Priority</Badge>;
      case "Medium":
        return <Badge className="gba:bg-yellow-100 gba:text-yellow-700 gba:border-yellow-200">Medium Priority</Badge>;
      case "Low":
      default:
        return <Badge className="gba:bg-blue-100 gba:text-blue-700 gba:border-blue-200">Low Priority</Badge>;
    }
  };

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">Portfolio Insights & Recommendations</h3>
        <span className="gba:text-sm gba:text-gray-600">Based on current performance and market analysis</span>
      </div>
      
      <div className="gba:grid gba:gap-4 gba:grid-cols-1 gba:lg:grid-cols-2">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          const styles = getInsightStyles(insight.type);
          
          return (
            <Card key={index} className={`${styles.border} ${styles.bg} gba:border`}>
              <CardHeader className="gba:pb-3">
                <div className="gba:flex gba:items-start gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <IconComponent className={`gba:h-5 gba:w-5 ${styles.iconColor}`} />
                    <CardTitle className="gba:text-base gba:font-semibold gba:text-gray-900">
                      {insight.title}
                    </CardTitle>
                  </div>
                  {getPriorityBadge(insight.priority)}
                </div>
              </CardHeader>
              <CardContent className="gba:pt-0">
                <div className="gba:space-y-3">
                  <p className="gba:text-sm gba:text-gray-700 gba:leading-relaxed">
                    {insight.description}
                  </p>
                  <div className="gba:border-t gba:border-gray-200 gba:pt-3">
                    <p className="gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-1">
                      Recommendation:
                    </p>
                    <p className="gba:text-sm gba:text-gray-700">
                      {insight.recommendation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AnalyticsInsights;