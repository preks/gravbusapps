import React, { useState, useEffect } from 'react';
import { Spin, Alert, Timeline, Typography, message, Modal, Tag, Button as AntButton } from 'antd';
import { Button } from '@newwork/nw-design-system';
import { PlusCircleOutlined, CloseOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { Clock, Calendar } from 'lucide-react';
// import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
// import { useRestClient } from '@/common/network/rest/useRestClient';
// import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { formatDate } from '@/common/data/investment';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { useGetInvestmentTasksByInvestmentId } from '../../hooks/useInvestmentTasksByInvestmentId';
import type { InvestmentTask } from '@/common/data/investment/types';
import { AppAction } from '@/components/app-action';
import { DeleteConfirmationPopup } from '@/common/components';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

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
  const [deletePopup, setDeletePopup] = useState<{ open: boolean; task?: SimpleTaskData }>({ open: false });
  // const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
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
      // Show only non-approval tasks in this card
      const nonApproval = (tasksData || []).filter((t: any) => {
        const typeVal = t?.taskType?.value || t?.taskType?.code || t?.taskTypeRef || '';
        return String(typeVal).toLowerCase() !== 'approval' && !String(typeVal).toUpperCase().endsWith(':APPROVAL');
      });
      setTasks(nonApproval);
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

  // Task creation handled via AppAction below; legacy startProcess removed

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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <AntButton
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => setDeletePopup({ open: true, task })}
                    data-testid={`delete-task-button-${task.id}`}
                  />
                </div>
                
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  <Text type="secondary">
                    Due: {formatTaskDate(task.dueDate)}
                    {isOverdue && <Text type="danger"> (Overdue)</Text>}
                  </Text>
                  <Text type="secondary" style={{ marginLeft: '16px' }}>
                    Assigned: {
                      task.assignedEmployee?.displayName ||
                      (task.assignedEmployee?.id ? getEmployeeDisplayName(task.assignedEmployee.id) : undefined) ||
                      task.creatorEmployee?.displayName ||
                      (task.creatorEmployee?.id ? getEmployeeDisplayName(task.creatorEmployee.id) : undefined) ||
                      task.createdBy ||
                      'Unknown'
                    }
                  </Text>
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
        <AppAction
          contextsArray={[FlowContextName.investmentTaskCreate]}
          accessToken={context.accessToken}
          externalContextData={{
            investmentId,
            investment: investmentId,
            investmentTask: { investment: investmentId, investmentId },
          }}
          prefixDataTestId="add-task"
          emptyStateBehavior="enable"
          deferMainContextRequestsUntilClick
        >
          <Button
            variant="default"
            data-testid="add-task-button"
          >
            <PlusCircleOutlined />
            Add Task
          </Button>
        </AppAction>
      </div>

      {/* Content */}
      {renderContent()}
      {deletePopup.open && deletePopup.task ? (
        <DeleteConfirmationPopup
          isOpen={deletePopup.open}
          onClose={() => setDeletePopup({ open: false })}
          accessToken={context.accessToken}
          itemTitle={deletePopup.task!.name || 'Task'}
          itemType="task"
          flowContextName={FlowContextName.investmentTaskDelete}
          externalContextData={{
            taskId: deletePopup.task!.id,
            investmentTask: {
              id: deletePopup.task!.id,
              version: (deletePopup.task as any).version,
            },
            investmentId,
          }}
          onFlowSuccess={() => {
            const id = deletePopup.task!.id;
            setTasks(prev => prev.filter(t => t.id !== id));
            setDeletePopup({ open: false });
            message.success('Task deleted successfully');
          }}
          onFlowError={() => {
            setDeletePopup({ open: false });
            message.error('Failed to delete task');
          }}
          data-testid="investment-task-deletion-popup"
        />
      ) : null}
    </div>
  );
};

export default InvestmentTasksSection;
