import React, { useState, useEffect, useMemo } from 'react';
import { 
  PageLayout, 
  Card, 
  Button, 
  Badge, 
  Alert,
  Spinner,
  type KpiCardData
} from '@newwork/nw-design-system';
import { ServiceCategory, ServiceRequestTemplate, FlowTemplate } from '../../../types';
import { getCategoryById } from '../../../data';
import { getCategoryIcon } from '../../../utils/iconMapping';
import { useSharedFlowTemplates } from '../../../hooks/useSharedFlowTemplates';
import { FlowTemplateCard } from './FlowTemplateCard';
import { FlowTemplatesDetail } from './FlowTemplatesDetail';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  ArrowLeft, 
  ClockCounterClockwise, 
  Users,
  Lightning,
  Star,
  ArrowRight,
  Tree,
  Warning
} from '@phosphor-icons/react';
import { ArrowLeftOutlined } from '@ant-design/icons';

export interface ServiceDetailProps extends BusinessAppContextProps {
  categoryId: string;
  onRequestService: (template: ServiceRequestTemplate) => void;
  onRequestFlowTemplate?: (template: FlowTemplate) => void;
  onBack: () => void;
}

interface ServiceTemplateCardProps {
  template: ServiceRequestTemplate;
  category: ServiceCategory;
  onRequest: () => void;
}

const ServiceTemplateCard: React.FC<ServiceTemplateCardProps> = ({
  template,
  category,
  onRequest
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = getCategoryIcon(category.id);

  // Calculate estimated time based on steps
  const estimatedTime = `${template.steps.length * 1}-${template.steps.length * 2} days`;
  
  // Get difficulty level based on number of steps
  const getDifficultyLevel = () => {
    if (template.steps.length <= 2) return { label: 'Simple', color: 'gba:text-green-600 gba:bg-green-50', icon: Lightning };
    if (template.steps.length <= 4) return { label: 'Standard', color: 'gba:text-blue-600 gba:bg-blue-50', icon: ClockCounterClockwise };
    return { label: 'Complex', color: 'gba:text-orange-600 gba:bg-orange-50', icon: Star };
  };

  const difficulty = getDifficultyLevel();

  return (
    <Card 
      className={`gba:h-full gba:flex gba:flex-col gba:transition-all gba:duration-300 gba:cursor-pointer ${
        isHovered 
          ? 'gba:shadow-xl gba:border-primary gba:scale-[1.02] gba:bg-gradient-to-br gba:from-primary-50 gba:to-background' 
          : 'gba:shadow-md hover:gba:shadow-lg'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header with Icon and Status - Fixed Height */}
      <div className="gba:p-4 gba:pb-3">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
          <div 
            className={`gba:p-2 gba:rounded-lg gba:transition-all gba:duration-300 gba:flex gba:items-center gba:justify-center ${
              isHovered 
                ? 'gba:bg-blue-600 gba:text-white' 
                : 'gba:bg-blue-100 gba:text-blue-600'
            }`}
          >
            <IconComponent 
              size={20} 
              className={`gba:transition-colors gba:duration-300 ${
                isHovered ? 'gba:text-white' : 'gba:text-blue-600'
              }`}
            />
          </div>
          
          <div className="gba:flex gba:gap-2">
            <Badge 
              variant={template.enabled ? "default" : "secondary"}
              className={template.enabled ? "gba:bg-green-100 gba:text-green-800" : ""}
            >
              {template.enabled ? 'Available' : 'Unavailable'}
            </Badge>
            <Badge variant="outline" className="gba:text-xs">
              {category.name}
            </Badge>
          </div>
        </div>

        {/* Title and Description */}
        <div className="gba:mb-3">
          <h3 className="gba:text-lg gba:font-bold gba:text-foreground gba:mb-2 gba:leading-tight">
            {template.title}
          </h3>
          {template.description && (
            <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed gba:line-clamp-2">
              {template.description}
            </p>
          )}
        </div>
      </div>

      {/* Main Content Area - Flexible Height */}
      <div className="gba:flex-1 gba:px-4">
        {/* Quick Info Grid */}
        <div className="gba:grid gba:grid-cols-3 gba:gap-2 gba:mb-3">
          <div className="gba:text-center gba:p-2 gba:rounded-lg gba:bg-background">
            <ClockCounterClockwise className="gba:mx-auto gba:mb-1 gba:text-muted-foreground" size={14} />
            <div className="gba:text-xs gba:font-medium gba:text-foreground">{estimatedTime}</div>
            <div className="gba:text-xs gba:text-muted-foreground">Est. Time</div>
          </div>
          
          <div className="gba:text-center gba:p-2 gba:rounded-lg gba:bg-background">
            <Users className="gba:mx-auto gba:mb-1 gba:text-muted-foreground" size={14} />
            <div className="gba:text-xs gba:font-medium gba:text-foreground">{template.steps.length}</div>
            <div className="gba:text-xs gba:text-muted-foreground">Steps</div>
          </div>
          
          <div className="gba:text-center gba:p-2 gba:rounded-lg gba:bg-background">
            <div className={`gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${difficulty.color}`}>
              <difficulty.icon className="gba:mr-1" size={10} />
              {difficulty.label}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer - Always at Bottom */}
      <div className="gba:p-4 gba:pt-3 gba:border-t gba:border-border">
        <Button 
          onClick={onRequest}
          className={`gba:w-full gba:transition-all gba:duration-300 ${
            isHovered ? 'gba:bg-primary' : ''
          }`}
          disabled={!template.enabled}
          size="sm"
        >
          <span className="gba:mr-2">Request Service</span>
          <ArrowRight size={14} />
        </Button>
      </div>
    </Card>
  );
};

export const ServiceDetail: React.FC<ServiceDetailProps> = ({
  categoryId,
  onRequestService,
  onRequestFlowTemplate,
  onBack,
  ...contextProps
}) => {
  // Special handling for Flow Templates category
  if (categoryId === 'flow-templates') {
    console.log('🎭 [ServiceDetail] Rendering FlowTemplatesDetail for category:', categoryId);
    return (
      <FlowTemplatesDetail
        {...contextProps}
        onRequestFlowTemplate={onRequestFlowTemplate}
        onBack={onBack}
      />
    );
  }

  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch flow templates from custom-flow-engine using shared service
  const { 
    templates: flowTemplates, 
    isLoading: flowTemplatesLoading, 
    error: flowTemplatesError,
    refetch: refetchFlowTemplates,
    totalCount: flowTemplatesCount
  } = useSharedFlowTemplates(contextProps, { 
    categoryId: categoryId, // Will be filtered once we add category support
    enabled: true,
    limit: 100
  });

  useEffect(() => {
    console.log('🎭 [ServiceDetail] Component mounting with categoryId:', categoryId);
    
    const loadCategory = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const categoryData = getCategoryById(categoryId);
        if (!categoryData) {
          throw new Error(`Category ${categoryId} not found`);
        }
        
        console.log('🎭 [ServiceDetail] Category loaded:', categoryData.name);
        setCategory(categoryData);
      } catch (err) {
        console.error('🎭 [ServiceDetail] Error loading category:', err);
        setError(err instanceof Error ? err.message : 'Failed to load category');
      } finally {
        setIsLoading(false);
      }
    };

    loadCategory();
  }, [categoryId]);

  // Debug effect for flow templates
  useEffect(() => {
    console.log('🎭 [ServiceDetail] Flow templates state changed:', {
      loading: flowTemplatesLoading,
      error: flowTemplatesError,
      count: flowTemplates.length,
      templates: flowTemplates.map(t => ({ id: t.id, name: t.name }))
    });
  }, [flowTemplates, flowTemplatesLoading, flowTemplatesError]);

  // Mock service templates for the category with richer data
  const mockServiceTemplates: ServiceRequestTemplate[] = useMemo(() => {
    if (!category) return [];

    const templates: Record<string, ServiceRequestTemplate[]> = {
      'hr': [
        {
          id: 'hr-onboard',
          categoryId: 'hr',
          key: 'hr-onboard',
          title: 'Employee Onboarding',
          description: 'Comprehensive onboarding process for new employees including IT setup, workspace preparation, orientation scheduling, and documentation completion.',
          formSchema: { type: 'object', properties: {} },
          steps: [
            { id: 'hr-review', name: 'HR Initial Review', receiver: 'HR', requires: [] },
            { id: 'it-setup', name: 'IT Account & Equipment Setup', receiver: 'IT', requires: ['hr-review'] },
            { id: 'workspace-setup', name: 'Workspace & Badge Setup', receiver: 'Facilities', requires: ['hr-review'] },
            { id: 'orientation', name: 'Orientation Scheduling', receiver: 'HR', requires: ['it-setup'] }
          ],
          version: 1,
          enabled: true
        },
        {
          id: 'hr-contract-change',
          categoryId: 'hr',
          key: 'hr-contract-change',
          title: 'Employment Contract Modification',
          description: 'Request changes to employment terms including salary adjustments, role changes, or benefit modifications with full legal review process.',
          formSchema: { type: 'object', properties: {} },
          steps: [
            { id: 'hr-review', name: 'HR Business Review', receiver: 'HR', requires: [] },
            { id: 'legal-review', name: 'Legal Compliance Review', receiver: 'Legal', requires: ['hr-review'] },
            { id: 'approval', name: 'Executive Approval', receiver: 'Admin', requires: ['legal-review'] }
          ],
          version: 1,
          enabled: true
        },
        {
          id: 'hr-leave-request',
          categoryId: 'hr',
          key: 'hr-leave-request',
          title: 'Extended Leave Request',
          description: 'Submit requests for extended leave including vacation, medical, or personal leave with proper documentation and approval workflow.',
          formSchema: { type: 'object', properties: {} },
          steps: [
            { id: 'hr-review', name: 'HR Policy Review', receiver: 'HR', requires: [] },
            { id: 'manager-approval', name: 'Manager Approval', receiver: 'Admin', requires: ['hr-review'] }
          ],
          version: 1,
          enabled: true
        }
      ],
      'it': [
        {
          id: 'it-hardware',
          categoryId: 'it',
          key: 'it-hardware',
          title: 'Hardware Equipment Request',
          description: 'Request new computer equipment, monitors, peripherals, or other IT hardware with budget approval and procurement process.',
          formSchema: { type: 'object', properties: {} },
          steps: [
            { id: 'it-review', name: 'Technical Requirements Review', receiver: 'IT', requires: [] },
            { id: 'budget-approval', name: 'Budget & Procurement Approval', receiver: 'Finance', requires: ['it-review'] },
            { id: 'procurement', name: 'Hardware Procurement', receiver: 'Procurement', requires: ['budget-approval'] },
            { id: 'delivery', name: 'Delivery & Setup', receiver: 'IT', requires: ['procurement'] }
          ],
          version: 1,
          enabled: true
        },
        {
          id: 'it-software-access',
          categoryId: 'it',
          key: 'it-software-access',
          title: 'Software Access & Licensing',
          description: 'Request access to software applications, cloud services, or professional tools with proper licensing and security review.',
          formSchema: { type: 'object', properties: {} },
          steps: [
            { id: 'it-review', name: 'Technical Assessment', receiver: 'IT', requires: [] },
            { id: 'security-review', name: 'Security Compliance Review', receiver: 'Security', requires: ['it-review'] },
            { id: 'license-provision', name: 'License Provisioning', receiver: 'IT', requires: ['security-review'] }
          ],
          version: 1,
          enabled: true
        }
      ],
      'finance': [
        {
          id: 'finance-expense-approval',
          categoryId: 'finance',
          key: 'finance-expense-approval',
          title: 'Expense Approval Request',
          description: 'Submit business expenses for approval including travel, training, equipment, or other business-related expenditures.',
          formSchema: { type: 'object', properties: {} },
          steps: [
            { id: 'finance-review', name: 'Finance Policy Review', receiver: 'Finance', requires: [] },
            { id: 'manager-approval', name: 'Manager Approval', receiver: 'Admin', requires: ['finance-review'] }
          ],
          version: 1,
          enabled: true
        }
      ]
    };

    return templates[categoryId] || [
      {
        id: `${categoryId}-general`,
        categoryId,
        key: `${categoryId}-general`,
        title: 'General Service Request',
        description: `General service request for ${category.name} with standard approval workflow.`,
        formSchema: { type: 'object', properties: {} },
        steps: [
          { id: 'review', name: 'Initial Review', receiver: 'Admin Team', requires: [] },
          { id: 'approval', name: 'Final Approval', receiver: 'Management', requires: ['review'] }
        ],
        version: 1,
        enabled: true
      }
    ];
  }, [category, categoryId]);

  // Enhanced KPI cards
  const kpiCards: KpiCardData[] = useMemo(() => {
    if (!category) return [];
    
    const totalTemplates = mockServiceTemplates.filter(t => t.enabled).length + flowTemplates.length;
    
    return [
      {
        id: 'available-services',
        title: 'Available Services',
        value: totalTemplates,
        description: `${flowTemplates.length} live + ${mockServiceTemplates.filter(t => t.enabled).length} mock`
      },
      {
        id: 'flow-templates',
        title: 'Flow Templates', 
        value: flowTemplates.length,
        description: 'Live from workflow engine'
      },
      {
        id: 'avg-processing-time',
        title: 'Avg. Processing Time',
        value: '2-4 days',
        description: 'Typical completion time'
      },
      {
        id: 'success-rate',
        title: 'Success Rate',
        value: '98%',
        description: 'Successfully completed'
      }
    ];
  }, [category, mockServiceTemplates, flowTemplates]);

  if (isLoading) {
    return (
      <PageLayout
        headerTitle="Loading Services..."
        headerDescription="Please wait while we load the service information"
      >
        <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
          <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  if (error || !category) {
    return (
      <div data-testid="service-detail-error-container" style={{ backgroundColor: "white", padding: "16px" }}>
        {/* Back navigation */}
        <div className="gba:back-navigation" style={{ marginBottom: "16px" }}>
          <button
            onClick={onBack}
            className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
            data-testid="back-button"
          >
            <ArrowLeftOutlined className="gba:mr-2" />
            <span>Back to Catalog</span>
          </button>
        </div>
        
        <PageLayout
          headerTitle="Error Loading Services"
          headerDescription="Unable to load the requested service category"
        >
        <Alert variant="destructive">
          <h4 className="gba:font-semibold">Service Category Not Found</h4>
          <p>{error || 'The requested service category could not be found.'}</p>
        </Alert>
        </PageLayout>
      </div>
    );
  }

  const IconComponent = getCategoryIcon(category.id);

  return (
    <div data-testid="service-detail-container" style={{ backgroundColor: "white", padding: "16px" }}>
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: "16px" }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>Back to Catalog</span>
        </button>
      </div>
      
      <PageLayout
        headerPhosphorIcon={{
          icon: IconComponent,
          variant: "strategy",
          size: "lg",
          label: category.name
        }}
        headerTitle={category.name}
        headerDescription={category.description}
        sectionTitle="Available Services"
        sectionDescription={`Choose from ${flowTemplates.length + mockServiceTemplates.length} total service${flowTemplates.length + mockServiceTemplates.length !== 1 ? 's' : ''} in the ${category.name} category`}
        kpiCardsData={kpiCards}
      >
        {/* Flow Templates Section (Live from custom-flow-engine) */}
        {/* Always show the section for debugging - will show loading, error, or empty state */}
        {true && (
          <div className="gba:space-y-6 gba:mb-8">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Tree className="gba:w-5 gba:h-5 gba:text-indigo-600" />
                  <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Flow Templates</h2>
                </div>
                <Badge variant="outline" className="gba:text-xs gba:bg-indigo-50 gba:text-indigo-700 gba:border-indigo-300">
                  Live Data
                </Badge>
                {flowTemplatesLoading && (
                  <Spinner className="gba:w-4 gba:h-4 gba:text-indigo-600" />
                )}
              </div>
              
              <div className="gba:flex gba:gap-2">
                {flowTemplatesError && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={refetchFlowTemplates}
                    className="gba:text-xs"
                  >
                    Retry
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.log('🎭 [ServiceDetail] Manual refresh clicked');
                    refetchFlowTemplates();
                  }}
                  className="gba:text-xs"
                >
                  Refresh Templates
                </Button>
              </div>
            </div>

            <p className="gba:text-sm gba:text-gray-600">
              Dynamic templates from the workflow engine with automatic form generation based on template definitions.
            </p>

            {/* Flow Templates Loading State */}
            {flowTemplatesLoading && (
              <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2 gba:xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="gba:h-64 gba:animate-pulse">
                    <div className="gba:p-6 gba:space-y-4">
                      <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
                      <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-1/2"></div>
                      <div className="gba:space-y-2">
                        <div className="gba:h-3 gba:bg-gray-200 gba:rounded"></div>
                        <div className="gba:h-3 gba:bg-gray-200 gba:rounded gba:w-5/6"></div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Flow Templates Error State */}
            {flowTemplatesError && !flowTemplatesLoading && (
              <Alert variant="destructive">
                <Warning className="gba:h-4 gba:w-4" />
                <div>
                  <p className="gba:font-semibold">Failed to Load Flow Templates</p>
                  <p className="gba:text-sm">{flowTemplatesError}</p>
                </div>
              </Alert>
            )}

            {/* Flow Templates Grid */}
            {!flowTemplatesLoading && !flowTemplatesError && flowTemplates.length > 0 && (
              <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2 gba:xl:grid-cols-3">
                {flowTemplates.map((template) => (
                  <FlowTemplateCard
                    key={template.id || template.name}
                    template={template}
                    onRequest={() => onRequestFlowTemplate?.(template)}
                  />
                ))}
              </div>
            )}

            {/* Debug Information */}
            <div className="gba:p-4 gba:bg-gray-50 gba:rounded-lg gba:text-xs gba:text-gray-600">
              <div><strong>Flow Templates Debug Info:</strong></div>
              <div>• Loading: {flowTemplatesLoading ? 'Yes' : 'No'}</div>
              <div>• Error: {flowTemplatesError || 'None'}</div>
              <div>• Templates Count: {flowTemplates.length}</div>
              <div>• Total Count: {flowTemplatesCount}</div>
              <div>• Category ID: {categoryId}</div>
              <div>• Hook Enabled: Yes</div>
              <div>• Console Tags: Look for "🎭 [useSharedFlowTemplates]" and "🎯 [TemplatesService]"</div>
              <div>• Backend Expected: localhost:3000</div>
              {flowTemplatesError && (
                <div className="gba:mt-2 gba:p-2 gba:bg-red-50 gba:rounded gba:border gba:border-red-200">
                  <div className="gba:font-semibold gba:text-red-800">💡 Troubleshooting:</div>
                  <div className="gba:text-red-700">1. Start custom-flow-engine: cd custom-flow-engine && npm start</div>
                  <div className="gba:text-red-700">2. Verify http://localhost:3000/api/templates responds</div>
                  <div className="gba:text-red-700">3. Check console for connection errors</div>
                </div>
              )}
            </div>

            {/* No Flow Templates */}
            {!flowTemplatesLoading && !flowTemplatesError && flowTemplates.length === 0 && (
              <div className="gba:text-center gba:py-8 gba:border-2 gba:border-dashed gba:border-gray-200 gba:rounded-lg">
                <Tree className="gba:w-8 gba:h-8 gba:text-gray-400 gba:mx-auto gba:mb-2" />
                <p className="gba:text-sm gba:text-gray-500">No flow templates available for this category</p>
                <p className="gba:text-xs gba:text-gray-400 gba:mt-2">Make sure custom-flow-engine is running on localhost:3000</p>
              </div>
            )}
          </div>
        )}

        {/* Mock Templates Section */}
        {mockServiceTemplates.length > 0 && (
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-3">
              <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Mock Templates</h2>
              <Badge variant="outline" className="gba:text-xs gba:bg-gray-50 gba:text-gray-600 gba:border-gray-300">
                Development
              </Badge>
            </div>
            
            <p className="gba:text-sm gba:text-gray-600">
              Static templates for development and testing purposes with predefined forms.
            </p>

            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2 gba:xl:grid-cols-3">
              {mockServiceTemplates.map((template) => (
                <ServiceTemplateCard
                  key={template.id}
                  template={template}
                  category={category}
                  onRequest={() => onRequestService(template)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Both Sections Empty */}
        {!flowTemplatesLoading && flowTemplates.length === 0 && mockServiceTemplates.length === 0 && (
          <div className="gba:text-center gba:py-16">
            <div className="gba:mx-auto gba:w-24 gba:h-24 gba:bg-muted gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-6">
              <IconComponent className="gba:h-12 gba:w-12 gba:text-muted-foreground" />
            </div>
            <h3 className="gba:text-xl gba:font-semibold gba:mb-2">No Services Available</h3>
            <p className="gba:text-muted-foreground gba:mb-6 gba:max-w-md gba:mx-auto">
              There are currently no service templates available in the {category.name} category. 
              Please check back later or contact your system administrator.
            </p>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="gba:mr-2 gba:h-4 gba:w-4" />
              Browse Other Categories
            </Button>
          </div>
        )}
      </PageLayout>
    </div>
  );
};