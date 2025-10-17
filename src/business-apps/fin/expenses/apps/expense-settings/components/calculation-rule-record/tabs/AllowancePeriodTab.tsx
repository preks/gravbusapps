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
  Switch as NWSwitch
} from '@newwork/nw-design-system'
import { PiPlus, PiPencil, PiCalendar, PiClock, PiCheck, PiX } from 'react-icons/pi'
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

interface AllowancePeriodTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
}

interface AllowancePeriod {
  id: string
  code: string
  name: string
  fromTime?: string
  toTime?: string
  minHours: number
  midnightRule: boolean
  overnightAccommodation?: boolean
  startAfter?: string
  returnBefore?: string
  validFrom: string
  validTo?: string
  order?: number
  version?: number
  isDeleted: boolean
}

interface AllowancePeriodFormData {
  id?: string
  code: string
  name: string
  fromTime?: string
  toTime?: string
  minHours: number
  midnightRule: boolean
  overnightAccommodation?: boolean
  startAfter?: string
  returnBefore?: string
  validFrom: string
  validTo?: string
  order?: number
  version?: number
}

const AllowancePeriodTab: React.FC<AllowancePeriodTabProps> = ({ ruleId, accessToken, activeFrom }) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [allowancePeriods, setAllowancePeriods] = useState<AllowancePeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<AllowancePeriod | null>(null)
  const [formData, setFormData] = useState<AllowancePeriodFormData>({
    code: '',
    name: '',
    minHours: 0,
    midnightRule: false,
    validFrom: activeFrom
  })

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

  const fetchAllowancePeriods = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleAllowancePeriods($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleAllowancePeriod(where: { isDeleted: { _eq: false } }, orderBy: { periodOrder: ASC }) {
              id
              code
              name
              fromTime
              toTime
              minHours
              midnightRule
              activeFrom
              activeTo
              periodOrder
              version
              additionalProperties
              businessKey
              express1
              express2
            }
          }
        }
      `

      const result = await graphqlClient.request<{ ExpenseRule: { expenseRuleAllowancePeriod: any[] }[] }>(query, {
        ruleId
      })

      const expenseRule = result.ExpenseRule?.[0]
      const periods = expenseRule?.expenseRuleAllowancePeriod || []

      const transformedPeriods: AllowancePeriod[] = periods.map((period, index) => ({
        id: period.id,
        code: period.code || '',
        name: period.name || '',
        fromTime: period.fromTime || '',
        toTime: period.toTime || '',
        minHours: period.minHours || 0,
        midnightRule: period.midnightRule || false,
        overnightAccommodation: false, // TODO: Map from additionalProperties if available
        startAfter: '', // TODO: Map from additionalProperties if available
        returnBefore: '', // TODO: Map from additionalProperties if available
        validFrom: period.activeFrom,
        validTo: period.activeTo,
        order: period.periodOrder || index + 1,
        version: period.version || 1,
        isDeleted: false
      }))

      setAllowancePeriods(transformedPeriods)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allowance periods')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, graphqlClient])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchAllowancePeriods()
    }
  }, [ruleId, accessToken, fetchAllowancePeriods])

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY')
  }

  const handleAdd = () => {
    setEditingItem(null)
    setFormData({
      code: '',
      name: '',
      minHours: 0,
      midnightRule: false,
      overnightAccommodation: false,
      validFrom: activeFrom,
      order: allowancePeriods.length + 1
    })
    setIsModalVisible(true)
  }

  const handleEdit = (record: AllowancePeriod) => {
    setFormData({
      id: record.id,
      code: record.code,
      name: record.name,
      fromTime: record.fromTime,
      toTime: record.toTime,
      minHours: record.minHours,
      midnightRule: record.midnightRule,
      overnightAccommodation: record.overnightAccommodation,
      startAfter: record.startAfter,
      returnBefore: record.returnBefore,
      validFrom: record.validFrom,
      validTo: record.validTo,
      order: record.order,
      version: record.version
    })

    setEditingItem(record)
    setIsModalVisible(true)
  }

  // Note: Delete actions are now handled through AppActionButton's context flow

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Map to API payload and call client
      await expenseSettingsClient.saveExpenseRuleAllowancePeriod({
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        businessKey: undefined,
        activeTo: formData.validTo,
        additionalProperties: undefined,
        code: formData.code,
        name: formData.name,
        overnightAccomodation: formData.overnightAccommodation,
        fromTime: formData.fromTime,
        toTime: formData.toTime,
        minHours: formData.minHours,
        midnightRule: formData.midnightRule,
        startAfter: formData.startAfter,
        returnBefore: formData.returnBefore,
        activeFrom: formData.validFrom,
        periodOrder: formData.order
      })

      toast.success(`Allowance period ${editingItem ? 'updated' : 'created'} successfully`)
      setIsModalVisible(false)
      await fetchAllowancePeriods()
    } catch (err) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} allowance period`)
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Removed Ant Design columns definition - using NW design system Table now

  if (isLoading) {
    return (
      <div
        data-testid="allowance-period-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="allowance-period-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div>
              <div className="gba:font-semibold gba:mb-1">Error Loading Allowance Periods</div>
              <div className="gba:text-sm">{error}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllowancePeriods}
              data-testid="allowance-period-retry-button"
            >
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid="allowance-period-tab">
      <Toaster />

      <Card data-testid="allowance-period-card">
        <CardHeader data-testid="allowance-period-card-header">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:flex gba:items-center gba:gap-2">
              <CardTitle data-testid="allowance-period-card-title">Allowance Periods</CardTitle>
              <Badge variant="default" data-testid="allowance-period-count-badge">
                {allowancePeriods.length} periods
              </Badge>
            </div>
            <Button onClick={handleAdd} data-testid="add-allowance-period-button">
              <PiPlus className="gba:mr-2" />
              Add Allowance Period
            </Button>
          </div>
        </CardHeader>

        <CardContent data-testid="allowance-period-card-content">
          {allowancePeriods.length > 0 ? (
            <div className="gba:overflow-x-auto">
              <Table data-testid="allowance-periods-table">
                <TableHeader data-testid="allowance-periods-table-header">
                  <TableRow data-testid="allowance-periods-table-header-row">
                    <TableHead className="gba:w-[60px]" data-testid="allowance-periods-table-header-actions">
                      ACTIONS
                    </TableHead>
                    <TableHead className="gba:w-[150px]" data-testid="allowance-periods-table-header-code">
                      CODE
                    </TableHead>
                    <TableHead className="gba:w-[180px]" data-testid="allowance-periods-table-header-name">
                      NAME
                    </TableHead>
                    <TableHead
                      className="gba:w-[180px] gba:text-center"
                      data-testid="allowance-periods-table-header-overnight"
                    >
                      OVERNIGHT
                    </TableHead>
                    <TableHead
                      className="gba:w-[100px] gba:text-center"
                      data-testid="allowance-periods-table-header-from-time"
                    >
                      TIME FROM
                    </TableHead>
                    <TableHead
                      className="gba:w-[100px] gba:text-center"
                      data-testid="allowance-periods-table-header-to-time"
                    >
                      TIME TO
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:text-center"
                      data-testid="allowance-periods-table-header-min-hours"
                    >
                      MIN HOURS
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:text-center"
                      data-testid="allowance-periods-table-header-midnight"
                    >
                      MIDNIGHT RULE
                    </TableHead>
                    <TableHead
                      className="gba:w-[100px] gba:text-center"
                      data-testid="allowance-periods-table-header-start-after"
                    >
                      START AFTER
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:text-center"
                      data-testid="allowance-periods-table-header-return-before"
                    >
                      RETURN BEFORE
                    </TableHead>
                    <TableHead className="gba:w-[120px]" data-testid="allowance-periods-table-header-valid-from">
                      VALID FROM
                    </TableHead>
                    <TableHead className="gba:w-[120px]" data-testid="allowance-periods-table-header-valid-to">
                      VALID TO
                    </TableHead>
                    <TableHead
                      className="gba:w-[80px] gba:text-center"
                      data-testid="allowance-periods-table-header-order"
                    >
                      ORDER
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody data-testid="allowance-periods-table-body">
                  {allowancePeriods.map(record => (
                    <TableRow key={record.id} data-testid={`allowance-period-row-${record.id}`}>
                      {/* Actions Column */}
                      <TableCell data-testid={`allowance-period-actions-cell-${record.id}`}>
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            data-testid={`allowance-period-action-${record.id}`}
                            size="icon"
                            contextsArray={[]}
                            externalContextData={{ allowancePeriodId: record.id }}
                            prefixDataTestId="allowance-period-action"
                            accessToken={accessToken}
                            emptyStateBehavior="enable"
                            deferMainContextRequestsUntilClick
                            onClick={e => e.stopPropagation()}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                            data-testid={`edit-allowance-period-${record.id}`}
                          >
                            <PiPencil className="gba:h-4 gba:w-4" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Code Column */}
                      <TableCell data-testid={`allowance-period-code-cell-${record.id}`}>
                        <span
                          className="gba:font-mono gba:font-medium"
                          data-testid={`allowance-period-code-text-${record.id}`}
                        >
                          {record.code}
                        </span>
                      </TableCell>

                      {/* Name Column */}
                      <TableCell data-testid={`allowance-period-name-cell-${record.id}`}>
                        <span data-testid={`allowance-period-name-text-${record.id}`}>{record.name}</span>
                      </TableCell>

                      {/* Overnight Accommodation Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-overnight-cell-${record.id}`}
                      >
                        {record.overnightAccommodation ? (
                          <PiCheck
                            className="gba:text-success gba:text-lg gba:inline-block"
                            data-testid={`allowance-period-overnight-check-${record.id}`}
                          />
                        ) : (
                          <PiX
                            className="gba:text-muted-foreground gba:text-lg gba:inline-block"
                            data-testid={`allowance-period-overnight-x-${record.id}`}
                          />
                        )}
                      </TableCell>

                      {/* Time From Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-from-time-cell-${record.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
                          <PiClock
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-from-time-icon-${record.id}`}
                          />
                          <span
                            className="gba:font-mono gba:text-sm"
                            data-testid={`allowance-period-from-time-text-${record.id}`}
                          >
                            {record.fromTime || '-'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Time To Column */}
                      <TableCell className="gba:text-center" data-testid={`allowance-period-to-time-cell-${record.id}`}>
                        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
                          <PiClock
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-to-time-icon-${record.id}`}
                          />
                          <span
                            className="gba:font-mono gba:text-sm"
                            data-testid={`allowance-period-to-time-text-${record.id}`}
                          >
                            {record.toTime || '-'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Minimum Hours Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-min-hours-cell-${record.id}`}
                      >
                        <Badge variant="default" data-testid={`allowance-period-min-hours-badge-${record.id}`}>
                          {record.minHours}
                        </Badge>
                      </TableCell>

                      {/* Midnight Rule Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-midnight-cell-${record.id}`}
                      >
                        {record.midnightRule ? (
                          <PiCheck
                            className="gba:text-success gba:text-lg gba:inline-block"
                            data-testid={`allowance-period-midnight-check-${record.id}`}
                          />
                        ) : (
                          <PiX
                            className="gba:text-muted-foreground gba:text-lg gba:inline-block"
                            data-testid={`allowance-period-midnight-x-${record.id}`}
                          />
                        )}
                      </TableCell>

                      {/* Start After Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-start-after-cell-${record.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
                          <PiClock
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-start-after-icon-${record.id}`}
                          />
                          <span
                            className="gba:font-mono gba:text-sm"
                            data-testid={`allowance-period-start-after-text-${record.id}`}
                          >
                            {record.startAfter || '-'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Return Before Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-return-before-cell-${record.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
                          <PiClock
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-return-before-icon-${record.id}`}
                          />
                          <span
                            className="gba:font-mono gba:text-sm"
                            data-testid={`allowance-period-return-before-text-${record.id}`}
                          >
                            {record.returnBefore || '-'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Valid From Column */}
                      <TableCell data-testid={`allowance-period-valid-from-cell-${record.id}`}>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <PiCalendar
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-valid-from-icon-${record.id}`}
                          />
                          <span className="gba:text-sm" data-testid={`allowance-period-valid-from-text-${record.id}`}>
                            {formatDate(record.validFrom)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Valid To Column */}
                      <TableCell data-testid={`allowance-period-valid-to-cell-${record.id}`}>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <PiCalendar
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-valid-to-icon-${record.id}`}
                          />
                          <span className="gba:text-sm" data-testid={`allowance-period-valid-to-text-${record.id}`}>
                            {record.validTo ? formatDate(record.validTo) : '∞'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Order Column */}
                      <TableCell className="gba:text-center" data-testid={`allowance-period-order-cell-${record.id}`}>
                        <Badge variant="secondary" data-testid={`allowance-period-order-badge-${record.id}`}>
                          {record.order}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div
              className="gba:text-center gba:py-8 gba:text-muted-foreground"
              data-testid="allowance-periods-empty-state"
            >
              <p className="gba:m-0" data-testid="allowance-periods-empty-message">
                No allowance periods configured
              </p>
              <p className="gba:text-xs gba:mt-1" data-testid="allowance-periods-empty-hint">
                Click "Add Allowance Period" to create your first period
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="gba:max-w-4xl" data-testid="allowance-period-modal">
          <DialogHeader data-testid="allowance-period-modal-header">
            <DialogTitle data-testid="allowance-period-modal-title">
              {editingItem ? 'Edit' : 'Add'} Allowance Period
            </DialogTitle>
          </DialogHeader>

          <div data-testid="allowance-period-form" className="gba:space-y-4">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              {/* Code */}
              <div className="gba:space-y-2" data-testid="allowance-period-code-field">
                <Label htmlFor="code" data-testid="allowance-period-code-label">
                  Allowance Period Code *
                </Label>
                <Input
                  id="code"
                  placeholder="e.g., FULL, 12, 24"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  data-testid="allowance-period-code-input"
                />
              </div>

              {/* Name */}
              <div className="gba:space-y-2" data-testid="allowance-period-name-field">
                <Label htmlFor="name" data-testid="allowance-period-name-label">
                  Name *
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Full Day, 12 hours"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  data-testid="allowance-period-name-input"
                />
              </div>

              {/* Minimum Hours */}
              <div className="gba:space-y-2" data-testid="allowance-period-min-hours-field">
                <Label htmlFor="minHours" data-testid="allowance-period-min-hours-label">
                  Minimum Hours *
                </Label>
                <Input
                  id="minHours"
                  type="number"
                  min="0"
                  max="24"
                  placeholder="24"
                  value={formData.minHours}
                  onChange={e => setFormData({ ...formData, minHours: Number(e.target.value) })}
                  data-testid="allowance-period-min-hours-input"
                />
              </div>

              {/* Order */}
              <div className="gba:space-y-2" data-testid="allowance-period-order-field">
                <Label htmlFor="order" data-testid="allowance-period-order-label">
                  Order
                </Label>
                <Input
                  id="order"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.order || ''}
                  onChange={e =>
                    setFormData({ ...formData, order: e.target.value ? Number(e.target.value) : undefined })
                  }
                  data-testid="allowance-period-order-input"
                />
              </div>

              {/* Time From */}
              <div className="gba:space-y-2" data-testid="allowance-period-from-time-field">
                <Label htmlFor="fromTime" data-testid="allowance-period-from-time-label">
                  Time From
                </Label>
                <Input
                  id="fromTime"
                  type="time"
                  value={formData.fromTime || ''}
                  onChange={e => setFormData({ ...formData, fromTime: e.target.value || undefined })}
                  data-testid="allowance-period-from-time-input"
                />
              </div>

              {/* Time To */}
              <div className="gba:space-y-2" data-testid="allowance-period-to-time-field">
                <Label htmlFor="toTime" data-testid="allowance-period-to-time-label">
                  Time To
                </Label>
                <Input
                  id="toTime"
                  type="time"
                  value={formData.toTime || ''}
                  onChange={e => setFormData({ ...formData, toTime: e.target.value || undefined })}
                  data-testid="allowance-period-to-time-input"
                />
              </div>

              {/* Start After */}
              <div className="gba:space-y-2" data-testid="allowance-period-start-after-field">
                <Label htmlFor="startAfter" data-testid="allowance-period-start-after-label">
                  Start After
                </Label>
                <Input
                  id="startAfter"
                  type="time"
                  value={formData.startAfter || ''}
                  onChange={e => setFormData({ ...formData, startAfter: e.target.value || undefined })}
                  data-testid="allowance-period-start-after-input"
                />
              </div>

              {/* Return Before */}
              <div className="gba:space-y-2" data-testid="allowance-period-return-before-field">
                <Label htmlFor="returnBefore" data-testid="allowance-period-return-before-label">
                  Return Before
                </Label>
                <Input
                  id="returnBefore"
                  type="time"
                  value={formData.returnBefore || ''}
                  onChange={e => setFormData({ ...formData, returnBefore: e.target.value || undefined })}
                  data-testid="allowance-period-return-before-input"
                />
              </div>

              {/* Valid From */}
              <div className="gba:space-y-2" data-testid="allowance-period-valid-from-field">
                <Label htmlFor="validFrom" data-testid="allowance-period-valid-from-label">
                  Valid From *
                </Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom ? dayjs(formData.validFrom).format('YYYY-MM-DD') : ''}
                  onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                  data-testid="allowance-period-valid-from-input"
                />
              </div>

              {/* Valid To */}
              <div className="gba:space-y-2" data-testid="allowance-period-valid-to-field">
                <Label htmlFor="validTo" data-testid="allowance-period-valid-to-label">
                  Valid To
                </Label>
                <Input
                  id="validTo"
                  type="date"
                  value={formData.validTo ? dayjs(formData.validTo).format('YYYY-MM-DD') : ''}
                  onChange={e => setFormData({ ...formData, validTo: e.target.value || undefined })}
                  data-testid="allowance-period-valid-to-input"
                />
              </div>
            </div>

            {/* Switches */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div
                className="gba:flex gba:items-center gba:justify-between"
                data-testid="allowance-period-midnight-rule-field"
              >
                <Label htmlFor="midnightRule" data-testid="allowance-period-midnight-rule-label">
                  Midnight Rule
                </Label>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span
                    className="gba:text-sm gba:text-muted-foreground"
                    data-testid="allowance-period-midnight-rule-status"
                  >
                    {formData.midnightRule ? 'Yes' : 'No'}
                  </span>
                  <NWSwitch
                    id="midnightRule"
                    checked={formData.midnightRule}
                    onCheckedChange={checked => setFormData({ ...formData, midnightRule: checked })}
                    data-testid="allowance-period-midnight-rule-switch"
                  />
                </div>
              </div>

              <div
                className="gba:flex gba:items-center gba:justify-between"
                data-testid="allowance-period-overnight-field"
              >
                <Label htmlFor="overnightAccommodation" data-testid="allowance-period-overnight-label">
                  Overnight Accommodation
                </Label>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span
                    className="gba:text-sm gba:text-muted-foreground"
                    data-testid="allowance-period-overnight-status"
                  >
                    {formData.overnightAccommodation ? 'Yes' : 'No'}
                  </span>
                  <NWSwitch
                    id="overnightAccommodation"
                    checked={formData.overnightAccommodation || false}
                    onCheckedChange={checked => setFormData({ ...formData, overnightAccommodation: checked })}
                    data-testid="allowance-period-overnight-switch"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter data-testid="allowance-period-modal-footer">
            <Button
              variant="outline"
              onClick={() => setIsModalVisible(false)}
              disabled={isSaving}
              data-testid="allowance-period-modal-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="allowance-period-modal-save-button">
              {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AllowancePeriodTab
