import React, { useState, useEffect } from 'react';
import { Select, Card, List, Button, Badge, Tag, Spin, Alert, Modal, Typography, Space, Divider, Form, Input, message, Tabs } from 'antd';
import { 
  UserOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  OrderedListOutlined,
  EyeOutlined,
  ReloadOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { env } from '@/common/env/EnvUtils';
import { TaskDetailsTab, FlowProgressTab, TaskListCard, FlowHistoryTab, FlowDataTab } from './components';

const { Option } = Select;
const { Title, Text } = Typography;

interface TaskInboxProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

interface Task {
  id: string;
  flowId: string;
  referenceTaskName?: string;
  type?: string;
  name?: string;
  status: string;
  priority?: number;
  title?: string;
  message?: string;
  stepIndex?: number;
  form?: any[];  // Backend uses 'form'
  inputs?: any[];  // Legacy field for backward compatibility
  links?: any[];
  taskCategory?: string;
  dueDate?: string;
  scheduledAt?: string;
  availableActions?: {
    canClaim?: boolean;
    canComplete?: boolean;
    canReassign?: boolean;
    canReject?: boolean;
    canUnclaim?: boolean;
  };
  assignment?: {
    assignmentMode?: string;
    currentStatus?: string;
    assignedTo?: string;
    assignedAt?: string;
    isUserOwner?: boolean;
    allowReassignment?: boolean;
    targets?: any;
    assignmentHistory?: Array<{
      action: string;
      userId: string;
      changedBy: string;
      changedAt: string;
    }>;
    assignmentAction?: string;
    assignmentIteration?: number;
  };
  workflowMeta?: {
    rootWorkflowId: string;
  };
}

interface TaskStats {
  assigned: number;
  claimable: number;
  inProgress: number;
  scheduled: number;
  completed: number;
  total: number;
  overdue: number;
  dueSoon: number;
  userName?: string;
}

// Utility Functions
const formatDueDate = (dueDateISO?: string): string => {
  if (!dueDateISO) return 'No due date';
  
  try {
    const dueDate = new Date(dueDateISO);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    const dateStr = dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (diffMs < 0) {
      return `${dateStr} (overdue)`;
    } else if (diffHours < 24) {
      return `${dateStr} (${diffHours}h remaining)`;
    } else if (diffDays < 7) {
      return `${dateStr} (${diffDays}d remaining)`;
    }
    
    return dateStr;
  } catch (error) {
    return dueDateISO;
  }
};

const isTaskOverdue = (dueDateISO?: string): boolean => {
  if (!dueDateISO) return false;
  try {
    return new Date() > new Date(dueDateISO);
  } catch (error) {
    return false;
  }
};

const isTaskDueSoon = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= 2;
};

const isJustClaimable = (task: Task): boolean => {
  const actions = task.availableActions;
  if (!actions) return false;
  
  return actions.canClaim === true && 
         actions.canComplete !== true && 
         actions.canReject !== true && 
         actions.canReassign !== true && 
         actions.canUnclaim !== true;
};

const getDueDateTag = (task: Task): React.ReactNode => {
  if (!task.dueDate) return null;
  
  const overdue = isTaskOverdue(task.dueDate);
  const dueSoon = isTaskDueSoon(task.dueDate);
  
  if (overdue) {
    return (
      <Tag color="red" icon={<WarningOutlined />}>
        Overdue
      </Tag>
    );
  } else if (dueSoon) {
    return (
      <Tag color="orange" icon={<ClockCircleOutlined />}>
        Due Soon
      </Tag>
    );
  } else {
    return (
      <Tag color="blue" icon={<ClockCircleOutlined />}>
        {formatDueDate(task.dueDate)}
      </Tag>
    );
  }
};

// Import mock users data
import { mockUsers, type User as MockUser } from '../../data/mockUsers';

const TaskInbox: React.FC<TaskInboxProps> = ({ 
  prefixDataTestId = 'TaskInbox', 
  accessToken,
  ...context 
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('user-001');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [taskModalLoading, setTaskModalLoading] = useState(false);
  const [taskFormData, setTaskFormData] = useState<any>({});
  const [reassignUserId, setReassignUserId] = useState<string>('');
  const [rejectionComment, setRejectionComment] = useState<string>('');
  const [form] = Form.useForm();

  const API_BASE = (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine') + '/api';

  // Fetch tasks and stats for selected user
  const fetchUserData = async (userId: string) => {
    setLoading(true);
    setTaskModalLoading(false); // Reset task modal loading when refreshing list
    setError(null);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      };

      const [tasksResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE}/tasks/user/${userId}`, { headers }),
        fetch(`${API_BASE}/tasks/user/${userId}/stats`, { headers })
      ]);

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData.tasks || []);
      } else {
        throw new Error('Failed to fetch tasks');
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setTaskStats(statsData.statistics || statsData.data || statsData);
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

  const performTaskAction = async (taskId: string, action: string, payload: any = {}) => {
    setActionLoading(taskId + action);
    try {
      let endpoint = '';
      let body: any = { userId: selectedUserId, ...payload };

      switch (action) {
        case 'CLAIM':
          endpoint = `${API_BASE}/tasks/${taskId}/claim`;
          break;
        case 'UNCLAIM':
          endpoint = `${API_BASE}/tasks/${taskId}/unclaim`;
          break;
        case 'REASSIGN':
          endpoint = `${API_BASE}/tasks/${taskId}/reassign`;
          body = { currentUserId: selectedUserId, newUserId: reassignUserId, ...payload };
          break;
        case 'REJECT':
          endpoint = `${API_BASE}/tasks/${taskId}/reject`;
          body = { userId: selectedUserId, rejectionComment, ...payload };
          break;
        case 'COMPLETE':
          endpoint = `${API_BASE}/tasks/${taskId}/complete`;
          body = { 
            userId: selectedUserId,
            action: 'COMPLETE',
            formData: taskFormData,
            ...payload
          };
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Include comment if provided (from the comment field in TaskDetailsTab)
      if (rejectionComment && rejectionComment.trim()) {
        body.comment = rejectionComment.trim();
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (response.ok) {
        message.success(`Task ${action.toLowerCase()}ed successfully`);
        await fetchUserData(selectedUserId);
        
        if (isTaskModalVisible) {
          setIsTaskModalVisible(false);
          setTaskFormData({});
          setReassignUserId('');
          setRejectionComment('');
          form.resetFields();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action.toLowerCase()} task`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action.toLowerCase()} task`;
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch fresh task data when opening modal
  const fetchFreshTaskData = async (taskId: string): Promise<Task | null> => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      };

      const response = await fetch(`${API_BASE}/tasks/${taskId}`, { headers });
      
      if (response.ok) {
        const taskData = await response.json();
        return taskData.task || taskData;
      } else {
        console.warn(`Failed to fetch fresh task data: ${response.status}`);
        return null;
      }
    } catch (err) {
      console.error('Error fetching fresh task data:', err);
      return null;
    }
  };

  const handleTaskClick = async (task: Task) => {
    // Show modal immediately with cached data
    setSelectedTask(task);
    setIsTaskModalVisible(true);
    setTaskModalLoading(true);
    
    // Initialize form with cached data first
    const initializeFormData = (taskData: Task) => {
      const initialFormData: any = {};
      (taskData.form || taskData.inputs)?.forEach((input: any) => {
        // Initialize different input types with appropriate default values
        switch (input.type) {
          case 'CHECKBOX':
            initialFormData[input.name] = input.options && input.options.length > 0 ? [] : false;
            break;
          case 'MULTISELECT':
            initialFormData[input.name] = [];
            break;
          case 'SELECT':
            initialFormData[input.name] = '';
            break;
          case 'NUMBER':
            initialFormData[input.name] = undefined;
            break;
          case 'DATE':
            initialFormData[input.name] = null;
            break;
          case 'DATETIME':
            initialFormData[input.name] = null;
            break;
          default:
            initialFormData[input.name] = '';
        }
      });
      setTaskFormData(initialFormData);
      form.setFieldsValue(initialFormData);
    };

    // Initialize with cached data
    initializeFormData(task);

    // Fetch fresh task data
    try {
      const freshTaskData = await fetchFreshTaskData(task.id);
      if (freshTaskData) {
        // Update with fresh data
        setSelectedTask(freshTaskData);
        initializeFormData(freshTaskData);
        console.log('Refreshed task data:', freshTaskData.id);
      }
    } catch (err) {
      console.warn('Using cached task data due to fetch error:', err);
    } finally {
      setTaskModalLoading(false);
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
    switch (task.type) {
      case 'APPROVAL': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'ACKNOWLEDGE': return <EyeOutlined style={{ color: '#1890ff' }} />;
      case 'TASK': return <OrderedListOutlined style={{ color: '#722ed1' }} />;
      case 'INFORMATION': return <InfoCircleOutlined style={{ color: '#faad14' }} />;
      default: return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getStepTypeColor = (stepType: string) => {
    switch (stepType) {
      case 'APPROVAL': return 'green';
      case 'ACKNOWLEDGE': return 'blue';
      case 'TASK': return 'purple';
      case 'INFORMATION': return 'orange';
      default: return 'default';
    }
  };

  const getAssignmentStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'blue';
      case 'claimed': return 'green';
      case 'claimable': return 'orange';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const handleQuickClaim = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    await performTaskAction(taskId, 'CLAIM');
  };

  // Task handlers for component callbacks
  const taskHandlers = {
    onComplete: () => performTaskAction(selectedTask!.id, 'COMPLETE'),
    onClaim: () => performTaskAction(selectedTask!.id, 'CLAIM'),
    onRelease: () => performTaskAction(selectedTask!.id, 'UNCLAIM'),
    onReassign: () => performTaskAction(selectedTask!.id, 'REASSIGN'),
    onReject: () => performTaskAction(selectedTask!.id, 'REJECT'),
    setReassignUserId,
    setRejectionComment,
  };

  // Filter and sort tasks - Backend handles filtering, frontend just separates by type
  const assignedTasks = tasks.filter((task: any) => 
    task.assignment?.assignedTo === selectedUserId
  );
  
  const claimableTasks = tasks.filter((task: any) => 
    task.availableActions?.canClaim === true
  );

  // Sort assigned tasks by due date
  const sortedAssignedTasks = [...assignedTasks].sort((a: any, b: any) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Sort claimable tasks by due date  
  const sortedClaimableTasks = [...claimableTasks].sort((a: any, b: any) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

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
        <Text type="secondary">Manage your assigned and claimable tasks from the custom flow engine</Text>
      </div>

      {/* User Selection */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Text strong>Select User:</Text>
          <Select
            value={selectedUserId}
            onChange={setSelectedUserId}
            style={{ width: 400 }}
            optionLabelProp="label"
            listHeight={300}
            data-testid={`${prefixDataTestId}-UserSelect`}
          >
            {mockUsers.map((user: MockUser) => (
              <Option key={user.id} value={user.id} label={user.name}>
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
            icon={<ReloadOutlined />}
            data-testid={`${prefixDataTestId}-RefreshButton`}
          >
            Refresh
          </Button>
        </div>
      </Card>

      {/* Task Statistics */}
      {/* Temporarily disabled - Task Statistics section */}
      {/*
      {taskStats && (
        <Card style={{ marginBottom: '16px' }}>
          <Title level={5}>Task Statistics for {taskStats.userName || mockUsers.find(u => u.id === selectedUserId)?.name}</Title>
          <Space size="large">
            <div><Badge count={taskStats.assigned || 0} color="blue"><Tag color="blue">Assigned</Tag></Badge></div>
            <div><Badge count={taskStats.claimable || 0} color="orange"><Tag color="orange">Claimable</Tag></Badge></div>
            <div><Badge count={taskStats.inProgress || 0} color="processing"><Tag color="processing">In Progress</Tag></Badge></div>
            <div><Badge count={taskStats.scheduled || 0} color="default"><Tag color="default">Scheduled</Tag></Badge></div>
            <div><Badge count={taskStats.completed || 0} color="green"><Tag color="green">Completed</Tag></Badge></div>
            <div><Badge count={taskStats.overdue || 0} color="red"><Tag color="red" icon={<WarningOutlined />}>Overdue</Tag></Badge></div>
            <div><Badge count={taskStats.dueSoon || 0} color="orange"><Tag color="orange" icon={<ClockCircleOutlined />}>Due Soon</Tag></Badge></div>
            <div><Text strong>Total: {taskStats.total || 0}</Text></div>
          </Space>
        </Card>
      )}
      */}

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
        <div style={{ textAlign: 'center', padding: '50px' }}>
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
            title={
              <Space>
                <UserOutlined />
                <span>My Assigned Tasks</span>
                <Badge count={sortedAssignedTasks.length} color="blue" />
              </Space>
            } 
            style={{ flex: 1 }}
          >
            {sortedAssignedTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>No assigned tasks</div>
              </div>
            ) : (
              <List
                dataSource={sortedAssignedTasks}
                renderItem={(task) => (
                  <TaskListCard
                    key={task.id}
                    task={task}
                    stepType={task.type}
                    assignmentStatus={task.assignment?.currentStatus}
                    hasInputBlocks={!!((task.form || task.inputs) && (task.form || task.inputs)!.length > 0)}
                    hasLinks={!!(task.links && task.links.length > 0)}
                    actionLoading={actionLoading}
                    prefixDataTestId={prefixDataTestId}
                    onTaskClick={handleTaskClick}
                    onQuickClaim={handleQuickClaim}
                    getTaskTypeIcon={getTaskTypeIcon}
                    getTaskStatusColor={getTaskStatusColor}
                    getStepTypeColor={getStepTypeColor}
                    getAssignmentStatusColor={getAssignmentStatusColor}
                    getDueDateTag={getDueDateTag}
                    isTaskOverdue={isTaskOverdue}
                    isTaskDueSoon={isTaskDueSoon}
                    formatDueDate={formatDueDate}
                    accessToken={accessToken}
                    {...context}
                  />
                )}
                size="small"
              />
            )}
          </Card>

          {/* Claimable Tasks */}
          <Card 
            title={
              <Space>
                <ExclamationCircleOutlined />
                <span>Claimable Tasks</span>
                <Badge count={sortedClaimableTasks.length} color="orange" />
              </Space>
            } 
            style={{ flex: 1 }}
          >
            {sortedClaimableTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                <CheckCircleOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>No claimable tasks</div>
              </div>
            ) : (
              <List
                dataSource={sortedClaimableTasks}
                renderItem={(task) => (
                  <TaskListCard
                    key={task.id}
                    task={task}
                    stepType={task.type}
                    assignmentStatus={task.assignment?.currentStatus}
                    hasInputBlocks={!!((task.form || task.inputs) && (task.form || task.inputs)!.length > 0)}
                    hasLinks={!!(task.links && task.links.length > 0)}
                    actionLoading={actionLoading}
                    prefixDataTestId={prefixDataTestId}
                    onTaskClick={handleTaskClick}
                    onQuickClaim={handleQuickClaim}
                    getTaskTypeIcon={getTaskTypeIcon}
                    getTaskStatusColor={getTaskStatusColor}
                    getStepTypeColor={getStepTypeColor}
                    getAssignmentStatusColor={getAssignmentStatusColor}
                    getDueDateTag={getDueDateTag}
                    isTaskOverdue={isTaskOverdue}
                    isTaskDueSoon={isTaskDueSoon}
                    formatDueDate={formatDueDate}
                    accessToken={accessToken}
                    {...context}
                  />
                )}
                size="small"
              />
            )}
          </Card>
        </div>
      )}

      {/* Task Modal using modular components */}
      {selectedTask && (
        <Modal
          title={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {getTaskTypeIcon(selectedTask)}
                <span>{selectedTask.title || selectedTask.name}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 'normal' }}>
                Task ID: {selectedTask.id}
              </span>
            </div>
          }
          open={isTaskModalVisible}
          onCancel={() => {
            setIsTaskModalVisible(false);
            setTaskModalLoading(false);
            setTaskFormData({});
            setReassignUserId('');
            setRejectionComment('');
            form.resetFields();
          }}
          width={800}
          footer={null}
          confirmLoading={taskModalLoading}
        >
          {taskModalLoading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary">Refreshing task data...</Text>
              </div>
            </div>
          )}
          {!taskModalLoading && (
            <Tabs 
              defaultActiveKey="details"
              items={[
              {
                key: 'details',
                label: 'Task Details',
                children: (
                  <TaskDetailsTab
                    task={selectedTask}
                    stepType={selectedTask.type}
                    hasLinks={!!(selectedTask.links && selectedTask.links.length > 0)}
                    hasInputBlocks={!!((selectedTask.form || selectedTask.inputs) && (selectedTask.form || selectedTask.inputs)!.length > 0)}
                    taskFormData={taskFormData}
                    reassignUserId={reassignUserId}
                    rejectionComment={rejectionComment}
                    form={form}
                    actionLoading={actionLoading}
                    prefixDataTestId={prefixDataTestId}
                    onComplete={taskHandlers.onComplete}
                    onClaim={taskHandlers.onClaim}
                    onRelease={taskHandlers.onRelease}
                    onReassign={taskHandlers.onReassign}
                    onReject={taskHandlers.onReject}
                    setReassignUserId={taskHandlers.setReassignUserId}
                    setRejectionComment={taskHandlers.setRejectionComment}
                    setTaskFormData={setTaskFormData}
                    getTaskStatusColor={getTaskStatusColor}
                    getStepTypeColor={getStepTypeColor}
                    getAssignmentStatusColor={getAssignmentStatusColor}
                    getDueDateTag={getDueDateTag}
                    isTaskOverdue={isTaskOverdue}
                    isTaskDueSoon={isTaskDueSoon}
                    formatDueDate={formatDueDate}
                    isJustClaimable={isJustClaimable}
                    accessToken={accessToken}
                    {...context}
                  />
                )
              },
              {
                key: 'flowData',
                label: 'Flow Data',
                children: (
                  <FlowDataTab
                    task={selectedTask}
                    prefixDataTestId={prefixDataTestId}
                    accessToken={accessToken}
                    {...context}
                  />
                )
              },
              {
                key: 'flowProgress',
                label: 'Flow Progress',
                children: (
                  <FlowProgressTab
                    taskId={selectedTask.id}
                    flowId={selectedTask.flowId}
                    accessToken={accessToken}
                    {...context}
                  />
                )
              },
              {
                key: 'flowHistory',
                label: 'Flow History',
                children: (
                  <FlowHistoryTab
                    task={selectedTask}
                    getAssignmentStatusColor={getAssignmentStatusColor}
                    prefixDataTestId={prefixDataTestId}
                    accessToken={accessToken}
                    {...context}
                  />
                )
              }
            ]}
          />
          )}
        </Modal>
      )}
    </div>
  );
};

export default TaskInbox;