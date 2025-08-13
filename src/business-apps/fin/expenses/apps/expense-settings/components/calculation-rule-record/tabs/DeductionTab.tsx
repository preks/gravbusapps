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
  Card
} from 'antd';
import { 
  PiPlus, 
  PiPencil, 
  PiTrash, 
  PiCalendar, 
  PiCheck,
  PiX 
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
          ExpenseRuleDeduction(
            where: {
              _and: [
                { expenseRuleId: { _eq: $ruleId } },
                { isDeleted: { _eq: false } }
              ]
            }
            orderBy: { deductionOrder: ASC }
          ) {
            id
            deductBreakfast
            deductLunch
            deductDinner
            deductionDay
            deductionOrder
            overnightAllowance
            activeFrom
            activeTo
            version
            isDeleted
          }
        }
      `;
      
      const result = await graphqlClient.request<{ ExpenseRuleDeduction: ExpenseRuleDeduction[] }>(
        query, 
        { ruleId }
      );
      
      setDeductions(result.ExpenseRuleDeduction || []);
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
      overnightAllowance: false
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: ExpenseRuleDeduction) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      activeFrom: dayjs(record.activeFrom),
      activeTo: record.activeTo ? dayjs(record.activeTo) : undefined
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
    return dayjs(dateString).format('DD.MM.YYYY');
  };

  const deductionDayOptions = [
    { value: 'FULL_DAY', label: 'Full Day' },
    { value: 'HALF_DAY', label: 'Half Day' },
    { value: 'QUARTER_DAY', label: 'Quarter Day' }
  ];

  const columns: ColumnsType<ExpenseRuleDeduction> = [
    {
      title: 'Order',
      dataIndex: 'deductionOrder',
      key: 'deductionOrder',
      width: 80,
      sorter: (a, b) => a.deductionOrder - b.deductionOrder,
      render: (order) => (
        <Tag color="blue" className="gba:font-mono">
          {order}
        </Tag>
      )
    },
    {
      title: 'Breakfast',
      dataIndex: 'deductBreakfast',
      key: 'deductBreakfast',
      width: 100,
      align: 'center',
      render: (deduct) => (
        deduct ? 
          <PiCheck className="gba:text-green-500 gba:text-lg" /> : 
          <PiX className="gba:text-gray-400 gba:text-lg" />
      )
    },
    {
      title: 'Lunch',
      dataIndex: 'deductLunch',
      key: 'deductLunch',
      width: 100,
      align: 'center',
      render: (deduct) => (
        deduct ? 
          <PiCheck className="gba:text-green-500 gba:text-lg" /> : 
          <PiX className="gba:text-gray-400 gba:text-lg" />
      )
    },
    {
      title: 'Dinner',
      dataIndex: 'deductDinner',
      key: 'deductDinner',
      width: 100,
      align: 'center',
      render: (deduct) => (
        deduct ? 
          <PiCheck className="gba:text-green-500 gba:text-lg" /> : 
          <PiX className="gba:text-gray-400 gba:text-lg" />
      )
    },
    {
      title: 'Deduction Day',
      dataIndex: 'deductionDay',
      key: 'deductionDay',
      width: 120,
      render: (day) => day ? (
        <Tag color="orange">
          {deductionDayOptions.find(opt => opt.value === day)?.label || day}
        </Tag>
      ) : (
        <span className="gba:text-gray-400">Not set</span>
      )
    },
    {
      title: 'Overnight',
      dataIndex: 'overnightAllowance',
      key: 'overnightAllowance',
      width: 100,
      align: 'center',
      render: (overnight) => (
        overnight ? 
          <Tag color="purple">Yes</Tag> : 
          <Tag>No</Tag>
      )
    },
    {
      title: 'Valid Period',
      key: 'period',
      width: 200,
      render: (_, record) => (
        <div className="gba:text-sm">
          <div className="gba:flex gba:items-center gba:gap-1">
            <PiCalendar className="gba:text-gray-400" />
            <span>{formatDate(record.activeFrom)}</span>
          </div>
          {record.activeTo && (
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-gray-500">
              <span>to {formatDate(record.activeTo)}</span>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
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
        scroll={{ x: 800 }}
        data-testid="deductions-table"
      />

      {/* Add/Edit Modal */}
      <Modal
        title={`${editingItem ? 'Edit' : 'Add'} Deduction Rule`}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isSaving}
        width={600}
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

          <Card title="Meal Deductions" className="gba:mb-4">
            <div className="gba:grid gba:grid-cols-3 gba:gap-4">
              <Form.Item
                name="deductBreakfast"
                valuePropName="checked"
              >
                <Switch checkedChildren="Breakfast" unCheckedChildren="Breakfast" />
              </Form.Item>

              <Form.Item
                name="deductLunch"
                valuePropName="checked"
              >
                <Switch checkedChildren="Lunch" unCheckedChildren="Lunch" />
              </Form.Item>

              <Form.Item
                name="deductDinner"
                valuePropName="checked"
              >
                <Switch checkedChildren="Dinner" unCheckedChildren="Dinner" />
              </Form.Item>
            </div>
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