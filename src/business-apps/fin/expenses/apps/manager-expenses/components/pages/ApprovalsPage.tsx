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
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';

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
    'expense-plan': { currentPage: 1, pageSize: 50, searchTerm: '' },
    'expense-request': { currentPage: 1, pageSize: 50, searchTerm: '' },
    'advance-payment': { currentPage: 1, pageSize: 50, searchTerm: '' },
    'handout-payment': { currentPage: 1, pageSize: 50, searchTerm: '' },
    'transfer-payment': { currentPage: 1, pageSize: 50, searchTerm: '' },
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

  const { tasks, totalCount, isLoading, error, refresh } = useFlowExecutionTasks(props, {
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

      // Fetch count for each tab - for some tabs, fetch both base and StoreDirector variants
      const countPromises = APPROVAL_TABS.map(async (tab) => {
        try {
          const baseParams = {
            cockpitPage: 'INBOX',
            size: 1, // Only need count, not actual tasks
            page: 0,
            field: 'CREATION_DATE',
            direction: 'DESC',
            ...(props.userInfo?.id && { userId: props.userInfo.id }),
          };

          // For these tabs, fetch both base and StoreDirector variants
          const needsVariantFetch = ['approveAdvancePayment', 'approveExpenseRequest', 'approveExpensePlan'].includes(tab.processName);

          if (needsVariantFetch) {
            const [baseResponse, variantResponse] = await Promise.all([
              flowMetricsClient.getFlowExecutionTasks({
                ...baseParams,
                filterTaskName: tab.processName,
              }),
              flowMetricsClient.getFlowExecutionTasks({
                ...baseParams,
                filterTaskName: `${tab.processName}StoreDirector`,
              }),
            ]);

            const baseCount = baseResponse.totalCount || baseResponse.totalElements || 0;
            const variantCount = variantResponse.totalCount || variantResponse.totalElements || 0;
            const totalCount = baseCount + variantCount;

            return { tabKey: tab.key, count: totalCount };
          } else {
            const response = await flowMetricsClient.getFlowExecutionTasks({
              ...baseParams,
              filterTaskName: tab.processName,
            });
            
            const count = response.totalCount || response.totalElements || 0;
            return { tabKey: tab.key, count };
          }
        } catch (error) {
          console.error(`Error counting tasks for ${tab.key}:`, error);
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

  // Fetch counts for all tabs on mount
  useEffect(() => {
    refreshTabCounts();
  }, [props.accessToken, props.userInfo?.id, refreshTabCounts]);

  // Listen for process completion events and refresh data
  useProcessCompletion({
    onSuccess: () => {
      refreshTabCounts(); // Refresh badge counts
      refresh(); // Refresh the task list
    }
  });

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
          className="gba:flex gba:items-center gba:text-primary gba:hover:text-accent"
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
                  onApprovalSuccess={() => {
                    refresh(); // Refresh task list
                    refreshTabCounts(); // Refresh badge counts
                  }}
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
