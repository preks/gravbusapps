import React, { useState, useEffect, useRef } from 'react';
import { PlusCircleOutlined, FileTextOutlined, CloseOutlined, EditOutlined, LoadingOutlined, CloudUploadOutlined, RobotOutlined } from '@ant-design/icons';
import { List, Spin, Alert, Empty, message, Timeline, Typography, Modal } from 'antd';
import { Clock, Calendar } from 'lucide-react';
import { startProcess } from '@/common/utils/start-process';
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { NotesSection } from './NotesSection';
import { useGetInvestmentActivitiesByLeadId } from '@/common/data/investment/hooks/useInvestmentLeads';
import { useGetInvestmentTasksByLeadId } from '@/common/data/investment/hooks/useInvestmentLeads';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { LanguageDropdown } from './LanguageDropdown';
import { translateMultipleTexts } from '../utils/translationService';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { useAiSummary } from '../hooks/useAiSummary';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { InvestmentActivity, InvestmentTask } from '@/common/data/investment/types';
import { AppAction } from '@/components/app-action';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Button } from '@newwork/nw-design-system';

const { Text } = Typography;

interface ActivityTimelineProps {
  leadId?: string;
  context: BusinessAppContextProps;
}

interface TranslatedActivity extends InvestmentActivity {
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
  const [approvalTasks, setApprovalTasks] = useState<InvestmentTask[]>([]);
  const [approvalTasksLoading, setApprovalTasksLoading] = useState(false);
  const [approvalTasksError, setApprovalTasksError] = useState<string | null>(null);
  const originalActivitiesRef = useRef<InvestmentActivity[]>([]);

  const { fetchInvestmentActivitiesByLeadId } = useGetInvestmentActivitiesByLeadId(context);
  const { fetchInvestmentTasksByLeadId } = useGetInvestmentTasksByLeadId(context);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const graphqlClient = useGraphQLClient(context.accessToken);
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
      const activitiesData = await fetchInvestmentActivitiesByLeadId(leadId);
      // Sort activities by createdAt in descending order (newest first)
      const sortedActivities = activitiesData.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setActivities(sortedActivities);
      originalActivitiesRef.current = sortedActivities;
    } catch (error) {
      console.error('Error loading activities:', error);
      setActivitiesError(error instanceof Error ? error.message : 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadApprovalTasks = async () => {
    if (!leadId) return;

    setApprovalTasksLoading(true);
    setApprovalTasksError(null);

    try {
      // For now, show no approval tasks since central investment data doesn't have approval task hooks yet
      setApprovalTasks([]);
      setApprovalTasksError(null);
    } catch (error) {
      console.error('Error loading approval tasks:', error);
      setApprovalTasksError(error instanceof Error ? error.message : 'Failed to load approval tasks');
    } finally {
      setApprovalTasksLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      loadActivities();
      loadApprovalTasks();
    }
  }, [leadId]);

  // Add focus event listener to refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window gained focus, refreshing activities...');
      loadActivities();
      loadApprovalTasks();
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



  const handleAddNote = () => {
    if (leadId) {
      startProcess({
        domain: 'investments',
        processName: 'createInvestmentNote',
        payload: {
          leadId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleAddTask = () => {
    if (leadId) {
      startProcess({
        domain: 'investments',
        processName: 'createInvestmentTask',
        payload: {
          leadId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleDeleteActivity = (activity: InvestmentActivity) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the activity "${activity.title}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post('/investments/saveInvestmentActivity', {
            changeMode: "DELETE",
            investmentActivity: {
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

  const handleUpdateTask = (task: InvestmentTask) => {
    startProcess({
      domain: 'investments',
      processName: 'createInvestmentTask',
      payload: {
        leadId: leadId,
        typeRef: task.taskType?.id || 'InvestmentTaskType:v1:APPROVAL',
        taskData: task // Pass existing task data for update mode
      },
      builderType: 'NATIVE_SCREEN',
    });
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
              lead: leadId
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
    if (typeof employee === 'string') return employee;
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
        domain: 'investments',
        processName: 'createInvestmentTask',
        payload: {
          leadId,
          typeRef: 'InvestmentTaskType:v1:APPROVAL',
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleTabChange = (newTab: 'activities' | 'notes' | 'approvals' | 'ai-summary') => {
    updateActiveTab(newTab);
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
            <AppAction
              contextsArray={[FlowContextName.createInvestmentActivity]}
              accessToken={context.accessToken}
              externalContextData={{ leadId : leadId }}
              prefixDataTestId="add-activity"

              emptyStateBehavior="hide"
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
                      <div style={{ position: 'absolute', top: '0', right: '0' }}>
                        <AppAction
                          contextsArray={[FlowContextName.investmentActivityEntity]}
                          externalContextData={{ leadId, activityId: activity.id }}
                          prefixDataTestId={`edit-activity-${activity.id}`}
                          accessToken={context.accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ marginRight: '4px' }}
                          >
                            <EditOutlined />
                          </Button>
                        </AppAction>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteActivity(activity)}
                        >
                          <CloseOutlined />
                        </Button>
                      </div>
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
              className="gba:notes-title"
              style={{ fontSize: '18px', fontWeight: '500' }}
            >
              Notes
            </div>
            <Button
              variant="default"
              onClick={handleAddNote}
              data-testid="add-note-button"
            >
              <PlusCircleOutlined />
              Add Note
            </Button>
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            <NotesSection
              key={notesKey}
              leadId={leadId}
              context={context}
              showHeader={false}
            />
          </div>
        </div>
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
              variant="default"
              onClick={handleRequestApproval}
              data-testid="request-approval-button"
            >
              <PlusCircleOutlined />
              Request Approval
            </Button>
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
                action={
                  <Button size="sm" onClick={loadApprovalTasks}>
                    Retry
                  </Button>
                }
              />
            )}

            {!approvalTasksLoading && !approvalTasksError && approvalTasks.length === 0 && (
              <Empty
                description="No approval tasks yet"
                style={{ padding: '40px 0' }}
                data-testid="empty-approvals"
              >
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  Start by requesting your first approval
                </div>
              </Empty>
            )}

            {!approvalTasksLoading && !approvalTasksError && approvalTasks.length > 0 && (
              <Timeline>
                {approvalTasks.map((task, index) => (
                  <Timeline.Item
                    key={task.id || index}
                    dot={getTimingTypeIcon(task.taskTiming)}
                    color="green"
                  >
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>
                          {task.name}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">
                          Due: {task.dueDate ? dayjs(task.dueDate).format('MMM D, YYYY') : 'No due date'} - Assigned to: {getEmployeeDisplayNameFromObject(task.assignedEmployee)}
                        </Text>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <div>{task.description}</div>
                      </div>
                      <div style={{ position: 'absolute', top: '0', right: '0' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateTask(task)}
                          style={{ marginRight: '4px' }}
                        >
                          <EditOutlined />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task)}
                        >
                          <CloseOutlined />
                        </Button>
                      </div>
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
              variant="default"
              onClick={() => generateSummary()}
              disabled={aiSummaryState?.type === 'loading'}
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
                 description="Failed to generate summary. Please try again."
                 type="error"
                 showIcon
                 style={{ marginBottom: '16px' }}
                 action={
                   <Button size="sm" onClick={() => generateSummary()}>
                     Retry
                   </Button>
                 }
               />
             )}

             {aiSummaryState?.type === 'success' && aiSummaryState.content?.summary && (
               <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px' }}>
                 <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                   Summary
                 </Text>
                 <div style={{ whiteSpace: 'pre-wrap' }}>
                   {aiSummaryState.content.summary}
                 </div>
               </div>
             )}

             {(!aiSummaryState || (aiSummaryState.type !== 'loading' && aiSummaryState.type !== 'success' && aiSummaryState.type !== 'error')) && (
               <Empty
                 description="No AI summary yet"
                 style={{ padding: '40px 0' }}
                 data-testid="empty-ai-summary"
               >
                 <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                   Generate an AI summary to get insights about this lead
                 </div>
               </Empty>
             )}
          </div>
        </div>
      )}
    </div>
  );
}; 