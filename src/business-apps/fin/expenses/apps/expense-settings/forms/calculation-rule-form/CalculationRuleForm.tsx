import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { expenseSettingsClient } from '../../utils/ExpenseSettingsClient';
import { useGetExpenseRuleById } from '../../queries/ExpenseRuleQueries';
import { 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Switch, 
  Button, 
  Space, 
  Alert, 
  Typography, 
  Card,
  Row,
  Col,
  Spin
} from 'antd';
import { PiFloppyDisk, PiX, PiWarning } from 'react-icons/pi';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Register dayjs plugins
dayjs.extend(weekday);
dayjs.extend(localeData);

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export interface CalculationRuleFormData {
  id?: string;
  code: string;
  name?: string;
  description?: string;
  standard?: boolean;
  activeFrom: string;
  activeTo?: string;
  deductionLimit: boolean;
  useLastCountry?: boolean;
  useSingleCurrency?: boolean;
  taxesCode?: string;
  nonpayableCode?: string;
  advancePaymentCode?: string;
  calculationTypeRef?: string;
  countryRef?: string;
  currencyRef?: string;
  version?: number;
}

interface CalculationRuleFormProps extends BusinessAppContextProps {
  initialData?: CalculationRuleFormData;
  isEditing?: boolean;
  onSave: (data: CalculationRuleFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface CatalogOption {
  id: string;
  value: string;
  code?: string;
}

const CalculationRuleForm: React.FC<CalculationRuleFormProps> = ({
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
  
  // ✅ NEW: Hook for fetching fresh calculation rule data
  const { fetchExpenseRuleById } = useGetExpenseRuleById({ accessToken, ...context } as BusinessAppContextProps);
  
  // Catalog data
  const [calculationTypes, setCalculationTypes] = useState<CatalogOption[]>([]);
  const [countries, setCountries] = useState<CatalogOption[]>([]);
  const [currencies, setCurrencies] = useState<CatalogOption[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);

  const catalogClient = useCatalogManagerClient(accessToken);

  // Set access token on the expense settings client
  useEffect(() => {
    if (accessToken) {
      expenseSettingsClient.setAccessToken(accessToken);
    }
  }, [accessToken]);

  // Load catalog data
  const loadCatalogData = useCallback(async () => {
    setCatalogsLoading(true);
    try {
      const [calculationTypesRes, countriesRes, currenciesRes] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'ExpenseCalculationType', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          { limit: 500, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Currency', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        )
      ]);

      setCalculationTypes(calculationTypesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      })));

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

  // ✅ FIXED: Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // ✅ NEW: For editing, fetch fresh data from the server
        console.log('🔄 CalculationRuleForm: Fetching FRESH data for ID:', initialData.id);
        try {
          const freshData = await fetchExpenseRuleById(initialData.id);
          if (freshData) {
            console.log('✅ CalculationRuleForm: Using FRESH data from API:', freshData);
            form.setFieldsValue({
              code: freshData.code,
              name: freshData.name,
              description: freshData.name, // Use name as description fallback
              standard: freshData.standard,
              activeFrom: freshData.activeFrom ? dayjs(freshData.activeFrom) : null,
              activeTo: freshData.activeTo ? dayjs(freshData.activeTo) : null,
              deductionLimit: freshData.deductionLimit,
              useLastCountry: freshData.useLastCountry,
              useSingleCurrency: freshData.useSingleCurrency,
              taxesCode: freshData.taxesCode,
              nonpayableCode: freshData.nonpayableCode,
              advancePaymentCode: freshData.advancePaymentCode,
              calculationTypeRef: freshData.calculationType?.id,
              countryRef: freshData.country?.id,
              currencyRef: freshData.currency?.id,
            });
          }
        } catch (error) {
          console.error('❌ CalculationRuleForm: Failed to load fresh calculation rule data:', error);
          console.log('⚠️ CalculationRuleForm: Falling back to STALE list data');
          // Fallback to initial data if fresh fetch fails
          form.setFieldsValue({
            ...initialData,
            activeFrom: initialData.activeFrom ? dayjs(initialData.activeFrom) : null,
            activeTo: initialData.activeTo ? dayjs(initialData.activeTo) : null,
          });
        }
      } else if (initialData) {
        // ✅ For creating new items, use the provided initial data
        console.log('📝 CalculationRuleForm: Using initial data for NEW item:', initialData);
        form.setFieldsValue({
          ...initialData,
          activeFrom: initialData.activeFrom ? dayjs(initialData.activeFrom) : null,
          activeTo: initialData.activeTo ? dayjs(initialData.activeTo) : null,
        });
      } else {
        // Set default values for new rule
        form.setFieldsValue({
          deductionLimit: false,
          activeFrom: dayjs(),
        });
      }
    };

    loadData();
  }, [initialData?.id, isEditing, form, fetchExpenseRuleById]);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare data for the expense settings service
      console.log('CalculationRuleForm.handleSubmit - Initial data:', {
        id: initialData?.id,
        version: initialData?.version,
        versionType: typeof initialData?.version,
        hasVersion: initialData?.version !== undefined
      });

      const expenseRuleData = {
        code: values.code,
        name: values.name,
        standard: values.standard || false,
        activeFrom: values.activeFrom?.toISOString(),
        activeTo: values.activeTo?.toISOString(),
        deductionLimit: values.deductionLimit || false,
        useLastCountry: values.useLastCountry || false,
        useSingleCurrency: values.useSingleCurrency || false,
        taxesCode: values.taxesCode,
        nonpayableCode: values.nonpayableCode,
        advancePaymentCode: values.advancePaymentCode,
        calculationTypeRef: values.calculationTypeRef,
        countryRef: values.countryRef,
        currencyRef: values.currencyRef,
        ...(initialData?.id && { id: initialData.id }),
        ...(initialData?.version !== undefined && { version: initialData.version })
      };

      console.log('CalculationRuleForm.handleSubmit - Expense rule data:', expenseRuleData);

      // Save using the existing expense settings client
      const result = await expenseSettingsClient.saveCalculationRule(expenseRuleData);

      // Prepare form data for the onSave callback (for compatibility)
      const formData: CalculationRuleFormData = {
        ...values,
        activeFrom: values.activeFrom?.toISOString(),
        activeTo: values.activeTo?.toISOString(),
        id: result.expenseRule?.id || initialData?.id,
        version: result.expenseRule?.version || (initialData?.version ? initialData.version + 1 : 1)
      };

      await onSave(formData);
    } catch (err) {
      console.error('Error saving calculation rule:', err);
      setError(err instanceof Error ? err.message : 'Failed to save calculation rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  if (catalogsLoading) {
    return (
      <div 
        data-testid="calculation-rule-form-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-96"
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div data-testid="calculation-rule-form-container">
      <Card
        title={
          <Title level={4} style={{ margin: 0 }}>
            {isEditing ? 'Edit Calculation Rule' : 'Create New Calculation Rule'}
          </Title>
        }
        data-testid="calculation-rule-form-card"
      >
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            icon={<PiWarning />}
            style={{ marginBottom: 16 }}
            data-testid="calculation-rule-form-error"
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          data-testid="calculation-rule-form"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="code"
                label="Rule Code"
                rules={[
                  { required: true, message: 'Rule code is required' },
                  { max: 50, message: 'Rule code cannot exceed 50 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter rule code (e.g., CR_001)"
                  data-testid="calculation-rule-form-code-input"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Rule Name"
                rules={[
                  { max: 100, message: 'Rule name cannot exceed 100 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter rule name"
                  data-testid="calculation-rule-form-name-input"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea 
              rows={3}
              placeholder="Enter rule description"
              data-testid="calculation-rule-form-description-input"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="calculationTypeRef"
                label="Calculation Type"
                rules={[
                  { required: true, message: 'Calculation type is required' }
                ]}
              >
                <Select
                  placeholder="Select calculation type"
                  showSearch
                  optionFilterProp="children"
                  data-testid="calculation-rule-form-calculation-type-select"
                >
                  {calculationTypes.map(type => (
                    <Option key={type.id} value={type.id}>
                      {type.value}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="countryRef"
                label="Country"
              >
                <Select
                  placeholder="Select country"
                  showSearch
                  allowClear
                  optionFilterProp="children"
                  data-testid="calculation-rule-form-country-select"
                >
                  {countries.map(country => (
                    <Option key={country.id} value={country.id}>
                      {country.value} {country.code && `(${country.code})`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="currencyRef"
                label="Currency"
              >
                <Select
                  placeholder="Select currency"
                  showSearch
                  allowClear
                  optionFilterProp="children"
                  data-testid="calculation-rule-form-currency-select"
                >
                  {currencies.map(currency => (
                    <Option key={currency.id} value={currency.id}>
                      {currency.value} {currency.code && `(${currency.code})`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="activeFrom"
                label="Active From"
                rules={[
                  { required: true, message: 'Active from date is required' }
                ]}
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  placeholder="Select start date"
                  data-testid="calculation-rule-form-active-from-picker"
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
                  data-testid="calculation-rule-form-active-to-picker"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="advancePaymentCode"
                label="Advance Payment Code"
              >
                <Input 
                  placeholder="Enter advance payment code"
                  data-testid="calculation-rule-form-advance-payment-input"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="deductionLimit"
                label="Deduction Limit"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="Enabled"
                  unCheckedChildren="Disabled"
                  data-testid="calculation-rule-form-deduction-limit-switch"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="standard"
                label="Standard Rule"
                valuePropName="checked"
                tooltip="Mark this rule as a standard rule"
              >
                <Switch 
                  checkedChildren="Yes"
                  unCheckedChildren="No"
                  data-testid="calculation-rule-form-standard-switch"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="useLastCountry"
                label="Use Last Country"
                valuePropName="checked"
                tooltip="Use the last country from previous expense"
              >
                <Switch 
                  checkedChildren="Yes"
                  unCheckedChildren="No"
                  data-testid="calculation-rule-form-use-last-country-switch"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="useSingleCurrency"
                label="Use Single Currency"
                valuePropName="checked"
                tooltip="Force single currency usage"
              >
                <Switch 
                  checkedChildren="Yes"
                  unCheckedChildren="No"
                  data-testid="calculation-rule-form-use-single-currency-switch"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="taxesCode"
                label="Taxes Code"
                data-testid="calculation-rule-form-taxes-code"
              >
                <Input 
                  placeholder="Enter taxes code"
                  data-testid="calculation-rule-form-taxes-code-input"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="nonpayableCode"
                label="Non-payable Code"
                data-testid="calculation-rule-form-nonpayable-code"
              >
                <Input 
                  placeholder="Enter non-payable code"
                  data-testid="calculation-rule-form-nonpayable-code-input"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                icon={<PiFloppyDisk />}
                data-testid="calculation-rule-form-save-button"
              >
                {isEditing ? 'Update Rule' : 'Create Rule'}
              </Button>
              <Button
                onClick={handleCancel}
                icon={<PiX />}
                data-testid="calculation-rule-form-cancel-button"
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

export default CalculationRuleForm; 