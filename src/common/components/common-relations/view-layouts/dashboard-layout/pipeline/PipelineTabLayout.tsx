import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';

export interface PipelineTabLayoutProps {
  headerLeft: React.ReactNode;                 // Optional header content (e.g., icon/title) if needed
  metrics: React.ReactNode;                    // PipelineStatistics
  leftTop: React.ReactNode;                    // OpportunityFunnel
  leftBottom: React.ReactNode;                 // ConversionPerformance
  rightTop: React.ReactNode;                   // ActivityVolume
  rightBottom: React.ReactNode;                // PerformanceLeaderboard

  // Pipeline selector ownership here
  pipelines?: Array<{ id: string; name: string }>;
  selectedPipelineId?: string;
  onPipelineChange?: (pipelineId: string) => void;
  pipelineHeaderBadges?: { label: string; variant?: 'default' | 'secondary' | 'outline' }[];
  pipelineTitle?: string;
  pipelineDescription?: string;
}

export const PipelineTabLayout: React.FC<PipelineTabLayoutProps> = ({
  headerLeft,
  metrics,
  leftTop,
  leftBottom,
  rightTop,
  rightBottom,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  pipelineHeaderBadges,
  pipelineTitle,
  pipelineDescription,
}) => {
  return (
    <div className="gba:space-y-6">
      {/* Pipeline Header */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:flex-col lg:gba:flex-row gba:justify-between gba:items-start lg:gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-4">
              {headerLeft}
              <div className="gba:flex gba:items-center gba:gap-3">
                <div>
                  <CardTitle className="gba:text-gray-900">
                    {pipelineTitle}
                  </CardTitle>
                  {pipelineDescription && (
                    <p className="gba:text-gray-600 gba:text-sm gba:mt-1">
                      {pipelineDescription}
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
            {pipelineHeaderBadges && pipelineHeaderBadges.length > 0 && (
              <div className="gba:flex gba:flex-wrap gba:gap-3 gba:items-center">
                {pipelineHeaderBadges.map((b, idx) => (
                  <Badge key={idx} variant={b.variant || 'secondary'} className="gba:px-3 gba:py-1">
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* KPI Overview Grid */}
      {metrics}

      {/* Main Components Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-6">
        {/* Left Column */}
        <div className="gba:space-y-6">
          {leftTop}
          {leftBottom}
        </div>

        {/* Right Column */}
        <div className="gba:space-y-6">
          {rightTop}
          {rightBottom}
        </div>
      </div>
    </div>
  );
};

export default PipelineTabLayout;
