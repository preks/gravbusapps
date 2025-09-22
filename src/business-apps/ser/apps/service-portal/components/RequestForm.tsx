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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  type KpiCardData
} from '@newwork/nw-design-system';
import { ServiceRequestTemplate, WorkflowEngine, FlowTemplate, DynamicFormValues } from '../../../types';
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
  Star,
  Robot,
  Brain,
  Copy,
  X,
  ThumbsUp,
  Lightbulb,
  Target,
  ShieldCheck
} from '@phosphor-icons/react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getCategoryById } from '../../../data';
import { getCategoryIcon } from '../../../utils/iconMapping';
import { useRealEmployeeData, getEmployeeOptions, getJobPositionOptions, getDepartmentOptions } from '../hooks/useRealEmployeeData';
import { useEmploymentTypeCatalog } from '../hooks/useEmploymentTypeCatalog';
import { DynamicFormGenerator } from '../../../components/DynamicFormGenerator';
import { flowbotClient } from '@/common/network/flowbot';
import { parseMarkdownForReact } from '@/common/utils/markdownUtils';

export interface RequestFormProps extends BusinessAppContextProps {
  template?: ServiceRequestTemplate;
  flowTemplate?: FlowTemplate;
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
  flowTemplate,
  workflowEngine,
  onSuccess,
  onCancel,
  ...contextProps
}) => {
  const [formData, setFormData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; payload?: any } | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [stepsRequiringAssignment, setStepsRequiringAssignment] = useState<Array<{
    stepId: string;
    stepIndex: number;
    title: string;
    assignmentMode: string;
    requiresUsers: boolean;
  }>>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  
  // AI Response Modal State
  const [showAIResponse, setShowAIResponse] = useState(false);
  const [aiResponse, setAIResponse] = useState<string>('');
  const [aiLoading, setAILoading] = useState(false);
  const [aiResponseType, setAIResponseType] = useState<'suggestion' | 'validation' | 'optimization'>('suggestion');
  
  // Determine if we're using a flow template or mock template
  const isFlowTemplate = !!flowTemplate;
  const currentTemplate = flowTemplate || template;
  
  // 🌐 UNIVERSAL: Load steps requiring assignment for any template
  React.useEffect(() => {
    const loadRequiredAssignments = async () => {
      if (!isFlowTemplate || !flowTemplate?.id || !workflowEngine.getStepsRequiringAssignment) {
        setStepsRequiringAssignment([]);
        return;
      }

      setLoadingAssignments(true);
      try {
        const requiredSteps = await workflowEngine.getStepsRequiringAssignment(flowTemplate.id);
        setStepsRequiringAssignment(requiredSteps);
        
        // Initialize step assignment form fields
        if (requiredSteps.length > 0) {
          const initialAssignments: any = { stepAssignments: {} };
          requiredSteps.forEach(step => {
            // Set assignment mode and allowReassignment from template
            initialAssignments[`${step.stepId}_assignmentMode`] = step.assignmentMode;
            initialAssignments[`${step.stepId}_allowReassignment`] = step.assignmentMode !== 'ASSIGN';
            
            // 🎯 SERVICE PORTAL: Auto-assign ASSIGN mode steps to current user
            if (step.assignmentMode === 'ASSIGN') {
              initialAssignments.stepAssignments[step.stepId] = contextProps.userInfo?.id || 'current-user';
            }
          });
          setFormData((prev: any) => ({ ...prev, ...initialAssignments }));
        }
        
        console.log(`[RequestForm] 🔍 Template ${flowTemplate.id} requires assignments for:`, requiredSteps);
      } catch (error) {
        console.error('[RequestForm] Error loading required assignments:', error);
        setStepsRequiringAssignment([]);
      } finally {
        setLoadingAssignments(false);
      }
    };

    loadRequiredAssignments();
  }, [isFlowTemplate, flowTemplate?.id, workflowEngine]);
  
  if (!currentTemplate) {
    return (
      <Alert variant="destructive" className="gba:mb-4" style={{ display: 'block' }}>
        <Warning className="gba:h-4 gba:w-4" />
        <h4 className="gba:font-semibold">Invalid Template</h4>
        <div style={{ display: 'block', wordWrap: 'break-word', whiteSpace: 'normal' }} className="gba:text-sm gba:mt-2">
          No valid template provided for this request form.
        </div>
      </Alert>
    );
  }

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
    
    // 🌐 UNIVERSAL: Handle step assignment changes
    if (field.startsWith('stepAssignment_')) {
      const stepId = field.replace('stepAssignment_', '');
      setFormData((prev: any) => ({
        ...prev,
        stepAssignments: {
          ...prev.stepAssignments,
          [stepId]: value
        }
      }));
    }
    
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

  // Get category and icon based on template type
  const category = isFlowTemplate 
    ? { id: 'flow-templates', name: 'Flow Template', description: 'Dynamic workflow template' }
    : getCategoryById((template as ServiceRequestTemplate).categoryId);
  const IconComponent = (category ? getCategoryIcon(category.id) : null) || FileText;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setIsLoading(true);
    setError(null);

    // Build complete payload for debugging
    let completePayload: any = {};

    try {
      if (isFlowTemplate && flowTemplate) {
        // For flow templates, we need to execute the template with the form data
        // The workflowEngine should have a method to execute templates by ID
        if (typeof workflowEngine.executeTemplate === 'function') {
          // Build the actual API payload that will be sent to custom-flow-engine
          completePayload = {
            apiEndpoint: `POST /api/templates/${flowTemplate.id || flowTemplate.name}/execute`,
            expectedCustomFlowEnginePayload: {
              initiatorId: contextProps.userInfo?.id || 'unknown-user',
              input: formData,
              correlationId: `REQ-${Date.now()}`
            },
            actualPayloadSent: 'Will be logged by ConductorWorkflowEngineAdapter',
            formData: formData,
            templateInfo: {
              id: flowTemplate.id,
              name: flowTemplate.name,
              description: flowTemplate.description
            }
          };
          const newRequestId = await workflowEngine.executeTemplate(flowTemplate.id || flowTemplate.name, formData);
          onSuccess(newRequestId);
        } else {
          // Fallback to startRequest with template name as key
          completePayload = {
            apiEndpoint: `POST /api/templates/${flowTemplate.id || flowTemplate.name}/execute`,
            expectedCustomFlowEnginePayload: {
              initiatorId: contextProps.userInfo?.id || 'unknown-user',
              input: formData,
              correlationId: `REQ-${Date.now()}`
            },
            actualPayloadSent: 'Check browser console for ConductorWorkflowEngineAdapter logs',
            formData: formData,
            templateInfo: {
              id: flowTemplate.id,
              name: flowTemplate.name,
              description: flowTemplate.description
            }
          };
          const newRequestId = await workflowEngine.startRequest(flowTemplate.name, formData);
          onSuccess(newRequestId);
        }
      } else if (template) {
        // For mock templates, use the existing logic
        completePayload = {
          apiEndpoint: `POST /api/templates/{mappedFlowTemplateId}/execute`,
          expectedCustomFlowEnginePayload: {
            initiatorId: contextProps.userInfo?.id || 'unknown-user',
            input: formData,
            correlationId: `REQ-${Date.now()}`
          },
          actualPayloadSent: 'Check browser console for ConductorWorkflowEngineAdapter logs',
          formData: formData,
          templateInfo: {
            key: template.key,
            title: template.title,
            categoryId: template.categoryId
          }
        };
        const newRequestId = await workflowEngine.startRequest(template.key, formData);
        onSuccess(newRequestId);
      } else {
        throw new Error('No valid template provided');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit request';
      
      // Check if this is an enhanced error from ConductorWorkflowEngineAdapter with actual payload
      const actualPayload = (err as any)?.debugPayload || null;
      
      setError({
        message: errorMessage,
        payload: actualPayload || completePayload // Use actual payload if available, fallback to mock
      });
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

    // For flow templates, return empty array since we use dynamic fields
    if (isFlowTemplate) {
      return [];
    }

    return configs[(template as ServiceRequestTemplate).key] || [
      { field: 'serviceDetails', required: true, type: 'textarea' },
      { field: 'businessJustification', required: true, type: 'textarea' },
      { field: 'priority', required: true, type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
      { field: 'expectedDate', required: false, type: 'date' }
    ];
  }, [isFlowTemplate, template, employees, jobPositions, departments, employmentTypes]);

  // Future: Could implement multi-step form here

  // KPI cards for the form
  const kpiCards: KpiCardData[] = useMemo(() => {
    const stepCount = isFlowTemplate 
      ? (flowTemplate?.stepCount || flowTemplate?.steps?.length || 0)
      : (template as ServiceRequestTemplate)?.steps?.length || 0;
    
    const estimatedTime = isFlowTemplate
      ? (flowTemplate?.estimatedDuration || `${stepCount}-${stepCount * 2} days`)
      : '2-5 days';

    return [
    {
      id: 'processing-steps',
      title: 'Processing Steps',
        value: stepCount,
      description: 'Workflow stages'
    },
    {
      id: 'estimated-time',
      title: 'Est. Completion',
        value: estimatedTime,
      description: 'Business days'
    },
      {
        id: 'template-type',
        title: 'Template Type',
        value: isFlowTemplate ? 'Live' : 'Mock',
        description: isFlowTemplate ? 'Workflow engine' : 'Development'
      },
    {
      id: 'success-rate',
      title: 'Success Rate',
      value: '98%',
      description: 'Completion rate'
      }
    ];
  }, [isFlowTemplate, flowTemplate, template]);

  // Calculate form completion percentage (including step assignments)
  const completionPercentage = useMemo(() => {
    let totalRequired = 0;
    let completedRequired = 0;

    if (isFlowTemplate && flowTemplate?.formSchema) {
      // Flow template form fields
      totalRequired = flowTemplate.formSchema.filter(f => f.required).length;
      completedRequired = flowTemplate.formSchema.filter(f => f.required && formData[f.name]).length;
    } else {
      // Mock template form fields
      totalRequired = formFieldsConfig.filter(f => f.required).length;
      completedRequired = formFieldsConfig.filter(f => f.required && formData[f.field]).length;
    }

    // 🌐 UNIVERSAL: Add step assignments to completion calculation
    if (stepsRequiringAssignment.length > 0) {
      const claimStepsRequiringInput = stepsRequiringAssignment.filter(step => step.assignmentMode === 'CLAIM');
      
      // Only count CLAIM steps as requiring user input (ASSIGN steps are auto-completed)
      totalRequired += claimStepsRequiringInput.length;
      
      const completedClaimAssignments = claimStepsRequiringInput.filter(step => 
        formData.stepAssignments?.[step.stepId]
      ).length;
      completedRequired += completedClaimAssignments;
      
      // ASSIGN steps are automatically completed (assigned to current user)
    }

    return totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : (totalRequired === 0 ? 100 : 0);
  }, [isFlowTemplate, flowTemplate, formFieldsConfig, formData, stepsRequiringAssignment]);

  // Handle AI button click - collect form data and call real AI API
  const handleAskAI = async () => {
    console.log('🤖 [Ask AI for Quick Solution] Button clicked');
    
    // Start AI loading
    setAILoading(true);
    setShowAIResponse(true);
    setError(null);
    
    try {
      // Set access token for the API call
      if (contextProps.accessToken) {
        flowbotClient.setAccessToken(contextProps.accessToken);
      }
      
      // Prepare AI payload with form data for the ticket_data structure
      const ticketData = {
        timestamp: new Date().toISOString(),
        templateInfo: {
          type: isFlowTemplate ? 'flow-template' : 'mock-template',
          id: isFlowTemplate ? flowTemplate?.id : (template as ServiceRequestTemplate)?.key,
          name: isFlowTemplate ? flowTemplate?.name : (template as ServiceRequestTemplate)?.title,
          description: currentTemplate?.description
        },
        formData: { ...formData },
        formCompletion: {
          percentage: completionPercentage,
          totalFields: isFlowTemplate 
            ? (flowTemplate?.formSchema?.length || 0)
            : formFieldsConfig.length,
          filledFields: Object.keys(formData).filter(key => formData[key] && formData[key] !== '').length
        },
        stepAssignments: formData.stepAssignments || {},
        requiredAssignments: stepsRequiringAssignment.map(step => ({
          stepId: step.stepId,
          title: step.title,
          assignmentMode: step.assignmentMode,
          assignedTo: formData.stepAssignments?.[step.stepId] || (step.assignmentMode === 'ASSIGN' ? 'current-user' : 'unassigned')
        })),
        userContext: {
          userId: contextProps.userInfo?.id,
          employeeId: contextProps.userInfo?.employeeId,
          fullName: contextProps.userInfo?.fullName,
          email: contextProps.userInfo?.email
        },
        aiRequestContext: {
          purpose: 'quick-solution-suggestion',
          expectedResponse: 'AI should analyze the form data and suggest optimizations, missing fields, or quick solutions'
        }
      };

      console.log('🤖 [Ask AI] Prepared payload for AI service:', ticketData);
      
      // Call the real AI API
      const response = await flowbotClient.getQuickTipsForTicket(ticketData);
      
      console.log('🤖 [Ask AI] API Response:', response);
      
      // Process the response and determine type based on content
      let responseText = '';
      let responseType: 'suggestion' | 'validation' | 'optimization' = 'suggestion';
      
      // Extract text from response - prioritize "quick_tips" field
      if (response && typeof response === 'object' && 'quick_tips' in response) {
        responseText = response.quick_tips as string;
      } else if (typeof response === 'string') {
        responseText = response;
      } else if (response.suggestions) {
        responseText = response.suggestions;
      } else if (response.analysis) {
        responseText = response.analysis;
      } else if (response.recommendations && Array.isArray(response.recommendations)) {
        responseText = response.recommendations.join('\n\n');
      } else {
        // Fallback: stringify the entire response
        responseText = JSON.stringify(response, null, 2);
      }
      
      // Determine response type based on content or form completion
      if (completionPercentage < 50) {
        responseType = 'validation';
      } else if (completionPercentage >= 100) {
        responseType = 'optimization';
      } else {
        responseType = 'suggestion';
      }
      
      setAIResponse(responseText || 'AI analysis completed. No specific recommendations at this time.');
      setAIResponseType(responseType);
      
      console.log('🤖 [Ask AI] Processed response:', { responseType, completionPercentage, responseLength: responseText.length });
      
    } catch (err) {
      console.error('🤖 [Ask AI] API Error:', err);
      
      // Fallback to informative error message
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setAIResponse(`❌ **AI Service Temporarily Unavailable**

We're unable to connect to the AI service right now. This might be due to:

• Network connectivity issues
• Service maintenance
• Authentication problems

**Manual Suggestions:**
• Form completion: ${completionPercentage}%
• ${completionPercentage < 100 ? 'Complete all required fields before submitting' : 'Your form appears complete and ready for submission'}
• Add detailed business justification to speed up approval
• Include any relevant deadlines or urgency information

**Error Details:** ${errorMessage}

Please try again in a few moments, or proceed with submitting your request.`);
      setAIResponseType('validation');
      
      // Also set the error state for debugging
      setError({
        message: `AI Service Error: ${errorMessage}`,
        payload: {
          apiCall: {
            endpoint: 'POST /flowbot/services/quick-tips-for-ticket/',
            baseUrl: 'https://newwork-dev.newwork.com/flowbot'
          },
          error: errorMessage,
          ticketData
        }
      });
    } finally {
      setAILoading(false);
    }
  };

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
          label: currentTemplate.name || (currentTemplate as ServiceRequestTemplate).title
        }}
        headerTitle={`Request: ${currentTemplate.name || (currentTemplate as ServiceRequestTemplate).title}`}
        headerDescription={currentTemplate.description || 'Complete the form below to submit your service request'}
        sectionTitle="Service Request Form"
        sectionDescription={`Fill out the required information to submit your ${(currentTemplate.name || (currentTemplate as ServiceRequestTemplate).title).toLowerCase()}`}
        kpiCardsData={kpiCards}
      >
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-8">
          {/* Main Form Column */}
          <div className="gba:lg:col-span-2 gba:space-y-6">
            {error && (
              <Alert variant="destructive" className="gba:mb-4" style={{ display: 'block' }}>
                <Warning className="gba:h-4 gba:w-4" />
                <h4 className="gba:font-semibold">Request Failed</h4>
                <div style={{ display: 'block', wordWrap: 'break-word', whiteSpace: 'normal' }} className="gba:text-sm gba:mt-2">
                  <strong>Error:</strong> {error.message}
                </div>
                {error.payload && (
                  <div className="gba:mt-4 gba:space-y-4">
                    <div className="gba:text-xs gba:font-semibold gba:text-gray-700">
                      {error.payload.sentPayload ? 
                        '🎯 ACTUAL API Debug Info (from ConductorWorkflowEngineAdapter):' : 
                        '🔍 API Debug Info (Development):'
                      }
                    </div>
                    
                    {/* 1. API Call Information */}
                    {error.payload.apiCall && (
                      <div className="gba:p-3 gba:bg-blue-50 gba:rounded gba:border gba:border-blue-200">
                        <div className="gba:text-xs gba:font-semibold gba:text-blue-800 gba:mb-2">
                          🌐 1. API Call Information
                        </div>
                        <pre className="gba:text-xs gba:text-blue-700 gba:whitespace-pre-wrap gba:font-mono gba:overflow-x-auto">
                          {JSON.stringify(error.payload.apiCall, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {/* 2. Sent Payload */}
                    {error.payload.sentPayload && (
                      <div className="gba:p-3 gba:bg-green-50 gba:rounded gba:border gba:border-green-200">
                        <div className="gba:text-xs gba:font-semibold gba:text-green-800 gba:mb-2">
                          📦 2. Sent Payload to Custom Flow Engine
                        </div>
                        <pre className="gba:text-xs gba:text-green-700 gba:whitespace-pre-wrap gba:font-mono gba:overflow-x-auto">
                          {JSON.stringify(error.payload.sentPayload, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {/* 3. Response Information */}
                    {error.payload.response && (
                      <div className="gba:p-3 gba:bg-red-50 gba:rounded gba:border gba:border-red-200">
                        <div className="gba:text-xs gba:font-semibold gba:text-red-800 gba:mb-2">
                          📤 3. Response from Custom Flow Engine
                        </div>
                        <pre className="gba:text-xs gba:text-red-700 gba:whitespace-pre-wrap gba:font-mono gba:overflow-x-auto">
                          {JSON.stringify(error.payload.response, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    <div className="gba:text-xs gba:text-blue-600 gba:bg-blue-50 gba:p-2 gba:rounded">
                      {error.payload.sentPayload ? (
                        <span>✅ <strong>These show the EXACT API call data!</strong> Compare with browser network tab - each section matches the corresponding network request parts.</span>
                      ) : (
                        <span>💡 <strong>Tip:</strong> Check browser console for ConductorWorkflowEngineAdapter logs to see the actual data sent to custom-flow-engine</span>
                      )}
                    </div>
                  </div>
                )}
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
                  <Alert variant="destructive" className="gba:mb-6" style={{ display: 'block' }}>
                    <Warning className="gba:h-4 gba:w-4" />
                    <h4 className="gba:font-semibold">Data Loading Error</h4>
                    <div style={{ display: 'block', wordWrap: 'break-word', whiteSpace: 'normal' }} className="gba:text-sm gba:mt-2">
                      {dataError || employmentTypesError}
                    </div>
                  </Alert>
                )}

                {/* Conditional Form Rendering */}
                {isFlowTemplate && flowTemplate?.formSchema ? (
                  /* Dynamic Form Generation from Flow Template */
                  <div className="gba:space-y-6">
                    <div className="gba:border-b gba:pb-4">
                      <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">{flowTemplate.name} Details</h3>
                      <p className="gba:text-sm gba:text-gray-600 gba:mt-1">{flowTemplate.description}</p>
                    </div>
                    
                    {/* Render dynamic fields without form wrapper */}
                    <div className="gba:space-y-4">
                      {flowTemplate.formSchema.map((field) => (
                        <div key={field.name} className="gba:space-y-2">
                          <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                            {field.label}
                            {field.required && <span className="gba:text-red-500 gba:ml-1">*</span>}
                          </label>
                          {field.description && (
                            <p className="gba:text-xs gba:text-gray-500">{field.description}</p>
                          )}
                          
                          {/* Render field based on type */}
                          {field.type === 'TEXT' && (
                            <Input
                              id={field.name}
                              value={formData[field.name] || ''}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              placeholder={field.placeholder}
                              required={field.required}
                            />
                          )}
                          
                          {field.type === 'TEXTAREA' && (
                            <Textarea
                              id={field.name}
                              value={formData[field.name] || ''}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              placeholder={field.placeholder}
                              required={field.required}
                              rows={4}
                            />
                          )}
                          
                          {field.type === 'SELECT' && (
                            <Select
                              value={formData[field.name] || ''}
                              onValueChange={(value) => handleFieldChange(field.name, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          
                          {field.type === 'DATE' && (
                            <Input
                              id={field.name}
                              type="date"
                              value={formData[field.name] || ''}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              required={field.required}
                            />
                          )}
                          
                          {field.type === 'NUMBER' && (
                            <Input
                              id={field.name}
                              type="number"
                              value={formData[field.name] || ''}
                              onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || '')}
                              placeholder={field.placeholder}
                              required={field.required}
                            />
                          )}
                          
                          {field.type === 'EMAIL' && (
                            <Input
                              id={field.name}
                              type="email"
                              value={formData[field.name] || ''}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              placeholder={field.placeholder}
                              required={field.required}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Static Form Configuration for Mock Templates */
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
                )}

                <Separator />

                {/* 🌐 UNIVERSAL: Step Assignment Section */}
                {stepsRequiringAssignment.length > 0 && (
                  <div className="gba:space-y-6">
                    <div className="gba:border-l-4 gba:border-blue-500 gba:pl-4 gba:py-2 gba:bg-blue-50">
                      <h4 className="gba:text-base gba:font-semibold gba:flex gba:items-center gba:text-blue-900">
                        <Users className="gba:mr-2" size={16} />
                        Step Assignments
                      </h4>
                      <p className="gba:text-sm gba:text-blue-700 gba:mt-1">
                        This template requires specific step assignments. Steps marked as "ASSIGN" are automatically assigned to you. You can assign "CLAIM" steps to others if needed.
                      </p>
                    </div>

                    {loadingAssignments ? (
                      <div className="gba:flex gba:items-center gba:justify-center gba:p-4">
                        <Spinner size="sm" className="gba:mr-3" />
                        <span className="gba:text-sm gba:text-muted-foreground">Loading required assignments...</span>
                      </div>
                    ) : (
                      <div className="gba:space-y-4">
                        {stepsRequiringAssignment.map((step) => (
                          <div key={step.stepId} className="gba:p-4 gba:border gba:rounded-lg gba:bg-gray-50">
                            <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
                              <div>
                                <h5 className="gba:font-semibold gba:text-gray-900">
                                  {step.title}
                                </h5>
                                <div className="gba:flex gba:items-center gba:space-x-2 gba:mt-1">
                                  <Badge 
                                    variant="outline" 
                                    className={`gba:text-xs ${
                                      step.assignmentMode === 'ASSIGN' 
                                        ? 'gba:bg-green-50 gba:text-green-700 gba:border-green-200' 
                                        : 'gba:bg-blue-50 gba:text-blue-700 gba:border-blue-200'
                                    }`}
                                  >
                                    {step.assignmentMode} Mode
                                  </Badge>
                                  <span className="gba:text-xs gba:text-gray-500">
                                    Step {step.stepIndex + 1}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* ASSIGN Mode - Auto-assigned to current user */}
                            {step.assignmentMode === 'ASSIGN' ? (
                              <div className="gba:space-y-3">
                                <label className="gba:flex gba:items-center gba:text-sm gba:font-semibold gba:text-foreground">
                                  <User className="gba:mr-2 gba:h-4 gba:w-4 gba:text-green-600" />
                                  Assigned to
                                </label>
                                
                                <div className="gba:p-3 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded">
                                  <div className="gba:flex gba:items-center">
                                    <User className="gba:mr-2 gba:h-4 gba:w-4 gba:text-green-600" />
                                    <div>
                                      <span className="gba:font-medium gba:text-green-900">
                                        You (Current User)
                                      </span>
                                      <p className="gba:text-xs gba:text-green-700">
                                        This step is automatically assigned to you as the requester.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* CLAIM Mode - Allow assignment selection */
                              <div className="gba:space-y-3">
                                <label className="gba:flex gba:items-center gba:text-sm gba:font-semibold gba:text-foreground">
                                  <User className="gba:mr-2 gba:h-4 gba:w-4 gba:text-primary" />
                                  Assign to User
                                  <span className="gba:text-destructive gba:ml-1">*</span>
                                </label>
                                
                                <Select 
                                  value={formData.stepAssignments?.[step.stepId] || ''} 
                                  onValueChange={(val) => handleFieldChange(`stepAssignment_${step.stepId}`, val)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select user to assign this step to..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {/* Current user option */}
                                    <SelectItem value={contextProps.userInfo?.id || 'current-user'}>
                                      <div className="gba:flex gba:flex-col">
                                        <span className="gba:font-medium">You (Current User)</span>
                                        <span className="gba:text-xs gba:text-muted-foreground">Handle this step yourself</span>
                                      </div>
                                    </SelectItem>
                                    
                                    <Separator className="gba:my-1" />
                                    
                                    {/* Employee options */}
                                    {getEmployeeOptions(employees).map((emp) => (
                                      <SelectItem key={emp.value} value={emp.value}>
                                        <div className="gba:flex gba:flex-col">
                                          <span className="gba:font-medium">{emp.label}</span>
                                          {emp.jobTitle && <span className="gba:text-xs gba:text-muted-foreground">{emp.jobTitle} • {emp.department}</span>}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                <div className="gba:text-xs gba:text-blue-600 gba:bg-blue-50 gba:p-2 gba:rounded">
                                  ℹ️ This step uses CLAIM mode - you can assign it to yourself or someone else who can claim the task.
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {stepsRequiringAssignment.length > 0 && <Separator />}

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
                <div className="gba:flex gba:flex-col gba:gap-4 gba:pt-6">
                  {/* AI Quick Solution Button */}
                  <button
                    type="button"
                    onClick={handleAskAI}
                    disabled={isLoading || aiLoading}
                    className="gba:w-full gba:py-4 gba:px-6 gba:bg-gradient-to-r gba:from-purple-500 gba:via-violet-500 gba:to-blue-600 hover:gba:from-purple-600 hover:gba:via-violet-600 hover:gba:to-blue-700 gba:text-white gba:font-semibold gba:rounded-lg gba:border-0 gba:shadow-xl hover:gba:shadow-2xl gba:transition-all gba:duration-300 gba:ease-in-out hover:gba:scale-105 active:gba:scale-95 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed disabled:hover:gba:scale-100 gba:relative gba:overflow-hidden gba:group"
                    data-testid="ask-ai-button"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 25%, #6366f1 50%, #3b82f6 75%, #2563eb 100%)',
                      backgroundSize: '200% 200%',
                      animation: 'gradient-shift 3s ease infinite'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundPosition = '100% 0%';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundPosition = '0% 0%';
                    }}
                  >
                    {/* Shimmer overlay effect */}
                    <div 
                      className="gba:absolute gba:inset-0 gba:bg-gradient-to-r gba:from-transparent gba:via-white gba:to-transparent gba:opacity-30"
                      style={{
                        width: '30%',
                        transform: 'translateX(-200%) skewX(-15deg)',
                        animation: 'shimmer 2s ease-in-out infinite'
                      }}
                    ></div>
                    
                    {/* Content */}
                    <div className="gba:relative gba:flex gba:items-center gba:justify-center gba:gap-3 gba:z-10">
                      {aiLoading ? (
                        <>
                          <Spinner size="sm" className="gba:w-6 gba:h-6" />
                          <span className="gba:text-lg gba:font-bold gba:tracking-wide gba:filter gba:drop-shadow-sm">AI is thinking...</span>
                          <Brain className="gba:w-5 gba:h-5 gba:filter gba:drop-shadow-lg gba:animate-pulse" />
                        </>
                      ) : (
                        <>
                          <Robot className="gba:w-6 gba:h-6 gba:filter gba:drop-shadow-lg group-hover:gba:animate-bounce" />
                          <span className="gba:text-lg gba:font-bold gba:tracking-wide gba:filter gba:drop-shadow-sm">Ask AI for quick solution</span>
                          <Sparkle className="gba:w-5 gba:h-5 gba:filter gba:drop-shadow-lg gba:animate-pulse" />
                        </>
                      )}
                    </div>
                    
                    {/* Glow effect */}
                    <div className="gba:absolute gba:inset-0 gba:rounded-lg gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:duration-300" 
                         style={{
                           boxShadow: '0 0 30px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.4)'
                         }}>
                    </div>
                  </button>
                  
                  {/* Primary Actions */}
                  <div className="gba:flex gba:gap-4">
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
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </div>
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
            {/* Process Preview - Only show for mock templates that have steps */}
            {!isFlowTemplate && template && (template as ServiceRequestTemplate).steps && (
              <ProcessStepPreview template={template as ServiceRequestTemplate} />
            )}

            {/* Flow Steps Preview - Show for flow templates */}
            {isFlowTemplate && flowTemplate && flowTemplate.steps && (
              <Card className="gba:p-6 gba:bg-gradient-to-r gba:from-indigo-50 gba:to-blue-50 gba:border-indigo-200">
                <h3 className="gba:text-lg gba:font-bold gba:text-foreground gba:mb-4 gba:flex gba:items-center">
                  <Sparkle className="gba:mr-2 gba:text-indigo-600" size={20} />
                  Workflow Steps
                </h3>
                
                <p className="gba:text-sm gba:text-muted-foreground gba:mb-6">
                  This request will follow {flowTemplate.steps.length} workflow step{flowTemplate.steps.length !== 1 ? 's' : ''}:
                </p>
                
                <div className="gba:space-y-4">
                  {flowTemplate.steps.slice(0, 5).map((step: any, index: number) => {
                    // Helper function to get step type icon and color
                    const getStepTypeInfo = (type: string) => {
                      switch (type) {
                        case 'TASK':
                          return { icon: '📋', color: 'gba:bg-blue-600', bgColor: 'gba:bg-blue-50' };
                        case 'GATEWAY':
                          return { icon: '🔀', color: 'gba:bg-yellow-600', bgColor: 'gba:bg-yellow-50' };
                        case 'SUBPROCESS':
                          return { icon: '⚙️', color: 'gba:bg-purple-600', bgColor: 'gba:bg-purple-50' };
                        default:
                          return { icon: '📝', color: 'gba:bg-gray-600', bgColor: 'gba:bg-gray-50' };
                      }
                    };

                    // Helper function to format assignment info
                    const getAssignmentInfo = (assignment: any) => {
                      if (!assignment) return 'System';
                      
                      const { targets, assignmentMode } = assignment;
                      
                      if (index === 0) return 'You (Requester)';
                      
                      if (targets?.organizationalUnits?.length > 0) {
                        const mode = assignmentMode === 'CLAIM' ? 'Team (any member)' : 'Team (assigned)';
                        return mode;
                      }
                      
                      if (targets?.users?.length > 0) {
                        return assignmentMode === 'CLAIM' ? 'Specific Users' : 'Assigned User';
                      }
                      
                      return assignmentMode === 'CLAIM' ? 'Available Team Member' : 'System Assigned';
                    };

                    // Helper function to format duration
                    const formatDuration = (minutes: number) => {
                      if (!minutes) return 'Variable';
                      
                      if (minutes < 60) return `${minutes} min`;
                      
                      const hours = Math.floor(minutes / 60);
                      const remainingMinutes = minutes % 60;
                      
                      if (hours < 24) {
                        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
                      }
                      
                      const days = Math.floor(hours / 24);
                      const remainingHours = hours % 24;
                      
                      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
                    };

                    const typeInfo = getStepTypeInfo(step.type);
                    const assignmentInfo = getAssignmentInfo(step.assignment);
                    const duration = formatDuration(step.dueInMinutes);

                    return (
                      <div key={step.id || index} className={`gba:p-3 gba:rounded-lg gba:border ${typeInfo.bgColor} gba:border-opacity-30`}>
                        <div className="gba:flex gba:items-start gba:space-x-3">
                          <div className={`gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full ${typeInfo.color} gba:text-white gba:text-xs gba:font-bold gba:flex-shrink-0`}>
                            {index + 1}
                          </div>
                          <div className="gba:flex-1 gba:min-w-0">
                            <div className="gba:flex gba:items-start gba:justify-between gba:mb-1">
                              <h4 className="gba:font-semibold gba:text-sm gba:text-foreground gba:leading-tight">
                                {step.title || `Step ${index + 1}`}
                              </h4>
                              <span className="gba:text-xs gba:text-gray-500 gba:ml-2 gba:flex-shrink-0">
                                {typeInfo.icon}
                              </span>
                            </div>
                            
                            {step.message && (
                              <p className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:leading-relaxed">
                                {step.message}
                              </p>
                            )}
                            
                            <div className="gba:flex gba:items-center gba:justify-between gba:text-xs">
                              <span className="gba:text-muted-foreground">
                                👤 {assignmentInfo}
                              </span>
                              <span className="gba:text-muted-foreground">
                                ⏱️ {duration}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {flowTemplate.steps.length > 5 && (
                    <div className="gba:text-center gba:text-xs gba:text-muted-foreground gba:pt-2 gba:border-t gba:border-gray-200">
                      ... and {flowTemplate.steps.length - 5} more step{flowTemplate.steps.length - 5 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </Card>
            )}

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

      {/* AI Response Modal */}
      <Dialog open={showAIResponse} onOpenChange={setShowAIResponse}>
        <DialogContent className="gba:max-w-4xl gba:max-h-[80vh] gba:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-3 gba:text-2xl">
              <div className="gba:p-2 gba:rounded-full gba:bg-gradient-to-r gba:from-purple-500 gba:to-blue-500">
                <Brain className="gba:w-6 gba:h-6 gba:text-white" />
              </div>
              AI Assistant Response
              {aiResponseType === 'validation' && <ShieldCheck className="gba:w-5 gba:h-5 gba:text-orange-500" />}
              {aiResponseType === 'optimization' && <Target className="gba:w-5 gba:h-5 gba:text-green-500" />}
              {aiResponseType === 'suggestion' && <Lightbulb className="gba:w-5 gba:h-5 gba:text-blue-500" />}
            </DialogTitle>
            <DialogDescription className="gba:text-gray-600">
              AI-powered analysis of your service request form
            </DialogDescription>
          </DialogHeader>

          <div className="gba:space-y-6 gba:py-4">
            {/* Loading State */}
            {aiLoading ? (
              <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:space-y-4">
                <div className="gba:relative">
                  <div className="gba:w-16 gba:h-16 gba:border-4 gba:border-purple-200 gba:border-t-purple-500 gba:rounded-full gba:animate-spin"></div>
                  <Brain className="gba:absolute gba:top-1/2 gba:left-1/2 gba:transform gba:-translate-x-1/2 gba:-translate-y-1/2 gba:w-6 gba:h-6 gba:text-purple-500" />
                </div>
                <div className="gba:text-center">
                  <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800">AI is analyzing your form...</h3>
                  <p className="gba:text-sm gba:text-gray-600 gba:mt-2">
                    Reviewing {Object.keys(formData).length} form fields and generating personalized suggestions
                  </p>
                </div>
              </div>
            ) : (
              /* AI Response Content */
              <div className="gba:space-y-6">
                {/* Response Type Badge */}
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Badge 
                    variant="outline" 
                    className={`gba:px-3 gba:py-1 gba:text-sm gba:font-medium ${
                      aiResponseType === 'validation' 
                        ? 'gba:bg-orange-50 gba:text-orange-700 gba:border-orange-200' 
                        : aiResponseType === 'optimization'
                        ? 'gba:bg-green-50 gba:text-green-700 gba:border-green-200'
                        : 'gba:bg-blue-50 gba:text-blue-700 gba:border-blue-200'
                    }`}
                  >
                    {aiResponseType === 'validation' && '🔍 Form Validation'}
                    {aiResponseType === 'optimization' && '✨ Optimization'}
                    {aiResponseType === 'suggestion' && '💡 Smart Suggestions'}
                  </Badge>
                  <Badge variant="outline" className="gba:text-xs gba:bg-gray-50">
                    Form Completion: {completionPercentage}%
                  </Badge>
                </div>

                {/* AI Response Text */}
                <Card className="gba:p-6 gba:bg-gradient-to-br gba:from-gray-50 gba:to-white gba:border-l-4 gba:border-l-purple-500">
                  <div className="gba:prose gba:prose-sm gba:max-w-none">
                    <div 
                      className="gba:whitespace-pre-line gba:text-gray-800 gba:leading-relaxed"
                      dangerouslySetInnerHTML={parseMarkdownForReact(aiResponse)}
                    />
                  </div>
                </Card>

                {/* Action Buttons */}
                <div className="gba:flex gba:gap-3 gba:pt-4 gba:border-t gba:border-gray-200">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(aiResponse);
                      // Could add a toast notification here
                    }}
                    variant="outline"
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <Copy className="gba:w-4 gba:h-4" />
                    Copy Response
                  </Button>
                  
                  <Button
                    onClick={() => {
                      // Could implement feedback functionality
                      console.log('👍 AI Response feedback: Helpful');
                    }}
                    variant="outline"
                    className="gba:flex gba:items-center gba:gap-2 gba:text-green-600 hover:gba:bg-green-50"
                  >
                    <ThumbsUp className="gba:w-4 gba:h-4" />
                    Helpful
                  </Button>

                  <Button
                    onClick={() => setShowAIResponse(false)}
                    className="gba:ml-auto gba:bg-purple-500 hover:gba:bg-purple-600"
                  >
                    Got it, thanks!
                  </Button>
                </div>

                {/* Pro Tip */}
                <div className="gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded-lg gba:p-4">
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <Lightbulb className="gba:w-5 gba:h-5 gba:text-blue-500 gba:mt-0.5 gba:flex-shrink-0" />
                    <div>
                      <h4 className="gba:font-semibold gba:text-blue-800 gba:text-sm">Pro Tip</h4>
                      <p className="gba:text-blue-700 gba:text-sm gba:mt-1">
                        You can ask the AI for help again after making changes to your form. The suggestions will be updated based on your progress!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};