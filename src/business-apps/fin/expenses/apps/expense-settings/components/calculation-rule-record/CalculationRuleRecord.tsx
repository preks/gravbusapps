import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { 
  Button, 
  Typography, 
  Space, 
  Alert, 
  Card, 
  Row, 
  Col, 
  Tag, 
  Spin,
  Tabs,
  Form,
  Input,
  Checkbox,
  Select,
  message
} from 'antd';
import { 
  PiArrowLeft, 
  PiWarning,
  PiCheckCircle
} from 'react-icons/pi';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

// Configure dayjs plugins
dayjs.extend(isBetween);

// Tab components (these would be separate modules in a full implementation)
import GeneralExpensesTab from './tabs/GeneralExpensesTab';
import MileageRulesTab from './tabs/MileageRulesTab';
import AllowancePeriodTab from './tabs/AllowancePeriodTab';
import AllowanceCodeTab from './tabs/AllowanceCodeTab';
import AllowanceSetupTab from './tabs/AllowanceSetupTab';
import DeductionTab from './tabs/DeductionTab';
import CustomFieldsTab from './tabs/CustomFieldsTab';
import OtherCalculationTab from './tabs/OtherCalculationTab';

const { Title, Text } = Typography;
const { Option } = Select;

interface CalculationRuleRecordProps extends BusinessAppContextProps {
  ruleId: string;
  page?: string;
  onNavigateBack: () => void;
}

interface CalculationRuleDetails {
  id: string;
  code: string;
  name: string;
  calculationTypeRef?: string;
  calculationType?: {
    id: string;
    value: string;
  };
  standard: boolean;
  activeFrom: string;
  activeTo?: string;
  currency?: {
    id: string;
    value: string;
    code: string;
  };
  currencyRef?: string;
  country?: {
    id: string;
    value: string;
    code: string;
  };
  countryRef?: string;
  deductionLimit: boolean;
  taxesCode?: string;
  useLastCountry: boolean;
  nonpayableCode?: string;
  advancePaymentCode?: string;
  useSingleCurrency: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

interface ExpenseRuleFlag {
  id?: string;
  expenseRuleId: string;
  code: string;
  name: string;
  value: string;
  version?: number;
}

interface Country {
  id: string;
  value: string;
  code: string;
}

const CalculationRuleRecord: React.FC<CalculationRuleRecordProps> = ({
  ruleId,
  page,
  onNavigateBack,
  accessToken,
  ...context
}) => {
  const [form] = Form.useForm();
  const [ruleDetails, setRuleDetails] = useState<CalculationRuleDetails | null>(null);
  const [ruleFlags, setRuleFlags] = useState<ExpenseRuleFlag[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  // Form field change tracking
  const [formValues, setFormValues] = useState<any>({});

  const loadRuleDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual GraphQL query
      const mockDetails: CalculationRuleDetails = {
        id: ruleId,
        code: '@ROM_tax_max',
        name: 'Romanian according tax law with maximum allowances',
        calculationTypeRef: 'CalculationType:v1:TIME_INTERVALS',
        calculationType: {
          id: 'CalculationType:v1:TIME_INTERVALS',
          value: 'Time Intervals'
        },
        standard: false,
        activeFrom: '2024-11-12T00:00:00+00:00',
        activeTo: '9999-12-31T00:00:00+00:00',
        currency: {
          id: 'Currency:v1:RON',
          value: 'Romanian Leu',
          code: 'RON'
        },
        currencyRef: 'Currency:v1:RON',
        country: {
          id: 'Country:v1:RO',
          value: 'Romania',
          code: 'RO'
        },
        countryRef: 'Country:v1:RO',
        deductionLimit: false,
        taxesCode: '',
        useLastCountry: true,
        nonpayableCode: '',
        advancePaymentCode: '',
        useSingleCurrency: false,
        version: 13,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-15T14:30:00Z',
        isDeleted: false
      };

      const mockFlags: ExpenseRuleFlag[] = [
        {
          id: 'flag-1',
          expenseRuleId: ruleId,
          code: 'romanianCalculation',
          name: 'Romanian Calculation',
          value: 'true',
          version: 1
        }
      ];

      const mockCountries: Country[] = [
        { id: 'Country:v1:RO', value: 'Romania', code: 'RO' },
        { id: 'Country:v1:DE', value: 'Germany', code: 'DE' },
        { id: 'Country:v1:FR', value: 'France', code: 'FR' },
        { id: 'Country:v1:AT', value: 'Austria', code: 'AT' }
      ];
      
      setRuleDetails(mockDetails);
      setRuleFlags(mockFlags);
      setCountries(mockCountries);

      // Initialize form values
      const initialValues = {
        advancePaymentCode: mockDetails.advancePaymentCode || '',
        taxesCode: mockDetails.taxesCode || '',
        nonpayableCode: mockDetails.nonpayableCode || '',
        useLastCountry: mockDetails.useLastCountry,
        deductionLimit: mockDetails.deductionLimit,
        useSingleCurrency: mockDetails.useSingleCurrency,
        countryRef: mockDetails.countryRef,
        romanianCalculation: mockFlags.some(f => f.code === 'romanianCalculation' && f.value === 'true'),
        austrianAbroad: mockFlags.some(f => f.code === 'austrianAbroad' && f.value === 'true')
      };
      
      setFormValues(initialValues);
      form.setFieldsValue(initialValues);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rule details');
    } finally {
      setIsLoading(false);
    }
  }, [ruleId, form]);

  useEffect(() => {
    if (ruleId && accessToken) {
      loadRuleDetails();
    }
  }, [ruleId, accessToken, loadRuleDetails]);

  const handleFormChange = (changedFields: any, allValues: any) => {
    setFormValues(allValues);
    
    // Check if there are any changes
    const initialValues = {
      advancePaymentCode: ruleDetails?.advancePaymentCode || '',
      taxesCode: ruleDetails?.taxesCode || '',
      nonpayableCode: ruleDetails?.nonpayableCode || '',
      useLastCountry: ruleDetails?.useLastCountry || false,
      deductionLimit: ruleDetails?.deductionLimit || false,
      useSingleCurrency: ruleDetails?.useSingleCurrency || false,
      countryRef: ruleDetails?.countryRef || '',
      romanianCalculation: ruleFlags.some(f => f.code === 'romanianCalculation' && f.value === 'true'),
      austrianAbroad: ruleFlags.some(f => f.code === 'austrianAbroad' && f.value === 'true')
    };

    const hasModifications = Object.keys(allValues).some(key => 
      (allValues as any)[key] !== (initialValues as any)[key]
    );
    
    setHasChanges(hasModifications);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // TODO: Implement actual save logic with GraphQL mutations
      const saveData = {
        expenseRule: {
          id: ruleDetails?.id,
          version: ruleDetails?.version,
          ...formValues
        },
        changeMode: 'UPDATE'
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('Rule saved successfully');
      setHasChanges(false);
      
      // Reload data
      await loadRuleDetails();
      
    } catch (err) {
      message.error('Failed to save rule');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (ruleDetails) {
      const initialValues = {
        advancePaymentCode: ruleDetails.advancePaymentCode || '',
        taxesCode: ruleDetails.taxesCode || '',
        nonpayableCode: ruleDetails.nonpayableCode || '',
        useLastCountry: ruleDetails.useLastCountry,
        deductionLimit: ruleDetails.deductionLimit,
        useSingleCurrency: ruleDetails.useSingleCurrency,
        countryRef: ruleDetails.countryRef,
        romanianCalculation: ruleFlags.some(f => f.code === 'romanianCalculation' && f.value === 'true'),
        austrianAbroad: ruleFlags.some(f => f.code === 'austrianAbroad' && f.value === 'true')
      };
      
      setFormValues(initialValues);
      form.setFieldsValue(initialValues);
      setHasChanges(false);
    }
  };

  const formatValidDate = (dateString: string) => {
    try {
      return dayjs(dateString).format('DD.MM.YYYY');
    } catch {
      return dateString.split('T')[0].split('-').reverse().join('.');
    }
  };

  const getCalculationTypeDisplay = () => {
    if (!ruleDetails?.calculationTypeRef) return 'Time Interval';
    const type = ruleDetails.calculationTypeRef.split(':').pop()?.replace(/_/g, ' ');
    return type === 'CALENDAR_DAYS' ? 'Calendar Days' : 'Time Interval';
  };

  if (isLoading) {
    return (
      <div 
        data-testid="calculation-rule-record-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-96"
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error || !ruleDetails) {
    return (
      <div data-testid="calculation-rule-record-error">
        <Alert
          message="Error Loading Rule Details"
          description={error || 'Rule not found'}
          type="error"
          showIcon
          icon={<PiWarning />}
          action={
            <Space>
              <Button size="small" onClick={loadRuleDetails}>
                Retry
              </Button>
              <Button size="small" onClick={onNavigateBack}>
                Go Back
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  return (
    <div data-testid="calculation-rule-record-container">
      {/* Profile Header */}
      <Card 
        className="gba:mb-6"
        style={{ borderRadius: '8px' }}
        data-testid="calculation-rule-profile-header"
      >
        <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
          <Button
            icon={<PiArrowLeft />}
            onClick={onNavigateBack}
            data-testid="calculation-rule-record-back-button"
          >
            Back{page && ` to ${page}`}
          </Button>
          
          <Space>
            <AppActionButton
              data-testid="calculation-rule-record-edit-button"
              variant="primary"
              contextsArray={[FlowContextName.employeeExpenses]}
              externalContextData={{ ruleId: ruleDetails.id }}
              prefixDataTestId="calculation-rule-edit"
              accessToken={accessToken}
              emptyStateBehavior="disable"
              deferMainContextRequestsUntilClick
            />
          </Space>
        </div>

        {/* Profile Info */}
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-6">
          <div className="gba:flex-1">
            <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
              {ruleDetails.name}
            </Title>
            <Text type="secondary" className="gba:text-lg">
              {ruleDetails.code}
            </Text>
          </div>
          
          <div className="gba:flex gba:gap-2">
            <Tag 
              color={ruleDetails.standard ? 'blue' : 'default'}
              className="gba:px-3 gba:py-1"
            >
              {ruleDetails.standard ? 'Standard' : 'Custom'}
            </Tag>
            <Tag 
              color={dayjs().isBetween(dayjs(ruleDetails.activeFrom), ruleDetails.activeTo ? dayjs(ruleDetails.activeTo) : dayjs().add(1, 'year')) ? 'green' : 'red'}
              className="gba:px-3 gba:py-1"
            >
              {dayjs().isBetween(dayjs(ruleDetails.activeFrom), ruleDetails.activeTo ? dayjs(ruleDetails.activeTo) : dayjs().add(1, 'year')) ? 'Active' : 'Inactive'}
            </Tag>
          </div>
        </div>

        {/* Quick Stats */}
        <Row gutter={[16, 16]} className="gba:mb-4">
          <Col xs={24} sm={6}>
            <div className="gba:text-center">
              <div className="gba:text-sm gba:text-gray-500 gba:mb-1">Calculation</div>
              <div className="gba:font-medium">{getCalculationTypeDisplay()}</div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="gba:text-center">
              <div className="gba:text-sm gba:text-gray-500 gba:mb-1">Valid From</div>
              <div className="gba:font-medium">{formatValidDate(ruleDetails.activeFrom)}</div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="gba:text-center">
              <div className="gba:text-sm gba:text-gray-500 gba:mb-1">Valid To</div>
              <div className="gba:font-medium">
                {ruleDetails.activeTo ? formatValidDate(ruleDetails.activeTo) : 'No end date'}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="gba:text-center">
              <div className="gba:text-sm gba:text-gray-500 gba:mb-1">Company Currency</div>
              <div className="gba:font-medium">{ruleDetails.currency?.code || 'Not set'}</div>
            </div>
          </Col>
        </Row>

        {/* Additional Rule Details */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <div className="gba:text-center">
              <div className="gba:text-sm gba:text-gray-500 gba:mb-1">Use Last Country</div>
              <div className="gba:font-medium">
                <Tag color={ruleDetails.useLastCountry ? 'green' : 'default'}>
                  {ruleDetails.useLastCountry ? 'Yes' : 'No'}
                </Tag>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="gba:text-center">
              <div className="gba:text-sm gba:text-gray-500 gba:mb-1">Single Currency</div>
              <div className="gba:font-medium">
                <Tag color={ruleDetails.useSingleCurrency ? 'green' : 'default'}>
                  {ruleDetails.useSingleCurrency ? 'Yes' : 'No'}
                </Tag>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="gba:text-center">
              <div className="gba:text-sm gba:text-gray-500 gba:mb-1">Taxes Code</div>
              <div className="gba:font-medium">{ruleDetails.taxesCode || 'Not set'}</div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="gba:text-center">
              <div className="gba:text-sm gba:text-gray-500 gba:mb-1">Non-payable Code</div>
              <div className="gba:font-medium">{ruleDetails.nonpayableCode || 'Not set'}</div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Tabs Container */}
      <Card style={{ borderRadius: '8px' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          data-testid="calculation-rule-record-tabs"
          items={[
            {
              key: 'general',
              label: 'General',
              children: (
                <Form
                  form={form}
                  layout="vertical"
                  onValuesChange={handleFormChange}
                  data-testid="calculation-rule-general-form"
                >
                  {/* Special Settings */}
                  <div className="gba:mb-6">
                    <Title level={4} className="gba:mb-4">Special Settings</Title>
                    <Row gutter={[24, 16]}>
                      <Col xs={24} md={12}>
                        <Form.Item 
                          name="romanianCalculation" 
                          valuePropName="checked"
                          data-testid="romanian-calculation-checkbox"
                        >
                          <Checkbox
                            onChange={(e) => {
                              if (e.target.checked) {
                                form.setFieldValue('austrianAbroad', false);
                              }
                            }}
                          >
                            Romanian Calculation
                          </Checkbox>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item 
                          name="austrianAbroad" 
                          valuePropName="checked"
                          data-testid="austrian-abroad-checkbox"
                        >
                          <Checkbox
                            onChange={(e) => {
                              if (e.target.checked) {
                                form.setFieldValue('romanianCalculation', false);
                              }
                            }}
                          >
                            Austrian Abroad
                          </Checkbox>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* Wage Codes */}
                  <div className="gba:mb-6">
                    <Title level={4} className="gba:mb-4">Wage Codes</Title>
                    <Row gutter={[24, 16]}>
                      <Col xs={24} md={8}>
                        <Form.Item 
                          name="advancePaymentCode" 
                          label="Advance Payment"
                          data-testid="advance-payment-input"
                        >
                          <Input placeholder="Enter advance payment code" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item 
                          name="taxesCode" 
                          label="Taxes"
                          data-testid="taxes-input"
                        >
                          <Input placeholder="Enter taxes code" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item 
                          name="nonpayableCode" 
                          label="Non Payable"
                          data-testid="non-payable-input"
                        >
                          <Input placeholder="Enter non payable code" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* Settings */}
                  <div className="gba:mb-6">
                    <Row gutter={[24, 16]}>
                      <Col xs={24} md={12}>
                        <Form.Item 
                          name="useLastCountry" 
                          valuePropName="checked"
                          data-testid="use-last-country-checkbox"
                        >
                          <Checkbox>Use Last Country</Checkbox>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item 
                          name="deductionLimit" 
                          valuePropName="checked"
                          data-testid="deduction-limit-checkbox"
                        >
                          <Checkbox>Deduction Limit</Checkbox>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item 
                          name="useSingleCurrency" 
                          valuePropName="checked"
                          data-testid="use-single-currency-checkbox"
                        >
                          <Checkbox>Use single currency in expense</Checkbox>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item 
                          name="countryRef" 
                          label="Home Country"
                          data-testid="home-country-select"
                        >
                          <Select 
                            placeholder="Select home country"
                            showSearch
                            optionFilterProp="children"
                          >
                            {countries.map(country => (
                              <Option key={country.id} value={country.id}>
                                {country.value} ({country.code})
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* Action Buttons */}
                  <div className="gba:flex gba:gap-3">
                    <Button 
                      type="primary" 
                      onClick={handleSave}
                      loading={isSaving}
                      disabled={!hasChanges}
                      icon={<PiCheckCircle />}
                      data-testid="save-button"
                    >
                      Save
                    </Button>
                    <Button 
                      onClick={handleDiscard}
                      disabled={!hasChanges}
                      data-testid="discard-button"
                    >
                      Discard
                    </Button>
                  </div>
                </Form>
              )
            },
            {
              key: 'expenses',
              label: 'Expenses',
              children: <GeneralExpensesTab ruleId={ruleId} accessToken={accessToken} activeFrom={ruleDetails.activeFrom} />
            },
            {
              key: 'mileage',
              label: 'Mileage',
              children: <MileageRulesTab ruleId={ruleId} accessToken={accessToken} activeFrom={ruleDetails.activeFrom} />
            },
            {
              key: 'allowance-period',
              label: 'Allowance Period',
              children: <AllowancePeriodTab ruleId={ruleId} accessToken={accessToken} activeFrom={ruleDetails.activeFrom} />
            },
            {
              key: 'allowance-code',
              label: 'Allowance Code',
              children: <AllowanceCodeTab ruleId={ruleId} accessToken={accessToken} activeFrom={ruleDetails.activeFrom} />
            },
            {
              key: 'allowance-setup',
              label: 'Allowance Setup',
              children: <AllowanceSetupTab ruleId={ruleId} accessToken={accessToken} activeFrom={ruleDetails.activeFrom} />
            },
            {
              key: 'deduction',
              label: 'Deduction',
              children: <DeductionTab ruleId={ruleId} accessToken={accessToken} activeFrom={ruleDetails.activeFrom} />
            },
            {
              key: 'custom-fields',
              label: 'Custom Fields',
              children: <CustomFieldsTab ruleId={ruleId} accessToken={accessToken} activeFrom={ruleDetails.activeFrom} />
            },
            {
              key: 'other-calculation',
              label: 'Other Calculation',
              children: <OtherCalculationTab ruleId={ruleId} accessToken={accessToken} activeFrom={ruleDetails.activeFrom} />
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default CalculationRuleRecord; 