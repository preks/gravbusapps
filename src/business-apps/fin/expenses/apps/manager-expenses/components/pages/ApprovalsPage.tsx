import React, { useState, useEffect, useCallback } from 'react'
import { PageLayout, Toaster } from '@newwork/nw-design-system'
import { XIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import { ApprovalRequest, ApprovalTabKey } from '../../types'
import { useFlowExecutionTasks } from '../../hooks/useFlowExecutionTasks'
import { APPROVAL_TABS, getTabByKey, getTabLabel } from '../../constants/approvalTabs'
import ApprovalTable from '../ApprovalTable'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useApprovalTabCounts } from '../../hooks/useApprovalTabCounts'
import { TaskDetailContent } from '@/business-apps/core/every/apps/every-box'
import { mapFlowExecutionTaskToUnifiedTask } from '../../utils/flowTaskToUnifiedTask'

type ApprovalsPageProps = BusinessAppContextProps

const DATA_TEST_ID_PREFIX = 'approvals-page'

const ApprovalsPage: React.FC<ApprovalsPageProps> = props => {
  const [activeTab, setActiveTab] = useState<ApprovalTabKey>('expense-plan')
  const [selectedTasks, setSelectedTasks] = useState<ApprovalRequest[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const [activeFlowTask, setActiveFlowTask] = useState<FlowExecutionTask | null>(null)

  const [tabPagination, setTabPagination] = useState<
    Record<ApprovalTabKey, { currentPage: number; pageSize: number; searchTerm: string }>
  >({
    'expense-plan': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'expense-request': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'advance-payment': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'handout-payment': { currentPage: 1, pageSize: 20, searchTerm: '' },
    'transfer-payment': { currentPage: 1, pageSize: 20, searchTerm: '' }
  })

  const { tabCounts, isLoadingCounts, refreshTabCounts } = useApprovalTabCounts(props)

  const currentTabPagination = tabPagination[activeTab]
  const currentTab = getTabByKey(activeTab)

  const { tasks, totalCount, isLoading, error, refresh } = useFlowExecutionTasks(props, {
    currentPage: currentTabPagination.currentPage,
    pageSize: currentTabPagination.pageSize,
    searchTerm: currentTabPagination.searchTerm,
    filterTaskName: currentTab?.processName || null
  })

  useEffect(() => {
    // no-op; hook already loads on mount
  }, [props.accessToken, props.userInfo?.id, refreshTabCounts])

  useProcessCompletion({
    onSuccess: () => {
      refreshTabCounts()
      refresh()
    }
  })

  const handleTabChange = (value: string) => {
    setActiveTab(value as ApprovalTabKey)
    setSelectedTasks([])
    setValidationError(null)
    setActiveFlowTask(null)
  }

  const updateTabPagination = (updates: Partial<typeof currentTabPagination>) => {
    setTabPagination(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], ...updates }
    }))
  }

  const handleRowClick = useCallback((task: FlowExecutionTask) => {
    setActiveFlowTask(prev => (prev?.id === task.id ? null : task))
  }, [])

  const handleDetailClose = useCallback(() => {
    setActiveFlowTask(null)
  }, [])

  const handleTaskCompleted = useCallback(() => {
    setActiveFlowTask(null)
    refresh()
    refreshTabCounts()
  }, [refresh, refreshTabCounts])

  const handleTaskUpdated = useCallback(() => {
    refresh()
    refreshTabCounts()
  }, [refresh, refreshTabCounts])

  const unifiedTask = activeFlowTask ? mapFlowExecutionTaskToUnifiedTask(activeFlowTask) : null

  return (
    <div data-testid="approvals-page-container">
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
        <div className="gba:flex gba:gap-0" data-testid="approvals-page">
          <div
            className={activeFlowTask ? 'gba:w-1/2 gba:min-w-0 gba:overflow-auto gba:px-6' : 'gba:flex-1 gba:px-6'}
            data-testid="approvals-table-panel"
          >
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
                refresh()
                refreshTabCounts()
              }}
              onRowClick={handleRowClick}
              activeTaskId={activeFlowTask?.id ?? null}
            />
          </div>

          {unifiedTask && (
            <div
              className="gba:w-1/2 gba:border-l gba:border-border gba:flex gba:flex-col gba:h-[calc(100vh-200px)] gba:sticky gba:top-0"
              data-testid="approvals-detail-panel"
            >
              <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border">
                <h3 className="gba:text-sm gba:font-semibold gba:truncate">{unifiedTask.title}</h3>
                <button
                  onClick={handleDetailClose}
                  className="gba:p-1 gba:rounded gba:hover:bg-accent"
                  data-testid="approvals-detail-close-button"
                >
                  <XIcon className="gba:h-4 gba:w-4" />
                </button>
              </div>
              <div className="gba:flex-1 gba:min-h-0 gba:overflow-auto">
                <TaskDetailContent
                  task={unifiedTask}
                  onClose={handleDetailClose}
                  onTaskUpdated={handleTaskUpdated}
                  onTaskCompleted={handleTaskCompleted}
                  accessToken={props.accessToken}
                  userId={props.userInfo?.id}
                  userInfo={props.userInfo}
                  showActions
                />
              </div>
            </div>
          )}
        </div>
      </PageLayout>
      <Toaster position="bottom-right" />
    </div>
  )
}

export default ApprovalsPage
