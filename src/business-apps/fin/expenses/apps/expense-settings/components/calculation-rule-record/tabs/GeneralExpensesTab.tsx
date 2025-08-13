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
  Switch,
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
  PiReceipt,
  PiPercent
} from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { ExpenseRuleGeneralExpense, ExpenseGroupWithTranslations } from '../../../types/ExpenseRuleTypes';
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient';

const { Option } = Select;

interface GeneralExpensesTabProps {
  ruleId: string;
  accessToken: string;
  activeFrom: string;
}

interface GeneralExpenseFormData {
  id?: string;
  expenseRuleId: string;
  code: string;
  name: string;
  reimbursable: boolean;
  taxCodeRef?: string;
  taxValue?: number;
  activeFrom: string;
  activeTo?: string;
  expenseGroupRef?: string;
  version?: number;
}

const GeneralExpensesTab: React.FC<GeneralExpensesTabProps> = ({
  ruleId,
  accessToken,
  activeFrom
}) => {
  const [form] = Form.useForm();
  const graphqlClient = useGraphQLClient(accessToken);
  
  const [generalExpenses, setGeneralExpenses] = useState<ExpenseRuleGeneralExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseRuleGeneralExpense | null>(null);

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken);

  const fetchGeneralExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
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
      `;
      
      const result = await graphqlClient.request<{ ExpenseRule: { expenseRuleGeneralExpense: ExpenseRuleGeneralExpense[] }[] }>(
        query, 
        { ruleId }
      );
      
      const expenseRule = result.ExpenseRule?.[0];
      const generalExpenses = expenseRule?.expenseRuleGeneralExpense || [];
      
      // Debug: Log expense group data
      console.log('🔍 GeneralExpensesTab - Fetched expense data:', {
        ruleId,
        expenseCount: generalExpenses.length,
        firstExpenseGroups: generalExpenses.slice(0, 3).map(exp => ({
          id: exp.id,
          code: exp.code,
          name: exp.name,
          expenseGroupCode: exp.expenseGroup?.code,
          expenseGroupValue: exp.expenseGroup?.value,
          expenseGroupId: exp.expenseGroup?.id
        }))
      });
      
      setGeneralExpenses(generalExpenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load general expenses');
      console.error('Error fetching general expenses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, ruleId]);

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchGeneralExpenses();
    }
  }, [ruleId, accessToken, fetchGeneralExpenses]);

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      activeFrom: dayjs(activeFrom),
      reimbursable: true,
      taxValue: 0
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: ExpenseRuleGeneralExpense) => {
    setEditingItem(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      reimbursable: record.reimbursable,
      taxCodeRef: record.taxCodeRef,
      taxValue: record.taxValue,
      activeFrom: dayjs(record.activeFrom),
      activeTo: record.activeTo ? dayjs(record.activeTo) : undefined,
      expenseGroupRef: record.expenseGroup?.id
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: ExpenseRuleGeneralExpense) => {
    try {
      setIsSaving(true);
      await expenseSettingsClient.deleteExpenseRuleGeneralExpense(record.id, record.version);
      message.success('General expense rule deleted successfully');
      await fetchGeneralExpenses();
    } catch (err) {
      message.error('Failed to delete general expense rule');
      console.error('Delete error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setIsSaving(true);

      const saveData: GeneralExpenseFormData = {
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        code: values.code,
        name: values.name,
        reimbursable: values.reimbursable,
        taxCodeRef: values.taxCodeRef,
        taxValue: values.taxValue,
        activeFrom: values.activeFrom.toISOString(),
        activeTo: values.activeTo ? values.activeTo.toISOString() : undefined,
        expenseGroupRef: values.expenseGroupRef
      };

      await expenseSettingsClient.saveExpenseRuleGeneralExpense(saveData);
      message.success(`General expense rule ${editingItem ? 'updated' : 'created'} successfully`);
      
      setIsModalVisible(false);
      await fetchGeneralExpenses();
      
    } catch (err) {
      message.error(`Failed to ${editingItem ? 'update' : 'create'} general expense rule`);
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD.MM.YYYY');
  };

  const formatTaxValue = (taxValue?: number): string => {
    if (taxValue === undefined || taxValue === null) return 'Not set';
    return `${taxValue}%`;
  };

  // Mock expense group options - in real implementation, these would come from catalog
  const expenseGroupOptions = [
    { value: 'ExpenseGroup:v1:TRAVEL', label: 'Travel Expenses' },
    { value: 'ExpenseGroup:v1:MEALS', label: 'Meals & Entertainment' },
    { value: 'ExpenseGroup:v1:OFFICE', label: 'Office Supplies' },
    { value: 'ExpenseGroup:v1:TRANSPORT', label: 'Transportation' },
    { value: 'ExpenseGroup:v1:ACCOMMODATION', label: 'Accommodation' }
  ];

  const formatReimbursable = (reimbursable: boolean): React.ReactNode => {
    if (reimbursable === true) {
      return <Tag color="green">Yes</Tag>;
    } else if (reimbursable === false) {
      return <Tag color="red">No</Tag>;
    }
    return <span className="gba:text-gray-400">Not set</span>;
  };

  const getLocalizedExpenseGroupName = (expenseGroup?: ExpenseGroupWithTranslations): string => {
    if (!expenseGroup) return 'Not set';
    
    // Try to find current locale translation first
    const currentLocale = 'en-US'; // Could be from getCurrentActiveUserLocale()
    const translation = expenseGroup.translations?.find(t => t.localeCode === currentLocale);
    
    if (translation?.value) {
      return translation.value;
    }
    
    // Fallback to default value
    return expenseGroup.value || 'Not set';
  };

  const formatTaxCode = (taxCodeRef?: string): string => {
    if (!taxCodeRef) return 'Not set';
    
    // Extract the actual tax code from the reference
    // "TaxCode:v1:V00" -> "V00"
    const parts = taxCodeRef.split(':');
    return parts.length >= 3 ? parts[2] : taxCodeRef;
  };

  const columns: ColumnsType<ExpenseRuleGeneralExpense> = [
    {
      title: 'Expense',
      key: 'expense',
      width: 200,
      render: (_, record) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiReceipt className="gba:text-gray-400" />
          <div>
            <div className="gba:font-mono gba:font-medium gba:text-sm">
              {record.code}
            </div>
            <div className="gba:text-gray-600 gba:text-xs">
              {record.name || 'No name set'}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Reimbursable',
      dataIndex: 'reimbursable',
      key: 'reimbursable',
      width: 120,
      align: 'center',
      render: (reimbursable) => formatReimbursable(reimbursable)
    },
    {
      title: 'Tax',
      key: 'tax',
      width: 130,
      render: (_, record) => {
        const taxCode = formatTaxCode(record.taxCodeRef);
        const taxValue = formatTaxValue(record.taxValue);
        
        return (
          <div className="gba:flex gba:items-center gba:gap-1">
            <PiPercent className="gba:text-gray-400" />
            <span className="gba:font-mono gba:text-sm">
              {taxCode}: {taxValue}
            </span>
          </div>
        );
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
      render: (expenseGroup) => {
        // Debug: Log what we're receiving
        console.log('🔍 ExpenseGroup render:', {
          expenseGroup,
          hasCode: !!expenseGroup?.code,
          code: expenseGroup?.code,
          value: expenseGroup?.value
        });
        
        if (expenseGroup?.code) {
          return (
            <Tag color="blue" title={getLocalizedExpenseGroupName(expenseGroup)}>
              {expenseGroup.code}
            </Tag>
          );
        }
        return <span className="gba:text-gray-400">Not set</span>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit general expense">
            <Button
              type="text"
              size="small"
              icon={<PiPencil />}
              onClick={() => handleEdit(record)}
              data-testid={`edit-general-expense-${record.id}`}
            />
          </Tooltip>
          <Popconfirm
            title="Delete general expense"
            description="Are you sure you want to delete this general expense?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete general expense">
              <Button
                type="text"
                size="small"
                icon={<PiTrash />}
                danger
                data-testid={`delete-general-expense-${record.id}`}
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
        data-testid="general-expenses-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading General Expenses"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchGeneralExpenses}>
            Retry
          </Button>
        }
        data-testid="general-expenses-tab-error"
      />
    );
  }

  return (
    <div data-testid="general-expenses-tab">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:m-0">General Expenses</h3>
          <p className="gba:text-sm gba:text-gray-500 gba:m-0">
            Manage general expense rules and tax configurations
          </p>
        </div>
        <Button
          type="primary"
          icon={<PiPlus />}
          onClick={handleAdd}
          data-testid="add-general-expense-button"
        >
          Add General Expense
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={generalExpenses}
        rowKey="id"
        loading={isSaving}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} general expense rules`,
        }}
        scroll={{ x: 600 }}
        data-testid="general-expenses-table"
      />

      {/* Add/Edit Modal */}
      <Modal
        title={`${editingItem ? 'Edit' : 'Add'} General Expense Rule`}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isSaving}
        width={600}
        data-testid="general-expense-modal"
      >
        <Form
          form={form}
          layout="vertical"
          data-testid="general-expense-form"
        >
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item
              name="code"
              label="Code"
              rules={[{ required: true, message: 'Please enter a code' }]}
            >
              <Input placeholder="Enter expense code" />
            </Form.Item>

            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="Enter expense name" />
            </Form.Item>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item
              name="reimbursable"
              label="Reimbursable"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="taxCodeRef"
              label="Tax Code"
            >
              <Input placeholder="e.g., TaxCode:v1:V00" />
            </Form.Item>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item
              name="taxValue"
              label="Tax Value (%)"
            >
              <InputNumber
                min={0}
                max={100}
                step={0.01}
                style={{ width: '100%' }}
                formatter={(value) => `${value}%`}
                parser={(value) => value?.replace('%', '') as any}
              />
            </Form.Item>

            <Form.Item
              name="expenseGroupRef"
              label="Expense Group"
            >
              <Select placeholder="Select expense group">
                {expenseGroupOptions.map(option => (
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

export default GeneralExpensesTab; 