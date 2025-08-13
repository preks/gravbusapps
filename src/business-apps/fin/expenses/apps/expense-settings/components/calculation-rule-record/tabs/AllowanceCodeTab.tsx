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
  PiCode
} from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient';

interface AllowanceCodeTabProps {
  ruleId: string;
  accessToken: string;
  activeFrom: string;
}

interface AllowanceCode {
  id: string;
  code: string;
  name: string;
  reimbursable: boolean;
  locationRelation: string;
  travelRegionRule: string;
  percentage: number;
  amount: number;
  calculation?: string;
  expenseGroup: {
    id: string;
    value: string;
    code: string;
  };
  validFrom: string;
  validTo?: string;
  version?: number;
  isDeleted: boolean;
}

interface AllowanceCodeFormData {
  id?: string;
  code: string;
  name: string;
  reimbursable: boolean;
  locationRelation: string;
  travelRegionRule: string;
  percentage: number;
  amount: number;
  calculation?: string;
  expenseGroupRef?: string;
  validFrom: string;
  validTo?: string;
  version?: number;
}

const AllowanceCodeTab: React.FC<AllowanceCodeTabProps> = ({
  ruleId,
  accessToken,
  activeFrom
}) => {
  const [allowanceCodes, setAllowanceCodes] = useState<AllowanceCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<AllowanceCode | null>(null);
  const [form] = Form.useForm();
  const graphqlClient = useGraphQLClient(accessToken);

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken);

  const fetchAllowanceCodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const query = `
        query GetExpenseRuleAllowanceCodes($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleAllowanceCode(where: { isDeleted: { _eq: false } }, orderBy: { codeOrder: ASC }) {
              id
              code
              name
              amount
              abroad
              calculation
              calculationRef
              codeOrder
              activeFrom
              activeTo
              version
              additionalProperties
              businessKey
              reimbursable
              firstAllowanceRegionRulePercent
              secondAllowanceRegionRulePercent
              firstTravelRegionPercent
              secondTravelRegionPercent
              expenseGroup {
                id
                value
                code
              }
            }
          }
        }
      `;
      
      const result = await graphqlClient.request<{ ExpenseRule: { expenseRuleAllowanceCode: any[] }[] }>(
        query, 
        { ruleId }
      );
      
      const expenseRule = result.ExpenseRule?.[0];
      const codes = expenseRule?.expenseRuleAllowanceCode || [];
      
      const transformedCodes: AllowanceCode[] = codes.map((code: any) => ({
        id: code.id,
        code: code.code || '',
        name: code.name || '',
        reimbursable: code.reimbursable || false,
        locationRelation: code.abroad ? 'ABROAD' : 'HOME', // Map abroad boolean to location
        travelRegionRule: 'Romania maximum tax free amount', // Default text, could be dynamic
        percentage: code.firstAllowanceRegionRulePercent || 0,
        amount: code.amount || 0,
        calculation: code.calculation || '',
        expenseGroup: code.expenseGroup || { id: '', value: '', code: '' },
        validFrom: code.activeFrom,
        validTo: code.activeTo,
        version: code.version || 1,
        isDeleted: false
      }));
      
      setAllowanceCodes(transformedCodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allowance codes');
    } finally {
      setIsLoading(false);
    }
  }, [ruleId, graphqlClient]);

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchAllowanceCodes();
    }
  }, [ruleId, accessToken, fetchAllowanceCodes]);

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const locationOptions = [
    { value: 'ABROAD', label: 'Abroad' },
    { value: 'HOME', label: 'Home' },
    { value: 'BOTH', label: 'Both' }
  ];

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      reimbursable: false,
      locationRelation: 'HOME',
      travelRegionRule: 'Romania maximum tax free amount',
      percentage: 0,
      amount: 0,
      validFrom: dayjs(activeFrom)
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: AllowanceCode) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      validFrom: dayjs(record.validFrom),
      validTo: record.validTo ? dayjs(record.validTo) : undefined
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: AllowanceCode) => {
    try {
      setIsSaving(true);
      // TODO: Replace with real API call when available
      await new Promise(resolve => setTimeout(resolve, 500));
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
      setIsSaving(true);
      const values = await form.validateFields();
      
      const formData: AllowanceCodeFormData = {
        ...values,
        validFrom: values.validFrom.toISOString(),
        validTo: values.validTo ? values.validTo.toISOString() : undefined
      };

      // TODO: Replace with real API call when available
      if (editingItem) {
        console.log('Updating allowance code:', { id: editingItem.id, ...formData });
      } else {
        console.log('Creating allowance code:', formData);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
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

  const columns: ColumnsType<AllowanceCode> = [
    {
      title: 'Allowance Code',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiCode className="gba:text-blue-500" />
          <span className="gba:font-mono gba:font-medium">
            {code}
          </span>
        </div>
      )
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: 'Reimbursable',
      dataIndex: 'reimbursable',
      key: 'reimbursable',
      width: 120,
      align: 'center',
      render: (reimbursable) => (
        reimbursable ? (
          <PiCheck className="gba:text-green-500 gba:text-lg" />
        ) : (
          <PiX className="gba:text-gray-400 gba:text-lg" />
        )
      )
    },
    {
      title: 'Location relation',
      dataIndex: 'locationRelation',
      key: 'locationRelation',
      width: 140,
      render: (relation) => {
        const colors = {
          'ABROAD': 'purple',
          'HOME': 'blue',
          'BOTH': 'green'
        };
        return (
          <Tag color={colors[relation as keyof typeof colors] || 'default'}>
            {relation}
          </Tag>
        );
      }
    },
    {
      title: 'Travel Region Rule',
      dataIndex: 'travelRegionRule',
      key: 'travelRegionRule',
      width: 200,
      render: (rule) => (
        <span className="gba:text-sm gba:text-gray-600">
          {rule}
        </span>
      )
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 110,
      align: 'center',
      render: (percentage) => (
        <Tag color={percentage > 0 ? 'green' : percentage < 0 ? 'red' : 'blue'}>
          {percentage}%
        </Tag>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right',
      render: (amount) => (
        <span className="gba:font-mono gba:font-medium">
          {amount > 0 ? amount.toFixed(1) : '-'}
        </span>
      )
    },
    {
      title: 'Calculation',
      dataIndex: 'calculation',
      key: 'calculation',
      width: 120,
      render: (calculation) => (
        <span className="gba:text-sm gba:text-gray-500">
          {calculation || '-'}
        </span>
      )
    },
    {
      title: 'Expense Group',
      key: 'expenseGroup',
      width: 130,
      render: (_, record) => (
        <Tag color="cyan">
          {record.expenseGroup?.value || 'Not set'}
        </Tag>
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
                loading={isSaving}
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
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
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
      />
    );
  }

  return (
    <Card data-testid="allowance-code-tab">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <h4 className="gba:text-lg gba:font-semibold gba:m-0">Allowance Codes</h4>
          <Tag color="blue">{allowanceCodes.length} codes</Tag>
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

      <Table
        columns={columns}
        dataSource={allowanceCodes}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} allowance codes`,
        }}
        scroll={{ x: 1500 }}
        data-testid="allowance-codes-table"
      />

      <Modal
        title={editingItem ? 'Edit Allowance Code' : 'Add Allowance Code'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isSaving}
        width={700}
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
              label="Allowance Code"
              rules={[{ required: true, message: 'Please enter a code' }]}
            >
              <Input 
                placeholder="e.g., A-FULL, L-FULL"
                data-testid="allowance-code-code-input"
              />
            </Form.Item>

            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input 
                placeholder="e.g., Abroad Full Day"
                data-testid="allowance-code-name-input"
              />
            </Form.Item>

            <Form.Item
              name="locationRelation"
              label="Location Relation"
              rules={[{ required: true, message: 'Please select a location relation' }]}
            >
              <Select 
                placeholder="Select location"
                options={locationOptions}
                data-testid="allowance-code-location-select"
              />
            </Form.Item>

            <Form.Item
              name="travelRegionRule"
              label="Travel Region Rule"
            >
              <Input 
                placeholder="e.g., Romania maximum tax free amount"
                data-testid="allowance-code-travel-region-input"
              />
            </Form.Item>

            <Form.Item
              name="percentage"
              label="Percentage"
              rules={[{ required: true, message: 'Please enter a percentage' }]}
            >
              <InputNumber 
                min={-100}
                max={200}
                style={{ width: '100%' }}
                placeholder="100"
                addonAfter="%"
                data-testid="allowance-code-percentage-input"
              />
            </Form.Item>

            <Form.Item
              name="amount"
              label="Amount"
            >
              <InputNumber 
                min={0}
                style={{ width: '100%' }}
                placeholder="57.5"
                step={0.1}
                precision={1}
                data-testid="allowance-code-amount-input"
              />
            </Form.Item>

            <Form.Item
              name="calculation"
              label="Calculation"
            >
              <Input 
                placeholder="Calculation method"
                data-testid="allowance-code-calculation-input"
              />
            </Form.Item>

            <div></div>

            <Form.Item
              name="validFrom"
              label="Valid From"
              rules={[{ required: true, message: 'Please select a valid from date' }]}
            >
              <DatePicker 
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                data-testid="allowance-code-valid-from-picker"
              />
            </Form.Item>

            <Form.Item
              name="validTo"
              label="Valid To"
            >
              <DatePicker 
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                data-testid="allowance-code-valid-to-picker"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="reimbursable"
            label="Reimbursable"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Yes" 
              unCheckedChildren="No"
              data-testid="allowance-code-reimbursable-switch"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AllowanceCodeTab;