import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ApprovalRequest } from '../types'
import { mapFlowTasksToApprovalRequests } from '../utils/flowTaskMapper'
import { validateTaskSelection } from '../utils/taskValidation'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getExpenseRequestStatusDisplay } from '../utils'
import Pill from '@/components/pill'
import ApprovalTablePagination from './ApprovalTablePagination'
import ApprovalTableActions from './ApprovalTableActions'
import { useApprovalHandling } from '../hooks/useApprovalHandling'

interface ApprovalTableProps extends BusinessAppContextProps {
  tasks: any[]
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
  tabKey: string // The current tab key to determine approval process
  onApprovalSuccess?: () => void // Callback after successful approval
}

const ApprovalTable: React.FC<ApprovalTableProps> = ({
  tasks,
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
  onApprovalSuccess
}) => {
  const rawTasks = tasks
  const approvalRequests = mapFlowTasksToApprovalRequests(tasks)

  const { isApproving, approvalError, handleApproveClick } = useApprovalHandling({
    selectedTasks,
    setSelectedTasks,
    rawTasks,
    tabKey,
    userInfo,
    accessToken,
    onApprovalSuccess
  })

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  const handleTaskSelection = (task: ApprovalRequest) => {
    setValidationError(null)

    const isAlreadySelected = selectedTasks.some(selected => selected.id === task.id)

    if (isAlreadySelected) {
      setSelectedTasks(selectedTasks.filter((selected: ApprovalRequest) => selected.id !== task.id))
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
  }

  const handleClearSelection = () => {
    setSelectedTasks([])
    setValidationError(null)
  }

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

  if (isLoading && !approvalRequests.length) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8">
        <Spinner data-testid={`${dataTestIdPrefix}-loading-spinner`} />
      </div>
    )
  }

  if (approvalRequests.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
        <div className="gba:text-muted-foreground gba:text-lg gba:font-medium gba:mb-2">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:manager_expenses_landing_page.no_pending_approvals',
            'No pending approval requests found'
          )}
        </div>
        <div className="gba:text-muted-foreground gba:mb-4">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:manager_expenses_landing_page.all_approvals_processed',
            'All approval requests have been processed.'
          )}
        </div>
      </div>
    )
  }

  return (
    <div data-testid={`${dataTestIdPrefix}-container`}>
      {error && (
        <Alert className="gba:mb-4" data-testid={`${dataTestIdPrefix}-error-alert`}>
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      <ApprovalTableActions
        selectedTasks={selectedTasks}
        validationError={validationError}
        approvalError={approvalError}
        isApproving={isApproving}
        onClearSelection={handleClearSelection}
        onApproveClick={handleApproveClickWithValidation}
        dataTestIdPrefix={dataTestIdPrefix}
      />

      <div className="gba:border gba:border-border gba:rounded-md gba:bg-background">
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${dataTestIdPrefix}-table`} className="gba:w-full">
            <TableHeader className="gba:sticky gba:top-0 gba:bg-muted gba:z-10 gba:border-b gba:border-border">
              <TableRow>
                <TableHead className="gba:w-[5%]">
                  <input
                    type="checkbox"
                    checked={selectedTasks.length > 0 && selectedTasks.length === approvalRequests.length}
                    onChange={e => {
                      if (e.target.checked) {
                        if (selectedTasks.length > 0) {
                          const firstTaskGroup = selectedTasks[0].taskGroup
                          const sameTypeTasks = approvalRequests.filter(task => task.taskGroup === firstTaskGroup)
                          setSelectedTasks(sameTypeTasks)
                        } else {
                          setSelectedTasks(approvalRequests)
                        }
                      } else {
                        setSelectedTasks([])
                      }
                    }}
                    data-testid={`${dataTestIdPrefix}-select-all-checkbox`}
                  />
                </TableHead>
                <TableHead className="gba:w-[15%]">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_plan_list.expense_plan_table.create_date',
                    'Date'
                  )}
                </TableHead>
                <TableHead className="gba:w-[20%]">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.request', 'Title')}
                </TableHead>
                <TableHead className="gba:w-[15%]">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:manager_expenses_landing_page.task_group', 'Task Group')}
                </TableHead>
                <TableHead className="gba:w-[15%]">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.expense_plan_table.amount',
                    'Amount'
                  )}
                </TableHead>
                <TableHead className="gba:w-[15%]">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
                </TableHead>
                <TableHead className="gba:w-[10%]">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.expense_plan_table.status',
                    'Status'
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvalRequests.map((request: ApprovalRequest) => (
                <TableRow
                  key={request.id}
                  className="gba:cursor-pointer gba:hover:bg-accent"
                  onClick={() => handleTaskSelection(request)}
                  data-testid={`${dataTestIdPrefix}-table-row-${request.id}`}
                >
                  <TableCell className="gba:py-3 gba:px-4">
                    <input
                      type="checkbox"
                      checked={selectedTasks.some(selected => selected.id === request.id)}
                      onChange={e => {
                        e.stopPropagation()
                        handleTaskSelection(request)
                      }}
                      data-testid={`${dataTestIdPrefix}-select-checkbox-${request.id}`}
                    />
                  </TableCell>
                  <TableCell className="gba:text-sm gba:py-3 gba:px-4">
                    {request.requestDate
                      ? new Intl.DateTimeFormat(getCurrentActiveUserLocale(), {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        }).format(new Date(request.requestDate))
                      : '-'}
                  </TableCell>
                  <TableCell className="gba:py-3 gba:px-4">
                    <div className="gba:font-medium gba:text-sm">{request.title}</div>
                  </TableCell>
                  <TableCell className="gba:text-sm gba:py-3 gba:px-4">
                    <div className="gba:text-muted-foreground">{request.taskGroup}</div>
                  </TableCell>
                  <TableCell className="gba:text-right gba:text-sm">
                    {request.totalAmount > 0
                      ? new Intl.NumberFormat(getCurrentActiveUserLocale(), {
                          style: 'currency',
                          currency: request.currency || 'EUR',
                          currencyDisplay: 'code'
                        }).format(request.totalAmount)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="gba:text-sm">{request.employee.fullName}</div>
                  </TableCell>
                  <TableCell className="gba:pr-6">
                    {(() => {
                      const { type, label } = getExpenseRequestStatusDisplay(request.status)
                      return (
                        <Pill
                          type={type as any}
                          label={label}
                          data-testid={`${dataTestIdPrefix}-status-pill-${request.status?.toLowerCase()}`}
                        />
                      )
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <ApprovalTablePagination
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pageSize={pageSize}
        handlePageSizeChange={handlePageSizeChange}
        totalCount={totalCount}
        dataTestIdPrefix={dataTestIdPrefix}
      />
    </div>
  )
}

export default ApprovalTable
