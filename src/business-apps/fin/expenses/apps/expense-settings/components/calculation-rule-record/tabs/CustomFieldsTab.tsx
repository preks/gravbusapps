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
import { PiPlus, PiPencil, PiCalendar, PiCode, PiDatabase } from 'react-icons/pi'
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

interface CustomFieldsTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
}

interface CustomField {
  id: string
  source: string // derived from related entity
  code: string // from related entity
  name: string // from related entity
  valueType: string // approximated or default
  mandatory: boolean
  validFrom: string
  validTo?: string
  infoValue: string // the actual value/description
  version?: number
  isDeleted: boolean
  relatedEntity: string // general or mileage
}

interface CustomFieldFormData {
  id?: string
  source: string
  code: string
  name: string
  valueType: string
  mandatory: boolean
  validFrom: string
  validTo?: string
  infoValue: string
  version?: number
}

const CustomFieldsTab: React.FC<CustomFieldsTabProps> = ({ ruleId, accessToken, activeFrom }) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<CustomField | null>(null)
  const [formData, setFormData] = useState<CustomFieldFormData>({
    source: 'Manual Entry',
    code: '',
    name: '',
    valueType: 'STRING',
    mandatory: false,
    validFrom: activeFrom,
    infoValue: ''
  })

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

  // REAL GraphQL data from ExpenseRuleOtherInfo
  const fetchCustomFields = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleOtherInfo($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleOtherInfo(where: { isDeleted: { _eq: false } }, orderBy: { createdAt: ASC }) {
              id
              infoValue
              mandatory
              activeFrom
              activeTo
              version
              businessKey
              additionalProperties
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
        }
      `

      const result = await graphqlClient.request<{ ExpenseRule: { expenseRuleOtherInfo: any[] }[] }>(query, { ruleId })

      const expenseRule = result.ExpenseRule?.[0]
      const otherInfos = expenseRule?.expenseRuleOtherInfo || []

      const transformedFields: CustomField[] = otherInfos.map((info: any) => {
        // Determine source and get code/name from related entity
        let source = 'Manual Entry'
        let code = 'CUSTOM_FIELD'
        let name = 'Custom Field'
        let relatedEntity = 'unknown'

        if (info.expenseRuleGeneralExpense) {
          source = 'General Expense System'
          code = info.expenseRuleGeneralExpense.code
          name = info.expenseRuleGeneralExpense.name
          relatedEntity = 'general'
        } else if (info.expenseRuleMileage) {
          source = 'Mileage System'
          code = info.expenseRuleMileage.code
          name = info.expenseRuleMileage.name
          relatedEntity = 'mileage'
        }

        // Determine value type based on infoValue content (simple heuristic)
        let valueType = 'STRING' // default
        if (info.infoValue) {
          if (!isNaN(Number(info.infoValue))) {
            valueType = 'NUMBER'
          } else if (info.infoValue.toLowerCase() === 'true' || info.infoValue.toLowerCase() === 'false') {
            valueType = 'BOOLEAN'
          } else if (info.infoValue.includes('/') && info.infoValue.length === 10) {
            valueType = 'DATE'
          }
        }

        return {
          id: info.id,
          source,
          code,
          name,
          valueType,
          mandatory: info.mandatory || false,
          validFrom: info.activeFrom,
          validTo: info.activeTo,
          infoValue: info.infoValue || '',
          version: info.version || 1,
          isDeleted: false,
          relatedEntity
        }
      })

      setCustomFields(transformedFields)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load custom fields')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, graphqlClient])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchCustomFields()
    }
  }, [ruleId, accessToken, fetchCustomFields])

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY')
  }

  const valueTypeOptions = [
    { value: 'STRING', label: 'String' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'BOOLEAN', label: 'Boolean' },
    { value: 'DATE', label: 'Date' },
    { value: 'ENUM', label: 'Enumeration' },
    { value: 'JSON', label: 'JSON Object' }
  ]

  const sourceOptions = [
    { value: 'Manual Entry', label: 'Manual Entry' },
    { value: 'External API', label: 'External API' },
    { value: 'HR System', label: 'HR System' },
    { value: 'Finance System', label: 'Finance System' },
    { value: 'Time Tracking', label: 'Time Tracking' }
  ]

  const handleAdd = () => {
    setEditingItem(null)
    setFormData({
      source: 'Manual Entry',
      code: '',
      name: '',
      valueType: 'STRING',
      mandatory: false,
      validFrom: activeFrom,
      infoValue: ''
    })
    setIsModalVisible(true)
  }

  const handleEdit = async (record: CustomField) => {
    setEditingItem(record)

    try {
      // Use the existing record data to populate the form
      const freshData = record

      setFormData({
        id: freshData.id,
        source: freshData.source,
        code: freshData.code,
        name: freshData.name,
        valueType: freshData.valueType,
        mandatory: freshData.mandatory,
        validFrom: freshData.validFrom,
        validTo: freshData.validTo,
        infoValue: freshData.infoValue,
        version: freshData.version
      })

      setIsModalVisible(true)
    } catch (err) {
      toast.error('Failed to load latest data for editing')
      console.error('Edit load error:', err)
    }
  }

  // Note: Delete actions are now handled through AppActionButton's context flow

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
        infoValue: formData.infoValue,
        mandatory: formData.mandatory,
        activeFrom: formData.validFrom,
        // association optional; based on code/name we cannot infer IDs; keep undefined
        expenseRuleMileageId: undefined,
        expenseRuleGeneralExpenseId: undefined
      }
      await expenseSettingsClient.saveExpenseRuleOtherInfo(payload)

      toast.success(`Custom field ${editingItem ? 'updated' : 'created'} successfully`)
      setIsModalVisible(false)
      await fetchCustomFields()
    } catch (err) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} custom field`)
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Removed Ant Design columns definition - using NW design system Table now

  if (isLoading) {
    return (
      <div
        data-testid="custom-fields-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="custom-fields-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <strong>Error Loading Custom Fields</strong>
              <p className="gba:mt-1">{error}</p>
            </div>
            <Button size="sm" onClick={fetchCustomFields} variant="outline">
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid="custom-fields-tab">
      <Toaster />

      <Card data-testid="custom-fields-card">
        <CardHeader data-testid="custom-fields-card-header">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:flex gba:items-center gba:gap-2">
              <CardTitle data-testid="custom-fields-card-title">Custom Fields</CardTitle>
              <Badge variant="default" data-testid="custom-fields-count-badge">
                {customFields.length} fields
              </Badge>
            </div>
            <Button onClick={handleAdd} data-testid="add-custom-field-button">
              <PiPlus className="gba:mr-2" />
              Add Custom Field
            </Button>
          </div>
        </CardHeader>

        <CardContent data-testid="custom-fields-card-content">
          {customFields.length > 0 ? (
            <Table data-testid="custom-fields-table">
              <TableHeader data-testid="custom-fields-table-header">
                <TableRow data-testid="custom-fields-table-header-row">
                  <TableHead className="gba:w-[60px]" data-testid="custom-fields-table-header-actions">
                    ACTIONS
                  </TableHead>
                  <TableHead className="gba:w-[130px]" data-testid="custom-fields-table-header-source">
                    SOURCE
                  </TableHead>
                  <TableHead className="gba:w-[200px]" data-testid="custom-fields-table-header-code-name">
                    CODE & NAME
                  </TableHead>
                  <TableHead className="gba:w-[150px]" data-testid="custom-fields-table-header-value">
                    VALUE
                  </TableHead>
                  <TableHead className="gba:w-[120px]" data-testid="custom-fields-table-header-value-type">
                    VALUE TYPE
                  </TableHead>
                  <TableHead className="gba:w-[100px]" data-testid="custom-fields-table-header-mandatory">
                    MANDATORY
                  </TableHead>
                  <TableHead className="gba:w-[180px]" data-testid="custom-fields-table-header-validity">
                    VALIDITY
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="custom-fields-table-body">
                {customFields.map(record => (
                  <TableRow key={record.id} data-testid={`custom-field-row-${record.id}`}>
                    <TableCell data-testid={`custom-field-actions-cell-${record.id}`}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`custom-field-action-${record.id}`}
                          size="icon"
                          contextsArray={[]}
                          externalContextData={{ customFieldId: record.id }}
                          prefixDataTestId="custom-field-action"
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                          onClick={e => e.stopPropagation()}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(record)}
                          data-testid={`edit-custom-field-${record.id}`}
                        >
                          <PiPencil className="gba:h-4 gba:w-4" />
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`custom-field-source-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiDatabase
                          className="gba:text-primary"
                          data-testid={`custom-field-source-icon-${record.id}`}
                        />
                        <Badge variant="default" data-testid={`custom-field-source-badge-${record.id}`}>
                          {record.source}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`custom-field-code-name-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCode
                          className="gba:text-muted-foreground"
                          data-testid={`custom-field-code-icon-${record.id}`}
                        />
                        <div>
                          <div
                            className="gba:font-mono gba:font-medium gba:text-sm"
                            data-testid={`custom-field-code-text-${record.id}`}
                          >
                            {record.code}
                          </div>
                          <div
                            className="gba:text-muted-foreground gba:text-xs"
                            data-testid={`custom-field-name-text-${record.id}`}
                          >
                            {record.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`custom-field-value-cell-${record.id}`}>
                      <span
                        className="gba:text-sm gba:font-medium"
                        data-testid={`custom-field-value-text-${record.id}`}
                      >
                        {record.infoValue || '-'}
                      </span>
                    </TableCell>

                    <TableCell data-testid={`custom-field-value-type-cell-${record.id}`}>
                      <Badge
                        variant={
                          record.valueType === 'STRING'
                            ? 'default'
                            : record.valueType === 'NUMBER'
                              ? 'default'
                              : record.valueType === 'BOOLEAN'
                                ? 'default'
                                : 'default'
                        }
                        data-testid={`custom-field-value-type-badge-${record.id}`}
                      >
                        {record.valueType}
                      </Badge>
                    </TableCell>

                    <TableCell data-testid={`custom-field-mandatory-cell-${record.id}`}>
                      <Badge
                        variant={record.mandatory ? 'destructive' : 'default'}
                        data-testid={`custom-field-mandatory-badge-${record.id}`}
                      >
                        {record.mandatory ? 'Required' : 'Optional'}
                      </Badge>
                    </TableCell>

                    <TableCell data-testid={`custom-field-validity-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiCalendar
                          className="gba:text-muted-foreground"
                          data-testid={`custom-field-validity-icon-${record.id}`}
                        />
                        <span className="gba:text-sm" data-testid={`custom-field-validity-text-${record.id}`}>
                          {formatDate(record.validFrom)} - {record.validTo ? formatDate(record.validTo) : '∞'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground" data-testid="custom-fields-empty-state">
              <p className="gba:m-0" data-testid="custom-fields-empty-message">
                No custom fields configured
              </p>
              <p className="gba:text-xs gba:mt-1" data-testid="custom-fields-empty-hint">
                Click "Add Custom Field" to create your first custom field
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="gba:max-w-2xl" data-testid="custom-field-modal">
          <DialogHeader data-testid="custom-field-modal-header">
            <DialogTitle data-testid="custom-field-modal-title">
              {editingItem ? 'Edit' : 'Add'} Custom Field
            </DialogTitle>
          </DialogHeader>

          <div data-testid="custom-field-form" className="gba:space-y-4">
            {/* Source */}
            <div className="gba:space-y-2" data-testid="custom-field-source-field">
              <Label htmlFor="source" data-testid="custom-field-source-label">
                Source *
              </Label>
              <Select value={formData.source} onValueChange={value => setFormData({ ...formData, source: value })}>
                <SelectTrigger id="source" data-testid="custom-field-source-select">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent data-testid="custom-field-source-options">
                  {sourceOptions.map(option => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      data-testid={`custom-field-source-option-${option.value}`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Code */}
            <div className="gba:space-y-2" data-testid="custom-field-code-field">
              <Label htmlFor="code" data-testid="custom-field-code-label">
                Code *
              </Label>
              <Input
                id="code"
                placeholder="e.g., PROJECT_CODE"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                data-testid="custom-field-code-input"
              />
              <p className="gba:text-xs gba:text-muted-foreground" data-testid="custom-field-code-hint">
                Must be uppercase letters, numbers, and underscores only
              </p>
            </div>

            {/* Name */}
            <div className="gba:space-y-2" data-testid="custom-field-name-field">
              <Label htmlFor="name" data-testid="custom-field-name-label">
                Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Project Code"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                data-testid="custom-field-name-input"
              />
            </div>

            {/* Value/Description */}
            <div className="gba:space-y-2" data-testid="custom-field-info-value-field">
              <Label htmlFor="infoValue" data-testid="custom-field-info-value-label">
                Value/Description *
              </Label>
              <Input
                id="infoValue"
                placeholder="e.g., License Plate"
                value={formData.infoValue}
                onChange={e => setFormData({ ...formData, infoValue: e.target.value })}
                data-testid="custom-field-info-value-input"
              />
            </div>

            {/* Value Type */}
            <div className="gba:space-y-2" data-testid="custom-field-value-type-field">
              <Label htmlFor="valueType" data-testid="custom-field-value-type-label">
                Value Type *
              </Label>
              <Select
                value={formData.valueType}
                onValueChange={value => setFormData({ ...formData, valueType: value })}
              >
                <SelectTrigger id="valueType" data-testid="custom-field-value-type-select">
                  <SelectValue placeholder="Select value type" />
                </SelectTrigger>
                <SelectContent data-testid="custom-field-value-type-options">
                  {valueTypeOptions.map(option => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      data-testid={`custom-field-value-type-option-${option.value}`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mandatory */}
            <div className="gba:flex gba:items-center gba:justify-between" data-testid="custom-field-mandatory-field">
              <Label htmlFor="mandatory" data-testid="custom-field-mandatory-label">
                Mandatory
              </Label>
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:text-sm gba:text-muted-foreground" data-testid="custom-field-mandatory-status">
                  {formData.mandatory ? 'Required' : 'Optional'}
                </span>
                <NWSwitch
                  id="mandatory"
                  checked={formData.mandatory}
                  onCheckedChange={checked => setFormData({ ...formData, mandatory: checked })}
                  data-testid="custom-field-mandatory-switch"
                />
              </div>
            </div>

            {/* Validity Period */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2" data-testid="custom-field-valid-from-field">
                <Label htmlFor="validFrom" data-testid="custom-field-valid-from-label">
                  Valid From *
                </Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom ? dayjs(formData.validFrom).format('YYYY-MM-DD') : ''}
                  onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                  data-testid="custom-field-valid-from-input"
                />
              </div>

              <div className="gba:space-y-2" data-testid="custom-field-valid-to-field">
                <Label htmlFor="validTo" data-testid="custom-field-valid-to-label">
                  Valid To
                </Label>
                <Input
                  id="validTo"
                  type="date"
                  value={formData.validTo ? dayjs(formData.validTo).format('YYYY-MM-DD') : ''}
                  onChange={e => setFormData({ ...formData, validTo: e.target.value || undefined })}
                  data-testid="custom-field-valid-to-input"
                />
              </div>
            </div>
          </div>

          <DialogFooter data-testid="custom-field-modal-footer">
            <Button
              variant="outline"
              onClick={() => setIsModalVisible(false)}
              disabled={isSaving}
              data-testid="custom-field-modal-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="custom-field-modal-save-button">
              {isSaving ? <Spinner className="gba:w-4 gba:h-4 gba:mr-2" /> : null}
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CustomFieldsTab
