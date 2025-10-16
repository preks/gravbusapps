import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Card,
  CardContent,
  Spinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import { PiPlus } from 'react-icons/pi'
import { ContextMenu, createEditAction, createDeleteAction } from '../ContextMenu'
import { CalculationRuleForm, CalculationRuleFormData } from '../../forms/calculation-rule-form'
import { expenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import { ExpenseRule } from '../../types/ExpenseRuleTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { DataControllerProps } from '@/components/dataController/DataController'
import { ICONS } from '@/business-apps/fin/expenses/utils/icons'
import TimePeriodFilter from '../mileage-rules/filters/TimePeriodFilter'
import { Checkbox } from 'antd'

export interface CalculationRulesListProps extends BusinessAppContextProps {
  rules: ExpenseRule[]
  isLoading: boolean
  onRefresh: () => void
  onNavigateToRule?: (ruleId: string, page?: string) => void
}

const PREFIX = 'calculation-rules-list'

const CalculationRulesList: React.FC<CalculationRulesListProps> = ({
  accessToken,
  rules,
  isLoading,
  onRefresh,
  onNavigateToRule
}) => {
  // Simple toast implementation until design system provides one
  const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    const style = variant === 'destructive' ? 'color: red' : 'color: green'
    console.log(`%c${title}: ${description}`, style)
    // TODO: Replace with proper toast implementation when available in design system
  }

  // Filter states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState({ active: false, inactive: false })
  const [validFromFilter, setValidFromFilter] = useState<string | null>(null)
  const [validToFilter, setValidToFilter] = useState<string | null>(null)
  const [standardFilter, setStandardFilter] = useState({ standard: false, custom: false })

  // Modal state management
  const [isCreateRuleModalVisible, setIsCreateRuleModalVisible] = useState(false)
  const [isEditRuleModalVisible, setIsEditRuleModalVisible] = useState(false)
  const [editingRule, setEditingRule] = useState<ExpenseRule | null>(null)

  // Modal handlers
  const handleCreateRule = () => {
    setIsCreateRuleModalVisible(true)
  }

  const handleEditRule = (rule: ExpenseRule) => {
    setEditingRule(rule)
    setIsEditRuleModalVisible(true)
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<ExpenseRule | null>(null)

  const handleDeleteRule = (rule: ExpenseRule) => {
    setRuleToDelete(rule)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return

    try {
      await expenseSettingsClient.deleteCalculationRule(ruleToDelete.id, ruleToDelete.version)
      toast({
        title: 'Success',
        description: 'Calculation rule deleted successfully'
      })
      await onRefresh()
    } catch (error) {
      console.error('Error deleting calculation rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete calculation rule',
        variant: 'destructive'
      })
    } finally {
      setDeleteDialogOpen(false)
      setRuleToDelete(null)
    }
  }

  // Transform ExpenseRule to CalculationRuleFormData
  const transformRuleToFormData = (rule: ExpenseRule): CalculationRuleFormData => {
    return {
      id: rule.id,
      code: rule.code,
      name: rule.name,
      standard: rule.standard,
      activeFrom: rule.activeFrom,
      activeTo: rule.activeTo,
      deductionLimit: rule.deductionLimit,
      useLastCountry: rule.useLastCountry,
      useSingleCurrency: rule.useSingleCurrency,
      taxesCode: rule.taxesCode,
      nonpayableCode: rule.nonpayableCode,
      advancePaymentCode: rule.advancePaymentCode,
      calculationTypeRef: rule.calculationType?.id,
      countryRef: rule.country?.id,
      currencyRef: rule.currency?.id,
      version: rule.version
    }
  }

  const handleCreateRuleSubmit = async () => {
    try {
      // TODO: Implement actual create API call
      toast({
        title: 'Success',
        description: 'Rule created successfully'
      })
      setIsCreateRuleModalVisible(false)
      onRefresh()
    } catch (error) {
      console.error('Error creating rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to create rule',
        variant: 'destructive'
      })
    }
  }

  const handleEditRuleSubmit = async () => {
    try {
      // TODO: Implement actual update API call
      toast({
        title: 'Success',
        description: 'Rule updated successfully'
      })
      setIsEditRuleModalVisible(false)
      setEditingRule(null)
      onRefresh()
    } catch (error) {
      console.error('Error updating rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to update rule',
        variant: 'destructive'
      })
    }
  }

  const handleModalCancel = () => {
    setIsCreateRuleModalVisible(false)
    setIsEditRuleModalVisible(false)
    setEditingRule(null)
  }

  // Client-side filtering logic
  const filteredRules = useMemo(() => {
    let filtered = [...rules]

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        rule =>
          rule.code.toLowerCase().includes(searchLower) ||
          rule.name?.toLowerCase().includes(searchLower) ||
          rule.calculationType?.value?.toLowerCase().includes(searchLower) ||
          rule.country?.value?.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (statusFilter.active || statusFilter.inactive) {
      const now = new Date()
      filtered = filtered.filter(rule => {
        const activeFrom = rule.activeFrom ? new Date(rule.activeFrom) : null
        const activeTo = rule.activeTo ? new Date(rule.activeTo) : null
        const isActive = !rule.isDeleted && (!activeFrom || activeFrom <= now) && (!activeTo || activeTo >= now)

        if (statusFilter.active && statusFilter.inactive) return true // Both selected
        if (statusFilter.active) return isActive
        if (statusFilter.inactive) return !isActive
        return true
      })
    }

    // Apply date range filter
    if (validFromFilter) {
      filtered = filtered.filter(rule => {
        const ruleDate = rule.activeFrom ? new Date(rule.activeFrom) : null
        return ruleDate && ruleDate >= new Date(validFromFilter)
      })
    }

    if (validToFilter) {
      filtered = filtered.filter(rule => {
        const ruleDate = rule.activeTo ? new Date(rule.activeTo) : null
        return !ruleDate || ruleDate <= new Date(validToFilter)
      })
    }

    // Apply standard/custom filter
    if (standardFilter.standard || standardFilter.custom) {
      filtered = filtered.filter(rule => {
        if (standardFilter.standard && standardFilter.custom) return true
        if (standardFilter.standard) return rule.standard === true
        if (standardFilter.custom) return !rule.standard
        return true
      })
    }

    return filtered
  }, [rules, search, statusFilter, validFromFilter, validToFilter, standardFilter])

  const resetFilters = () => {
    setStatusFilter({ active: false, inactive: false })
    setValidFromFilter(null)
    setValidToFilter(null)
    setStandardFilter({ standard: false, custom: false })
  }

  // Filter groups configuration
  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'status',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.status', 'Filter by Status'),
        customComponent: (
          <div className="gba:space-y-2" data-testid={`${PREFIX}-status-filter`}>
            <div>
              <Checkbox
                checked={statusFilter.active}
                onChange={e => setStatusFilter({ ...statusFilter, active: e.target.checked })}
                data-testid={`${PREFIX}-status-active`}
              >
                {getTranslationFromI18nKeyAndLabel('common.active', 'Active')}
              </Checkbox>
            </div>
            <div>
              <Checkbox
                checked={statusFilter.inactive}
                onChange={e => setStatusFilter({ ...statusFilter, inactive: e.target.checked })}
                data-testid={`${PREFIX}-status-inactive`}
              >
                {getTranslationFromI18nKeyAndLabel('common.inactive', 'Inactive')}
              </Checkbox>
            </div>
          </div>
        ),
        hideSearch: true
      },
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
        id: 'rule-type',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.ruleType', 'Filter by Rule Type'),
        customComponent: (
          <div className="gba:space-y-2" data-testid={`${PREFIX}-rule-type-filter`}>
            <div>
              <Checkbox
                checked={standardFilter.standard}
                onChange={e => setStandardFilter({ ...standardFilter, standard: e.target.checked })}
                data-testid={`${PREFIX}-rule-type-standard`}
              >
                {getTranslationFromI18nKeyAndLabel('expenseSettings.ruleType.standard', 'Standard')}
              </Checkbox>
            </div>
            <div>
              <Checkbox
                checked={standardFilter.custom}
                onChange={e => setStandardFilter({ ...standardFilter, custom: e.target.checked })}
                data-testid={`${PREFIX}-rule-type-custom`}
              >
                {getTranslationFromI18nKeyAndLabel('expenseSettings.ruleType.custom', 'Custom')}
              </Checkbox>
            </div>
          </div>
        ),
        hideSearch: true
      }
    ]
  }, [statusFilter, validFromFilter, validToFilter, standardFilter])

  // Data controller props
  const dataControllerProps: DataControllerProps = {
    listTitle: getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.rules.title', 'Calculation Rules'),
    listAmount: filteredRules.length,
    search,
    setSearch,
    debounceDelay: 300,
    filter: [],
    setFilter: () => {},
    filterLabelMap: {},
    actions: (
      <Button onClick={handleCreateRule} data-testid={`${PREFIX}-create-button`}>
        <PiPlus className="gba:mr-2 gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('expenseSettings.actions.createRule', 'Create Rule')}
      </Button>
    )
  } as any

  const handleRowClick = (record: ExpenseRule) => {
    // Navigate to rule record if navigation function is provided
    if (onNavigateToRule) {
      onNavigateToRule(record.id, 'Rules')
    }
  }

  const renderRulesTable = () => {
    return (
      <div className="gba:w-full gba:overflow-x-auto">
        <Table className="gba:min-w-[900px] gba:table-fixed gba:text-sm">
          <TableHeader>
            <TableRow className="gba:h-10">
              <TableHead className="gba:w-[220px] gba:py-2 gba:px-3 gba:text-xs">RULE</TableHead>
              <TableHead className="gba:w-[140px] gba:py-2 gba:px-3 gba:text-xs">CALCULATION TYPE</TableHead>
              <TableHead className="gba:w-[100px] gba:py-2 gba:px-3 gba:text-xs">COUNTRY</TableHead>
              <TableHead className="gba:w-[90px] gba:py-2 gba:px-3 gba:text-xs">CURRENCY</TableHead>
              <TableHead className="gba:w-[80px] gba:py-2 gba:px-3 gba:text-xs">STANDARD</TableHead>
              <TableHead className="gba:w-[170px] gba:py-2 gba:px-3 gba:text-xs">ACTIVE PERIOD</TableHead>
              <TableHead className="gba:w-[70px] gba:py-2 gba:px-3 gba:text-xs">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRules.map(rule => (
              <TableRow
                key={rule.id}
                className="gba:cursor-pointer hover:gba:bg-gray-50 gba:h-12"
                onClick={() => handleRowClick(rule)}
                data-testid={`calculation-rules-rule-row-${rule.id}`}
              >
                <TableCell className="gba:py-2 gba:px-3 gba:w-[220px]">
                  <div>
                    <div
                      className="gba:font-medium gba:text-gray-900 gba:text-sm gba:truncate gba:leading-tight"
                      title={rule.name || '-'}
                    >
                      {rule.name || '-'}
                    </div>
                    <div className="gba:text-xs gba:text-gray-500 gba:truncate gba:leading-tight" title={rule.code}>
                      {rule.code}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="gba:py-2 gba:px-3 gba:w-[140px]">
                  <div
                    className="gba:text-gray-900 gba:text-sm gba:truncate"
                    title={rule.calculationType?.value || '-'}
                  >
                    {rule.calculationType?.value || '-'}
                  </div>
                </TableCell>
                <TableCell className="gba:py-2 gba:px-3 gba:w-[100px]">
                  <div className="gba:text-gray-900 gba:text-sm gba:truncate" title={rule.country?.value || '-'}>
                    {rule.country?.value || '-'}
                  </div>
                </TableCell>
                <TableCell className="gba:py-2 gba:px-3 gba:w-[90px]">
                  <div className="gba:text-gray-900 gba:text-sm gba:truncate" title={rule.currency?.value || '-'}>
                    {rule.currency?.value || '-'}
                  </div>
                </TableCell>
                <TableCell className="gba:py-2 gba:px-3 gba:w-[80px]">
                  <Badge variant={rule.standard ? 'default' : 'secondary'} className="gba:text-xs gba:px-2 gba:py-0.5">
                    {rule.standard ? 'Yes' : 'No'}
                  </Badge>
                </TableCell>
                <TableCell className="gba:py-2 gba:px-3 gba:w-[170px]">
                  {(() => {
                    const now = new Date()
                    const activeFrom = new Date(rule.activeFrom)
                    const activeTo = rule.activeTo ? new Date(rule.activeTo) : null
                    const isActive = activeFrom <= now && (!activeTo || activeTo >= now)
                    const timeFrame = `${dayjs(rule.activeFrom).format('DD/MM/YYYY')} - ${rule.activeTo ? dayjs(rule.activeTo).format('DD/MM/YYYY') : 'Ongoing'}`

                    return (
                      <div
                        className={`gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:font-medium gba:text-center gba:truncate ${
                          isActive
                            ? 'gba:bg-green-100 gba:text-green-800 gba:border gba:border-green-200'
                            : 'gba:bg-gray-100 gba:text-gray-600 gba:border gba:border-gray-200'
                        }`}
                        title={`${timeFrame} (${isActive ? 'Active' : 'Inactive'})`}
                      >
                        {timeFrame}
                      </div>
                    )
                  })()}
                </TableCell>
                <TableCell className="gba:py-2 gba:px-3 gba:w-[70px]">
                  <div className="gba:flex gba:justify-center">
                    <ContextMenu
                      actions={[
                        createEditAction(() => handleEditRule(rule)),
                        createDeleteAction(() => handleDeleteRule(rule))
                      ]}
                      triggerTestId={`calculation-rules-actions-${rule.id}`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

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
                {!isLoading && filteredRules.length === 0 && (
                  <div className="gba:p-8 gba:text-center">
                    <div className="gba:text-gray-500" data-testid={`${PREFIX}-empty`}>
                      {getTranslationFromI18nKeyAndLabel('common.noDataFound', 'No data found')}
                    </div>
                  </div>
                )}
                {!isLoading && filteredRules.length > 0 && renderRulesTable()}
              </CardContent>
            </Card>
          </div>
        }
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="calculation-rules-delete-confirmation-dialog">
          <DialogHeader>
            <DialogTitle>Delete Calculation Rule</DialogTitle>
          </DialogHeader>
          <div className="gba:py-4">
            <p className="gba:text-sm gba:text-gray-600">
              Are you sure you want to delete the calculation rule "{ruleToDelete?.code}"
              {ruleToDelete?.name ? ` - ${ruleToDelete.name}` : ''}? This action cannot be undone.
            </p>
          </div>
          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRule}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Rule Dialog */}
      <Dialog open={isCreateRuleModalVisible} onOpenChange={setIsCreateRuleModalVisible}>
        <DialogContent
          className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto"
          data-testid="calculation-rules-create-rule-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('expenseSettings.modals.createRule.title', 'Create Calculation Rule')}
            </DialogTitle>
          </DialogHeader>
          <CalculationRuleForm
            accessToken={accessToken}
            onSave={handleCreateRuleSubmit}
            onCancel={handleModalCancel}
            isEditing={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={isEditRuleModalVisible} onOpenChange={setIsEditRuleModalVisible}>
        <DialogContent
          className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto"
          data-testid="calculation-rules-edit-rule-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editRule.title', 'Edit Calculation Rule')}
            </DialogTitle>
          </DialogHeader>
          {editingRule && (
            <CalculationRuleForm
              accessToken={accessToken}
              onSave={handleEditRuleSubmit}
              onCancel={handleModalCancel}
              isEditing={true}
              initialData={transformRuleToFormData(editingRule)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CalculationRulesList
