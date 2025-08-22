import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@newwork/nw-design-system";
import { PercentageOutlined } from "@ant-design/icons";
import { LeadsAnalytics } from "../../../types/analyticsTypes";

interface LeadQualityMatrixProps {
  data: LeadsAnalytics;
}

export const LeadQualityMatrix: React.FC<LeadQualityMatrixProps> = ({
  data,
}) => {
  // Calculate real quality score based on actual conversion metrics
  const realQualityScore = data?.conversionRate
    ? Math.round(data.conversionRate * 2.5 + 25)
    : 25;
  // Calculate real source quality based on volume and percentage
  const sourceQualityInsights =
    data?.leadsBySource?.slice(0, 4).map((source) => {
      // Quality score based on volume (more leads = more established source)
      const volumeScore = Math.min(
        (source.count / (data.totalLeads || 1)) * 100 * 2,
        100
      );

      // Efficiency score based on percentage (higher percentage = more concentrated, potentially better quality)
      const efficiencyScore = Math.min(source.percentage * 2, 100);

      // Combined quality score
      const qualityScore = Math.round((volumeScore + efficiencyScore) / 2);

      // Determine quality level
      const getQualityLevel = (score: number) => {
        if (score >= 85) return { level: "Excellent", color: "green" };
        if (score >= 70) return { level: "Good", color: "blue" };
        if (score >= 55) return { level: "Fair", color: "yellow" };
        return { level: "Poor", color: "red" };
      };

      const quality = getQualityLevel(qualityScore);

      return {
        source: source.source,
        count: source.count,
        percentage: source.percentage,
        qualityScore,
        qualityLevel: quality.level,
        color: quality.color,
      };
    }) || [];

  // Calculate overall portfolio quality metrics
  const totalSources = data?.leadsBySource?.length || 0;
  const sourceDiversification = Math.min((totalSources / 8) * 100, 100); // Assuming 8+ sources is excellent diversification

  return (
    <Card data-testid="lead-quality-matrix">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PercentageOutlined />
          Lead Quality Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          {/* Real Quality Score */}
          <div className="gba:text-center gba:p-4 gba:bg-gradient-to-r gba:from-green-50 gba:to-blue-50 gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-green-600">
              {realQualityScore}
            </div>
            <div className="gba:text-sm gba:text-gray-600">
              Overall Quality Score
            </div>
            <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
              Based on {data?.conversionRate?.toFixed(1)}% conversion rate and
              source performance
            </div>
          </div>

          {/* Real Source Quality Breakdown */}
          <div className="gba:space-y-2">
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700">
              Source Quality Analysis
            </h4>
            {sourceQualityInsights.length > 0 ? (
              sourceQualityInsights.map((source) => (
                <div
                  key={source.source}
                  className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-gray-50 gba:rounded"
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div
                      className={`gba:w-3 gba:h-3 gba:rounded-full gba:bg-${source.color}-500`}
                    ></div>
                    <div>
                      <span className="gba:text-sm gba:font-medium">
                        {source.source}
                      </span>
                      <div className="gba:text-xs gba:text-gray-500">
                        {source.qualityLevel} Quality
                      </div>
                    </div>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-sm gba:font-medium">
                      {source.qualityScore}
                    </span>
                    <Badge variant="outline" className="gba:text-xs">
                      {source.count} leads ({source.percentage.toFixed(1)}%)
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="gba:text-center gba:text-gray-500 gba:py-4">
                <p className="gba:text-sm">No source data available</p>
              </div>
            )}
          </div>

          {/* Real Portfolio Health Metrics */}
          <div className="gba:space-y-2">
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700">
              Portfolio Health
            </h4>

            <div className="gba:space-y-1">
              <div className="gba:flex gba:justify-between gba:text-sm">
                <span>Source Diversification</span>
                <span className="gba:font-medium">
                  {Math.round(sourceDiversification)}%
                </span>
              </div>
              <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2">
                <div
                  className={`gba:h-2 gba:rounded-full ${
                    sourceDiversification >= 60
                      ? "gba:bg-green-500"
                      : sourceDiversification >= 30
                      ? "gba:bg-yellow-500"
                      : "gba:bg-red-500"
                  }`}
                  style={{ width: `${sourceDiversification}%` }}
                ></div>
              </div>
              <div className="gba:text-xs gba:text-gray-500">
                {totalSources} active lead sources
              </div>
            </div>

            <div className="gba:space-y-1">
              <div className="gba:flex gba:justify-between gba:text-sm">
                <span>Conversion Efficiency</span>
                <span className="gba:font-medium">
                  {data?.conversionRate?.toFixed(1) || "0.0"}%
                </span>
              </div>
              <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2">
                <div
                  className={`gba:h-2 gba:rounded-full ${
                    (data?.conversionRate || 0) >= 25
                      ? "gba:bg-green-500"
                      : (data?.conversionRate || 0) >= 15
                      ? "gba:bg-yellow-500"
                      : "gba:bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min((data?.conversionRate || 0) * 4, 100)}%`,
                  }}
                ></div>
              </div>
              <div className="gba:text-xs gba:text-gray-500">
                Lead to conversion success rate
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
export default LeadQualityMatrix;
