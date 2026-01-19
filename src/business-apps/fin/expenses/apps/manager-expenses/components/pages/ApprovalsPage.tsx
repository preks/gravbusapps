import React, { useState, useEffect } from 'react'
import { PageLayout, Toaster } from '@newwork/nw-design-system'
import { PiArrowLeft } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ApprovalRequest, ApprovalTabKey } from '../../types'
import { useFlowExecutionTasks } from '../../hooks/useFlowExecutionTasks'
import { APPROVAL_TABS, getTabByKey, getTabLabel } from '../../constants/approvalTabs'
import ApprovalTable from '../ApprovalTable'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useApprovalTabCounts } from '../../hooks/useApprovalTabCounts'

interface ApprovalsPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void
}

const DATA_TEST_ID_PREFIX = 'approvals-page'

const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ onNavigateBack, ...props }) => {
  const [activeTab, setActiveTab] = useState<ApprovalTabKey>('expense-plan')
  const [selectedTasks, setSelectedTasks] = useState<ApprovalRequest[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)

  // Pagination state per tab
  const [tabPagination, setTabPagination] = useState<
    Record<
      ApprovalTabKey,
      {
        currentPage: number
        pageSize: number
        searchTerm: string
      }
    >
  >({
    'expense-plan': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'expense-request': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'advance-payment': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'handout-payment': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'transfer-payment': { currentPage: 1, pageSize: 20, searchTerm: '' }
  })

  // Tab counts via dedicated hook
  const { tabCounts, isLoadingCounts, refreshTabCounts } = useApprovalTabCounts(props)

  // Get current tab's pagination state
  const currentTabPagination = tabPagination[activeTab]

  const currentTab = getTabByKey(activeTab)

  const { tasks, totalCount, isLoading, error, refresh } = useFlowExecutionTasks(props, {
    currentPage: currentTabPagination.currentPage,
    pageSize: currentTabPagination.pageSize,
    searchTerm: currentTabPagination.searchTerm,
    filterTaskName: currentTab?.processName || null
  })

  // Fetch counts for all tabs on mount (hook handles effect internally, this keeps dependency for clarity)
  useEffect(() => {
    // no-op; hook already loads on mount
  }, [props.accessToken, props.userInfo?.id, refreshTabCounts])

  // Listen for process completion events and refresh data
  useProcessCompletion({
    onSuccess: () => {
      refreshTabCounts() // Refresh badge counts
      refresh() // Refresh the task list
    }
  })

  const handleTabChange = (value: string) => {
    setActiveTab(value as ApprovalTabKey)
    setSelectedTasks([])
    setValidationError(null)
  }

  // Update pagination for current tab
  const updateTabPagination = (updates: Partial<typeof currentTabPagination>) => {
    setTabPagination(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], ...updates }
    }))
  }
  return (
    <div data-testid="approvals-page-container">
      <div className="gba:px-6 gba:pt-6 gba:pb-0">
        <button
          onClick={onNavigateBack}
          className="gba:flex gba:items-center gba:text-foreground gba:hover:text-primary"
          data-testid="approvals-back-button"
        >
          <PiArrowLeft className="gba:mr-2" />
          <span>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.back_to_btn',
              'Back to Dashboard'
            )}
          </span>
        </button>
      </div>

      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.review_approvals',
          'Approvals Review'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.review_subheader',
          'Review and process pending expense approval requests from your team'
        )}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: APPROVAL_TABS.map(tab => {
            const base = getTabLabel(tab.key)
            const count = isLoadingCounts ? '' : ` (${tabCounts[tab.key as ApprovalTabKey] || 0})`
            return {
              value: tab.key,
              label: `${base}${count}`
            }
          })
        }}
        className="gba:min-h-screen"
      >
        <div className="gba:px-6" data-testid="approvals-page">
          <ApprovalTable
            key={activeTab}
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
            dataTestIdPrefix={`${DATA_TEST_ID_PREFIX}-${activeTab}`}
            tabKey={activeTab}
            onApprovalSuccess={() => {
              refresh() // Refresh task list
              refreshTabCounts() // Refresh badge counts
            }}
          />
        </div>
      </PageLayout>
      <Toaster position="bottom-right" />
    </div>
  )
}

export default ApprovalsPage
