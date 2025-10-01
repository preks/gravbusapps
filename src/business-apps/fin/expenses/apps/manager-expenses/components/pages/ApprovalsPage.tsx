import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsBadge,
  PageLayout,
} from '@newwork/nw-design-system';
import { Toaster } from 'sonner';
import { PiArrowLeft } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ApprovalRequest, ApprovalTabKey } from '../../types';
import { useFlowExecutionTasks } from '../../hooks/useFlowExecutionTasks';
import { APPROVAL_TABS, getTabByKey, getTabLabel } from '../../constants/approvalTabs';
import ApprovalTable from '../ApprovalTable';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface ApprovalsPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void;
}

const DATA_TEST_ID_PREFIX = 'approvals-page';

const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ onNavigateBack, ...props }) => {
  const [activeTab, setActiveTab] = useState<ApprovalTabKey>('expense-plan');
  const [selectedTasks, setSelectedTasks] = useState<ApprovalRequest[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pagination state per tab
  const [tabPagination, setTabPagination] = useState<
    Record<
      ApprovalTabKey,
      {
        currentPage: number;
        pageSize: number;
        searchTerm: string;
      }
    >
  >({
    'expense-plan': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'expense-request': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'advance-payment': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'handout-payment': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'transfer-payment': { currentPage: 1, pageSize: 20, searchTerm: '' },
  });

  // State for tab counts
  const [tabCounts, setTabCounts] = useState<Record<ApprovalTabKey, number>>({
    'expense-plan': 0,
    'expense-request': 0,
    'advance-payment': 0,
    'handout-payment': 0,
    'transfer-payment': 0,
  });

  // State for loading tab counts
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  // Get current tab's pagination state
  const currentTabPagination = tabPagination[activeTab];

  const currentTab = getTabByKey(activeTab);

  const { tasks, totalCount, isLoading, error } = useFlowExecutionTasks(props, {
    currentPage: currentTabPagination.currentPage,
    pageSize: currentTabPagination.pageSize,
    searchTerm: currentTabPagination.searchTerm,
    filterTaskName: currentTab?.processName || null,
  });

  // Function to refresh tab counts
  const refreshTabCounts = useCallback(async () => {
    if (!props.accessToken) return;

    setIsLoadingCounts(true);
    try {
      const { FlowMetricsClient } = await import('@/common/network/flow-metrics/FlowMetricsClient');
      const flowMetricsClient = new FlowMetricsClient(props.accessToken);

      const countPromises = APPROVAL_TABS.map(async (tab) => {
        try {
          const response = await flowMetricsClient.getFlowExecutionTasks({
            cockpitPage: 'INBOX',
            size: 1,
            page: 0,
            field: 'CREATION_DATE',
            direction: 'DESC',
            filterTaskName: tab.processName,
            ...(props.userInfo?.id && { userId: props.userInfo.id }),
          });
          return { tabKey: tab.key, count: response.totalCount || 0 };
        } catch (error) {
          console.error(`Error fetching count for ${tab.key}:`, error);
          return { tabKey: tab.key, count: 0 };
        }
      });

      const results = await Promise.all(countPromises);
      const newCounts = results.reduce(
        (acc, { tabKey, count }) => {
          acc[tabKey as ApprovalTabKey] = count;
          return acc;
        },
        {} as Record<ApprovalTabKey, number>,
      );

      setTabCounts(newCounts);
    } catch (error) {
      console.error('Error refreshing tab counts:', error);
    } finally {
      setIsLoadingCounts(false);
    }
  }, [props.accessToken, props.userInfo?.id]);

  // Function to refresh all data
  const refreshAllData = useCallback(() => {
    refreshTabCounts();
    // The useFlowExecutionTasks hook will automatically refresh when the component re-renders
  }, [refreshTabCounts]);

  // Fetch counts for all tabs on mount
  useEffect(() => {
    refreshTabCounts();
  }, [props.accessToken, props.userInfo?.id, refreshTabCounts]);

  // Listen for process completion events
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      // Check if this is a process continue event with payload
      if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
        refreshAllData();
        return;
      }

      // Check for other process completion events
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        refreshAllData();
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
      'process-completion',
      'test-approval-event', // Test event
    ];

    eventNames.forEach((eventName) => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });

    // Cleanup function
    return () => {
      eventNames.forEach((eventName) => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
    };
  }, [refreshAllData]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as ApprovalTabKey);
    setSelectedTasks([]);
    setValidationError(null);
  };

  // Update pagination for current tab
  const updateTabPagination = (updates: Partial<typeof currentTabPagination>) => {
    setTabPagination((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], ...updates },
    }));
  };

  return (
    <div data-testid="approvals-page-container">
      <div className="gba:px-6 gba:pt-6 gba:pb-0">
        <button
          onClick={onNavigateBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="approvals-back-button"
        >
          <PiArrowLeft className="gba:mr-2" />
          <span>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.back_to_btn',
              'Back to Dashboard',
            )}
          </span>
        </button>
      </div>

      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.review_approvals',
          'Approvals Review',
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.review_subheader',
          'Review and process pending expense approval requests from your team',
        )}
        className="gba:min-h-screen"
      >
        <div className="gba:px-6" data-testid="approvals-page">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-[100%]">
            <TabsList className="gba:grid gba:w-[100%] gba:grid-cols-5 gba:mb-6">
              {APPROVAL_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  data-testid={`${DATA_TEST_ID_PREFIX}-tab-${tab.key}`}
                  className="gba:flex gba:flex-col gba:items-center gba:gap-1 gba:py-3"
                >
                  <span className="gba:text-sm gba:font-medium">{getTabLabel(tab.key)}</span>
                  <TabsBadge variant="accent" className="gba:text-xs">
                    {isLoadingCounts ? '...' : tabCounts[tab.key as ApprovalTabKey] || 0}
                  </TabsBadge>
                </TabsTrigger>
              ))}
            </TabsList>

            {APPROVAL_TABS.map((tab) => (
              <TabsContent
                key={tab.key}
                value={tab.key}
                data-testid={`${DATA_TEST_ID_PREFIX}-content-${tab.key}`}
                className="gba:mt-0"
              >
                <ApprovalTable
                  {...props}
                  tasks={tasks}
                  totalCount={totalCount}
                  isLoading={isLoading}
                  error={error}
                  currentPage={currentTabPagination.currentPage}
                  setCurrentPage={(page: number) => updateTabPagination({ currentPage: page })}
                  pageSize={currentTabPagination.pageSize}
                  setPageSize={(size: number) => updateTabPagination({ pageSize: size })}
                  selectedTasks={selectedTasks}
                  setSelectedTasks={setSelectedTasks}
                  validationError={validationError}
                  setValidationError={setValidationError}
                  dataTestIdPrefix={`${DATA_TEST_ID_PREFIX}-${tab.key}`}
                  tabKey={tab.key}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </PageLayout>
      <Toaster position="bottom-right" />
    </div>
  );
};

export default ApprovalsPage;
