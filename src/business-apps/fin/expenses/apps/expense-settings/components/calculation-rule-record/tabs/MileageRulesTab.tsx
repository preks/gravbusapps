import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Space,
  Alert,
  Spin,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  DatePicker,
  message,
  Popconfirm,
  Tooltip,
  Popover,
  Badge
} from 'antd'
import { PiPlus, PiPencil, PiTrash, PiCalendar, PiCar, PiPercent, PiInfo } from 'react-icons/pi'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { EnhancedExpenseRuleMileage, MeasurementUnitWithTranslations } from '../../../types/ExpenseRuleTypes'
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient'
import { useGetMileageRuleById } from '../../../queries/ExpenseRuleQueries'

const { Option } = Select

interface MileageRulesTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
}

interface MileageRuleFormData {
  id?: string
  expenseRuleId: string
  code: string
  name: string
  reimbursable: boolean
  taxCodeRef?: string
  taxValue?: number
  unitPrice?: number
  mileageOrder?: number
  activeFrom: string
  activeTo?: string
  wageCode?: string
  expenseGroupRef?: string
  measurementUnitRef?: string
  mileageRuleId?: string
  version?: number
}

interface TaxCodeOption {
  id: string
  value: string
  code: string
}

const MileageRulesTab: React.FC<MileageRulesTabProps> = ({ ruleId, accessToken, activeFrom }) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)
  const [mileageRules, setMileageRules] = useState<EnhancedExpenseRuleMileage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)

  // ✅ NEW: Hook for fetching individual mileage rules
  const { fetchMileageRuleById } = useGetMileageRuleById({ accessToken } as any)

  // ✅ NEW: TaxCode catalog state
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<EnhancedExpenseRuleMileage | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form] = Form.useForm()

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

  const fetchMileageRules = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleMileageRules($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleMileage(where: { isDeleted: { _eq: false } }, orderBy: { code: ASC }) {
              id
              code
              name
              reimbursable
              taxCodeRef
              taxValue
              unitPrice
              activeFrom
              activeTo
              version
              isDeleted
              wageCode
              expenseGroup {
                id
                value
                code
                translations {
                  value
                  localeCode
                }
              }
              measurementUnit {
                id
                value
                code
                translations {
                  value
                  localeCode
                }
              }
              mileageRule {
                id
                name
                code
              }
              additionalProperties
              businessKey
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        ExpenseRule: { expenseRuleMileage: EnhancedExpenseRuleMileage[] }[]
      }>(query, { ruleId })

      const expenseRule = result.ExpenseRule?.[0]
      setMileageRules(expenseRule?.expenseRuleMileage || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mileage rules')
      console.error('Error fetching mileage rules:', err)
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, ruleId])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchMileageRules()
      loadTaxCodes()
    }
  }, [ruleId, accessToken, fetchMileageRules, loadTaxCodes])

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({
      activeFrom: dayjs(activeFrom),
      reimbursable: true,
      taxValue: 0,
      unitPrice: 0
    })
    setIsModalVisible(true)
  }

  const handleEdit = async (record: EnhancedExpenseRuleMileage) => {
    // ✅ FIXED: Fetch fresh data instead of relying on potentially stale list data
    setEditingItem(record)
    setIsModalVisible(true)

    try {
      setIsSaving(true)
      // ✅ NEW: Fetch fresh data for this specific item
      const freshData = await fetchMileageRuleById(record.id)

      form.setFieldsValue({
        code: freshData.code,
        name: freshData.name,
        reimbursable: freshData.reimbursable,
        taxCodeRef: freshData.taxCodeRef,
        taxValue: freshData.taxValue,
        unitPrice: freshData.unitPrice,
        activeFrom: dayjs(freshData.activeFrom),
        activeTo: freshData.activeTo ? dayjs(freshData.activeTo) : undefined,
        wageCode: freshData.wageCode,
        expenseGroupRef: freshData.expenseGroup?.id,
        measurementUnitRef: freshData.measurementUnit?.id,
        mileageRuleId: freshData.mileageRule?.id
      })
    } catch (err) {
      message.error('Failed to load latest data for editing')
      console.error('Edit load error:', err)
      setIsModalVisible(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (record: EnhancedExpenseRuleMileage) => {
    try {
      setIsSaving(true)
      await expenseSettingsClient.deleteExpenseRuleMileage(record.id, record.version)
      message.success('Mileage rule deleted successfully')
      await fetchMileageRules()
    } catch (err) {
      message.error('Failed to delete mileage rule')
      console.error('Delete error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setIsSaving(true)

      const saveData: MileageRuleFormData = {
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        code: values.code,
        name: values.name,
        reimbursable: values.reimbursable,
        taxCodeRef: values.taxCodeRef,
        taxValue: values.taxValue,
        unitPrice: values.unitPrice,
        activeFrom: values.activeFrom.toISOString(),
        activeTo: values.activeTo ? values.activeTo.toISOString() : undefined,
        wageCode: values.wageCode,
        expenseGroupRef: values.expenseGroupRef,
        measurementUnitRef: values.measurementUnitRef,
        mileageRuleId: values.mileageRuleId
      }

      await expenseSettingsClient.saveExpenseRuleMileage(saveData)
      message.success(`Mileage rule ${editingItem ? 'updated' : 'created'} successfully`)

      setIsModalVisible(false)
      await fetchMileageRules()
    } catch (err) {
      message.error('Failed to save mileage rule')
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Helper functions
  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY')
  }

  const formatTaxValue = (value?: number): string => {
    if (value === undefined || value === null) return '0.00%'
    return `${value.toFixed(2)}%`
  }

  const formatCurrency = (value?: number, unit?: MeasurementUnitWithTranslations): string => {
    if (value === undefined || value === null) return '0.00'
    const unitCode = unit?.code || 'km'
    return `${value.toFixed(2)} / ${unitCode}`
  }

  // Mock data for dropdowns (replace with actual catalog queries)
  const expenseGroupOptions = [
    { value: 'ExpenseGroup:v1:TRANSPORT', label: 'Transportation' },
    { value: 'ExpenseGroup:v1:OTHER_TRANSPORT', label: 'Other Transport Costs' },
    { value: 'ExpenseGroup:v1:ACCOMMODATION', label: 'Accommodation' },
    { value: 'ExpenseGroup:v1:MEAL', label: 'Meals' }
  ]

  const measurementUnitOptions = [
    { value: 'MeasurementUnit:v1:km', label: 'Kilometers (km)' },
    { value: 'MeasurementUnit:v1:mile', label: 'Miles (mile)' },
    { value: 'MeasurementUnit:v1:hour', label: 'Hours (hr)' }
  ]

  const formatReimbursable = (reimbursable: boolean): React.ReactNode => {
    if (reimbursable === true) {
      return <Tag className="gba:bg-success gba:text-success-foreground gba:border-success">Yes</Tag>
    } else if (reimbursable === false) {
      return <Tag className="gba:bg-destructive gba:text-destructive-foreground gba:border-destructive">No</Tag>
    }
    return <span className="gba:text-gray-400">Not set</span>
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

  const renderAdditionalProperties = (additionalProperties?: Record<string, any>) => {
    if (!additionalProperties || Object.keys(additionalProperties).length === 0) {
      return <span className="gba:text-gray-400">None</span>
    }

    const propertyCount = Object.keys(additionalProperties).length

    const content = (
      <div className="gba:max-w-xs">
        <div className="gba:font-medium gba:mb-2">Additional Properties:</div>
        <pre className="gba:text-xs gba:bg-gray-50 gba:p-2 gba:rounded gba:overflow-auto gba:max-h-48">
          {JSON.stringify(additionalProperties, null, 2)}
        </pre>
      </div>
    )

    return (
      <Popover content={content} title="Additional Properties" trigger="hover">
        <Badge count={propertyCount} showZero={false}>
          <Button type="text" size="small" icon={<PiInfo />} className="gba:text-blue-500" />
        </Badge>
      </Popover>
    )
  }

  const columns: ColumnsType<EnhancedExpenseRuleMileage> = [
    {
      title: 'Mileage',
      key: 'mileage',
      width: 200,
      render: (_, record) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiCar className="gba:text-gray-400" />
          <div>
            <div className="gba:font-mono gba:font-medium gba:text-sm">{record.code}</div>
            <div className="gba:text-gray-600 gba:text-xs">{record.name || 'No name set'}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Mileage Rule',
      key: 'mileageRule',
      width: 160,
      render: (_, record) => {
        if (record.mileageRule?.code && record.mileageRule?.name) {
          return (
            <div className="gba:flex gba:items-center gba:gap-2">
              <div>
                <div className="gba:font-mono gba:font-medium gba:text-sm">{record.mileageRule.code}</div>
                <div className="gba:text-gray-600 gba:text-xs">{record.mileageRule.name}</div>
              </div>
            </div>
          )
        }
        return <span className="gba:text-gray-400">Not set</span>
      }
    },
    {
      title: 'Reimbursable',
      dataIndex: 'reimbursable',
      key: 'reimbursable',
      width: 120,
      align: 'center',
      render: reimbursable => formatReimbursable(reimbursable)
    },
    {
      title: 'Rate',
      key: 'rate',
      width: 130,
      render: (_, record) => (
        <span className="gba:font-mono gba:text-sm">{formatCurrency(record.unitPrice, record.measurementUnit)}</span>
      )
    },
    {
      title: 'Tax',
      key: 'tax',
      width: 130,
      render: (_, record) => {
        const taxCode = formatTaxCode(record.taxCodeRef)
        const taxValue = formatTaxValue(record.taxValue)

        return (
          <div className="gba:flex gba:items-center gba:gap-1">
            <PiPercent className="gba:text-gray-400" />
            <span className="gba:font-mono gba:text-sm">
              {taxCode}: {taxValue}
            </span>
          </div>
        )
      }
    },
    {
      title: 'Validity',
      key: 'validity',
      width: 180,
      render: (_, record) => (
        <div className="gba:flex gba:items-center gba:gap-1">
          <PiCalendar className="gba:text-gray-400" />
          <span className="gba:text-sm">
            {formatDate(record.activeFrom)} - {record.activeTo ? formatDate(record.activeTo) : '∞'}
          </span>
        </div>
      )
    },
    {
      title: 'Expense Group',
      dataIndex: 'expenseGroup',
      key: 'expenseGroup',
      width: 150,
      render: expenseGroup => {
        if (expenseGroup?.code) {
          return (
            <Tag className="gba:bg-info gba:text-info-foreground gba:border-info" title={expenseGroup.value}>
              {expenseGroup.code}
            </Tag>
          )
        }
        return <span className="gba:text-gray-400">Not set</span>
      }
    },
    {
      title: 'Properties',
      key: 'additionalProperties',
      width: 100,
      align: 'center',
      render: (_, record) => renderAdditionalProperties(record.additionalProperties)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit mileage rule">
            <Button
              type="text"
              size="small"
              icon={<PiPencil />}
              onClick={() => handleEdit(record)}
              data-testid={`edit-mileage-rule-${record.id}`}
            />
          </Tooltip>
          <Popconfirm
            title="Delete mileage rule"
            description="Are you sure you want to delete this mileage rule?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete mileage rule">
              <Button
                type="text"
                size="small"
                icon={<PiTrash />}
                danger
                data-testid={`delete-mileage-rule-${record.id}`}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  if (isLoading) {
    return (
      <div data-testid="mileage-rules-tab-loading" className="gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid="mileage-rules-tab-error">
        <Alert
          message="Error Loading Mileage Rules"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchMileageRules}>
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div data-testid="mileage-rules-tab">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:m-0">Mileage Rules</h3>
          <Tag className="gba:bg-info gba:text-info-foreground gba:border-info gba:ml-2">
            {mileageRules.length} rules
          </Tag>
        </div>
        <Button type="primary" icon={<PiPlus />} onClick={handleAdd} data-testid="add-mileage-rule-button">
          Add Mileage Rule
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={mileageRules}
        rowKey="id"
        loading={isSaving}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} mileage rules`
        }}
        scroll={{ x: 600 }}
        data-testid="mileage-rules-table"
        onRow={record =>
          ({
            'data-testid': `mileage-rules-table-row-${record.id}`
          }) as any
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        title={`${editingItem ? 'Edit' : 'Add'} Mileage Rule`}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isSaving}
        width={600}
        data-testid="mileage-rule-modal"
        okButtonProps={{ 'data-testid': 'mileage-rule-modal-ok-button' } as any}
        cancelButtonProps={{ 'data-testid': 'mileage-rule-modal-cancel-button' } as any}
      >
        <Form form={form} layout="vertical" data-testid="mileage-rule-form">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Please enter a code' }]}>
              <Input placeholder="Enter mileage code" data-testid="mileage-rule-code-input" />
            </Form.Item>

            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter a name' }]}>
              <Input placeholder="Enter mileage name" data-testid="mileage-rule-name-input" />
            </Form.Item>
          </div>

          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            <Form.Item name="reimbursable" label="Reimbursable" valuePropName="checked">
              <Switch data-testid="mileage-rule-reimbursable-switch" />
            </Form.Item>

            <Form.Item name="unitPrice" label="Unit Price">
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="0.00"
                data-testid="mileage-rule-unit-price-input"
              />
            </Form.Item>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item name="taxCodeRef" label="Tax Code">
              <Select
                placeholder="Select tax code"
                showSearch
                optionFilterProp="children"
                loading={catalogsLoading}
                disabled={catalogsLoading}
                data-testid="mileage-rule-tax-code-select"
              >
                {taxCodes.map(taxCode => (
                  <Option key={taxCode.id} value={taxCode.id}>
                    {taxCode.code} - {taxCode.value}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="taxValue" label="Tax Value (%)">
              <InputNumber
                min={0}
                max={100}
                step={0.01}
                style={{ width: '100%' }}
                formatter={value => `${value}%`}
                parser={value => value?.replace('%', '') as any}
                data-testid="mileage-rule-tax-value-input"
              />
            </Form.Item>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item name="expenseGroupRef" label="Expense Group">
              <Select placeholder="Select expense group" data-testid="mileage-rule-expense-group-select">
                {expenseGroupOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="measurementUnitRef" label="Measurement Unit">
              <Select placeholder="Select measurement unit" data-testid="mileage-rule-measurement-unit-select">
                {measurementUnitOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item
              name="activeFrom"
              label="Valid From"
              rules={[{ required: true, message: 'Please select start date' }]}
            >
              <DatePicker style={{ width: '100%' }} data-testid="mileage-rule-active-from-picker" />
            </Form.Item>

            <Form.Item name="activeTo" label="Valid To">
              <DatePicker style={{ width: '100%' }} data-testid="mileage-rule-active-to-picker" />
            </Form.Item>
          </div>

          <Form.Item name="wageCode" label="Wage Code">
            <Input placeholder="Enter wage code (optional)" data-testid="mileage-rule-wage-code-input" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default MileageRulesTab
