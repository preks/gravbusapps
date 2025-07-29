import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { LayoutDashboard, Activity } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PipelineInfo, DateRange } from '../types/dashboardTypes';
import { PipelineSection } from './PipelineSection';

export interface PipelineDetailsTabProps extends BusinessAppContextProps {
  pipelines: PipelineInfo[];
  dateRange: DateRange;
}

export const PipelineDetailsTab: React.FC<PipelineDetailsTabProps> = ({
  pipelines,
  dateRange,
  ...context
}) => {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(
    pipelines.length > 0 ? pipelines[0].id : ''
  );

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
  };

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);

  if (pipelines.length === 0) {
    return (
      <div className="gba:p-6">
        <Card className="gba:h-full">
          <CardHeader>
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
                <LayoutDashboard className="gba:h-6 gba:w-6 gba:text-blue-600" />
              </div>
              <div>
                <CardTitle>Pipeline Dashboard</CardTitle>
                <p className="gba:text-sm gba:text-gray-600">No sales pipelines configured</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="gba:p-6">
            <div 
              data-testid="pipeline-details-empty"
              className="gba:text-center gba:py-16 gba:px-6"
            >
              <div className="gba:w-20 gba:h-20 gba:mx-auto gba:bg-gray-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-6">
                <Activity className="gba:h-8 gba:w-8 gba:text-gray-400" />
              </div>
              <div className="gba:text-gray-900 gba:text-xl gba:font-semibold gba:mb-2">
                No sales pipelines found
              </div>
              <div className="gba:text-gray-500 gba:text-base gba:max-w-md gba:mx-auto">
                Configure your sales pipelines to see comprehensive dashboard analytics and insights
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="gba:p-6" data-testid="pipeline-details-tab">
      {/* Selected Pipeline Details */}
      {selectedPipeline ? (
        <div data-testid={`pipeline-details-${selectedPipeline.id}`}>
          <PipelineSection
            pipeline={selectedPipeline}
            dateRange={dateRange}
            pipelines={pipelines}
            selectedPipelineId={selectedPipelineId}
            onPipelineChange={handlePipelineChange}
            {...context}
          />
        </div>
      ) : (
        <Card className="gba:h-full">
          <CardHeader>
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
                <LayoutDashboard className="gba:h-6 gba:w-6 gba:text-blue-600" />
              </div>
              <div>
                <CardTitle>Select Pipeline</CardTitle>
                <p className="gba:text-sm gba:text-gray-600">Choose a pipeline to view details</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="gba:p-6">
            <div className="gba:py-16 gba:text-center">
              <div className="gba:text-gray-600 gba:mb-4">
                Please select a pipeline to view details
              </div>
              <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                <SelectTrigger className="gba:w-64 gba:mx-auto">
                  <SelectValue placeholder="Select a pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 