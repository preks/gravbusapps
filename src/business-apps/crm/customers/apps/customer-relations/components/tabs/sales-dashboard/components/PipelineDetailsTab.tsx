import React, { useState } from 'react';
import { Select, Card, Typography, Empty } from 'antd';
import { PieChartOutlined, DashboardOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PipelineInfo, DateRange } from '../types/dashboardTypes';
import { PipelineSection } from './PipelineSection';

const { Title } = Typography;
const { Option } = Select;

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
        <div className="gba:bg-white gba:rounded-2xl gba:shadow-lg gba:border gba:border-gray-100 gba:overflow-hidden">
          <div 
            data-testid="pipeline-details-empty"
            className="gba:text-center gba:py-16 gba:px-6"
          >
            <div className="gba:w-20 gba:h-20 gba:mx-auto gba:bg-gray-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-6">
              <DashboardOutlined className="gba:text-3xl gba:text-gray-400" />
            </div>
            <div className="gba:text-gray-900 gba:text-xl gba:font-semibold gba:mb-2">
              No sales pipelines found
            </div>
            <div className="gba:text-gray-500 gba:text-base gba:max-w-md gba:mx-auto">
              Configure your sales pipelines to see comprehensive dashboard analytics and insights
            </div>
          </div>
        </div>
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
        <div className="gba:p-6">
          <Empty
            description="Please select a pipeline to view details"
            className="gba:py-16"
          />
        </div>
      )}
    </div>
  );
}; 