import React, { useState, useEffect } from 'react';
import { Spin, Alert, Button, Timeline, Typography, message, Modal, Tag } from 'antd';
import { PlusCircleOutlined, CloseOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { Clock, Calendar } from 'lucide-react';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { useGetInvestmentTasksByLeadId } from '@/common/data/investment/hooks/useInvestmentLeads';
import type { InvestmentTask } from '@/common/data/investment/types';

const { Text } = Typography;

interface TasksSectionProps {
  leadId?: string;
  context: BusinessAppContextProps;
}

// Use the actual investment task type
type SimpleTaskData = InvestmentTask;

export const TasksSection: React.FC<TasksSectionProps> = ({ leadId, context }) => {
  const [tasks, setTasks] = useState<SimpleTaskData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);
  const { fetchInvestmentTasksByLeadId } = useGetInvestmentTasksByLeadId(context);

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
    if (!leadId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const tasksData = await fetchInvestmentTasksByLeadId(leadId);
      setTasks(tasksData);
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
        domain: 'investments', // Updated from 'customer-relations'
        processName: 'saveInvestmentTask', // Updated from 'saveSalesTask'
        payload: {
          leadId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleUpdateTask = (task: SimpleTaskData) => {
    startProcess({
      domain: 'investments', // Updated from 'customer-relations'
      processName: 'saveInvestmentTask', // Updated from 'saveSalesTask'
      payload: {
        leadId: leadId,
        typeRef: task.taskType?.code || 'InvestmentTaskType:v1:GENERAL', // Updated from 'SalesTaskType:v1:GENERAL'
        taskData: task // Pass existing task data for update mode
      },
      builderType: 'NATIVE_SCREEN',
    });
  };

  const handleDeleteTask = (task: SimpleTaskData) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the task "${task.name || 'Untitled Task'}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post('/investments/saveInvestmentTask', { // Updated from '/customer-relations/saveSalesTask'
            changeMode: "DELETE",
            investmentTask: { // Updated from 'salesTask'
              id: task.id,
              version: task.version || 1,
            }
          });
          
          message.success('Task deleted successfully');
          loadTasks(); // Refresh the list
        } catch (err) {
          console.error('Error deleting task:', err);
          message.error('Failed to delete task');
        }
      }
    });
  };

  const getPriorityColor = (priority?: any) => {
    if (!priority) return 'default';
    
    const priorityValue = typeof priority === 'string' ? priority : priority?.description;
    
    switch (priorityValue?.toLowerCase()) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status?: any) => {
    if (!status) return 'default';
    
    const statusValue = typeof status === 'string' ? status : status?.description;
    
    switch (statusValue?.toLowerCase()) {
      case 'completed':
        return 'green';
      case 'in progress':
        return 'blue';
      case 'pending':
        return 'orange';
      case 'cancelled':
        return 'red';
      default:
        return 'default';
    }
  };

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
        className="gba:mb-4"
        action={
          <Button size="small" onClick={loadTasks}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="gba:space-y-4">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h3 className="gba:text-lg gba:font-medium gba:text-gray-900">Tasks</h3>
          <p className="gba:text-sm gba:text-gray-600">
            Manage tasks and activities related to this investment lead
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusCircleOutlined />}
          onClick={handleAddTaskClick}
          className="gba:bg-blue-600 gba:hover:bg-blue-700"
        >
          Add Task
        </Button>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="gba:text-center gba:py-8 gba:text-gray-500">
          <p>No tasks found for this investment lead.</p>
          <p className="gba:text-sm">Create a new task to get started.</p>
        </div>
      ) : (
        <Timeline>
          {tasks.map((task) => (
                         <Timeline.Item
               key={task.id}
               dot={getTimingTypeIcon(task.taskTiming)}
               className="gba:pb-6"
             >
              <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 gba:shadow-sm">
                <div className="gba:flex gba:justify-between gba:items-start gba:mb-3">
                  <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                      <Text strong className="gba:text-base">
                        {task.name || 'Untitled Task'}
                      </Text>
                                             <Tag color={getPriorityColor(task.taskPriority)}>
                         {task.taskPriorityLabel || 'No Priority'}
                       </Tag>
                       <Tag color={getStatusColor(task.taskStatus)}>
                         {task.taskStatusLabel || 'No Status'}
                       </Tag>
                    </div>
                    
                    {task.description && (
                      <Text className="gba:text-gray-600 gba:block gba:mb-2">
                        {task.description}
                      </Text>
                    )}
                    
                    <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-gray-500">
                      {task.dueDate && (
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Calendar className="gba:w-4 gba:h-4" />
                          Due: {dayjs(task.dueDate).format('MMM D, YYYY')}
                        </span>
                      )}
                      
                                             {task.assignedDisplayName && (
                         <span className="gba:flex gba:items-center gba:gap-1">
                           <UserOutlined />
                           Assigned: {task.assignedDisplayName}
                         </span>
                       )}
                      
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <Clock className="gba:w-4 gba:h-4" />
                        Created: {dayjs(task.createdAt).format('MMM D, YYYY')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="gba:flex gba:gap-2 gba:ml-4">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleUpdateTask(task)}
                      className="gba:text-blue-600 gba:border-blue-600 gba:hover:text-blue-700 gba:hover:border-blue-700"
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleDeleteTask(task)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      )}
    </div>
  );
}; 