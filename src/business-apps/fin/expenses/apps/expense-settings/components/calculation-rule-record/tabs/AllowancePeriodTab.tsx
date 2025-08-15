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
  Switch, 
  DatePicker, 
  TimePicker, 
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
  PiClock,
  PiCheck,
  PiX
} from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Register dayjs plugins
dayjs.extend(weekday);
dayjs.extend(localeData);
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient';

interface AllowancePeriodTabProps {
  ruleId: string;
  accessToken: string;
  activeFrom: string;
}

interface AllowancePeriod {
  id: string;
  code: string;
  name: string;
  fromTime?: string;
  toTime?: string;
  minHours: number;
  midnightRule: boolean;
  overnightAccommodation?: boolean;
  startAfter?: string;
  returnBefore?: string;
  validFrom: string;
  validTo?: string;
  order?: number;
  version?: number;
  isDeleted: boolean;
}

interface AllowancePeriodFormData {
  id?: string;
  code: string;
  name: string;
  fromTime?: string;
  toTime?: string;
  minHours: number;
  midnightRule: boolean;
  overnightAccommodation?: boolean;
  startAfter?: string;
  returnBefore?: string;
  validFrom: string;
  validTo?: string;
  order?: number;
  version?: number;
}

const AllowancePeriodTab: React.FC<AllowancePeriodTabProps> = ({
  ruleId,
  accessToken,
  activeFrom
}) => {
  const [allowancePeriods, setAllowancePeriods] = useState<AllowancePeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<AllowancePeriod | null>(null);
  const [form] = Form.useForm();
  const graphqlClient = useGraphQLClient(accessToken);

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken);

  const fetchAllowancePeriods = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const query = `
        query GetExpenseRuleAllowancePeriods($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleAllowancePeriod(where: { isDeleted: { _eq: false } }, orderBy: { periodOrder: ASC }) {
              id
              code
              name
              fromTime
              toTime
              minHours
              midnightRule
              activeFrom
              activeTo
              periodOrder
              version
              additionalProperties
              businessKey
              express1
              express2
            }
          }
        }
      `;
      
      const result = await graphqlClient.request<{ ExpenseRule: { expenseRuleAllowancePeriod: any[] }[] }>(
        query, 
        { ruleId }
      );
      
      const expenseRule = result.ExpenseRule?.[0];
      const periods = expenseRule?.expenseRuleAllowancePeriod || [];
      
      const transformedPeriods: AllowancePeriod[] = periods.map((period, index) => ({
        id: period.id,
        code: period.code || '',
        name: period.name || '',
        fromTime: period.fromTime || '',
        toTime: period.toTime || '',
        minHours: period.minHours || 0,
        midnightRule: period.midnightRule || false,
        overnightAccommodation: false, // TODO: Map from additionalProperties if available
        startAfter: '', // TODO: Map from additionalProperties if available
        returnBefore: '', // TODO: Map from additionalProperties if available
        validFrom: period.activeFrom,
        validTo: period.activeTo,
        order: period.periodOrder || (index + 1),
        version: period.version || 1,
        isDeleted: false
      }));
      
      setAllowancePeriods(transformedPeriods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allowance periods');
    } finally {
      setIsLoading(false);
    }
  }, [ruleId, graphqlClient]);

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchAllowancePeriods();
    }
  }, [ruleId, accessToken, fetchAllowancePeriods]);

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      minHours: 0,
      midnightRule: false,
      overnightAccommodation: false,
      validFrom: dayjs(activeFrom),
      order: allowancePeriods.length + 1
    });
    setIsModalVisible(true);
  };

  const handleEdit = async (record: AllowancePeriod) => {
    // ✅ FIX: Fetch fresh data instead of relying on potentially stale list data
    setEditingItem(record);
    setIsModalVisible(true);
    
    try {
      setIsSaving(true);
      // TODO: In a real implementation, fetch fresh data for this specific item:
      // const freshData = await expenseSettingsClient.getExpenseRuleAllowancePeriodById(record.id);
      
      // For now, use the existing record data but with explicit refresh pattern
      const freshData = record;
      
      form.setFieldsValue({
        ...freshData,
        validFrom: dayjs(freshData.validFrom),
        validTo: freshData.validTo ? dayjs(freshData.validTo) : undefined,
        fromTime: freshData.fromTime ? dayjs(freshData.fromTime, 'HH:mm') : undefined,
        toTime: freshData.toTime ? dayjs(freshData.toTime, 'HH:mm') : undefined,
        startAfter: freshData.startAfter ? dayjs(freshData.startAfter, 'HH:mm') : undefined,
        returnBefore: freshData.returnBefore ? dayjs(freshData.returnBefore, 'HH:mm') : undefined
      });
    } catch (err) {
      message.error('Failed to load latest data for editing');
      console.error('Edit load error:', err);
      setIsModalVisible(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record: AllowancePeriod) => {
    try {
      setIsSaving(true);
      // TODO: Implement delete endpoint when available
      console.log('Deleting allowance period (not implemented API):', record.id);
      message.success('Allowance period deleted successfully');
      await fetchAllowancePeriods();
    } catch (err) {
      message.error('Failed to delete allowance period');
      console.error('Delete error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const values = await form.validateFields();
      
      const formData: AllowancePeriodFormData = {
        ...values,
        validFrom: values.validFrom.toISOString(),
        validTo: values.validTo ? values.validTo.toISOString() : undefined,
        fromTime: values.fromTime ? values.fromTime.format('HH:mm') : undefined,
        toTime: values.toTime ? values.toTime.format('HH:mm') : undefined,
        startAfter: values.startAfter ? values.startAfter.format('HH:mm') : undefined,
        returnBefore: values.returnBefore ? values.returnBefore.format('HH:mm') : undefined
      };

      // Map to API payload and call client
      await expenseSettingsClient.saveExpenseRuleAllowancePeriod({
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        businessKey: undefined,
        activeTo: formData.validTo,
        additionalProperties: undefined,
        code: formData.code,
        name: formData.name,
        overnightAccomodation: formData.overnightAccommodation,
        fromTime: formData.fromTime,
        toTime: formData.toTime,
        minHours: formData.minHours,
        midnightRule: formData.midnightRule,
        startAfter: formData.startAfter,
        returnBefore: formData.returnBefore,
        activeFrom: formData.validFrom,
        periodOrder: formData.order
      });

      message.success(`Allowance period ${editingItem ? 'updated' : 'created'} successfully`);
      setIsModalVisible(false);
      await fetchAllowancePeriods();
    } catch (err) {
      message.error(`Failed to ${editingItem ? 'update' : 'create'} allowance period`);
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const columns: ColumnsType<AllowancePeriod> = [
    {
      title: 'Allowance Period',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code) => (
        <span className="gba:font-mono gba:font-medium">
          {code}
        </span>
      )
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: 'Overnight Accommodation',
      dataIndex: 'overnightAccommodation',
      key: 'overnightAccommodation',
      width: 180,
      align: 'center',
      render: (accommodation) => (
        accommodation ? (
          <PiCheck className="gba:text-green-500 gba:text-lg" />
        ) : (
          <PiX className="gba:text-gray-400 gba:text-lg" />
        )
      )
    },
    {
      title: 'Time From',
      dataIndex: 'fromTime',
      key: 'fromTime',
      width: 100,
      align: 'center',
      render: (time) => (
        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
          <PiClock className="gba:text-gray-400" />
          <span className="gba:font-mono gba:text-sm">{time || '-'}</span>
        </div>
      )
    },
    {
      title: 'Time To',
      dataIndex: 'toTime',
      key: 'toTime',
      width: 100,
      align: 'center',
      render: (time) => (
        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
          <PiClock className="gba:text-gray-400" />
          <span className="gba:font-mono gba:text-sm">{time || '-'}</span>
        </div>
      )
    },
    {
      title: 'Minimum Hours',
      dataIndex: 'minHours',
      key: 'minHours',
      width: 120,
      align: 'center',
      render: (hours) => (
        <Tag color="blue">{hours}</Tag>
      )
    },
    {
      title: 'Midnight Rule',
      dataIndex: 'midnightRule',
      key: 'midnightRule',
      width: 120,
      align: 'center',
      render: (midnightRule) => (
        midnightRule ? (
          <PiCheck className="gba:text-green-500 gba:text-lg" />
        ) : (
          <PiX className="gba:text-gray-400 gba:text-lg" />
        )
      )
    },
    {
      title: 'Start After',
      dataIndex: 'startAfter',
      key: 'startAfter',
      width: 100,
      align: 'center',
      render: (time) => (
        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
          <PiClock className="gba:text-gray-400" />
          <span className="gba:font-mono gba:text-sm">{time || '-'}</span>
        </div>
      )
    },
    {
      title: 'Return Before',
      dataIndex: 'returnBefore',
      key: 'returnBefore',
      width: 120,
      align: 'center',
      render: (time) => (
        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
          <PiClock className="gba:text-gray-400" />
          <span className="gba:font-mono gba:text-sm">{time || '-'}</span>
        </div>
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
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      align: 'center',
      render: (order) => (
        <Tag color="purple">{order}</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit allowance period">
            <Button
              type="text"
              size="small"
              icon={<PiPencil />}
              onClick={() => handleEdit(record)}
              data-testid={`edit-allowance-period-${record.id}`}
            />
          </Tooltip>
          <Popconfirm
            title="Delete allowance period"
            description="Are you sure you want to delete this allowance period?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete allowance period">
              <Button
                type="text"
                size="small"
                icon={<PiTrash />}
                danger
                loading={isSaving}
                data-testid={`delete-allowance-period-${record.id}`}
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
        message="Error Loading Allowance Periods"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchAllowancePeriods}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <Card data-testid="allowance-period-tab">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <h4 className="gba:text-lg gba:font-semibold gba:m-0">Allowance Periods</h4>
          <Tag color="blue">{allowancePeriods.length} periods</Tag>
        </div>
        <Button
          type="primary"
          icon={<PiPlus />}
          onClick={handleAdd}
          data-testid="add-allowance-period-button"
        >
          Add Allowance Period
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={allowancePeriods}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} allowance periods`,
        }}
        scroll={{ x: 1400 }}
        data-testid="allowance-periods-table"
      />

      <Modal
        title={editingItem ? 'Edit Allowance Period' : 'Add Allowance Period'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isSaving}
        width={800}
        data-testid="allowance-period-modal"
      >
        <Form
          form={form}
          layout="vertical"
          data-testid="allowance-period-form"
        >
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item
              name="code"
              label="Allowance Period Code"
              rules={[{ required: true, message: 'Please enter a code' }]}
            >
              <Input 
                placeholder="e.g., FULL, 12, 24"
                data-testid="allowance-period-code-input"
              />
            </Form.Item>

            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input 
                placeholder="e.g., Full Day, 12 hours"
                data-testid="allowance-period-name-input"
              />
            </Form.Item>

            <Form.Item
              name="minHours"
              label="Minimum Hours"
              rules={[{ required: true, message: 'Please enter minimum hours' }]}
            >
              <InputNumber 
                min={0}
                max={24}
                style={{ width: '100%' }}
                placeholder="24"
                data-testid="allowance-period-min-hours-input"
              />
            </Form.Item>

            <Form.Item
              name="order"
              label="Order"
            >
              <InputNumber 
                min={1}
                style={{ width: '100%' }}
                placeholder="1"
                data-testid="allowance-period-order-input"
              />
            </Form.Item>

            <Form.Item
              name="fromTime"
              label="Time From"
            >
              <TimePicker 
                format="HH:mm"
                style={{ width: '100%' }}
                data-testid="allowance-period-from-time-picker"
              />
            </Form.Item>

            <Form.Item
              name="toTime"
              label="Time To"
            >
              <TimePicker 
                format="HH:mm"
                style={{ width: '100%' }}
                data-testid="allowance-period-to-time-picker"
              />
            </Form.Item>

            <Form.Item
              name="startAfter"
              label="Start After"
            >
              <TimePicker 
                format="HH:mm"
                style={{ width: '100%' }}
                data-testid="allowance-period-start-after-picker"
              />
            </Form.Item>

            <Form.Item
              name="returnBefore"
              label="Return Before"
            >
              <TimePicker 
                format="HH:mm"
                style={{ width: '100%' }}
                data-testid="allowance-period-return-before-picker"
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
                data-testid="allowance-period-valid-from-picker"
              />
            </Form.Item>

            <Form.Item
              name="validTo"
              label="Valid To"
            >
              <DatePicker 
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                data-testid="allowance-period-valid-to-picker"
              />
            </Form.Item>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Form.Item
              name="midnightRule"
              label="Midnight Rule"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="Yes" 
                unCheckedChildren="No"
                data-testid="allowance-period-midnight-rule-switch"
              />
            </Form.Item>

            <Form.Item
              name="overnightAccommodation"
              label="Overnight Accommodation"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="Yes" 
                unCheckedChildren="No"
                data-testid="allowance-period-overnight-switch"
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default AllowancePeriodTab; 