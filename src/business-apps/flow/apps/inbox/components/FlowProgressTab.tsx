import React from 'react';
import { Card, Alert } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { FlowProgress } from '../../creator/components/shared/FlowProgress';
import { PreviousStepData } from '../../creator/components/shared/PreviousStepData';

interface Task {
  id: string;
  flowId: string;
  workflowMeta?: {
    rootWorkflowId: string;
  };
}

interface FlowProgressTabProps extends BusinessAppContextProps {
  task: Task;
  'data-testid'?: string;
}

export const FlowProgressTab: React.FC<FlowProgressTabProps> = ({
  task,
  'data-testid': testId = 'flow-progress-tab',
  ...context
}) => {
  const flowId = task.workflowMeta?.rootWorkflowId || task.flowId;

  if (!flowId) {
    return (
      <Alert
        message="No Flow ID Available"
        description="Cannot display flow progress without a valid flow ID."
        type="warning"
        showIcon
        data-testid={`${testId}-no-flow-id`}
      />
    );
  }

  return (
    <div data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Main Flow Progress */}
      <Card title="Workflow Progress" size="small" data-testid={`${testId}-progress-card`}>
        <FlowProgress
          flowId={flowId}
          showExport={true}
          refreshInterval={30000} // Auto-refresh every 30 seconds
          data-testid={`${testId}-progress`}
          {...context}
        />
      </Card>

      {/* Previous Step Data */}
      <Card title="Previous Step Data" size="small" data-testid={`${testId}-previous-steps-card`}>
        <PreviousStepData
          flowId={flowId}
          currentStepIndex={0} // You might want to calculate this based on task data
          data-testid={`${testId}-previous-steps`}
          {...context}
        />
      </Card>
    </div>
  );
}; 