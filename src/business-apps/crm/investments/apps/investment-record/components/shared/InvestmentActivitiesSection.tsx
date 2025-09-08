import React, { useState, useEffect, useRef } from 'react';
import { PlusCircleOutlined, FileTextOutlined, CloseOutlined, EditOutlined, LoadingOutlined, CloudUploadOutlined, RobotOutlined } from '@ant-design/icons';
import { List, Spin, Alert, Empty, message, Timeline, Typography, Modal, Button as AntButton } from 'antd';
import { Clock, Calendar } from 'lucide-react';
import { startProcess } from '@/common/utils/start-process';
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { InvestmentNotesSection } from './InvestmentNotesSection';
import { useGetInvestmentActivitiesByInvestmentId } from '../../hooks/useInvestmentActivitiesByInvestmentId';
import { useGetInvestmentTasksByInvestmentId } from '../../hooks/useInvestmentTasksByInvestmentId';
import { useGetInvestmentById } from '@/common/data/investment';
import { useGetInvestmentTasksByAccountId } from '@/common/data/investment/hooks/useInvestmentAccounts';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { formatDate } from '@/common/data/investment';
import { LanguageDropdown } from './LanguageDropdown';
import { translateMultipleTexts } from '../../utils/translationService';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';

import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { InvestmentActivity, InvestmentTask } from '@/common/data/investment/types';
import { AppAction } from '@/components/app-action';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Button } from '@newwork/nw-design-system';
import { ActivityDeletionPopup } from '@/common/components';


const { Text } = Typography;

interface InvestmentActivitiesSectionProps {
  investmentId?: string;
  context: BusinessAppContextProps;
}

interface TranslatedActivity extends InvestmentActivity {
  translatedTitle?: string;
  translatedDescription?: string;
  isTranslating?: boolean;
}

export const InvestmentActivitiesSection: React.FC<InvestmentActivitiesSectionProps> = ({ investmentId, context }) => {
  // Read initial tab from URL parameters
  const getInitialTab = (): 'activities' | 'notes' | 'approvals' => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'activities' || tabParam === 'notes' || tabParam === 'approvals') {
      return tabParam as 'activities' | 'notes' | 'approvals';
    }
    return 'activities';
  };

  const [activeTab, setActiveTab] = useState<'activities' | 'notes' | 'approvals'>(getInitialTab);
  const [activities, setActivities] = useState<TranslatedActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [notesKey, setNotesKey] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('Original');
  const [translating, setTranslating] = useState(false);
  const [approvalTasks, setApprovalTasks] = useState<InvestmentTask[]>([]);
  const [approvalTasksLoading, setApprovalTasksLoading] = useState(false);
  const [approvalTasksError, setApprovalTasksError] = useState<string | null>(null);
  const [accountIdForInvestment, setAccountIdForInvestment] = useState<string | null>(null);

  const originalActivitiesRef = useRef<InvestmentActivity[]>([]);
  const [deletePopup, setDeletePopup] = useState<{ open: boolean; activity?: InvestmentActivity }>({ open: false });

  const { fetchInvestmentActivitiesByInvestmentId } = useGetInvestmentActivitiesByInvestmentId(context);
  const { fetchInvestmentTasksByInvestmentId } = useGetInvestmentTasksByInvestmentId(context);
  const { fetchInvestmentById } = useGetInvestmentById(context);
  const { fetchInvestmentTasksByAccountId } = useGetInvestmentTasksByAccountId(context);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const graphqlClient = useGraphQLClient(context.accessToken);


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
  const updateActiveTab = (newTab: 'activities' | 'notes' | 'approvals') => {
    setActiveTab(newTab);

    // Update URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.replaceState({}, '', url.toString());
  };

  const loadActivities = async () => {
    if (!investmentId) return;

    setActivitiesLoading(true);
    setActivitiesError(null);

    try {
      const activitiesData = await fetchInvestmentActivitiesByInvestmentId(investmentId);
      // Sort activities by createdAt in descending order (newest first)
      const sortedActivities = activitiesData.sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      
      originalActivitiesRef.current = sortedActivities;
      setActivities(sortedActivities);
    } catch (err) {
      console.error('Error fetching investment activities:', err);
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadApprovalTasks = async () => {
    if (!investmentId) return;

    setApprovalTasksLoading(true);
    setApprovalTasksError(null);

    try {
      let tasksData: InvestmentTask[] = [];
      if (accountIdForInvestment) {
        // Mirror account-record behavior: approvals are tied to account
        tasksData = await fetchInvestmentTasksByAccountId(accountIdForInvestment);
      } else {
        tasksData = await fetchInvestmentTasksByInvestmentId(investmentId);
      }
      // Filter for approval tasks (catalog value/code or taskTypeRef)
      const approvals = tasksData.filter(task => {
        const value = task.taskType?.value?.toLowerCase?.();
        const code = task.taskType?.code?.toLowerCase?.();
        const taskTypeRef = (task as any).taskTypeRef as string | undefined;
        const refMatch = taskTypeRef === 'InvestmentTaskType:v1:APPROVAL' || taskTypeRef?.toLowerCase() === 'approval';
        return value === 'approval' || code === 'approval' || refMatch;
      });
      setApprovalTasks(approvals);
    } catch (err) {
      console.error('Error fetching approval tasks:', err);
      setApprovalTasksError(err instanceof Error ? err.message : 'Failed to load approval tasks');
    } finally {
      setApprovalTasksLoading(false);
    }
  };

  // Handler for Add Note button
  const handleAddNote = () => {
    if (!investmentId) {
      message.error('Investment ID is required to create a note');
      return;
    }

    try {
      startProcess({
        domain: 'investments',
        processName: 'createInvestmentNote',
        payload: {
          investmentId: investmentId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    } catch (error) {
      console.error('Error starting note creation process:', error);
      message.error('Failed to start note creation process');
    }
  };

  // Request Approval now handled via AppAction Flow (context-driven)

  // Load data when component mounts or investmentId changes
  useEffect(() => {
    if (activeTab === 'activities') {
      loadActivities();
    } else if (activeTab === 'approvals') {
      // Ensure we know the account of this investment (to mirror account-record behavior)
      (async () => {
        try {
          if (!accountIdForInvestment && investmentId) {
            const res = await fetchInvestmentById(investmentId);
            const accId = res?.investment?.investmentAccount?.id || null;
            setAccountIdForInvestment(accId);
          }
        } finally {
          await loadApprovalTasks();
        }
      })();
    }
  }, [investmentId, activeTab]);

  // Use central formatDate function with custom format for activities
  const formatActivityDate = (dateString: string | null | undefined): string => {
    return formatDate(dateString, 'DD.MM.YYYY HH:mm', 'N/A');
  };

  // Get employee name helper
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'activities':
        if (activitiesLoading) {
          return (
            <div className="gba:flex gba:justify-center gba:py-8">
              <Spin size="large" />
            </div>
          );
        }

        if (activitiesError) {
          return (
            <Alert
              message="Error Loading Activities"
              description={activitiesError}
              type="error"
              showIcon
              action={
                <Button size="small" onClick={loadActivities}>
                  Retry
                </Button>
              }
              style={{ margin: '16px 0' }}
            />
          );
        }

        if (activities.length === 0) {
          return (
            <Empty
              description="No activities found"
              style={{ margin: '40px 0' }}
            />
          );
        }

        return (
          <Timeline mode="left" style={{ marginTop: '16px' }}>
            {activities.map((activity) => (
              <Timeline.Item
                key={activity.id}
                dot={<FileTextOutlined />}
                color="blue"
              >
                <div style={{ position: 'relative' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                    {activity.translatedTitle || activity.title || 'Untitled Activity'}
                  </h4>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {formatActivityDate(activity.occurredAt)} • {getEmployeeDisplayName(activity.ownerEmployee?.id)}
                  </Text>
                  {activity.description && (
                    <p style={{ margin: '8px 0 0 0', color: '#666' }}>
                      {activity.translatedDescription || activity.description}
                    </p>
                  )}
                  <div style={{ position: 'absolute', top: 0, right: 0 }}>
                    <AntButton
                      type="text"
                      icon={<CloseOutlined />}
                      size="small"
                      onClick={() => setDeletePopup({ open: true, activity })}
                      data-testid={`delete-activity-button-${activity.id}`}
                      title="Delete Activity"
                    />
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        );

      case 'notes':
        return (
          <InvestmentNotesSection
            key={notesKey}
            investmentId={investmentId}
            context={context}
            showHeader={false}
          />
        );

      case 'approvals':
        if (approvalTasksLoading) {
          return (
            <div className="gba:flex gba:justify-center gba:py-8">
              <Spin size="large" />
            </div>
          );
        }

        if (approvalTasksError) {
          return (
            <Alert
              message="Error Loading Approvals"
              description={approvalTasksError}
              type="error"
              showIcon
              action={
                <Button size="small" onClick={loadApprovalTasks}>
                  Retry
                </Button>
              }
              style={{ margin: '16px 0' }}
            />
          );
        }

        if (approvalTasks.length === 0) {
          return (
            <Empty
              description="No approval tasks found"
              style={{ margin: '40px 0' }}
            />
          );
        }

        return (
          <Timeline mode="left" style={{ marginTop: '16px' }}>
            {approvalTasks.map((task) => (
              <Timeline.Item
                key={task.id}
                dot={<CheckCircleOutlined />}
                color="green"
              >
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                    {task.name || 'Untitled Task'}
                  </h4>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Due: {formatDate(task.dueDate)} • Assigned: {getEmployeeDisplayName(task.assignedEmployee?.id)}
                  </Text>
                  {task.description && (
                    <p style={{ margin: '8px 0 0 0', color: '#666' }}>
                      {task.description}
                    </p>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        );



      default:
        return null;
    }
  };

  return (
    <div
      className="gba:bg-white gba:rounded-lg gba:shadow-sm gba:border"
      style={{ padding: '20px' }}
      data-testid="investment-activities-section"
    >
      {/* Header with tabs */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            Activity & Information
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {activeTab === 'activities' && (
              <AppAction
                contextsArray={[FlowContextName.createInvestmentActivity]}
                accessToken={context.accessToken}
                externalContextData={{ 
                  investmentId: investmentId,
                  accountId: accountIdForInvestment,
                  investmentData: { investmentAccount: { id: accountIdForInvestment } }
                }}
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
            )}
            {activeTab === 'notes' && (
              <Button
                variant="default"
                onClick={handleAddNote}
                data-testid="add-note-button"
              >
                <PlusCircleOutlined />
                Add Note
              </Button>
            )}
            {activeTab === 'approvals' && (
              <AppAction
                contextsArray={[FlowContextName.investmentTaskCreate]}
                accessToken={context.accessToken}
                externalContextData={{
                  investmentId,
                  investment: investmentId,
                  investmentTask: { investment: investmentId },
                  typeRef: 'InvestmentTaskType:v1:APPROVAL',
                }}
                prefixDataTestId="request-approval"
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
              >
                <Button
                  variant="default"
                  data-testid="request-approval-button"
                >
                  <PlusCircleOutlined />
                  Request Approval
                </Button>
              </AppAction>
            )}

          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {[
              { key: 'activities', label: 'Activities', icon: <FileTextOutlined /> },
              { key: 'notes', label: 'Notes', icon: <EditOutlined /> },
              { key: 'approvals', label: 'Approvals', icon: <CheckCircleOutlined /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => updateActiveTab(tab.key as any)}
                style={{
                  padding: '12px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  borderBottom: activeTab === tab.key ? '2px solid #1890ff' : '2px solid transparent',
                  color: activeTab === tab.key ? '#1890ff' : '#666',
                  fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                }}
                data-testid={`investment-${tab.key}-tab`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      {renderTabContent()}

      {deletePopup.open && deletePopup.activity ? (
        <ActivityDeletionPopup
          isOpen={deletePopup.open}
          onClose={() => setDeletePopup({ open: false })}
          accessToken={context.accessToken}
          activityId={deletePopup.activity!.id}
          activityVersion={typeof (deletePopup.activity as any).version === 'number' ? (deletePopup.activity as any).version : undefined}
          activityTitle={deletePopup.activity?.title || 'Activity'}
          domain="investments"
          onSuccess={() => {
            const id = deletePopup.activity!.id;
            setActivities(prev => prev.filter(a => a.id !== id));
            originalActivitiesRef.current = originalActivitiesRef.current.filter(a => a.id !== id);
            setDeletePopup({ open: false });
            message.success('Activity deleted successfully');
          }}
          onError={() => {
            setDeletePopup({ open: false });
            message.error('Failed to delete activity');
          }}
          data-testid="investment-activity-deletion-popup"
        />
      ) : null}

    </div>
  );
};

export default InvestmentActivitiesSection;
