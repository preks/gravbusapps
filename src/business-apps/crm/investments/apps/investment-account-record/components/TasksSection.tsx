import React, { useState, useEffect } from 'react';
import { Spin, Alert, Timeline, Typography, message, Modal } from 'antd';
import { Button } from '@newwork/nw-design-system';
import { PlusCircleOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import { Clock, Calendar } from 'lucide-react';
import { startProcess } from '@/common/utils/start-process';
import { AppAction } from '@/components/app-action';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { useGetInvestmentTasksByAccountId } from '@/common/data/investment/hooks/useInvestmentAccounts';
import type { InvestmentTask } from '@/common/data/investment/types';

const { Text } = Typography;

// Use InvestmentTask type for consistency
type TaskData = InvestmentTask;

interface TasksSectionProps {
  accountId?: string;
  context: BusinessAppContextProps;
}

export const TasksSection: React.FC<TasksSectionProps> = ({ accountId, context }) => {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  
  // Use the centralized investment data hook
  const { fetchInvestmentTasksByAccountId } = useGetInvestmentTasksByAccountId(context);

  // Helper function to get timing type icon
  const getTimingTypeIcon = (timingType?: string) => {
    if (!timingType) {
      return <Clock style={{ fontSize: '14px', color: '#8c8c8c' }} />;
    }

    switch (timingType.toUpperCase()) {
      case 'DEADLINE':
        return <Clock style={{ fontSize: '14px', color: '#ff4d4f' }} />;
      case 'SCHEDULED':
        return <Calendar style={{ fontSize: '14px', color: '#1677ff' }} />;
      default:
        return <Clock style={{ fontSize: '14px', color: '#8c8c8c' }} />;
    }
  };

  const loadTasks = async () => {
    if (!accountId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const tasks = await fetchInvestmentTasksByAccountId(accountId);
      
      // Filter out approval tasks - they should only appear in the Approvals tab
      const nonApprovalTasks = tasks.filter(task => {
        const isApprovalTask = task.taskType?.code?.toLowerCase() === 'approval';
        return !isApprovalTask;
      });
      
      // Sort tasks by createdAt in descending order (newest first)
      const sortedTasks = nonApprovalTasks.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setTasks(sortedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [accountId]);

  // Add focus event listener to refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
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
  }, [accountId]);

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
        console.error('Error handling process completion:', err);
      }
    };

    // Universal event listener to capture all events
    const handleAllEvents = (event: any) => {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        handleProcessCompletion(event);
      }
    };

    // Listen to multiple possible event names (comprehensive list like opportunity record)
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
      'process-completion'
    ];

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });

    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function(event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        handleAllEvents(event);
      }
      return originalDispatchEvent.call(this, event);
    };

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
      window.dispatchEvent = originalDispatchEvent;
    };
  }, [accountId]);

  // Add task handled by AppAction component

  const handleUpdateTask = (task: TaskData) => {
    startProcess({
      domain: 'investments',
      processName: 'createInvestmentTask',
      payload: {
        accountId: accountId,
        typeRef: task.taskType?.id || 'InvestmentTaskType:v1:GENERAL',
        taskData: task // Pass existing task data for update mode
      },
      builderType: 'NATIVE_SCREEN',
    });
  };

  const handleDeleteTask = (task: TaskData) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the task "${task.name || 'Untitled Task'}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post('/investments/saveInvestmentTask', {
            changeMode: "DELETE",
            investmentTask: {
              id: task.id,
              version: task.version,
              account: accountId
            }
          }, {
            headers: { Authorization: `Bearer ${context.accessToken}` }
          });
          
          // Remove the task from local state
          setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
          
          message.success('Task deleted successfully');
        } catch (error) {
          console.error('Error deleting task:', error);
          message.error('Failed to delete task');
        }
      },
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  const getPriorityValue = (priority: any): string => {
    if (typeof priority === 'string') return priority;
    return priority?.value || 'Medium';
  };

  const getTypeValue = (type: any): string => {
    if (typeof type === 'string') return type;
    return type?.value || 'General';
  };

  return (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        overflow: 'hidden',
        marginBottom: '24px',
        height: 'fit-content'
      }}
      data-testid="investment-account-tasks-section"
    >
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #f0f0f0'
        }}
      >
        <div 
          className="gba:tasks-title" 
          style={{ fontSize: '18px', fontWeight: '500' }}
        >
          Tasks
        </div>
        <AppAction
          contextsArray={[FlowContextName.investmentTaskCreate]}
          externalContextData={{ 
            accountId,
            account: accountId,
            investmentTask: { account: accountId }
          }}
          staticFlowData={accountId ? [{
            key: 'create-investment-task-fallback',
            label: 'Add Task',
            onClick: () => startProcess({
              domain: 'investments',
              processName: 'createInvestmentTask',
              payload: { accountId },
              builderType: 'NATIVE_SCREEN'
            })
          }] : []}
          prefixDataTestId="add-task"
          accessToken={context.accessToken}
          emptyStateBehavior="enable"
          deferMainContextRequestsUntilClick
        >
          <Button
            variant="default"
            data-testid="investment-account-add-task-button"
          >
            <PlusCircleOutlined />
            Add Task
          </Button>
        </AppAction>
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        )}

        {error && (
          <Alert
            message="Error Loading Tasks"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
            action={
              <Button size="small" onClick={loadTasks}>
                Retry
              </Button>
            }
          />
        )}

        {!loading && !error && tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
              No tasks yet
            </div>
          </div>
        )}

        {!loading && !error && tasks.length > 0 && (
          <Timeline style={{ marginTop: '16px' }}>
            {tasks.map((task, index) => (
              <Timeline.Item key={task.id || index} color={getPriorityColor(getPriorityValue(task.priority))}>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getTimingTypeIcon(task.taskTiming)}
                      <Text strong>{task.name}</Text>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span
                        style={{
                          background: task.priority?.value === 'High' ? '#fff2e8' : task.priority?.value === 'Medium' ? '#f6ffed' : '#f0f0f0',
                          color: task.priority?.value === 'High' ? '#fa8c16' : task.priority?.value === 'Medium' ? '#52c41a' : '#8c8c8c',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {task.taskPriorityLabel || 'Normal'}
                      </span>
                      <span
                        style={{
                          background: task.statusRef?.includes('COMPLETED') ? '#f6ffed' : 
                                     task.statusRef?.includes('IN_PROGRESS') ? '#fff7e6' : 
                                     task.statusRef?.includes('OVERDUE') ? '#fff2f0' : '#f0f0f0',
                          color: task.statusRef?.includes('COMPLETED') ? '#52c41a' : 
                                task.statusRef?.includes('IN_PROGRESS') ? '#fa8c16' : 
                                task.statusRef?.includes('OVERDUE') ? '#ff4d4f' : '#8c8c8c',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {task.taskStatusLabel || 'Open'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">
                      {dayjs(task.createdAt).format('MMM D, YYYY [at] h:mm A')} - {task.creatorDisplayName || 'Unknown'}
                    </Text>
                    {task.dueDate && (
                      <Text 
                        type="secondary" 
                        style={{ 
                          marginLeft: '16px',
                          color: dayjs(task.dueDate).isBefore(dayjs(), 'day') ? '#ff4d4f' : undefined,
                          fontWeight: dayjs(task.dueDate).isBefore(dayjs(), 'day') ? '500' : undefined
                        }}
                      >
                        Due: {dayjs(task.dueDate).format('MMM D, YYYY')}
                        {dayjs(task.dueDate).isBefore(dayjs(), 'day') && ' (Overdue)'}
                      </Text>
                    )}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div>{task.description}</div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <span style={{ 
                        backgroundColor: getPriorityColor(getPriorityValue(task.priority)), 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px' 
                      }}>
                        {task.taskPriorityLabel || 'Normal'}
                      </span>
                      <span style={{ 
                        backgroundColor: '#f0f0f0', 
                        color: '#333', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px' 
                      }}>
                        {task.taskTypeLabel || 'General'}
                      </span>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '4px' }}>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      size="small"
                      style={{ padding: '4px', lineHeight: 1 }}
                      onClick={() => handleUpdateTask(task)}
                      data-testid={`investment-account-update-task-${task.id}`}
                      title="Update Task"
                    />
                    <Button 
                      type="text" 
                      icon={<CloseOutlined />} 
                      size="small"
                      style={{ padding: '4px', lineHeight: 1 }}
                      onClick={() => handleDeleteTask(task)}
                      data-testid={`investment-account-delete-task-${task.id}`}
                      title="Delete Task"
                    />
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </div>
    </div>
  );
}; 