import React, { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Spinner,
  Toaster,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { PiPlus, PiCalendar, PiReceipt, PiPercent } from 'react-icons/pi'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { ExpenseRuleGeneralExpense, ExpenseGroupWithTranslations } from '../../../types/ExpenseRuleTypes'
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient'

interface GeneralExpensesTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
}

interface GeneralExpenseFormData {
  id?: string
  expenseRuleId: string
  code: string
  name: string
  reimbursable: boolean
  taxCodeRef?: string
  taxValue?: number
  activeFrom: string
  activeTo?: string
  expenseGroupRef?: string
  version?: number
}

interface TaxCodeOption {
  id: string
  value: string
  code: string
}

const GeneralExpensesTab: React.FC<GeneralExpensesTabProps> = ({ ruleId, accessToken, activeFrom }) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  const [generalExpenses, setGeneralExpenses] = useState<ExpenseRuleGeneralExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<ExpenseRuleGeneralExpense | null>(null)
  const [formData, setFormData] = useState<GeneralExpenseFormData>({
    expenseRuleId: ruleId,
    code: '',
    name: '',
    reimbursable: false,
    activeFrom: activeFrom
  })

  // ✅ NEW: TaxCode catalog state
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(true)

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

  // ✅ NEW: Load TaxCode catalog
  const loadTaxCodes = useCallback(async () => {
    setCatalogsLoading(true)
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'TaxCode', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: true }
      )

      setTaxCodes(
        response.data.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))
      )
    } catch (error) {
      console.error('Error loading TaxCode catalog:', error)
    } finally {
      setCatalogsLoading(false)
    }
  }, [catalogClient])

  const fetchGeneralExpenses = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleGeneralExpenses($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleGeneralExpense(where: { isDeleted: { _eq: false } }) {
              id
              code
              name
              reimbursable
              taxCodeRef
              taxValue
              activeFrom
              activeTo
              version
              expenseGroup {
                id
                value
                code
                translations {
                  value
                  localeCode
                }
              }
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        ExpenseRule: { expenseRuleGeneralExpense: ExpenseRuleGeneralExpense[] }[]
      }>(query, { ruleId })

      const expenseRule = result.ExpenseRule?.[0]
      const generalExpenses = expenseRule?.expenseRuleGeneralExpense || []

      setGeneralExpenses(generalExpenses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load general expenses')
      console.error('Error fetching general expenses:', err)
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, ruleId])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchGeneralExpenses()
      loadTaxCodes()
    }
  }, [ruleId, accessToken, fetchGeneralExpenses, loadTaxCodes])

  const handleAdd = () => {
    setEditingItem(null)
    setFormData({
      expenseRuleId: ruleId,
      code: '',
      name: '',
      reimbursable: true,
      taxValue: 0,
      activeFrom: activeFrom
    })
    setIsModalVisible(true)
  }

  // Note: Edit and delete actions are now handled through AppActionButton's context flow
  // These handlers are kept for potential future direct action requirements

  const handleSave = async () => {
    try {
      setIsSaving(true)

      const saveData: GeneralExpenseFormData = {
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        code: formData.code,
        name: formData.name,
        reimbursable: formData.reimbursable,
        taxCodeRef: formData.taxCodeRef,
        taxValue: formData.taxValue,
        activeFrom: formData.activeFrom,
        activeTo: formData.activeTo,
        expenseGroupRef: formData.expenseGroupRef
      }

      await expenseSettingsClient.saveExpenseRuleGeneralExpense(saveData)
      toast.success(`General expense rule ${editingItem ? 'updated' : 'created'} successfully`)

      setIsModalVisible(false)
      await fetchGeneralExpenses()
    } catch (err) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} general expense rule`)
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD.MM.YYYY')
  }

  const formatTaxValue = (taxValue?: number): string => {
    if (taxValue === undefined || taxValue === null) return 'Not set'
    return `${taxValue}%`
  }

  // Mock expense group options - in real implementation, these would come from catalog
  const expenseGroupOptions = [
    { value: 'ExpenseGroup:v1:TRAVEL', label: 'Travel Expenses' },
    { value: 'ExpenseGroup:v1:MEALS', label: 'Meals & Entertainment' },
    { value: 'ExpenseGroup:v1:OFFICE', label: 'Office Supplies' },
    { value: 'ExpenseGroup:v1:TRANSPORT', label: 'Transportation' },
    { value: 'ExpenseGroup:v1:ACCOMMODATION', label: 'Accommodation' }
  ]

  const formatReimbursable = (reimbursable: boolean): React.ReactNode => {
    if (reimbursable === true) {
      return <Badge variant="success">Yes</Badge>
    } else if (reimbursable === false) {
      return <Badge variant="destructive">No</Badge>
    }
    return <span className="gba:text-muted-foreground">Not set</span>
  }

  const getLocalizedExpenseGroupName = (expenseGroup?: ExpenseGroupWithTranslations): string => {
    if (!expenseGroup) return 'Not set'

    // Try to find current locale translation first
    const currentLocale = 'en-US' // Could be from getCurrentActiveUserLocale()
    const translation = expenseGroup.translations?.find(t => t.localeCode === currentLocale)

    if (translation?.value) {
      return translation.value
    }

    // Fallback to default value
    return expenseGroup.value || 'Not set'
  }

  const formatTaxCode = (taxCodeRef?: string): string => {
    if (!taxCodeRef) return 'Not set'

    // Find the tax code in the loaded catalog
    const taxCode = taxCodes.find(tc => tc.id === taxCodeRef)
    if (taxCode) {
      return taxCode.code
    }

    // Fallback: Extract the actual tax code from the reference
    // "TaxCode:v1:V00" -> "V00"
    const parts = taxCodeRef.split(':')
    return parts.length >= 3 ? parts[2] : taxCodeRef
  }

  if (isLoading) {
    return (
      <div
        data-testid="general-expenses-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="general-expenses-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <strong>Error Loading General Expenses</strong>
              <p className="gba:mt-1">{error}</p>
            </div>
            <Button size="sm" onClick={fetchGeneralExpenses} variant="outline">
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid="general-expenses-tab">
      <Toaster />

      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:m-0">General Expenses</h3>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:m-0">
            Manage general expense rules and tax configurations
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="add-general-expense-button">
          <PiPlus className="gba:mr-2" />
          Add General Expense
        </Button>
      </div>

      {/* Table */}
      <Card data-testid="general-expenses-card">
        <CardContent className="gba:p-0">
          {isSaving && (
            <div className="gba:absolute gba:inset-0 gba:bg-background/50 gba:flex gba:items-center gba:justify-center gba:z-10">
              <Spinner className="gba:w-6 gba:h-6" />
            </div>
          )}

          <Table data-testid="general-expenses-table">
            <TableHeader data-testid="general-expenses-table-header">
              <TableRow data-testid="general-expenses-table-header-row">
                <TableHead className="gba:w-[60px]" data-testid="general-expenses-table-header-actions">
                  ACTIONS
                </TableHead>
                <TableHead className="gba:w-[200px]" data-testid="general-expenses-table-header-expense">
                  EXPENSE
                </TableHead>
                <TableHead
                  className="gba:w-[120px] gba:text-center"
                  data-testid="general-expenses-table-header-reimbursable"
                >
                  REIMBURSABLE
                </TableHead>
                <TableHead className="gba:w-[130px]" data-testid="general-expenses-table-header-tax">
                  TAX
                </TableHead>
                <TableHead className="gba:w-[180px]" data-testid="general-expenses-table-header-validity">
                  VALIDITY
                </TableHead>
                <TableHead className="gba:w-[150px]" data-testid="general-expenses-table-header-group">
                  EXPENSE GROUP
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="general-expenses-table-body">
              {generalExpenses.length === 0 ? (
                <TableRow data-testid="general-expenses-empty-row">
                  <TableCell colSpan={6} className="gba:text-center gba:py-8" data-testid="general-expenses-empty-cell">
                    <div className="gba:text-muted-foreground" data-testid="general-expenses-empty-message">
                      No general expense rules found. Click "Add General Expense" to create one.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                generalExpenses.map(record => (
                  <TableRow key={record.id} data-testid={`general-expense-row-${record.id}`}>
                    <TableCell data-testid={`general-expense-action-cell-${record.id}`}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`general-expense-action-${record.id}`}
                          size="icon"
                          contextsArray={[]}
                          externalContextData={{ generalExpenseId: record.id }}
                          prefixDataTestId="general-expense-action"
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>

                    <TableCell data-testid={`general-expense-code-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiReceipt
                          className="gba:text-muted-foreground"
                          data-testid={`general-expense-code-icon-${record.id}`}
                        />
                        <div>
                          <div
                            className="gba:font-mono gba:font-medium gba:text-sm"
                            data-testid={`general-expense-code-text-${record.id}`}
                          >
                            {record.code}
                          </div>
                          <div
                            className="gba:text-muted-foreground gba:text-xs"
                            data-testid={`general-expense-name-text-${record.id}`}
                          >
                            {record.name || 'No name set'}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell
                      className="gba:text-center"
                      data-testid={`general-expense-reimbursable-cell-${record.id}`}
                    >
                      {formatReimbursable(record.reimbursable)}
                    </TableCell>

                    <TableCell data-testid={`general-expense-tax-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiPercent
                          className="gba:text-muted-foreground"
                          data-testid={`general-expense-tax-icon-${record.id}`}
                        />
                        <span
                          className="gba:font-mono gba:text-sm"
                          data-testid={`general-expense-tax-text-${record.id}`}
                        >
                          {formatTaxCode(record.taxCodeRef)}: {formatTaxValue(record.taxValue)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`general-expense-validity-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiCalendar
                          className="gba:text-muted-foreground"
                          data-testid={`general-expense-validity-icon-${record.id}`}
                        />
                        <span className="gba:text-sm" data-testid={`general-expense-validity-text-${record.id}`}>
                          {formatDate(record.activeFrom)} - {record.activeTo ? formatDate(record.activeTo) : '∞'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`general-expense-group-cell-${record.id}`}>
                      {record.expenseGroup?.code ? (
                        <Badge
                          variant="default"
                          title={getLocalizedExpenseGroupName(record.expenseGroup)}
                          data-testid={`general-expense-group-badge-${record.id}`}
                        >
                          {record.expenseGroup.code}
                        </Badge>
                      ) : (
                        <span
                          className="gba:text-muted-foreground"
                          data-testid={`general-expense-group-empty-${record.id}`}
                        >
                          Not set
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="gba:max-w-2xl" data-testid="general-expense-modal">
          <DialogHeader data-testid="general-expense-modal-header">
            <DialogTitle data-testid="general-expense-modal-title">
              {editingItem ? 'Edit' : 'Add'} General Expense Rule
            </DialogTitle>
          </DialogHeader>

          <div className="gba:space-y-4" data-testid="general-expense-form">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div data-testid="general-expense-code-field">
                <Label htmlFor="code" data-testid="general-expense-code-label">
                  Code *
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Enter expense code"
                  data-testid="general-expense-code-input"
                />
              </div>

              <div data-testid="general-expense-name-field">
                <Label htmlFor="name" data-testid="general-expense-name-label">
                  Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter expense name"
                  data-testid="general-expense-name-input"
                />
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2" data-testid="general-expense-reimbursable-field">
                <input
                  type="checkbox"
                  id="reimbursable"
                  checked={formData.reimbursable}
                  onChange={e => setFormData({ ...formData, reimbursable: e.target.checked })}
                  className="gba:h-4 gba:w-4"
                  data-testid="general-expense-reimbursable-checkbox"
                />
                <Label htmlFor="reimbursable" data-testid="general-expense-reimbursable-label">
                  Reimbursable
                </Label>
              </div>

              <div data-testid="general-expense-tax-code-field">
                <Label htmlFor="taxCodeRef" data-testid="general-expense-tax-code-label">
                  Tax Code
                </Label>
                <Select
                  value={formData.taxCodeRef}
                  onValueChange={value => setFormData({ ...formData, taxCodeRef: value })}
                  disabled={catalogsLoading}
                >
                  <SelectTrigger id="taxCodeRef" data-testid="general-expense-tax-code-select">
                    <SelectValue placeholder="Select tax code" />
                  </SelectTrigger>
                  <SelectContent data-testid="general-expense-tax-code-options">
                    {taxCodes.map(taxCode => (
                      <SelectItem
                        key={taxCode.id}
                        value={taxCode.id}
                        data-testid={`general-expense-tax-code-option-${taxCode.id}`}
                      >
                        {taxCode.code} - {taxCode.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div data-testid="general-expense-tax-value-field">
                <Label htmlFor="taxValue" data-testid="general-expense-tax-value-label">
                  Tax Value (%)
                </Label>
                <Input
                  id="taxValue"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={formData.taxValue || ''}
                  onChange={e => setFormData({ ...formData, taxValue: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                  data-testid="general-expense-tax-value-input"
                />
              </div>

              <div data-testid="general-expense-group-field">
                <Label htmlFor="expenseGroupRef" data-testid="general-expense-group-label">
                  Expense Group
                </Label>
                <Select
                  value={formData.expenseGroupRef}
                  onValueChange={value => setFormData({ ...formData, expenseGroupRef: value })}
                >
                  <SelectTrigger id="expenseGroupRef" data-testid="general-expense-group-select">
                    <SelectValue placeholder="Select expense group" />
                  </SelectTrigger>
                  <SelectContent data-testid="general-expense-group-options">
                    {expenseGroupOptions.map(option => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        data-testid={`general-expense-group-option-${option.value}`}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div data-testid="general-expense-active-from-field">
                <Label htmlFor="activeFrom" data-testid="general-expense-active-from-label">
                  Valid From *
                </Label>
                <Input
                  id="activeFrom"
                  type="date"
                  value={formData.activeFrom ? dayjs(formData.activeFrom).format('YYYY-MM-DD') : ''}
                  onChange={e => setFormData({ ...formData, activeFrom: e.target.value })}
                  data-testid="general-expense-active-from-input"
                />
              </div>

              <div data-testid="general-expense-active-to-field">
                <Label htmlFor="activeTo" data-testid="general-expense-active-to-label">
                  Valid To
                </Label>
                <Input
                  id="activeTo"
                  type="date"
                  value={formData.activeTo ? dayjs(formData.activeTo).format('YYYY-MM-DD') : ''}
                  onChange={e => setFormData({ ...formData, activeTo: e.target.value || undefined })}
                  data-testid="general-expense-active-to-input"
                />
              </div>
            </div>
          </div>

          <DialogFooter data-testid="general-expense-modal-footer">
            <Button
              variant="outline"
              onClick={() => setIsModalVisible(false)}
              disabled={isSaving}
              data-testid="general-expense-modal-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="general-expense-modal-save-button">
              {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GeneralExpensesTab
