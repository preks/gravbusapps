import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system';
import { LineChart, Trophy, TrendingUp, Activity, MoreVertical } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PipelineInfo, DateRange } from '../types/dashboardTypes';
import { usePipelineData } from '../hooks/usePipelineData';
import { OpportunityFunnel } from './OpportunityFunnel';
import { WinRateKpis } from './WinRateKpis';
import { ActivityVolume } from './ActivityVolume';
import { SalesLeaderboard } from './SalesLeaderboard';
import { EmptyState } from './EmptyState';
import { formatCurrency, formatLargeNumber } from '../utils/dashboardUtils';

export interface PipelineSectionProps extends BusinessAppContextProps {
  pipeline: PipelineInfo;
  dateRange: DateRange;
  pipelines?: PipelineInfo[];
  selectedPipelineId?: string;
  onPipelineChange?: (pipelineId: string) => void;
}

export const PipelineSection: React.FC<PipelineSectionProps> = ({
  pipeline,
  dateRange,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  ...context
}) => {
  const { pipelineData, isLoading, error, refetch } = usePipelineData(
    context,
    pipeline,
    dateRange
  );

  if (isLoading) {
    return (
      <Card className="gba:h-full">
        <CardContent>
          <div 
            data-testid={`pipeline-section-${pipeline.id}-loading`}
            className="gba:flex gba:items-center gba:justify-center gba:py-16"
          >
            <div className="gba:text-center">
              <Spinner size="lg" />
              <div className="gba:mt-4 gba:text-gray-600">
                Loading {pipeline.name} data...
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:h-full">
        <CardContent className="gba:p-6">
          <Alert
            variant="destructive"
            data-testid={`pipeline-section-${pipeline.id}-error`}
            className="gba:shadow-sm"
          >
            <AlertTitle>Error Loading Pipeline Data</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button size="sm" onClick={refetch} variant="default">
              Retry
            </Button>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!pipelineData) {
    return (
      <Card className="gba:h-full">
        <CardContent className="gba:p-6">
          <EmptyState
            title="No Pipeline Data"
            description="Unable to load data for this pipeline"
          />
        </CardContent>
      </Card>
    );
  }

  const { metrics, opportunities, winRateMetrics, activityVolume, funnelData, leaderboard } = pipelineData;

  return (
    <div
      data-testid={`pipeline-section-${pipeline.id}`}
      className="gba:space-y-6"
    >
      {/* Pipeline Header */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:flex-col lg:gba:flex-row gba:justify-between gba:items-start lg:gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div 
                className="gba:p-3 gba:rounded-xl gba:shadow-sm gba:bg-blue-100"
              >
                <LineChart className="gba:h-6 gba:w-6 gba:text-blue-600" />
              </div>
              <div className="gba:flex gba:items-center gba:gap-3">
                <div>
                  <CardTitle className="gba:text-gray-900">
                    {pipeline.name}
                  </CardTitle>
                  {pipeline.description && (
                    <p className="gba:text-gray-600 gba:text-sm gba:mt-1">
                      {pipeline.description}
                    </p>
                  )}
                </div>
                {pipelines && pipelines.length > 1 && onPipelineChange && (
                  <Select value={selectedPipelineId} onValueChange={onPipelineChange}>
                    <SelectTrigger className="gba:w-48" data-testid="pipeline-selector">
                      <SelectValue placeholder="Select pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div 
                              className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-blue-500"
                            />
                            <span>{p.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            
            <div className="gba:flex gba:flex-wrap gba:gap-3 gba:items-center">
              <Badge variant="secondary" className="gba:px-3 gba:py-1">
                {metrics.totalOpportunities} opportunities
              </Badge>
              <Badge variant="default" className="gba:px-3 gba:py-1">
                {formatCurrency(metrics.totalValue)}
              </Badge>
              <Badge variant="outline" className="gba:px-3 gba:py-1">
                {metrics.conversionRate.toFixed(1)}% conversion
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Overview Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4">
        <Card>
          <CardContent className="gba:p-6">
            <div data-testid={`pipeline-${pipeline.id}-total-value`} className="gba:text-center">
              <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
                <TrendingUp className="gba:text-blue-600 gba:h-5 gba:w-5 gba:mr-2" />
                <span className="gba:text-blue-700 gba:text-sm gba:font-medium">Total Pipeline Value</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-blue-900">
                {formatCurrency(metrics.totalValue)}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="gba:p-6">
            <div data-testid={`pipeline-${pipeline.id}-avg-deal-size`} className="gba:text-center">
              <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
                <Trophy className="gba:text-green-600 gba:h-5 gba:w-5 gba:mr-2" />
                <span className="gba:text-green-700 gba:text-sm gba:font-medium">Avg Deal Size</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-green-900">
                {formatCurrency(metrics.avgDealSize)}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="gba:p-6">
            <div data-testid={`pipeline-${pipeline.id}-conversion-rate`} className="gba:text-center">
              <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
                <LineChart className="gba:text-orange-600 gba:h-5 gba:w-5 gba:mr-2" />
                <span className="gba:text-orange-700 gba:text-sm gba:font-medium">Conversion Rate</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-orange-900">
                {metrics.conversionRate.toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="gba:p-6">
            <div data-testid={`pipeline-${pipeline.id}-sales-cycle`} className="gba:text-center">
              <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
                <Activity className="gba:text-purple-600 gba:h-5 gba:w-5 gba:mr-2" />
                <span className="gba:text-purple-700 gba:text-sm gba:font-medium">Avg Sales Cycle</span>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-purple-900">
                {Math.round(metrics.avgSalesCycle)} days
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Components Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-6">
        {/* Left Column */}
        <div className="gba:space-y-6">
          {/* Opportunity Funnel */}
          <OpportunityFunnel
            funnelData={funnelData}
            pipelineId={pipeline.id}
          />
          
          {/* Win Rate KPIs */}
          <WinRateKpis
            winRateMetrics={winRateMetrics}
            pipelineId={pipeline.id}
          />
        </div>

        {/* Right Column */}
        <div className="gba:space-y-6">
          {/* Activity Volume */}
          <ActivityVolume
            activityVolume={activityVolume}
            pipelineId={pipeline.id}
          />
          
          {/* Sales Leaderboard */}
          <SalesLeaderboard
            leaderboard={leaderboard}
            pipelineId={pipeline.id}
          />
        </div>
      </div>
    </div>
  );
};
