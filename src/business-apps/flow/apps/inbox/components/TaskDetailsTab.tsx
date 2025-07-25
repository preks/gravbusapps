import React, { useState } from 'react';
import { Space, Tag, Typography, Form, Button, Switch, Input, Select } from 'antd';
import { 
  UserAddOutlined, 
  SwapOutlined, 
  CloseCircleOutlined, 
  CheckCircleOutlined,
  EyeOutlined,
  LikeOutlined,
  MessageOutlined,
  UserOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { InputRenderer } from '../../creator/components/shared/InputRenderer';
import { LinksRenderer } from '../../creator/components/shared/LinksRenderer';
import { mockUsers, type User as MockUser } from '../../../data/mockUsers';

const { Text, Paragraph, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

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
    canUnclaim?: boolean;
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
  setTaskFormData: (data: any) => void;
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
  setTaskFormData,
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
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [showReassignUI, setShowReassignUI] = useState(false);

  // Update parent comment state when local comment changes
  React.useEffect(() => {
    setRejectionComment(comment);
  }, [comment, setRejectionComment]);

  // Use the same mock users as the main TaskInbox component
  const availableUsers = mockUsers;

  return (
    <div>
      {/* Task Info Header */}
      <div style={{ marginBottom: '16px' }}>
        <Space wrap>
          {stepType && (
            <Tag 
              color={getStepTypeColor(stepType)} 
              style={{ fontSize: '14px', padding: '4px 12px', fontWeight: 'bold' }}
            >
              {stepType.toUpperCase()}
            </Tag>
          )}
          {task.assignment?.assignedTo && (
            <Tag color="blue">
              Assigned to: {task.assignment.assignedTo}
            </Tag>
          )}
          
          {/* Due Date and Scheduled Time */}
          {task.dueDate && (
            <Tag color={isTaskOverdue(task.dueDate) ? 'red' : isTaskDueSoon(task.dueDate) ? 'orange' : 'green'}>
              Due: {new Date(task.dueDate).toLocaleDateString()} {new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Tag>
          )}
          {task.scheduledAt && (
            <Tag color="purple">
              Scheduled: {new Date(task.scheduledAt).toLocaleDateString()} {new Date(task.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Tag>
          )}
        </Space>
      </div>

      {/* Task Message/Description */}
      {task.message && (
        <div style={{ marginBottom: '16px' }}>
          <Title level={5}>Description</Title>
          <Paragraph>{task.message}</Paragraph>
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
              setTaskFormData(allValues);
            }}
          >
            {task.inputs!.map((input: any, index: number) => (
              <InputRenderer 
                key={index}
                input={input}
                index={index}
              />
            ))}
          </Form>
        </div>
      )}

      {/* Comment Field */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <MessageOutlined />
          <Text>Add Comment (Optional)</Text>
          <Switch
            checked={showComment}
            onChange={(checked) => {
              setShowComment(checked);
              if (!checked) {
                setComment('');
              }
            }}
            size="small"
          />
        </div>
        {showComment && (
          <TextArea
            rows={3}
            placeholder={
              stepType === 'APPROVAL' 
                ? "Add approval comment or rejection reason..." 
                : "Add comment about this action..."
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            showCount
            style={{ marginBottom: '8px' }}
          />
        )}
      </div>

      {/* Reassignment UI */}
      {task.availableActions?.canReassign && showReassignUI && (
        <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px', backgroundColor: '#fafafa' }}>
          <div style={{ marginBottom: '12px' }}>
            <Text strong>Reassign Task</Text>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <Text>Select a user to reassign this task to:</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="Select user to reassign to..."
              value={reassignUserId}
              onChange={(value) => setReassignUserId(value)}
              allowClear
            >
              {availableUsers.map((user: MockUser) => (
                <Option key={user.id} value={user.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserOutlined />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 'bold' }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {user.role} • {user.department}
                      </div>
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="primary"
              size="small"
              disabled={!reassignUserId}
              loading={actionLoading === task.id + 'REASSIGN'}
              onClick={() => {
                onReassign();
                setShowReassignUI(false);
              }}
            >
              Reassign to User
            </Button>
            <Button
              type="default"
              size="small"
              loading={actionLoading === task.id + 'REASSIGN'}
              onClick={() => {
                setReassignUserId(''); // Clear user to release back to pool
                onReassign();
                setShowReassignUI(false);
              }}
            >
              Release to Pool
            </Button>
            <Button
              size="small"
              onClick={() => {
                setShowReassignUI(false);
                setReassignUserId('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {/* Primary Complete Action - context-aware based on task type */}
        {task.availableActions?.canComplete && (
          <Button
            type="primary"
            loading={actionLoading === task.id + 'COMPLETE'}
            onClick={onComplete}
            icon={getCompleteButtonIcon(stepType)}
            data-testid={`${prefixDataTestId}-complete-button`}
          >
            {getCompleteButtonLabel(stepType)}
          </Button>
        )}
        
        {/* Reject Button - Only for APPROVAL tasks */}
        {task.availableActions?.canReject && stepType === 'APPROVAL' && (
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
        
        {/* Secondary Actions */}
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
            onClick={() => setShowReassignUI(true)}
            data-testid={`${prefixDataTestId}-reassign-button`}
          >
            Reassign
          </Button>
        )}
        
        {task.availableActions?.canUnclaim && (
          <Button
            type="default"
            icon={<CloseCircleOutlined />}
            loading={actionLoading === task.id + 'UNCLAIM'}
            onClick={onRelease}
            data-testid={`${prefixDataTestId}-unclaim-button`}
          >
            Unclaim
          </Button>
        )}
      </div>
    </div>
  );
};

// Helper functions for context-aware button labels and icons
const getCompleteButtonLabel = (stepType?: string): string => {
  switch (stepType) {
    case 'APPROVAL':
      return 'Approve';
    case 'INFORMATION':
      return 'Mark as Read';
    case 'ACKNOWLEDGE':
      return 'Acknowledge';
    case 'TASK':
    default:
      return 'Complete';
  }
};

const getCompleteButtonIcon = (stepType?: string) => {
  switch (stepType) {
    case 'APPROVAL':
      return <LikeOutlined />;
    case 'INFORMATION':
      return <EyeOutlined />;
    case 'ACKNOWLEDGE':
      return <CheckCircleOutlined />;
    case 'TASK':
    default:
      return <CheckCircleOutlined />;
  }
}; 