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

  const handleEdit = (record: ExpenseRuleDeduction) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      activeFrom: dayjs(record.activeFrom),
      activeTo: record.activeTo ? dayjs(record.activeTo) : undefined,
      taxBreakfast: record.taxBreakfast || false,
      taxLunch: record.taxLunch || false,
      taxDinner: record.taxDinner || false
    });
    setIsModalVisible(true);
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

  const columns: ColumnsType<ExpenseRuleDeduction> = [
    {
      title: 'Deduction Day',
      key: 'deductionInfo',
      width: 200,
      render: (_, record) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:flex-col">
            <div className="gba:flex gba:items-center gba:gap-2">
              {record.deductionDay ? (
                <Tag color="orange">
                  {deductionDayOptions.find(opt => opt.value === record.deductionDay)?.label || record.deductionDay}
                </Tag>
              ) : (
                <span className="gba:text-gray-400 gba:text-sm">Not set</span>
              )}
            </div>
            {record.overnightAllowance && (
              <Tag color="purple" className="gba:mt-1 gba:w-fit">
                Overnight Allowance
              </Tag>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Meal Deductions',
      key: 'mealDeductions',
      width: 280,
      render: (_, record) => renderMealDeductions(record)
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
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:m-0">Deduction Rules</h3>
          <p className="gba:text-sm gba:text-gray-500 gba:m-0">
            Manage meal deduction rules for allowance calculations
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

      {/* Table */}
      <Table
        columns={columns}
        dataSource={deductions}
        rowKey="id"
        loading={isSaving}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} deduction rules`,
        }}
        scroll={{ x: 1000 }}
        data-testid="deductions-table"
      />

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