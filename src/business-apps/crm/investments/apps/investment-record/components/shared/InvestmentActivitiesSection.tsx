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

  const originalActivitiesRef = useRef<InvestmentActivity[]>([]);

  const { fetchInvestmentActivitiesByInvestmentId } = useGetInvestmentActivitiesByInvestmentId(context);
  const { fetchInvestmentTasksByInvestmentId } = useGetInvestmentTasksByInvestmentId(context);
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
      const tasksData = await fetchInvestmentTasksByInvestmentId(investmentId);
      // Filter for approval tasks
      const approvals = tasksData.filter(task => 
        task.taskType?.value?.toLowerCase().includes('approval') ||
        task.taskType?.code?.toLowerCase().includes('approval')
      );
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

  // Handler for Request Approval button
  const handleRequestApproval = () => {
    if (!investmentId) {
      message.error('Investment ID is required to request approval');
      return;
    }

    try {
      startProcess({
        domain: 'investments',
        processName: 'createInvestmentTask',
        payload: {
          investmentId: investmentId,
          typeRef: 'InvestmentTaskType:v1:APPROVAL',
        },
        builderType: 'NATIVE_SCREEN',
      });
    } catch (error) {
      console.error('Error starting approval request process:', error);
      message.error('Failed to start approval request process');
    }
  };

  // Load data when component mounts or investmentId changes
  useEffect(() => {
    if (activeTab === 'activities') {
      loadActivities();
    } else if (activeTab === 'approvals') {
      loadApprovalTasks();
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
                <div>
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
                externalContextData={{ investmentId: investmentId }}
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
              <Button
                variant="default"
                onClick={handleRequestApproval}
                data-testid="request-approval-button"
              >
                <PlusCircleOutlined />
                Request Approval
              </Button>
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


    </div>
  );
};

export default InvestmentActivitiesSection;
