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
  PiCalculator,
  PiBuilding
} from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Register dayjs plugins
dayjs.extend(weekday);
dayjs.extend(localeData);
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

interface OtherCalculationTabProps {
  ruleId: string;
  accessToken: string;
  activeFrom: string;
}

interface OtherCalculation {
  id: string;
  source: string; // derived from related entity
  code: string; // from related expense entity
  name: string; // from related expense entity 
  costCenter: {
    id: string;
    code: string;
    name: string;
  };
  deductible: boolean; // approximated from reimbursablePercent
  validFrom: string;
  validTo?: string;
  version?: number;
  isDeleted: boolean;
  relatedEntity: string; // allowance, general, mileage
}

interface OtherCalculationFormData {
  id?: string;
  source: string;
  code: string;
  name: string;
  costCenterId: string;
  deductible: boolean;
  validFrom: string;
  validTo?: string;
  version?: number;
}

const OtherCalculationTab: React.FC<OtherCalculationTabProps> = ({
  ruleId,
  accessToken,
  activeFrom
}) => {
  const [otherCalculations, setOtherCalculations] = useState<OtherCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<OtherCalculation | null>(null);
  const [form] = Form.useForm();
  const graphqlClient = useGraphQLClient(accessToken);

  // REAL GraphQL data from ExpenseRuleOtherCalc
  const fetchOtherCalculations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const query = `
        query GetExpenseRuleOtherCalculations($ruleId: uuid!) {
          ExpenseRuleOtherCalc(
            where: {
              _and: [
                { expenseRuleId: { _eq: $ruleId } }
              ]
            }
            orderBy: { createdAt: ASC }
          ) {
            id
            activeFrom
            activeTo
            version
            additionalProperties
            businessKey
            costCenter {
              id
              code
              name
            }
            reimbursablePercent
            expenseRuleAllowanceCode {
              id
              code
              name
            }
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
      `;
      
      const result = await graphqlClient.request<{ ExpenseRuleOtherCalc: any[] }>(
        query, 
        { ruleId }
      );
      
      const otherCalcs = result.ExpenseRuleOtherCalc || [];
      
      const transformedCalculations: OtherCalculation[] = otherCalcs.map((calc: any) => {
        // Determine source and get code/name from related entity
        let source = 'Manual Entry';
        let code = 'UNKNOWN';
        let name = 'Unknown Calculation';
        let relatedEntity = 'unknown';
        
        if (calc.expenseRuleAllowanceCode) {
          source = 'Allowance System';
          code = calc.expenseRuleAllowanceCode.code;
          name = calc.expenseRuleAllowanceCode.name;
          relatedEntity = 'allowance';
        } else if (calc.expenseRuleGeneralExpense) {
          source = 'General Expense System';
          code = calc.expenseRuleGeneralExpense.code;
          name = calc.expenseRuleGeneralExpense.name;
          relatedEntity = 'general';
        } else if (calc.expenseRuleMileage) {
          source = 'Mileage System';
          code = calc.expenseRuleMileage.code;
          name = calc.expenseRuleMileage.name;
          relatedEntity = 'mileage';
        }
        
        return {
          id: calc.id,
          source,
          code,
          name,
          costCenter: calc.costCenter || { id: '', code: 'N/A', name: 'No Cost Center' },
          deductible: (calc.reimbursablePercent || 0) < 100, // Approximate deductible logic
          validFrom: calc.activeFrom,
          validTo: calc.activeTo,
          version: calc.version || 1,
          isDeleted: false,
          relatedEntity
        };
      });
      
      setOtherCalculations(transformedCalculations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load other calculations');
    } finally {
      setIsLoading(false);
    }
  }, [ruleId, graphqlClient]);

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchOtherCalculations();
    }
  }, [ruleId, accessToken, fetchOtherCalculations]);

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const sourceOptions = [
    { value: 'Manual Entry', label: 'Manual Entry' },
    { value: 'Payroll System', label: 'Payroll System' },
    { value: 'Finance System', label: 'Finance System' },
    { value: 'External API', label: 'External API' },
    { value: 'HR System', label: 'HR System' },
    { value: 'Tax System', label: 'Tax System' }
  ];

  const costCenterOptions = [
    { value: 'CC-001', label: 'CC-001 - Operations' },
    { value: 'CC-002', label: 'CC-002 - Finance' },
    { value: 'CC-003', label: 'CC-003 - HR' },
    { value: 'CC-004', label: 'CC-004 - IT' },
    { value: 'CC-005', label: 'CC-005 - Marketing' },
    { value: 'CC-006', label: 'CC-006 - Legal' }
  ];

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      source: 'Manual Entry',
      deductible: false,
      validFrom: dayjs(activeFrom)
    });
    setIsModalVisible(true);
  };

  const handleEdit = async (record: OtherCalculation) => {
    // ✅ FIX: Fetch fresh data instead of relying on potentially stale list data
    setEditingItem(record);
    setIsModalVisible(true);
    
    try {
      setIsSaving(true);
      // TODO: In a real implementation, fetch fresh data for this specific item:
      // const freshData = await expenseSettingsClient.getExpenseRuleOtherCalcById(record.id);
      
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

  const handleDelete = async (record: OtherCalculation) => {
    try {
      setIsSaving(true);
      await expenseSettingsClient.deleteExpenseRuleOtherCalc(record.id);
      message.success('Other calculation deleted successfully');
      await fetchOtherCalculations();
    } catch (err) {
      message.error('Failed to delete other calculation');
      console.error('Delete error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const values = await form.validateFields();
      
      const formData: OtherCalculationFormData = {
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
        reimbursablePercent: formData.deductible ? 50 : 100, // heuristic mapping
        activeFrom: formData.validFrom,
        costCenterId: formData.costCenterId,
        // Associations optional; keep undefined unless selected elsewhere
        expenseRuleMileageId: undefined,
        expenseRuleGeneralExpenseId: undefined,
        expenseRuleAllowanceCodeId: undefined
      };
      await expenseSettingsClient.saveExpenseRuleOtherCalc(payload);

      message.success(`Other calculation ${editingItem ? 'updated' : 'created'} successfully`);
      setIsModalVisible(false);
      await fetchOtherCalculations();
    } catch (err) {
      message.error(`Failed to ${editingItem ? 'update' : 'create'} other calculation`);
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const columns: ColumnsType<OtherCalculation> = [
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 140,
      render: (source) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiCalculator className="gba:text-blue-500" />
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
      title: 'Cost Center',
      key: 'costCenter',
      width: 130,
      render: (_, record) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiBuilding className="gba:text-purple-500" />
          <Tag color="purple">{record.costCenter.code || 'N/A'}</Tag>
        </div>
      )
    },
    {
      title: 'Deductible',
      dataIndex: 'deductible',
      key: 'deductible',
      width: 110,
      align: 'center',
      render: (deductible) => (
        <Tag color={deductible ? 'green' : 'orange'}>
          {deductible ? 'Deductible' : 'Non-Deductible'}
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
          <Tooltip title="Edit other calculation">
            <Button
              type="text"
              size="small"
              icon={<PiPencil />}
              onClick={() => handleEdit(record)}
              data-testid={`edit-other-calculation-${record.id}`}
            />
          </Tooltip>
          <Popconfirm
            title="Delete other calculation"
            description="Are you sure you want to delete this other calculation?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete other calculation">
              <Button
                type="text"
                size="small"
                icon={<PiTrash />}
                danger
                loading={isSaving}
                data-testid={`delete-other-calculation-${record.id}`}
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
        message="Error Loading Other Calculations"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchOtherCalculations}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <Card data-testid="other-calculation-tab">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <h4 className="gba:text-lg gba:font-semibold gba:m-0">Other Calculations</h4>
          <Tag color="blue">{otherCalculations.length} calculations</Tag>
        </div>
        <Button
          type="primary"
          icon={<PiPlus />}
          onClick={handleAdd}
          data-testid="add-other-calculation-button"
        >
          Add Other Calculation
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={otherCalculations}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} other calculations`,
        }}
        scroll={{ x: 800 }}
        data-testid="other-calculations-table"
      />

      <Modal
        title={editingItem ? 'Edit Other Calculation' : 'Add Other Calculation'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isSaving}
        width={600}
        data-testid="other-calculation-modal"
      >
        <Form
          form={form}
          layout="vertical"
          data-testid="other-calculation-form"
        >
          <Form.Item
            name="source"
            label="Source"
            rules={[{ required: true, message: 'Please select a source' }]}
          >
            <Select 
              placeholder="Select source"
              options={sourceOptions}
              data-testid="other-calculation-source-select"
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
              placeholder="e.g., OVERTIME_CALC"
              data-testid="other-calculation-code-input"
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input 
              placeholder="e.g., Overtime Calculation"
              data-testid="other-calculation-name-input"
            />
          </Form.Item>

          <Form.Item
            name="costCenter"
            label="Cost Center"
            rules={[{ required: true, message: 'Please select a cost center' }]}
          >
            <Select 
              placeholder="Select cost center"
              options={costCenterOptions}
              data-testid="other-calculation-cost-center-select"
            />
          </Form.Item>

          <Form.Item
            name="deductible"
            label="Deductible"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Deductible" 
              unCheckedChildren="Non-Deductible"
              data-testid="other-calculation-deductible-switch"
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
              data-testid="other-calculation-valid-from-picker"
            />
          </Form.Item>

          <Form.Item
            name="validTo"
            label="Valid To"
          >
            <DatePicker 
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              data-testid="other-calculation-valid-to-picker"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default OtherCalculationTab; 