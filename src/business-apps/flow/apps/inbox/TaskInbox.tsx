import React, { useState, useEffect } from 'react';
import { Select, Card, List, Button, Badge, Tag, Spin, Alert, Modal, Typography, Space, Divider } from 'antd';
import { UserOutlined, ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { env } from '@/common/env/EnvUtils';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

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
  contentBlocks?: any[];
  inputBlocks?: any[];
  canClaim?: boolean;
  canComplete?: boolean;
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

  const API_BASE = (env('NEXT_PUBLIC_BUSINESS_FLOWS_API_URL') || 'http://localhost:3003') + '/api';

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
    setSelectedTask(task);
    setIsTaskModalVisible(true);
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

  const handleCompleteTask = async (taskId: string, outputData: any) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputData })
      });

      if (response.ok) {
        // Refresh tasks after completing
        await fetchUserData(selectedUserId);
        setIsTaskModalVisible(false);
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

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'HUMAN': return <UserOutlined />;
      case 'CLAIM': return <ExclamationCircleOutlined />;
      default: return <ClockCircleOutlined />;
    }
  };

  const renderTaskModal = () => {
    if (!selectedTask) return null;

    return (
      <Modal
        title={`Task: ${selectedTask.title}`}
        open={isTaskModalVisible}
        onCancel={() => setIsTaskModalVisible(false)}
        footer={null}
        width={800}
        data-testid={`${prefixDataTestId}-TaskModal`}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Task Header */}
          <div>
            <Space>
              <Tag color={getTaskStatusColor(selectedTask.status)}>{selectedTask.status}</Tag>
              <Tag color="blue">{selectedTask.taskType}</Tag>
              {selectedTask.templateTitle && <Tag color="purple">{selectedTask.templateTitle}</Tag>}
            </Space>
          </div>

          {/* Task Description */}
          <div>
            <Title level={5}>Description</Title>
            <Paragraph>{selectedTask.description}</Paragraph>
          </div>

          {/* Content Blocks */}
          {selectedTask.contentBlocks && selectedTask.contentBlocks.length > 0 && (
            <div>
              <Title level={5}>Content</Title>
              {selectedTask.contentBlocks.map((block, index) => (
                <Card key={index} size="small" style={{ marginBottom: 8 }}>
                  <Text strong>Block {index + 1} ({block.type}):</Text>
                  <br />
                  <Text>{block.content || 'No content'}</Text>
                </Card>
              ))}
            </div>
          )}

          {/* Input Blocks */}
          {selectedTask.inputBlocks && selectedTask.inputBlocks.length > 0 && (
            <div>
              <Title level={5}>Input Required</Title>
              {selectedTask.inputBlocks.map((block, index) => (
                <Card key={index} size="small" style={{ marginBottom: 8 }}>
                  <Text strong>{block.label || `Input ${index + 1}`}:</Text>
                  <br />
                  <Text type="secondary">{block.description || 'No description'}</Text>
                </Card>
              ))}
            </div>
          )}

          <Divider />

          {/* Task Actions */}
          <div>
            <Title level={5}>Actions</Title>
            <Space>
              {selectedTask.canClaim && (
                <Button 
                  type="primary" 
                  onClick={() => handleClaimTask(selectedTask.taskId)}
                  data-testid={`${prefixDataTestId}-ClaimButton`}
                >
                  Claim Task
                </Button>
              )}
              {selectedTask.canComplete && (
                <Button 
                  type="primary" 
                  onClick={() => handleCompleteTask(selectedTask.taskId, { result: 'completed', notes: 'Task completed via inbox' })}
                  data-testid={`${prefixDataTestId}-CompleteButton`}
                >
                  Complete Task
                </Button>
              )}
              <Button onClick={() => setIsTaskModalVisible(false)}>
                Close
              </Button>
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
      </Modal>
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
                  <List.Item.Meta
                    avatar={getTaskTypeIcon(task.taskType)}
                    title={
                      <Space>
                        <span>{task.title}</span>
                        <Tag color={getTaskStatusColor(task.status)}>
                          {task.status}
                        </Tag>
                        {task.templateTitle && (
                          <Tag color="purple">{task.templateTitle}</Tag>
                        )}
                      </Space>
                    }
                    description={task.description}
                  />
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
                  <List.Item.Meta
                    avatar={getTaskTypeIcon(task.taskType)}
                    title={
                      <Space>
                        <span>{task.title}</span>
                        <Tag color={getTaskStatusColor(task.status)}>
                          {task.status}
                        </Tag>
                        {task.templateTitle && (
                          <Tag color="purple">{task.templateTitle}</Tag>
                        )}
                      </Space>
                    }
                    description={task.description}
                  />
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