import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsBadge,
  PageLayout,
} from '@newwork/nw-design-system';
import { PiArrowLeft } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ApprovalRequest, ApprovalTabKey } from '../../types';
import { useFlowExecutionTasks } from '../../hooks/useFlowExecutionTasks';
import { APPROVAL_TABS, getTabByKey } from '../../constants/approvalTabs';
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

  // Debug: Log current tab counts
  console.log('Current tab counts:', tabCounts);

  const { tasks, totalCount, isLoading, error, setFilterProcessName } = useFlowExecutionTasks(
    props,
    {
      currentPage: currentTabPagination.currentPage,
      pageSize: currentTabPagination.pageSize,
      searchTerm: currentTabPagination.searchTerm,
    },
  );

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
            filterProcessName: tab.processName,
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

      console.log('Fetched tab counts:', newCounts);
      setTabCounts(newCounts);
    } catch (error) {
      console.error('Error refreshing tab counts:', error);
    } finally {
      setIsLoadingCounts(false);
    }
  }, [props.accessToken, props.userInfo?.id]);

  // Update filter when tab changes
  useEffect(() => {
    const currentTab = getTabByKey(activeTab);
    if (currentTab) {
      setFilterProcessName(currentTab.processName);
    }
  }, [activeTab, setFilterProcessName]);

  // Fetch counts for all tabs on mount
  useEffect(() => {
    refreshTabCounts();
  }, [props.accessToken, props.userInfo?.id, refreshTabCounts]);

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
          'lowcoder:team_expenses_page.dashboard_tab.pending_approvals',
          'Pending Approvals',
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.review_subheader',
          'Review and process pending expense approval requests from your team',
        )}
        className="gba:min-h-screen"
      >
        <div className="gba:px-6" data-testid="approvals-page">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
            <TabsList className="gba:grid gba:w-full gba:grid-cols-5 gba:mb-6">
              {APPROVAL_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  data-testid={`${DATA_TEST_ID_PREFIX}-tab-${tab.key}`}
                  className="gba:flex gba:flex-col gba:items-center gba:gap-1 gba:py-3"
                >
                  <span className="gba:text-sm gba:font-medium">{tab.label}</span>
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
                  searchTerm={currentTabPagination.searchTerm}
                  setSearchTerm={(term: string) => updateTabPagination({ searchTerm: term })}
                  selectedTasks={selectedTasks}
                  setSelectedTasks={setSelectedTasks}
                  validationError={validationError}
                  setValidationError={setValidationError}
                  dataTestIdPrefix={`${DATA_TEST_ID_PREFIX}-${tab.key}`}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </PageLayout>
    </div>
  );
};

export default ApprovalsPage;
