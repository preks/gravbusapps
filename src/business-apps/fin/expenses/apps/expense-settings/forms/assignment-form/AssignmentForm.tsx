import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
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
import { PiFloppyDisk, PiX, PiWarning, PiUser, PiBuilding, PiTree, PiMapPin } from 'react-icons/pi';
import dayjs, { Dayjs } from 'dayjs';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { SaveExpenseRuleAssignmentInput, ExpenseRule, ExpenseRuleAssignment } from '../../types/ExpenseRuleTypes';

const { Title } = Typography;
const { Option } = Select;

export interface AssignmentFormData {
  id?: string;
  assignmentOrder: number;
  cascading: boolean;
  applicants: boolean;
  activeFrom: string;
  activeTo: string;
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

  // Initialize form with data
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        assignmentOrder: initialData.assignmentOrder,
        cascading: initialData.cascading,
        applicants: initialData.applicants,
        activeFrom: dayjs(initialData.activeFrom),
        activeTo: dayjs(initialData.activeTo),
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
        assignmentOrder: 1,
        cascading: false,
        applicants: false,
        activeFrom: dayjs(),
        activeTo: dayjs().add(1, 'year')
      });
    }
  }, [initialData, form]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      
      const saveData: SaveExpenseRuleAssignmentInput = {
        expenseRuleAssignment: {
          ...(isEditing && initialData?.id ? { id: initialData.id } : {}),
          assignmentOrder: values.assignmentOrder,
          cascading: values.cascading || false,
          applicants: values.applicants || false,
          activeFrom: values.activeFrom.toISOString(),
          activeTo: values.activeTo.toISOString(),
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

  return (
    <div data-testid="assignment-form-container">
      {catalogError && (
        <Alert
          message={getTranslationFromI18nKeyAndLabel('common.error', 'Error')}
          description={catalogError}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={loadCatalogs}>
              {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
            </Button>
          }
          style={{ marginBottom: 16 }}
          data-testid="assignment-form-error"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        data-testid="assignment-form"
      >
        <Row gutter={16}>
          {/* Rule Selection */}
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <PiTree />
                  {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.ruleDetails', 'Rule Details')}
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="expenseRuleId"
                    label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.expenseRule', 'Expense Rule')}
                    rules={[
                      { required: true, message: getTranslationFromI18nKeyAndLabel('validation.required', 'This field is required') }
                    ]}
                  >
                    <Select
                      placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectRule', 'Select expense rule')}
                      data-testid="assignment-form-expense-rule-select"
                      disabled={isEditing} // Don't allow changing rule in edit mode
                    >
                      {availableRules.map(rule => (
                        <Option key={rule.id} value={rule.id}>
                          {rule.code} - {rule.calculationType?.value || 'No Type'}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="assignmentOrder"
                    label={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.order', 'Assignment Order')}
                    rules={[
                      { required: true, message: getTranslationFromI18nKeyAndLabel('validation.required', 'This field is required') },
                      { type: 'number', min: 1, message: getTranslationFromI18nKeyAndLabel('validation.minOrder', 'Order must be at least 1') }
                    ]}
                  >
                    <Input
                      type="number"
                      min={1}
                      placeholder="1"
                      data-testid="assignment-form-order-input"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Assignment Target */}
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <PiUser />
                  {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.target', 'Assignment Target')}
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Alert
                message={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.targetInfo', 'Target Information')}
                description={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.targetDescription', 'Leave all fields empty for a general assignment that applies to everyone. Fill specific fields to target particular employees, companies, or organizational units.')}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="employeeId"
                    label={
                      <Space>
                        <PiUser />
                        {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.employee', 'Employee')}
                      </Space>
                    }
                  >
                    <Select
                      placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectEmployee', 'Select employee')}
                      allowClear
                      data-testid="assignment-form-employee-select"
                    >
                      {/* TODO: Load actual employees */}
                      <Option value="">
                        {getTranslationFromI18nKeyAndLabel('common.all', 'All Employees')}
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="companyId"
                    label={
                      <Space>
                        <PiBuilding />
                        {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.company', 'Company')}
                      </Space>
                    }
                  >
                    <Select
                      placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectCompany', 'Select company')}
                      allowClear
                      data-testid="assignment-form-company-select"
                    >
                      {/* TODO: Load actual companies */}
                      <Option value="">
                        {getTranslationFromI18nKeyAndLabel('common.all', 'All Companies')}
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="organizationalUnitId"
                    label={
                      <Space>
                        <PiTree />
                        {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.organizationalUnit', 'Organizational Unit')}
                      </Space>
                    }
                  >
                    <Select
                      placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectOrgUnit', 'Select organizational unit')}
                      allowClear
                      data-testid="assignment-form-org-unit-select"
                    >
                      {/* TODO: Load actual organizational units */}
                      <Option value="">
                        {getTranslationFromI18nKeyAndLabel('common.all', 'All Units')}
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="siteLocationId"
                    label={
                      <Space>
                        <PiMapPin />
                        {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.siteLocation', 'Site Location')}
                      </Space>
                    }
                  >
                    <Select
                      placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.selectLocation', 'Select site location')}
                      allowClear
                      data-testid="assignment-form-location-select"
                    >
                      {/* TODO: Load actual site locations */}
                      <Option value="">
                        {getTranslationFromI18nKeyAndLabel('common.all', 'All Locations')}
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

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
          <Col span={24}>
            <Card 
              title={getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.settings', 'Settings & Effective Period')}
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="activeFrom"
                    label={getTranslationFromI18nKeyAndLabel('common.activeFrom', 'Active From')}
                    rules={[
                      { required: true, message: getTranslationFromI18nKeyAndLabel('validation.required', 'This field is required') }
                    ]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      data-testid="assignment-form-active-from-picker"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="activeTo"
                    label={getTranslationFromI18nKeyAndLabel('common.activeTo', 'Active To')}
                    rules={[
                      { required: true, message: getTranslationFromI18nKeyAndLabel('validation.required', 'This field is required') },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('activeFrom') < value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error(getTranslationFromI18nKeyAndLabel('validation.dateRange', 'End date must be after start date')));
                        },
                      }),
                    ]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      data-testid="assignment-form-active-to-picker"
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="cascading"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren={getTranslationFromI18nKeyAndLabel('common.yes', 'Yes')}
                      unCheckedChildren={getTranslationFromI18nKeyAndLabel('common.no', 'No')}
                      data-testid="assignment-form-cascading-switch"
                    />
                    <span style={{ marginLeft: 8 }}>
                      {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.cascading', 'Cascading Assignment')}
                    </span>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="applicants"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren={getTranslationFromI18nKeyAndLabel('common.yes', 'Yes')}
                      unCheckedChildren={getTranslationFromI18nKeyAndLabel('common.no', 'No')}
                      data-testid="assignment-form-applicants-switch"
                    />
                    <span style={{ marginLeft: 8 }}>
                      {getTranslationFromI18nKeyAndLabel('expenseSettings.assignment.applicants', 'Include Applicants')}
                    </span>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Form Actions */}
        <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-6">
          <Button
            onClick={onCancel}
            disabled={isSubmitting || loading}
            data-testid="assignment-form-cancel-button"
          >
            <PiX className="gba:w-4 gba:h-4" />
            {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting || loading}
            data-testid="assignment-form-save-button"
          >
            <PiFloppyDisk className="gba:w-4 gba:h-4" />
            {isEditing 
              ? getTranslationFromI18nKeyAndLabel('common.update', 'Update Assignment')
              : getTranslationFromI18nKeyAndLabel('common.create', 'Create Assignment')
            }
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default AssignmentForm; 