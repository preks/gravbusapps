import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@newwork/nw-design-system";

export interface PipelineHealthMetrics {
  healthScore: number;
  totalOpportunities: number;
  avgOpportunityAge: number; // days
  avgWinningChance: number;  // percent
}

export interface PipelineHealthOverviewProps {
  isLoading?: boolean;
  error?: string | null;
  data?: PipelineHealthMetrics | null;
}

export const PipelineHealthOverview: React.FC<PipelineHealthOverviewProps> = ({ isLoading, error, data }) => {
  return (
    <Card className="gba:h-full">
      <CardHeader>
        <CardTitle>Pipeline Health Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-32">
            <div className="gba:text-gray-500">Loading pipeline health...</div>
          </div>
        ) : error ? (
          <div className="gba:text-red-500 gba:text-center gba:py-4">{error}</div>
        ) : data ? (
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:text-center">
              <div className="gba:text-3xl gba:font-bold gba:text-blue-600">{data.healthScore}%</div>
              <div className="gba:text-sm gba:text-gray-600">Health Score</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:text-3xl gba:font-bold gba:text-green-600">{data.totalOpportunities}</div>
              <div className="gba:text-sm gba:text-gray-600">Total Opportunities</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:text-3xl gba:font-bold gba:text-orange-600">{data.avgOpportunityAge}d</div>
              <div className="gba:text-sm gba:text-gray-600">Avg Age</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:text-3xl gba:font-bold gba:text-purple-600">{data.avgWinningChance}%</div>
              <div className="gba:text-sm gba:text-gray-600">Avg Win Rate</div>
            </div>
          </div>
        ) : (
          <div className="gba:text-center gba:py-4 gba:text-gray-500">No pipeline health data available</div>
        )}
      </CardContent>
    </Card>
  );
};

export default PipelineHealthOverview;

