import React, { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
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
  SelectValue,
  Switch as NWSwitch
} from '@newwork/nw-design-system'
import { PiPlus, PiPencil, PiCalendar, PiCheck, PiX, PiGear, PiCode } from 'react-icons/pi'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient'

interface AllowanceSetupTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
}

interface AllowanceSetup {
  id: string
  name: string
  issue: string
  onlyTax: boolean
  validFrom: string
  validTo?: string
  allowancePeriod: {
    id: string
    code: string
    name: string
  }
  allowanceCode: {
    id: string
    code: string
    name: string
  }
  version?: number
  isDeleted: boolean
}

interface AllowanceSetupFormData {
  id?: string
  name: string
  issue: string
  onlyTax: boolean
  validFrom: string
  validTo?: string
  allowancePeriodId: string
  allowanceCodeId: string
  version?: number
}

const AllowanceSetupTab: React.FC<AllowanceSetupTabProps> = ({ ruleId, accessToken, activeFrom }) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [allowanceSetups, setAllowanceSetups] = useState<AllowanceSetup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<AllowanceSetup | null>(null)
  const [allowancePeriods, setAllowancePeriods] = useState<any[]>([])
  const [allowanceCodes, setAllowanceCodes] = useState<any[]>([])
  const [formData, setFormData] = useState<AllowanceSetupFormData>({
    name: '',
    issue: 'Daily Allowance',
    onlyTax: false,
    validFrom: activeFrom,
    allowancePeriodId: '',
    allowanceCodeId: ''
  })

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

  const fetchAllowanceSetups = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleAllowanceSetups($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleAllowanceSetup(where: { isDeleted: { _eq: false } }, orderBy: { setupOrder: ASC }) {
              id
              name
              issue
              onlyTax
              activeFrom
              activeTo
              version
              allowancePeriod {
                id
                code
                name
              }
              allowanceCode {
                id
                code
                name
              }
            }
            expenseRuleAllowancePeriod(where: { isDeleted: { _eq: false } }) {
              id
              code
              name
            }
            expenseRuleAllowanceCode(where: { isDeleted: { _eq: false } }) {
              id
              code
              name
            }
          }
        }
      `

      const result = await graphqlClient.request<{ ExpenseRule: any[] }>(query, { ruleId })

      const expenseRule = result.ExpenseRule?.[0]
      const setups = expenseRule?.expenseRuleAllowanceSetup || []
      const periods = expenseRule?.expenseRuleAllowancePeriod || []
      const codes = expenseRule?.expenseRuleAllowanceCode || []

      const transformedSetups: AllowanceSetup[] = setups.map((setup: any) => ({
        id: setup.id,
        name: setup.name || '',
        issue: setup.issue || '',
        onlyTax: setup.onlyTax || false,
        validFrom: setup.activeFrom,
        validTo: setup.activeTo,
        allowancePeriod: setup.allowancePeriod || { id: '', code: '', name: '' },
        allowanceCode: setup.allowanceCode || { id: '', code: '', name: '' },
        version: setup.version || 1,
        isDeleted: false
      }))

      setAllowanceSetups(transformedSetups)
      setAllowancePeriods(periods)
      setAllowanceCodes(codes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allowance setups')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, graphqlClient])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchAllowanceSetups()
    }
  }, [ruleId, accessToken, fetchAllowanceSetups])

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY')
  }

  const issueOptions = [
    { value: 'Daily Allowance', label: 'Daily Allowance' },
    { value: 'Breakfast Deduction', label: 'Breakfast Deduction' },
    { value: 'Lunch Deduction', label: 'Lunch Deduction' },
    { value: 'Dinner Deduction', label: 'Dinner Deduction' },
    { value: 'Special Allowance', label: 'Special Allowance' },
    { value: 'Travel Allowance', label: 'Travel Allowance' }
  ]

  const handleAdd = () => {
    setEditingItem(null)
    setFormData({
      name: '',
      issue: 'Daily Allowance',
      onlyTax: false,
      validFrom: activeFrom,
      allowancePeriodId: '',
      allowanceCodeId: ''
    })
    setIsModalVisible(true)
  }

  const handleEdit = (record: AllowanceSetup) => {
    setFormData({
      id: record.id,
      name: record.name,
      issue: record.issue,
      onlyTax: record.onlyTax,
      validFrom: record.validFrom,
      validTo: record.validTo,
      allowancePeriodId: record.allowancePeriod.id,
      allowanceCodeId: record.allowanceCode.id,
      version: record.version
    })

    setEditingItem(record)
    setIsModalVisible(true)
  }

  // Note: Delete actions are now handled through AppActionButton's context flow

  const handleSave = async () => {
    try {
      setIsSaving(true)

      await expenseSettingsClient.saveExpenseRuleAllowanceSetup({
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        businessKey: undefined,
        activeTo: formData.validTo,
        additionalProperties: undefined,
        name: formData.name,
        issue: formData.issue,
        onlyTax: formData.onlyTax,
        activeFrom: formData.validFrom,
        setupOrder: undefined,
        allowancePeriodId: formData.allowancePeriodId,
        allowanceCodeId: formData.allowanceCodeId
      })

      toast.success(`Allowance setup ${editingItem ? 'updated' : 'created'} successfully`)
      setIsModalVisible(false)
      await fetchAllowanceSetups()
    } catch (err) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} allowance setup`)
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Removed Ant Design columns definition - using NW design system Table now

  if (isLoading) {
    return (
      <div
        data-testid="allowance-setup-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="allowance-setup-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div>
              <div className="gba:font-semibold gba:mb-1">Error Loading Allowance Setups</div>
              <div className="gba:text-sm">{error}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllowanceSetups}
              data-testid="allowance-setup-retry-button"
            >
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid="allowance-setup-tab">
      <Toaster />

      <Card data-testid="allowance-setup-card">
        <CardHeader data-testid="allowance-setup-card-header">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:flex gba:items-center gba:gap-2">
              <CardTitle data-testid="allowance-setup-card-title">Allowance Setups</CardTitle>
              <Badge variant="default" data-testid="allowance-setup-count-badge">
                {allowanceSetups.length} setups
              </Badge>
            </div>
            <Button onClick={handleAdd} data-testid="add-allowance-setup-button">
              <PiPlus className="gba:mr-2" />
              Add Allowance Setup
            </Button>
          </div>
        </CardHeader>

        <CardContent data-testid="allowance-setup-card-content">
          {allowanceSetups.length > 0 ? (
            <Table data-testid="allowance-setups-table">
              <TableHeader data-testid="allowance-setups-table-header">
                <TableRow data-testid="allowance-setups-table-header-row">
                  <TableHead className="gba:w-[60px]" data-testid="allowance-setups-table-header-actions">
                    ACTIONS
                  </TableHead>
                  <TableHead className="gba:w-[150px]" data-testid="allowance-setups-table-header-period">
                    ALLOWANCE PERIOD
                  </TableHead>
                  <TableHead className="gba:w-[150px]" data-testid="allowance-setups-table-header-code">
                    ALLOWANCE CODE
                  </TableHead>
                  <TableHead className="gba:w-[200px]" data-testid="allowance-setups-table-header-name">
                    NAME
                  </TableHead>
                  <TableHead className="gba:w-[150px]" data-testid="allowance-setups-table-header-issue">
                    ISSUE
                  </TableHead>
                  <TableHead
                    className="gba:w-[100px] gba:text-center"
                    data-testid="allowance-setups-table-header-tax-only"
                  >
                    TAX ONLY
                  </TableHead>
                  <TableHead className="gba:w-[120px]" data-testid="allowance-setups-table-header-valid-from">
                    VALID FROM
                  </TableHead>
                  <TableHead className="gba:w-[120px]" data-testid="allowance-setups-table-header-valid-to">
                    VALID TO
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="allowance-setups-table-body">
                {allowanceSetups.map(record => (
                  <TableRow key={record.id} data-testid={`allowance-setup-row-${record.id}`}>
                    <TableCell data-testid={`allowance-setup-actions-cell-${record.id}`}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`allowance-setup-action-${record.id}`}
                          size="icon"
                          contextsArray={[]}
                          externalContextData={{ allowanceSetupId: record.id }}
                          prefixDataTestId="allowance-setup-action"
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                          onClick={e => e.stopPropagation()}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(record)}
                          data-testid={`edit-allowance-setup-${record.id}`}
                        >
                          <PiPencil className="gba:h-4 gba:w-4" />
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-period-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiGear className="gba:text-primary" data-testid={`allowance-setup-period-icon-${record.id}`} />
                        <span
                          className="gba:font-mono gba:font-medium"
                          data-testid={`allowance-setup-period-code-${record.id}`}
                        >
                          {record.allowancePeriod.code}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-code-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCode className="gba:text-secondary" data-testid={`allowance-setup-code-icon-${record.id}`} />
                        <span
                          className="gba:font-mono gba:font-medium"
                          data-testid={`allowance-setup-code-text-${record.id}`}
                        >
                          {record.allowanceCode.code}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-name-cell-${record.id}`}>
                      <div>
                        <div className="gba:font-medium" data-testid={`allowance-setup-name-text-${record.id}`}>
                          {record.name}
                        </div>
                        <div
                          className="gba:text-xs gba:text-muted-foreground"
                          data-testid={`allowance-setup-code-name-${record.id}`}
                        >
                          {record.allowanceCode.name}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-issue-cell-${record.id}`}>
                      <Badge
                        variant={
                          record.issue === 'Daily Allowance'
                            ? 'default'
                            : record.issue === 'Breakfast Deduction'
                              ? 'default'
                              : record.issue === 'Lunch Deduction'
                                ? 'default'
                                : record.issue === 'Dinner Deduction'
                                  ? 'default'
                                  : record.issue === 'Special Allowance'
                                    ? 'default'
                                    : 'default'
                        }
                        data-testid={`allowance-setup-issue-badge-${record.id}`}
                      >
                        {record.issue}
                      </Badge>
                    </TableCell>

                    <TableCell className="gba:text-center" data-testid={`allowance-setup-tax-only-cell-${record.id}`}>
                      {record.onlyTax ? (
                        <PiCheck
                          className="gba:text-success gba:text-lg gba:inline-block"
                          data-testid={`allowance-setup-tax-only-check-${record.id}`}
                        />
                      ) : (
                        <PiX
                          className="gba:text-muted-foreground gba:text-lg gba:inline-block"
                          data-testid={`allowance-setup-tax-only-x-${record.id}`}
                        />
                      )}
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-valid-from-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiCalendar
                          className="gba:text-muted-foreground"
                          data-testid={`allowance-setup-valid-from-icon-${record.id}`}
                        />
                        <span className="gba:text-sm" data-testid={`allowance-setup-valid-from-text-${record.id}`}>
                          {formatDate(record.validFrom)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-valid-to-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiCalendar
                          className="gba:text-muted-foreground"
                          data-testid={`allowance-setup-valid-to-icon-${record.id}`}
                        />
                        <span className="gba:text-sm" data-testid={`allowance-setup-valid-to-text-${record.id}`}>
                          {record.validTo ? formatDate(record.validTo) : '∞'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div
              className="gba:text-center gba:py-8 gba:text-muted-foreground"
              data-testid="allowance-setups-empty-state"
            >
              <p className="gba:m-0" data-testid="allowance-setups-empty-message">
                No allowance setups configured
              </p>
              <p className="gba:text-xs gba:mt-1" data-testid="allowance-setups-empty-hint">
                Click "Add Allowance Setup" to create your first setup
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="gba:max-w-2xl" data-testid="allowance-setup-modal">
          <DialogHeader data-testid="allowance-setup-modal-header">
            <DialogTitle data-testid="allowance-setup-modal-title">
              {editingItem ? 'Edit' : 'Add'} Allowance Setup
            </DialogTitle>
          </DialogHeader>

          <div data-testid="allowance-setup-form" className="gba:space-y-4">
            {/* Allowance Period */}
            <div className="gba:space-y-2" data-testid="allowance-setup-period-field">
              <Label htmlFor="allowancePeriodId" data-testid="allowance-setup-period-label">
                Allowance Period *
              </Label>
              <Select
                value={formData.allowancePeriodId}
                onValueChange={value => setFormData({ ...formData, allowancePeriodId: value })}
              >
                <SelectTrigger id="allowancePeriodId" data-testid="allowance-setup-period-select">
                  <SelectValue placeholder="Select allowance period" />
                </SelectTrigger>
                <SelectContent data-testid="allowance-setup-period-options">
                  {allowancePeriods.map(period => (
                    <SelectItem
                      key={period.id}
                      value={period.id}
                      data-testid={`allowance-setup-period-option-${period.code}`}
                    >
                      {period.code} - {period.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Allowance Code */}
            <div className="gba:space-y-2" data-testid="allowance-setup-code-field">
              <Label htmlFor="allowanceCodeId" data-testid="allowance-setup-code-label">
                Allowance Code *
              </Label>
              <Select
                value={formData.allowanceCodeId}
                onValueChange={value => setFormData({ ...formData, allowanceCodeId: value })}
              >
                <SelectTrigger id="allowanceCodeId" data-testid="allowance-setup-code-select">
                  <SelectValue placeholder="Select allowance code" />
                </SelectTrigger>
                <SelectContent data-testid="allowance-setup-code-options">
                  {allowanceCodes.map(code => (
                    <SelectItem key={code.id} value={code.id} data-testid={`allowance-setup-code-option-${code.code}`}>
                      {code.code} - {code.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="gba:space-y-2" data-testid="allowance-setup-name-field">
              <Label htmlFor="name" data-testid="allowance-setup-name-label">
                Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Full Day Setup"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                data-testid="allowance-setup-name-input"
              />
            </div>

            {/* Issue */}
            <div className="gba:space-y-2" data-testid="allowance-setup-issue-field">
              <Label htmlFor="issue" data-testid="allowance-setup-issue-label">
                Issue *
              </Label>
              <Select value={formData.issue} onValueChange={value => setFormData({ ...formData, issue: value })}>
                <SelectTrigger id="issue" data-testid="allowance-setup-issue-select">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent data-testid="allowance-setup-issue-options">
                  {issueOptions.map(option => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      data-testid={`allowance-setup-issue-option-${option.value}`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tax Only */}
            <div className="gba:flex gba:items-center gba:justify-between" data-testid="allowance-setup-tax-only-field">
              <Label htmlFor="onlyTax" data-testid="allowance-setup-tax-only-label">
                Tax Only
              </Label>
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:text-sm gba:text-muted-foreground" data-testid="allowance-setup-tax-only-status">
                  {formData.onlyTax ? 'Tax Only' : 'Include Allowance'}
                </span>
                <NWSwitch
                  id="onlyTax"
                  checked={formData.onlyTax}
                  onCheckedChange={checked => setFormData({ ...formData, onlyTax: checked })}
                  data-testid="allowance-setup-tax-only-switch"
                />
              </div>
            </div>

            {/* Validity Period */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2" data-testid="allowance-setup-valid-from-field">
                <Label htmlFor="validFrom" data-testid="allowance-setup-valid-from-label">
                  Valid From *
                </Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom ? dayjs(formData.validFrom).format('YYYY-MM-DD') : ''}
                  onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                  data-testid="allowance-setup-valid-from-input"
                />
              </div>
              <div className="gba:space-y-2" data-testid="allowance-setup-valid-to-field">
                <Label htmlFor="validTo" data-testid="allowance-setup-valid-to-label">
                  Valid To
                </Label>
                <Input
                  id="validTo"
                  type="date"
                  value={formData.validTo ? dayjs(formData.validTo).format('YYYY-MM-DD') : ''}
                  onChange={e => setFormData({ ...formData, validTo: e.target.value || undefined })}
                  data-testid="allowance-setup-valid-to-input"
                />
              </div>
            </div>
          </div>

          <DialogFooter data-testid="allowance-setup-modal-footer">
            <Button
              variant="outline"
              onClick={() => setIsModalVisible(false)}
              disabled={isSaving}
              data-testid="allowance-setup-modal-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="allowance-setup-modal-save-button">
              {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AllowanceSetupTab
