import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowTemplateList } from './components/FlowTemplateList'
import { FlowPreview } from './components/FlowPreview'
import { FlowWizardDialog } from './components/wizard/FlowWizardDialog'
import { AIFlowGenerator } from './components/AIFlowGenerator'
import { useFlowTemplateStore } from './hooks/useFlowTemplateStore'
import { useWizardStore } from './hooks/useWizardStore'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import {
  Spinner,
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  PageLayout
} from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import {
  Settings,
  FileText,
  Users,
  CheckCircle,
  MessageSquare,
  ClipboardList,
  RefreshCw,
  Building2,
  Briefcase,
  Heart,
  Truck,
  ShoppingCart,
  Banknote,
  Shield,
  Factory,
  Wrench,
  UserCheck,
  Calculator,
  TrendingUp,
  Headphones,
  Cpu,
  Globe,
  Calendar,
  Zap,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { MockDataProvider } from '../../providers/MockDataProvider'
import { FlowDesigner } from './components/designer/FlowDesigner'

/**
 * Flow Creator App component for defining workflow templates
 */
interface FlowCreatorProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const FlowCreator: React.FC<FlowCreatorProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'flow-creator'
}) => {
  // API Integration
  const flowTemplateClient = useFlowTemplateClient(accessToken)

  // State management
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination and search state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const itemsPerPage = 20

  // Use ref to always get current search term in callbacks
  const currentSearchTermRef = useRef(searchTerm)
  useEffect(() => {
    currentSearchTermRef.current = searchTerm
  }, [searchTerm])

  // Helper functions for URL-based state (must be defined before useState calls that use them)
  // Get template ID from URL query parameters
  const getTemplateIdFromUrl = (): string | null => {
    if (typeof window === 'undefined') return null
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('templateId')
  }

  // Update URL with template ID (for deep linking)
  const updateUrlWithTemplateId = (templateId: string | null) => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)

    if (templateId) {
      urlParams.set('templateId', templateId)
    } else {
      urlParams.delete('templateId')
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}${window.location.hash}`
    window.history.replaceState({}, '', newUrl)
  }

  // Initialize activeTab from URL hash on mount
  const getInitialTab = (): 'create' | 'manage' => {
    if (globalThis.window !== undefined) {
      const hash = globalThis.location.hash.replace('#', '')
      if (hash === 'create' || hash === 'manage') {
        return hash
      }
      // If there's a templateId in URL, default to manage tab
      const templateId = getTemplateIdFromUrl()
      if (templateId) {
        return 'manage'
      }
    }
    return 'create'
  }

  // Check if designer should be initially open (from URL)
  const getInitialShowDesigner = (): boolean => {
    if (typeof window === 'undefined') return false
    return !!getTemplateIdFromUrl()
  }

  // State declarations (after helper functions are defined)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [showDesigner, setShowDesigner] = useState(getInitialShowDesigner)
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<FlowTemplate | null>(null)
  const [isLoadingTemplateFromUrl, setIsLoadingTemplateFromUrl] = useState(getInitialShowDesigner)
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>(getInitialTab)
  const { resetTemplate } = useFlowTemplateStore()

  // Sync with URL hash for deep links (#create, #manage)
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === 'create' || hash === 'manage') {
        setActiveTab(hash)
      }
    }
    const handler = () => applyHash()
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  useEffect(() => {
    const current = window.location.hash.replace('#', '')
    if (current !== activeTab) {
      window.location.hash = activeTab
    }
  }, [activeTab])

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
  ]

  // State for expanded patterns
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedSubPattern, setSelectedSubPattern] = useState<any>(null)
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all')
  const [patternMode, setPatternMode] = useState<'general' | 'industry' | 'department'>('general')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')

  // Core Industry categories (focus on internal processes)
  const industryCategories = [
    {
      id: 'manufacturing',
      name: 'Manufacturing',
      icon: Factory,
      color: 'gba:bg-orange-100 gba:text-orange-600'
    },
    {
      id: 'finance',
      name: 'Financial Services',
      icon: Banknote,
      color: 'gba:bg-green-100 gba:text-green-600'
    },
    {
      id: 'healthcare',
      name: 'Healthcare',
      icon: Heart,
      color: 'gba:bg-red-100 gba:text-red-600'
    },
    {
      id: 'retail',
      name: 'Retail & Commerce',
      icon: ShoppingCart,
      color: 'gba:bg-purple-100 gba:text-purple-600'
    },
    {
      id: 'technology',
      name: 'Technology & Software',
      icon: Cpu,
      color: 'gba:bg-blue-100 gba:text-blue-600'
    },
    {
      id: 'logistics',
      name: 'Logistics & Supply Chain',
      icon: Truck,
      color: 'gba:bg-indigo-100 gba:text-indigo-600'
    },
    {
      id: 'energy',
      name: 'Energy & Utilities',
      icon: Zap,
      color: 'gba:bg-yellow-100 gba:text-yellow-600'
    },
    {
      id: 'construction',
      name: 'Construction & Real Estate',
      icon: Building2,
      color: 'gba:bg-stone-100 gba:text-stone-600'
    },
    {
      id: 'consulting',
      name: 'Professional Services',
      icon: Briefcase,
      color: 'gba:bg-slate-100 gba:text-slate-600'
    },
    {
      id: 'telecommunications',
      name: 'Telecommunications',
      icon: Globe,
      color: 'gba:bg-cyan-100 gba:text-cyan-600'
    }
  ]

  // Department categories
  const departmentCategories = [
    {
      id: 'hr',
      name: 'Human Resources',
      icon: UserCheck,
      color: 'gba:bg-emerald-100 gba:text-emerald-600'
    },
    {
      id: 'finance',
      name: 'Finance & Accounting',
      icon: Calculator,
      color: 'gba:bg-green-100 gba:text-green-600'
    },
    {
      id: 'sales',
      name: 'Sales & Marketing',
      icon: TrendingUp,
      color: 'gba:bg-blue-100 gba:text-blue-600'
    },
    {
      id: 'it',
      name: 'IT & Technology',
      icon: Cpu,
      color: 'gba:bg-purple-100 gba:text-purple-600'
    },
    {
      id: 'operations',
      name: 'Operations',
      icon: Wrench,
      color: 'gba:bg-orange-100 gba:text-orange-600'
    },
    {
      id: 'legal',
      name: 'Legal & Compliance',
      icon: Shield,
      color: 'gba:bg-yellow-100 gba:text-yellow-600'
    },
    {
      id: 'procurement',
      name: 'Procurement',
      icon: ClipboardList,
      color: 'gba:bg-indigo-100 gba:text-indigo-600'
    },
    {
      id: 'customer-service',
      name: 'Customer Service',
      icon: Headphones,
      color: 'gba:bg-pink-100 gba:text-pink-600'
    }
  ]

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
  }

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
  }

  // No conversion needed - using the same format everywhere!

  // Load templates from API with pagination and search
  const loadTemplates = useCallback(
    async (page: number = 1, search: string = '', resetPreview: boolean = true) => {
      try {
        setIsLoading(true)
        setError(null)

        // Always update search term state to match the actual search being performed
        setSearchTerm(search)
        if (search !== '') {
          setIsSearching(true)
          setCurrentPage(1)
        }

        const offset = (page - 1) * itemsPerPage
        const response = await flowTemplateClient.getTemplatesList({
          limit: itemsPerPage,
          offset,
          search: search.trim() || undefined,
          onlyLatest: true,
          includeDrafts: true
        })

        console.log(
          `FlowCreator: Loaded ${response.templates.length} templates (page ${page}, total: ${response.totalCount})`
        )
        console.log(`Pagination: Setting current page to ${page}, total count to ${response.totalCount}`)

        setTemplates(response.templates)
        setTotalCount(response.totalCount)
        setCurrentPage(page)

        // Auto-select first template for preview on first load or search
        if (resetPreview && response.templates.length > 0) {
          console.log('FlowCreator: Auto-selecting first template:', response.templates[0].name)
          setPreviewTemplate(response.templates[0])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load templates')
        console.error('Error loading templates:', err)
      } finally {
        setIsLoading(false)
        setIsSearching(false)
      }
    },
    [flowTemplateClient, itemsPerPage]
  )

  // Calculate pagination info first
  const totalPages = useMemo(() => {
    const pages = Math.ceil(totalCount / itemsPerPage)
    console.log(`Pagination calc: totalCount=${totalCount}, itemsPerPage=${itemsPerPage}, totalPages=${pages}`)
    return pages
  }, [totalCount, itemsPerPage])
  const startItem = useMemo(() => (currentPage - 1) * itemsPerPage + 1, [currentPage, itemsPerPage])
  const endItem = useMemo(
    () => Math.min(currentPage * itemsPerPage, totalCount),
    [currentPage, itemsPerPage, totalCount]
  )

  // Debounced search handler
  const handleSearch = useCallback(
    (searchValue: string) => {
      loadTemplates(1, searchValue, true)
    },
    [loadTemplates]
  )

  // Pagination handlers
  const handlePageChange = useCallback(
    (page: number) => {
      const currentSearch = currentSearchTermRef.current
      console.log(`Pagination: Requesting page ${page}, current: ${currentPage}, total pages: ${totalPages}`)
      console.log(`Pagination: Using current searchTerm: "${currentSearch}"`)
      if (page >= 1 && page <= totalPages) {
        loadTemplates(page, currentSearch, false)
      } else {
        console.warn(`Invalid page requested: ${page} (valid range: 1-${totalPages})`)
      }
    },
    [totalPages, currentPage, loadTemplates]
  )

  // Load templates on component mount
  useEffect(() => {
    console.log('FlowCreator: accessToken =', accessToken ? 'PRESENT' : 'MISSING')
    if (accessToken) {
      console.log('FlowCreator: Making API call to load templates')
      loadTemplates(1, '', true)
    } else {
      console.log('FlowCreator: No accessToken, skipping API call')
    }
  }, [accessToken])

  // Load template from URL on mount (for deep linking)
  useEffect(() => {
    const loadTemplateFromUrl = async () => {
      const templateId = getTemplateIdFromUrl()
      if (templateId && accessToken) {
        console.log('FlowCreator: Loading template from URL:', templateId)
        try {
          const template = await flowTemplateClient.getTemplate(templateId)
          setSelectedTemplate(template)
          setShowDesigner(true)
          setActiveTab('manage')
        } catch (error) {
          console.error('Failed to load template from URL:', error)
          // Clear invalid templateId from URL
          updateUrlWithTemplateId(null)
          setShowDesigner(false)
        } finally {
          setIsLoadingTemplateFromUrl(false)
        }
      } else {
        setIsLoadingTemplateFromUrl(false)
      }
    }

    loadTemplateFromUrl()
  }, [accessToken, flowTemplateClient])

  // Handle browser back/forward navigation for templateId
  useEffect(() => {
    const handlePopState = () => {
      const templateId = getTemplateIdFromUrl()
      if (templateId) {
        // Template ID in URL - show designer
        flowTemplateClient
          .getTemplate(templateId)
          .then(template => {
            setSelectedTemplate(template)
            setShowDesigner(true)
            setActiveTab('manage')
          })
          .catch(() => {
            // Invalid template - clear URL and go to list
            updateUrlWithTemplateId(null)
            setShowDesigner(false)
            setSelectedTemplate(null)
          })
      } else {
        // No template ID - close designer
        setShowDesigner(false)
        setSelectedTemplate(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [flowTemplateClient])

  // Save template (create or update) - implements template ID immutability
  const saveTemplate = async (template: FlowTemplate) => {
    try {
      if (template.id) {
        // Update existing template - ID remains immutable
        await flowTemplateClient.updateTemplate(template.id, template)
        console.log(`Template updated successfully. ID "${template.id}" remains unchanged.`)
      } else {
        // Create new template - ID will be derived from name
        const createdTemplate = await flowTemplateClient.createTemplate(template)
        console.log(`Template created successfully with ID derived from name: "${createdTemplate.name}"`)
      }

      // Reload templates to get updated list
      await loadTemplates()

      // Close the designer after successful save
      setShowDesigner(false)
      setSelectedTemplate(null)
      // Clear templateId from URL
      updateUrlWithTemplateId(null)
    } catch (err) {
      console.error('Error saving template:', err)
      throw err
    }
  }

  const handleCreateNew = () => {
    // Open new FlowDesigner for creating templates
    setSelectedTemplate(null) // Clear any existing template
    setShowDesigner(true)
    setActiveTab('manage') // Stay in manage tab context
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleOpenLegacyWizard = () => {
    // Legacy wizard (kept for special cases)
    resetTemplate()
    setSelectedTemplate(null)
    useWizardStore.getState().initializeForCreate()
    setIsWizardOpen(true)
  }

  // Removed handleWizardCreate and handleCustomCreate as they're no longer needed

  const handleEdit = async (template: FlowTemplate) => {
    try {
      // Try to get the template for better editing experience
      if (template.id) {
        const fullTemplate = await flowTemplateClient.getTemplate(template.id)
        setSelectedTemplate(fullTemplate)
        // Update URL with template ID for deep linking
        updateUrlWithTemplateId(template.id)
      } else {
        setSelectedTemplate(template)
      }
      // Open the FlowDesigner instead of the wizard for editing
      setShowDesigner(true)
      setActiveTab('manage') // Stay in manage tab context
    } catch (error) {
      // Fallback to the current template if original is not available
      console.warn('Could not load original template, using current:', error)
      setSelectedTemplate(template)
      setShowDesigner(true)
      setActiveTab('manage') // Stay in manage tab context
      // Still update URL if template has ID
      if (template.id) {
        updateUrlWithTemplateId(template.id)
      }
    }
  }

  const handleDelete = async (template: FlowTemplate) => {
    if (!template.id) {
      throw new Error('Cannot delete template without ID')
    }

    try {
      await flowTemplateClient.deleteTemplate(template.id)
      // Reload templates to get updated list
      await loadTemplates()
    } catch (err) {
      console.error('Error deleting template:', err)
      throw err
    }
  }

  const handleTemplateSelect = (template: FlowTemplate | null) => {
    console.log('FlowCreator: Template selected:', template?.name || 'null')
    setPreviewTemplate(template)
  }

  // Pattern expansion handler
  const handlePatternExpand = (patternId: string) => {
    setExpandedPattern(expandedPattern === patternId ? null : patternId)
    setSelectedSubPattern(null)
  }

  // Sub-pattern selection handler
  const handleSubPatternSelect = (subPattern: any) => {
    setSelectedSubPattern(subPattern)
    console.log('Selected sub-pattern:', subPattern)

    // Open wizard with pattern context and template definition
    resetTemplate()
    setSelectedTemplate(null)
    useWizardStore.getState().initializeForCreate()
    // Pass the selected pattern template definition to wizard
    // TODO: Pass subPattern data to wizard for pre-configuration
    setIsWizardOpen(true)
  }

  // Get patterns based on current mode
  const getCurrentPatterns = () => {
    if (patternMode === 'general') {
      return businessPatterns
    } else if (patternMode === 'industry') {
      // Industry mode
      if (selectedIndustry === 'all') {
        // Return all industry patterns combined
        return Object.values(industrySpecificPatterns).flat()
      } else {
        // Return patterns for selected industry
        return industrySpecificPatterns[selectedIndustry as keyof typeof industrySpecificPatterns] || []
      }
    } else {
      // Department mode
      if (selectedDepartment === 'all') {
        // Return all department patterns combined
        return Object.values(departmentSpecificPatterns).flat()
      } else {
        // Return patterns for selected department
        return departmentSpecificPatterns[selectedDepartment as keyof typeof departmentSpecificPatterns] || []
      }
    }
  }

  // Get available industries that have patterns
  const getAvailableIndustries = () => {
    return industryCategories.filter(
      industry => industrySpecificPatterns[industry.id as keyof typeof industrySpecificPatterns]
    )
  }

  // Get available departments that have patterns
  const getAvailableDepartments = () => {
    return departmentCategories.filter(
      department => departmentSpecificPatterns[department.id as keyof typeof departmentSpecificPatterns]
    )
  }

  // Handle pattern mode change
  const handlePatternModeChange = (mode: 'general' | 'industry' | 'department') => {
    setPatternMode(mode)
    setExpandedPattern(null)
    setSelectedSubPattern(null)

    if (mode === 'industry') {
      // Set default to show all industries
      setSelectedIndustry('all')
    } else if (mode === 'department') {
      // Set default to show all departments
      setSelectedDepartment('all')
    }
  }

  return (
    <MockDataProvider>
      <div className="gba:min-h-screen gba:bg-background" data-testid={testId}>
        {/* Main Content */}
        <div className="gba:w-full gba:max-w-none">
          {isLoadingTemplateFromUrl ? (
            <div
              className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-[400px]"
              data-testid={`${testId}-loading-from-url`}
            >
              <Spinner size="lg" />
              <span className="gba:mt-4 gba:text-muted-foreground">Loading template...</span>
            </div>
          ) : showDesigner ? (
            <div className="gba:w-full gba:max-w-7xl gba:mx-auto gba:px-4 gba:sm:px-6 gba:lg:px-8 gba:py-8">
              {/* Designer Header */}
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-6 gba:pb-6 gba:border-b gba:border-border">
                <div className="gba:flex gba:items-center gba:gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDesigner(false)
                      setSelectedTemplate(null)
                      updateUrlWithTemplateId(null)
                    }}
                    data-testid={`${testId}-designer-back`}
                  >
                    <ChevronLeft className="gba:h-4 gba:w-4 gba:mr-1" />
                    Back
                  </Button>
                  <div className="gba:h-6 gba:w-px gba:bg-border" />
                  <div>
                    <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">
                      {selectedTemplate?.name || 'New Flow'}
                    </h2>
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {selectedTemplate ? 'Editing flow' : 'Create a new flow'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Designer Content */}
              <Card className="gba:border-border">
                <CardContent className="gba:p-0">
                  <FlowDesigner
                    accessToken={accessToken}
                    userInfo={userInfo}
                    initialTemplate={selectedTemplate}
                    onSave={saveTemplate}
                    onCancel={() => {
                      setShowDesigner(false)
                      setSelectedTemplate(null)
                      updateUrlWithTemplateId(null)
                    }}
                    data-testid={`${testId}-designer`}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <PageLayout
              headerIcon={Zap}
              headerTitle={getTranslationFromI18nKeyAndLabel('flow.creator.title', 'Flow Creator')}
              headerDescription="Design & automate flows"
              headerSubViews={{
                value: activeTab,
                onValueChange: (value: string) => setActiveTab(value as 'create' | 'manage'),
                items: [
                  {
                    value: 'create',
                    label: 'Create',
                    icon: <Sparkles className="gba:h-4 gba:w-4" />
                  },
                  {
                    value: 'manage',
                    label: `Templates${totalCount > 0 ? ` (${totalCount})` : ''}`,
                    icon: <FileText className="gba:h-4 gba:w-4" />
                  }
                ]
              }}
              className="gba:min-h-screen"
            >
              {/* Create Tab Content */}
              {activeTab === 'create' && (
                <div className="gba:max-w-7xl gba:mx-auto gba:px-4 gba:sm:px-6 gba:lg:px-8 gba:pt-10 gba:pb-16">
                  {/* Hero Section - OpenAI inspired */}
                  <div className="gba:relative gba:mb-16 gba:pb-12" data-testid={`${testId}-hero`}>
                    {/* Subtle gradient background */}
                    <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-accent/30 gba:via-transparent gba:to-transparent gba:pointer-events-none" />

                    <div className="gba:relative gba:max-w-4xl gba:mx-auto gba:text-center gba:px-4">
                      {/* Badge */}
                      <div className="gba:inline-flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-sm gba:font-medium gba:mb-6">
                        <Sparkles className="gba:h-4 gba:w-4" />
                        AI-Powered Flow Builder
                      </div>

                      {/* Main headline */}
                      <h1 className="gba:text-5xl gba:sm:text-6xl gba:font-semibold gba:tracking-tight gba:text-foreground gba:mb-6">
                        Build flows that <span className="gba:text-primary">work</span>
                      </h1>

                      {/* Subtitle */}
                      <p className="gba:text-xl gba:text-muted-foreground gba:max-w-2xl gba:mx-auto gba:mb-12 gba:leading-relaxed">
                        Create powerful automated flows in minutes. Describe what you need, or start from proven
                        templates.
                      </p>

                      {/* Dual CTA - AI and Manual side by side */}
                      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6 gba:max-w-3xl gba:mx-auto">
                        {/* AI Creation Card */}
                        <div
                          className="gba:group gba:relative gba:p-8 gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:text-left gba:transition-all gba:duration-300 gba:hover:border-primary/50 gba:hover:shadow-lg gba:cursor-pointer"
                          onClick={() => {
                            const aiTextarea = document.querySelector(
                              '[data-testid="flow-creator-ai-generator-ai-prompt"]'
                            ) as HTMLTextAreaElement
                            if (aiTextarea) {
                              aiTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              setTimeout(() => aiTextarea.focus(), 500)
                            }
                          }}
                          data-testid={`${testId}-hero-ai-cta`}
                        >
                          {/* Gradient accent */}
                          <div className="gba:absolute gba:inset-0 gba:rounded-2xl gba:bg-gradient-to-br gba:from-primary/5 gba:to-transparent gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity" />

                          <div className="gba:relative">
                            <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mb-4 gba:group-hover:scale-110 gba:transition-transform">
                              <Sparkles className="gba:h-6 gba:w-6 gba:text-primary" />
                            </div>
                            <h3 className="gba:text-xl gba:font-semibold gba:text-card-foreground gba:mb-2">
                              Create with AI
                            </h3>
                            <p className="gba:text-muted-foreground gba:text-sm gba:leading-relaxed">
                              Describe your flow in plain language. Our AI will design it for you instantly.
                            </p>
                            <div className="gba:mt-4 gba:flex gba:items-center gba:text-primary gba:text-sm gba:font-medium">
                              Get started
                              <ChevronRight className="gba:h-4 gba:w-4 gba:ml-1 gba:group-hover:translate-x-1 gba:transition-transform" />
                            </div>
                          </div>
                        </div>

                        {/* Manual Creation Card */}
                        <div
                          className="gba:group gba:relative gba:p-8 gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:text-left gba:transition-all gba:duration-300 gba:hover:border-primary/50 gba:hover:shadow-lg gba:cursor-pointer"
                          onClick={() => setShowDesigner(true)}
                          data-testid={`${testId}-hero-manual-cta`}
                        >
                          {/* Gradient accent */}
                          <div className="gba:absolute gba:inset-0 gba:rounded-2xl gba:bg-gradient-to-br gba:from-secondary/50 gba:to-transparent gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity" />

                          <div className="gba:relative">
                            <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-secondary gba:flex gba:items-center gba:justify-center gba:mb-4 gba:group-hover:scale-110 gba:transition-transform">
                              <Settings className="gba:h-6 gba:w-6 gba:text-secondary-foreground" />
                            </div>
                            <h3 className="gba:text-xl gba:font-semibold gba:text-card-foreground gba:mb-2">
                              Build from Scratch
                            </h3>
                            <p className="gba:text-muted-foreground gba:text-sm gba:leading-relaxed">
                              Full creative control. Design every step with our visual flow builder.
                            </p>
                            <div className="gba:mt-4 gba:flex gba:items-center gba:text-primary gba:text-sm gba:font-medium">
                              Open designer
                              <ChevronRight className="gba:h-4 gba:w-4 gba:ml-1 gba:group-hover:translate-x-1 gba:transition-transform" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Section - Prominent */}
                  <div className="gba:mb-16">
                    <div className="gba:max-w-3xl gba:mx-auto">
                      <AIFlowGenerator data-testid={`${testId}-ai-generator`} />
                    </div>
                  </div>

                  {/* Templates Section */}
                  <div className="gba:mb-12">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-8">
                      <div>
                        <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground gba:mb-2">
                          Start from a template
                        </h2>
                        <p className="gba:text-muted-foreground">Proven flow patterns to get you started quickly</p>
                      </div>

                      {/* Mode Toggle - Sleeker */}
                      <div className="gba:flex gba:items-center gba:p-1 gba:bg-muted gba:rounded-lg">
                        <button
                          onClick={() => handlePatternModeChange('general')}
                          className={`gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:rounded-md gba:transition-all ${
                            patternMode === 'general'
                              ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
                              : 'gba:text-muted-foreground gba:hover:text-foreground'
                          }`}
                          data-testid={`${testId}-general-patterns-toggle`}
                        >
                          General
                        </button>
                        <button
                          onClick={() => handlePatternModeChange('industry')}
                          className={`gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:rounded-md gba:transition-all ${
                            patternMode === 'industry'
                              ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
                              : 'gba:text-muted-foreground gba:hover:text-foreground'
                          }`}
                          data-testid={`${testId}-industry-patterns-toggle`}
                        >
                          Industry
                        </button>
                        <button
                          onClick={() => handlePatternModeChange('department')}
                          className={`gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:rounded-md gba:transition-all ${
                            patternMode === 'department'
                              ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
                              : 'gba:text-muted-foreground gba:hover:text-foreground'
                          }`}
                          data-testid={`${testId}-department-patterns-toggle`}
                        >
                          Department
                        </button>
                      </div>
                    </div>

                    {/* Industry/Department Filter */}
                    {(patternMode === 'industry' || patternMode === 'department') && (
                      <div className="gba:mb-8">
                        <Select
                          value={patternMode === 'industry' ? selectedIndustry : selectedDepartment}
                          onValueChange={patternMode === 'industry' ? setSelectedIndustry : setSelectedDepartment}
                        >
                          <SelectTrigger className="gba:w-64">
                            <SelectValue placeholder={`Filter by ${patternMode}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              All {patternMode === 'industry' ? 'Industries' : 'Departments'}
                            </SelectItem>
                            {(patternMode === 'industry' ? getAvailableIndustries() : getAvailableDepartments()).map(
                              category => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Pattern Grid - Clean Bento Style */}
                    {getCurrentPatterns().length > 0 ? (
                      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
                        {getCurrentPatterns().map(pattern => {
                          const IconComponent = pattern.icon
                          const isExpanded = expandedPattern === pattern.id

                          return (
                            <div
                              key={pattern.id}
                              className={`gba:group gba:relative gba:rounded-xl gba:border gba:border-border gba:bg-card gba:transition-all gba:duration-200 ${
                                isExpanded
                                  ? 'gba:ring-2 gba:ring-primary gba:border-primary'
                                  : 'gba:hover:border-primary/50 gba:hover:shadow-md'
                              }`}
                            >
                              {/* Pattern Header */}
                              <div
                                onClick={() => handlePatternExpand(pattern.id)}
                                className="gba:p-5 gba:cursor-pointer"
                                data-testid={`${testId}-pattern-${pattern.id}`}
                              >
                                <div className="gba:flex gba:items-start gba:gap-4">
                                  <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
                                    <IconComponent className="gba:h-5 gba:w-5 gba:text-primary" />
                                  </div>
                                  <div className="gba:flex-1 gba:min-w-0">
                                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                                      <h4 className="gba:font-medium gba:text-card-foreground">{pattern.name}</h4>
                                      <Badge variant="secondary" className="gba:text-xs gba:shrink-0">
                                        {pattern.subPatterns.length}
                                      </Badge>
                                    </div>
                                    <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2">
                                      {pattern.description}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Sub-patterns */}
                              {isExpanded && (
                                <div className="gba:border-t gba:border-border gba:p-4 gba:bg-muted/30">
                                  <div className="gba:space-y-2">
                                    {pattern.subPatterns.map(subPattern => (
                                      <div
                                        key={subPattern.id}
                                        onClick={() => handleSubPatternSelect(subPattern)}
                                        className="gba:p-3 gba:rounded-lg gba:bg-background gba:border gba:border-border gba:cursor-pointer gba:transition-all gba:hover:border-primary/50"
                                        data-testid={`${testId}-subpattern-${subPattern.id}`}
                                      >
                                        <h5 className="gba:font-medium gba:text-sm gba:text-card-foreground gba:mb-1">
                                          {subPattern.name}
                                        </h5>
                                        <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">
                                          {subPattern.description}
                                        </p>
                                        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                                          <span>{subPattern.steps.length} steps</span>
                                          <span>•</span>
                                          <span>{subPattern.roles.length} roles</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="gba:text-center gba:py-16 gba:px-4">
                        <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                          {patternMode === 'industry' ? (
                            <Building2 className="gba:h-8 gba:w-8 gba:text-muted-foreground" />
                          ) : patternMode === 'department' ? (
                            <UserCheck className="gba:h-8 gba:w-8 gba:text-muted-foreground" />
                          ) : (
                            <Briefcase className="gba:h-8 gba:w-8 gba:text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">
                          No templates available yet
                        </h3>
                        <p className="gba:text-muted-foreground gba:max-w-md gba:mx-auto gba:mb-6">
                          We're working on adding more templates. Try using AI to create a custom flow, or browse
                          general patterns.
                        </p>
                        <Button
                          onClick={() => handlePatternModeChange('general')}
                          variant="outline"
                          data-testid={`${testId}-switch-to-general`}
                        >
                          Browse General Patterns
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Manage Tab Content */}
              {activeTab === 'manage' && (
                <div className="gba:max-w-7xl gba:mx-auto gba:px-4 gba:sm:px-6 gba:lg:px-8 gba:pt-10 gba:pb-16">
                  {/* Header */}
                  <div className="gba:mb-8">
                    <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground gba:mb-2">Your Flows</h2>
                    <p className="gba:text-muted-foreground">Manage and edit your flow templates</p>
                  </div>

                  <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-8 gba:w-full gba:min-h-[600px]">
                    {/* Left Side - Template List */}
                    <div className="gba:lg:col-span-2 gba:w-full">
                      <div className="gba:space-y-6">
                        {/* Search and Actions Bar */}
                        <div className="gba:flex gba:flex-col gba:sm:flex-row gba:gap-4 gba:items-start gba:sm:items-center gba:justify-between">
                          <div className="gba:flex-1 gba:max-w-md">
                            <div className="gba:relative">
                              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:h-4 gba:w-4" />
                              <DebouncedInput
                                placeholder="Search templates..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="gba:pl-10"
                                debounceDelay={500}
                                data-testid={`${testId}-search`}
                              />
                            </div>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-3">
                            {totalCount > 0 && (
                              <span
                                className="gba:text-sm gba:text-muted-foreground"
                                data-testid={`${testId}-results-count`}
                              >
                                {startItem}-{endItem} of {totalCount}
                              </span>
                            )}
                            <Button onClick={handleCreateNew} data-testid={`${testId}-create-new-btn`}>
                              <Sparkles className="gba:h-4 gba:w-4 gba:mr-2" />
                              New Flow
                            </Button>
                          </div>
                        </div>

                        {/* Loading State */}
                        {isLoading ? (
                          <div
                            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16"
                            data-testid={`${testId}-loading`}
                          >
                            <Spinner size="lg" />
                            <span className="gba:mt-4 gba:text-muted-foreground">
                              {isSearching ? 'Searching...' : 'Loading templates...'}
                            </span>
                          </div>
                        ) : error ? (
                          <Alert variant="destructive" data-testid={`${testId}-error`}>
                            <AlertDescription className="gba:mb-4">{error}</AlertDescription>
                            <Button
                              variant="outline"
                              onClick={() => loadTemplates(currentPage, searchTerm)}
                              data-testid={`${testId}-retry`}
                            >
                              Retry
                            </Button>
                          </Alert>
                        ) : (
                          <>
                            {/* Template List */}
                            <FlowTemplateList
                              templates={templates}
                              searchTerm={searchTerm}
                              onCreateNew={handleCreateNew}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onTemplateSelect={handleTemplateSelect}
                              selectedTemplate={previewTemplate}
                              data-testid={`${testId}-list`}
                              accessToken={accessToken}
                            />

                            {/* Pagination */}
                            {totalPages > 1 && (
                              <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:mt-8 gba:pt-6 gba:border-t gba:border-border">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePageChange(currentPage - 1)}
                                  disabled={currentPage === 1}
                                  data-testid={`${testId}-prev-page`}
                                >
                                  <ChevronLeft className="gba:h-4 gba:w-4" />
                                </Button>

                                <span className="gba:text-sm gba:text-muted-foreground gba:px-4">
                                  Page {currentPage} of {totalPages}
                                </span>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePageChange(currentPage + 1)}
                                  disabled={currentPage === totalPages}
                                  data-testid={`${testId}-next-page`}
                                >
                                  <ChevronRight className="gba:h-4 gba:w-4" />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Side - Preview */}
                    <div className="gba:lg:col-span-1 gba:w-full">
                      <FlowPreview template={previewTemplate} data-testid={`${testId}-preview`} />
                    </div>
                  </div>
                </div>
              )}
            </PageLayout>
          )}
        </div>

        {/* Wizard Dialog */}
        <FlowWizardDialog
          visible={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onComplete={async (template: any) => {
            await saveTemplate(template.template)
            setIsWizardOpen(false)
          }}
          context={{ accessToken, userInfo }}
          data-testid={`${testId}-wizard-dialog`}
        />
      </div>
    </MockDataProvider>
  )
}

export default FlowCreator
