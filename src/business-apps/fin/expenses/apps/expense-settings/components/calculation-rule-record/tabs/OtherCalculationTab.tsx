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
  SelectValue
} from '@newwork/nw-design-system'
import { PiPlus, PiCalendar, PiCode, PiCalculator, PiBuilding } from 'react-icons/pi'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ExpenseSettingsClient } from '../../../utils/ExpenseSettingsClient'

interface OtherCalculationTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
}

interface OtherCalculation {
  id: string
  source: string // derived from related entity
  code: string // from related expense entity
  name: string // from related expense entity
  costCenter: {
    id: string
    code: string
    name: string
  }
  deductible: boolean // approximated from reimbursablePercent
  validFrom: string
  validTo?: string
  version?: number
  isDeleted: boolean
  relatedEntity: string // allowance, general, mileage
}

interface OtherCalculationFormData {
  id?: string
  source: string
  code: string
  name: string
  costCenterId: string
  deductible: boolean
  validFrom: string
  validTo?: string
  version?: number
}

const OtherCalculationTab: React.FC<OtherCalculationTabProps> = ({ ruleId, accessToken, activeFrom }) => {
  const [otherCalculations, setOtherCalculations] = useState<OtherCalculation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<OtherCalculation | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<OtherCalculation | null>(null)
  const [formData, setFormData] = useState<OtherCalculationFormData>({
    source: 'Manual Entry',
    code: '',
    name: '',
    costCenterId: '',
    deductible: false,
    validFrom: activeFrom
  })
  const graphqlClient = useGraphQLClient(accessToken)
  const expenseSettingsClient = new ExpenseSettingsClient()

  // REAL GraphQL data from ExpenseRuleOtherCalc
  const fetchOtherCalculations = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleOtherCalculations($ruleId: uuid!) {
          ExpenseRuleOtherCalc(
            where: {
              _and: [
                { expenseRuleId: { _eq: $ruleId } }
              ]
            }
            orderBy: { createdAt: ASC }
          ) {
            id
            activeFrom
            activeTo
            version
            additionalProperties
            businessKey
            costCenter {
              id
              code
              name
            }
            reimbursablePercent
            expenseRuleAllowanceCode {
              id
              code
              name
            }
            expenseRuleGeneralExpense {
              id
              code
              name
            }
            expenseRuleMileage {
              id
              code
              name
            }
          }
        }
      `

      const result = await graphqlClient.request<{ ExpenseRuleOtherCalc: any[] }>(query, { ruleId })

      const otherCalcs = result.ExpenseRuleOtherCalc || []

      const transformedCalculations: OtherCalculation[] = otherCalcs.map((calc: any) => {
        // Determine source and get code/name from related entity
        let source = 'Manual Entry'
        let code = 'UNKNOWN'
        let name = 'Unknown Calculation'
        let relatedEntity = 'unknown'

        if (calc.expenseRuleAllowanceCode) {
          source = 'Allowance System'
          code = calc.expenseRuleAllowanceCode.code
          name = calc.expenseRuleAllowanceCode.name
          relatedEntity = 'allowance'
        } else if (calc.expenseRuleGeneralExpense) {
          source = 'General Expense System'
          code = calc.expenseRuleGeneralExpense.code
          name = calc.expenseRuleGeneralExpense.name
          relatedEntity = 'general'
        } else if (calc.expenseRuleMileage) {
          source = 'Mileage System'
          code = calc.expenseRuleMileage.code
          name = calc.expenseRuleMileage.name
          relatedEntity = 'mileage'
        }

        return {
          id: calc.id,
          source,
          code,
          name,
          costCenter: calc.costCenter || { id: '', code: 'N/A', name: 'No Cost Center' },
          deductible: (calc.reimbursablePercent || 0) < 100, // Approximate deductible logic
          validFrom: calc.activeFrom,
          validTo: calc.activeTo,
          version: calc.version || 1,
          isDeleted: false,
          relatedEntity
        }
      })

      setOtherCalculations(transformedCalculations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load other calculations')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, graphqlClient])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchOtherCalculations()
    }
  }, [ruleId, accessToken, fetchOtherCalculations])

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY')
  }

  const sourceOptions = [
    { value: 'Manual Entry', label: 'Manual Entry' },
    { value: 'Payroll System', label: 'Payroll System' },
    { value: 'Finance System', label: 'Finance System' },
    { value: 'External API', label: 'External API' },
    { value: 'HR System', label: 'HR System' },
    { value: 'Tax System', label: 'Tax System' }
  ]

  const costCenterOptions = [
    { value: 'CC-001', label: 'CC-001 - Operations' },
    { value: 'CC-002', label: 'CC-002 - Finance' },
    { value: 'CC-003', label: 'CC-003 - HR' },
    { value: 'CC-004', label: 'CC-004 - IT' },
    { value: 'CC-005', label: 'CC-005 - Marketing' },
    { value: 'CC-006', label: 'CC-006 - Legal' }
  ]

  const handleAdd = () => {
    setEditingItem(null)
    setFormData({
      source: 'Manual Entry',
      code: '',
      name: '',
      costCenterId: '',
      deductible: false,
      validFrom: activeFrom
    })
    setIsModalVisible(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return

    try {
      setIsSaving(true)
      await expenseSettingsClient.deleteExpenseRuleOtherCalc(deletingItem.id)
      toast.success('Other calculation deleted successfully')
      await fetchOtherCalculations()
      setDeleteConfirmOpen(false)
      setDeletingItem(null)
    } catch (err) {
      toast.error('Failed to delete other calculation')
      console.error('Delete error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      const payload = {
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        businessKey: undefined,
        activeTo: formData.validTo,
        additionalProperties: undefined,
        source: formData.source,
        reimbursablePercent: formData.deductible ? 50 : 100,
        activeFrom: formData.validFrom,
        costCenterId: formData.costCenterId,
        expenseRuleMileageId: undefined,
        expenseRuleGeneralExpenseId: undefined,
        expenseRuleAllowanceCodeId: undefined
      }
      await expenseSettingsClient.saveExpenseRuleOtherCalc(payload)

      toast.success(`Other calculation ${editingItem ? 'updated' : 'created'} successfully`)
      setIsModalVisible(false)
      await fetchOtherCalculations()
    } catch (err) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} other calculation`)
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid="other-calculation-tab-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert data-testid="other-calculation-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:flex-col gba:gap-2">
            <strong>Error Loading Other Calculations</strong>
            <p>{error}</p>
            <Button size="sm" onClick={fetchOtherCalculations}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Card data-testid="other-calculation-tab">
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:flex gba:items-center gba:gap-2">
              <CardTitle>Other Calculations</CardTitle>
              <Badge variant="default">{otherCalculations.length} calculations</Badge>
            </div>
            <Button onClick={handleAdd} data-testid="add-other-calculation-button">
              <PiPlus className="gba:mr-2" />
              Add Other Calculation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:overflow-x-auto">
            <Table data-testid="other-calculations-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="gba:w-[60px]">Actions</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Code & Name</TableHead>
                  <TableHead>Cost Center</TableHead>
                  <TableHead>Deductible</TableHead>
                  <TableHead>Validity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherCalculations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="gba:text-center gba:py-8">
                      <p className="gba:text-muted-foreground">No other calculations found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  otherCalculations.map(record => (
                    <TableRow key={record.id} data-testid={`other-calculation-row-${record.id}`}>
                      <TableCell className="gba:py-4 gba:px-6">
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            data-testid={`other-calculation-action-button-${record.id}`}
                            size="icon"
                            contextsArray={[]}
                            externalContextData={{ otherCalcId: record.id }}
                            prefixDataTestId={`other-calculation-action`}
                            accessToken={accessToken}
                            emptyStateBehavior="enable"
                            deferMainContextRequestsUntilClick
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiCalculator className="gba:text-primary" />
                          <Badge variant="default">{record.source}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiCode className="gba:text-muted-foreground" />
                          <div>
                            <div className="gba:font-mono gba:font-medium gba:text-sm">{record.code}</div>
                            <div className="gba:text-muted-foreground gba:text-xs">{record.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiBuilding className="gba:text-primary" />
                          <Badge variant="secondary">{record.costCenter.code || 'N/A'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.deductible ? 'default' : 'secondary'}>
                          {record.deductible ? 'Deductible' : 'Non-Deductible'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <PiCalendar className="gba:text-muted-foreground" />
                          <span className="gba:text-sm">
                            {formatDate(record.validFrom)} - {record.validTo ? formatDate(record.validTo) : '∞'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Add Dialog */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="gba:max-w-2xl" data-testid="other-calculation-modal">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Other Calculation' : 'Add Other Calculation'}</DialogTitle>
          </DialogHeader>

          <div className="gba:space-y-4 gba:py-4" data-testid="other-calculation-form">
            <div>
              <Label htmlFor="source">Source *</Label>
              <Select value={formData.source} onValueChange={value => setFormData({ ...formData, source: value })}>
                <SelectTrigger id="source" data-testid="other-calculation-source-select">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., OVERTIME_CALC"
                data-testid="other-calculation-code-input"
              />
            </div>

            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Overtime Calculation"
                data-testid="other-calculation-name-input"
              />
            </div>

            <div>
              <Label htmlFor="costCenter">Cost Center *</Label>
              <Select
                value={formData.costCenterId}
                onValueChange={value => setFormData({ ...formData, costCenterId: value })}
              >
                <SelectTrigger id="costCenter" data-testid="other-calculation-cost-center-select">
                  <SelectValue placeholder="Select cost center" />
                </SelectTrigger>
                <SelectContent>
                  {costCenterOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              <input
                type="checkbox"
                id="deductible"
                checked={formData.deductible}
                onChange={e => setFormData({ ...formData, deductible: e.target.checked })}
                className="gba:h-4 gba:w-4"
                data-testid="other-calculation-deductible-switch"
              />
              <Label htmlFor="deductible">Deductible</Label>
            </div>

            <div>
              <Label htmlFor="validFrom">Valid From *</Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom ? dayjs(formData.validFrom).format('YYYY-MM-DD') : ''}
                onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                data-testid="other-calculation-valid-from-picker"
              />
            </div>

            <div>
              <Label htmlFor="validTo">Valid To</Label>
              <Input
                id="validTo"
                type="date"
                value={formData.validTo ? dayjs(formData.validTo).format('YYYY-MM-DD') : ''}
                onChange={e => setFormData({ ...formData, validTo: e.target.value || undefined })}
                data-testid="other-calculation-valid-to-picker"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalVisible(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="delete-other-calculation-dialog">
          <DialogHeader>
            <DialogTitle>Delete Other Calculation</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this other calculation?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isSaving}>
              {isSaving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </>
  )
}

export default OtherCalculationTab
