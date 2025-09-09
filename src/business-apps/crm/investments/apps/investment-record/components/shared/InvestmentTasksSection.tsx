import React, { useState, useEffect } from 'react';
import { Spin, Alert, Timeline, Typography, message, Modal, Tag, Button as AntButton } from 'antd';
import { Button } from '@newwork/nw-design-system';
import { PlusCircleOutlined, CloseOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { Clock, Calendar } from 'lucide-react';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { formatDate } from '@/common/data/investment';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { useGetInvestmentTasksByInvestmentId } from '../../hooks/useInvestmentTasksByInvestmentId';
import type { InvestmentTask } from '@/common/data/investment/types';

const { Text } = Typography;

interface InvestmentTasksSectionProps {
  investmentId?: string;
  context: BusinessAppContextProps;
}

// Use the actual investment task type
type SimpleTaskData = InvestmentTask;

export const InvestmentTasksSection: React.FC<InvestmentTasksSectionProps> = ({ investmentId, context }) => {
  const [tasks, setTasks] = useState<SimpleTaskData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);
  const { fetchInvestmentTasksByInvestmentId } = useGetInvestmentTasksByInvestmentId(context);

  // Helper function to get timing type icon
  const getTimingTypeIcon = (taskTiming?: string) => {
    if (!taskTiming) {
      return <Clock style={{ fontSize: '14px', color: '#8c8c8c' }} />;
    }

    switch (taskTiming.toUpperCase()) {
      case 'DEADLINE':
        return <Clock style={{ fontSize: '14px', color: '#ff4d4f' }} />;
      case 'SCHEDULED':
        return <Calendar style={{ fontSize: '14px', color: '#1677ff' }} />;
      default:
        return <Clock style={{ fontSize: '14px', color: '#8c8c8c' }} />;
    }
  };

  const loadTasks = async () => {
    if (!investmentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const tasksData = await fetchInvestmentTasksByInvestmentId(investmentId);
      setTasks(tasksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [investmentId]);

  // Add focus event listener to refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window gained focus, refreshing tasks...');
      loadTasks();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [investmentId]);

  // Listen for process completion events to refresh tasks
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          loadTasks();
          return;
        }
        
        // Also check for different event structure
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success') {
          loadTasks();
        }
      } catch (err) {
        console.error('Error handling process completion in TasksSection:', err);
      }
    };

    // Listen to multiple possible event names for task updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion',
    ];

    eventNames.forEach((eventName) => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });

    return () => {
      eventNames.forEach((eventName) => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
    };
  }, [investmentId]);

  // Use central formatDate function with custom format
  const formatTaskDate = (dateString: string | null | undefined): string => {
    return formatDate(dateString, 'DD.MM.YYYY', 'N/A');
  };

  // Helper function to get task status color
  const getTaskStatusColor = (status: string | undefined): string => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'open':
      case 'in progress':
        return 'blue';
      case 'completed':
      case 'done':
        return 'green';
      case 'cancelled':
      case 'rejected':
        return 'red';
      case 'pending':
        return 'orange';
      default:
        return 'default';
    }
  };

  // Helper function to determine if task is overdue
  const isTaskOverdue = (dueDate: string | null | undefined): boolean => {
    if (!dueDate) return false;
    try {
      return dayjs(dueDate).isBefore(dayjs(), 'day');
    } catch {
      return false;
    }
  };

  const handleAddTaskClick = () => {
    if (!investmentId) {
      message.error('Investment ID is required to create a task');
      return;
    }

    try {
      startProcess({
        domain: 'investments',
        processName: 'createInvestmentTask',
        payload: {
          investmentId: investmentId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    } catch (error) {
      console.error('Error starting task creation process:', error);
      message.error('Failed to start task creation process');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-8">
          <Spin size="large" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message="Error Loading Tasks"
          description={error}
          type="error"
          showIcon
          action={
            <AntButton size="small" onClick={loadTasks}>
              Retry
            </AntButton>
          }
          style={{ margin: '16px 0' }}
        />
      );
    }

    if (tasks.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
          <UserOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No tasks found</p>
          <p style={{ fontSize: '14px' }}>Tasks related to this investment will appear here</p>
        </div>
      );
    }

    return (
      <Timeline mode="left" style={{ marginTop: '16px' }}>
        {tasks.map((task) => {
          const isOverdue = isTaskOverdue(task.dueDate);
          const statusColor = getTaskStatusColor(task.taskStatus?.value);
          
          return (
            <Timeline.Item
              key={task.id}
              dot={getTimingTypeIcon(task.taskTiming)}
              color={isOverdue ? 'red' : 'blue'}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>
                    {task.name || 'Untitled Task'}
                  </h4>
                  <Tag color={statusColor} size="small">
                    {task.taskStatus?.value || 'Unknown'}
                  </Tag>
                  {task.taskPriority?.value && (
                    <Tag color="orange" size="small">
                      {task.taskPriority.value}
                    </Tag>
                  )}
                </div>
                
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  <Text type="secondary">
                    Due: {formatTaskDate(task.dueDate)}
                    {isOverdue && <Text type="danger"> (Overdue)</Text>}
                  </Text>
                  {task.assignedEmployee && (
                    <Text type="secondary" style={{ marginLeft: '16px' }}>
                      Assigned: {getEmployeeDisplayName(task.assignedEmployee.id)}
                    </Text>
                  )}
                </div>
                
                {task.description && (
                  <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '13px' }}>
                    {task.description}
                  </p>
                )}
              </div>
            </Timeline.Item>
          );
        })}
      </Timeline>
    );
  };

  return (
    <div
      className="gba:bg-white gba:rounded-lg gba:shadow-sm gba:border"
      style={{ padding: '20px' }}
      data-testid="investment-tasks-section"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
          Tasks ({tasks.length})
        </h3>
        <Button
          variant="default"
          onClick={handleAddTaskClick}
          data-testid="add-task-button"
        >
          <PlusCircleOutlined />
          Add Task
        </Button>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default InvestmentTasksSection;
