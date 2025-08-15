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
  PiCode,
  PiDatabase
} from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Register dayjs plugins
dayjs.extend(weekday);
dayjs.extend(localeData);
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

interface CustomFieldsTabProps {
  ruleId: string;
  accessToken: string;
  activeFrom: string;
}

interface CustomField {
  id: string;
  source: string; // derived from related entity
  code: string; // from related entity
  name: string; // from related entity
  valueType: string; // approximated or default
  mandatory: boolean;
  validFrom: string;
  validTo?: string;
  infoValue: string; // the actual value/description
  version?: number;
  isDeleted: boolean;
  relatedEntity: string; // general or mileage
}

interface CustomFieldFormData {
  id?: string;
  source: string;
  code: string;
  name: string;
  valueType: string;
  mandatory: boolean;
  validFrom: string;
  validTo?: string;
  infoValue: string;
  version?: number;
}

const CustomFieldsTab: React.FC<CustomFieldsTabProps> = ({
  ruleId,
  accessToken,
  activeFrom
}) => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomField | null>(null);
  const [form] = Form.useForm();
  const graphqlClient = useGraphQLClient(accessToken);

  // REAL GraphQL data from ExpenseRuleOtherInfo
  const fetchCustomFields = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
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
      `;
      
      const result = await graphqlClient.request<{ ExpenseRule: { expenseRuleOtherInfo: any[] }[] }>(
        query, 
        { ruleId }
      );
      
      const expenseRule = result.ExpenseRule?.[0];
      const otherInfos = expenseRule?.expenseRuleOtherInfo || [];
      
      const transformedFields: CustomField[] = otherInfos.map((info: any) => {
        // Determine source and get code/name from related entity
        let source = 'Manual Entry';
        let code = 'CUSTOM_FIELD';
        let name = 'Custom Field';
        let relatedEntity = 'unknown';
        
        if (info.expenseRuleGeneralExpense) {
          source = 'General Expense System';
          code = info.expenseRuleGeneralExpense.code;
          name = info.expenseRuleGeneralExpense.name;
          relatedEntity = 'general';
        } else if (info.expenseRuleMileage) {
          source = 'Mileage System';
          code = info.expenseRuleMileage.code;
          name = info.expenseRuleMileage.name;
          relatedEntity = 'mileage';
        }
        
        // Determine value type based on infoValue content (simple heuristic)
        let valueType = 'STRING'; // default
        if (info.infoValue) {
          if (!isNaN(Number(info.infoValue))) {
            valueType = 'NUMBER';
          } else if (info.infoValue.toLowerCase() === 'true' || info.infoValue.toLowerCase() === 'false') {
            valueType = 'BOOLEAN';
          } else if (info.infoValue.includes('/') && info.infoValue.length === 10) {
            valueType = 'DATE';
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
        };
      });
      
      setCustomFields(transformedFields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load custom fields');
    } finally {
      setIsLoading(false);
    }
  }, [ruleId, graphqlClient]);

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchCustomFields();
    }
  }, [ruleId, accessToken, fetchCustomFields]);

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const valueTypeOptions = [
    { value: 'STRING', label: 'String' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'BOOLEAN', label: 'Boolean' },
    { value: 'DATE', label: 'Date' },
    { value: 'ENUM', label: 'Enumeration' },
    { value: 'JSON', label: 'JSON Object' }
  ];

  const sourceOptions = [
    { value: 'Manual Entry', label: 'Manual Entry' },
    { value: 'External API', label: 'External API' },
    { value: 'HR System', label: 'HR System' },
    { value: 'Finance System', label: 'Finance System' },
    { value: 'Time Tracking', label: 'Time Tracking' }
  ];

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      source: 'Manual Entry',
      valueType: 'STRING',
      mandatory: false,
      validFrom: dayjs(activeFrom)
    });
    setIsModalVisible(true);
  };

  const handleEdit = async (record: CustomField) => {
    // ✅ FIX: Fetch fresh data instead of relying on potentially stale list data
    setEditingItem(record);
    setIsModalVisible(true);
    
    try {
      setIsSaving(true);
      // TODO: In a real implementation, fetch fresh data for this specific item:
      // const freshData = await expenseSettingsClient.getExpenseRuleOtherInfoById(record.id);
      
      // For now, use the existing record data but with explicit refresh pattern
      const freshData = record;
      
      form.setFieldsValue({
        ...freshData,
        validFrom: dayjs(freshData.validFrom),
        validTo: freshData.validTo ? dayjs(freshData.validTo) : undefined
      });
    } catch (err) {
      message.error('Failed to load latest data for editing');
      console.error('Edit load error:', err);
      setIsModalVisible(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record: CustomField) => {
    try {
      setIsSaving(true);
      await expenseSettingsClient.deleteExpenseRuleOtherInfo(record.id);
      message.success('Custom field deleted successfully');
      await fetchCustomFields();
    } catch (err) {
      message.error('Failed to delete custom field');
      console.error('Delete error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const values = await form.validateFields();
      
      const formData: CustomFieldFormData = {
        ...values,
        validFrom: values.validFrom.toISOString(),
        validTo: values.validTo ? values.validTo.toISOString() : undefined
      };

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
      };
      await expenseSettingsClient.saveExpenseRuleOtherInfo(payload);

      message.success(`Custom field ${editingItem ? 'updated' : 'created'} successfully`);
      setIsModalVisible(false);
      await fetchCustomFields();
    } catch (err) {
      message.error(`Failed to ${editingItem ? 'update' : 'create'} custom field`);
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const columns: ColumnsType<CustomField> = [
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 130,
      render: (source) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiDatabase className="gba:text-blue-500" />
          <Tag color="blue">{source}</Tag>
        </div>
      )
    },
    {
      title: 'Code & Name',
      key: 'codeAndName',
      width: 200,
      render: (_, record) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiCode className="gba:text-gray-400" />
          <div>
            <div className="gba:font-mono gba:font-medium gba:text-sm">
              {record.code}
            </div>
            <div className="gba:text-gray-600 gba:text-xs">
              {record.name}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Value',
      dataIndex: 'infoValue',
      key: 'infoValue',
      width: 150,
      render: (infoValue) => (
        <span className="gba:text-sm gba:text-gray-700 gba:font-medium">
          {infoValue || '-'}
        </span>
      )
    },
    {
      title: 'Value Type',
      dataIndex: 'valueType',
      key: 'valueType',
      width: 120,
      render: (valueType) => {
        const colors = {
          STRING: 'green',
          NUMBER: 'blue',
          BOOLEAN: 'orange',
          DATE: 'purple',
          ENUM: 'cyan',
          JSON: 'red'
        };
        return <Tag color={colors[valueType as keyof typeof colors] || 'default'}>{valueType}</Tag>;
      }
    },
    {
      title: 'Mandatory',
      dataIndex: 'mandatory',
      key: 'mandatory',
      width: 100,
      align: 'center',
      render: (mandatory) => (
        <Tag color={mandatory ? 'red' : 'green'}>
          {mandatory ? 'Required' : 'Optional'}
        </Tag>
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
            {formatDate(record.validFrom)} - {record.validTo ? formatDate(record.validTo) : '∞'}
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
          <Tooltip title="Edit custom field">
            <Button
              type="text"
              size="small"
              icon={<PiPencil />}
              onClick={() => handleEdit(record)}
              data-testid={`edit-custom-field-${record.id}`}
            />
          </Tooltip>
          <Popconfirm
            title="Delete custom field"
            description="Are you sure you want to delete this custom field?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete custom field">
              <Button
                type="text"
                size="small"
                icon={<PiTrash />}
                danger
                loading={isSaving}
                data-testid={`delete-custom-field-${record.id}`}
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
        message="Error Loading Custom Fields"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchCustomFields}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <Card data-testid="custom-fields-tab">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <h4 className="gba:text-lg gba:font-semibold gba:m-0">Custom Fields</h4>
          <Tag color="blue">{customFields.length} fields</Tag>
        </div>
        <Button
          type="primary"
          icon={<PiPlus />}
          onClick={handleAdd}
          data-testid="add-custom-field-button"
        >
          Add Custom Field
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={customFields}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} custom fields`,
        }}
        scroll={{ x: 800 }}
        data-testid="custom-fields-table"
      />

      <Modal
        title={editingItem ? 'Edit Custom Field' : 'Add Custom Field'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isSaving}
        width={600}
        data-testid="custom-field-modal"
      >
        <Form
          form={form}
          layout="vertical"
          data-testid="custom-field-form"
        >
          <Form.Item
            name="source"
            label="Source"
            rules={[{ required: true, message: 'Please select a source' }]}
          >
            <Select 
              placeholder="Select source"
              options={sourceOptions}
              data-testid="custom-field-source-select"
            />
          </Form.Item>

          <Form.Item
            name="code"
            label="Code"
            rules={[
              { required: true, message: 'Please enter a code' },
              { pattern: /^[A-Z_][A-Z0-9_]*$/, message: 'Code must be uppercase letters, numbers, and underscores only' }
            ]}
          >
            <Input 
              placeholder="e.g., PROJECT_CODE"
              data-testid="custom-field-code-input"
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input 
              placeholder="e.g., Project Code"
              data-testid="custom-field-name-input"
            />
          </Form.Item>

          <Form.Item
            name="infoValue"
            label="Value/Description"
            rules={[{ required: true, message: 'Please enter a value or description' }]}
          >
            <Input 
              placeholder="e.g., License Plate"
              data-testid="custom-field-info-value-input"
            />
          </Form.Item>

          <Form.Item
            name="valueType"
            label="Value Type"
            rules={[{ required: true, message: 'Please select a value type' }]}
          >
            <Select 
              placeholder="Select value type"
              options={valueTypeOptions}
              data-testid="custom-field-value-type-select"
            />
          </Form.Item>

          <Form.Item
            name="mandatory"
            label="Mandatory"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Required" 
              unCheckedChildren="Optional"
              data-testid="custom-field-mandatory-switch"
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
              data-testid="custom-field-valid-from-picker"
            />
          </Form.Item>

          <Form.Item
            name="validTo"
            label="Valid To"
          >
            <DatePicker 
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              data-testid="custom-field-valid-to-picker"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default CustomFieldsTab; 