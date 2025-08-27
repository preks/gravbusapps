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
      priority: "Medium",
      gradientFrom: "gba:from-green-50",
      gradientTo: "gba:to-emerald-50",
      iconBg: "gba:bg-green-100",
      iconColor: "gba:text-green-600"
    },
    {
      type: "warning", 
      icon: AlertTriangle,
      title: "Real Estate Concentration Risk",
      description: "45.8% of portfolio is in real estate, above recommended 40% threshold for diversification.",
      recommendation: "Reduce real estate exposure or increase other asset classes to rebalance.",
      priority: "High",
      gradientFrom: "gba:from-amber-50",
      gradientTo: "gba:to-yellow-50",
      iconBg: "gba:bg-amber-100",
      iconColor: "gba:text-amber-600"
    },
    {
      type: "info",
      icon: TrendingUp,
      title: "Private Equity Opportunity",
      description: "Private equity showing consistent 22% ROI with low correlation to other assets.",
      recommendation: "Explore additional private equity opportunities in healthcare and technology sectors.",
      priority: "Low",
      gradientFrom: "gba:from-blue-50",
      gradientTo: "gba:to-indigo-50",
      iconBg: "gba:bg-blue-100",
      iconColor: "gba:text-blue-600"
    },
    {
      type: "info",
      icon: Info,
      title: "Liquidity Management",
      description: "Current liquidity ratio of 12.5% provides good flexibility for new opportunities.",
      recommendation: "Maintain current liquidity levels while monitoring market conditions.",
      priority: "Low",
      gradientFrom: "gba:from-slate-50",
      gradientTo: "gba:to-gray-50",
      iconBg: "gba:bg-slate-100",
      iconColor: "gba:text-slate-600"
    }
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return <Badge variant="destructive">High Priority</Badge>;
      case "Medium":
        return <Badge variant="secondary">Medium Priority</Badge>;
      case "Low":
      default:
        return <Badge variant="outline">Low Priority</Badge>;
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
          
          return (
            <Card key={index} className="gba:h-full">
              <CardHeader>
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className={`gba:p-2 ${insight.iconBg} gba:rounded-lg`}>
                      <IconComponent className={`gba:h-5 gba:w-5 ${insight.iconColor}`} />
                    </div>
                    <div>
                      <CardTitle>
                        {insight.title}
                      </CardTitle>
                    </div>
                  </div>
                  {getPriorityBadge(insight.priority)}
                </div>
              </CardHeader>
              <CardContent className="gba:p-6">
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