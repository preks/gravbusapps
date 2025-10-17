import React, { useState, useMemo, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

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
  Popover,
  PopoverTrigger,
  PopoverContent
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
import TimePeriodFilter from './filters/TimePeriodFilter'
import RulePeriodFilter from './filters/RulePeriodFilter'
import { MileageRulePeriod } from '../../types/ExpenseEnums'
import { PiPlus, PiPencil, PiTrash } from 'react-icons/pi'
import { Lightning } from '@phosphor-icons/react'

// Custom toast implementation until design system provides one
const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
  const style = variant === 'destructive' ? 'color: red' : 'color: green'
  console.log(`%c${title}: ${description}`, style)
  // TODO: Replace with proper toast implementation when available in design system
}

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
      await createMileageRule(formData)
      toast({
        title: 'Success',
        description: 'Mileage rule created successfully'
      })
      setIsCreateModalVisible(false)
      refetch({})
    } catch (error) {
      console.error('Error creating rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to create mileage rule',
        variant: 'destructive'
      })
    }
  }

  const handleEditSubmit = async (formData: MileageRuleFormData) => {
    try {
      if (!editingRule) return
      await updateMileageRule(editingRule.id, formData)
      toast({
        title: 'Success',
        description: 'Mileage rule updated successfully'
      })
      setIsEditModalVisible(false)
      setEditingRule(null)
      refetch({})
    } catch (error) {
      console.error('Error updating rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to update mileage rule',
        variant: 'destructive'
      })
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
    // TODO: Implement delete confirmation dialog
    console.log('Delete rule:', rule)
    toast({
      title: 'Info',
      description: 'Delete functionality not yet implemented',
      variant: 'destructive'
    })
  }

  // Use the GraphQL integration hook
  const { mileageRules, totalCount, isLoading, error, refetch, refetchWithFilters } = useMileageRulesIntegration({
    ...context,
    accessToken
  })

  // Use the API integration hook for CRUD operations
  const { createMileageRule, updateMileageRule } = useMileageRuleOperations({ ...context, accessToken })

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
                            <TableHead className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">
                                {getTranslationFromI18nKeyAndLabel(
                                  'expenseSettings.mileageRules.table.actions',
                                  'Actions'
                                )}
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
                              <TableCell
                                className="gba:py-3 gba:px-6"
                                onClick={e => e.stopPropagation()}
                                data-testid={`${PREFIX}-cell-actions-${index}`}
                              >
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="gba:inline-flex gba:items-center gba:justify-center gba:gap-2 gba:whitespace-nowrap gba:rounded-sm gba:text-sm gba:font-medium gba:transition-all gba:disabled:pointer-events-none gba:disabled:opacity-50 gba:shrink-0 gba:outline-none gba:focus-visible:ring-[3px] gba:border gba:bg-background gba:size-9 gba:text-info-on-card gba:border-info/50 hover:gba:bg-info-secondary/10 hover:gba:text-info-on-card hover:gba:border-info gba:focus-visible:ring-info/40 gba:focus-visible:border-info"
                                      data-testid={`${PREFIX}-actions-trigger-${index}`}
                                    >
                                      <Lightning className="gba:size-4 gba:shrink-0" weight="regular" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="gba:w-auto gba:p-0"
                                    align="end"
                                    data-testid={`${PREFIX}-actions-popover-${index}`}
                                  >
                                    <div className="gba:flex gba:flex-col gba:gap-1 gba:p-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gba:justify-start gba:gap-2 gba:h-8 gba:px-2"
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleEditRule(record)
                                        }}
                                        data-testid={`${PREFIX}-edit-rule-${index}`}
                                      >
                                        <PiPencil className="gba:w-4 gba:h-4" />
                                        <span>
                                          {getTranslationFromI18nKeyAndLabel(
                                            'lowcoder:expense_calculation_rule.edit',
                                            'Edit'
                                          )}
                                        </span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gba:justify-start gba:gap-2 gba:h-8 gba:px-2 gba:text-destructive"
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleDeleteRule(record)
                                        }}
                                        data-testid={`${PREFIX}-delete-rule-${index}`}
                                      >
                                        <PiTrash className="gba:w-4 gba:h-4" />
                                        <span>
                                          {getTranslationFromI18nKeyAndLabel(
                                            'lowcoder:expense_calculation_rule.delete',
                                            'Delete'
                                          )}
                                        </span>
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
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
              const initialData = {
                id: editingRule.id,
                version: editingRule.version,
                code: editingRule.code,
                ruleName: editingRule.name,
                description: editingRule.description || '',
                rulePeriod: editingRule.rulePeriod || '',
                activeFrom: editingRule.effectiveFrom ? dayjs(editingRule.effectiveFrom).format('YYYY-MM-DD') : '',
                activeTo: editingRule.effectiveTo ? dayjs(editingRule.effectiveTo).format('YYYY-MM-DD') : '',
                details: editingRule.details.map(detail => ({
                  id: detail.id,
                  version: detail.version,
                  rateAmount: detail.amount,
                  limitFrom: detail.limitFrom,
                  limitTo: detail.limitTo,
                  detailOrder: detail.detailOrder,
                  activeFrom: detail.activeFrom ? dayjs(detail.activeFrom).format('YYYY-MM-DD') : '',
                  activeTo: detail.activeTo ? dayjs(detail.activeTo).format('YYYY-MM-DD') : ''
                }))
              }

              // DEBUG: Log what we're passing to the form
              console.log('🐛 EditingRule initial data:', {
                ruleId: initialData.id,
                ruleVersion: initialData.version,
                ruleCode: initialData.code,
                detailsWithVersions: initialData.details.map(d => ({
                  id: d.id,
                  version: d.version
                }))
              })

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
    </div>
  )
}

export default MileageRulesList
