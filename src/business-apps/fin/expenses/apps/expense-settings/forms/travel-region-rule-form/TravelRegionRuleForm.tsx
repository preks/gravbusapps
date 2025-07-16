import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Button, 
  Space, 
  Alert, 
  Typography, 
  Card,
  Row,
  Col,
  Spin,
  Table,
  InputNumber,
  Popconfirm
} from 'antd';
import { ColumnsType } from 'antd/es/table';
import { PiFloppyDisk, PiX, PiWarning, PiPlus, PiTrash } from 'react-icons/pi';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export interface TravelRegionRuleDetailFormData {
  id?: string;
  amount: number;
  countryRef?: string;
  currencyRef?: string;
  activeFrom?: string;
  activeTo?: string;
}

export interface TravelRegionRuleFormData {
  id?: string;
  code: string;
  name: string;
  ruleOrder: number;
  activeFrom?: string;
  activeTo?: string;
  businessKey?: string;
  details: TravelRegionRuleDetailFormData[];
}

interface TravelRegionRuleFormProps extends BusinessAppContextProps {
  initialData?: TravelRegionRuleFormData;
  isEditing?: boolean;
  onSave: (data: TravelRegionRuleFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface CatalogOption {
  id: string;
  value: string;
  code?: string;
}

const TravelRegionRuleForm: React.FC<TravelRegionRuleFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  loading = false,
  accessToken,
  ...context
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<TravelRegionRuleDetailFormData[]>([]);
  
  // Catalog data
  const [countries, setCountries] = useState<CatalogOption[]>([]);
  const [currencies, setCurrencies] = useState<CatalogOption[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);

  const catalogClient = useCatalogManagerClient(accessToken);

  // Load catalog data
  const loadCatalogData = useCallback(async () => {
    setCatalogsLoading(true);
    try {
      const [countriesRes, currenciesRes] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          { limit: 200, offset: 0, returnTotalRecords: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Currency', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        )
      ]);

      setCountries(countriesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      })));

      setCurrencies(currenciesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      })));
    } catch (err) {
      console.error('Error loading catalog data:', err);
      setError('Failed to load catalog data');
    } finally {
      setCatalogsLoading(false);
    }
  }, [catalogClient]);

  useEffect(() => {
    if (accessToken) {
      loadCatalogData();
    }
  }, [accessToken, loadCatalogData]);

  // Initialize form with data
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        ...initialData,
        activeFrom: initialData.activeFrom ? dayjs(initialData.activeFrom) : null,
        activeTo: initialData.activeTo ? dayjs(initialData.activeTo) : null,
      });
      setDetails(initialData.details || []);
    } else {
      // Set default values for new rule
      form.setFieldsValue({
        ruleOrder: 1,
        activeFrom: dayjs(),
      });
      setDetails([]);
    }
  }, [initialData, form]);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (details.length === 0) {
        setError('At least one allowance detail is required');
        return;
      }

      const formData: TravelRegionRuleFormData = {
        ...values,
        activeFrom: values.activeFrom?.toISOString(),
        activeTo: values.activeTo?.toISOString(),
        details: details,
        id: initialData?.id
      };

      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save travel region rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setDetails([]);
    onCancel();
  };

  // Detail management functions
  const addDetail = () => {
    const newDetail: TravelRegionRuleDetailFormData = {
      amount: 0,
      activeFrom: dayjs().toISOString(),
    };
    setDetails([...details, newDetail]);
  };

  const updateDetail = (index: number, field: keyof TravelRegionRuleDetailFormData, value: any) => {
    const updatedDetails = [...details];
    updatedDetails[index] = { ...updatedDetails[index], [field]: value };
    setDetails(updatedDetails);
  };

  const removeDetail = (index: number) => {
    const updatedDetails = details.filter((_, i) => i !== index);
    setDetails(updatedDetails);
  };

  // Table columns for details
  const detailColumns: ColumnsType<TravelRegionRuleDetailFormData> = [
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (value: number, record: TravelRegionRuleDetailFormData, index: number) => (
        <InputNumber
          min={0}
          step={0.01}
          value={value}
          onChange={(val) => updateDetail(index, 'amount', val || 0)}
          size="small"
          placeholder="0.00"
          data-testid={`travel-region-detail-amount-${index}`}
        />
      ),
    },
    {
      title: 'Country',
      dataIndex: 'countryRef',
      key: 'countryRef',
      width: 200,
      render: (value: string, record: TravelRegionRuleDetailFormData, index: number) => (
        <Select
          value={value}
          onChange={(val) => updateDetail(index, 'countryRef', val)}
          placeholder="Select country"
          showSearch
          allowClear
          optionFilterProp="children"
          size="small"
          style={{ width: '100%' }}
          data-testid={`travel-region-detail-country-${index}`}
        >
          {countries.map(country => (
            <Option key={country.id} value={country.id}>
              {country.value} {country.code && `(${country.code})`}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Currency',
      dataIndex: 'currencyRef',
      key: 'currencyRef',
      width: 150,
      render: (value: string, record: TravelRegionRuleDetailFormData, index: number) => (
        <Select
          value={value}
          onChange={(val) => updateDetail(index, 'currencyRef', val)}
          placeholder="Select currency"
          showSearch
          allowClear
          optionFilterProp="children"
          size="small"
          style={{ width: '100%' }}
          data-testid={`travel-region-detail-currency-${index}`}
        >
          {currencies.map(currency => (
            <Option key={currency.id} value={currency.id}>
              {currency.value} {currency.code && `(${currency.code})`}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Active From',
      dataIndex: 'activeFrom',
      key: 'activeFrom',
      width: 150,
      render: (value: string, record: TravelRegionRuleDetailFormData, index: number) => (
        <DatePicker
          value={value ? dayjs(value) : null}
          onChange={(date) => updateDetail(index, 'activeFrom', date?.toISOString())}
          size="small"
          format="YYYY-MM-DD"
          data-testid={`travel-region-detail-active-from-${index}`}
        />
      ),
    },
    {
      title: 'Active To',
      dataIndex: 'activeTo',
      key: 'activeTo',
      width: 150,
      render: (value: string, record: TravelRegionRuleDetailFormData, index: number) => (
        <DatePicker
          value={value ? dayjs(value) : null}
          onChange={(date) => updateDetail(index, 'activeTo', date?.toISOString())}
          size="small"
          format="YYYY-MM-DD"
          allowClear
          data-testid={`travel-region-detail-active-to-${index}`}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record: TravelRegionRuleDetailFormData, index: number) => (
        <Popconfirm
          title="Delete Detail"
          description="Are you sure you want to delete this allowance detail?"
          onConfirm={() => removeDetail(index)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            type="text"
            danger
            icon={<PiTrash />}
            size="small"
            data-testid={`travel-region-detail-delete-${index}`}
          />
        </Popconfirm>
      ),
    },
  ];

  if (catalogsLoading) {
    return (
      <div 
        data-testid="travel-region-rule-form-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-96"
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div data-testid="travel-region-rule-form-container">
      <Card
        title={
          <Title level={4} style={{ margin: 0 }}>
            {isEditing ? 'Edit Travel Region Rule' : 'Create New Travel Region Rule'}
          </Title>
        }
        data-testid="travel-region-rule-form-card"
      >
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            icon={<PiWarning />}
            style={{ marginBottom: 16 }}
            data-testid="travel-region-rule-form-error"
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          data-testid="travel-region-rule-form"
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="code"
                label="Rule Code"
                rules={[
                  { required: true, message: 'Rule code is required' },
                  { max: 50, message: 'Rule code cannot exceed 50 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter rule code (e.g., TR_001)"
                  data-testid="travel-region-rule-form-code-input"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="name"
                label="Rule Name"
                rules={[
                  { required: true, message: 'Rule name is required' },
                  { max: 100, message: 'Rule name cannot exceed 100 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter rule name"
                  data-testid="travel-region-rule-form-name-input"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="ruleOrder"
                label="Rule Order"
                rules={[
                  { required: true, message: 'Rule order is required' }
                ]}
              >
                <InputNumber 
                  min={1}
                  placeholder="Enter order"
                  style={{ width: '100%' }}
                  data-testid="travel-region-rule-form-rule-order-input"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="activeFrom"
                label="Active From"
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  placeholder="Select start date (optional)"
                  data-testid="travel-region-rule-form-active-from-picker"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="activeTo"
                label="Active To"
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  placeholder="Select end date (optional)"
                  data-testid="travel-region-rule-form-active-to-picker"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="businessKey"
            label="Business Key"
          >
            <Input 
              placeholder="Enter business key (optional)"
              data-testid="travel-region-rule-form-business-key-input"
            />
          </Form.Item>

          {/* Allowance Details Section */}
          <Card
            title="Allowance Region Details"
            size="small"
            style={{ marginTop: 16 }}
            extra={
              <Button
                type="primary"
                icon={<PiPlus />}
                size="small"
                onClick={addDetail}
                data-testid="travel-region-rule-form-add-detail-button"
              >
                Add Detail
              </Button>
            }
          >
            <Table
              columns={detailColumns}
              dataSource={details}
              rowKey={(record, index) => `detail-${index}`}
              pagination={false}
              size="small"
              locale={{ emptyText: 'No allowance details added yet' }}
              scroll={{ x: 800 }}
              data-testid="travel-region-rule-form-details-table"
            />
          </Card>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                icon={<PiFloppyDisk />}
                data-testid="travel-region-rule-form-save-button"
              >
                {isEditing ? 'Update Rule' : 'Create Rule'}
              </Button>
              <Button
                onClick={handleCancel}
                icon={<PiX />}
                data-testid="travel-region-rule-form-cancel-button"
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default TravelRegionRuleForm; 