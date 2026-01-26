import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Card,
  CardContent,
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@newwork/nw-design-system'
import { PiPlus, PiPencil, PiTrash, PiDotsThreeVertical } from 'react-icons/pi'
import { ListBulletsIcon, SortAscendingIcon, SortDescendingIcon, CheckIcon, XIcon } from '@phosphor-icons/react'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { DataControllerProps } from '@/components/dataController/DataController'
import { AssignmentForm } from '../../forms/assignment-form'
import { expenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import {
  EnhancedExpenseRuleAssignment,
  ExpenseRule,
  SaveExpenseRuleAssignmentInput
} from '../../types/ExpenseRuleTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ICONS } from '@/business-apps/fin/expenses/utils/icons'
import dayjs from 'dayjs'

// Import filter components
import TargetTypeFilter from './filters/TargetTypeFilter'
import AssignmentsPagination from './AssignmentsPagination'
import CascadingFilter from './filters/CascadingFilter'
import TimePeriodFilter from '../mileage-rules/filters/TimePeriodFilter'

export interface CalculationRuleAssignmentListProps extends BusinessAppContextProps {
  assignments: EnhancedExpenseRuleAssignment[]
  totalAssignments: number
  rules: ExpenseRule[]
  isLoading: boolean
  onCreate: (data: SaveExpenseRuleAssignmentInput) => Promise<any>
  onUpdate: (id: string, data: SaveExpenseRuleAssignmentInput) => Promise<any>
  onDelete: (id: string) => Promise<any>
  onSearch: (params: { search?: string; orderBy?: any[]; limit?: number; offset?: number }) => Promise<void>
  onRefresh: () => void
}

const PREFIX = 'calculation-rule-assignments'

const CalculationRuleAssignmentList: React.FC<CalculationRuleAssignmentListProps> = ({
  accessToken,
  assignments,
  totalAssignments,
  rules,
  isLoading,
  onCreate,
  onUpdate,
  onSearch,
  onRefresh
}) => {
  // State management
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState<string>('assignmentOrder')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('ASC')

  // Filter states
  const [targetTypeFilter, setTargetTypeFilter] = useState({
    employee: false,
    company: false,
    orgUnit: false,
    general: false
  })
  const [cascadingFilter, setCascadingFilter] = useState({ true: false, false: false })
  const [effectivePeriodFrom, setEffectivePeriodFrom] = useState<string | null>(null)
  const [effectivePeriodTo, setEffectivePeriodTo] = useState<string | null>(null)

  // Modal states
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<EnhancedExpenseRuleAssignment | null>(null)
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<EnhancedExpenseRuleAssignment | null>(null)

  // Build orderBy for GraphQL query
  const orderBy = useMemo(() => {
    if (!sortField || !sortOrder) return [{ assignmentOrder: 'ASC_NULLS_LAST' }]
    const dir = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'

    // Map column keys to database fields
    switch (sortField) {
      case 'ruleCode':
        return [{ expenseRule: { code: dir } }]
      case 'companyName':
        return [{ company: { name: dir } }]
      case 'ruleName':
        return [{ expenseRule: { name: dir } }]
      case 'location':
        return [{ siteLocation: { name: dir } }]
      case 'employmentType':
        return [{ employmentType: { value: dir } }]
      case 'contractType':
        return [{ contractType: { value: dir } }]
      case 'employee':
        return [{ employee: { firstName: dir } }]
      case 'validFrom':
        return [{ activeFrom: dir }]
      case 'validTo':
        return [{ activeTo: dir }]
      case 'standard':
        return [{ expenseRule: { standard: dir } }]
      case 'orgUnit':
        return [{ organizationalUnit: { name: dir } }]
      case 'cascading':
        return [{ cascading: dir }]
      case 'order':
        return [{ assignmentOrder: dir }]
      default:
        return [{ [sortField]: dir }]
    }
  }, [sortField, sortOrder])

  // Compute used order numbers from existing assignments
  const usedOrderNumbers = useMemo(() => {
    return assignments
      .map(a => a.assignmentOrder)
      .filter((order): order is number => order !== null && order !== undefined)
  }, [assignments])

  // Handle search, sorting, and pagination with debounce (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      const offset = (currentPage - 1) * pageSize
      // Trigger search with sort parameters and pagination
      onSearch({
        search: search.trim() || undefined,
        orderBy,
        limit: pageSize,
        offset
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [search, orderBy, currentPage, pageSize, onSearch])

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, sortField, sortOrder])

  // Handlers
  const handleSort = useCallback(
    (field: string) => {
      let next: 'ASC' | 'DESC' | '' = 'ASC'
      if (sortField === field) {
        if (sortOrder === 'ASC') next = 'DESC'
        else if (sortOrder === 'DESC') next = ''
        else next = 'ASC'
      }
      setSortField(field)
      setSortOrder(next)
    },
    [sortField, sortOrder]
  )

  const handleCreateSubmit = async (formData: SaveExpenseRuleAssignmentInput) => {
    try {
      await onCreate(formData)
      setIsCreateModalVisible(false)
      onRefresh()
    } catch (error) {
      console.error('Error creating assignment:', error)
    }
  }

  const handleEditSubmit = async (formData: SaveExpenseRuleAssignmentInput) => {
    try {
      if (editingAssignment?.id) {
        await onUpdate(editingAssignment.id, formData)
        setIsEditModalVisible(false)
        setEditingAssignment(null)
        onRefresh()
      }
    } catch (error) {
      console.error('Error updating assignment:', error)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!assignmentToDelete) return

    try {
      await expenseSettingsClient.setAccessToken(accessToken)
      await expenseSettingsClient.deleteExpenseRuleAssignment(assignmentToDelete.id, assignmentToDelete.version)

      setIsDeleteConfirmVisible(false)
      setAssignmentToDelete(null)
      onRefresh()
    } catch (error) {
      console.error('Error deleting assignment:', error)
    }
  }

  const handleEditAssignment = (assignment: EnhancedExpenseRuleAssignment) => {
    setEditingAssignment(assignment)
    setIsEditModalVisible(true)
  }

  const handleDeleteAssignment = (assignment: EnhancedExpenseRuleAssignment) => {
    setAssignmentToDelete(assignment)
    setIsDeleteConfirmVisible(true)
  }

  const resetFilters = () => {
    setTargetTypeFilter({ employee: false, company: false, orgUnit: false, general: false })
    setCascadingFilter({ true: false, false: false })
    setEffectivePeriodFrom(null)
    setEffectivePeriodTo(null)
  }

  // Columns definition - Actions FIRST
  const columns = useMemo(
    () => [
      {
        key: 'actions',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.actions', 'Actions'),
        width: '60px'
      },
      { key: 'ruleCode', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.ruleCode', 'Rule Code') },
      {
        key: 'companyName',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.companyName', 'Company Name')
      },
      { key: 'ruleName', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.ruleName', 'Rule Name') },
      { key: 'location', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.location', 'Location') },
      {
        key: 'employmentType',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.employmentType', 'Employment Type')
      },
      {
        key: 'contractType',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.contractType', 'Contract Type')
      },
      { key: 'employee', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.employee', 'Employee') },
      { key: 'validFrom', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.validFrom', 'Valid From') },
      { key: 'validTo', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.validTo', 'Valid To') },
      { key: 'standard', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.standard', 'Standard') },
      { key: 'orgUnit', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.orgUnit', 'Org Unit') },
      { key: 'cascading', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.cascading', 'Cascading') },
      { key: 'order', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.order', 'Order') }
    ],
    []
  )

  // Filter groups
  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'targetType',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.targetType', 'Filter by Target Type'),
        customComponent: (
          <TargetTypeFilter
            value={targetTypeFilter}
            onChange={setTargetTypeFilter}
            data-testid={`${PREFIX}-target-type-filter`}
          />
        )
      },
      {
        id: 'cascading',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.cascading', 'Filter by Cascading'),
        customComponent: (
          <CascadingFilter
            value={cascadingFilter}
            onChange={setCascadingFilter}
            data-testid={`${PREFIX}-cascading-filter`}
          />
        )
      },
      {
        id: 'effectivePeriod',
        title: getTranslationFromI18nKeyAndLabel(
          'expenseSettings.filters.effectivePeriod',
          'Filter by Effective Period'
        ),
        customComponent: (
          <TimePeriodFilter
            validFrom={effectivePeriodFrom}
            validTo={effectivePeriodTo}
            onValidFromChange={setEffectivePeriodFrom}
            onValidToChange={setEffectivePeriodTo}
            prefixDataTestId={`${PREFIX}-effective-period-filter`}
          />
        ),
        hideSearch: true
      }
    ]
  }, [targetTypeFilter, cascadingFilter, effectivePeriodFrom, effectivePeriodTo])

  // Data controller props
  const dataControllerProps: DataControllerProps = {
    listTitle: getTranslationFromI18nKeyAndLabel('expenseSettings.assignments.title', 'Rule Assignments'),
    listAmount: totalAssignments,
    search,
    setSearch,
    debounceDelay: 500,
    filter: [],
    setFilter: () => {},
    filterLabelMap: {},
    actions: (
      <Button onClick={() => setIsCreateModalVisible(true)} data-testid={`${PREFIX}-create-button`}>
        <PiPlus className="gba:mr-2 gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('expenseSettings.actions.createAssignment', 'Create Assignment')}
      </Button>
    )
  } as any

  return (
    <div data-testid={`${PREFIX}-app`} className="gba:p-6">
      <DataContainer
        dataControllerProps={dataControllerProps}
        dataFilterProps={{
          filterGroups,
          children: (
            <div className="gba:w-[100%] gba:mt-auto gba:pb-3" data-testid={`${PREFIX}-reset-filters-container`}>
              <button
                type="button"
                className="gba:flex gba:items-center gba:gap-2 gba:w-[100%] gba:px-3 gba:py-2 gba:border gba:rounded gba:text-sm"
                onClick={resetFilters}
                data-testid={`${PREFIX}-reset-filters-button`}
              >
                <img src={ICONS.DELETE_CIRCLE_ICON} alt="reset" className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel('common.resetFilters', 'Reset Filters')}
              </button>
            </div>
          )
        }}
        dataBody={
          <div className="gba:pr-6 gba:overflow-hidden" data-testid={`${PREFIX}-body`}>
            <Card>
              <CardContent className="gba:p-0">
                {isLoading && (
                  <div className="gba:flex gba:justify-center gba:p-4">
                    <Spinner data-testid={`${PREFIX}-loading`} />
                  </div>
                )}
                {!isLoading && assignments.length === 0 && (
                  <div className="gba:p-8 gba:text-center">
                    <div className="gba:text-gray-500" data-testid={`${PREFIX}-empty`}>
                      {getTranslationFromI18nKeyAndLabel('common.noDataFound', 'No data found')}
                    </div>
                  </div>
                )}
                {!isLoading && assignments.length > 0 && (
                  <>
                    <div className="gba:overflow-x-auto gba:mt-4 gba:max-w-[100%]">
                      <Table data-testid={`${PREFIX}-table`} className="gba:min-w-[2000px] gba:w-[100%]">
                        <TableHeader>
                          <TableRow className="gba:border-b gba:bg-gray-50">
                            {columns.map(col => (
                              <TableHead
                                key={col.key}
                                className={`gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 ${col.key === 'actions' ? 'gba:w-[60px]' : ''}`}
                                data-testid={`${PREFIX}-header-${col.key}`}
                              >
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <span className="gba:whitespace-nowrap">{col.title}</span>
                                  {col.key !== 'actions' && (
                                    <button
                                      type="button"
                                      className={`gba:flex gba:items-center gba:justify-center gba:w-5 gba:h-5 ${sortField === col.key ? 'gba:text-black' : 'gba:text-gray-400'} gba:cursor-pointer hover:gba:text-black`}
                                      onClick={() => handleSort(col.key)}
                                      data-testid={`${PREFIX}-sort-${col.key}`}
                                      title="Sort"
                                    >
                                      {sortField === col.key ? (
                                        sortOrder === 'ASC' ? (
                                          <SortAscendingIcon size={16} />
                                        ) : sortOrder === 'DESC' ? (
                                          <SortDescendingIcon size={16} />
                                        ) : (
                                          <ListBulletsIcon size={16} />
                                        )
                                      ) : (
                                        <ListBulletsIcon size={16} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignments.map((assignment, index) => (
                            <TableRow
                              key={assignment.id}
                              data-testid={`${PREFIX}-row-${index}`}
                              className="gba:border-b hover:gba:bg-gray-50"
                            >
                              <TableCell
                                className="gba:py-3 gba:px-6"
                                onClick={e => e.stopPropagation()}
                                data-testid={`${PREFIX}-cell-actions-${index}`}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      data-testid={`${PREFIX}-actions-trigger-${index}`}
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <PiDotsThreeVertical className="gba:h-4 gba:w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={e => {
                                        e.stopPropagation()
                                        handleEditAssignment(assignment)
                                      }}
                                      data-testid={`${PREFIX}-edit-assignment-${index}`}
                                    >
                                      <PiPencil className="gba:h-4 gba:w-4 gba:mr-2" />
                                      {getTranslationFromI18nKeyAndLabel(
                                        'lowcoder:expense_calculation_rule.edit',
                                        'Edit'
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={e => {
                                        e.stopPropagation()
                                        handleDeleteAssignment(assignment)
                                      }}
                                      className="gba:text-destructive"
                                      data-testid={`${PREFIX}-delete-assignment-${index}`}
                                    >
                                      <PiTrash className="gba:h-4 gba:w-4 gba:mr-2" />
                                      {getTranslationFromI18nKeyAndLabel(
                                        'lowcoder:expense_calculation_rule.delete',
                                        'Delete'
                                      )}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                              <TableCell
                                className="gba:py-3 gba:px-6"
                                data-testid={`${PREFIX}-cell-rule-code-${index}`}
                              >
                                <span className="gba:font-mono gba:text-sm">{assignment.ruleCode || ''}</span>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-company-${index}`}>
                                <span className="gba:text-sm">{assignment.company?.name || ''}</span>
                              </TableCell>
                              <TableCell
                                className="gba:py-3 gba:px-6"
                                data-testid={`${PREFIX}-cell-rule-name-${index}`}
                              >
                                <span className="gba:text-sm">{assignment.ruleName || ''}</span>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-location-${index}`}>
                                <span className="gba:text-sm">{assignment.siteLocation?.name || ''}</span>
                              </TableCell>
                              <TableCell
                                className="gba:py-3 gba:px-6"
                                data-testid={`${PREFIX}-cell-employment-type-${index}`}
                              >
                                <span className="gba:text-sm">{assignment.employmentType?.value || ''}</span>
                              </TableCell>
                              <TableCell
                                className="gba:py-3 gba:px-6"
                                data-testid={`${PREFIX}-cell-contract-type-${index}`}
                              >
                                <span className="gba:text-sm">{assignment.contractType?.value || ''}</span>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-employee-${index}`}>
                                <span className="gba:text-sm">
                                  {assignment.employee
                                    ? `${assignment.employee.firstName} ${assignment.employee.lastName}`
                                    : ''}
                                </span>
                              </TableCell>
                              <TableCell
                                className="gba:py-3 gba:px-6"
                                data-testid={`${PREFIX}-cell-valid-from-${index}`}
                              >
                                <span className="gba:text-sm">{dayjs(assignment.activeFrom).format('DD/MM/YYYY')}</span>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-valid-to-${index}`}>
                                <span className="gba:text-sm">
                                  {assignment.activeTo ? dayjs(assignment.activeTo).format('DD/MM/YYYY') : 'Ongoing'}
                                </span>
                              </TableCell>
                              <TableCell
                                className="gba:py-3 gba:px-6 gba:text-center"
                                data-testid={`${PREFIX}-cell-standard-${index}`}
                              >
                                {assignment.expenseRule?.standard ? (
                                  <CheckIcon
                                    size={18}
                                    className="gba:text-green-600"
                                    data-testid={`${PREFIX}-standard-check-${index}`}
                                  />
                                ) : (
                                  <XIcon
                                    size={18}
                                    className="gba:text-black-500"
                                    data-testid={`${PREFIX}-standard-x-${index}`}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-org-unit-${index}`}>
                                <span className="gba:text-sm">{assignment.organizationalUnit?.name || ''}</span>
                              </TableCell>
                              <TableCell
                                className="gba:py-3 gba:px-6 gba:text-center"
                                data-testid={`${PREFIX}-cell-cascading-${index}`}
                              >
                                {assignment.cascading ? (
                                  <CheckIcon
                                    size={18}
                                    className="gba:text-green-600"
                                    data-testid={`${PREFIX}-cascading-check-${index}`}
                                  />
                                ) : (
                                  <XIcon
                                    size={18}
                                    className="gba:text-black-500"
                                    data-testid={`${PREFIX}-cascading-x-${index}`}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-order-${index}`}>
                                <span className="gba:text-sm">{assignment.assignmentOrder}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <AssignmentsPagination
                      currentPage={currentPage}
                      pageSize={pageSize}
                      totalItems={totalAssignments}
                      onPageChange={pagination => {
                        setCurrentPage(pagination.current)
                        setPageSize(pagination.pageSize)
                      }}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        }
      />

      {/* Create Assignment Dialog */}
      <Dialog open={isCreateModalVisible} onOpenChange={setIsCreateModalVisible}>
        <DialogContent
          className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto"
          data-testid={`${PREFIX}-create-dialog`}
        >
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel(
                'expenseSettings.modals.createAssignment.title',
                'Create Rule Assignment'
              )}
            </DialogTitle>
          </DialogHeader>
          <AssignmentForm
            accessToken={accessToken}
            availableRules={rules}
            usedOrderNumbers={usedOrderNumbers}
            onSave={handleCreateSubmit}
            onCancel={() => setIsCreateModalVisible(false)}
            isEditing={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditModalVisible} onOpenChange={setIsEditModalVisible}>
        <DialogContent
          className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto"
          data-testid={`${PREFIX}-edit-dialog`}
        >
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editAssignment.title', 'Edit Rule Assignment')}
            </DialogTitle>
          </DialogHeader>
          {editingAssignment && (
            <AssignmentForm
              accessToken={accessToken}
              availableRules={rules}
              usedOrderNumbers={usedOrderNumbers}
              initialData={editingAssignment}
              onSave={handleEditSubmit}
              onCancel={() => {
                setIsEditModalVisible(false)
                setEditingAssignment(null)
              }}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Assignment Confirmation Dialog */}
      <Dialog open={isDeleteConfirmVisible} onOpenChange={setIsDeleteConfirmVisible}>
        <DialogContent className="gba:max-w-md" data-testid={`${PREFIX}-delete-dialog`}>
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel(
                'expenseSettings.modals.deleteAssignment.title',
                'Delete Rule Assignment'
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            <p className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'expenseSettings.modals.deleteAssignment.message',
                'Are you sure you want to delete this rule assignment? This action cannot be undone.'
              )}
            </p>

            {assignmentToDelete && (
              <div className="gba:bg-gray-50 gba:p-3 gba:rounded-md">
                <p className="gba:text-sm gba:font-medium">Rule: {assignmentToDelete.ruleCode}</p>
                {assignmentToDelete.ruleName && (
                  <p className="gba:text-sm gba:text-gray-600">{assignmentToDelete.ruleName}</p>
                )}
                <p className="gba:text-sm gba:text-gray-600">Order: {assignmentToDelete.assignmentOrder}</p>
              </div>
            )}

            <div className="gba:flex gba:justify-end gba:space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteConfirmVisible(false)
                  setAssignmentToDelete(null)
                }}
                data-testid={`${PREFIX}-delete-cancel-button`}
              >
                {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                data-testid={`${PREFIX}-delete-confirm-button`}
              >
                {getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CalculationRuleAssignmentList
