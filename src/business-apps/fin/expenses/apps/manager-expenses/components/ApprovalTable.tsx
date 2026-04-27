import React, { useCallback, useMemo } from 'react'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import { ApprovalRequest } from '../types'
import { mapFlowTaskToApprovalRequest } from '../utils/flowTaskMapper'
import { validateTaskSelection } from '../utils/taskValidation'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import ApprovalTableActions from './ApprovalTableActions'
import { useApprovalHandling } from '../hooks/useApprovalHandling'
import { ExpenseDataTable } from '../../../common/components/table/ExpenseDataTable'
import { useTableSetup } from '../../../common/hooks/useTableSetup'
import { type ApprovalTableRow, createApprovalTableColumns } from './approvalTableColumns'

interface ApprovalTableProps extends BusinessAppContextProps {
  tasks: FlowExecutionTask[]
  totalCount: number
  isLoading: boolean
  error: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  selectedTasks: ApprovalRequest[]
  setSelectedTasks: (tasks: ApprovalRequest[]) => void
  validationError: string | null
  setValidationError: (error: string | null) => void
  dataTestIdPrefix: string
  tabKey: string
  onApprovalSuccess?: () => void
  onRowClick?: (task: FlowExecutionTask) => void
  activeTaskId?: string | null
  emptyMessage: string
}

const ApprovalTable: React.FC<ApprovalTableProps> = ({
  tasks: rawTasks,
  totalCount,
  isLoading,
  error,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  selectedTasks,
  setSelectedTasks,
  validationError,
  setValidationError,
  dataTestIdPrefix,
  tabKey,
  userInfo,
  accessToken,
  onApprovalSuccess,
  onRowClick,
  emptyMessage
}) => {
  const { isApproving, approvalError, handleApproveClick } = useApprovalHandling({
    selectedTasks,
    setSelectedTasks,
    rawTasks,
    tabKey,
    userInfo,
    accessToken,
    onApprovalSuccess
  })

  const tableRows: ApprovalTableRow[] = useMemo(
    () =>
      (rawTasks as FlowExecutionTask[]).map(t => ({
        id: t.id,
        flowTask: t,
        approval: mapFlowTaskToApprovalRequest(t)
      })),
    [rawTasks]
  )

  const allRequests = useMemo(() => tableRows.map(r => r.approval), [tableRows])

  const handleSelectAll = useCallback(
    (nextChecked: boolean) => {
      if (nextChecked) {
        if (selectedTasks.length > 0) {
          const firstTaskGroup = selectedTasks[0].taskGroup
          setSelectedTasks(allRequests.filter(t => t.taskGroup === firstTaskGroup))
        } else {
          setSelectedTasks([...allRequests])
        }
        return
      }
      setSelectedTasks([])
    },
    [allRequests, selectedTasks, setSelectedTasks]
  )

  const handleTaskSelection = useCallback(
    (task: ApprovalRequest) => {
      setValidationError(null)

      const isAlreadySelected = selectedTasks.some(selected => selected.id === task.id)
      if (isAlreadySelected) {
        setSelectedTasks(selectedTasks.filter(s => s.id !== task.id))
        return
      }
      const validation = validateTaskSelection(selectedTasks, task)
      if (!validation.isValid) {
        setValidationError(
          validation.errorMessage ||
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:manager_expenses_landing_page.invalid_task_selection',
              'Invalid task selection'
            )
        )
        return
      }
      setSelectedTasks([...selectedTasks, task])
    },
    [selectedTasks, setSelectedTasks, setValidationError]
  )

  const handleRowClick = useCallback(
    (row: ApprovalTableRow) => {
      onRowClick?.(row.flowTask)
    },
    [onRowClick]
  )

  const allColumns = useMemo(
    () =>
      createApprovalTableColumns({
        dataTestIdPrefix,
        allRequests,
        selectedTasks,
        onSelectAll: handleSelectAll,
        onToggleRow: handleTaskSelection
      }),
    [dataTestIdPrefix, allRequests, handleSelectAll, handleTaskSelection, selectedTasks]
  )

  const { columns, pagination, handlePaginationChange } = useTableSetup(
    { accessToken, userInfo },
    allColumns,
    [],
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize
  )

  const handleClearSelection = useCallback(() => {
    setSelectedTasks([])
    setValidationError(null)
  }, [setSelectedTasks, setValidationError])

  const handleApproveClickWithValidation = async () => {
    if (selectedTasks.length === 0) {
      setValidationError(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expenses_landing_page.select_task_to_approve',
          'Please select at least one task to approve'
        )
      )
      return
    }

    const result = await handleApproveClick()
    if (result?.error) {
      setValidationError(result.error)
    }
  }

  if (isLoading && allRequests.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8">
        <Spinner data-testid={`${dataTestIdPrefix}-loading-spinner`} />
      </div>
    )
  }

  return (
    <div data-testid={`${dataTestIdPrefix}-container`} className="gba:min-w-0">
      {error && (
        <Alert className="gba:mb-4" data-testid={`${dataTestIdPrefix}-error-alert`}>
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {allRequests.length > 0 && (
        <ApprovalTableActions
          selectedTasks={selectedTasks}
          validationError={validationError}
          approvalError={approvalError}
          isApproving={isApproving}
          onClearSelection={handleClearSelection}
          onApproveClick={handleApproveClickWithValidation}
          dataTestIdPrefix={dataTestIdPrefix}
        />
      )}

      <div className="gba:min-w-0 gba:mt-0">
        <ExpenseDataTable<ApprovalTableRow>
          data={tableRows}
          columns={columns}
          loading={isLoading}
          error={error}
          totalCount={totalCount}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          onRowClick={onRowClick ? handleRowClick : undefined}
          emptyMessage={emptyMessage}
          dataTestId={`${dataTestIdPrefix}-table`}
        />
      </div>
    </div>
  )
}

export default ApprovalTable
