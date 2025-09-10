import React, { useState, useEffect, useRef } from 'react';
import { PlusCircleOutlined, CloseOutlined, LoadingOutlined, RobotOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { List, Spin, Alert, Empty, message, Timeline, Typography } from 'antd';
import { Button } from '@newwork/nw-design-system';
import { startProcess } from '@/common/utils/start-process';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { NotesSection } from './NotesSection';
import { useGetInvestmentActivities } from '@/common/data/investment/hooks/useInvestmentActivities';
import type { InvestmentActivity as SalesActivityData } from '@/common/data/investment/types';

import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { LanguageDropdown } from './LanguageDropdown';
import { translateMultipleTexts } from '../utils/translationService';
import { useAiSummary } from '../hooks/useAiSummary';
import { useSalesManagerEmployees } from '../hooks/useSalesManagerEmployees';
import { useGetInvestmentTasksByOpportunityId } from '@/common/data/investment/hooks/useInvestmentOpportunities';
import { InvestmentTask } from '@/common/data/investment/types';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { ActivityDeletionPopup } from '@/common/components';

const { Text } = Typography;

interface ActivityTimelineProps {
  opportunityId: string;
  context: BusinessAppContextProps;
}

interface TranslatedActivity extends SalesActivityData {
  translatedTitle?: string;
  translatedDescription?: string;
  isTranslating?: boolean;
}

const getEmployeeDisplayNameFromObject = (employee: any): string => {
  if (!employee) return 'Unknown User';
  if (typeof employee === 'string') return employee;
  return employee.displayName || employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.id || 'Unknown User';
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ opportunityId, context }) => {
  const [activeTab, setActiveTab] = useState<'activities' | 'notes' | 'approvals' | 'ai-summary'>('activities');
  const [activities, setActivities] = useState<TranslatedActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [approvalTasks, setApprovalTasks] = useState<InvestmentTask[]>([]);
  const [approvalTasksLoading, setApprovalTasksLoading] = useState(false);
  const [approvalTasksError, setApprovalTasksError] = useState<string | null>(null);

  const [notesKey, setNotesKey] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('Original');
  const [translating, setTranslating] = useState(false);
  const originalActivitiesRef = useRef<SalesActivityData[]>([]);

  const { fetchInvestmentActivities } = useGetInvestmentActivities(context);
  const { fetchInvestmentTasksByOpportunityId } = useGetInvestmentTasksByOpportunityId(context);
  const { error: salesManagersError } = useSalesManagerEmployees(context.accessToken);
  const graphqlClient = useGraphQLClient(context.accessToken);

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const { state: aiSummaryState, generateSummary } = useAiSummary(opportunityId, context.accessToken);

  // Listen for process completion to refetch approval tasks
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed successfully, refreshing approval tasks');
      if (activeTab === 'approvals') {
        loadApprovalTasks();
      }
    },
    onFailure: () => {
      console.log('Process failed');
      message.error('Failed to create approval task');
    }
  });

  const loadActivities = async () => {
    if (!opportunityId) return;

    setActivitiesLoading(true);
    setActivitiesError(null);

    try {
      const result = await fetchInvestmentActivities({ opportunityId });
      // Sort activities by occurredAt in descending order (newest first), fallback to createdAt
      const sortedActivities = (result.InvestmentActivity || []).sort((a, b) => {
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

      // Store original activities for translation reference
      originalActivitiesRef.current = enhancedActivities;
      setActivities(enhancedActivities);
    } catch (err) {
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadApprovalTasks = async () => {
    if (!opportunityId) return;

    setApprovalTasksLoading(true);
    setApprovalTasksError(null);

    try {
      const result = await fetchInvestmentTasksByOpportunityId(opportunityId);
      
      // Filter for approval tasks only - check both possible field structures
      let approvalTasks = (result || []).filter(task => {
        // Check both type.value (catalog reference) and direct typeRef fields
        const taskTypeValue = task.type?.value;
        const typeRef = task.typeRef;
        
        return (
          // Check type.value field (catalog reference)
          (taskTypeValue && taskTypeValue.toLowerCase() === 'approval') ||
          // Check direct typeRef field for various formats
          (typeRef && (
            typeRef.toLowerCase() === 'approval' ||
            typeRef === 'InvestmentTaskType:v1:APPROVAL'
          ))
        );
      });

      // Fetch creator employee information for tasks where creatorEmployee is null
      const enhancedTasks = await Promise.all(
        approvalTasks.map(async (task) => {
          if (!task.creatorEmployee && task.createdBy) {
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
              
              const employeeResult = await graphqlClient.request(employeeQuery, { userId: task.createdBy });
              const employee = employeeResult?.Employee?.[0];
              
              if (employee) {
                return {
                  ...task,
                  creatorEmployee: employee
                };
              }
            } catch (error) {
              console.warn('Failed to fetch creator employee for task:', task.id, error);
            }
          }
          return task;
        })
      );
      
      setApprovalTasks(enhancedTasks);
    } catch (err) {
      setApprovalTasksError(err instanceof Error ? err.message : 'Failed to load approval tasks');
    } finally {
      setApprovalTasksLoading(false);
    }
  };

  // Handle language change and translate activities
  useEffect(() => {
    const translateActivities = async () => {
      const originalActivities = originalActivitiesRef.current;

      if (selectedLanguage === 'Original' || originalActivities.length === 0) {
        // Reset to original text for Original language or no activities
        setActivities(originalActivities);
        return;
      }

      setTranslating(true);

      try {
        // Collect all text to translate from original activities
        const textsToTranslate: string[] = [];
        const activityMapping: Array<{ activityIndex: number, titleIndex: number, descriptionIndex: number }> = [];

        originalActivities.forEach((activity, activityIndex) => {
          const titleIndex = textsToTranslate.length;
          textsToTranslate.push(activity.title);

          const descriptionIndex = textsToTranslate.length;
          textsToTranslate.push(activity.description);

          activityMapping.push({ activityIndex, titleIndex, descriptionIndex });
        });

        const translatedTexts = await translateMultipleTexts(textsToTranslate, selectedLanguage, context.accessToken);

        const translatedActivities: TranslatedActivity[] = originalActivities.map((originalActivity, activityIndex) => {
          const mapping = activityMapping[activityIndex];
          return {
            ...originalActivity,
            translatedTitle: translatedTexts[mapping.titleIndex],
            translatedDescription: translatedTexts[mapping.descriptionIndex],
            isTranslating: false
          };
        });

        setActivities(translatedActivities);
      } catch (err) {
        console.error('Translation error:', err);
        message.error('Failed to translate activities');
        setActivities(originalActivities);
      } finally {
        setTranslating(false);
      }
    };

    if (activeTab === 'activities') {
      translateActivities();
    }
  }, [selectedLanguage, activeTab, context.accessToken]);



  const refreshNotes = () => {
    setNotesKey(prev => prev + 1);
  };

  useEffect(() => {
    if (activeTab === 'activities') {
      loadActivities();
    } else if (activeTab === 'approvals') {
      loadApprovalTasks();
    }
  }, [opportunityId, activeTab]);

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === 'activities') {
        loadActivities();
      } else if (activeTab === 'approvals') {
        loadApprovalTasks();
      }
      refreshNotes();
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
  }, [activeTab, opportunityId]);

  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          loadActivities();
          loadApprovalTasks();
          refreshNotes();

          return
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };

    const handlePostMessage = (event: MessageEvent) => {
      try {
        if (event.data?.type === 'CRM_DOCUMENT_UPLOADED' && event.data?.opportunityId === opportunityId) {
          // Documents are now handled in the separate documents tab
        }
      } catch (err) {
        console.error('Error handling postMessage:', err);
      }
    };

    const handleAllEvents = (event: any) => {
      if (event.type && event.type.includes('process') || event.type && event.type.includes('task')) {
        handleProcessCompletion(event);
      }
    };

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

    window.addEventListener('message', handlePostMessage);

    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function (event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        handleAllEvents(event);
      }
      return originalDispatchEvent.call(this, event);
    };

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
      window.removeEventListener('message', handlePostMessage);

      window.dispatchEvent = originalDispatchEvent;
    };
  }, [opportunityId]);

  

  // Request approval handled by AppAction component



  const [deletePopup, setDeletePopup] = useState<{ open: boolean; activity?: SalesActivityData }>({ open: false });

  const handleDeleteActivity = (activity: SalesActivityData) => {
    setDeletePopup({ open: true, activity });
  };

  const handleDeleteTask = (task: InvestmentTask) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the approval task "${task.name}"?`,
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
              opportunity: opportunityId
            }
          }, {
            headers: { Authorization: `Bearer ${context.accessToken}` }
          });

          // Remove the task from state
          setApprovalTasks(prevTasks =>
            prevTasks.filter(t => t.id !== task.id)
          );

          message.success('Approval task deleted successfully');
        } catch (error) {
          console.error('Error deleting approval task:', error);
          message.error('Failed to delete approval task');
        }
      },
    });
  };

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
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
          <div
            style={{
              padding: '12px 24px',
              fontWeight: '500',
              color: activeTab === 'ai-summary' ? '#1890ff' : '#8c8c8c',
              backgroundColor: activeTab === 'ai-summary' ? 'white' : 'transparent',
              flex: 1,
              textAlign: 'center',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('ai-summary')}
          >
            AI Summary
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                className="gba:activities-title"
                style={{ fontSize: '18px', fontWeight: '500' }}
              >
                Activities
              </div>
              <LanguageDropdown
                selectedLanguage={selectedLanguage}
                onChange={handleLanguageChange}
              />
              {translating && (
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />}
                  size="small"
                />
              )}
            </div>
            <AppAction
              contextsArray={[FlowContextName.createInvestmentActivity]}
              externalContextData={{ 
                opportunityId, 
                opportunity: opportunityId,
                investmentActivity: { opportunity: opportunityId }
              }}
              prefixDataTestId="add-activity"
              accessToken={context.accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button
                variant="default"
                data-testid="add-activity-button"
              >
                <PlusCircleOutlined />
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
                  <Button size="sm" onClick={loadActivities}>
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
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  Start by adding your first activity
                </div>
              </Empty>
            )}

            {!activitiesLoading && !activitiesError && activities.length > 0 && (
              <Timeline>
                {activities.map((activity, index) => (
                  <Timeline.Item key={activity.id || index} color="blue">
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>
                          {activity.translatedTitle || activity.title}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">
                          {dayjs(activity.occurredAt || activity.createdAt).format('MMM D, YYYY [at] h:mm A')} - {activity.ownerEmployee 
                            ? getEmployeeDisplayNameFromObject(activity.ownerEmployee) 
                            : activity.createdBy || 'Unknown User'}
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
                      <div style={{ marginTop: '4px' }}>
                        <div>{activity.translatedDescription || activity.description}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          padding: '4px',
                          lineHeight: 1
                        }}
                        onClick={() => handleDeleteActivity(activity)}
                        data-testid={`delete-activity-${activity.id}`}
                      >
                        <CloseOutlined />
                      </Button>
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
        <NotesSection key={notesKey} opportunityId={opportunityId} context={context} />
      )}

      {/* Approvals Tab Content */}
      {activeTab === 'approvals' && (
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
              className="gba:approvals-title"
              style={{ fontSize: '18px', fontWeight: '500' }}
            >
              Approval Tasks
            </div>
            <AppAction
              contextsArray={[FlowContextName.investmentTaskCreate]}
              externalContextData={{
                opportunityId,
                typeRef: 'InvestmentTaskType:v1:APPROVAL'
              }}
              prefixDataTestId="irm-opportunity-approvals"
              accessToken={context.accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button
                variant="default"
                data-testid="request-approval-button"
              >
                <CheckCircleOutlined />
                Request Approval
              </Button>
            </AppAction>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {approvalTasksLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
              </div>
            )}

            {approvalTasksError && (
              <Alert
                message="Error Loading Approval Tasks"
                description={approvalTasksError}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            {!approvalTasksLoading && !approvalTasksError && approvalTasks.length === 0 && (
              <Empty
                description="No approval tasks found"
                style={{ padding: '40px 0' }}
              />
            )}

            {!approvalTasksLoading && !approvalTasksError && approvalTasks.length > 0 && (
              <Timeline>
                {approvalTasks.map((task, index) => (
                  <Timeline.Item key={task.id || index} color="blue">
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>
                          {task.name}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">
                          {dayjs(task.createdAt).format('MMM D, YYYY [at] h:mm A')} - {
                            task.creatorEmployee 
                              ? (task.creatorEmployee.displayName || 
                                 task.creatorEmployee.fullName || 
                                 `${task.creatorEmployee.firstName || ''} ${task.creatorEmployee.lastName || ''}`.trim() || 
                                 'Unknown Employee')
                              : task.createdBy
                          }
                        </Text>
                      </div>
                      <div style={{ marginTop: '4px', marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {task.priority?.value && (
                          <span style={{
                            backgroundColor: '#f0f0f0',
                            color: '#333',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {task.priority.value} priority
                          </span>
                        )}
                        <span style={{
                          backgroundColor: '#e6f7ff',
                          color: '#1890ff',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          Approval
                        </span>
                        {task.assignedEmployee && (
                          <span style={{
                            backgroundColor: '#f6ffed',
                            color: '#52c41a',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            Assigned to: {task.assignedEmployee.displayName || task.assignedEmployee.fullName || `${task.assignedEmployee.firstName || ''} ${task.assignedEmployee.lastName || ''}`.trim() || 'Unknown Employee'}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <div style={{ marginTop: '4px' }}>
                          <div>{task.description}</div>
                        </div>
                      )}
                                             {task.dueDate && (
                         <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                           Due: {dayjs(task.dueDate).format('MMM D, YYYY')}
                         </div>
                       )}
                       <Button
                         variant="ghost"
                         size="sm"
                         style={{
                           position: 'absolute',
                           right: 0,
                           top: 0,
                           padding: '4px',
                           lineHeight: 1
                         }}
                         onClick={() => handleDeleteTask(task)}
                         data-testid={`delete-approval-task-${task.id}`}
                       >
                         <CloseOutlined />
                       </Button>
                     </div>
                   </Timeline.Item>
                ))}
              </Timeline>
            )}

            {salesManagersError && (
              <Alert
                message="Warning"
                description={`Error loading sales managers: ${salesManagersError}. Approval requests may not work properly.`}
                type="warning"
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </div>
        </div>
      )}

      {deletePopup.open && deletePopup.activity ? (
        <ActivityDeletionPopup
          isOpen={deletePopup.open}
          onClose={() => setDeletePopup({ open: false })}
          accessToken={context.accessToken}
          activityId={deletePopup.activity!.id}
          activityVersion={deletePopup.activity!.version}
          activityTitle={deletePopup.activity!.title}
          opportunityId={opportunityId}
          domain="investments"
          onSuccess={() => {
            setActivities(prev => prev.filter(a => a.id !== deletePopup.activity!.id));
            originalActivitiesRef.current = originalActivitiesRef.current.filter(a => a.id !== deletePopup.activity!.id);
            message.success('Activity deleted successfully');
          }}
          onError={() => {
            message.error('Failed to delete activity');
          }}
        />
      ) : null}

      {/* Documents functionality moved to separate Documents tab */}

      {/* AI Summary Tab Content */}
      {activeTab === 'ai-summary' && (
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
              className="gba:ai-summary-title"
              style={{ fontSize: '18px', fontWeight: '500' }}
            >
              AI Summary
            </div>
            <Button
              variant="default"
              onClick={generateSummary}
              loading={aiSummaryState?.type === 'loading'}
              data-testid="generate-summary-button"
            >
              <RobotOutlined />
              Generate Summary
            </Button>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {aiSummaryState?.type === 'loading' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px', color: '#8c8c8c' }}>
                  Generating AI summary...
                </div>
              </div>
            )}

            {aiSummaryState?.type === 'error' && (
              <Alert
                message="Error Generating Summary"
                description="Failed to generate AI summary. Please try again."
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
                action={
                  <Button size="sm" onClick={generateSummary}>
                    Retry
                  </Button>
                }
              />
            )}

            {!aiSummaryState && (
              <Empty
                description="No summary generated yet"
                style={{ padding: '40px 0' }}
                data-testid="empty-ai-summary"
              >
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  Click "Generate Summary" to create an AI-powered summary of this opportunity
                </div>
              </Empty>
            )}

            {aiSummaryState?.type === 'success' && (
              <div>
                {/* Executive Summary */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    marginBottom: '12px',
                    color: '#262626'
                  }}>
                    Executive Summary
                  </div>
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#595959',
                    backgroundColor: '#fafafa',
                    padding: '16px',
                    borderRadius: '6px',
                    border: '1px solid #f0f0f0'
                  }}>
                    {aiSummaryState.content.summary}
                  </div>
                </div>

                {/* Key Insights */}
                {aiSummaryState.content.keyInsights && aiSummaryState.content.keyInsights.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      marginBottom: '12px',
                      color: '#262626'
                    }}>
                      Key Insights & Next Steps
                    </div>
                    <List
                      dataSource={aiSummaryState.content.keyInsights}
                      renderItem={(insight, index) => (
                        <List.Item style={{ padding: '8px 0', border: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{
                              minWidth: '20px',
                              height: '20px',
                              backgroundColor: '#1890ff',
                              color: 'white',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '500',
                              marginTop: '2px'
                            }}>
                              {index + 1}
                            </div>
                            <div style={{
                              fontSize: '14px',
                              lineHeight: '1.5',
                              color: '#595959'
                            }}>
                              {insight}
                            </div>
                          </div>
                        </List.Item>
                      )}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 