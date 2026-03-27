/**
 * Business pattern definitions for the Create view (template from scratch).
 * General patterns only; industry/department can be added later.
 */

import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle,
  MessageSquare,
  Users,
  ClipboardList,
  RefreshCw
} from 'lucide-react'

export interface SubPattern {
  id: string
  name: string
  description: string
  steps: string[]
  roles: string[]
}

export interface CreateViewPattern {
  id: string
  name: string
  description: string
  icon: LucideIcon
  color: string
  subPatterns: SubPattern[]
}

export const businessPatterns: CreateViewPattern[] = [
  {
    id: 'approval',
    name: 'Approval Workflows',
    description: 'Get authorization and sign-offs from stakeholders',
    icon: CheckCircle,
    color: 'gba:bg-blue-100 gba:text-blue-600',
    subPatterns: [
      { id: 'document-approval', name: 'Document Approval', description: 'Multi-step document review and approval process', steps: ['Submit Document', 'Manager Review', 'Department Head Approval', 'Final Approval'], roles: ['Submitter', 'Manager', 'Department Head', 'Approver'] },
      { id: 'expense-approval', name: 'Expense Approval', description: 'Expense report review and reimbursement workflow', steps: ['Submit Expense', 'Manager Review', 'Finance Approval', 'Payment Processing'], roles: ['Employee', 'Manager', 'Finance Team', 'Accounting'] },
      { id: 'leave-request', name: 'Leave Request', description: 'Time-off request and approval workflow', steps: ['Submit Request', 'Manager Approval', 'HR Review', 'Calendar Update'], roles: ['Employee', 'Manager', 'HR Team'] },
      { id: 'budget-approval', name: 'Budget Approval', description: 'Budget proposal review and approval process', steps: ['Submit Proposal', 'Department Review', 'Finance Review', 'Executive Approval'], roles: ['Requestor', 'Department Head', 'Finance Team', 'Executive'] }
    ]
  },
  {
    id: 'information',
    name: 'Information Distribution',
    description: 'Share announcements and updates across teams',
    icon: MessageSquare,
    color: 'gba:bg-green-100 gba:text-green-600',
    subPatterns: [
      { id: 'company-announcement', name: 'Company Announcement', description: 'Broadcast important company news and updates', steps: ['Create Announcement', 'Review Content', 'Schedule Distribution', 'Send Notification'], roles: ['Content Creator', 'Reviewer', 'Communications Team'] },
      { id: 'policy-update', name: 'Policy Update', description: 'Communicate policy changes across organization', steps: ['Policy Review', 'Update Documentation', 'Notify Stakeholders', 'Collect Acknowledgments'], roles: ['Policy Owner', 'Legal Team', 'HR Team', 'Employees'] },
      { id: 'newsletter', name: 'Newsletter Distribution', description: 'Regular newsletter creation and distribution', steps: ['Collect Content', 'Design Newsletter', 'Review & Approve', 'Distribute'], roles: ['Content Team', 'Designer', 'Editor', 'Distribution Manager'] }
    ]
  },
  {
    id: 'coordination',
    name: 'Task Coordination',
    description: 'Assign and track work across team members',
    icon: Users,
    color: 'gba:bg-orange-100 gba:text-orange-600',
    subPatterns: [
      { id: 'project-tasks', name: 'Project Task Management', description: 'Coordinate project tasks across team members', steps: ['Define Tasks', 'Assign Resources', 'Track Progress', 'Review Completion'], roles: ['Project Manager', 'Team Members', 'Stakeholders'] },
      { id: 'onboarding', name: 'Employee Onboarding', description: 'Complete onboarding workflow for new employees', steps: ['Welcome Process', 'Setup Accounts', 'Training Schedule', 'Integration Check'], roles: ['HR Team', 'IT Team', 'Manager', 'Buddy'] },
      { id: 'code-review', name: 'Code Review Process', description: 'Systematic code review and approval workflow', steps: ['Submit Code', 'Peer Review', 'Testing', 'Merge Approval'], roles: ['Developer', 'Reviewer', 'QA Team', 'Tech Lead'] }
    ]
  },
  {
    id: 'decision',
    name: 'Decision Making',
    description: 'Gather insights and feedback for informed decisions',
    icon: ClipboardList,
    color: 'gba:bg-purple-100 gba:text-purple-600',
    subPatterns: [
      { id: 'feature-prioritization', name: 'Feature Prioritization', description: 'Collaborative feature planning and prioritization', steps: ['Collect Ideas', 'Evaluate Impact', 'Stakeholder Review', 'Priority Decision'], roles: ['Product Manager', 'Engineering Team', 'Stakeholders', 'Leadership'] },
      { id: 'vendor-selection', name: 'Vendor Selection', description: 'Systematic vendor evaluation and selection process', steps: ['Define Requirements', 'Vendor Research', 'Evaluation Matrix', 'Final Decision'], roles: ['Procurement Team', 'Technical Team', 'Finance Team', 'Decision Maker'] },
      { id: 'strategic-planning', name: 'Strategic Planning', description: 'Long-term strategic decision making process', steps: ['Market Analysis', 'Option Generation', 'Impact Assessment', 'Strategic Decision'], roles: ['Strategy Team', 'Analysts', 'Leadership', 'Board Members'] }
    ]
  },
  {
    id: 'surveys',
    name: 'Surveys & Feedback',
    description: 'Collect feedback and opinions through structured surveys',
    icon: MessageSquare,
    color: 'gba:bg-red-100 gba:text-red-600',
    subPatterns: [
      { id: 'employee-satisfaction', name: 'Employee Satisfaction Survey', description: 'Regular employee satisfaction and engagement survey', steps: ['Design Survey', 'Distribute to Employees', 'Collect Responses', 'Analyze Results'], roles: ['HR Team', 'Employees', 'Management', 'Analytics Team'] },
      { id: 'customer-feedback', name: 'Customer Feedback Collection', description: 'Systematic customer feedback and satisfaction tracking', steps: ['Send Survey', 'Collect Feedback', 'Analyze Sentiment', 'Action Planning'], roles: ['Customer Success', 'Customers', 'Product Team', 'Management'] },
      { id: 'event-evaluation', name: 'Event Evaluation', description: 'Post-event feedback collection and analysis', steps: ['Event Completion', 'Send Evaluation', 'Gather Feedback', 'Improvement Planning'], roles: ['Event Organizer', 'Attendees', 'Analysis Team'] }
    ]
  },
  {
    id: 'request',
    name: 'Request & Response',
    description: 'Submit requests and manage responses efficiently',
    icon: RefreshCw,
    color: 'gba:bg-cyan-100 gba:text-cyan-600',
    subPatterns: [
      { id: 'it-support', name: 'IT Support Request', description: 'IT help desk and support ticket workflow', steps: ['Submit Ticket', 'Triage Request', 'Assign Technician', 'Resolve & Close'], roles: ['Employee', 'Help Desk', 'IT Technician', 'Supervisor'] },
      { id: 'resource-request', name: 'Resource Request', description: 'Request and approval workflow for resources', steps: ['Submit Request', 'Manager Review', 'Resource Allocation', 'Delivery Confirmation'], roles: ['Requestor', 'Manager', 'Resource Manager', 'Admin'] },
      { id: 'service-inquiry', name: 'Service Inquiry', description: 'Customer service inquiry and resolution workflow', steps: ['Receive Inquiry', 'Route to Expert', 'Provide Solution', 'Follow-up'], roles: ['Customer', 'Service Rep', 'Subject Expert', 'Quality Team'] }
    ]
  }
]
