import React, { useState, useMemo } from 'react';
import { 
  PageLayout, 
  Card, 
  Button, 
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert, 
  Badge, 
  Spinner,
  Separator,
  type KpiCardData
} from '@newwork/nw-design-system';
import { ServiceRequestTemplate, WorkflowEngine } from '../../../types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Users,
  Warning,
  Sparkle,
  Calendar,
  CurrencyDollar,
  User,
  Building,
  Star
} from '@phosphor-icons/react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getCategoryById } from '../../../data';
import { getCategoryIcon } from '../../../utils/iconMapping';
import { useRealEmployeeData, getEmployeeOptions, getJobPositionOptions, getDepartmentOptions } from '../hooks/useRealEmployeeData';
import { useEmploymentTypeCatalog } from '../hooks/useEmploymentTypeCatalog';

export interface RequestFormProps extends BusinessAppContextProps {
  template: ServiceRequestTemplate;
  workflowEngine: WorkflowEngine;
  onSuccess: (requestId: string) => void;
  onCancel: () => void;
}

interface FormFieldProps {
  field: string;
  value: any;
  onChange: (field: string, value: any) => void;
  required?: boolean;
  type?: 'text' | 'textarea' | 'select' | 'date' | 'number';
  options?: string[];
  isEmployeeSelect?: boolean;
  isDepartmentSelect?: boolean;
  isJobPositionSelect?: boolean;
  employees?: any[];
  departments?: any[];
  jobPositions?: any[];
  selectedDepartmentId?: string | null;
}

const FormField: React.FC<FormFieldProps> = ({ 
  field, 
  value, 
  onChange, 
  required = false,
  type = 'text',
  options = [],
  isEmployeeSelect = false,
  isDepartmentSelect = false,
  isJobPositionSelect = false,
  employees = [],
  departments = [],
  jobPositions = [],
  selectedDepartmentId = null
}) => {
  const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
  
  // Get appropriate icon for field type
  const getFieldIcon = () => {
    if (field.toLowerCase().includes('name') || field.toLowerCase().includes('employee')) return User;
    if (field.toLowerCase().includes('date')) return Calendar;
    if (field.toLowerCase().includes('salary') || field.toLowerCase().includes('budget')) return CurrencyDollar;
    if (field.toLowerCase().includes('department') || field.toLowerCase().includes('position')) return Building;
    return FileText;
  };

  const FieldIcon = getFieldIcon();
  
  return (
    <div className="gba:space-y-3">
      <label className="gba:flex gba:items-center gba:text-sm gba:font-semibold gba:text-foreground">
        <FieldIcon className="gba:mr-2 gba:h-4 gba:w-4 gba:text-primary" />
        {fieldName}
        {required && <span className="gba:text-destructive gba:ml-1">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <Textarea
          placeholder={`Enter ${fieldName.toLowerCase()}...`}
          value={value || ''}
          onChange={(e) => onChange(field, e.target.value)}
          className="gba:min-h-[100px] gba:resize-none"
          required={required}
        />
      ) : type === 'select' ? (
        <Select 
          value={value || ''} 
          onValueChange={(val) => onChange(field, val)}
          disabled={isJobPositionSelect && !selectedDepartmentId}
        >
          <SelectTrigger>
            <SelectValue 
              placeholder={
                isJobPositionSelect && !selectedDepartmentId 
                  ? "First select a department" 
                  : `Select ${fieldName.toLowerCase()}`
              } 
            />
          </SelectTrigger>
          <SelectContent>
            {/* Handle employee select */}
            {isEmployeeSelect && employees.map((emp) => (
              <SelectItem key={emp.value} value={emp.value}>
                <div className="gba:flex gba:flex-col">
                  <span className="gba:font-medium">{emp.label}</span>
                  {emp.jobTitle && <span className="gba:text-xs gba:text-muted-foreground">{emp.jobTitle} • {emp.department}</span>}
                </div>
              </SelectItem>
            ))}
            
            {/* Handle department select - Simple display like other apps */}
            {isDepartmentSelect && departments.map((dept) => (
              <SelectItem key={dept.value} value={dept.value}>
                {dept.label}
              </SelectItem>
            ))}
            
            {/* Handle job position select - Clean display like HR forms, filtered by department */}
            {isJobPositionSelect && jobPositions
              .filter(pos => !selectedDepartmentId || pos.departmentId === selectedDepartmentId)
              .map((pos) => (
              <SelectItem key={pos.value} value={pos.value}>
                {pos.label}
              </SelectItem>
            ))}
            
            {/* Handle regular options */}
            {!isEmployeeSelect && !isDepartmentSelect && !isJobPositionSelect && options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
          placeholder={`Enter ${fieldName.toLowerCase()}...`}
          value={value || ''}
          onChange={(e) => onChange(field, e.target.value)}
          required={required}
          className="gba:transition-all gba:duration-200 focus:gba:ring-2 focus:gba:ring-primary/20"
        />
      )}
    </div>
  );
};

const ProcessStepPreview: React.FC<{ template: ServiceRequestTemplate }> = ({ template }) => {
  return (
    <Card className="gba:p-6 gba:bg-gradient-to-r gba:from-primary-50 gba:to-blue-50 gba:border-primary/20">
      <h3 className="gba:text-lg gba:font-bold gba:text-foreground gba:mb-4 gba:flex gba:items-center">
        <Sparkle className="gba:mr-2 gba:text-primary" size={20} />
        Your Request Journey
      </h3>
      
      <p className="gba:text-sm gba:text-muted-foreground gba:mb-6">
        Here's what will happen after you submit your request:
      </p>
      
      <div className="gba:space-y-4">
        {template.steps.map((step, index) => (
          <div key={step.id} className="gba:flex gba:items-start gba:space-x-4">
            <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary gba:text-white gba:text-sm gba:font-bold gba:flex-shrink-0 gba:shadow-md">
              {index + 1}
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                <h4 className="gba:font-semibold gba:text-foreground">{step.name}</h4>
                <Badge variant="outline" className="gba:text-xs">
                  {step.receiver}
                </Badge>
              </div>
              <p className="gba:text-sm gba:text-muted-foreground">
                Processing time: ~{Math.ceil((index + 1) * 0.5)}-{(index + 1)} business day{(index + 1) > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Separator className="gba:my-4" />
      
      <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
        <div className="gba:flex gba:items-center gba:text-muted-foreground">
          <Clock className="gba:mr-2" size={16} />
          Total estimated time: {template.steps.length * 1}-{template.steps.length * 2} business days
        </div>
        <div className="gba:flex gba:items-center gba:text-green-600">
          <CheckCircle className="gba:mr-1" size={16} />
          98% success rate
        </div>
      </div>
    </Card>
  );
};

export const RequestForm: React.FC<RequestFormProps> = ({
  template,
  workflowEngine,
  onSuccess,
  onCancel,
  ...contextProps
}) => {
  const [formData, setFormData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  // Removed unused step management for now

  // Load real employee data
  const {
    employees,
    jobPositions,
    departments,
    isLoading: dataLoading,
    error: dataError,
    fetchJobPositions
  } = useRealEmployeeData(contextProps);

  // Load employment types from catalog
  const {
    employmentTypes,
    isLoading: employmentTypesLoading,
    error: employmentTypesError
  } = useEmploymentTypeCatalog(contextProps);

  // Handle form field changes with cascading dropdown logic
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    
    // Handle cascading dropdown logic
    if (field === 'department') {
      setSelectedDepartmentId(value);
      // Clear position when department changes
      setFormData((prev: any) => ({ ...prev, position: '' }));
      // Fetch positions for the selected department
      if (value) {
        fetchJobPositions('', value);
      } else {
        fetchJobPositions(''); // Fetch all positions if no department selected
      }
    }
  };

  const category = getCategoryById(template.categoryId);
  const IconComponent = category ? getCategoryIcon(category.id) : FileText;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setIsLoading(true);
    setError(null);

    try {
      const newRequestId = await workflowEngine.startRequest(template.key, formData);
      onSuccess(newRequestId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced form fields configuration with better UX
  const formFieldsConfig = useMemo(() => {
    // Get employment types from catalog (with fallback to common types)
    const employmentTypeOptions = employmentTypes.length > 0 
      ? employmentTypes.map(type => type.name)
      : ['Full-time', 'Part-time', 'Contract', 'Intern', 'Temporary'];

    const configs: Record<string, Array<{
      field: string;
      required: boolean;
      type: 'text' | 'textarea' | 'select' | 'date' | 'number';
      options?: string[];
      isEmployeeSelect?: boolean;
      isDepartmentSelect?: boolean;
      isJobPositionSelect?: boolean;
    }>> = {
      'hr-onboard': [
        { field: 'employeeName', required: true, type: 'text' },
        { field: 'employeeEmail', required: true, type: 'text' },
        { field: 'startDate', required: true, type: 'date' },
        { field: 'department', required: true, type: 'select', isDepartmentSelect: true },
        { field: 'position', required: true, type: 'select', isJobPositionSelect: true },
        { field: 'reportingManager', required: true, type: 'select', isEmployeeSelect: true },
        { field: 'employmentType', required: true, type: 'select', options: employmentTypeOptions },
        { field: 'workLocation', required: false, type: 'select', options: ['Office', 'Remote', 'Hybrid'] },
        { field: 'equipmentNeeded', required: false, type: 'textarea' },
        { field: 'specialRequirements', required: false, type: 'textarea' }
      ],
      'hr-contract-change': [
        { field: 'currentSalary', required: true, type: 'number' },
        { field: 'requestedSalary', required: true, type: 'number' },
        { field: 'changeReason', required: true, type: 'textarea' },
        { field: 'effectiveDate', required: true, type: 'date' },
        { field: 'changeType', required: true, type: 'select', options: ['Salary Adjustment', 'Role Change', 'Department Transfer', 'Benefits Change'] },
        { field: 'additionalBenefits', required: false, type: 'textarea' },
        { field: 'justification', required: true, type: 'textarea' }
      ],
      'it-hardware': [
        { field: 'hardwareType', required: true, type: 'select', options: ['Laptop', 'Desktop', 'Monitor', 'Keyboard', 'Mouse', 'Other'] },
        { field: 'specifications', required: true, type: 'textarea' },
        { field: 'businessJustification', required: true, type: 'textarea' },
        { field: 'urgency', required: true, type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
        { field: 'estimatedBudget', required: false, type: 'number' },
        { field: 'preferredBrand', required: false, type: 'text' },
        { field: 'deliveryLocation', required: true, type: 'text' }
      ],
      'it-software-access': [
        { field: 'softwareName', required: true, type: 'text' },
        { field: 'accessLevel', required: true, type: 'select', options: ['Read Only', 'Standard User', 'Power User', 'Administrator'] },
        { field: 'businessJustification', required: true, type: 'textarea' },
        { field: 'duration', required: true, type: 'select', options: ['30 days', '90 days', '6 months', '1 year', 'Permanent'] },
        { field: 'teamMembers', required: false, type: 'textarea' },
        { field: 'projectCode', required: false, type: 'text' }
      ]
    };

    return configs[template.key] || [
      { field: 'serviceDetails', required: true, type: 'textarea' },
      { field: 'businessJustification', required: true, type: 'textarea' },
      { field: 'priority', required: true, type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
      { field: 'expectedDate', required: false, type: 'date' }
    ];
  }, [template.key, employees, jobPositions, departments, employmentTypes]);

  // Future: Could implement multi-step form here

  // KPI cards for the form
  const kpiCards: KpiCardData[] = useMemo(() => [
    {
      id: 'processing-steps',
      title: 'Processing Steps',
      value: template.steps.length,
      description: 'Workflow stages'
    },
    {
      id: 'estimated-time',
      title: 'Est. Completion',
      value: `${template.steps.length * 1}-${template.steps.length * 2} days`,
      description: 'Business days'
    },
    {
      id: 'success-rate',
      title: 'Success Rate',
      value: '98%',
      description: 'Completion rate'
    },
    {
      id: 'satisfaction',
      title: 'User Rating',
      value: '4.8★',
      description: 'Average satisfaction'
    }
  ], [template.steps.length]);

  // Calculate form completion percentage
  const completionPercentage = useMemo(() => {
    const totalRequired = formFieldsConfig.filter(f => f.required).length;
    const completedRequired = formFieldsConfig.filter(f => f.required && formData[f.field]).length;
    return totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
  }, [formFieldsConfig, formData]);

    return (
    <div data-testid="request-form-container" style={{ backgroundColor: "white", padding: "16px" }}>
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: "16px" }}>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
          data-testid="back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>Cancel Request</span>
        </button>
      </div>
      
      <PageLayout
        headerPhosphorIcon={{
          icon: IconComponent,
          variant: "strategy",
          size: "lg",
          label: template.title
        }}
        headerTitle={`Request: ${template.title}`}
        headerDescription={template.description || 'Complete the form below to submit your service request'}
        sectionTitle="Service Request Form"
        sectionDescription={`Fill out the required information to submit your ${template.title.toLowerCase()}`}
        kpiCardsData={kpiCards}
      >
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-8">
          {/* Main Form Column */}
          <div className="gba:lg:col-span-2 gba:space-y-6">
            {error && (
              <Alert variant="destructive">
                <Warning className="gba:h-4 gba:w-4" />
                <h4 className="gba:font-semibold">Request Failed</h4>
                <p>{error}</p>
              </Alert>
            )}

            {/* Progress Indicator */}
            <Card className="gba:p-6">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                <h3 className="gba:text-lg gba:font-semibold gba:flex gba:items-center">
                  <CheckCircle className="gba:mr-2 gba:text-primary" />
                  Form Progress
                </h3>
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {completionPercentage}% Complete
                </span>
              </div>
              <div className="gba:w-full gba:bg-muted gba:rounded-full gba:h-2">
                <div 
                  className="gba:bg-primary gba:h-2 gba:rounded-full gba:transition-all gba:duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </Card>

            {/* Request Form */}
            <Card className="gba:p-8">
              <form onSubmit={handleSubmit} className="gba:space-y-8">
                {/* Show loading state for data */}
                {(dataLoading || employmentTypesLoading) && !dataError && !employmentTypesError && (
                  <div className="gba:flex gba:items-center gba:justify-center gba:p-8">
                    <Spinner size="sm" className="gba:mr-3" />
                    <span className="gba:text-sm gba:text-muted-foreground">Loading form data...</span>
                  </div>
                )}
                
                {/* Show data error */}
                {(dataError || employmentTypesError) && (
                  <Alert variant="destructive" className="gba:mb-6">
                    <Warning className="gba:h-4 gba:w-4" />
                    <h4 className="gba:font-semibold">Data Loading Error</h4>
                    <p>{dataError || employmentTypesError}</p>
                  </Alert>
                )}

                <div className="gba:grid gba:gap-6 gba:md:grid-cols-2">
                  {formFieldsConfig.map((fieldConfig) => (
                    <div key={fieldConfig.field} className={fieldConfig.type === 'textarea' ? 'gba:md:col-span-2' : ''}>
                      <FormField
                        field={fieldConfig.field}
                        value={formData[fieldConfig.field]}
                        onChange={handleFieldChange}
                        required={fieldConfig.required}
                        type={fieldConfig.type}
                        options={fieldConfig.options}
                        isEmployeeSelect={fieldConfig.isEmployeeSelect}
                        isDepartmentSelect={fieldConfig.isDepartmentSelect}
                        isJobPositionSelect={fieldConfig.isJobPositionSelect}
                        employees={getEmployeeOptions(employees)}
                        departments={getDepartmentOptions(departments)}
                        jobPositions={getJobPositionOptions(jobPositions)}
                        selectedDepartmentId={selectedDepartmentId}
                      />
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Additional Information Section */}
                <div className="gba:space-y-4">
                  <h4 className="gba:text-base gba:font-semibold gba:flex gba:items-center">
                    <FileText className="gba:mr-2" size={16} />
                    Additional Information
                  </h4>
                  <FormField
                    field="additionalComments"
                    value={formData.additionalComments}
                    onChange={handleFieldChange}
                    type="textarea"
                  />
                </div>

                {/* Form Actions */}
                <div className="gba:flex gba:gap-4 gba:pt-6">
                  <Button 
                    type="submit" 
                    disabled={isLoading || completionPercentage < 100}
                    className="gba:flex-1 gba:py-3"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Spinner size="sm" className="gba:mr-2" />
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="gba:mr-2" size={16} />
                        Submit Request
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel}
                    disabled={isLoading}
                    className="gba:px-8"
                  >
                    Cancel
                  </Button>
                </div>

                {/* Help Text */}
                <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:border gba:border-border">
                  <div className="gba:flex gba:items-start gba:space-x-3">
                    <Warning className="gba:text-blue-500 gba:mt-0.5 gba:flex-shrink-0" size={16} />
                    <div className="gba:text-sm gba:text-muted-foreground gba:space-y-1">
                      <p className="gba:font-medium gba:text-foreground">Important Information:</p>
                      <ul className="gba:list-disc gba:list-inside gba:space-y-1">
                        <li>All required fields must be completed before submission</li>
                        <li>Your request will be automatically routed to the appropriate teams</li>
                        <li>You'll receive email notifications at each step of the process</li>
                        <li>Track progress anytime in the "My Requests" section</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </form>
            </Card>
          </div>

          {/* Sidebar Column */}
          <div className="gba:space-y-6">
            {/* Process Preview */}
            <ProcessStepPreview template={template} />

            {/* Quick Tips */}
            <Card className="gba:p-6">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:flex gba:items-center">
                <Star className="gba:mr-2 gba:text-yellow-500" />
                Quick Tips
              </h3>
              <div className="gba:space-y-3 gba:text-sm">
                <div className="gba:flex gba:items-start gba:space-x-2">
                  <CheckCircle className="gba:text-green-500 gba:mt-0.5 gba:flex-shrink-0" size={16} />
                  <span>Provide detailed information to speed up processing</span>
                </div>
                <div className="gba:flex gba:items-start gba:space-x-2">
                  <CheckCircle className="gba:text-green-500 gba:mt-0.5 gba:flex-shrink-0" size={16} />
                  <span>Include business justification for faster approval</span>
                </div>
                <div className="gba:flex gba:items-start gba:space-x-2">
                  <CheckCircle className="gba:text-green-500 gba:mt-0.5 gba:flex-shrink-0" size={16} />
                  <span>Check "My Requests" for real-time status updates</span>
                </div>
                <div className="gba:flex gba:items-start gba:space-x-2">
                  <CheckCircle className="gba:text-green-500 gba:mt-0.5 gba:flex-shrink-0" size={16} />
                  <span>Contact your manager if urgent approval is needed</span>
                </div>
              </div>
            </Card>

            {/* Support Contact */}
            <Card className="gba:p-6 gba:border-blue-200 gba:bg-blue-50">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-2 gba:text-blue-900">Need Help?</h3>
              <p className="gba:text-sm gba:text-blue-700 gba:mb-4">
                If you need assistance with this request, our support team is here to help.
              </p>
              <Button variant="outline" className="gba:w-full gba:border-blue-300 gba:text-blue-700 hover:gba:bg-blue-100">
                <Users className="gba:mr-2" size={16} />
                Contact Support
              </Button>
            </Card>
          </div>
        </div>
      </PageLayout>
    </div>
  );
};