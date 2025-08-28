import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { FlowTemplateList } from './components/FlowTemplateList';
import { FlowPreview } from './components/FlowPreview';
import { FlowWizardDialog } from './components/wizard/FlowWizardDialog';
import { AIFlowGenerator } from './components/AIFlowGenerator';
import { useFlowTemplateStore } from './hooks/useFlowTemplateStore';
import { useWizardStore } from './hooks/useWizardStore';
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient';
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient';
import { Spinner, Alert, AlertDescription, Button, Tabs, TabsContent, TabsList, TabsTrigger, Card, CardContent, CardHeader, CardTitle, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { Settings, FileText, Users, CheckCircle, MessageSquare, ClipboardList, RefreshCw, Building2, Briefcase, Heart, Truck, ShoppingCart, Banknote, Shield, Factory, Wrench, UserCheck, Calculator, TrendingUp, Headphones, Cpu, Globe, Calendar, Zap, Sparkles } from 'lucide-react';
import { MockDataProvider } from '../../providers/MockDataProvider';
import { FlowDesigner } from './components/designer/FlowDesigner';

/**
 * Flow Creator App component for defining workflow templates
 */
interface FlowCreatorProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const FlowCreator: React.FC<FlowCreatorProps> = ({ 
  accessToken,
  userInfo,
  'data-testid': testId = 'flow-creator'
}) => {
  // API Integration
  const flowTemplateClient = useFlowTemplateClient(accessToken);
  
  // State management
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showDesigner, setShowDesigner] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<FlowTemplate | null>(null);
  
  // AI Creation state

  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const { resetTemplate } = useFlowTemplateStore();
  // Sync with URL hash for deep links (#create, #manage)
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'create' || hash === 'manage') {
        setActiveTab(hash);
      }
    };
    applyHash();
    const handler = () => applyHash();
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  useEffect(() => {
    const current = window.location.hash.replace('#', '');
    if (current !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  // Business patterns with expanded sub-patterns
  const businessPatterns = [
    {
      id: 'approval',
      name: 'Approval Workflows',
      description: 'Get authorization and sign-offs from stakeholders',
      icon: CheckCircle,
      color: 'gba:bg-blue-100 gba:text-blue-600',
      subPatterns: [
        {
          id: 'document-approval',
          name: 'Document Approval',
          description: 'Multi-step document review and approval process',
          steps: ['Submit Document', 'Manager Review', 'Department Head Approval', 'Final Approval'],
          roles: ['Submitter', 'Manager', 'Department Head', 'Approver']
        },
        {
          id: 'expense-approval',
          name: 'Expense Approval',
          description: 'Expense report review and reimbursement workflow',
          steps: ['Submit Expense', 'Manager Review', 'Finance Approval', 'Payment Processing'],
          roles: ['Employee', 'Manager', 'Finance Team', 'Accounting']
        },
        {
          id: 'leave-request',
          name: 'Leave Request',
          description: 'Time-off request and approval workflow',
          steps: ['Submit Request', 'Manager Approval', 'HR Review', 'Calendar Update'],
          roles: ['Employee', 'Manager', 'HR Team']
        },
        {
          id: 'budget-approval',
          name: 'Budget Approval',
          description: 'Budget proposal review and approval process',
          steps: ['Submit Proposal', 'Department Review', 'Finance Review', 'Executive Approval'],
          roles: ['Requestor', 'Department Head', 'Finance Team', 'Executive']
        }
      ]
    },
    {
      id: 'information',
      name: 'Information Distribution',
      description: 'Share announcements and updates across teams',
      icon: MessageSquare,
      color: 'gba:bg-green-100 gba:text-green-600',
      subPatterns: [
        {
          id: 'company-announcement',
          name: 'Company Announcement',
          description: 'Broadcast important company news and updates',
          steps: ['Create Announcement', 'Review Content', 'Schedule Distribution', 'Send Notification'],
          roles: ['Content Creator', 'Reviewer', 'Communications Team']
        },
        {
          id: 'policy-update',
          name: 'Policy Update',
          description: 'Communicate policy changes across organization',
          steps: ['Policy Review', 'Update Documentation', 'Notify Stakeholders', 'Collect Acknowledgments'],
          roles: ['Policy Owner', 'Legal Team', 'HR Team', 'Employees']
        },
        {
          id: 'newsletter',
          name: 'Newsletter Distribution',
          description: 'Regular newsletter creation and distribution',
          steps: ['Collect Content', 'Design Newsletter', 'Review & Approve', 'Distribute'],
          roles: ['Content Team', 'Designer', 'Editor', 'Distribution Manager']
        }
      ]
    },
    {
      id: 'coordination',
      name: 'Task Coordination',
      description: 'Assign and track work across team members',
      icon: Users,
      color: 'gba:bg-orange-100 gba:text-orange-600',
      subPatterns: [
        {
          id: 'project-tasks',
          name: 'Project Task Management',
          description: 'Coordinate project tasks across team members',
          steps: ['Define Tasks', 'Assign Resources', 'Track Progress', 'Review Completion'],
          roles: ['Project Manager', 'Team Members', 'Stakeholders']
        },
        {
          id: 'onboarding',
          name: 'Employee Onboarding',
          description: 'Complete onboarding workflow for new employees',
          steps: ['Welcome Process', 'Setup Accounts', 'Training Schedule', 'Integration Check'],
          roles: ['HR Team', 'IT Team', 'Manager', 'Buddy']
        },
        {
          id: 'code-review',
          name: 'Code Review Process',
          description: 'Systematic code review and approval workflow',
          steps: ['Submit Code', 'Peer Review', 'Testing', 'Merge Approval'],
          roles: ['Developer', 'Reviewer', 'QA Team', 'Tech Lead']
        }
      ]
    },
    {
      id: 'decision',
      name: 'Decision Making',
      description: 'Gather insights and feedback for informed decisions',
      icon: ClipboardList,
      color: 'gba:bg-purple-100 gba:text-purple-600',
      subPatterns: [
        {
          id: 'feature-prioritization',
          name: 'Feature Prioritization',
          description: 'Collaborative feature planning and prioritization',
          steps: ['Collect Ideas', 'Evaluate Impact', 'Stakeholder Review', 'Priority Decision'],
          roles: ['Product Manager', 'Engineering Team', 'Stakeholders', 'Leadership']
        },
        {
          id: 'vendor-selection',
          name: 'Vendor Selection',
          description: 'Systematic vendor evaluation and selection process',
          steps: ['Define Requirements', 'Vendor Research', 'Evaluation Matrix', 'Final Decision'],
          roles: ['Procurement Team', 'Technical Team', 'Finance Team', 'Decision Maker']
        },
        {
          id: 'strategic-planning',
          name: 'Strategic Planning',
          description: 'Long-term strategic decision making process',
          steps: ['Market Analysis', 'Option Generation', 'Impact Assessment', 'Strategic Decision'],
          roles: ['Strategy Team', 'Analysts', 'Leadership', 'Board Members']
        }
      ]
    },
    {
      id: 'surveys',
      name: 'Surveys & Feedback',
      description: 'Collect feedback and opinions through structured surveys',
      icon: MessageSquare,
      color: 'gba:bg-red-100 gba:text-red-600',
      subPatterns: [
        {
          id: 'employee-satisfaction',
          name: 'Employee Satisfaction Survey',
          description: 'Regular employee satisfaction and engagement survey',
          steps: ['Design Survey', 'Distribute to Employees', 'Collect Responses', 'Analyze Results'],
          roles: ['HR Team', 'Employees', 'Management', 'Analytics Team']
        },
        {
          id: 'customer-feedback',
          name: 'Customer Feedback Collection',
          description: 'Systematic customer feedback and satisfaction tracking',
          steps: ['Send Survey', 'Collect Feedback', 'Analyze Sentiment', 'Action Planning'],
          roles: ['Customer Success', 'Customers', 'Product Team', 'Management']
        },
        {
          id: 'event-evaluation',
          name: 'Event Evaluation',
          description: 'Post-event feedback collection and analysis',
          steps: ['Event Completion', 'Send Evaluation', 'Gather Feedback', 'Improvement Planning'],
          roles: ['Event Organizer', 'Attendees', 'Analysis Team']
        }
      ]
    },
    {
      id: 'request',
      name: 'Request & Response',
      description: 'Submit requests and manage responses efficiently',
      icon: RefreshCw,
      color: 'gba:bg-cyan-100 gba:text-cyan-600',
      subPatterns: [
        {
          id: 'it-support',
          name: 'IT Support Request',
          description: 'IT help desk and support ticket workflow',
          steps: ['Submit Ticket', 'Triage Request', 'Assign Technician', 'Resolve & Close'],
          roles: ['Employee', 'Help Desk', 'IT Technician', 'Supervisor']
        },
        {
          id: 'resource-request',
          name: 'Resource Request',
          description: 'Request and approval workflow for resources',
          steps: ['Submit Request', 'Manager Review', 'Resource Allocation', 'Delivery Confirmation'],
          roles: ['Requestor', 'Manager', 'Resource Manager', 'Admin']
        },
        {
          id: 'service-inquiry',
          name: 'Service Inquiry',
          description: 'Customer service inquiry and resolution workflow',
          steps: ['Receive Inquiry', 'Route to Expert', 'Provide Solution', 'Follow-up'],
          roles: ['Customer', 'Service Rep', 'Subject Expert', 'Quality Team']
        }
      ]
    }
  ];

  // State for expanded patterns
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [selectedSubPattern, setSelectedSubPattern] = useState<any>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [patternMode, setPatternMode] = useState<'general' | 'industry' | 'department'>('general');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Core Industry categories (focus on internal processes)
  const industryCategories = [
    {
      id: 'manufacturing',
      name: 'Manufacturing',
      icon: Factory,
      color: 'gba:bg-orange-100 gba:text-orange-600',
    },
    {
      id: 'finance',
      name: 'Financial Services',
      icon: Banknote,
      color: 'gba:bg-green-100 gba:text-green-600',
    },
    {
      id: 'healthcare',
      name: 'Healthcare',
      icon: Heart,
      color: 'gba:bg-red-100 gba:text-red-600',
    },
    {
      id: 'retail',
      name: 'Retail & Commerce',
      icon: ShoppingCart,
      color: 'gba:bg-purple-100 gba:text-purple-600',
    },
    {
      id: 'technology',
      name: 'Technology & Software',
      icon: Cpu,
      color: 'gba:bg-blue-100 gba:text-blue-600',
    },
    {
      id: 'logistics',
      name: 'Logistics & Supply Chain',
      icon: Truck,
      color: 'gba:bg-indigo-100 gba:text-indigo-600',
    },
    {
      id: 'energy',
      name: 'Energy & Utilities',
      icon: Zap,
      color: 'gba:bg-yellow-100 gba:text-yellow-600',
    },
    {
      id: 'construction',
      name: 'Construction & Real Estate',
      icon: Building2,
      color: 'gba:bg-stone-100 gba:text-stone-600',
    },
    {
      id: 'consulting',
      name: 'Professional Services',
      icon: Briefcase,
      color: 'gba:bg-slate-100 gba:text-slate-600',
    },
    {
      id: 'telecommunications',
      name: 'Telecommunications',
      icon: Globe,
      color: 'gba:bg-cyan-100 gba:text-cyan-600',
    }
  ];

  // Department categories
  const departmentCategories = [
    {
      id: 'hr',
      name: 'Human Resources',
      icon: UserCheck,
      color: 'gba:bg-emerald-100 gba:text-emerald-600',
    },
    {
      id: 'finance',
      name: 'Finance & Accounting',
      icon: Calculator,
      color: 'gba:bg-green-100 gba:text-green-600',
    },
    {
      id: 'sales',
      name: 'Sales & Marketing',
      icon: TrendingUp,
      color: 'gba:bg-blue-100 gba:text-blue-600',
    },
    {
      id: 'it',
      name: 'IT & Technology',
      icon: Cpu,
      color: 'gba:bg-purple-100 gba:text-purple-600',
    },
    {
      id: 'operations',
      name: 'Operations',
      icon: Wrench,
      color: 'gba:bg-orange-100 gba:text-orange-600',
    },
    {
      id: 'legal',
      name: 'Legal & Compliance',
      icon: Shield,
      color: 'gba:bg-yellow-100 gba:text-yellow-600',
    },
    {
      id: 'procurement',
      name: 'Procurement',
      icon: ClipboardList,
      color: 'gba:bg-indigo-100 gba:text-indigo-600',
    },
    {
      id: 'customer-service',
      name: 'Customer Service',
      icon: Headphones,
      color: 'gba:bg-pink-100 gba:text-pink-600',
    }
  ];

  // Industry-specific patterns (internal processes focus)
  const industrySpecificPatterns = {
    manufacturing: [
      {
        id: 'quality-control',
        name: 'Quality Control Process',
        description: 'Internal quality assurance and defect management workflows',
        icon: CheckCircle,
        color: 'gba:bg-green-100 gba:text-green-600',
        subPatterns: [
          {
            id: 'product-inspection',
            name: 'Product Inspection',
            description: 'Multi-stage quality inspection process',
            steps: ['Initial Inspection', 'Quality Testing', 'Final Approval', 'Documentation'],
            roles: ['QC Inspector', 'Quality Manager', 'Production Lead']
          },
          {
            id: 'non-conformance',
            name: 'Non-Conformance Management',
            description: 'Handle quality issues and corrective actions',
            steps: ['Issue Identification', 'Root Cause Analysis', 'Corrective Action Plan', 'Follow-up'],
            roles: ['QC Team', 'Engineering', 'Production Manager']
          }
        ]
      },
      {
        id: 'equipment-maintenance',
        name: 'Equipment Maintenance',
        description: 'Preventive and corrective maintenance scheduling',
        icon: Wrench,
        color: 'gba:bg-orange-100 gba:text-orange-600',
        subPatterns: [
          {
            id: 'preventive-maintenance',
            name: 'Preventive Maintenance',
            description: 'Scheduled maintenance to prevent breakdowns',
            steps: ['Schedule Planning', 'Pre-maintenance Check', 'Maintenance Execution', 'Post-maintenance Testing'],
            roles: ['Maintenance Team', 'Operations', 'Safety Officer']
          }
        ]
      },
      {
        id: 'production-planning',
        name: 'Production Planning',
        description: 'Internal production scheduling and resource allocation',
        icon: Factory,
        color: 'gba:bg-blue-100 gba:text-blue-600',
        subPatterns: [
          {
            id: 'capacity-planning',
            name: 'Capacity Planning',
            description: 'Plan production capacity and resource allocation',
            steps: ['Demand Analysis', 'Resource Assessment', 'Schedule Creation', 'Approval'],
            roles: ['Production Planner', 'Operations Manager', 'Resource Manager']
          }
        ]
      }
    ],
    
    finance: [
      {
        id: 'budget-approval',
        name: 'Budget Approval Process',
        description: 'Internal budget planning and approval workflows',
        icon: Calculator,
        color: 'gba:bg-green-100 gba:text-green-600',
        subPatterns: [
          {
            id: 'annual-budget',
            name: 'Annual Budget Planning',
            description: 'Yearly budget creation and approval process',
            steps: ['Budget Preparation', 'Department Review', 'Management Approval', 'Final Approval'],
            roles: ['Finance Team', 'Department Heads', 'CFO', 'CEO']
          },
          {
            id: 'capital-expenditure',
            name: 'Capital Expenditure Approval',
            description: 'Approval process for large capital investments',
            steps: ['Business Case', 'Financial Analysis', 'Risk Assessment', 'Board Approval'],
            roles: ['Requester', 'Finance Analyst', 'CFO', 'Board']
          }
        ]
      },
      {
        id: 'expense-management',
        name: 'Expense Management',
        description: 'Internal expense reporting and reimbursement processes',
        icon: Banknote,
        color: 'gba:bg-blue-100 gba:text-blue-600',
        subPatterns: [
          {
            id: 'travel-expense',
            name: 'Travel Expense Approval',
            description: 'Business travel expense approval workflow',
            steps: ['Expense Submission', 'Manager Review', 'Finance Verification', 'Reimbursement'],
            roles: ['Employee', 'Manager', 'Finance', 'Accounts Payable']
          }
        ]
      }
    ],
    
    healthcare: [
      {
        id: 'staff-scheduling',
        name: 'Staff Scheduling',
        description: 'Internal healthcare staff scheduling and shift management',
        icon: Users,
        color: 'gba:bg-blue-100 gba:text-blue-600',
        subPatterns: [
          {
            id: 'nurse-scheduling',
            name: 'Nurse Shift Scheduling',
            description: 'Monthly nurse shift planning and approval',
            steps: ['Schedule Draft', 'Staff Preferences', 'Manager Review', 'Final Schedule'],
            roles: ['Scheduling Coordinator', 'Charge Nurse', 'Nursing Manager']
          }
        ]
      },
      {
        id: 'equipment-procurement',
        name: 'Medical Equipment Procurement',
        description: 'Internal process for medical equipment purchasing',
        icon: Wrench,
        color: 'gba:bg-orange-100 gba:text-orange-600',
        subPatterns: [
          {
            id: 'equipment-request',
            name: 'Equipment Request',
            description: 'Request and approval for medical equipment',
            steps: ['Clinical Request', 'Budget Verification', 'Vendor Selection', 'Procurement'],
            roles: ['Clinical Staff', 'Procurement', 'Finance', 'Administration']
          }
        ]
      }
    ],
    
    retail: [
      {
        id: 'inventory-management',
        name: 'Inventory Management',
        description: 'Internal inventory control and stock management processes',
        icon: ClipboardList,
        color: 'gba:bg-purple-100 gba:text-purple-600',
        subPatterns: [
          {
            id: 'stock-replenishment',
            name: 'Stock Replenishment',
            description: 'Automated and manual stock replenishment workflow',
            steps: ['Stock Level Check', 'Reorder Point Trigger', 'Purchase Order', 'Goods Receipt'],
            roles: ['Inventory Manager', 'Buyer', 'Warehouse', 'Finance']
          },
          {
            id: 'price-change',
            name: 'Price Change Management',
            description: 'Internal process for updating product prices',
            steps: ['Price Analysis', 'Competitive Review', 'Approval', 'System Update'],
            roles: ['Pricing Analyst', 'Category Manager', 'General Manager']
          }
        ]
      },
      {
        id: 'promotion-approval',
        name: 'Promotion Approval',
        description: 'Internal approval process for marketing promotions',
        icon: TrendingUp,
        color: 'gba:bg-green-100 gba:text-green-600',
        subPatterns: [
          {
            id: 'seasonal-promotion',
            name: 'Seasonal Promotion',
            description: 'Approval workflow for seasonal marketing campaigns',
            steps: ['Campaign Planning', 'Budget Review', 'Legal Review', 'Final Approval'],
            roles: ['Marketing Team', 'Finance', 'Legal', 'General Manager']
          }
        ]
      }
    ],
    
    technology: [
      {
        id: 'software-deployment',
        name: 'Software Deployment',
        description: 'Internal software release and deployment processes',
        icon: Cpu,
        color: 'gba:bg-blue-100 gba:text-blue-600',
        subPatterns: [
          {
            id: 'production-deployment',
            name: 'Production Deployment',
            description: 'Release software to production environment',
            steps: ['Code Review', 'Testing', 'Security Review', 'Deployment', 'Monitoring'],
            roles: ['Developer', 'QA Engineer', 'DevOps', 'Security Team']
          },
          {
            id: 'emergency-hotfix',
            name: 'Emergency Hotfix',
            description: 'Fast-track process for critical bug fixes',
            steps: ['Issue Identification', 'Quick Fix', 'Fast-track Testing', 'Emergency Deployment'],
            roles: ['Developer', 'Tech Lead', 'Operations', 'Product Manager']
          }
        ]
      },
      {
        id: 'security-incident',
        name: 'Security Incident Response',
        description: 'Internal security incident management workflow',
        icon: Shield,
        color: 'gba:bg-red-100 gba:text-red-600',
        subPatterns: [
          {
            id: 'data-breach',
            name: 'Data Breach Response',
            description: 'Response process for potential data breaches',
            steps: ['Incident Detection', 'Impact Assessment', 'Containment', 'Investigation', 'Recovery'],
            roles: ['Security Team', 'IT Operations', 'Legal', 'Management']
          }
        ]
      }
    ],
    
    logistics: [
      {
        id: 'fleet-management',
        name: 'Fleet Management',
        description: 'Internal vehicle and driver management processes',
        icon: Truck,
        color: 'gba:bg-indigo-100 gba:text-indigo-600',
        subPatterns: [
          {
            id: 'vehicle-maintenance',
            name: 'Vehicle Maintenance',
            description: 'Fleet vehicle maintenance scheduling',
            steps: ['Maintenance Schedule', 'Service Booking', 'Maintenance Execution', 'Record Update'],
            roles: ['Fleet Manager', 'Driver', 'Maintenance Team']
          }
        ]
      },
      {
        id: 'warehouse-operations',
        name: 'Warehouse Operations',
        description: 'Internal warehouse management and operations',
        icon: Building2,
        color: 'gba:bg-orange-100 gba:text-orange-600',
        subPatterns: [
          {
            id: 'goods-receipt',
            name: 'Goods Receipt Process',
            description: 'Process for receiving and storing incoming goods',
            steps: ['Delivery Arrival', 'Quality Check', 'System Update', 'Storage Assignment'],
            roles: ['Warehouse Clerk', 'Quality Inspector', 'Warehouse Manager']
          }
        ]
      }
    ],
    
    energy: [
      {
        id: 'safety-compliance',
        name: 'Safety Compliance',
        description: 'Internal safety management and compliance processes',
        icon: Shield,
        color: 'gba:bg-yellow-100 gba:text-yellow-600',
        subPatterns: [
          {
            id: 'safety-incident',
            name: 'Safety Incident Management',
            description: 'Process for handling workplace safety incidents',
            steps: ['Incident Reporting', 'Investigation', 'Corrective Actions', 'Follow-up'],
            roles: ['Safety Officer', 'Operations', 'HR', 'Management']
          }
        ]
      },
      {
        id: 'equipment-inspection',
        name: 'Equipment Inspection',
        description: 'Regular safety and operational equipment inspections',
        icon: CheckCircle,
        color: 'gba:bg-green-100 gba:text-green-600',
        subPatterns: [
          {
            id: 'routine-inspection',
            name: 'Routine Safety Inspection',
            description: 'Scheduled safety inspections of critical equipment',
            steps: ['Inspection Planning', 'Inspection Execution', 'Report Generation', 'Action Items'],
            roles: ['Safety Inspector', 'Maintenance Team', 'Operations Manager']
          }
        ]
      }
    ],
    
    construction: [
      {
        id: 'project-approval',
        name: 'Project Approval',
        description: 'Internal project initiation and approval workflows',
        icon: CheckCircle,
        color: 'gba:bg-green-100 gba:text-green-600',
        subPatterns: [
          {
            id: 'budget-approval',
            name: 'Project Budget Approval',
            description: 'Approval process for construction project budgets',
            steps: ['Cost Estimation', 'Resource Planning', 'Risk Assessment', 'Management Approval'],
            roles: ['Project Manager', 'Estimator', 'Finance', 'Senior Management']
          }
        ]
      }
    ],
    
    consulting: [
      {
        id: 'project-delivery',
        name: 'Project Delivery',
        description: 'Internal project management and delivery processes',
        icon: Briefcase,
        color: 'gba:bg-slate-100 gba:text-slate-600',
        subPatterns: [
          {
            id: 'project-kickoff',
            name: 'Project Kickoff',
            description: 'Process for initiating new consulting projects',
            steps: ['Project Planning', 'Team Assignment', 'Client Kickoff', 'Project Start'],
            roles: ['Project Manager', 'Practice Lead', 'Consultant', 'Account Manager']
          }
        ]
      }
    ],
    
    telecommunications: [
      {
        id: 'network-maintenance',
        name: 'Network Maintenance',
        description: 'Internal network infrastructure maintenance processes',
        icon: Globe,
        color: 'gba:bg-cyan-100 gba:text-cyan-600',
        subPatterns: [
          {
            id: 'scheduled-maintenance',
            name: 'Scheduled Network Maintenance',
            description: 'Planned maintenance of network infrastructure',
            steps: ['Maintenance Planning', 'Change Approval', 'Maintenance Window', 'Post-maintenance Testing'],
            roles: ['Network Engineer', 'Operations', 'Change Manager']
          }
        ]
      }
    ]
  };

  // Department-specific patterns
  const departmentSpecificPatterns = {
    hr: [
      {
        id: 'employee-onboarding',
        name: 'Employee Onboarding',
        description: 'Complete new hire onboarding and integration process',
        icon: UserCheck,
        color: 'gba:bg-emerald-100 gba:text-emerald-600',
        subPatterns: [
          {
            id: 'new-hire-onboarding',
            name: 'New Hire Onboarding',
            description: 'Standard onboarding process for new employees',
            steps: ['Pre-boarding Setup', 'Day 1 Orientation', 'Training Schedule', '30-Day Check-in'],
            roles: ['HR Coordinator', 'Manager', 'IT Support', 'Buddy']
          },
          {
            id: 'executive-onboarding',
            name: 'Executive Onboarding',
            description: 'Specialized onboarding for executive-level hires',
            steps: ['Executive Welcome', 'Strategic Briefing', 'Stakeholder Meetings', '90-Day Plan'],
            roles: ['HR Director', 'CEO', 'Board Member', 'Executive Assistant']
          }
        ]
      },
      {
        id: 'performance-review',
        name: 'Performance Review',
        description: 'Annual and quarterly employee performance evaluation',
        icon: CheckCircle,
        color: 'gba:bg-blue-100 gba:text-blue-600',
        subPatterns: [
          {
            id: 'annual-review',
            name: 'Annual Performance Review',
            description: 'Comprehensive yearly performance evaluation',
            steps: ['Self Assessment', 'Manager Review', 'Goal Setting', 'Development Plan'],
            roles: ['Employee', 'Manager', 'HR Partner', 'Skip Level Manager']
          },
          {
            id: 'pip-process',
            name: 'Performance Improvement Plan',
            description: 'Structured improvement process for underperforming employees',
            steps: ['Performance Analysis', 'Improvement Plan', 'Regular Check-ins', 'Final Evaluation'],
            roles: ['Manager', 'HR Partner', 'Employee', 'Senior Manager']
          }
        ]
      },
      {
        id: 'leave-management',
        name: 'Leave Management',
        description: 'Employee leave requests and approval workflows',
        icon: Calendar,
        color: 'gba:bg-purple-100 gba:text-purple-600',
        subPatterns: [
          {
            id: 'vacation-request',
            name: 'Vacation Request',
            description: 'Standard vacation leave approval process',
            steps: ['Leave Request', 'Manager Approval', 'Coverage Planning', 'Leave Confirmation'],
            roles: ['Employee', 'Manager', 'HR', 'Team Lead']
          },
          {
            id: 'medical-leave',
            name: 'Medical Leave',
            description: 'Extended medical leave approval and management',
            steps: ['Medical Documentation', 'Leave Approval', 'Benefits Coordination', 'Return Planning'],
            roles: ['Employee', 'HR Benefits', 'Manager', 'Medical Provider']
          }
        ]
      }
    ],
    
    finance: [
      {
        id: 'invoice-processing',
        name: 'Invoice Processing',
        description: 'Accounts payable invoice approval and payment workflow',
        icon: Calculator,
        color: 'gba:bg-green-100 gba:text-green-600',
        subPatterns: [
          {
            id: 'standard-invoice',
            name: 'Standard Invoice Processing',
            description: 'Regular vendor invoice processing workflow',
            steps: ['Invoice Receipt', 'Approval Routing', 'Payment Authorization', 'Payment Processing'],
            roles: ['AP Clerk', 'Department Manager', 'Finance Manager', 'CFO']
          },
          {
            id: 'expense-reimbursement',
            name: 'Expense Reimbursement',
            description: 'Employee expense reimbursement process',
            steps: ['Expense Submission', 'Receipt Validation', 'Manager Approval', 'Reimbursement'],
            roles: ['Employee', 'Manager', 'Finance Team', 'Payroll']
          }
        ]
      },
      {
        id: 'financial-reporting',
        name: 'Financial Reporting',
        description: 'Monthly and quarterly financial reporting processes',
        icon: TrendingUp,
        color: 'gba:bg-blue-100 gba:text-blue-600',
        subPatterns: [
          {
            id: 'monthly-close',
            name: 'Monthly Financial Close',
            description: 'Month-end financial closing process',
            steps: ['Accrual Entries', 'Reconciliations', 'Variance Analysis', 'Report Generation'],
            roles: ['Accountant', 'Finance Manager', 'Controller', 'CFO']
          }
        ]
      }
    ],
    
    sales: [
      {
        id: 'lead-qualification',
        name: 'Lead Qualification',
        description: 'Sales lead scoring and qualification process',
        icon: TrendingUp,
        color: 'gba:bg-blue-100 gba:text-blue-600',
        subPatterns: [
          {
            id: 'inbound-lead',
            name: 'Inbound Lead Processing',
            description: 'Process marketing-generated inbound leads',
            steps: ['Lead Scoring', 'Initial Contact', 'Qualification Call', 'Opportunity Creation'],
            roles: ['Marketing', 'Sales Development Rep', 'Account Executive']
          },
          {
            id: 'cold-outreach',
            name: 'Cold Outreach Campaign',
            description: 'Systematic approach to cold prospect outreach',
            steps: ['Prospect Research', 'Outreach Sequence', 'Follow-up Tracking', 'Meeting Booking'],
            roles: ['Sales Development Rep', 'Account Executive', 'Sales Manager']
          }
        ]
      },
      {
        id: 'deal-approval',
        name: 'Deal Approval',
        description: 'Sales deal discount and contract approval workflow',
        icon: CheckCircle,
        color: 'gba:bg-green-100 gba:text-green-600',
        subPatterns: [
          {
            id: 'discount-approval',
            name: 'Discount Approval',
            description: 'Approval process for sales discounts',
            steps: ['Discount Request', 'Manager Review', 'Finance Approval', 'Deal Closure'],
            roles: ['Account Executive', 'Sales Manager', 'Finance', 'VP Sales']
          },
          {
            id: 'contract-review',
            name: 'Contract Review',
            description: 'Legal and commercial contract review process',
            steps: ['Contract Draft', 'Legal Review', 'Commercial Terms', 'Final Approval'],
            roles: ['Account Executive', 'Legal Team', 'Finance', 'Contract Manager']
          }
        ]
      }
    ],
    
    it: [
      {
        id: 'access-management',
        name: 'Access Management',
        description: 'User access provisioning and deprovisioning workflows',
        icon: Cpu,
        color: 'gba:bg-purple-100 gba:text-purple-600',
        subPatterns: [
          {
            id: 'new-user-access',
            name: 'New User Access Provisioning',
            description: 'Set up system access for new employees',
            steps: ['Access Request', 'Manager Approval', 'Security Review', 'Account Creation'],
            roles: ['HR', 'Manager', 'IT Security', 'System Admin']
          },
          {
            id: 'access-removal',
            name: 'User Access Deprovisioning',
            description: 'Remove system access for departing employees',
            steps: ['Termination Notice', 'Access Audit', 'Account Deactivation', 'Asset Recovery'],
            roles: ['HR', 'IT Security', 'System Admin', 'Manager']
          }
        ]
      },
      {
        id: 'incident-management',
        name: 'IT Incident Management',
        description: 'IT service incident response and resolution workflow',
        icon: Shield,
        color: 'gba:bg-red-100 gba:text-red-600',
        subPatterns: [
          {
            id: 'p1-incident',
            name: 'Priority 1 Incident',
            description: 'Critical incident response process',
            steps: ['Incident Detection', 'Escalation', 'War Room', 'Resolution', 'Post-mortem'],
            roles: ['On-call Engineer', 'Incident Commander', 'Engineering Team', 'Management']
          },
          {
            id: 'service-request',
            name: 'Service Request',
            description: 'Standard IT service request fulfillment',
            steps: ['Request Submission', 'Approval', 'Fulfillment', 'Verification'],
            roles: ['End User', 'Manager', 'Service Desk', 'IT Specialist']
          }
        ]
      },
      {
        id: 'change-management',
        name: 'Change Management',
        description: 'IT change approval and implementation process',
        icon: Wrench,
        color: 'gba:bg-orange-100 gba:text-orange-600',
        subPatterns: [
          {
            id: 'standard-change',
            name: 'Standard Change',
            description: 'Pre-approved low-risk change process',
            steps: ['Change Request', 'Risk Assessment', 'Implementation', 'Verification'],
            roles: ['Change Requester', 'Change Manager', 'Implementation Team']
          },
          {
            id: 'emergency-change',
            name: 'Emergency Change',
            description: 'Fast-track process for urgent changes',
            steps: ['Emergency Request', 'Expedited Approval', 'Implementation', 'Post-implementation Review'],
            roles: ['Incident Commander', 'Change Manager', 'Technical Team', 'Management']
          }
        ]
      }
    ],
    
    operations: [
      {
        id: 'vendor-management',
        name: 'Vendor Management',
        description: 'Vendor onboarding and performance management',
        icon: Wrench,
        color: 'gba:bg-orange-100 gba:text-orange-600',
        subPatterns: [
          {
            id: 'vendor-onboarding',
            name: 'Vendor Onboarding',
            description: 'Complete vendor registration and setup process',
            steps: ['Vendor Application', 'Due Diligence', 'Contract Negotiation', 'System Setup'],
            roles: ['Procurement', 'Legal', 'Finance', 'Operations']
          },
          {
            id: 'vendor-review',
            name: 'Vendor Performance Review',
            description: 'Quarterly vendor performance evaluation',
            steps: ['Performance Data Collection', 'Scorecard Review', 'Improvement Plans', 'Contract Renewal'],
            roles: ['Vendor Manager', 'Operations', 'Finance', 'Procurement']
          }
        ]
      },
      {
        id: 'quality-assurance',
        name: 'Quality Assurance',
        description: 'Product and service quality control processes',
        icon: CheckCircle,
        color: 'gba:bg-green-100 gba:text-green-600',
        subPatterns: [
          {
            id: 'quality-audit',
            name: 'Quality Audit',
            description: 'Systematic quality audit process',
            steps: ['Audit Planning', 'Audit Execution', 'Finding Documentation', 'Corrective Actions'],
            roles: ['Quality Auditor', 'Process Owner', 'Quality Manager', 'Operations']
          }
        ]
      }
    ],
    
    legal: [
      {
        id: 'contract-management',
        name: 'Contract Management',
        description: 'Contract lifecycle management and approval workflows',
        icon: Shield,
        color: 'gba:bg-yellow-100 gba:text-yellow-600',
        subPatterns: [
          {
            id: 'contract-creation',
            name: 'Contract Creation',
            description: 'New contract drafting and approval process',
            steps: ['Business Requirements', 'Contract Drafting', 'Legal Review', 'Approval', 'Execution'],
            roles: ['Business Owner', 'Legal Counsel', 'Contract Manager', 'Signatory']
          },
          {
            id: 'contract-renewal',
            name: 'Contract Renewal',
            description: 'Existing contract renewal and renegotiation',
            steps: ['Renewal Notice', 'Terms Review', 'Renegotiation', 'Approval', 'Renewal'],
            roles: ['Contract Manager', 'Business Owner', 'Legal Team', 'Procurement']
          }
        ]
      },
      {
        id: 'compliance-monitoring',
        name: 'Compliance Monitoring',
        description: 'Regulatory compliance tracking and reporting',
        icon: FileText,
        color: 'gba:bg-blue-100 gba:text-blue-600',
        subPatterns: [
          {
            id: 'regulatory-filing',
            name: 'Regulatory Filing',
            description: 'Mandatory regulatory submission process',
            steps: ['Data Collection', 'Report Preparation', 'Legal Review', 'Submission'],
            roles: ['Compliance Officer', 'Legal Team', 'Business Units', 'External Counsel']
          }
        ]
      }
    ],
    
    procurement: [
      {
        id: 'purchase-requisition',
        name: 'Purchase Requisition',
        description: 'Purchase request and approval workflow',
        icon: ClipboardList,
        color: 'gba:bg-indigo-100 gba:text-indigo-600',
        subPatterns: [
          {
            id: 'standard-purchase',
            name: 'Standard Purchase Request',
            description: 'Regular purchase requisition process',
            steps: ['Requisition Creation', 'Budget Verification', 'Approval Routing', 'Purchase Order'],
            roles: ['Requester', 'Manager', 'Procurement', 'Finance']
          },
          {
            id: 'emergency-purchase',
            name: 'Emergency Purchase',
            description: 'Expedited purchasing for urgent needs',
            steps: ['Emergency Request', 'Justification', 'Fast-track Approval', 'Immediate Purchase'],
            roles: ['Requester', 'Department Head', 'Procurement Manager', 'CFO']
          }
        ]
      },
      {
        id: 'supplier-selection',
        name: 'Supplier Selection',
        description: 'Strategic supplier evaluation and selection process',
        icon: Users,
        color: 'gba:bg-blue-100 gba:text-blue-600',
        subPatterns: [
          {
            id: 'rfp-process',
            name: 'RFP Process',
            description: 'Request for Proposal evaluation process',
            steps: ['RFP Creation', 'Vendor Selection', 'Proposal Evaluation', 'Supplier Selection'],
            roles: ['Procurement Manager', 'Technical Team', 'Finance', 'Legal']
          }
        ]
      }
    ],
    
    'customer-service': [
      {
        id: 'escalation-management',
        name: 'Customer Escalation',
        description: 'Customer complaint escalation and resolution workflow',
        icon: Headphones,
        color: 'gba:bg-pink-100 gba:text-pink-600',
        subPatterns: [
          {
            id: 'complaint-escalation',
            name: 'Complaint Escalation',
            description: 'Multi-tier customer complaint resolution',
            steps: ['Initial Contact', 'Issue Assessment', 'Escalation', 'Resolution', 'Follow-up'],
            roles: ['Customer Service Rep', 'Team Lead', 'Manager', 'Customer Success']
          },
          {
            id: 'refund-request',
            name: 'Refund Request',
            description: 'Customer refund approval and processing',
            steps: ['Refund Request', 'Eligibility Check', 'Approval', 'Processing'],
            roles: ['Customer Service', 'Manager', 'Finance', 'Operations']
          }
        ]
      },
      {
        id: 'service-improvement',
        name: 'Service Improvement',
        description: 'Customer feedback analysis and service enhancement',
        icon: TrendingUp,
        color: 'gba:bg-green-100 gba:text-green-600',
        subPatterns: [
          {
            id: 'feedback-analysis',
            name: 'Customer Feedback Analysis',
            description: 'Systematic customer feedback review and action planning',
            steps: ['Feedback Collection', 'Analysis', 'Improvement Planning', 'Implementation'],
            roles: ['Customer Success', 'Quality Team', 'Operations', 'Management']
          }
        ]
      }
    ]
  };

  // No conversion needed - using the same format everywhere!

  // Load templates from API
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const templates = await flowTemplateClient.getTemplates();
      console.log('FlowCreator: Loaded templates:', templates.length);
      setTemplates(templates);
      // Auto-select first template for preview
      if (templates.length > 0 && !previewTemplate) {
        console.log('FlowCreator: Auto-selecting first template:', templates[0].name);
        setPreviewTemplate(templates[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load templates on component mount
  useEffect(() => {
    console.log('FlowCreator: accessToken =', accessToken ? 'PRESENT' : 'MISSING');
    if (accessToken) {
      console.log('FlowCreator: Making API call to load templates');
      loadTemplates();
    } else {
      console.log('FlowCreator: No accessToken, skipping API call');
    }
  }, [accessToken]);

  // Save template (create or update) - implements template ID immutability
  const saveTemplate = async (template: FlowTemplate) => {
    try {
      if (template.id) {
        // Update existing template - ID remains immutable
        await flowTemplateClient.updateTemplate(template.id, template);
        console.log(`Template updated successfully. ID "${template.id}" remains unchanged.`);
      } else {
        // Create new template - ID will be derived from name
        const createdTemplate = await flowTemplateClient.createTemplate(template);
        console.log(`Template created successfully with ID derived from name: "${createdTemplate.name}"`);
      }
      
      // Reload templates to get updated list
      await loadTemplates();
      
      // Close the designer after successful save
      setShowDesigner(false);
      setSelectedTemplate(null);
    } catch (err) {
      console.error('Error saving template:', err);
      throw err;
    }
  };

  const handleCreateNew = () => {
    // Open new FlowDesigner for creating templates
    setSelectedTemplate(null); // Clear any existing template
    setShowDesigner(true);
    setActiveTab('manage'); // Stay in manage tab context
  };

  const handleOpenLegacyWizard = () => {
    // Legacy wizard (kept for special cases)
    resetTemplate();
    setSelectedTemplate(null);
    useWizardStore.getState().initializeForCreate();
    setIsWizardOpen(true);
  };

  // Removed handleWizardCreate and handleCustomCreate as they're no longer needed

  const handleEdit = async (template: FlowTemplate) => {
    try {
      // Try to get the template for better editing experience
      if (template.id) {
        const fullTemplate = await flowTemplateClient.getTemplate(template.id);
        setSelectedTemplate(fullTemplate);
      } else {
        setSelectedTemplate(template);
      }
      // Open the FlowDesigner instead of the wizard for editing
      setShowDesigner(true);
      setActiveTab('manage'); // Stay in manage tab context
    } catch (error) {
      // Fallback to the current template if original is not available
      console.warn('Could not load original template, using current:', error);
      setSelectedTemplate(template);
      setShowDesigner(true);
      setActiveTab('manage'); // Stay in manage tab context
    }
  };

  const handleDelete = async (template: FlowTemplate) => {
    if (!template.id) {
      throw new Error('Cannot delete template without ID');
    }

    try {
      await flowTemplateClient.deleteTemplate(template.id);
      // Reload templates to get updated list
      await loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      throw err;
    }
  };

  const handleTemplateSelect = (template: FlowTemplate | null) => {
    console.log('FlowCreator: Template selected:', template?.name || 'null');
    setPreviewTemplate(template);
  };

  // Handle AI-generated flow template
  const handleAIFlowGenerated = (template: FlowTemplate) => {
    console.log('AI generated template received:', template);
    
    // Remove the ID from AI-generated template to ensure it's treated as a NEW template (create mode)
    // The FlowDesigner uses the presence of template.id to determine create vs update mode
    const newTemplate: FlowTemplate = {
      ...template,
      id: undefined // Force create mode by removing any existing ID
    };
    
    // Store the template for the designer to use
    setSelectedTemplate(newTemplate);
    
    // Open the new FlowDesigner instead of the legacy wizard
    setShowDesigner(true);
  };

  // Pattern expansion handler
  const handlePatternExpand = (patternId: string) => {
    setExpandedPattern(expandedPattern === patternId ? null : patternId);
    setSelectedSubPattern(null);
  };

  // Sub-pattern selection handler
  const handleSubPatternSelect = (subPattern: any) => {
    setSelectedSubPattern(subPattern);
    console.log('Selected sub-pattern:', subPattern);
    
    // Open wizard with pattern context and template definition
    resetTemplate();
    setSelectedTemplate(null);
    useWizardStore.getState().initializeForCreate();
    // Pass the selected pattern template definition to wizard
    // TODO: Pass subPattern data to wizard for pre-configuration
    setIsWizardOpen(true);
  };

  // Get patterns based on current mode
  const getCurrentPatterns = () => {
    if (patternMode === 'general') {
      return businessPatterns;
    } else if (patternMode === 'industry') {
      // Industry mode
      if (selectedIndustry === 'all') {
        // Return all industry patterns combined
        return Object.values(industrySpecificPatterns).flat();
      } else {
        // Return patterns for selected industry
        return industrySpecificPatterns[selectedIndustry as keyof typeof industrySpecificPatterns] || [];
      }
    } else {
      // Department mode
      if (selectedDepartment === 'all') {
        // Return all department patterns combined
        return Object.values(departmentSpecificPatterns).flat();
      } else {
        // Return patterns for selected department
        return departmentSpecificPatterns[selectedDepartment as keyof typeof departmentSpecificPatterns] || [];
      }
    }
  };

  // Get available industries that have patterns
  const getAvailableIndustries = () => {
    return industryCategories.filter(industry => 
      industrySpecificPatterns[industry.id as keyof typeof industrySpecificPatterns]
    );
  };

  // Get available departments that have patterns
  const getAvailableDepartments = () => {
    return departmentCategories.filter(department => 
      departmentSpecificPatterns[department.id as keyof typeof departmentSpecificPatterns]
    );
  };

  // Handle pattern mode change
  const handlePatternModeChange = (mode: 'general' | 'industry' | 'department') => {
    setPatternMode(mode);
    setExpandedPattern(null);
    setSelectedSubPattern(null);
    
    if (mode === 'industry') {
      // Set default to show all industries
      setSelectedIndustry('all');
    } else if (mode === 'department') {
      // Set default to show all departments
      setSelectedDepartment('all');
    }
  };

  return (
    <MockDataProvider>
      <div 
        className="gba:min-h-screen gba:bg-blue-50 gba:p-6"
        data-testid={testId}
      >
        {/* Header */}
        <div className="gba:mb-8" data-testid={`${testId}-header`}>
          <div className="gba:flex gba:items-start gba:gap-4 gba:mb-6">
            {/* Icon with Gradient Background */}
            <div className="gba:relative">
              {/* Glow Effect */}
              <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:rounded-2xl gba:blur-sm gba:opacity-20"></div>
              {/* Main Icon Container */}
              <div className="gba:relative gba:w-14 gba:h-14 gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:rounded-2xl gba:flex gba:items-center gba:justify-center gba:shadow-lg">
                <Settings className="gba:h-8 gba:w-8 gba:text-white" />
              </div>
            </div>
            
            {/* Title and Description */}
            <div className="gba:flex-1">
              <h1 className="gba:text-3xl gba:font-bold gba:text-gray-900 gba:mb-2" data-testid={`${testId}-title`}>
                {getTranslationFromI18nKeyAndLabel('flow.creator.title', 'FLOW Creator')}
              </h1>
              <p className="gba:text-base gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('flow.creator.description', 'Design & Build Workflow Templates')}
              </p>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="gba:w-full gba:max-w-none">
          {showDesigner ? (
            <div className="gba:w-full gba:space-y-4">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Badge variant="secondary">Create</Badge>
                  <h2 className="gba:text-xl gba:font-semibold">Visual Flow Designer</h2>
                </div>
                <div className="gba:flex gba:gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDesigner(false);
                      setSelectedTemplate(null); // Clear template when going back
                    }}
                    data-testid={`${testId}-designer-back`}
                  >
                    Back to Creator
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleOpenLegacyWizard}
                    data-testid={`${testId}-open-legacy-wizard`}
                  >
                    Open Legacy Wizard
                  </Button>
                </div>
              </div>
              <Card>
                <CardContent className="gba:p-0">
                  <FlowDesigner 
                    accessToken={accessToken} 
                    userInfo={userInfo} 
                    initialTemplate={selectedTemplate}
                    onSave={saveTemplate}
                    onCancel={() => {
                      setShowDesigner(false);
                      setSelectedTemplate(null);
                    }}
                    data-testid={`${testId}-designer`} 
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
            <TabsList className="gba:grid gba:w-full gba:grid-cols-2 gba:mb-6">
              <TabsTrigger value="create" className="gba:flex gba:items-center gba:gap-2">
                <Sparkles className="gba:h-4 gba:w-4" />
                Create Flow
              </TabsTrigger>
              <TabsTrigger value="manage" className="gba:flex gba:items-center gba:gap-2">
                <FileText className="gba:h-4 gba:w-4" />
                Manage Templates
                {templates.length > 0 && (
                  <Badge variant="secondary" className="gba:ml-1">
                    {templates.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="gba:mt-0">
              <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6">
                {/* Left Side - Business Patterns (2/3 width) */}
                <div className="gba:lg:col-span-2 gba:space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="gba:space-y-4">
                        {/* Pattern Mode Toggle */}
                        <div className="gba:flex gba:items-center gba:justify-between">
                          <CardTitle>Choose a Workflow Pattern</CardTitle>
                          
                          {/* Mode Toggle Buttons */}
                          <div className="gba:flex gba:items-center gba:bg-gray-100 gba:rounded-lg gba:p-1">
                            <button
                              onClick={() => handlePatternModeChange('general')}
                              className={`gba:px-3 gba:py-1.5 gba:text-sm gba:font-medium gba:rounded-md gba:transition-all gba:duration-200 ${
                                patternMode === 'general'
                                  ? 'gba:bg-white gba:text-gray-900 gba:shadow-sm'
                                  : 'gba:text-gray-600 gba:hover:text-gray-900'
                              }`}
                              data-testid={`${testId}-general-patterns-toggle`}
                            >
                              <Briefcase className="gba:h-4 gba:w-4 gba:mr-1.5 gba:inline-block" />
                              General
                            </button>
                            <button
                              onClick={() => handlePatternModeChange('industry')}
                              className={`gba:px-3 gba:py-1.5 gba:text-sm gba:font-medium gba:rounded-md gba:transition-all gba:duration-200 ${
                                patternMode === 'industry'
                                  ? 'gba:bg-white gba:text-gray-900 gba:shadow-sm'
                                  : 'gba:text-gray-600 gba:hover:text-gray-900'
                              }`}
                              data-testid={`${testId}-industry-patterns-toggle`}
                            >
                              <Building2 className="gba:h-4 gba:w-4 gba:mr-1.5 gba:inline-block" />
                              Industry
                            </button>
                            <button
                              onClick={() => handlePatternModeChange('department')}
                              className={`gba:px-3 gba:py-1.5 gba:text-sm gba:font-medium gba:rounded-md gba:transition-all gba:duration-200 ${
                                patternMode === 'department'
                                  ? 'gba:bg-white gba:text-gray-900 gba:shadow-sm'
                                  : 'gba:text-gray-600 gba:hover:text-gray-900'
                              }`}
                              data-testid={`${testId}-department-patterns-toggle`}
                            >
                              <UserCheck className="gba:h-4 gba:w-4 gba:mr-1.5 gba:inline-block" />
                              Department
                            </button>
                          </div>
                        </div>

                        {/* Category Sections for Industry and Department modes */}
                        {(patternMode === 'industry' || patternMode === 'department') && (
                          <div className="gba:space-y-4">
                            {/* Filter Select */}
                            <div className="gba:flex gba:items-center gba:justify-between">
                              <h4 className="gba:font-medium gba:text-gray-800">
                                {patternMode === 'industry' ? 'Choose Your Industry' : 'Choose Your Department'}
                              </h4>
                              <Select 
                                value={patternMode === 'industry' ? selectedIndustry : selectedDepartment} 
                                onValueChange={patternMode === 'industry' ? setSelectedIndustry : setSelectedDepartment}
                              >
                                <SelectTrigger className="gba:w-48">
                                  <SelectValue placeholder={`Filter by ${patternMode}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">
                                    <div className="gba:flex gba:items-center gba:gap-2">
                                      <div className="gba:p-1 gba:rounded gba:bg-gray-100 gba:text-gray-600">
                                        <Briefcase className="gba:h-3 gba:w-3" />
                                      </div>
                                      Show All
                                    </div>
                                  </SelectItem>
                                  {(patternMode === 'industry' ? getAvailableIndustries() : getAvailableDepartments()).map((category) => {
                                    const IconComponent = category.icon;
                                    return (
                                      <SelectItem key={category.id} value={category.id}>
                                        <div className="gba:flex gba:items-center gba:gap-2">
                                          <div className={`gba:p-1 gba:rounded ${category.color}`}>
                                            <IconComponent className="gba:h-3 gba:w-3" />
                                          </div>
                                          {category.name}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Category Grid */}
                            <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-3">
                              {(patternMode === 'industry' ? industryCategories : departmentCategories)
                                .filter(category => {
                                  const selectedFilter = patternMode === 'industry' ? selectedIndustry : selectedDepartment;
                                  return selectedFilter === 'all' || selectedFilter === category.id;
                                })
                                .map((category) => {
                                  const IconComponent = category.icon;
                                  const hasPatterns = patternMode === 'industry' 
                                    ? industrySpecificPatterns[category.id as keyof typeof industrySpecificPatterns]
                                    : departmentSpecificPatterns[category.id as keyof typeof departmentSpecificPatterns];
                                  const isSelected = (patternMode === 'industry' ? selectedIndustry : selectedDepartment) === category.id;
                                  
                                  return (
                                    <button
                                      key={category.id}
                                      onClick={() => {
                                        if (patternMode === 'industry') {
                                          setSelectedIndustry(category.id);
                                        } else {
                                          setSelectedDepartment(category.id);
                                        }
                                      }}
                                      className={`gba:p-4 gba:rounded-lg gba:border gba:text-left gba:transition-all gba:duration-200 ${
                                        isSelected
                                          ? 'gba:border-blue-500 gba:bg-blue-50 gba:shadow-md'
                                          : hasPatterns
                                          ? 'gba:border-gray-200 gba:bg-white gba:hover:border-gray-300 gba:hover:shadow-sm'
                                          : 'gba:border-gray-100 gba:bg-gray-50 gba:opacity-60 gba:cursor-not-allowed'
                                      }`}
                                      disabled={!hasPatterns}
                                      data-testid={`${testId}-${patternMode}-category-${category.id}`}
                                    >
                                      <div className="gba:flex gba:items-center gba:gap-3">
                                        <div className={`gba:p-2 gba:rounded-md ${category.color}`}>
                                          <IconComponent className="gba:h-5 gba:w-5" />
                                        </div>
                                        <div className="gba:flex-1">
                                          <h5 className="gba:font-medium gba:text-sm gba:text-gray-900 gba:leading-tight">
                                            {category.name}
                                          </h5>
                                          {hasPatterns ? (
                                            <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                                              {hasPatterns.length} pattern{hasPatterns.length !== 1 ? 's' : ''}
                                            </p>
                                          ) : (
                                            <p className="gba:text-xs gba:text-gray-400 gba:mt-1">
                                              Coming soon
                                            </p>
                                          )}
                                        </div>
                                        {isSelected && (
                                          <CheckCircle className="gba:h-4 gba:w-4 gba:text-blue-600" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        <p className="gba:text-sm gba:text-gray-600">
                          {patternMode === 'general' 
                            ? 'Choose from universal business patterns that work across any industry and department'
                            : patternMode === 'industry'
                            ? selectedIndustry === 'all'
                              ? 'Select an industry above to see specialized workflow patterns, or browse all industry patterns below'
                              : `Browse specialized workflow patterns tailored for ${
                                  industryCategories.find(i => i.id === selectedIndustry)?.name || 'your industry'
                                }`
                            : selectedDepartment === 'all'
                            ? 'Select a department above to see specialized workflow patterns, or browse all department patterns below'
                            : `Explore department-specific workflows optimized for ${
                                departmentCategories.find(d => d.id === selectedDepartment)?.name || 'your department'
                              }`
                          }
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="gba:space-y-4">
                        {getCurrentPatterns().length > 0 ? (
                          getCurrentPatterns().map((pattern) => {
                          const IconComponent = pattern.icon;
                          const isExpanded = expandedPattern === pattern.id;
                          
                          return (
                            <div key={pattern.id} className="gba:border gba:border-gray-200 gba:rounded-lg">
                              {/* Pattern Header */}
                              <div
                                onClick={() => handlePatternExpand(pattern.id)}
                                className="gba:p-4 gba:cursor-pointer gba:transition-all gba:hover:bg-gray-50"
                                data-testid={`${testId}-pattern-${pattern.id}`}
                              >
                                <div className="gba:flex gba:items-center gba:gap-3">
                                  <div className={`gba:p-2 gba:rounded-lg ${pattern.color}`}>
                                    <IconComponent className="gba:h-5 gba:w-5" />
                                  </div>
                                  <div className="gba:flex-1 gba:min-w-0">
                                    <h4 className="gba:font-medium gba:text-gray-900 gba:mb-1">
                                      {pattern.name}
                                    </h4>
                                    <p className="gba:text-sm gba:text-gray-600">
                                      {pattern.description}
                                    </p>
                                  </div>
                                  <div className="gba:flex gba:items-center gba:gap-2">
                                    <Badge variant="outline" className="gba:text-xs">
                                      {pattern.subPatterns.length} templates
                                    </Badge>
                                    <div className={`gba:transform gba:transition-transform ${isExpanded ? 'gba:rotate-180' : ''}`}>
                                      <svg className="gba:h-4 gba:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Sub-patterns */}
                              {isExpanded && (
                                <div className="gba:border-t gba:border-gray-200 gba:bg-gray-50 gba:p-4">
                                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
                                    {pattern.subPatterns.map((subPattern) => (
                                      <div
                                        key={subPattern.id}
                                        onClick={() => handleSubPatternSelect(subPattern)}
                                        className={`gba:p-3 gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:cursor-pointer gba:transition-all gba:hover:border-gray-300 gba:hover:shadow-sm ${
                                          selectedSubPattern?.id === subPattern.id ? 'gba:ring-2 gba:ring-indigo-500 gba:border-indigo-200' : ''
                                        }`}
                                        data-testid={`${testId}-subpattern-${subPattern.id}`}
                                      >
                                        <h5 className="gba:font-medium gba:text-gray-900 gba:mb-1 gba:text-sm">
                                          {subPattern.name}
                                        </h5>
                                        <p className="gba:text-xs gba:text-gray-600 gba:mb-2">
                                          {subPattern.description}
                                        </p>
                                        <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mb-2">
                                          {subPattern.steps.slice(0, 3).map((step, index) => (
                                            <Badge key={index} variant="outline" className="gba:text-xs gba:px-1 gba:py-0">
                                              {step}
                                            </Badge>
                                          ))}
                                          {subPattern.steps.length > 3 && (
                                            <Badge variant="outline" className="gba:text-xs gba:px-1 gba:py-0">
                                              +{subPattern.steps.length - 3}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="gba:text-xs gba:text-gray-500">
                                          {subPattern.roles.length} roles • {subPattern.steps.length} steps
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                        ) : (
                          <div className="gba:text-center gba:py-12">
                            <div className="gba:mx-auto gba:mb-4 gba:p-3 gba:bg-gray-100 gba:rounded-full gba:w-16 gba:h-16 gba:flex gba:items-center gba:justify-center">
                              {patternMode === 'industry' ? (
                                <Building2 className="gba:h-8 gba:w-8 gba:text-gray-400" />
                              ) : patternMode === 'department' ? (
                                <UserCheck className="gba:h-8 gba:w-8 gba:text-gray-400" />
                              ) : (
                                <Briefcase className="gba:h-8 gba:w-8 gba:text-gray-400" />
                              )}
                            </div>
                            <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-2">
                              {patternMode === 'industry' 
                                ? 'No industry patterns yet' 
                                : patternMode === 'department'
                                ? 'No department patterns yet'
                                : 'No patterns available'
                              }
                            </h3>
                            <p className="gba:text-gray-600 gba:mb-4">
                              {patternMode === 'industry' 
                                ? `We're working on adding specialized patterns for ${industryCategories.find(i => i.id === selectedIndustry)?.name || 'this industry'}. Try the general patterns or use AI to create a custom workflow.`
                                : patternMode === 'department'
                                ? `We're working on adding specialized patterns for ${departmentCategories.find(d => d.id === selectedDepartment)?.name || 'this department'}. Try the general patterns or use AI to create a custom workflow.`
                                : 'No patterns are currently available. Use AI to create a custom workflow.'
                              }
                            </p>
                            <Button
                              onClick={() => handlePatternModeChange('general')}
                              variant="outline"
                              className="gba:text-sm"
                              data-testid={`${testId}-switch-to-general`}
                            >
                              <Briefcase className="gba:h-4 gba:w-4 gba:mr-2" />
                              Browse General Patterns
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Side - Creation Options (1/3 width) */}
                <div className="gba:lg:col-span-1 gba:space-y-6">
                  {/* AI Creation Section */}
                  <AIFlowGenerator
                    onFlowGenerated={handleAIFlowGenerated}
                    accessToken={accessToken}
                    data-testid={`${testId}-ai-generator`}
                  />
                  
                  {/* Create from Scratch Section */}
                  <div className="gba:relative gba:overflow-hidden gba:rounded-xl gba:bg-gradient-to-br gba:from-blue-600 gba:via-blue-700 gba:to-indigo-800 gba:p-1" data-testid={`${testId}-create-scratch`}>
                    {/* Animated background pattern */}
                    <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-r gba:from-blue-400/20 gba:via-cyan-500/20 gba:to-indigo-600/20 gba:animate-pulse"></div>
                    
                    {/* Content Card */}
                    <Card className="gba:relative gba:bg-white gba:border-0 gba:shadow-2xl">
                      <CardHeader className="gba:text-center gba:pb-4">
                        {/* Settings Icon with Glow Effect */}
                        <div className="gba:mx-auto gba:mb-3 gba:relative">
                          <div className="gba:absolute gba:inset-0 gba:bg-blue-500 gba:rounded-full gba:blur-xl gba:opacity-30 gba:animate-pulse"></div>
                          <div className="gba:relative gba:p-3 gba:bg-gradient-to-br gba:from-blue-500 gba:to-indigo-600 gba:rounded-full">
                            <Settings className="gba:h-8 gba:w-8 gba:text-white" />
                          </div>
                        </div>
                        
                        <CardTitle className="gba:text-xl gba:font-bold gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600 gba:bg-clip-text gba:text-transparent">
                          Create from Scratch
                        </CardTitle>
                        <p className="gba:text-sm gba:text-gray-600 gba:mt-2">
                          Start with a blank canvas and build your workflow step by step
                        </p>
                      </CardHeader>
                      
                      <CardContent className="gba:space-y-6 gba:pt-0">
                        <div className="gba:space-y-3">
                          <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-600 gba:font-medium">
                            <div className="gba:w-2 gba:h-2 gba:bg-gradient-to-r gba:from-green-400 gba:to-emerald-500 gba:rounded-full gba:mr-3 gba:shadow-sm"></div>
                            Complete creative freedom
                          </div>
                          <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-600 gba:font-medium">
                            <div className="gba:w-2 gba:h-2 gba:bg-gradient-to-r gba:from-blue-400 gba:to-cyan-500 gba:rounded-full gba:mr-3 gba:shadow-sm"></div>
                            Step-by-step wizard
                          </div>
                          <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-600 gba:font-medium">
                            <div className="gba:w-2 gba:h-2 gba:bg-gradient-to-r gba:from-indigo-400 gba:to-purple-500 gba:rounded-full gba:mr-3 gba:shadow-sm"></div>
                            Custom configurations
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => setShowDesigner(true)}
                          className="gba:w-full gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600 gba:hover:from-blue-700 gba:hover:to-indigo-700 gba:text-white gba:font-semibold gba:py-3 gba:rounded-lg gba:shadow-lg gba:shadow-blue-500/25 gba:transition-all gba:duration-200 gba:hover:shadow-xl gba:hover:shadow-blue-500/40 gba:hover:scale-[1.02]"
                          data-testid={`${testId}-create-scratch-button`}
                        >
                          <Settings className="gba:h-4 gba:w-4 gba:mr-2" />
                          Start Building
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manage" className="gba:mt-0">
              <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-8 gba:w-full gba:min-h-[600px]">
                {/* Left Side - Template List */}
                <div className="gba:lg:col-span-2 gba:w-full">
                  <div className="gba:space-y-6">
                    {isLoading ? (
                      <div className="gba:flex gba:justify-center gba:items-center gba:py-8" data-testid={`${testId}-loading`}>
                        <Spinner size="lg" />
                      </div>
                    ) : error ? (
                      <Alert variant="destructive" data-testid={`${testId}-error`}>
                        <AlertDescription className="gba:mb-4">
                          {error}
                        </AlertDescription>
                        <Button
                          variant="outline"
                          onClick={loadTemplates}
                          data-testid={`${testId}-retry`}
                        >
                          Retry
                        </Button>
                      </Alert>
                    ) : (
                      <FlowTemplateList 
                        templates={templates} 
                        onCreateNew={handleCreateNew}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onTemplateSelect={handleTemplateSelect}
                        selectedTemplate={previewTemplate}
                        data-testid={`${testId}-list`} 
                        accessToken={accessToken}
                      />
                    )}
                  </div>
                </div>

                {/* Right Side - Preview */}
                <div className="gba:lg:col-span-1 gba:w-full">
                  <FlowPreview 
                    template={previewTemplate}
                    data-testid={`${testId}-preview`}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          )}
        </div>
        
        {/* Wizard Dialog */}
        <FlowWizardDialog
          visible={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onComplete={async (template: any) => {
            await saveTemplate(template.template);
            setIsWizardOpen(false);
          }}
          data-testid={`${testId}-wizard-dialog`}
        />
      </div>
    </MockDataProvider>
  );
};

export default FlowCreator;
