import React, { useState, useEffect } from 'react';
import { Card, Alert, Spin, Typography } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { FlowProgress } from '../../creator/components/shared/FlowProgress';

const { Text } = Typography;

interface Task {
  id: string;
  flowId: string;
  title?: string;
  workflowMeta?: {
    rootWorkflowId: string;
    rootWorkflowName?: string;
    templateId?: string;
  };
}

interface FlowProgressTabProps extends BusinessAppContextProps {
  task: Task;
  'data-testid'?: string;
}

// Helper function to get user-friendly workflow name
const getWorkflowDisplayName = (flowName: string, taskTitle?: string): string => {
  // If it's a technical subflow, use the task title instead
  if (flowName === 'SINGLE_USER_TASK_HANDLER_SUBFLOW' && taskTitle) {
    return `${taskTitle} - Workflow`;
  }
  
  // Convert technical names to user-friendly names
  const technicalMappings: { [key: string]: string } = {
    'SINGLE_USER_TASK_HANDLER_SUBFLOW': 'Single Task Workflow',
    'MULTI_USER_TASK_HANDLER_SUBFLOW': 'Multi-User Task Workflow',
    'ASSIGNMENT_HANDLER_SUBFLOW': 'Assignment Handler Workflow'
  };
  
  return technicalMappings[flowName] || flowName;
};

export const FlowProgressTab: React.FC<FlowProgressTabProps> = ({
  task,
  'data-testid': testId = 'flow-progress-tab',
  ...context
}) => {
  const [workflowInfo, setWorkflowInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const flowId = task.workflowMeta?.rootWorkflowId || task.flowId;

  useEffect(() => {
    const fetchWorkflowInfo = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3000/api/flow/${flowId}`);
        if (response.ok) {
          const data = await response.json();
          setWorkflowInfo(data);
        }
      } catch (error) {
        console.error('Error fetching workflow info:', error);
      } finally {
        setLoading(false);
      }
    };

    if (flowId) {
      fetchWorkflowInfo();
    }
  }, [flowId]);

  if (!flowId) {
    return (
      <Alert
        message="No Flow Data Available"
        description="Flow ID is missing and cannot display progress information."
        type="warning"
        showIcon
        data-testid={testId}
      />
    );
  }

  const displayName = workflowInfo ? getWorkflowDisplayName(workflowInfo.name, task.title) : 'Loading...';

  return (
    <div data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Main Flow Progress */}
      <Card title="Detailed Progress" size="small">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">Loading workflow progress...</Text>
            </div>
          </div>
        ) : (
          <FlowProgress
            flowId={flowId}
            showExport={true}
            refreshInterval={30000} // Auto-refresh every 30 seconds
            {...context}
          />
        )}
      </Card>
    </div>
  );
}; 