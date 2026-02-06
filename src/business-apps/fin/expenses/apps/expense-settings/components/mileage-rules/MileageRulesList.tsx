import React, { useState, useMemo, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { formatDateForInput } from '../../utils'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)
import {
  Badge,
  Button,
  Alert,
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
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { DataControllerProps } from '@/components/dataController/DataController'
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer'
import { ICONS } from '@/business-apps/fin/expenses/utils/icons'
import { useMileageRulesIntegration, EnhancedMileageRule } from '../../hooks/useMileageRulesIntegration'
import { useMileageRuleOperations } from '../../hooks/useMileageRuleOperations'
import { MileageRuleForm, MileageRuleFormData } from '../../forms/mileage-rule-form'
import MileageRuleDetails from './MileageRuleDetails'
import MileageRulesPagination from './MileageRulesPagination'
import DeleteMileageRuleDialog from './DeleteMileageRuleDialog'
import TimePeriodFilter from './filters/TimePeriodFilter'
import RulePeriodFilter from './filters/RulePeriodFilter'
import { MileageRulePeriod } from '../../types/ExpenseEnums'
import { PiPlus, PiPencil, PiTrash, PiDotsThreeVertical } from 'react-icons/pi'
import { toast, Toaster } from 'sonner'

// Re-export the enhanced interface for external use
export type { EnhancedMileageRule as MileageRule }

export interface MileageRulesListProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const PREFIX = 'mileage-rules'

const MileageRulesList: React.FC<MileageRulesListProps> = ({ prefixDataTestId = '', accessToken, ...context }) => {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const isInitialMount = useRef(true)

  // Filter states
  const [statusFilter, setStatusFilter] = useState({ active: false, inactive: false })
  const [validFromFilter, setValidFromFilter] = useState<string | null>(null)
  const [validToFilter, setValidToFilter] = useState<string | null>(null)
  const [rulePeriodFilter, setRulePeriodFilter] = useState<Record<MileageRulePeriod, boolean>>({
    [MileageRulePeriod.YEARLY]: false,
    [MileageRulePeriod.TRIP]: false,
    [MileageRulePeriod.TOTAL]: false
  })

  // Modal state management
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)
  const [editingRule, setEditingRule] = useState<EnhancedMileageRule | null>(null)

  // Delete modal state management
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false)
  const [deletingRule, setDeletingRule] = useState<EnhancedMileageRule | null>(null)
  const [deleteBlocked, setDeleteBlocked] = useState(false)

  // Drawer state management
  const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false)
  const [selectedRule, setSelectedRule] = useState<EnhancedMileageRule | null>(null)

  // Drawer handlers
  const handleViewRuleDetails = (rule: EnhancedMileageRule) => {
    setSelectedRule(rule)
    setIsDetailsDrawerVisible(true)
  }

  const handleCloseDetailsDrawer = () => {
    setIsDetailsDrawerVisible(false)
    setSelectedRule(null)
  }

  const handleNavigateToCalculationRule = (ruleId: string, page?: string) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('ruleId', ruleId)
    if (page) {
      urlParams.set('page', page)
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.pushState({}, '', newUrl)

    // Trigger a popstate event to notify the parent component of the URL change
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleCreateSubmit = async (formData: MileageRuleFormData) => {
    try {
      const result = await createMileageRule(formData)
      toast.success('Mileage rule created successfully')
      setIsCreateModalVisible(false)
      refetch({})
      return result // ✅ Return the response so the form can capture the new rule ID
    } catch (error) {
      console.error('Error creating rule:', error)
      toast.error('Failed to create mileage rule')
      throw error // Re-throw so the form knows it failed
    }
  }

  const handleEditSubmit = async (formData: MileageRuleFormData) => {
    try {
      if (!editingRule) return
      const result = await updateMileageRule(editingRule.id, formData)
      toast.success('Mileage rule updated successfully')
      setIsEditModalVisible(false)
      setEditingRule(null)
      refetch({})
      return result // ✅ Return the response
    } catch (error) {
      console.error('Error updating rule:', error)
      toast.error('Failed to update mileage rule')
      throw error
    }
  }

  const handleModalCancel = () => {
    setIsCreateModalVisible(false)
    setIsEditModalVisible(false)
    setEditingRule(null)
  }

  const handleEditRule = (rule: EnhancedMileageRule) => {
    setEditingRule(rule)
    setIsEditModalVisible(true)
  }

  const handleDeleteRule = (rule: EnhancedMileageRule) => {
    setDeletingRule(rule)
    // Check if rule is being used in any calculation rules
    // For now, we'll allow deletion (set blocked to false)
    // TODO: Add actual check for rule usage
    setDeleteBlocked(false)
    setIsDeleteModalVisible(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingRule) return

    try {
      await deleteMileageRule(deletingRule.id, deletingRule.version)
      toast.success('Mileage rule deleted successfully')
      setIsDeleteModalVisible(false)
      setDeletingRule(null)
      refetch({})
    } catch (error) {
      console.error('Error deleting rule:', error)
      toast.error('Failed to delete mileage rule')
      setIsDeleteModalVisible(false)
    }
  }

  // Use the GraphQL integration hook
  const { mileageRules, totalCount, isLoading, error, refetch, refetchWithFilters } = useMileageRulesIntegration({
    ...context,
    accessToken
  })

  // Use the API integration hook for CRUD operations
  const { createMileageRule, updateMileageRule, deleteMileageRule } = useMileageRuleOperations({
    ...context,
    accessToken
  })

  // Single unified useEffect for all filtering (search + filters)
  useEffect(() => {
    // Skip on initial mount to avoid duplicate query
    if (isInitialMount.current) {
      isInitialMount.current = false

      // Trigger initial load with default filters
      refetchWithFilters({
        statusFilter,
        validFromFilter,
        validToFilter,
        rulePeriodFilter: [],
        search: undefined // No search on initial load
      })
      return
    }

    // Debounce for search input, immediate for filters
    const timeoutId = setTimeout(() => {
      // Convert rulePeriodFilter object to array of selected periods
      const selectedPeriods = Object.entries(rulePeriodFilter)
        .filter(([, isSelected]) => isSelected)
        .map(([period]) => period)

      const offset = (currentPage - 1) * pageSize

      refetchWithFilters(
        {
          statusFilter,
          validFromFilter,
          validToFilter,
          rulePeriodFilter: selectedPeriods,
          search: search || undefined
        },
        pageSize,
        offset
      )
    }, 300) // 300ms debounce for all changes

    return () => clearTimeout(timeoutId)
  }, [
    search,
    statusFilter,
    validFromFilter,
    validToFilter,
    rulePeriodFilter,
    currentPage,
    pageSize,
    refetchWithFilters
  ])

  // Reset to page 1 when filters change (not pagination)
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, search, validFromFilter, validToFilter, rulePeriodFilter])

  const resetFilters = () => {
    setStatusFilter({ active: false, inactive: false })
    setValidFromFilter(null)
    setValidToFilter(null)
    setRulePeriodFilter({
      [MileageRulePeriod.YEARLY]: false,
      [MileageRulePeriod.TRIP]: false,
      [MileageRulePeriod.TOTAL]: false
    })
  }

  // Filter groups
  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'time-period',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.timePeriod', 'Filter by Time Period'),
        customComponent: (
          <TimePeriodFilter
            validFrom={validFromFilter}
            validTo={validToFilter}
            onValidFromChange={setValidFromFilter}
            onValidToChange={setValidToFilter}
            prefixDataTestId={`${PREFIX}-time-period-filter`}
          />
        ),
        hideSearch: true
      },
      {
        id: 'rule-period',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.rulePeriod', 'Filter by Rule Period'),
        customComponent: (
          <RulePeriodFilter
            selectedPeriods={rulePeriodFilter}
            onChange={setRulePeriodFilter}
            prefixDataTestId={`${PREFIX}-rule-period-filter`}
          />
        ),
        hideSearch: true
      }
    ]
  }, [validFromFilter, validToFilter, rulePeriodFilter])

  // Data controller props
  const dataControllerProps: DataControllerProps = {
    listTitle: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.title', 'Mileage Rules'),
    listAmount: totalCount,
    search,
    setSearch,
    debounceDelay: 300,
    filter: [],
    setFilter: () => {},
    filterLabelMap: {},
    actions: (
      <Button onClick={() => setIsCreateModalVisible(true)} data-testid={`${PREFIX}-create-button`}>
        <PiPlus className="gba:mr-2 gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.addRate', 'Add Rate')}
      </Button>
    )
  } as any

  return (
    <div data-testid={`${PREFIX}-app`} className="gba:p-6">
      <Toaster />
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
                {error && (
                  <div className="gba:p-4">
                    <Alert variant="destructive" data-testid={`${PREFIX}-error`}>
                      {error}
                      <div className="gba:mt-2">
                        <Button size="sm" onClick={() => refetch()} data-testid={`${PREFIX}-retry-button`}>
                          Retry
                        </Button>
                      </div>
                    </Alert>
                  </div>
                )}
                {!isLoading && !error && mileageRules.length === 0 && (
                  <div className="gba:p-8 gba:text-center">
                    <div className="gba:text-gray-500" data-testid={`${PREFIX}-empty`}>
                      {getTranslationFromI18nKeyAndLabel('common.noDataFound', 'No data found')}
                    </div>
                  </div>
                )}
                {!isLoading && !error && mileageRules.length > 0 && (
                  <>
                    <div className="gba:overflow-x-auto gba:mt-4 gba:max-w-[100%]">
                      <Table data-testid={`${PREFIX}-table`} className="gba:min-w-[1100px] gba:w-[100%]">
                        <TableHeader>
                          <TableRow className="gba:border-b gba:bg-gray-50">
                            <TableHead className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">
                                {getTranslationFromI18nKeyAndLabel(
                                  'expenseSettings.mileageRules.table.actions',
                                  'Actions'
                                )}
                              </span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">
                                {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.table.code', 'Code')}
                              </span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">
                                {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.table.name', 'Name')}
                              </span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">
                                {getTranslationFromI18nKeyAndLabel(
                                  'expenseSettings.mileageRules.table.rulePeriod',
                                  'Rule Period'
                                )}
                              </span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">
                                {getTranslationFromI18nKeyAndLabel(
                                  'expenseSettings.mileageRules.table.validFrom',
                                  'Valid From'
                                )}
                              </span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">
                                {getTranslationFromI18nKeyAndLabel(
                                  'expenseSettings.mileageRules.table.validTo',
                                  'Valid To'
                                )}
                              </span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">
                                {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.table.order', 'Order')}
                              </span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mileageRules.map((record, index) => (
                            <TableRow
                              key={record.id}
                              className="gba:border-b hover:gba:bg-gray-50 gba:cursor-pointer"
                              onClick={() => handleViewRuleDetails(record)}
                              data-testid={`${PREFIX}-mileage-rule-row-${record.id}`}
                            >
                              <TableCell
                                className="gba:py-3 gba:px-6"
                                onClick={e => e.stopPropagation()}
                                data-testid={`${PREFIX}-cell-actions-${index}`}
                              >
                                <div className="gba:flex gba:justify-start gba:gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={e => e.stopPropagation()}
                                        data-testid={`${PREFIX}-actions-trigger-${index}`}
                                      >
                                        <PiDotsThreeVertical className="gba:h-4 gba:w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleEditRule(record)
                                        }}
                                        data-testid={`${PREFIX}-edit-rule-${index}`}
                                      >
                                        <PiPencil className="gba:h-4 gba:w-4 gba:mr-2" />
                                        {getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:expense_calculation_rule.edit',
                                          'Update'
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleDeleteRule(record)
                                        }}
                                        className="gba:text-destructive"
                                        data-testid={`${PREFIX}-delete-rule-${index}`}
                                      >
                                        <PiTrash className="gba:h-4 gba:w-4 gba:mr-2" />
                                        {getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:expense_calculation_rule.delete',
                                          'Delete'
                                        )}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-code-${index}`}>
                                <div
                                  className="gba:font-mono gba:font-medium gba:text-sm gba:text-blue-600"
                                  title={record.code}
                                >
                                  {record.code}
                                </div>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-name-${index}`}>
                                <span className="gba:text-sm" title={record.name}>
                                  {record.name}
                                </span>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-period-${index}`}>
                                <Badge variant="default">{record.rulePeriodLabel}</Badge>
                              </TableCell>
                              <TableCell
                                className="gba:py-3 gba:px-6"
                                data-testid={`${PREFIX}-cell-valid-from-${index}`}
                              >
                                <span className="gba:text-sm">{record.validFrom}</span>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-valid-to-${index}`}>
                                <span className="gba:text-sm">{record.validTo}</span>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-order-${index}`}>
                                <span className="gba:text-sm">{record.ruleOrder}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <MileageRulesPagination
                      currentPage={currentPage}
                      pageSize={pageSize}
                      totalItems={totalCount}
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

      {/* Details Drawer */}
      <DataDetailsDrawer
        title={selectedRule ? `${selectedRule.name} (${selectedRule.code})` : ''}
        open={isDetailsDrawerVisible}
        onClose={handleCloseDetailsDrawer}
        width={600}
        placement="right"
        dataTestId={`${prefixDataTestId}-mileage-rule-details-drawer`}
      >
        {selectedRule && (
          <MileageRuleDetails
            mileageRule={selectedRule}
            onNavigateToCalculationRule={handleNavigateToCalculationRule}
            accessToken={accessToken}
            {...context}
          />
        )}
      </DataDetailsDrawer>

      {/* Create Mileage Rule Dialog */}
      <Dialog open={isCreateModalVisible} onOpenChange={open => !open && handleModalCancel()}>
        <DialogContent
          className="gba:max-h-[90vh] gba:overflow-y-auto"
          style={{
            width: 'min(95vw, 1200px)',
            maxWidth: '1200px',
            minWidth: '600px'
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel(
                'expenseSettings.modals.createMileageRule.title',
                'Create Mileage Rule'
              )}
            </DialogTitle>
          </DialogHeader>
          <MileageRuleForm accessToken={accessToken} onSubmit={handleCreateSubmit} onCancel={handleModalCancel} />
        </DialogContent>
      </Dialog>

      {/* Edit Mileage Rule Dialog */}
      <Dialog open={isEditModalVisible} onOpenChange={open => !open && handleModalCancel()}>
        <DialogContent
          className="gba:max-h-[90vh] gba:overflow-y-auto"
          style={{
            width: 'min(95vw, 1200px)',
            maxWidth: '1200px',
            minWidth: '600px'
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editMileageRule.title', 'Edit Mileage Rule')}
            </DialogTitle>
          </DialogHeader>
          {editingRule &&
            (() => {
              const ruleActiveFrom = formatDateForInput(editingRule.effectiveFrom) || dayjs().format('YYYY-MM-DD')
              const ruleActiveTo = formatDateForInput(editingRule.effectiveTo) || '9999-12-31'

              const initialData = {
                id: editingRule.id,
                version: editingRule.version,
                code: editingRule.code,
                ruleName: editingRule.name,
                rulePeriod: editingRule.rulePeriod || '',
                activeFrom: ruleActiveFrom,
                activeTo: ruleActiveTo,
                details: editingRule.details.map(detail => ({
                  id: detail.id,
                  version: detail.version,
                  rateAmount: detail.amount,
                  limitFrom: detail.limitFrom,
                  limitTo: detail.limitTo,
                  detailOrder: detail.detailOrder,
                  activeFrom: formatDateForInput(detail.activeFrom) || ruleActiveFrom,
                  activeTo: formatDateForInput(detail.activeTo) || ruleActiveTo
                }))
              }

              return (
                <MileageRuleForm
                  accessToken={accessToken}
                  initialData={initialData}
                  onSubmit={handleEditSubmit}
                  onCancel={handleModalCancel}
                />
              )
            })()}
        </DialogContent>
      </Dialog>

      {/* Delete Mileage Rule Dialog */}
      <DeleteMileageRuleDialog
        open={isDeleteModalVisible}
        onOpenChange={(open: boolean) => {
          setIsDeleteModalVisible(open)
          if (!open) {
            setDeletingRule(null)
          }
        }}
        blocked={deleteBlocked}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

export default MileageRulesList
