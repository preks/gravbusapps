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
  Input, 
  InputNumber, 
  Select, 
  Checkbox, 
  DatePicker, 
  message, 
  Popconfirm,
  Tooltip
} from 'antd';
import { 
  PiPlus, 
  PiPencil, 
  PiTrash, 
  PiCalendar, 
  PiCurrencyDollar 
} from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ExpenseRuleAllowanceCode } from '../../../types/ExpenseRuleTypes';
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient';

const { Option } = Select;

interface AllowanceCodeTabProps {
  ruleId: string;
  accessToken: string;
  activeFrom: string;
}

interface AllowanceCodeFormData {
  id?: string;
  code: string;
  amount: number;
  abroad: boolean;
  calculation?: string;
  codeOrder: number;
  activeFrom: string;
  activeTo?: string;
  expenseGroupRef?: string;
  version?: number;
}

const AllowanceCodeTab: React.FC<AllowanceCodeTabProps> = ({
  ruleId,
  accessToken,
  activeFrom
}) => {
  const [form] = Form.useForm();
  const graphqlClient = useGraphQLClient(accessToken);
  
  const [allowanceCodes, setAllowanceCodes] = useState<ExpenseRuleAllowanceCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseRuleAllowanceCode | null>(null);

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken);

  const fetchAllowanceCodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const query = `
        query GetExpenseRuleAllowanceCodes($ruleId: uuid!) {
          ExpenseRuleAllowanceCode(
            where: {
              _and: [
                { expenseRuleId: { _eq: $ruleId } },
                { isDeleted: { _eq: false } }
              ]
            }
            orderBy: { codeOrder: ASC }
          ) {
            id
            code
            amount
            abroad
            calculation
            codeOrder
            activeFrom
            activeTo
            version
            isDeleted
            expenseGroup {
              id
              value
              code
            }
            expenseGroupRef
          }
        }
      `;
      
      const result = await graphqlClient.request<{ ExpenseRuleAllowanceCode: ExpenseRuleAllowanceCode[] }>(
        query, 
        { ruleId }
      );
      
      setAllowanceCodes(result.ExpenseRuleAllowanceCode || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allowance codes');
      console.error('Error fetching allowance codes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, ruleId]);

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchAllowanceCodes();
    }
  }, [ruleId, accessToken, fetchAllowanceCodes]);

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      codeOrder: allowanceCodes.length + 1,
      activeFrom: dayjs(activeFrom),
      abroad: false,
      amount: 0
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: ExpenseRuleAllowanceCode) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      activeFrom: dayjs(record.activeFrom),
      activeTo: record.activeTo ? dayjs(record.activeTo) : undefined
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: ExpenseRuleAllowanceCode) => {
    try {
      setIsSaving(true);
      await expenseSettingsClient.deleteExpenseRuleAllowanceCode(record.id, record.version);
      message.success('Allowance code deleted successfully');
      await fetchAllowanceCodes();
    } catch (err) {
      message.error('Failed to delete allowance code');
      console.error('Delete error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setIsSaving(true);

      const saveData: AllowanceCodeFormData = {
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        code: values.code,
        amount: values.amount,
        abroad: values.abroad || false,
        calculation: values.calculation,
        codeOrder: values.codeOrder,
        activeFrom: values.activeFrom.toISOString(),
        activeTo: values.activeTo ? values.activeTo.toISOString() : undefined,
        expenseGroupRef: values.expenseGroupRef
      };

      await expenseSettingsClient.saveExpenseRuleAllowanceCode(saveData);
      message.success(`Allowance code ${editingItem ? 'updated' : 'created'} successfully`);
      
      setIsModalVisible(false);
      await fetchAllowanceCodes();
      
    } catch (err) {
      message.error(`Failed to ${editingItem ? 'update' : 'create'} allowance code`);
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD.MM.YYYY');
  };

  const columns: ColumnsType<ExpenseRuleAllowanceCode> = [
    {
      title: 'Order',
      dataIndex: 'codeOrder',
      key: 'codeOrder',
      width: 80,
      sorter: (a, b) => a.codeOrder - b.codeOrder,
      render: (order) => (
        <Tag color="blue" className="gba:font-mono">
          {order}
        </Tag>
      )
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code) => (
        <span className="gba:font-mono gba:font-medium">{code}</span>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => (
        <span className="gba:font-medium gba:text-green-600">
          <PiCurrencyDollar className="gba:inline gba:mr-1" />
          {formatCurrency(amount)}
        </span>
      )
    },
    {
      title: 'Location',
      dataIndex: 'abroad',
      key: 'abroad',
      width: 100,
      render: (abroad) => (
        <Tag color={abroad ? 'orange' : 'green'}>
          {abroad ? 'Abroad' : 'Domestic'}
        </Tag>
      )
    },
    {
      title: 'Calculation',
      dataIndex: 'calculation',
      key: 'calculation',
      width: 150,
      render: (calculation) => calculation || <span className="gba:text-gray-400">Not set</span>
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
          <Tooltip title="Edit allowance code">
            <Button
              type="text"
              size="small"
              icon={<PiPencil />}
              onClick={() => handleEdit(record)}
              data-testid={`edit-allowance-code-${record.id}`}
            />
          </Tooltip>
          <Popconfirm
            title="Delete allowance code"
            description="Are you sure you want to delete this allowance code?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete allowance code">
              <Button
                type="text"
                size="small"
                icon={<PiTrash />}
                danger
                data-testid={`delete-allowance-code-${record.id}`}
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
        data-testid="allowance-code-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Allowance Codes"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchAllowanceCodes}>
            Retry
          </Button>
        }
        data-testid="allowance-code-tab-error"
      />
    );
  }

  return (
    <div data-testid="allowance-code-tab">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:m-0">Allowance Codes</h3>
          <p className="gba:text-sm gba:text-gray-500 gba:m-0">
            Manage allowance codes for expense calculation rule
          </p>
        </div>
        <Button
          type="primary"
          icon={<PiPlus />}
          onClick={handleAdd}
          data-testid="add-allowance-code-button"
        >
          Add Allowance Code
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={allowanceCodes}
        rowKey="id"
        loading={isSaving}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} allowance codes`,
        }}
        scroll={{ x: 800 }}
        data-testid="allowance-codes-table"
      />

      {/* Add/Edit Modal */}
      <Modal
        title={`${editingItem ? 'Edit' : 'Add'} Allowance Code`}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isSaving}
        width={600}
        data-testid="allowance-code-modal"
      >
        <Form
          form={form}
          layout="vertical"
          data-testid="allowance-code-form"
        >
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item
              name="code"
              label="Code"
              rules={[{ required: true, message: 'Please enter a code' }]}
            >
              <Input placeholder="Enter allowance code" />
            </Form.Item>

            <Form.Item
              name="codeOrder"
              label="Order"
              rules={[{ required: true, message: 'Please enter order' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item
              name="amount"
              label="Amount"
              rules={[{ required: true, message: 'Please enter amount' }]}
            >
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                formatter={(value) => `€ ${value}`}
                parser={(value) => value?.replace('€ ', '') as any}
              />
            </Form.Item>

            <Form.Item
              name="calculation"
              label="Calculation"
            >
              <Input placeholder="Calculation method" />
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

          <Form.Item
            name="abroad"
            valuePropName="checked"
          >
            <Checkbox>Apply for abroad travel</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AllowanceCodeTab; 