import React, { useState, useEffect } from 'react';
import { Spin, Alert, Button, Timeline, Typography } from 'antd';
import { PlusCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetSalesTasks, SalesTaskData } from '../queries/SalesTaskQueries';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';

const { Text } = Typography;

interface TasksSectionProps {
  leadId?: string;
  context: BusinessAppContextProps;
}

export const TasksSection: React.FC<TasksSectionProps> = ({ leadId, context }) => {
  const [tasks, setTasks] = useState<SalesTaskData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchSalesTasks } = useGetSalesTasks(context);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));

  const loadTasks = async () => {
    if (!leadId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchSalesTasks({ leadId });
      // Sort tasks by createdAt in descending order (newest first)
      const sortedTasks = (result.SalesTask || []).sort((a, b) => 
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
  }, [leadId]);

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
  }, [leadId]);

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
        console.log('Detected process/task event:', event.type, event);
        handleProcessCompletion(event);
      }
    };

    // Listen to multiple possible event names (comprehensive list like activities)
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

    // Add a universal listener for debugging (like activities)
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function(event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        console.log('Custom Event dispatched:', event.type, event);
        handleAllEvents(event);
      }
      return originalDispatchEvent.call(this, event);
    };

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
      
      // Restore original dispatchEvent
      window.dispatchEvent = originalDispatchEvent;
    };
  }, [leadId]);

  const handleAddTaskClick = () => {
    if (leadId) {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveSalesTask',
        payload: {
          leadId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleDeleteTask = async (task: SalesTaskData) => {
    try {
      await restClient.post('/customer-relations/saveSalesTask', {
        changeMode: "DELETE",
        salesTask: {
          id: task.id,
          version: task.version,
          lead: leadId
        }
      }, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      });
      
      // Remove the task from the local state
      setTasks(prevTasks => 
        prevTasks.filter(t => t.id !== task.id)
      );
    } catch (error) {
      console.error('Error deleting task:', error);
    }
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
    if (!priority) return 'Unknown';
    if (typeof priority === 'string') return priority;
    if (priority.value) return priority.value;
    return 'Unknown';
  };

  const getTypeValue = (type: any): string => {
    if (!type) return 'Unknown';
    if (typeof type === 'string') return type;
    if (type.value) return type.value;
    return 'Unknown';
  };

  // Create task summary with all important details
  const createTaskSummary = (task: SalesTaskData) => {
    const parts = [];
    
    // Add type if available
    const typeValue = getTypeValue(task.type);
    if (typeValue && typeValue !== 'Unknown') {
      parts.push(typeValue);
    }
    
    // Add priority if available
    const priorityValue = getPriorityValue(task.priority);
    if (priorityValue && priorityValue !== 'Unknown') {
      parts.push(`${priorityValue} priority`);
    }
    
    // Add deadline if available
    if (task.dueDate) {
      parts.push(`Due: ${dayjs(task.dueDate).format('MMM D, YYYY')}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : '';
  };

  return (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        overflow: 'hidden',
        marginBottom: '24px'
      }}
    >
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px'
        }}
      >
        <div 
          className="gba:tasks-title" 
          style={{ fontSize: '18px', fontWeight: '500' }}
        >
          Tasks
        </div>
        <Button 
          type="primary"
          icon={<PlusCircleOutlined />}
          onClick={handleAddTaskClick}
          data-testid="add-task-button"
        >
          Add Task
        </Button>
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

        {!loading && !error && tasks.length > 0 && (
          <Timeline>
            {tasks.map((task, index) => (
              <Timeline.Item key={task.id || index} color={getPriorityColor(getPriorityValue(task.priority))}>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: '16px', color: '#1f2937' }}>
                      {task.name || 'Untitled Task'}
                    </Text>
                  </div>
                  <div>
                    <Text type="secondary">
                      {dayjs(task.createdAt).format('MMM D, YYYY [at] h:mm A')}
                    </Text>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    {createTaskSummary(task) && (
                      <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: '500', marginBottom: '4px' }}>
                        {createTaskSummary(task)}
                      </div>
                    )}
                    {task.description && (
                      <div style={{ marginTop: '4px', color: '#374151' }}>
                        {task.description}
                      </div>
                    )}
                  </div>
                  <Button 
                    type="text" 
                    icon={<CloseOutlined />} 
                    size="small"
                    style={{ 
                      position: 'absolute', 
                      right: 0, 
                      top: 0,
                      padding: '4px',
                      lineHeight: 1
                    }}
                    onClick={() => handleDeleteTask(task)}
                    data-testid={`delete-task-${task.id}`}
                  />
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No tasks yet</div>
            <div style={{ fontSize: '14px' }}>Add tasks to track your progress with this lead</div>
          </div>
        )}
      </div>
    </div>
  );
}; 