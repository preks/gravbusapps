import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { 
  Button, 
  Typography, 
  Space, 
  Alert, 
  Row, 
  Col, 
  Spin,
  Tabs,
  Form,
  Input,
  Checkbox,
  Select,
  DatePicker,
  message
} from 'antd';
import { useGetExpenseRuleById } from '../../queries/ExpenseRuleQueries';
import { 
  PiArrowLeft, 
  PiWarning,
  PiCheckCircle
} from 'react-icons/pi';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Register dayjs plugins
dayjs.extend(weekday);
dayjs.extend(localeData);

// Tab components (these would be separate modules in a full implementation)
import GeneralExpensesTab from './tabs/GeneralExpensesTab';
import MileageRulesTab from './tabs/MileageRulesTab';
import AllowancePeriodTab from './tabs/AllowancePeriodTab';
import AllowanceCodeTab from './tabs/AllowanceCodeTab';
import AllowanceSetupTab from './tabs/AllowanceSetupTab';
import DeductionTab from './tabs/DeductionTab';
import CustomFieldsTab from './tabs/CustomFieldsTab';
import OtherCalculationTab from './tabs/OtherCalculationTab';

const { Title } = Typography;
const { Option } = Select;

interface CatalogOption {
  id: string;
  value: string;
  code: string;
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tab and sub-tab management with query parameters
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    const validTabs = ['general', 'expenses', 'mileage', 'allowance', 'other-calculation', 'custom-fields'];
    return tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'general';
  };

  const getInitialSubTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subTabFromUrl = urlParams.get('subTab');
    const validSubTabs = ['allowance-period', 'allowance-code', 'allowance-setup', 'allowance-deduction'];
    return subTabFromUrl && validSubTabs.includes(subTabFromUrl) ? subTabFromUrl : 'allowance-period';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [activeSubTab, setActiveSubTab] = useState(getInitialSubTab());
  const [hasChanges, setHasChanges] = useState(false);

  // Catalog data
  const [calculationTypes, setCalculationTypes] = useState<CatalogOption[]>([]);
  const [currencies, setCurrencies] = useState<CatalogOption[]>([]);
  const [countries, setCountries] = useState<CatalogOption[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);

  // Form field change tracking
  const [_formValues, setFormValues] = useState<any>({});

  // URL update functions for tab navigation
  const updateUrl = (newTab?: string, newSubTab?: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (newTab !== undefined) {
      urlParams.set('tab', newTab);
    }
    
    if (newSubTab !== undefined) {
      if (newTab === 'allowance' || activeTab === 'allowance') {
        urlParams.set('subTab', newSubTab);
      } else {
        // Clear subTab if not on allowance tab
        urlParams.delete('subTab');
      }
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    updateUrl(tab, tab === 'allowance' ? activeSubTab : undefined);
  };

  const handleSubTabChange = (subTab: string) => {
    setActiveSubTab(subTab);
    updateUrl(undefined, subTab);
  };

  // Use the GraphQL hook for fetching expense rule data
  const { fetchExpenseRuleById } = useGetExpenseRuleById({ accessToken, ...context });
  
  // Catalog client for loading calculation types and currencies
  const catalogClient = useCatalogManagerClient(accessToken);

  const loadRuleDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching expense rule details for ID:', ruleId);
      
      // Fetch actual data from GraphQL
      const ruleData = await fetchExpenseRuleById(ruleId);
      
      if (!ruleData) {
        throw new Error(`Expense rule with ID ${ruleId} not found`);
      }

      console.log('✅ Loaded expense rule data:', {
        id: ruleData.id,
        code: ruleData.code,
        name: ruleData.name,
        calculationType: ruleData.calculationType?.value
      });

      // Transform GraphQL data to component format
      const ruleDetails: CalculationRuleDetails = {
        id: ruleData.id,
        code: ruleData.code,
        name: ruleData.name,
        calculationTypeRef: ruleData.calculationType?.id,
        calculationType: ruleData.calculationType ? {
          id: ruleData.calculationType.id,
          value: ruleData.calculationType.value
        } : undefined,
        standard: ruleData.standard || false,
        activeFrom: ruleData.activeFrom,
        activeTo: ruleData.activeTo,
        currency: ruleData.currency ? {
          id: ruleData.currency.id,
          value: ruleData.currency.value,
          code: ruleData.currency.code
        } : undefined,
        currencyRef: ruleData.currency?.id,
        country: ruleData.country ? {
          id: ruleData.country.id,
          value: ruleData.country.value,
          code: ruleData.country.code
        } : undefined,
        countryRef: ruleData.country?.id,
        deductionLimit: ruleData.deductionLimit || false,
        taxesCode: ruleData.taxesCode || '',
        useLastCountry: ruleData.useLastCountry || false,
        nonpayableCode: ruleData.nonpayableCode || '',
        advancePaymentCode: ruleData.advancePaymentCode || '',
        useSingleCurrency: ruleData.useSingleCurrency || false,
        version: ruleData.version || 1,
        createdAt: ruleData.createdAt || new Date().toISOString(),
        updatedAt: ruleData.updatedAt || new Date().toISOString(),
        isDeleted: false
      };

      // For now, use mock flags until we have proper flag data structure from GraphQL
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

      setRuleDetails(ruleDetails);
      setRuleFlags(mockFlags);

      // Initialize form values
      const initialValues = {
        // Basic Information
        code: ruleDetails.code || '',
        name: ruleDetails.name || '',
        standard: ruleDetails.standard || false,
        
        // Validity & Configuration
        activeFrom: ruleDetails.activeFrom ? dayjs(ruleDetails.activeFrom) : null,
        activeTo: ruleDetails.activeTo ? dayjs(ruleDetails.activeTo) : null,
        calculationTypeRef: ruleDetails.calculationTypeRef || '',
        currencyRef: ruleDetails.currencyRef || '',
        
        // Wage Codes
        advancePaymentCode: ruleDetails.advancePaymentCode || '',
        taxesCode: ruleDetails.taxesCode || '',
        nonpayableCode: ruleDetails.nonpayableCode || '',
        countryRef: ruleDetails.countryRef || '',
        
        // Special Settings
        useLastCountry: ruleDetails.useLastCountry || false,
        deductionLimit: ruleDetails.deductionLimit || false,
        useSingleCurrency: ruleDetails.useSingleCurrency || false,
        romanianCalculation: mockFlags.some(f => f.code === 'romanianCalculation' && f.value === 'true'),
        austrianAbroad: mockFlags.some(f => f.code === 'austrianAbroad' && f.value === 'true')
      };
      
      setFormValues(initialValues);
      form.setFieldsValue(initialValues);
      
    } catch (err) {
      console.error('❌ Error loading expense rule details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rule details');
    } finally {
      setIsLoading(false);
    }
  }, [ruleId, form, fetchExpenseRuleById]);

  // Load catalog data for calculation types, currencies, and countries
  const loadCatalogData = useCallback(async () => {
    setCatalogsLoading(true);
    try {
      const [calculationTypesRes, currenciesRes, countriesRes] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'ExpenseCalculationType', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Currency', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          { limit: 500, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        )
      ]);

      setCalculationTypes(calculationTypesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      })));

      setCurrencies(currenciesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      })));

      setCountries(countriesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      })));

    } catch (error) {
      console.error('Error loading catalog data:', error);
    } finally {
      setCatalogsLoading(false);
    }
  }, [catalogClient]);

  useEffect(() => {
    if (ruleId && accessToken) {
      loadRuleDetails();
    }
  }, [ruleId, accessToken, loadRuleDetails]);

  useEffect(() => {
    if (accessToken) {
      loadCatalogData();
    }
  }, [accessToken, loadCatalogData]);

  // Ensure URL always has tab parameter and handle browser navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('tab')) {
      updateUrl(activeTab, activeTab === 'allowance' ? activeSubTab : undefined);
    }

    const handlePopState = () => {
      const newTab = getInitialTab();
      const newSubTab = getInitialSubTab();
      setActiveTab(newTab);
      setActiveSubTab(newSubTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, activeSubTab]);

  const handleFormChange = (_changedFields: any, allValues: any) => {
    setFormValues(allValues);
    
    // Check if there are any changes
    const initialValues = {
      // Basic Information
      code: ruleDetails?.code || '',
      name: ruleDetails?.name || '',
      standard: ruleDetails?.standard || false,
      
      // Validity & Configuration (convert dates back to dayjs for comparison)
      activeFrom: ruleDetails?.activeFrom ? dayjs(ruleDetails.activeFrom) : null,
      activeTo: ruleDetails?.activeTo ? dayjs(ruleDetails.activeTo) : null,
      calculationTypeRef: ruleDetails?.calculationTypeRef || '',
      currencyRef: ruleDetails?.currencyRef || '',
      
      // Wage Codes
      advancePaymentCode: ruleDetails?.advancePaymentCode || '',
      taxesCode: ruleDetails?.taxesCode || '',
      nonpayableCode: ruleDetails?.nonpayableCode || '',
      countryRef: ruleDetails?.countryRef || '',
      
      // Special Settings
      useLastCountry: ruleDetails?.useLastCountry || false,
      deductionLimit: ruleDetails?.deductionLimit || false,
      useSingleCurrency: ruleDetails?.useSingleCurrency || false,
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
      // const saveData = {
      //   expenseRule: {
      //     id: ruleDetails?.id,
      //     version: ruleDetails?.version,
      //     ...formValues
      //   },
      //   changeMode: 'UPDATE'
      // };

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
        // Basic Information
        code: ruleDetails.code || '',
        name: ruleDetails.name || '',
        standard: ruleDetails.standard || false,
        
        // Validity & Configuration
        activeFrom: ruleDetails.activeFrom ? dayjs(ruleDetails.activeFrom) : null,
        activeTo: ruleDetails.activeTo ? dayjs(ruleDetails.activeTo) : null,
        calculationTypeRef: ruleDetails.calculationTypeRef || '',
        currencyRef: ruleDetails.currencyRef || '',
        
        // Wage Codes
        advancePaymentCode: ruleDetails.advancePaymentCode || '',
        taxesCode: ruleDetails.taxesCode || '',
        nonpayableCode: ruleDetails.nonpayableCode || '',
        countryRef: ruleDetails.countryRef || '',
        
        // Special Settings
        useLastCountry: ruleDetails.useLastCountry || false,
        deductionLimit: ruleDetails.deductionLimit || false,
        useSingleCurrency: ruleDetails.useSingleCurrency || false,
        romanianCalculation: ruleFlags.some(f => f.code === 'romanianCalculation' && f.value === 'true'),
        austrianAbroad: ruleFlags.some(f => f.code === 'austrianAbroad' && f.value === 'true')
      };
      
      setFormValues(initialValues);
      form.setFieldsValue(initialValues);
      setHasChanges(false);
    }
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
    <div data-testid="calculation-rule-record-container" className="gba:h-full gba:flex gba:flex-col gba:p-6">
      {/* Simple Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Button
            icon={<PiArrowLeft />}
            onClick={onNavigateBack}
            data-testid="calculation-rule-record-back-button"
          >
            Back{page && ` to ${page}`}
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {form.getFieldValue('name') || ruleDetails.name || 'Calculation Rule'}
          </Title>
        </div>
      </div>

      {/* Tabs */}
      <div className="gba:flex-1">
        <Tabs 
          activeKey={activeTab} 
          onChange={handleTabChange}
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
                  {/* Basic Information Section */}
                  <div className="gba:mb-8">
                    <Title level={4} className="gba:mb-6" style={{ borderBottom: '1px solid #d9d9d9', paddingBottom: '8px' }}>
                      Basic Information
                    </Title>
                    <Row gutter={[24, 16]}>
                      <Col xs={24} md={8}>
                        <Form.Item 
                          name="code" 
                          label="Code"
                          data-testid="rule-code-input"
                          rules={[{ required: true, message: 'Code is required' }]}
                        >
                          <Input placeholder="Enter rule code" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item 
                          name="name" 
                          label="Name"
                          data-testid="rule-name-input"
                          rules={[{ required: true, message: 'Name is required' }]}
                        >
                          <Input placeholder="Enter rule name" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item 
                          name="standard" 
                          valuePropName="checked"
                          data-testid="rule-standard-checkbox"
                        >
                          <Checkbox>Standard</Checkbox>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* Validity & Configuration Section */}
                  <div className="gba:mb-8">
                    <Title level={4} className="gba:mb-6" style={{ borderBottom: '1px solid #d9d9d9', paddingBottom: '8px' }}>
                      Validity & Configuration
                    </Title>
                    <Row gutter={[24, 16]}>
                      <Col xs={24} md={8}>
                        <Form.Item 
                          name="activeFrom" 
                          label="Valid From"
                          data-testid="rule-active-from-picker"
                          rules={[{ required: true, message: 'Valid from date is required' }]}
                        >
                          <DatePicker 
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            placeholder="Select start date"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item 
                          name="activeTo" 
                          label="Valid To"
                          data-testid="rule-active-to-picker"
                        >
                          <DatePicker 
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            placeholder="Select end date (optional)"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item 
                          name="calculationTypeRef" 
                          label="Calculation Type"
                          data-testid="rule-calculation-type-select"
                        >
                          <Select 
                            placeholder="Select calculation type"
                            loading={catalogsLoading}
                            disabled={catalogsLoading}
                          >
                            {calculationTypes.map(type => (
                              <Option key={type.id} value={type.id}>
                                {type.value}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={[24, 16]}>
                      <Col xs={24} md={8}>
                        <Form.Item 
                          name="currencyRef" 
                          label="Currency"
                          data-testid="rule-currency-select"
                        >
                          <Select 
                            placeholder="Select currency"
                            loading={catalogsLoading}
                            disabled={catalogsLoading}
                          >
                            {currencies.map(currency => (
                              <Option key={currency.id} value={currency.id}>
                                {currency.code} - {currency.value}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* Two Column Layout for Wage Codes and Special Settings */}
                  <Row gutter={[48, 0]}>
                    {/* Left Column - Wage Codes */}
                    <Col xs={24} lg={12}>
                      <div className="gba:mb-6">
                        <Title level={4} className="gba:mb-6" style={{ borderBottom: '1px solid #d9d9d9', paddingBottom: '8px' }}>
                          Wage Codes
                        </Title>
                        
                        <div className="gba:space-y-4">
                          <Form.Item 
                            name="advancePaymentCode" 
                            label="Advance Payment"
                            data-testid="advance-payment-input"
                            className="gba:mb-4"
                          >
                            <Input placeholder="" />
                          </Form.Item>
                          
                          <Form.Item 
                            name="taxesCode" 
                            label="Taxes"
                            data-testid="taxes-input"
                            className="gba:mb-4"
                          >
                            <Input placeholder="" />
                          </Form.Item>
                          
                          <Form.Item 
                            name="nonpayableCode" 
                            label="Non Payable"
                            data-testid="non-payable-input"
                            className="gba:mb-4"
                          >
                            <Input placeholder="" />
                          </Form.Item>
                          
                          <Form.Item 
                            name="countryRef" 
                            label="Home Country"
                            data-testid="home-country-select"
                            className="gba:mb-4"
                          >
                            <Select 
                              placeholder="Select home country"
                              showSearch
                              optionFilterProp="children"
                              loading={catalogsLoading}
                              disabled={catalogsLoading}
                            >
                              {countries.map(country => (
                                <Option key={country.id} value={country.id}>
                                  {country.value} ({country.code})
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </div>
                      </div>
                    </Col>

                    {/* Right Column - Special Settings */}
                    <Col xs={24} lg={12}>
                      <div className="gba:mb-6">
                        <Title level={4} className="gba:mb-6" style={{ borderBottom: '1px solid #d9d9d9', paddingBottom: '8px' }}>
                          Special Setting
                        </Title>
                        
                        <div className="gba:space-y-4">
                          <Form.Item 
                            name="austrianAbroad" 
                            valuePropName="checked"
                            data-testid="austrian-abroad-checkbox"
                            className="gba:mb-4"
                          >
                            <Checkbox
                              onChange={(e) => {
                                if (e.target.checked) {
                                  form.setFieldValue('romanianCalculation', false);
                                }
                              }}
                            >
                              Austrian Calculation
                            </Checkbox>
                          </Form.Item>
                          
                          <Form.Item 
                            name="romanianCalculation" 
                            valuePropName="checked"
                            data-testid="romanian-calculation-checkbox"
                            className="gba:mb-4"
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
                          
                          <Form.Item 
                            name="useLastCountry" 
                            valuePropName="checked"
                            data-testid="use-last-country-checkbox"
                            className="gba:mb-4"
                          >
                            <Checkbox>Use Last Country</Checkbox>
                          </Form.Item>
                          
                          <Form.Item 
                            name="deductionLimit" 
                            valuePropName="checked"
                            data-testid="deduction-limit-checkbox"
                            className="gba:mb-4"
                          >
                            <Checkbox>Deduction Limit</Checkbox>
                          </Form.Item>
                          
                          <Form.Item 
                            name="useSingleCurrency" 
                            valuePropName="checked"
                            data-testid="use-single-currency-checkbox"
                            className="gba:mb-4"
                          >
                            <Checkbox>Use single currency in expense</Checkbox>
                          </Form.Item>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {/* Action Buttons */}
                  <div className="gba:flex gba:gap-3 gba:pt-4">
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
              key: 'allowance',
              label: 'Allowance',
              children: (
                <div data-testid="allowance-tab-container" className="gba:p-2">
                  <Tabs
                    activeKey={activeSubTab}
                    onChange={handleSubTabChange}
                    data-testid="allowance-subtabs"
                    items={[
                      {
                        key: 'allowance-period',
                        label: 'Allowance Period',
                        children: (
                          <AllowancePeriodTab
                            ruleId={ruleId}
                            accessToken={accessToken}
                            activeFrom={ruleDetails.activeFrom}
                          />
                        )
                      },
                      {
                        key: 'allowance-code',
                        label: 'Allowance Code',
                        children: (
                          <AllowanceCodeTab
                            ruleId={ruleId}
                            accessToken={accessToken}
                            activeFrom={ruleDetails.activeFrom}
                          />
                        )
                      },
                      {
                        key: 'allowance-setup',
                        label: 'Allowance Setup',
                        children: (
                          <AllowanceSetupTab
                            ruleId={ruleId}
                            accessToken={accessToken}
                            activeFrom={ruleDetails.activeFrom}
                          />
                        )
                      },
                      {
                        key: 'allowance-deduction',
                        label: 'Allowance Deduction',
                        children: (
                          <DeductionTab
                            ruleId={ruleId}
                            accessToken={accessToken}
                            activeFrom={ruleDetails.activeFrom}
                          />
                        )
                      }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'other-calculation',
              label: 'Other Calculation',
              children: (
                <OtherCalculationTab
                  ruleId={ruleId}
                  accessToken={accessToken}
                  activeFrom={ruleDetails.activeFrom}
                />
              )
            },
            {
              key: 'custom-fields',
              label: 'Custom Fields',
              children: <CustomFieldsTab ruleId={ruleId} accessToken={accessToken} activeFrom={ruleDetails.activeFrom} />
            }
          ]}
        />
      </div>
    </div>
  );
};

export default CalculationRuleRecord; 