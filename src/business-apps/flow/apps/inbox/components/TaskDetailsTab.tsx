import React from 'react';
import { Space, Tag, Typography, Form, Button } from 'antd';
import { UserAddOutlined, SwapOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { InputRenderer } from '../../creator/components/shared/InputRenderer';
import { LinksRenderer } from '../../creator/components/shared/LinksRenderer';

const { Text, Paragraph, Title } = Typography;

interface Task {
  id: string;
  flowId: string;
  status: string;
  message?: string;
  dueDate?: string;
  scheduledAt?: string;
  assignment?: {
    assignedTo?: string;
    currentStatus?: string;
    assignmentMode?: string;
  };
  workflowMeta?: {
    rootWorkflowId: string;
  };
  links?: any[];
  inputs?: any[];
  availableActions?: {
    canComplete?: boolean;
    canClaim?: boolean;
    canRelease?: boolean;
    canReassign?: boolean;
    canReject?: boolean;
  };
}

interface TaskDetailsTabProps extends BusinessAppContextProps {
  task: Task;
  stepType?: string;
  hasLinks: boolean;
  hasInputBlocks: boolean;
  taskFormData: any;
  reassignUserId: string;
  rejectionComment: string;
  form: any;
  actionLoading: string | null;
  prefixDataTestId: string;
  onComplete: () => void;
  onClaim: () => void;
  onRelease: () => void;
  onReassign: () => void;
  onReject: () => void;
  setReassignUserId: (value: string) => void;
  setRejectionComment: (value: string) => void;
  getTaskStatusColor: (status: string) => string;
  getStepTypeColor: (stepType: string) => string;
  getAssignmentStatusColor: (status: string) => string;
  getDueDateTag: (task: Task) => React.ReactNode;
  isTaskOverdue: (dueDate?: string) => boolean;
  isTaskDueSoon: (dueDate?: string) => boolean;
  formatDueDate: (dueDate: string) => string;
  isJustClaimable: (task: Task) => boolean;
}

export const TaskDetailsTab: React.FC<TaskDetailsTabProps> = ({
  task,
  stepType,
  hasLinks,
  hasInputBlocks,
  taskFormData,
  reassignUserId,
  rejectionComment,
  form,
  actionLoading,
  prefixDataTestId,
  onComplete,
  onClaim,
  onRelease,
  onReassign,
  onReject,
  setReassignUserId,
  setRejectionComment,
  getTaskStatusColor,
  getStepTypeColor,
  getAssignmentStatusColor,
  getDueDateTag,
  isTaskOverdue,
  isTaskDueSoon,
  formatDueDate,
  isJustClaimable,
  ...context
}) => {
  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Tag color={getTaskStatusColor(task.status)}>
            {task.status}
          </Tag>
          {stepType && (
            <Tag color={getStepTypeColor(stepType)}>
              {stepType}
            </Tag>
          )}
          {task.assignment?.currentStatus && (
            <Tag color={getAssignmentStatusColor(task.assignment.currentStatus)}>
              {task.assignment.currentStatus}
            </Tag>
          )}
          {task.assignment?.assignmentMode && (
            <Tag color="cyan">
              {task.assignment.assignmentMode} Mode
            </Tag>
          )}
          
          {/* Due Date Tag in Modal */}
          {getDueDateTag(task)}
        </Space>
      </div>

      {task.message && (
        <div style={{ marginBottom: '16px' }}>
          <Paragraph>{task.message}</Paragraph>
        </div>
      )}

      {/* Task Assignment Info */}
      {task.assignment?.assignedTo && (
        <div style={{ marginBottom: '16px' }}>
          <Text strong>Assigned to: </Text>
          <Text>{task.assignment.assignedTo}</Text>
        </div>
      )}

      {/* Due Date Information */}
      {(task.dueDate || task.scheduledAt) && (
        <div style={{ marginBottom: '16px' }}>
          {task.dueDate && (
            <div style={{ marginBottom: '8px' }}>
              <Text strong>Due Date: </Text>
              <Text style={{ 
                color: isTaskOverdue(task.dueDate) ? '#ff4d4f' : 
                       isTaskDueSoon(task.dueDate) ? '#faad14' : '#262626'
              }}>
                {formatDueDate(task.dueDate)}
              </Text>
              {isTaskOverdue(task.dueDate) && (
                <Text type="danger" style={{ marginLeft: '8px' }}>
                  ⚠️ This task is overdue
                </Text>
              )}
            </div>
          )}
          {task.scheduledAt && (
            <div>
              <Text strong>Scheduled at: </Text>
              <Text type="secondary">
                {new Date(task.scheduledAt).toLocaleString()}
              </Text>
            </div>
          )}
        </div>
      )}

      {/* Links Section */}
      {hasLinks && (
        <div style={{ marginBottom: '16px' }}>
          <Title level={5}>Attachments</Title>
          <LinksRenderer links={task.links!} />
        </div>
      )}

      {/* Input Form Section */}
      {hasInputBlocks && !isJustClaimable(task) && (
        <div style={{ marginBottom: '16px' }}>
          <Title level={5}>Form Fields</Title>
          <Form
            form={form}
            layout="vertical"
            onValuesChange={(changedValues, allValues) => {
              // Handle form changes
            }}
          >
            {task.inputs!.map((input: any, index: number) => (
              <InputRenderer 
                key={index}
                input={input}
                value={taskFormData[input.id]}
                onChange={(value) => {
                  // Handle input changes
                }}
              />
            ))}
          </Form>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {task.availableActions?.canComplete && (
          <Button
            type="primary"
            loading={actionLoading === task.id + 'COMPLETE'}
            onClick={onComplete}
            data-testid={`${prefixDataTestId}-complete-button`}
          >
            Complete Task
          </Button>
        )}
        
        {task.availableActions?.canClaim && (
          <Button
            type="default"
            icon={<UserAddOutlined />}
            loading={actionLoading === task.id + 'CLAIM'}
            onClick={onClaim}
            data-testid={`${prefixDataTestId}-claim-button`}
          >
            Claim
          </Button>
        )}
        
        {task.availableActions?.canRelease && (
          <Button
            type="default"
            loading={actionLoading === task.id + 'RELEASE'}
            onClick={onRelease}
            data-testid={`${prefixDataTestId}-release-button`}
          >
            Release
          </Button>
        )}
        
        {task.availableActions?.canReassign && (
          <Button
            type="default"
            icon={<SwapOutlined />}
            loading={actionLoading === task.id + 'REASSIGN'}
            onClick={onReassign}
            data-testid={`${prefixDataTestId}-reassign-button`}
          >
            Reassign
          </Button>
        )}
        
        {task.availableActions?.canReject && (
          <Button
            danger
            icon={<CloseCircleOutlined />}
            loading={actionLoading === task.id + 'REJECT'}
            onClick={onReject}
            data-testid={`${prefixDataTestId}-reject-button`}
          >
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}; 