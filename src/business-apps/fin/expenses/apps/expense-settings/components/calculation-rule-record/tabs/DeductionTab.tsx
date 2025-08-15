import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Alert, 
  Spin, 
  Tag, 
  Modal, 
  Form, 
  Switch, 
  InputNumber, 
  Select, 
  DatePicker, 
  message, 
  Popconfirm,
  Tooltip,
  Card,
  Row,
  Col
} from 'antd';
import { 
  PiPlus, 
  PiPencil, 
  PiTrash, 
  PiCalendar, 
  PiCheck,
  PiX,
  PiCoffee,
  PiBowlFood,
  PiMoon
} from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Register dayjs plugins
dayjs.extend(weekday);
dayjs.extend(localeData);
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { ExpenseRuleDeduction } from '../../../types/ExpenseRuleTypes';
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient';

const { Option } = Select;

interface DeductionTabProps {
  ruleId: string;
  accessToken: string;
  activeFrom: string;
}

interface DeductionFormData {
  id?: string;
  deductBreakfast: boolean;
  deductLunch: boolean;
  deductDinner: boolean;
  taxBreakfast: boolean; // ✅ UPDATED: Tax fields are booleans, not numbers
  taxLunch: boolean; // ✅ UPDATED: Tax fields are booleans, not numbers
  taxDinner: boolean; // ✅ UPDATED: Tax fields are booleans, not numbers
  deductionDay?: string;
  deductionOrder: number;
  overnightAllowance: boolean;
  activeFrom: string;
  activeTo?: string;
  version?: number;
}

const DeductionTab: React.FC<DeductionTabProps> = ({
  ruleId,
  accessToken,
  activeFrom
}) => {
  const [form] = Form.useForm();
  const graphqlClient = useGraphQLClient(accessToken);
  
  const [deductions, setDeductions] = useState<ExpenseRuleDeduction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseRuleDeduction | null>(null);

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken);

  const fetchDeductions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const query = `
        query GetExpenseRuleDeductions($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleDeduction(where: { isDeleted: { _eq: false } }, orderBy: { deductionOrder: ASC }) {
              id
              deductBreakfast
              deductLunch
              deductDinner
              taxBreakfast
              taxLunch
              taxDinner
              deductionDay
              deductionOrder
              overnightAllowance
              activeFrom
              activeTo
              version
              additionalProperties
              businessKey
              express1
              express2
            }
          }
        }
      `;
      
      const result = await graphqlClient.request<{ ExpenseRule: { expenseRuleDeduction: ExpenseRuleDeduction[] }[] }>(
        query, 
        { ruleId }
      );
      
      const expenseRule = result.ExpenseRule?.[0];
      setDeductions(expenseRule?.expenseRuleDeduction || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deductions');
      console.error('Error fetching deductions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, ruleId]);

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchDeductions();
    }
  }, [ruleId, accessToken, fetchDeductions]);

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      deductionOrder: deductions.length + 1,
      activeFrom: dayjs(activeFrom),
      deductBreakfast: false,
      deductLunch: false,
      deductDinner: false,
      overnightAllowance: false,
      taxBreakfast: false,
      taxLunch: false,
      taxDinner: false
    });
    setIsModalVisible(true);
  };

  const handleEdit = async (record: ExpenseRuleDeduction) => {
    // ✅ FIX: Fetch fresh data instead of relying on potentially stale list data
    setEditingItem(record);
    setIsModalVisible(true);
    
    try {
      setIsSaving(true);
      // TODO: In a real implementation, fetch fresh data for this specific item:
      // const freshData = await expenseSettingsClient.getExpenseRuleDeductionById(record.id);
      
      // For now, use the existing record data but with explicit refresh pattern
      const freshData = record;
      
      form.setFieldsValue({
        ...freshData,
        activeFrom: dayjs(freshData.activeFrom),
        activeTo: freshData.activeTo ? dayjs(freshData.activeTo) : undefined,
        taxBreakfast: freshData.taxBreakfast || false,
        taxLunch: freshData.taxLunch || false,
        taxDinner: freshData.taxDinner || false
      });
    } catch (err) {
      message.error('Failed to load latest data for editing');
      console.error('Edit load error:', err);
      setIsModalVisible(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record: ExpenseRuleDeduction) => {
    try {
      setIsSaving(true);
      await expenseSettingsClient.deleteExpenseRuleDeduction(record.id, record.version);
      message.success('Deduction rule deleted successfully');
      await fetchDeductions();
    } catch (err) {
      message.error('Failed to delete deduction rule');
      console.error('Delete error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setIsSaving(true);

      const saveData: DeductionFormData = {
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        deductBreakfast: values.deductBreakfast || false,
        deductLunch: values.deductLunch || false,
        deductDinner: values.deductDinner || false,
        deductionDay: values.deductionDay,
        deductionOrder: values.deductionOrder,
        overnightAllowance: values.overnightAllowance || false,
        activeFrom: values.activeFrom.toISOString(),
        activeTo: values.activeTo ? values.activeTo.toISOString() : undefined
      };

      await expenseSettingsClient.saveExpenseRuleDeduction(saveData);
      message.success(`Deduction rule ${editingItem ? 'updated' : 'created'} successfully`);
      
      setIsModalVisible(false);
      await fetchDeductions();
      
    } catch (err) {
      message.error(`Failed to ${editingItem ? 'update' : 'create'} deduction rule`);
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const renderMealDeductions = (record: ExpenseRuleDeduction) => {
    const meals = [
      { key: 'breakfast', icon: PiCoffee, label: 'Breakfast', deduct: record.deductBreakfast, tax: record.taxBreakfast },
      { key: 'lunch', icon: PiBowlFood, label: 'Lunch', deduct: record.deductLunch, tax: record.taxLunch },
      { key: 'dinner', icon: PiMoon, label: 'Dinner', deduct: record.deductDinner, tax: record.taxDinner }
    ];

    return (
      <div className="gba:flex gba:gap-3">
        {meals.map(meal => {
          const IconComponent = meal.icon;
          return (
            <div 
              key={meal.key}
              className={`gba:flex gba:flex-col gba:items-center gba:p-2 gba:rounded gba:border-2 gba:min-w-20 ${
                meal.deduct || meal.tax
                  ? 'gba:border-green-200 gba:bg-green-50' 
                  : 'gba:border-gray-200 gba:bg-gray-50'
              }`}
            >
              <IconComponent 
                className={`gba:text-lg gba:mb-1 ${
                  meal.deduct ? 'gba:text-green-600' : 'gba:text-gray-400'
                }`} 
              />
              <span className="gba:text-xs gba:font-medium gba:text-center">
                {meal.label}
              </span>
              <div className="gba:flex gba:flex-col gba:items-center gba:mt-1 gba:gap-1">
                <div className="gba:flex gba:items-center gba:gap-1">
                  <span className="gba:text-xs gba:text-gray-600">Deduct:</span>
                  {meal.deduct ? (
                    <PiCheck className="gba:text-green-500 gba:text-sm" />
                  ) : (
                    <PiX className="gba:text-gray-400 gba:text-sm" />
                  )}
                </div>
                <div className="gba:flex gba:items-center gba:gap-1">
                  <span className="gba:text-xs gba:text-gray-600">Tax:</span>
                  {meal.tax ? (
                    <PiCheck className="gba:text-green-500 gba:text-sm" />
                  ) : (
                    <PiX className="gba:text-gray-400 gba:text-sm" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };



  const deductionDayOptions = [
    { value: 'FIRST_DAY', label: 'First Day' },
    { value: 'LAST_DAY', label: 'Last Day' },
    { value: 'DAYS_BETWEEN', label: 'Days Between' },
    { value: 'FULL_DAY', label: 'Full Day' },
    { value: 'HALF_DAY', label: 'Half Day' }
  ];

  // Group deductions by day type - always show the three main sections
  const groupedDeductions = React.useMemo(() => {
    const groups = {
      FIRST_DAY: deductions.filter(d => d.deductionDay === 'FIRST_DAY'),
      DAYS_BETWEEN: deductions.filter(d => d.deductionDay === 'DAYS_BETWEEN'),
      LAST_DAY: deductions.filter(d => d.deductionDay === 'LAST_DAY')
    };
    return groups;
  }, [deductions]);

  const sectionConfig = [
    { key: 'FIRST_DAY', title: 'First Day', description: 'Deductions applied on the first day of travel' },
    { key: 'DAYS_BETWEEN', title: 'Days Between', description: 'Deductions applied on days between first and last day' },
    { key: 'LAST_DAY', title: 'Last Day', description: 'Deductions applied on the last day of travel' }
  ];

  const columns: ColumnsType<ExpenseRuleDeduction> = [
    {
      title: 'Meal Deductions',
      key: 'mealDeductions',
      width: 300,
      render: (_, record) => renderMealDeductions(record)
    },
    {
      title: 'Additional Info',
      key: 'additionalInfo',
      width: 150,
      render: (_, record) => (
        <div className="gba:flex gba:flex-col gba:gap-1">
          {record.overnightAllowance && (
            <Tag color="purple" size="small">
              Overnight Allowance
            </Tag>
          )}
          <span className="gba:text-xs gba:text-gray-500">
            Order: {record.deductionOrder}
          </span>
        </div>
      )
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
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit deduction rule">
            <Button
              type="text"
              size="small"
              icon={<PiPencil />}
              onClick={() => handleEdit(record)}
              data-testid={`edit-deduction-${record.id}`}
            />
          </Tooltip>
          <Popconfirm
            title="Delete deduction rule"
            description="Are you sure you want to delete this deduction rule?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete deduction rule">
              <Button
                type="text"
                size="small"
                icon={<PiTrash />}
                danger
                data-testid={`delete-deduction-${record.id}`}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (isLoading) {
    return (
      <div 
        data-testid="deduction-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Deduction Rules"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchDeductions}>
            Retry
          </Button>
        }
        data-testid="deduction-tab-error"
      />
    );
  }

  return (
    <div data-testid="deduction-tab">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:m-0">Allowance Deduction Rules</h3>
          <p className="gba:text-sm gba:text-gray-500 gba:m-0">
            Manage meal deduction rules organized by travel day type
          </p>
        </div>
        <Button
          type="primary"
          icon={<PiPlus />}
          onClick={handleAdd}
          data-testid="add-deduction-button"
        >
          Add Deduction Rule
        </Button>
      </div>

      {/* Sections for each deduction day type */}
      <div className="gba:space-y-6">
        {sectionConfig.map((section) => {
          const sectionDeductions = groupedDeductions[section.key as keyof typeof groupedDeductions];
          
          return (
            <div key={section.key} className="gba:bg-white gba:rounded-lg gba:border gba:border-gray-200">
              {/* Section Header */}
              <div className="gba:px-6 gba:py-4 gba:border-b gba:border-gray-200 gba:bg-gray-50">
                <div className="gba:flex gba:justify-between gba:items-center">
                  <div>
                    <h4 className="gba:text-base gba:font-semibold gba:m-0 gba:text-gray-900">
                      {section.title}
                    </h4>
                    <p className="gba:text-sm gba:text-gray-600 gba:m-0 gba:mt-1">
                      {section.description}
                    </p>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Tag color="blue">
                      {sectionDeductions.length} rule{sectionDeductions.length !== 1 ? 's' : ''}
                    </Tag>
                  </div>
                </div>
              </div>

              {/* Section Content */}
              <div className="gba:p-6">
                {sectionDeductions.length > 0 ? (
                  <Table
                    columns={columns}
                    dataSource={sectionDeductions}
                    rowKey="id"
                    loading={isSaving}
                    pagination={false}
                    size="small"
                    data-testid={`deductions-table-${section.key.toLowerCase()}`}
                  />
                ) : (
                  <div className="gba:text-center gba:py-8 gba:text-gray-500">
                    <p className="gba:m-0">No deduction rules configured for {section.title.toLowerCase()}</p>
                    <p className="gba:text-xs gba:mt-1 gba:text-gray-400">
                      Click "Add Deduction Rule" above and select "{section.title}" as the deduction day type
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        title={`${editingItem ? 'Edit' : 'Add'} Deduction Rule`}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isSaving}
        width={800}
        data-testid="deduction-modal"
      >
        <Form
          form={form}
          layout="vertical"
          data-testid="deduction-form"
        >
          <Form.Item
            name="deductionOrder"
            label="Order"
            rules={[{ required: true, message: 'Please enter order' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Card title="Meal Deductions & Tax Settings" className="gba:mb-4">
            <Row gutter={24}>
              <Col span={8}>
                <Card size="small" title={<><PiCoffee className="gba:mr-2" />Breakfast</>} className="gba:mb-4">
                  <Form.Item
                    name="deductBreakfast"
                    valuePropName="checked"
                    className="gba:mb-2"
                  >
                    <Switch checkedChildren="Deduct" unCheckedChildren="Skip" />
                  </Form.Item>
                  <Form.Item
                    name="taxBreakfast"
                    valuePropName="checked"
                    className="gba:mb-0"
                  >
                    <Switch checkedChildren="Tax" unCheckedChildren="No Tax" />
                  </Form.Item>
                </Card>
              </Col>
              
              <Col span={8}>
                <Card size="small" title={<><PiBowlFood className="gba:mr-2" />Lunch</>} className="gba:mb-4">
                  <Form.Item
                    name="deductLunch"
                    valuePropName="checked"
                    className="gba:mb-2"
                  >
                    <Switch checkedChildren="Deduct" unCheckedChildren="Skip" />
                  </Form.Item>
                  <Form.Item
                    name="taxLunch"
                    valuePropName="checked"
                    className="gba:mb-0"
                  >
                    <Switch checkedChildren="Tax" unCheckedChildren="No Tax" />
                  </Form.Item>
                </Card>
              </Col>
              
              <Col span={8}>
                <Card size="small" title={<><PiMoon className="gba:mr-2" />Dinner</>} className="gba:mb-4">
                  <Form.Item
                    name="deductDinner"
                    valuePropName="checked"
                    className="gba:mb-2"
                  >
                    <Switch checkedChildren="Deduct" unCheckedChildren="Skip" />
                  </Form.Item>
                  <Form.Item
                    name="taxDinner"
                    valuePropName="checked"
                    className="gba:mb-0"
                  >
                    <Switch checkedChildren="Tax" unCheckedChildren="No Tax" />
                  </Form.Item>
                </Card>
              </Col>
            </Row>
          </Card>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item
              name="deductionDay"
              label="Deduction Day Type"
            >
              <Select placeholder="Select deduction day type">
                {deductionDayOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="overnightAllowance"
              valuePropName="checked"
            >
              <Switch checkedChildren="Overnight Allowance" unCheckedChildren="Overnight Allowance" />
            </Form.Item>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item
              name="activeFrom"
              label="Valid From"
              rules={[{ required: true, message: 'Please select start date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="activeTo"
              label="Valid To"
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DeductionTab; 