import React, { useState, useEffect, useRef } from 'react';
import { PlusCircleOutlined, FileTextOutlined, CloseOutlined, EditOutlined, LoadingOutlined, CloudUploadOutlined, RobotOutlined } from '@ant-design/icons';
import { Button, List, Spin, Alert, Empty, message, Timeline, Typography, Modal } from 'antd';
import { Clock, Calendar } from 'lucide-react';
import { startProcess } from '@/common/utils/start-process';
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { NotesSection } from './NotesSection';
import { useGetSalesActivities, SalesActivityData } from '../queries/SalesActivityQueries';
import { useGetSalesTasks, SalesTaskData } from '../queries/SalesTaskQueries';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { LanguageDropdown } from './LanguageDropdown';
import { translateMultipleTexts } from '../utils/translationService';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { useAiSummary } from '../hooks/useAiSummary';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useSalesManagerEmployees } from '../../opportunity-record/hooks/useSalesManagerEmployees';

const { Text } = Typography;

interface ActivityTimelineProps {
  leadId?: string;
  context: BusinessAppContextProps;
}

interface TranslatedActivity extends SalesActivityData {
  translatedTitle?: string;
  translatedDescription?: string;
  isTranslating?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ leadId, context }) => {
  // Read initial tab from URL parameters
  const getInitialTab = (): 'activities' | 'notes' | 'approvals' | 'ai-summary' => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'activities' || tabParam === 'notes' || tabParam === 'approvals' || tabParam === 'ai-summary') {
      return tabParam as 'activities' | 'notes' | 'approvals' | 'ai-summary';
    }
    return 'activities';
  };

  const [activeTab, setActiveTab] = useState<'activities' | 'notes' | 'approvals' | 'ai-summary'>(getInitialTab);
  const [activities, setActivities] = useState<TranslatedActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [notesKey, setNotesKey] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('Original');
  const [translating, setTranslating] = useState(false);
  const [approvalTasks, setApprovalTasks] = useState<SalesTaskData[]>([]);
  const [approvalTasksLoading, setApprovalTasksLoading] = useState(false);
  const [approvalTasksError, setApprovalTasksError] = useState<string | null>(null);
  const originalActivitiesRef = useRef<SalesActivityData[]>([]);

  const { fetchSalesActivities } = useGetSalesActivities(context);
  const { fetchSalesTasks } = useGetSalesTasks(context);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const graphqlClient = useGraphQLClient(context.accessToken);
  const { salesManagers } = useSalesManagerEmployees(context.accessToken);
  const { generateSummary, state: aiSummaryState } = useAiSummary(leadId || '', context.accessToken);

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

  // Function to update tab and URL
  const updateActiveTab = (newTab: 'activities' | 'notes' | 'approvals' | 'ai-summary') => {
    setActiveTab(newTab);

    // Update URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.replaceState({}, '', url.toString());
  };

  const loadActivities = async () => {
    if (!leadId) return;

    setActivitiesLoading(true);
    setActivitiesError(null);

    try {
      const result = await fetchSalesActivities({ leadId });
      // Sort activities by createdAt in descending order (newest first)
      const sortedActivities = (result.SalesActivity || []).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Store original activities for translation reference
      originalActivitiesRef.current = sortedActivities;
      setActivities(sortedActivities);
    } catch (err) {
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
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

        // Translate all texts at once
        const translatedTexts = await translateMultipleTexts(textsToTranslate, selectedLanguage, context.accessToken);

        // Create translated activities based on original activities
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
        // Fallback to original activities
        setActivities(originalActivities);
      } finally {
        setTranslating(false);
      }
    };

    if (activeTab === 'activities') {
      translateActivities();
    }
  }, [selectedLanguage, activeTab, context.accessToken]);

  const loadApprovalTasks = async () => {
    if (!leadId) return;

    setApprovalTasksLoading(true);
    setApprovalTasksError(null);

    try {
      const result = await fetchSalesTasks({ leadId });
      
      // Filter for approval tasks only - check both possible field structures
      let approvalTasks = (result.SalesTask || []).filter(task => {
        // Check both type.value (catalog reference) and direct typeRef fields
        const taskTypeValue = task.type?.value;
        const typeRef = task.typeRef;
        
        return (
          // Check type.value field (catalog reference)
          (taskTypeValue && taskTypeValue.toLowerCase() === 'approval') ||
          // Check direct typeRef field for various formats
          (typeRef && (
            typeRef.toLowerCase() === 'approval' ||
            typeRef === 'SalesTaskType:v1:APPROVAL' ||
            typeRef === 'SalesTaskType:v1:APPROVAL'
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
                return { ...task, creatorEmployee: employee };
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

  const refreshNotes = () => {
    // Force NotesSection to re-render by updating the key
    setNotesKey(prev => prev + 1);
  };

  useEffect(() => {
    if (activeTab === 'activities') {
      loadActivities();
    } else if (activeTab === 'approvals') {
      loadApprovalTasks();
    }
  }, [leadId, activeTab]);

  // Listen for URL parameter changes (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab();
      if (newTab !== activeTab) {
        setActiveTab(newTab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTab]);

  // Add focus event listener to refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window gained focus, refreshing data...');
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
  }, [activeTab, leadId]);

  // Listen for process completion events and postMessage events
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

    // Listen for postMessage events from document upload form
    const handlePostMessage = (event: MessageEvent) => {
      try {
        console.log('PostMessage event received:', event.data);
        if (event.data?.type === 'CRM_DOCUMENT_UPLOADED' && event.data?.leadId === leadId) {
          // Refresh documents when a document is uploaded
          console.log('Refreshing documents from postMessage...');
          // loadDocuments(); // This line is removed as per the edit hint
        }
      } catch (err) {
        console.error('Error handling postMessage:', err);
      }
    };

    // Universal event listener to capture all events
    const handleAllEvents = (event: any) => {
      if (event.type && event.type.includes('process') || event.type && event.type.includes('task')) {
        console.log('Detected process/task event:', event.type, event);
        handleProcessCompletion(event);
      }
    };

    // Listen to multiple possible event names
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

    // Add a universal listener for debugging
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function (event: Event) {
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
      window.removeEventListener('message', handlePostMessage);

      // Restore original dispatchEvent
      window.dispatchEvent = originalDispatchEvent;
    };
  }, [leadId]);

  const handleAddActivity = () => {
    if (leadId) {
      // Store current tab to preserve state
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', 'activities');

      startProcess({
        domain: 'customer-relations',
        processName: 'saveSalesActivity',
        payload: {
          leadId,
          returnUrl: currentUrl.toString()
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleDeleteActivity = (activity: SalesActivityData) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the activity "${activity.title}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post('/customer-relations/saveSalesActivity', {
            changeMode: "DELETE",
            salesActivity: {
              id: activity.id,
              version: activity.version,
              lead: leadId
            }
          }, {
            headers: { Authorization: `Bearer ${context.accessToken}` }
          });

          // Remove the activity from both states
          setActivities(prevActivities =>
            prevActivities.filter(a => a.id !== activity.id)
          );

          // Also remove from original activities ref
          originalActivitiesRef.current = originalActivitiesRef.current.filter(a => a.id !== activity.id);

          message.success('Activity deleted successfully');
        } catch (error) {
          console.error('Error deleting activity:', error);
          message.error('Failed to delete activity');
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

  const handleUpdateTask = (task: SalesTaskData) => {
    startProcess({
      domain: 'customer-relations',
      processName: 'saveSalesTask',
      payload: {
        leadId: leadId,
        typeRef: task.typeRef || 'SalesTaskType:v1:APPROVAL',
        taskData: task // Pass existing task data for update mode
      },
      builderType: 'NATIVE_SCREEN',
    });
  };

  const handleDeleteTask = (task: SalesTaskData) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the approval task "${task.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post('/customer-relations/saveSalesTask', {
            changeMode: "DELETE",
            salesTask: {
              id: task.id,
              version: task.version,
              leadId: leadId
            }
          }, {
            headers: { Authorization: `Bearer ${context.accessToken}` }
          });
          setApprovalTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
          message.success('Approval task deleted successfully');
        } catch (error) {
          console.error('Error deleting approval task:', error);
          message.error('Failed to delete approval task');
        }
      },
    });
  };

  const getEmployeeDisplayNameFromObject = (employee: any): string => {
    if (!employee) return 'Unknown User';
    if (typeof employee === 'string') return employee; // Changed from getEmployeeDisplayName
    return employee.displayName || employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.id || 'Unknown User';
  };

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

  const handleRequestApproval = () => {
    if (leadId) {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveSalesTask',
        payload: {
          leadId,
          typeRef: 'SalesTaskType:v1:APPROVAL', // Correct catalog format
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
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
            onClick={() => updateActiveTab('activities')}
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
            onClick={() => updateActiveTab('notes')}
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
            onClick={() => updateActiveTab('approvals')}
          >
            Approvals
          </div>
          <div
            className={`gba:activity-tab${activeTab === 'ai-summary' ? '-active' : ''}`}
            data-testid="ai-summary-tab"
            style={{
              padding: '12px 24px',
              fontWeight: '500',
              color: activeTab === 'ai-summary' ? '#1890ff' : '#8c8c8c',
              backgroundColor: activeTab === 'ai-summary' ? 'white' : 'transparent',
              flex: 1,
              textAlign: 'center',
              cursor: 'pointer'
            }}
            onClick={() => updateActiveTab('ai-summary')}
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
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              onClick={handleAddActivity}
              data-testid="add-activity-button"
            >
              Add Activity
            </Button>
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
                          {dayjs(activity.createdAt).format('MMM D, YYYY [at] h:mm A')} - {getEmployeeDisplayNameFromObject(activity.createdBy)}
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
        <NotesSection key={notesKey} leadId={leadId} context={context} />
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
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              onClick={handleRequestApproval}
              data-testid="request-approval-button"
            >
              Request Approval
            </Button>
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
                style={{ marginBottom: '16px' }}
                action={
                  <Button size="small" onClick={loadApprovalTasks}>
                    Retry
                  </Button>
                }
              />
            )}

            {!approvalTasksLoading && !approvalTasksError && approvalTasks.length === 0 && (
              <Empty
                description="No approval tasks"
                style={{ padding: '40px 0' }}
                data-testid="empty-approval-tasks"
              >
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  No approval tasks have been created for this lead yet.
                </div>
              </Empty>
            )}

            {!approvalTasksLoading && !approvalTasksError && approvalTasks.length > 0 && (
              <Timeline>
                {approvalTasks.map((task) => (
                  <Timeline.Item
                    key={task.id}
                    dot={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    style={{ position: 'relative' }}
                  >
                    <div style={{ paddingRight: '40px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {getTimingTypeIcon(task.timingType)}
                          <Text strong style={{ fontSize: '16px' }}>{task.name}</Text>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span
                            style={{
                              background: '#e6f7ff',
                              color: '#1890ff',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            Approval
                          </span>
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
                            {task.priority?.value || 'Normal'}
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
                            {task.statusRef?.split(':').pop()?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Open'}
                          </span>
                        </div>
                      </div>
                      <div style={{ marginBottom: '4px' }}>
                        <Text type="secondary">
                          {dayjs(task.createdAt).format('MMM D, YYYY [at] h:mm A')}
                          {' - '}
                                                     Created by {task.creatorEmployee 
                             ? getEmployeeDisplayNameFromObject(task.creatorEmployee) 
                             : task.createdBy || 'Unknown User'}
                        </Text>
                      </div>
                      {task.assignedEmployee && (
                        <div style={{ marginBottom: '4px' }}>
                          <Text type="secondary">
                                                         Assigned to: {getEmployeeDisplayNameFromObject(task.assignedEmployee)}
                          </Text>
                        </div>
                      )}
                      {task.dueDate && (
                        <div style={{ marginBottom: '4px' }}>
                          <Text type="secondary">
                            Due: {dayjs(task.dueDate).format('MMM D, YYYY [at] h:mm A')}
                          </Text>
                        </div>
                      )}
                      {task.description && (
                        <div style={{ marginTop: '8px' }}>
                          <Text>{task.description}</Text>
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '4px' }}>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        size="small"
                        style={{ padding: '4px', lineHeight: 1 }}
                        onClick={() => handleUpdateTask(task)}
                        data-testid={`update-task-${task.id}`}
                        title="Update Task"
                      />
                      <Button
                        type="text"
                        icon={<CloseOutlined />}
                        size="small"
                        style={{ padding: '4px', lineHeight: 1 }}
                        onClick={() => handleDeleteTask(task)}
                        data-testid={`delete-approval-task-${task.id}`}
                        title="Delete Task"
                      />
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </div>
        </div>
      )}

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
              type="primary"
              icon={<RobotOutlined />}
              onClick={generateSummary}
              loading={aiSummaryState?.type === 'loading'}
              data-testid="generate-summary-button"
            >
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
                  <Button size="small" onClick={generateSummary}>
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
                  Click "Generate Summary" to create an AI-powered summary of this lead
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
                              {String(insight)}
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