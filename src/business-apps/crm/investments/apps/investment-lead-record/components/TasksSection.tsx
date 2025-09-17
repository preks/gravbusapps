import React, { useState, useEffect } from 'react';
import { Spin, Alert, Timeline, Typography, message, Tag } from 'antd';
import { Button } from '@newwork/nw-design-system';
import { PlusCircleOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';
import { Clock, Calendar } from 'lucide-react';
// import { startProcess } from '@/common/utils/start-process';
import { AppAction } from '@/components/app-action';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
// import { useRestClient } from '@/common/network/rest/useRestClient';
// import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
// import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { useGetInvestmentTasksByLeadId } from '@/common/data/investment/hooks/useInvestmentLeads';
import type { InvestmentTask } from '@/common/data/investment/types';
import { DeleteConfirmPopup } from '@/common/components/common-relations/popups/delete-confirm-popup';

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
  const { fetchInvestmentTasksByLeadId } = useGetInvestmentTasksByLeadId(context);
  const [deleteTaskPopup, setDeleteTaskPopup] = useState<{ open: boolean; task?: SimpleTaskData }>({ open: false });

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

  const isApprovalTask = (task: SimpleTaskData): boolean => {
    const typeVal = (task as any)?.taskType?.code || (task as any)?.taskType?.value || (task as any)?.typeRef;
    if (!typeVal) return false;
    const val = String(typeVal);
    return val.toLowerCase() === 'approval' || val.toUpperCase().endsWith(':APPROVAL');
  };

  const loadTasks = async () => {
    if (!leadId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const tasksData = await fetchInvestmentTasksByLeadId(leadId);
      const nonApprovalTasks = tasksData.filter(t => !isApprovalTask(t));
      setTasks(nonApprovalTasks);
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

  // Add task handled by AppAction component


  const handleDeleteTask = (task: SimpleTaskData) => {
    setDeleteTaskPopup({ open: true, task });
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
          <Button size="sm" onClick={loadTasks}>
            Retry
          </Button>
        }
      />
    );
  }

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
      data-testid="lead-tasks-section"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px'
        }}
      >
        <div>
          <h3 className="gba:text-lg gba:font-medium gba:text-gray-900">Tasks</h3>
          <p className="gba:text-sm gba:text-gray-600">
            Manage tasks and activities related to this investment lead
          </p>
        </div>
        <AppAction
          contextsArray={[FlowContextName.investmentTaskCreate]}
          externalContextData={{ 
            leadId,
            lead: leadId,
            investmentTask: { lead: leadId }
          }}
          staticFlowData={[]}
          prefixDataTestId="add-task"
          accessToken={context.accessToken}
          emptyStateBehavior="enable"
          deferMainContextRequestsUntilClick
        >
          <Button
            variant="default"
          >
            <PlusCircleOutlined />
            Add Task
          </Button>
        </AppAction>
      </div>

      {/* Tasks List */}
      <div style={{ padding: '0 24px 24px' }}>
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
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteTask(task)}
                        data-testid={`delete-task-${task.id}`}
                      >
                        <CloseOutlined />
                      </Button>
                    </div>
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </div>
      {deleteTaskPopup.open && deleteTaskPopup.task ? (
        <DeleteConfirmPopup
          isOpen={deleteTaskPopup.open}
          onClose={() => setDeleteTaskPopup({ open: false })}
          accessToken={context.accessToken}
          itemTitle={deleteTaskPopup.task?.name ? String(deleteTaskPopup.task.name) : 'Task'}
          itemType="task"
          flowContextName={FlowContextName.investmentTaskDelete}
          externalContextData={{
            taskId: deleteTaskPopup.task!.id,
            investmentTask: {
              id: deleteTaskPopup.task!.id,
              version: deleteTaskPopup.task!.version,
            },
            leadId,
          }}
          onFlowSuccess={() => {
            const id = deleteTaskPopup.task!.id;
            setTasks(prev => prev.filter(t => t.id !== id));
            setDeleteTaskPopup({ open: false });
            message.success('Task deleted successfully');
          }}
          onFlowError={() => {
            setDeleteTaskPopup({ open: false });
            message.error('Failed to delete task');
          }}
          data-testid={`delete-task-popup`}
        />
      ) : null}

    </div>
  );
}; 