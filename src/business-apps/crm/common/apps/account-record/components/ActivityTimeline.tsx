import React, { useState, useEffect } from 'react';
import { PlusCircleOutlined, CloseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Button, Spin, Alert, Empty, Timeline, Typography, message } from 'antd';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { ActivityDeletePopup } from '@/common/components/common-relations/popups/activity-delete-popup';
import { Clock, Calendar } from 'lucide-react';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import { DeleteConfirmPopup } from '@/common/components/common-relations/popups/delete-confirm-popup';
import dayjs from 'dayjs';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
// Import the GraphQL queries we created
import { useGetSalesActivities } from '../queries/salesActivityQueries';
import { useGetSalesTasks } from '../queries/SalesTaskQueries';
import { NotesSection } from './NotesSection';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

const { Text } = Typography;

interface SalesActivityData {
  id: string;
  version: number;
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
  occurredAt?: string | null;
  completedAt?: string | null;
  ownerEmployee?: {
    id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    fullName?: string;
  };
  activityType?: {
    value: string;
  };
}

// interface CrmDocumentData {
//   id: string;
//   name: string;
//   mimeType?: string;
//   fileSize?: number;
//   createdAt: string;
//   createdBy: string;
//   version: number;
// }

// interface SalesTaskData {
//   id: string;
//   name: string;
//   type?: {
//     value: string;
//   };
//   typeRef: string;
//   statusRef?: string;
//   createdAt: string;
//   createdBy: string;
//   version: number;
// }

interface ActivityTimelineProps {
  accountId?: string;
  context: BusinessAppContextProps;
  defaultTab?: 'activities' | 'notes' | 'approvals' | 'documents';
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ accountId, context, defaultTab = 'activities' }) => {
  const [activeTab, setActiveTab] = useState<'activities' | 'notes' | 'approvals' | 'documents'>(defaultTab);
  const [activities, setActivities] = useState<SalesActivityData[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [notesKey, setNotesKey] = useState(0);
  
  // Approval tasks state
  const [approvalTasks, setApprovalTasks] = useState<any[]>([]);
  const [approvalTasksLoading, setApprovalTasksLoading] = useState(false);
  const [approvalTasksError, setApprovalTasksError] = useState<string | null>(null);

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);
  
  // Use the GraphQL query hooks
  const { fetchSalesActivities } = useGetSalesActivities(context);
  const { fetchSalesTasks } = useGetSalesTasks(context);
  const graphqlClient = useGraphQLClient(context.accessToken);

  const loadActivities = async () => {
    if (!accountId) return;
    
    setActivitiesLoading(true);
    setActivitiesError(null);
    
    try {
      const result = await fetchSalesActivities({ accountId });
      const activities = result.SalesActivity || [];
      
      // Sort activities by occurredAt in descending order (newest first), fallback to createdAt
      const sortedActivities = activities.sort((a, b) => {
        const dateA = new Date(a.occurredAt || a.createdAt).getTime();
        const dateB = new Date(b.occurredAt || b.createdAt).getTime();
        return dateB - dateA;
      });

      // Fetch creator employee information for activities where ownerEmployee is null
      const enhancedActivities = await Promise.all(
        sortedActivities.map(async (activity) => {
          if (!activity.ownerEmployee && activity.createdBy) {
            try {
              // Look up employee by userId
              const employeeQuery = `
                query GetEmployeeByUserId($userId: String!) {
                  Employee(where: {userId: {_eq: $userId}, isDeleted: {_eq: false}}, limit: 1) {
                    id
                    firstName
                    lastName
                    displayName
                    fullName
                  }
                }
              `;
              
              const employeeResult = await graphqlClient.request(employeeQuery, { userId: activity.createdBy });
              const employee = employeeResult?.Employee?.[0];
              if (employee) {
                return { ...activity, ownerEmployee: employee };
              }
            } catch (error) {
              console.warn('Failed to fetch creator employee for activity:', activity.id, error);
            }
          }
          return activity;
        })
      );
      
      setActivities(enhancedActivities);
    } catch (err) {
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Documents not used in this view

  const loadApprovalTasks = async () => {
    if (!accountId) return;
    
    setApprovalTasksLoading(true);
    setApprovalTasksError(null);
    
    try {
      const result = await fetchSalesTasks({ accountId });
      const allTasks = result.SalesTask || [];
      
      // Filter for approval tasks only
      const approvalTasks = allTasks.filter((task: any) => {
        const taskType = task.type;
        const taskTypeValue = taskType?.value;
        const typeRef = task.typeRef || '';
        
        return (
          (taskTypeValue && taskTypeValue.toLowerCase() === 'approval') ||
          typeRef.toLowerCase().includes('approval') ||
          typeRef === 'SalesTaskType:v1:APPROVAL'
        );
      });
      
      // Sort by createdAt in descending order (newest first)
      const sortedTasks = approvalTasks.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setApprovalTasks(sortedTasks);
    } catch (err) {
      setApprovalTasksError(err instanceof Error ? err.message : 'Failed to load approval tasks');
    } finally {
      setApprovalTasksLoading(false);
    }
  };

  // Request approval handled via AppAction

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

  // No type badge needed for approvals list

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

  // Update handled by AppActionButton

  const [deleteApprovalPopup, setDeleteApprovalPopup] = useState<{ open: boolean; task?: any }>({ open: false });
  const handleDeleteApprovalTask = (task: any) => {
    setDeleteApprovalPopup({ open: true, task });
  };

  useEffect(() => {
    if (activeTab === 'activities') {
      loadActivities();
    } else if (activeTab === 'approvals') {
      loadApprovalTasks();
    }
  }, [activeTab, accountId]);

  // Add focus event listener to refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      console.log('ActivityTimeline: Window gained focus, refreshing data...');
      if (activeTab === 'activities') {
        loadActivities();
      }
      // Also refresh notes by updating key
      setNotesKey(prev => prev + 1);
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
  }, [activeTab, accountId]);

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('ActivityTimeline: Process completion event received:', event.type);
        
        // Check for successful completion with different response structures
        let activityCreated = false;
        let documentUploaded = false;
        let noteCreated = false;
        
        // Check for successful completion first
        if (event.detail?.resolution === 'success') {
          console.log('ActivityTimeline: Process completed successfully, refreshing current tab');
          if (activeTab === 'activities') {
            loadActivities();
          } else if (activeTab === 'approvals') {
            loadApprovalTasks();
          }
          // Force refresh of notes tab by updating key
          setNotesKey(prev => prev + 1);
          return;
        }
        
        const response = event.detail?.response;
        
        // Check if activity was created
        if (response?.salesActivity || event.detail?.salesActivity) {
          activityCreated = true;
          console.log('ActivityTimeline: Sales activity detected, refreshing activities');
        }
        
        // Check if document was uploaded
        if (response?.crmDocument || event.detail?.crmDocument || event.detail?.resolution === 'success') {
          documentUploaded = true;
          console.log('ActivityTimeline: Document upload detected, refreshing documents');
        }
        
        // Check if note was created
        if (response?.crmNote || event.detail?.crmNote) {
          noteCreated = true;
          console.log('ActivityTimeline: Note creation detected, refreshing notes');
        }
        
        // Refresh the appropriate tab data
        if (activityCreated && activeTab === 'activities') {
          loadActivities();
        }
        // documents not handled here
        if (noteCreated) {
          // Force refresh of notes tab by updating key
          setNotesKey(prev => prev + 1);
        }
        
        // If no specific data detected but process was successful, refresh current tab
        if (!activityCreated && !documentUploaded && !noteCreated && (event.detail?.resolution === 'success' || response)) {
          if (activeTab === 'activities') {
            loadActivities();
          } else if (activeTab === 'notes') {
            setNotesKey(prev => prev + 1);
          }
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };
    
    // Universal event listener to capture all events
    const handleAllEvents = (event: any) => {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        console.log('ActivityTimeline: Detected process/task event:', event.type, event);
        handleProcessCompletion(event);
      }
    };
    
    // Listen to multiple possible event names (comprehensive list)
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
    
    // Add universal dispatcher override to catch all events
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function(event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        console.log('ActivityTimeline: Custom Event dispatched:', event.type, event);
        handleAllEvents(event);
      }
      return originalDispatchEvent.call(this, event);
    };

    const handlePostMessage = (event: MessageEvent) => {
      try {
        // documents not handled here
      } catch (err) {
        console.error('Error handling postMessage:', err);
      }
    };
    
    window.addEventListener('message', handlePostMessage);
    
    console.log('ActivityTimeline: Added comprehensive event listeners for process completion');
    
    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
      
      window.removeEventListener('message', handlePostMessage);
      
      // Restore original dispatchEvent
      window.dispatchEvent = originalDispatchEvent;
    };
  }, [activeTab, accountId]);

  const handleAddActivity = () => {
    if (accountId) {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveSalesActivity',
        payload: {
          accountId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  // Document handlers removed

  const [deletePopup, setDeletePopup] = useState<{ open: boolean; activity?: SalesActivityData }>({ open: false });

  const handleDeleteActivity = (activity: SalesActivityData) => {
    setDeletePopup({ open: true, activity });
  };

  const getActivityTypeValue = (activityType: any): string => {
    if (!activityType) return '';
    if (typeof activityType === 'string') return activityType;
    if (activityType.value) return activityType.value;
    return '';
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
      {/* Tab Navigation */}
      <div 
        style={{
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#fafafa'
        }}
      >
        <div style={{ display: 'flex' }}>
        <div 
          className={`gba:activity-tab${activeTab === 'activities' ? '-active' : ''}`}
          data-testid="activities-tab"
          style={{
            padding: '12px 24px',
            fontWeight: '500',
            color: activeTab === 'activities' ? '#1890ff' : '#8c8c8c',
            backgroundColor: activeTab === 'activities' ? 'white' : 'transparent',
            flex: 1,
            textAlign: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('activities')}
        >
          Activities
        </div>
        <div 
          className={`gba:activity-tab${activeTab === 'notes' ? '-active' : ''}`}
          data-testid="notes-tab"
          style={{
            padding: '12px 24px',
            fontWeight: '500',
            color: activeTab === 'notes' ? '#1890ff' : '#8c8c8c',
            backgroundColor: activeTab === 'notes' ? 'white' : 'transparent',
            flex: 1,
            textAlign: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </div>
        <div 
          className={`gba:activity-tab${activeTab === 'approvals' ? '-active' : ''}`}
          data-testid="approvals-tab"
          style={{
            padding: '12px 24px',
            fontWeight: '500',
            color: activeTab === 'approvals' ? '#1890ff' : '#8c8c8c',
            backgroundColor: activeTab === 'approvals' ? 'white' : 'transparent',
            flex: 1,
            textAlign: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('approvals')}
        >
          Approvals
        </div>

        </div>
      </div>

      {/* Activities Tab Content */}
      {activeTab === 'activities' && (
        <div>
          <div 
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px'
            }}
          >
            <div 
              className="gba:activities-title" 
              style={{ fontSize: '18px', fontWeight: '500' }}
            >
              Activities
            </div>
            <AppAction
              contextsArray={[FlowContextName.customerActivityCreate]}
              externalContextData={{ 
                accountId,
                account: accountId,
                salesActivity: { account: accountId }
              }}
              prefixDataTestId="account-add-activity"
              accessToken={context.accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button 
                type="primary"
                icon={<PlusCircleOutlined />}
                data-testid="add-activity-button"
              >
                Add Activity
              </Button>
            </AppAction>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {activitiesLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
              </div>
            )}

            {activitiesError && (
              <Alert
                message="Error Loading Activities"
                description={activitiesError}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
                action={
                  <Button size="small" onClick={loadActivities}>
                    Retry
                  </Button>
                }
              />
            )}

            {!activitiesLoading && !activitiesError && activities.length === 0 && (
              <Empty
                description="No activities yet"
                style={{ padding: '40px 0' }}
                data-testid="empty-activities"
              >
                <Button 
                  type="primary" 
                  icon={<PlusCircleOutlined />} 
                  onClick={handleAddActivity}
                >
                  Add First Activity
                </Button>
              </Empty>
            )}

            {!activitiesLoading && !activitiesError && activities.length > 0 && (
              <Timeline>
                {activities.map((activity, index) => (
                  <Timeline.Item key={activity.id || index} color="blue">
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: '16px', color: '#1f2937' }}>
                          {activity.title}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">
                          {dayjs(activity.occurredAt || activity.createdAt).format('MMM D, YYYY [at] h:mm A')} - {activity.ownerEmployee 
                            ? (activity.ownerEmployee.displayName || activity.ownerEmployee.fullName || `${activity.ownerEmployee.firstName || ''} ${activity.ownerEmployee.lastName || ''}`.trim() || 'Unknown User')
                            : (activity.createdBy || 'Unknown User')}
                        </Text>
                      </div>
                      {getActivityTypeValue(activity.activityType) && (
                        <div style={{ marginTop: '4px', marginBottom: '4px' }}>
                          <span style={{ 
                            backgroundColor: '#f0f0f0', 
                            color: '#333', 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {getActivityTypeValue(activity.activityType)}
                          </span>
                        </div>
                      )}
                      {activity.description && (
                        <div style={{ marginTop: '4px', color: '#374151' }}>
                          {activity.description}
                        </div>
                      )}
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
                        onClick={() => handleDeleteActivity(activity)}
                        data-testid={`delete-activity-${activity.id}`}
                      />
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </div>
        </div>
      )}

      {/* Notes Tab Content */}
      {activeTab === 'notes' && (
        <NotesSection accountId={accountId} context={context} key={notesKey} />
      )}

      {/* Approvals Tab Content */}
      {activeTab === 'approvals' && (
        <div>
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '24px 24px 16px 24px'
            }}
          >
            <div 
              className="gba:approvals-title" 
              style={{ fontSize: '18px', fontWeight: '500' }}
            >
              Approval Tasks
            </div>
            <AppAction
              contextsArray={[FlowContextName.createCustomerTask]}
              externalContextData={{
                accountId,
                // Prefill approval task type so form opens in Approval mode
                typeRef: 'SalesTaskType:v1:APPROVAL',
                // Provide current user id for flow expressions like #{employeeDetails.userId}
                userId: context.userInfo?.id,
                employeeDetails: { userId: context.userInfo?.id },
                // Also provide in psi_taskPayload initial parameters as some flows read from there
                psi_taskPayload: {
                  psi_initialParameters: {
                    employeeDetails: { userId: context.userInfo?.id }
                  }
                }
              }}
              prefixDataTestId="account-approvals"
              accessToken={context.accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                data-testid="request-approval-button"
              >
                Request Approval
              </Button>
            </AppAction>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {approvalTasksLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px', color: '#8c8c8c' }}>
                  Loading approval tasks...
                </div>
              </div>
            )}

            {approvalTasksError && (
              <Alert
                message="Error Loading Approval Tasks"
                description={approvalTasksError}
                type="error"
                showIcon
                action={
                  <Button size="small" onClick={loadApprovalTasks}>
                    Retry
                  </Button>
                }
                style={{ marginBottom: '16px' }}
              />
            )}

            {!approvalTasksLoading && !approvalTasksError && approvalTasks.length === 0 && (
              <Empty
                description="No approval tasks"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                data-testid="empty-approval-tasks"
                style={{ padding: '40px 0' }}
              >
                <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
                  No approval tasks have been created for this account yet.
                </div>
              </Empty>
            )}

            {!approvalTasksLoading && !approvalTasksError && approvalTasks.length > 0 && (
              <Timeline style={{ marginTop: '16px' }}>
                {approvalTasks.map((task, index) => (
                  <Timeline.Item key={task.id || index} color={getPriorityColor(getPriorityValue(task.priority))}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {getTimingTypeIcon(task.timingType)}
                          <Text strong>{task.name || 'Untitled Task'}</Text>
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">
                          {dayjs(task.createdAt).format('MMM D, YYYY [at] h:mm A')} - {getEmployeeDisplayName(task.createdBy || '')}
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
                            {getPriorityValue(task.priority)}
                          </span>
                          <span style={{ 
                            backgroundColor: '#e7f3ff', 
                            color: '#1677ff', 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '12px' 
                          }}>
                            Approval
                          </span>
                          <span style={{
                            background: task.statusRef?.includes('COMPLETED') ? '#f6ffed' : 
                                       task.statusRef?.includes('IN_PROGRESS') ? '#fff7e6' : 
                                       task.statusRef?.includes('OVERDUE') ? '#fff2f0' : '#f0f0f0',
                            color: task.statusRef?.includes('COMPLETED') ? '#52c41a' : 
                                  task.statusRef?.includes('IN_PROGRESS') ? '#fa8c16' : 
                                  task.statusRef?.includes('OVERDUE') ? '#ff4d4f' : '#8c8c8c',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                                                         {task.statusRef?.split(':').pop()?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Open'}
                          </span>
                        </div>
                      </div>
                      <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '4px' }}>
                        <Button 
                          type="text" 
                          icon={<CloseOutlined />} 
                          size="small"
                          style={{ padding: '4px', lineHeight: 1 }}
                          onClick={() => handleDeleteApprovalTask(task)}
                          data-testid={`delete-approval-task-${task.id}`}
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
      )}

      {deletePopup.open && deletePopup.activity ? (
        <ActivityDeletePopup
          isOpen={deletePopup.open}
          onClose={() => setDeletePopup({ open: false })}
          accessToken={context.accessToken}
          activityId={deletePopup.activity!.id}
          activityVersion={deletePopup.activity!.version}
          activityTitle={deletePopup.activity!.title}
          domain="crm"
        />
      ) : null}

      {deleteApprovalPopup.open && deleteApprovalPopup.task ? (
        <DeleteConfirmPopup
          isOpen={deleteApprovalPopup.open}
          onClose={() => setDeleteApprovalPopup({ open: false })}
          accessToken={context.accessToken}
          itemTitle={deleteApprovalPopup.task!.name || 'Approval Task'}
          itemType="task"
          flowContextName={FlowContextName.customerTaskDelete}
          externalContextData={{
            taskId: deleteApprovalPopup.task!.id,
            salesTask: {
              id: deleteApprovalPopup.task!.id,
              version: deleteApprovalPopup.task!.version,
            },
            // Pass only main context id; Flow will resolve the rest
            accountId,
          }}
          onFlowSuccess={() => {
            const id = deleteApprovalPopup.task!.id;
            setApprovalTasks(prev => prev.filter(t => t.id !== id));
            setDeleteApprovalPopup({ open: false });
            message.success('Approval task deleted successfully');
          }}
          onFlowError={() => {
            setDeleteApprovalPopup({ open: false });
            message.error('Failed to delete approval task');
          }}
          data-testid={`delete-approval-task-popup`}
        />
      ) : null}
    </div>
  );
}; 