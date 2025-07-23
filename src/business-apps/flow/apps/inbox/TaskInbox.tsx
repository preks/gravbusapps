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
import { TaskDetailsTab, AssignmentHistoryTab, FlowProgressTab, TaskListCard } from './components';

const { Option } = Select;
const { Title, Text } = Typography;

interface TaskInboxProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

interface Task {
  id: string;
  flowId: string;
  referenceTaskName: string;
  stepType: string;
  name: string;
  status: string;
  priority?: number;
  title?: string;
  message?: string;
  stepIndex?: number;
  inputs?: any[];
  links?: any[];
  taskCategory?: string;
  dueDate?: string;
  scheduledAt?: string;
  availableActions?: {
    canClaim: boolean;
    canComplete: boolean;
    canReassign: boolean;
    canReject: boolean;
    canUnclaim: boolean;
  };
  assignment?: {
    assignmentMode: string;
    currentStatus: string;
    assignedTo?: string;
    assignedAt?: string;
    isUserOwner: boolean;
    allowReassignment: boolean;
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
  
  return actions.canClaim && 
         !actions.canComplete && 
         !actions.canReject && 
         !actions.canReassign && 
         !actions.canUnclaim;
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

const TaskInbox: React.FC<TaskInboxProps> = ({ prefixDataTestId = 'TaskInbox', ...context }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('user-001');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [taskFormData, setTaskFormData] = useState<any>({});
  const [reassignUserId, setReassignUserId] = useState<string>('');
  const [rejectionComment, setRejectionComment] = useState<string>('');
  const [form] = Form.useForm();

  const API_BASE = (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'http://localhost:3000') + '/api';

  // Fetch tasks and stats for selected user
  const fetchUserData = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const [tasksResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE}/tasks/user/${userId}`),
        fetch(`${API_BASE}/tasks/user/${userId}/stats`)
      ]);

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData.tasks || []);
      } else {
        throw new Error('Failed to fetch tasks');
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setTaskStats(statsData.data || statsData);
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
          body = { currentUserId: selectedUserId, rejectionComment, ...payload };
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

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleTaskClick = async (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalVisible(true);
    
    const initialFormData: any = {};
    task.inputs?.forEach((input: any) => {
      initialFormData[input.name] = input.type === 'checkbox' ? [] : '';
    });
    setTaskFormData(initialFormData);
    form.setFieldsValue(initialFormData);
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
    switch (task.stepType) {
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

  // Filter and sort tasks
  const assignedTasks = tasks.filter(task => 
    task.assignment?.isUserOwner || 
    task.assignment?.currentStatus === 'assigned' || 
    task.assignment?.currentStatus === 'claimed'
  );
  
  const claimableTasks = tasks.filter(task => 
    task.availableActions?.canClaim && 
    !task.assignment?.assignedTo
  );

  const sortTasksByDueDate = (tasks: Task[]): Task[] => {
    return [...tasks].sort((a, b) => {
      const aOverdue = isTaskOverdue(a.dueDate);
      const bOverdue = isTaskOverdue(b.dueDate);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      const aDueSoon = isTaskDueSoon(a.dueDate);
      const bDueSoon = isTaskDueSoon(b.dueDate);
      if (aDueSoon && !bDueSoon) return -1;
      if (!aDueSoon && bDueSoon) return 1;
      
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      
      return (a.stepIndex || 0) - (b.stepIndex || 0);
    });
  };

  const sortedAssignedTasks = sortTasksByDueDate(assignedTasks);
  const sortedClaimableTasks = sortTasksByDueDate(claimableTasks);

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
                    stepType={task.stepType}
                    assignmentStatus={task.assignment?.currentStatus}
                    hasInputBlocks={!!(task.inputs && task.inputs.length > 0)}
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
                    stepType={task.stepType}
                    assignmentStatus={task.assignment?.currentStatus}
                    hasInputBlocks={!!(task.inputs && task.inputs.length > 0)}
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
            setTaskFormData({});
            setReassignUserId('');
            setRejectionComment('');
            form.resetFields();
          }}
          width={800}
          footer={null}
        >
          <Tabs 
            defaultActiveKey="details"
            items={[
              {
                key: 'details',
                label: 'Task Details',
                children: (
                  <TaskDetailsTab
                    task={selectedTask}
                    stepType={selectedTask.stepType}
                    hasLinks={!!(selectedTask.links && selectedTask.links.length > 0)}
                    hasInputBlocks={!!(selectedTask.inputs && selectedTask.inputs.length > 0)}
                    taskFormData={taskFormData}
                    reassignUserId={reassignUserId}
                    rejectionComment={rejectionComment}
                    form={form}
                    actionLoading={actionLoading}
                    prefixDataTestId={prefixDataTestId}
                    {...taskHandlers}
                    getTaskStatusColor={getTaskStatusColor}
                    getStepTypeColor={getStepTypeColor}
                    getAssignmentStatusColor={getAssignmentStatusColor}
                    getDueDateTag={getDueDateTag}
                    isTaskOverdue={isTaskOverdue}
                    isTaskDueSoon={isTaskDueSoon}
                    formatDueDate={formatDueDate}
                    isJustClaimable={isJustClaimable}
                    {...context}
                  />
                )
              },
              {
                key: 'history',
                label: 'Assignment History',
                children: (
                  <AssignmentHistoryTab
                    task={selectedTask}
                    getAssignmentStatusColor={getAssignmentStatusColor}
                    {...context}
                  />
                )
              },
              {
                key: 'flowProgress',
                label: 'Flow Progress',
                children: (
                  <FlowProgressTab
                    task={selectedTask}
                    data-testid={`${prefixDataTestId}-flow-progress-tab`}
                    {...context}
                  />
                )
              }
            ]}
          />
        </Modal>
      )}
    </div>
  );
};

export default TaskInbox;