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
  Select, 
  Switch, 
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
  PiX,
  PiGear,
  PiCode
} from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient';

interface AllowanceSetupTabProps {
  ruleId: string;
  accessToken: string;
  activeFrom: string;
}

interface AllowanceSetup {
  id: string;
  name: string;
  issue: string;
  onlyTax: boolean;
  validFrom: string;
  validTo?: string;
  allowancePeriod: {
    id: string;
    code: string;
    name: string;
  };
  allowanceCode: {
    id: string;
    code: string;
    name: string;
  };
  version?: number;
  isDeleted: boolean;
}

interface AllowanceSetupFormData {
  id?: string;
  name: string;
  issue: string;
  onlyTax: boolean;
  validFrom: string;
  validTo?: string;
  allowancePeriodId: string;
  allowanceCodeId: string;
  version?: number;
}

const AllowanceSetupTab: React.FC<AllowanceSetupTabProps> = ({
  ruleId,
  accessToken,
  activeFrom
}) => {
  const [allowanceSetups, setAllowanceSetups] = useState<AllowanceSetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<AllowanceSetup | null>(null);
  const [allowancePeriods, setAllowancePeriods] = useState<any[]>([]);
  const [allowanceCodes, setAllowanceCodes] = useState<any[]>([]);
  const [form] = Form.useForm();
  const graphqlClient = useGraphQLClient(accessToken);

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken);

  const fetchAllowanceSetups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
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
      `;
      
      const result = await graphqlClient.request<{ ExpenseRule: any[] }>(
        query, 
        { ruleId }
      );
      
      const expenseRule = result.ExpenseRule?.[0];
      const setups = expenseRule?.expenseRuleAllowanceSetup || [];
      const periods = expenseRule?.expenseRuleAllowancePeriod || [];
      const codes = expenseRule?.expenseRuleAllowanceCode || [];
      
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
      }));
      
      setAllowanceSetups(transformedSetups);
      setAllowancePeriods(periods);
      setAllowanceCodes(codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allowance setups');
    } finally {
      setIsLoading(false);
    }
  }, [ruleId, graphqlClient]);

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchAllowanceSetups();
    }
  }, [ruleId, accessToken, fetchAllowanceSetups]);

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const issueOptions = [
    { value: 'Daily Allowance', label: 'Daily Allowance' },
    { value: 'Breakfast Deduction', label: 'Breakfast Deduction' },
    { value: 'Lunch Deduction', label: 'Lunch Deduction' },
    { value: 'Dinner Deduction', label: 'Dinner Deduction' },
    { value: 'Special Allowance', label: 'Special Allowance' },
    { value: 'Travel Allowance', label: 'Travel Allowance' }
  ];

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      onlyTax: false,
      validFrom: dayjs(activeFrom),
      issue: 'Daily Allowance'
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: AllowanceSetup) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      allowancePeriodId: record.allowancePeriod.id,
      allowanceCodeId: record.allowanceCode.id,
      validFrom: dayjs(record.validFrom),
      validTo: record.validTo ? dayjs(record.validTo) : undefined
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: AllowanceSetup) => {
    try {
      setIsSaving(true);
      // TODO: Replace with real API call when available
      await new Promise(resolve => setTimeout(resolve, 500));
      message.success('Allowance setup deleted successfully');
      await fetchAllowanceSetups();
    } catch (err) {
      message.error('Failed to delete allowance setup');
      console.error('Delete error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const values = await form.validateFields();
      
      const formData: AllowanceSetupFormData = {
        ...values,
        validFrom: values.validFrom.toISOString(),
        validTo: values.validTo ? values.validTo.toISOString() : undefined
      };

      // TODO: Replace with real API call when available
      if (editingItem) {
        console.log('Updating allowance setup:', { id: editingItem.id, ...formData });
      } else {
        console.log('Creating allowance setup:', formData);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      message.success(`Allowance setup ${editingItem ? 'updated' : 'created'} successfully`);
      setIsModalVisible(false);
      await fetchAllowanceSetups();
    } catch (err) {
      message.error(`Failed to ${editingItem ? 'update' : 'create'} allowance setup`);
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const columns: ColumnsType<AllowanceSetup> = [
    {
      title: 'Allowance Period',
      key: 'allowancePeriod',
      width: 150,
      render: (_, record) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiGear className="gba:text-blue-500" />
          <span className="gba:font-mono gba:font-medium">
            {record.allowancePeriod.code}
          </span>
        </div>
      )
    },
    {
      title: 'Allowance Code',
      key: 'allowanceCode',
      width: 150,
      render: (_, record) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiCode className="gba:text-purple-500" />
          <span className="gba:font-mono gba:font-medium">
            {record.allowanceCode.code}
          </span>
        </div>
      )
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <div>
          <div className="gba:font-medium">{name}</div>
          <div className="gba:text-xs gba:text-gray-500">
            {record.allowanceCode.name}
          </div>
        </div>
      )
    },
    {
      title: 'Issue',
      dataIndex: 'issue',
      key: 'issue',
      width: 150,
      render: (issue) => {
        const colors = {
          'Daily Allowance': 'blue',
          'Breakfast Deduction': 'orange',
          'Lunch Deduction': 'green',
          'Dinner Deduction': 'purple',
          'Special Allowance': 'cyan',
          'Travel Allowance': 'gold'
        };
        return (
          <Tag color={colors[issue as keyof typeof colors] || 'default'}>
            {issue}
          </Tag>
        );
      }
    },
    {
      title: 'Tax Only',
      dataIndex: 'onlyTax',
      key: 'onlyTax',
      width: 100,
      align: 'center',
      render: (onlyTax) => (
        onlyTax ? (
          <PiCheck className="gba:text-green-500 gba:text-lg" />
        ) : (
          <PiX className="gba:text-gray-400 gba:text-lg" />
        )
      )
    },
    {
      title: 'Valid From',
      dataIndex: 'validFrom',
      key: 'validFrom',
      width: 120,
      render: (date) => (
        <div className="gba:flex gba:items-center gba:gap-1">
          <PiCalendar className="gba:text-gray-400" />
          <span className="gba:text-sm">{formatDate(date)}</span>
        </div>
      )
    },
    {
      title: 'Valid To',
      dataIndex: 'validTo',
      key: 'validTo',
      width: 120,
      render: (date) => (
        <div className="gba:flex gba:items-center gba:gap-1">
          <PiCalendar className="gba:text-gray-400" />
          <span className="gba:text-sm">{date ? formatDate(date) : '∞'}</span>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit allowance setup">
            <Button
              type="text"
              size="small"
              icon={<PiPencil />}
              onClick={() => handleEdit(record)}
              data-testid={`edit-allowance-setup-${record.id}`}
            />
          </Tooltip>
          <Popconfirm
            title="Delete allowance setup"
            description="Are you sure you want to delete this allowance setup?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete allowance setup">
              <Button
                type="text"
                size="small"
                icon={<PiTrash />}
                danger
                loading={isSaving}
                data-testid={`delete-allowance-setup-${record.id}`}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Allowance Setups"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchAllowanceSetups}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <Card data-testid="allowance-setup-tab">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <h4 className="gba:text-lg gba:font-semibold gba:m-0">Allowance Setups</h4>
          <Tag color="blue">{allowanceSetups.length} setups</Tag>
        </div>
        <Button
          type="primary"
          icon={<PiPlus />}
          onClick={handleAdd}
          data-testid="add-allowance-setup-button"
        >
          Add Allowance Setup
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={allowanceSetups}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} allowance setups`,
        }}
        scroll={{ x: 1000 }}
        data-testid="allowance-setups-table"
      />

      <Modal
        title={editingItem ? 'Edit Allowance Setup' : 'Add Allowance Setup'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isSaving}
        width={600}
        data-testid="allowance-setup-modal"
      >
        <Form
          form={form}
          layout="vertical"
          data-testid="allowance-setup-form"
        >
          <Form.Item
            name="allowancePeriodId"
            label="Allowance Period"
            rules={[{ required: true, message: 'Please select an allowance period' }]}
          >
            <Select 
              placeholder="Select allowance period"
              options={allowancePeriods.map(period => ({
                value: period.id,
                label: `${period.code} - ${period.name}`
              }))}
              data-testid="allowance-setup-period-select"
            />
          </Form.Item>

          <Form.Item
            name="allowanceCodeId"
            label="Allowance Code"
            rules={[{ required: true, message: 'Please select an allowance code' }]}
          >
            <Select 
              placeholder="Select allowance code"
              options={allowanceCodes.map(code => ({
                value: code.id,
                label: `${code.code} - ${code.name}`
              }))}
              data-testid="allowance-setup-code-select"
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input 
              placeholder="e.g., Full Day Setup"
              data-testid="allowance-setup-name-input"
            />
          </Form.Item>

          <Form.Item
            name="issue"
            label="Issue"
            rules={[{ required: true, message: 'Please select an issue' }]}
          >
            <Select 
              placeholder="Select issue type"
              options={issueOptions}
              data-testid="allowance-setup-issue-select"
            />
          </Form.Item>

          <Form.Item
            name="onlyTax"
            label="Tax Only"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Tax Only" 
              unCheckedChildren="Include Allowance"
              data-testid="allowance-setup-tax-only-switch"
            />
          </Form.Item>

          <Form.Item
            name="validFrom"
            label="Valid From"
            rules={[{ required: true, message: 'Please select a valid from date' }]}
          >
            <DatePicker 
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              data-testid="allowance-setup-valid-from-picker"
            />
          </Form.Item>

          <Form.Item
            name="validTo"
            label="Valid To"
          >
            <DatePicker 
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              data-testid="allowance-setup-valid-to-picker"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AllowanceSetupTab; 