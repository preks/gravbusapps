import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Progress } from '@newwork/nw-design-system';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { WinRateMetrics } from '../types/dashboardTypes';
import { formatPercentage } from '../utils/dashboardUtils';

export interface WinRateKpisProps {
  winRateMetrics: WinRateMetrics;
  pipelineId: string;
}

export const WinRateKpis: React.FC<WinRateKpisProps> = ({
  winRateMetrics,
  pipelineId
}) => {
  const getProgressColor = (winRate: number) => {
    if (winRate >= 70) return 'gba:bg-green-500';
    if (winRate >= 50) return 'gba:bg-orange-500';
    return 'gba:bg-red-500';
  };

  const getTrendIcon = (winRate: number) => {
    if (winRate >= 60) return <TrendingUp className="gba:h-4 gba:w-4 gba:text-green-500" />;
    if (winRate >= 40) return null;
    return <TrendingDown className="gba:h-4 gba:w-4 gba:text-red-500" />;
  };

  return (
    <Card data-testid={`win-rate-kpis-${pipelineId}`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Trophy className="gba:h-5 gba:w-5" />
          <CardTitle>Win Rate Performance</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:gap-4">
          {/* Month to Date */}
          <Card className="gba:bg-blue-50 gba:border-blue-200">
            <CardContent className="gba:p-4">
              <div data-testid={`win-rate-month-${pipelineId}`}>
                <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                  <span className="gba:font-medium gba:text-sm">Month to Date</span>
                  {getTrendIcon(winRateMetrics.monthToDate.winRate)}
                </div>
                
                <div className="gba:text-center gba:mb-3">
                  <div className={`gba:text-2xl gba:font-bold ${winRateMetrics.monthToDate.winRate >= 70 ? 'gba:text-green-600' : winRateMetrics.monthToDate.winRate >= 50 ? 'gba:text-orange-600' : 'gba:text-red-600'}`}>
                    {formatPercentage(winRateMetrics.monthToDate.winRate)}
                  </div>
                  <span className="gba:text-gray-600 gba:text-xs">Win Rate</span>
                </div>

                <Progress 
                  value={winRateMetrics.monthToDate.winRate} 
                  className={`gba:mb-2 ${getProgressColor(winRateMetrics.monthToDate.winRate)}`}
                />

                <div className="gba:flex gba:justify-between gba:text-xs">
                  <span className="gba:text-green-600">
                    Won: {winRateMetrics.monthToDate.won}
                  </span>
                  <span className="gba:text-red-600">
                    Lost: {winRateMetrics.monthToDate.lost}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quarter to Date */}
          <Card className="gba:bg-green-50 gba:border-green-200">
            <CardContent className="gba:p-4">
              <div data-testid={`win-rate-quarter-${pipelineId}`}>
                <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                  <span className="gba:font-medium gba:text-sm">Quarter to Date</span>
                  {getTrendIcon(winRateMetrics.quarterToDate.winRate)}
                </div>
                
                <div className="gba:text-center gba:mb-3">
                  <div className={`gba:text-2xl gba:font-bold ${winRateMetrics.quarterToDate.winRate >= 70 ? 'gba:text-green-600' : winRateMetrics.quarterToDate.winRate >= 50 ? 'gba:text-orange-600' : 'gba:text-red-600'}`}>
                    {formatPercentage(winRateMetrics.quarterToDate.winRate)}
                  </div>
                  <span className="gba:text-gray-600 gba:text-xs">Win Rate</span>
                </div>

                <Progress 
                  value={winRateMetrics.quarterToDate.winRate} 
                  className={`gba:mb-2 ${getProgressColor(winRateMetrics.quarterToDate.winRate)}`}
                />

                <div className="gba:flex gba:justify-between gba:text-xs">
                  <span className="gba:text-green-600">
                    Won: {winRateMetrics.quarterToDate.won}
                  </span>
                  <span className="gba:text-red-600">
                    Lost: {winRateMetrics.quarterToDate.lost}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Indicators */}
        <div className="gba:mt-4 gba:p-3 gba:bg-gray-50 gba:rounded-lg">
          <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-center">
            <div>
              <div className="gba:text-lg gba:font-bold gba:text-blue-600">
                {winRateMetrics.monthToDate.won + winRateMetrics.quarterToDate.won}
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Total Won</span>
            </div>
            <div>
              <div className="gba:text-lg gba:font-bold gba:text-red-600">
                {winRateMetrics.monthToDate.lost + winRateMetrics.quarterToDate.lost}
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Total Lost</span>
            </div>
            <div>
              <div className="gba:text-lg gba:font-bold gba:text-green-600">
                {((winRateMetrics.monthToDate.winRate + winRateMetrics.quarterToDate.winRate) / 2).toFixed(1)}%
              </div>
              <span className="gba:text-gray-600 gba:text-xs">Avg Rate</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
