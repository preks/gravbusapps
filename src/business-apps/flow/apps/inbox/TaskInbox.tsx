import React, { useState, useEffect } from 'react';
import { Select, Card, List, Button, Badge, Tag, Spin, Alert, Modal, Typography, Space, Divider, Form, Input, InputNumber, DatePicker, Radio, Checkbox, Upload } from 'antd';
import { 
  UserOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  OrderedListOutlined,
  EyeOutlined,
  FileOutlined,
  PictureOutlined,
  LinkOutlined,
  UploadOutlined,
  EditOutlined,
  CalendarOutlined,
  NumberOutlined,
  UnorderedListOutlined,
  CheckSquareOutlined,
  ReloadOutlined,
  SwapOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { env } from '@/common/env/EnvUtils';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface TaskInboxProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

interface Task {
  taskId: string;
  title: string;
  description: string;
  status: string;
  taskType: string;
  priority: number;
  assignedTo?: string;
  assignedToName?: string;
  templateTitle?: string;
  stepTitle?: string;
  stepType?: string; // APPROVAL, ACKNOWLEDGE, TASK, INFORMATION
  inputs?: any[];
  canClaim?: boolean;
  canComplete?: boolean;
  canRelease?: boolean;
  canReassign?: boolean;
  workflowInstanceId?: string;
  updateTime?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

interface TaskStats {
  userId: string;
  userName: string;
  inProgress: number;
  scheduled: number;
  completed: number;
  claimable: number;
  total: number;
}

// Mock users for testing - cross-functional organization matching backend exactly
const mockUsers: User[] = [
  { id: 'user-001', name: 'Alice Johnson', email: 'alice.johnson@newwork.com', department: 'Human Resources', role: 'HR Manager' },
  { id: 'user-002', name: 'Bob Smith', email: 'bob.smith@newwork.com', department: 'Finance', role: 'Finance Manager' },
  { id: 'user-007', name: 'Grace Lee', email: 'grace.lee@newwork.com', department: 'Engineering', role: 'Senior Software Engineer' },
  { id: 'user-008', name: 'Henry Taylor', email: 'henry.taylor@newwork.com', department: 'Sales', role: 'Sales Manager' },
  { id: 'user-009', name: 'Ivy Chen', email: 'ivy.chen@newwork.com', department: 'Marketing', role: 'Marketing Manager' }
];

const TaskInbox: React.FC<TaskInboxProps> = ({ prefixDataTestId = 'TaskInbox' }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('user-001');
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [claimableTasks, setClaimableTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [taskFormData, setTaskFormData] = useState<any>({});
  const [form] = Form.useForm();

  const API_BASE = (env('NEXT_PUBLIC_BUSINESS_FLOWS_API_URL') || 'http://localhost:3000') + '/api';

  // Fetch tasks and stats for selected user
  const fetchUserData = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const [assignedResponse, claimableResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE}/tasks/user/${userId}`),
        fetch(`${API_BASE}/tasks/claimable?userId=${userId}`),
        fetch(`${API_BASE}/tasks/user/${userId}/stats`)
      ]);

      if (assignedResponse.ok) {
        const assignedData = await assignedResponse.json();
        setAssignedTasks(assignedData.data || []);
      }

      if (claimableResponse.ok) {
        const claimableData = await claimableResponse.json();
        setClaimableTasks(claimableData.data || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setTaskStats(statsData.data);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      fetchUserData(selectedUserId);
    }
  }, [selectedUserId]);

  const handleTaskClick = (task: Task) => {
    // Map stepType from inputData if available, or fallback to flowType
    const enhancedTask = {
      ...task,
      stepType: (task as any).inputData?.stepType || 
               task.stepType || 
               (task as any).inputData?.flowType || 
               (task as any).inputData?.flowData?.flowType
    };
    
    setSelectedTask(enhancedTask);
    setIsTaskModalVisible(true);
    
    // Initialize form data for input blocks
    const initialFormData: any = {};
    enhancedTask.inputs?.forEach((block: any) => {
      initialFormData[block.id] = block.type === 'checkbox' ? [] : '';
    });
    setTaskFormData(initialFormData);
    form.setFieldsValue(initialFormData);
  };

  const handleClaimTask = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId })
      });

      if (response.ok) {
        // Refresh tasks after claiming
        await fetchUserData(selectedUserId);
        setIsTaskModalVisible(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to claim task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim task');
    }
  };

  const handleReleaseTask = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId })
      });

      if (response.ok) {
        // Refresh tasks after releasing
        await fetchUserData(selectedUserId);
        setIsTaskModalVisible(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to release task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release task');
    }
  };

  const handleCompleteTask = async (taskId: string, action: string = 'completed') => {
    try {
      // Validate form if there are input blocks
      if (selectedTask?.inputs && selectedTask.inputs.length > 0) {
        await form.validateFields();
      }

      const response = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          outputData: {
            result: action,
            formData: taskFormData,
            completedAt: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        // Refresh tasks after completing
        await fetchUserData(selectedUserId);
        setIsTaskModalVisible(false);
        setTaskFormData({});
        form.resetFields();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to complete task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'processing';
      case 'SCHEDULED': return 'default';
      case 'COMPLETED': return 'success';
      case 'FAILED': return 'error';
      default: return 'default';
    }
  };

  const getTaskTypeIcon = (task: Task) => {
    // First check step type for more specific icons
    if (task.stepType) {
      switch (task.stepType) {
        case 'APPROVAL': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        case 'ACKNOWLEDGE': return <EyeOutlined style={{ color: '#1890ff' }} />;
        case 'TASK': return <OrderedListOutlined style={{ color: '#722ed1' }} />;
        case 'INFORMATION': return <InfoCircleOutlined style={{ color: '#faad14' }} />;
        default: break;
      }
    }
    
    // Fall back to task type
    switch (task.taskType) {
      case 'HUMAN': return <UserOutlined style={{ color: '#1890ff' }} />;
      case 'CLAIM': return <ExclamationCircleOutlined style={{ color: '#fa541c' }} />;
      default: return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getFlowStepTypeColor = (stepType: string) => {
    switch (stepType) {
      case 'APPROVAL': return 'green';
      case 'ACKNOWLEDGE': return 'blue';
      case 'TASK': return 'purple';
      case 'INFORMATION': return 'orange';
      default: return 'default';
    }
  };

  const getInputBlockIcon = (type: string) => {
    switch (type) {
      case 'text': return <EditOutlined />;
      case 'textarea': return <FileTextOutlined />;
      case 'number': return <NumberOutlined />;
      case 'dropdown': return <UnorderedListOutlined />;
      case 'radio': return <CheckCircleOutlined />;
      case 'checkbox': return <CheckSquareOutlined />;
      case 'datetime': return <CalendarOutlined />;
      case 'file': return <UploadOutlined />;
      case 'signature': return <EditOutlined />;
      default: return <EditOutlined />;
    }
  };

  const renderInputBlock = (block: any, index: number) => {
    const commonProps = {
      value: taskFormData[block.id],
      onChange: (value: any) => {
        const newFormData = { ...taskFormData, [block.id]: value };
        setTaskFormData(newFormData);
        form.setFieldValue(block.id, value);
      }
    };

    const renderInputField = () => {
      switch (block.type) {
        case 'text':
          return (
            <Input 
              {...commonProps}
              placeholder={block.placeholder || 'Enter text'}
              onChange={(e) => commonProps.onChange(e.target.value)}
            />
          );
        case 'textarea':
          return (
            <TextArea 
              {...commonProps}
              placeholder={block.placeholder || 'Enter text'}
              rows={3}
              onChange={(e) => commonProps.onChange(e.target.value)}
            />
          );
        case 'number':
          return (
            <InputNumber 
              {...commonProps}
              placeholder={block.placeholder || 'Enter number'}
              style={{ width: '100%' }}
            />
          );
        case 'dropdown':
          return (
            <Select 
              {...commonProps}
              placeholder={block.placeholder || 'Select option'}
              style={{ width: '100%' }}
            >
              {block.options?.map((option: any) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          );
        case 'radio':
          return (
            <Radio.Group 
              {...commonProps}
            >
              {block.options?.map((option: any) => (
                <Radio key={option.value} value={option.value}>
                  {option.label}
                </Radio>
              ))}
            </Radio.Group>
          );
        case 'checkbox':
          return (
            <Checkbox.Group 
              {...commonProps}
              options={block.options?.map((option: any) => ({
                label: option.label,
                value: option.value
              }))}
            />
          );
        case 'datetime':
          return (
            <DatePicker 
              {...commonProps}
              showTime
              placeholder={block.placeholder || 'Select date and time'}
              style={{ width: '100%' }}
            />
          );
        case 'file':
          return (
            <Upload
              beforeUpload={() => false}
              onChange={(info) => commonProps.onChange(info.fileList)}
            >
              <Button icon={<UploadOutlined />}>
                {block.placeholder || 'Click to upload'}
              </Button>
            </Upload>
          );
        default:
          return (
            <Input 
              {...commonProps}
              placeholder={block.placeholder || 'Enter value'}
              onChange={(e) => commonProps.onChange(e.target.value)}
            />
          );
      }
    };

    return (
      <Card key={index} size="small" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {getInputBlockIcon(block.type)}
          <Text strong>{block.label || `Input ${index + 1}`}</Text>
          {block.required && <Tag color="red">Required</Tag>}
        </div>
        {block.description && (
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 8 }}>
            {block.description}
          </Text>
        )}
        <Form.Item
          name={block.id}
          rules={[
            { required: block.required, message: `${block.label || 'This field'} is required` }
          ]}
          style={{ marginBottom: 0 }}
        >
          {renderInputField()}
        </Form.Item>
      </Card>
    );
  };

  const renderTaskModal = () => {
    if (!selectedTask) return null;

          const hasInputBlocks = selectedTask.inputs && selectedTask.inputs.length > 0;

    return (
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {getTaskTypeIcon(selectedTask)}
            <span>{selectedTask.title}</span>
          </div>
        }
        open={isTaskModalVisible}
        onCancel={() => {
          setIsTaskModalVisible(false);
          setTaskFormData({});
          form.resetFields();
        }}
        footer={null}
        width={800}
        data-testid={`${prefixDataTestId}-TaskModal`}
      >
        <Form form={form} layout="vertical">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Task Header */}
            <div>
              <Space wrap>
                <Tag color={getTaskStatusColor(selectedTask.status)}>{selectedTask.status}</Tag>
                <Tag color="blue">{selectedTask.taskType}</Tag>
                {selectedTask.stepType && (
                  <Tag color={getFlowStepTypeColor(selectedTask.stepType)}>
                    {selectedTask.stepType}
                  </Tag>
                )}
                {selectedTask.templateTitle && <Tag color="purple">{selectedTask.templateTitle}</Tag>}
              </Space>
            </div>

            {/* Task Description */}
            <div>
              <Title level={5}>Description</Title>
              <Paragraph>{selectedTask.description}</Paragraph>
            </div>

            {/* Input Blocks */}
            {hasInputBlocks && (
              <div>
                <Title level={5}>Required Input</Title>
                {selectedTask.inputs!.map((block: any, index: number) => renderInputBlock(block, index))}
              </div>
            )}

            <Divider />

            {/* Task Actions */}
            <div>
              <Title level={5}>Actions</Title>
              <Space wrap>
                {selectedTask.canClaim && (
                  <Button 
                    type="primary" 
                    icon={<ExclamationCircleOutlined />}
                    onClick={() => handleClaimTask(selectedTask.taskId)}
                    data-testid={`${prefixDataTestId}-ClaimButton`}
                  >
                    Claim Task
                  </Button>
                )}
                
                {/* Step-type specific actions */}
                {selectedTask.canComplete && selectedTask.stepType === 'APPROVAL' && (
                  <>
                    <Button 
                      type="primary" 
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleCompleteTask(selectedTask.taskId, 'approved')}
                      data-testid={`${prefixDataTestId}-ApproveButton`}
                      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                    >
                      Approve
                    </Button>
                    <Button 
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => handleCompleteTask(selectedTask.taskId, 'rejected')}
                      data-testid={`${prefixDataTestId}-RejectButton`}
                    >
                      Reject
                    </Button>
                  </>
                )}
                
                {selectedTask.canComplete && selectedTask.stepType === 'ACKNOWLEDGE' && (
                  <Button 
                    type="primary" 
                    icon={<EyeOutlined />}
                    onClick={() => handleCompleteTask(selectedTask.taskId, 'acknowledged')}
                    data-testid={`${prefixDataTestId}-AcknowledgeButton`}
                    style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                  >
                    Acknowledge
                  </Button>
                )}
                
                {selectedTask.canComplete && selectedTask.stepType === 'TASK' && (
                  <Button 
                    type="primary" 
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleCompleteTask(selectedTask.taskId, 'completed')}
                    data-testid={`${prefixDataTestId}-CompleteButton`}
                    style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                  >
                    Complete
                  </Button>
                )}
                
                {selectedTask.canComplete && selectedTask.stepType === 'INFORMATION' && (
                  <Button 
                    type="primary" 
                    icon={<InfoCircleOutlined />}
                    onClick={() => handleCompleteTask(selectedTask.taskId, 'reviewed')}
                    data-testid={`${prefixDataTestId}-CloseButton`}
                    style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
                  >
                    Close
                  </Button>
                )}
                
                {/* Generic complete for tasks without specific step types */}
                {selectedTask.canComplete && !selectedTask.stepType && (
                  <Button 
                    type="primary" 
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleCompleteTask(selectedTask.taskId, 'completed')}
                    data-testid={`${prefixDataTestId}-CompleteButton`}
                  >
                    Complete Task
                  </Button>
                )}
                
                {selectedTask.canRelease && (
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={() => handleReleaseTask(selectedTask.taskId)}
                    data-testid={`${prefixDataTestId}-ReleaseButton`}
                  >
                    Release Task
                  </Button>
                )}
                {selectedTask.canReassign && (
                  <Button 
                    icon={<SwapOutlined />}
                    data-testid={`${prefixDataTestId}-ReassignButton`}
                  >
                    Reassign Task
                  </Button>
                )}
                
                {/* Cancel/Close button - only show if not INFORMATION type (which has its own Close) */}
                {selectedTask.stepType !== 'INFORMATION' && (
                  <Button onClick={() => {
                    setIsTaskModalVisible(false);
                    setTaskFormData({});
                    form.resetFields();
                  }}>
                    Cancel
                  </Button>
                )}
              </Space>
            </div>

            {/* Task Details */}
            <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Task ID: {selectedTask.taskId} | 
                Workflow: {selectedTask.workflowInstanceId} | 
                Priority: {selectedTask.priority} |
                Updated: {selectedTask.updateTime ? new Date(selectedTask.updateTime).toLocaleString() : 'Unknown'}
              </Text>
            </div>
          </Space>
        </Form>
      </Modal>
    );
  };

  const renderTaskListItem = (task: Task) => {
          const hasInputBlocks = task.inputs && task.inputs.length > 0;
    
    // Get stepType from inputData if available, or fallback to flowType
    const stepType = (task as any).inputData?.stepType || 
                    task.stepType || 
                    (task as any).inputData?.flowType || 
                    (task as any).inputData?.flowData?.flowType;
    
    // Enhanced task for icon display
    const enhancedTask = { ...task, stepType };

    return (
      <List.Item.Meta
        avatar={getTaskTypeIcon(enhancedTask)}
        title={
          <Space wrap>
            <span>{task.title}</span>
            <Tag color={getTaskStatusColor(task.status)}>
              {task.status}
            </Tag>
            {stepType && (
              <Tag color={getFlowStepTypeColor(stepType)}>
                {stepType}
              </Tag>
            )}
            {task.templateTitle && (
              <Tag color="purple">{task.templateTitle}</Tag>
            )}
            {hasInputBlocks && (
              <Tag color="orange">
                {task.inputs!.length} Input
              </Tag>
            )}
          </Space>
        }
        description={
          <div>
            <div>{task.description}</div>
            {task.stepTitle && task.stepTitle !== task.title && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Step: {task.stepTitle}
              </Text>
            )}
          </div>
        }
      />
    );
  };

  return (
    <div 
      data-testid={prefixDataTestId}
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
          Task Inbox
        </Title>
        <Text type="secondary">Manage your assigned and claimable tasks</Text>
      </div>

      {/* User Selection */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Text strong>Select User:</Text>
          <Select
            value={selectedUserId}
            onChange={setSelectedUserId}
            style={{ width: 400 }}
            data-testid={`${prefixDataTestId}-UserSelect`}
          >
            {mockUsers.map(user => (
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
          <Button 
            onClick={() => fetchUserData(selectedUserId)} 
            loading={loading}
            data-testid={`${prefixDataTestId}-RefreshButton`}
          >
            Refresh
          </Button>
        </div>
      </Card>

      {/* Task Statistics */}
      {taskStats && (
        <Card style={{ marginBottom: '16px' }}>
          <Title level={5}>Task Statistics for {taskStats.userName}</Title>
          <Space size="large">
            <div>
              <Badge count={taskStats.inProgress} color="blue">
                <Tag color="blue">In Progress</Tag>
              </Badge>
            </div>
            <div>
              <Badge count={taskStats.scheduled} color="orange">
                <Tag color="orange">Scheduled</Tag>
              </Badge>
            </div>
            <div>
              <Badge count={taskStats.completed} color="green">
                <Tag color="green">Completed</Tag>
              </Badge>
            </div>
            <div>
              <Badge count={taskStats.claimable} color="purple">
                <Tag color="purple">Claimable</Tag>
              </Badge>
            </div>
            <div>
              <Text strong>Total: {taskStats.total}</Text>
            </div>
          </Space>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>Loading tasks...</Text>
          </div>
        </div>
      )}

      {/* Tasks Display */}
      {!loading && (
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Assigned Tasks */}
          <Card 
            title={`Assigned Tasks (${assignedTasks.length})`} 
            style={{ flex: 1 }}
            extra={<UserOutlined />}
          >
            <List
              dataSource={assignedTasks}
              renderItem={(task) => (
                <List.Item
                  actions={[
                    <Button 
                      type="link" 
                      onClick={() => handleTaskClick(task)}
                      data-testid={`${prefixDataTestId}-ViewTask-${task.taskId}`}
                    >
                      View
                    </Button>
                  ]}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleTaskClick(task)}
                >
                  {renderTaskListItem(task)}
                </List.Item>
              )}
              locale={{ emptyText: 'No assigned tasks' }}
            />
          </Card>

          {/* Claimable Tasks */}
          <Card 
            title={`Claimable Tasks (${claimableTasks.length})`} 
            style={{ flex: 1 }}
            extra={<ExclamationCircleOutlined />}
          >
            <List
              dataSource={claimableTasks}
              renderItem={(task) => (
                <List.Item
                  actions={[
                    <Button 
                      type="link" 
                      onClick={() => handleTaskClick(task)}
                      data-testid={`${prefixDataTestId}-ViewClaimableTask-${task.taskId}`}
                    >
                      View
                    </Button>
                  ]}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleTaskClick(task)}
                >
                  {renderTaskListItem(task)}
                </List.Item>
              )}
              locale={{ emptyText: 'No claimable tasks' }}
            />
          </Card>
        </div>
      )}

      {/* Task Detail Modal */}
      {renderTaskModal()}
    </div>
  );
};

export default TaskInbox; 