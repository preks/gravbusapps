import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { useEmployeeSelection } from '../../hooks/useEmployeeSelection';
import { useCompanySelection } from '../../hooks/useCompanySelection';
import { useOrganizationalUnitSelection } from '../../hooks/useOrganizationalUnitSelection';
import { useSiteLocationSelection } from '../../hooks/useSiteLocationSelection';
import SearchableSelect from '../../components/SearchableSelect';
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
  Spin,
  InputNumber
} from 'antd';
import { PiFloppyDisk, PiX, PiWarning, PiUser, PiBuilding, PiTree, PiMapPin } from 'react-icons/pi';
import { SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Register dayjs plugins
dayjs.extend(weekday);
dayjs.extend(localeData);
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { SaveExpenseRuleAssignmentInput, ExpenseRule, ExpenseRuleAssignment } from '../../types/ExpenseRuleTypes';
import { useGetExpenseRuleAssignmentById } from '../../queries/ExpenseRuleQueries';

const { Title } = Typography;
const { Option } = Select;

export interface AssignmentFormData {
  id?: string;
  cascading: boolean;
  applicants: boolean;
  activeFrom?: string; // Optional - null means eternity
  activeTo?: string; // Optional - null means eternity
  expenseRuleId: string;
  employeeId?: string;
  companyId?: string;
  organizationalUnitId?: string;
  siteLocationId?: string;
  employmentTypeRef?: string;
  contractTypeRef?: string;
}

interface AssignmentFormProps extends BusinessAppContextProps {
  initialData?: ExpenseRuleAssignment;
  availableRules: ExpenseRule[];
  isEditing?: boolean;
  onSave: (data: SaveExpenseRuleAssignmentInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface CatalogOption {
  id: string;
  value: string;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({
  accessToken,
  initialData,
  availableRules,
  isEditing = false,
  onSave,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalogs, setCatalogs] = useState<{
    employmentTypes: CatalogOption[];
    contractTypes: CatalogOption[];
  }>({
    employmentTypes: [],
    contractTypes: []
  });
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(accessToken);
  
  // ✅ NEW: Hook for fetching fresh assignment data
  const { fetchExpenseRuleAssignmentById } = useGetExpenseRuleAssignmentById({ accessToken } as BusinessAppContextProps);
  
  // Selection hooks - pass the full context
  const context = { accessToken };
  const employeeSelection = useEmployeeSelection(context);
  const companySelection = useCompanySelection(context);
  const orgUnitSelection = useOrganizationalUnitSelection(context);
  const siteLocationSelection = useSiteLocationSelection(context);

  // Load catalog data
  const loadCatalogs = useCallback(async () => {
    if (!accessToken) return;
    
    setCatalogsLoading(true);
    setCatalogError(null);
    
    try {
      const [employmentTypesResponse, contractTypesResponse] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'EmploymentType', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'ContractType', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        )
      ]);

      setCatalogs({
        employmentTypes: employmentTypesResponse.data?.map(item => ({
          id: item.id,
          value: item.value || item.id
        })) || [],
        contractTypes: contractTypesResponse.data?.map(item => ({
          id: item.id,
          value: item.value || item.id
        })) || []
      });
    } catch (error) {
      console.error('Error loading catalogs:', error);
      setCatalogError('Failed to load reference data. Please try again.');
    } finally {
      setCatalogsLoading(false);
    }
  }, [accessToken, catalogClient]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  // ✅ FIXED: Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // ✅ NEW: For editing, fetch fresh data from the server
        console.log('🔄 AssignmentForm: Fetching FRESH data for ID:', initialData.id);
        try {
          const freshData = await fetchExpenseRuleAssignmentById(initialData.id);
          if (freshData) {
            console.log('✅ AssignmentForm: Using FRESH data from API:', freshData);
            form.setFieldsValue({
              cascading: freshData.cascading,
              applicants: freshData.applicants,
              activeFrom: freshData.activeFrom ? dayjs(freshData.activeFrom) : undefined,
              activeTo: freshData.activeTo ? dayjs(freshData.activeTo) : undefined,
              expenseRuleId: freshData.expenseRuleId,
              employeeId: freshData.employeeId,
              companyId: freshData.companyId,
              organizationalUnitId: freshData.organizationalUnitId,
              siteLocationId: freshData.siteLocationId,
              employmentTypeRef: freshData.employmentType?.id,
              contractTypeRef: freshData.contractType?.id
            });
            return;
          }
        } catch (error) {
          console.error('❌ AssignmentForm: Failed to load fresh assignment data:', error);
          console.log('⚠️ AssignmentForm: Falling back to STALE list data');
          // Continue with fallback to initial data
        }
      }
      
      // ✅ Fallback: Use initial data (for creating or if fresh fetch failed)
      if (initialData) {
        console.log('📝 AssignmentForm: Using initial data (could be stale list data or new item data):', initialData);
        form.setFieldsValue({
          cascading: initialData.cascading,
          applicants: initialData.applicants,
          activeFrom: initialData.activeFrom ? dayjs(initialData.activeFrom) : undefined,
          activeTo: initialData.activeTo ? dayjs(initialData.activeTo) : undefined,
          expenseRuleId: initialData.expenseRuleId,
          employeeId: initialData.employeeId,
          companyId: initialData.companyId,
          organizationalUnitId: initialData.organizationalUnitId,
          siteLocationId: initialData.siteLocationId,
          employmentTypeRef: initialData.employmentType?.id,
          contractTypeRef: initialData.contractType?.id
        });
      } else {
        // Set defaults for new assignment
        form.setFieldsValue({
          cascading: false,
          applicants: false
          // Leave dates empty by default (eternity)
        });
      }
    };

    loadData();
  }, [initialData?.id, isEditing, form, fetchExpenseRuleAssignmentById]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      
      const saveData: SaveExpenseRuleAssignmentInput = {
        expenseRuleAssignment: {
          ...(isEditing && initialData?.id ? { id: initialData.id } : {}),
          ...(initialData?.version ? { version: initialData.version } : {}),
          assignmentOrder: initialData?.assignmentOrder || 1, // Use existing order or default to 1
          cascading: values.cascading || false,
          applicants: values.applicants || false,
          // Handle optional dates - use null for eternity
          activeFrom: values.activeFrom ? values.activeFrom.toISOString() : null,
          activeTo: values.activeTo ? values.activeTo.toISOString() : null,
          expenseRule: values.expenseRuleId,
          ...(values.employeeId && { employee: values.employeeId }),
          ...(values.companyId && { company: values.companyId }),
          ...(values.organizationalUnitId && { organizationalUnit: values.organizationalUnitId }),
          ...(values.siteLocationId && { siteLocation: values.siteLocationId }),
          ...(values.employmentTypeRef && { employmentTypeRef: values.employmentTypeRef }),
          ...(values.contractTypeRef && { contractTypeRef: values.contractTypeRef })
        },
        changeMode: isEditing ? 'UPDATE' : 'INSERT'
      };

      await onSave(saveData);
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (catalogsLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-96" data-testid="assignment-form-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (catalogError) {
    return (
      <Alert
        message="Error Loading Data"
        description={catalogError}
        type="error"
        showIcon
        icon={<PiWarning />}
        action={
          <Button size="small" onClick={loadCatalogs}>
            Retry
          </Button>
        }
        data-testid="assignment-form-catalog-error"
      />
    );
  }

  return (
    <div data-testid="assignment-form-container">
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          data-testid="assignment-form"
        >
          {/* Rule Selection */}
          <Card 
            title={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.ruleSelection', 'Rule Selection')}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="expenseRuleId"
                  label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.expenseRule', 'Expense Rule')}
                  rules={[
                    { required: true, message: 'Please select an expense rule' }
                  ]}
                >
                  <Select
                    placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectRule', 'Select expense rule')}
                    showSearch
                    optionFilterProp="children"
                    data-testid="assignment-form-rule-select"
                  >
                    {availableRules.map(rule => (
                      <Option key={rule.id} value={rule.id}>
                        {rule.code} {rule.name && ` - ${rule.name}`}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              

            </Row>
          </Card>

          {/* Assignment Targets */}
          <Card 
            title={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.targets', 'Assignment Targets')}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="employeeId"
                  label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.employee', 'Employee')}
                >
                  <SearchableSelect
                    placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectEmployee', 'Select employee')}
                    options={employeeSelection.employees}
                    loading={employeeSelection.isLoading}
                    hasMore={employeeSelection.hasMore}
                    onSearch={employeeSelection.search}
                    onLoadMore={employeeSelection.loadMore}
                    data-testid="assignment-form-employee-select"
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  name="companyId"
                  label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.company', 'Company')}
                >
                  <SearchableSelect
                    placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectCompany', 'Select company')}
                    options={companySelection.companies}
                    loading={companySelection.isLoading}
                    hasMore={companySelection.hasMore}
                    onSearch={companySelection.search}
                    onLoadMore={companySelection.loadMore}
                    data-testid="assignment-form-company-select"
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="organizationalUnitId"
                  label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.organizationalUnit', 'Organizational Unit')}
                >
                  <SearchableSelect
                    placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectOrgUnit', 'Select organizational unit')}
                    options={orgUnitSelection.organizationalUnits}
                    loading={orgUnitSelection.isLoading}
                    hasMore={orgUnitSelection.hasMore}
                    onSearch={orgUnitSelection.search}
                    onLoadMore={orgUnitSelection.loadMore}
                    data-testid="assignment-form-org-unit-select"
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  name="siteLocationId"
                  label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.siteLocation', 'Site Location')}
                >
                  <SearchableSelect
                    placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectLocation', 'Select site location')}
                    options={siteLocationSelection.siteLocations}
                    loading={siteLocationSelection.isLoading}
                    hasMore={siteLocationSelection.hasMore}
                    onSearch={siteLocationSelection.search}
                    onLoadMore={siteLocationSelection.loadMore}
                    data-testid="assignment-form-location-select"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Employment Details */}
          <Col span={24}>
            <Card 
              title={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.employmentDetails', 'Employment Details')}
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="employmentTypeRef"
                    label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.employmentType', 'Employment Type')}
                  >
                    <Select
                      placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectEmploymentType', 'Select employment type')}
                      allowClear
                      data-testid="assignment-form-employment-type-select"
                    >
                      {catalogs.employmentTypes.map(type => (
                        <Option key={type.id} value={type.id}>
                          {type.value}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="contractTypeRef"
                    label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.contractType', 'Contract Type')}
                  >
                    <Select
                      placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectContractType', 'Select contract type')}
                      allowClear
                      data-testid="assignment-form-contract-type-select"
                    >
                      {catalogs.contractTypes.map(type => (
                        <Option key={type.id} value={type.id}>
                          {type.value}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Settings and Period */}
          <Card 
            title={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.settings', 'Assignment Settings')}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="cascading"
                  valuePropName="checked"
                  label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.cascading', 'Cascading')}
                >
                  <Switch 
                    checkedChildren="Yes"
                    unCheckedChildren="No"
                    data-testid="assignment-form-cascading-switch"
                  />
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item
                  name="applicants"
                  valuePropName="checked"
                  label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.applicants', 'For Applicants')}
                >
                  <Switch 
                    checkedChildren="Yes"
                    unCheckedChildren="No"
                    data-testid="assignment-form-applicants-switch"
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="activeFrom"
                  label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.activeFrom', 'Active From')}
                  tooltip="Leave empty for 'always active from the beginning'"
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                    placeholder="Always active (empty = eternity)"
                    data-testid="assignment-form-active-from-picker"
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  name="activeTo"
                  label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.activeTo', 'Active To')}
                  tooltip="Leave empty for 'ongoing/never expires'"
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const activeFrom = getFieldValue('activeFrom');
                        if (!value || !activeFrom) {
                          return Promise.resolve();
                        }
                        if (value.isAfter(activeFrom)) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('End date must be after start date'));
                      },
                    }),
                  ]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                    placeholder="Ongoing (empty = eternity)"
                    data-testid="assignment-form-active-to-picker"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Form Actions */}
          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting || loading}
                icon={<PiFloppyDisk />}
                data-testid="assignment-form-save-button"
              >
                {isEditing ? 
                  getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.updateAssignment', 'Update Assignment') : 
                  getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.createAssignment', 'Create Assignment')
                }
              </Button>
              <Button
                onClick={onCancel}
                icon={<PiX />}
                data-testid="assignment-form-cancel-button"
              >
                {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.cancel', 'Cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AssignmentForm; 