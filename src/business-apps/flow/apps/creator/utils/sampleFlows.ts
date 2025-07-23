import { FlowTemplate, FlowStepType, InputType, AssignmentMode } from '../types/flowTemplate';

/**
 * Sample flow templates for testing the simplified flow creator
 */

// Sample 1: Simple Employee Onboarding Flow
export const employeeOnboardingFlow: FlowTemplate = {
  type: 'TEMPLATE',
  name: 'Employee Onboarding Process',
  description: 'A comprehensive onboarding process for new employees covering orientation, equipment setup, and initial training.',
  assignmentMode: AssignmentMode.CLAIM, // Template-level assignment mode
  steps: [
    {
      id: 'step-1',
      title: 'Welcome & Orientation',
      message: 'Welcome to the team! This step covers your initial orientation and introduction to company culture, policies, and procedures.',
      type: FlowStepType.INFORMATION,
      links: [
        {
          name: 'Employee Handbook',
          url: '/documents/employee-handbook.pdf'
        },
        {
          name: 'Company Policies',
          url: '/documents/company-policies.pdf'
        }
      ],
      inputs: []
    },
    {
      id: 'step-2',
      title: 'Equipment Setup',
      message: 'Let\'s get your workspace and equipment ready. Please complete the equipment request form and schedule your IT setup appointment.',
      type: FlowStepType.TASK,
      inputs: [
        {
          type: InputType.SELECT,
          name: 'laptop_type',
          label: 'Preferred Laptop Type',
          required: true,
          options: [
            { value: 'macbook_pro', label: 'MacBook Pro' },
            { value: 'macbook_air', label: 'MacBook Air' },
            { value: 'thinkpad', label: 'ThinkPad' },
            { value: 'surface', label: 'Surface Laptop' }
          ]
        },
        {
          type: InputType.MULTISELECT,
          name: 'accessories',
          label: 'Required Accessories',
          required: false,
          options: [
            { value: 'monitor', label: 'External Monitor' },
            { value: 'keyboard', label: 'Wireless Keyboard' },
            { value: 'mouse', label: 'Wireless Mouse' },
            { value: 'headset', label: 'Headset' },
            { value: 'webcam', label: 'Webcam' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'special_requirements',
          label: 'Special Requirements',
          required: false
        }
      ],
      assignment: {
        targets: [
          { entity: 'department', id: 'it-department' }
        ],
        allowReassignment: true
      }
    },
    {
      id: 'step-3',
      title: 'Initial Training Schedule',
      message: 'Schedule your mandatory training sessions. These sessions are required to be completed within your first two weeks.',
      type: FlowStepType.TASK,
      inputs: [
        {
          type: InputType.DATE,
          name: 'security_training_date',
          label: 'Security Training Date',
          required: true
        },
        {
          type: InputType.DATE,
          name: 'compliance_training_date',
          label: 'Compliance Training Date',
          required: true
        },
        {
          type: InputType.CHECKBOX,
          name: 'training_acknowledgment',
          label: 'I acknowledge that I understand the training requirements',
          required: true
        }
      ],
      assignment: {
        targets: [
          { entity: 'department', id: 'hr-department' }
        ],
        allowReassignment: false
      }
    },
    {
      id: 'step-4',
      title: 'Onboarding Complete',
      message: 'Congratulations! You have successfully completed the onboarding process. Welcome to the team!',
      type: FlowStepType.ACKNOWLEDGE,
      inputs: []
    }
  ]
};

// Sample 2: Document Approval Workflow
export const documentApprovalFlow: FlowTemplate = {
  type: 'TEMPLATE',
  name: 'Document Review & Approval',
  description: 'Standard document review and approval process with multiple approval levels and version control.',
  assignmentMode: AssignmentMode.CLAIM, // Template-level assignment mode
  steps: [
    {
      id: 'step-1',
      title: 'Document Submission',
      message: 'Submit your document for review and approval. Please ensure all required information is provided.',
      type: FlowStepType.TASK,
      inputs: [
        {
          type: InputType.TEXT,
          name: 'document_title',
          label: 'Document Title',
          required: true
        },
        {
          type: InputType.FILE,
          name: 'document_file',
          label: 'Document File',
          required: true
        },
        {
          type: InputType.SELECT,
          name: 'document_type',
          label: 'Document Type',
          required: true,
          options: [
            { value: 'policy', label: 'Policy Document' },
            { value: 'procedure', label: 'Procedure' },
            { value: 'guideline', label: 'Guideline' },
            { value: 'specification', label: 'Technical Specification' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'submission_notes',
          label: 'Submission Notes',
          required: false
        }
      ],
      assignment: {
        targets: [
          { entity: 'role', id: 'document-submitter' }
        ],
        allowReassignment: true
      }
    },
    {
      id: 'step-2',
      title: 'Initial Review',
      message: 'Conduct initial review of the submitted document. Check for completeness, formatting, and basic requirements.',
      type: FlowStepType.APPROVAL,
      inputs: [
        {
          type: InputType.SELECT,
          name: 'review_status',
          label: 'Review Status',
          required: true,
          options: [
            { value: 'approved', label: 'Approved' },
            { value: 'needs_revision', label: 'Needs Revision' },
            { value: 'rejected', label: 'Rejected' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'review_comments',
          label: 'Review Comments',
          required: true
        }
      ],
      assignment: {
        targets: [
          { entity: 'role', id: 'document-reviewer' }
        ],
        allowReassignment: true
      }
    },
    {
      id: 'step-3',
      title: 'Final Approval',
      message: 'Final approval step for the document. This approval will publish the document to the organization.',
      type: FlowStepType.APPROVAL,
      inputs: [
        {
          type: InputType.SELECT,
          name: 'final_decision',
          label: 'Final Decision',
          required: true,
          options: [
            { value: 'approved', label: 'Approved for Publication' },
            { value: 'rejected', label: 'Rejected' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'approval_notes',
          label: 'Approval Notes',
          required: false
        }
      ],
      assignment: {
        targets: [
          { entity: 'role', id: 'document-approver' }
        ],
        allowReassignment: false
      }
    }
  ]
};

// Sample 3: Self-Service Expense Report
export const selfServiceExpenseReport: FlowTemplate = {
  type: 'SELF_SERVICE',
  name: 'Expense Report Submission',
  description: 'Quick self-service expense report submission with automatic approval routing.',
  assignmentMode: AssignmentMode.ASSIGN,
  initStep: {
    title: 'Submit Expense Report',
    message: 'Please fill out your expense report details. All fields marked with * are required.',
    links: [
      {
        name: 'Expense Policy',
        url: '/documents/expense-policy.pdf'
      },
      {
        name: 'Expense Guidelines',
        url: '/documents/expense-guidelines.pdf'
      }
    ],
    inputs: [
      {
        type: InputType.TEXT,
        name: 'report_title',
        label: 'Report Title',
        required: true
      },
      {
        type: InputType.DATE,
        name: 'expense_date',
        label: 'Expense Date',
        required: true
      },
      {
        type: InputType.SELECT,
        name: 'expense_category',
        label: 'Expense Category',
        required: true,
        options: [
          { value: 'travel', label: 'Travel' },
          { value: 'meals', label: 'Meals & Entertainment' },
          { value: 'supplies', label: 'Office Supplies' },
          { value: 'training', label: 'Training & Education' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        type: InputType.NUMBER,
        name: 'amount',
        label: 'Amount',
        required: true
      },
      {
        type: InputType.TEXTAREA,
        name: 'description',
        label: 'Description',
        required: true
      },
      {
        type: InputType.FILE,
        name: 'receipt',
        label: 'Receipt',
        required: true
      }
    ]
  },
  steps: [
    {
      id: 'step-1',
      title: 'Manager Approval',
      message: 'Review and approve the expense report submitted by your team member.',
      type: FlowStepType.APPROVAL,
      inputs: [
        {
          type: InputType.SELECT,
          name: 'approval_status',
          label: 'Approval Status',
          required: true,
          options: [
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'needs_info', label: 'Needs More Information' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'approval_comments',
          label: 'Comments',
          required: false
        }
      ],
      assignment: {
        targets: [
          { entity: 'role', id: 'manager' }
        ],
        allowReassignment: true
      }
    },
    {
      id: 'step-2',
      title: 'Finance Processing',
      message: 'Process the approved expense report for reimbursement.',
      type: FlowStepType.TASK,
      inputs: [
        {
          type: InputType.DATE,
          name: 'processing_date',
          label: 'Processing Date',
          required: true
        },
        {
          type: InputType.TEXT,
          name: 'reference_number',
          label: 'Reference Number',
          required: true
        },
        {
          type: InputType.CHECKBOX,
          name: 'processed_confirmation',
          label: 'I confirm this expense has been processed for reimbursement',
          required: true
        }
      ],
      assignment: {
        targets: [
          { entity: 'department', id: 'finance' }
        ],
        allowReassignment: true
      }
    }
  ]
};

// Sample 4: Self-Service IT Support Request
export const selfServiceITSupport: FlowTemplate = {
  type: 'SELF_SERVICE',
  name: 'IT Support Request',
  description: 'Self-service IT support request with automatic ticket creation and routing.',
  assignmentMode: AssignmentMode.CLAIM,
  initStep: {
    title: 'Submit IT Support Request',
    message: 'Describe your IT issue or request. Please provide as much detail as possible to help our team assist you quickly.',
    links: [
      {
        name: 'IT Self-Help Portal',
        url: '/it-portal'
      },
      {
        name: 'Common IT Issues',
        url: '/it-portal/common-issues'
      }
    ],
    inputs: [
      {
        type: InputType.SELECT,
        name: 'request_type',
        label: 'Request Type',
        required: true,
        options: [
          { value: 'hardware', label: 'Hardware Issue' },
          { value: 'software', label: 'Software Issue' },
          { value: 'access', label: 'Access Request' },
          { value: 'account', label: 'Account Issue' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        type: InputType.SELECT,
        name: 'priority',
        label: 'Priority Level',
        required: true,
        options: [
          { value: 'low', label: 'Low - Can wait' },
          { value: 'medium', label: 'Medium - Impacting work' },
          { value: 'high', label: 'High - Blocking work' },
          { value: 'urgent', label: 'Urgent - Critical system down' }
        ]
      },
      {
        type: InputType.TEXT,
        name: 'subject',
        label: 'Subject',
        required: true
      },
      {
        type: InputType.TEXTAREA,
        name: 'description',
        label: 'Detailed Description',
        required: true
      },
      {
        type: InputType.FILE,
        name: 'attachment',
        label: 'Screenshot or Attachment',
        required: false
      }
    ]
  },
  steps: [
    {
      id: 'step-1',
      title: 'IT Technician Assignment',
      message: 'Assign this ticket to an available IT technician based on the request type and priority.',
      type: FlowStepType.TASK,
      inputs: [
        {
          type: InputType.SELECT,
          name: 'assigned_technician',
          label: 'Assigned Technician',
          required: true,
          options: [
            { value: 'tech1', label: 'John Smith (Hardware)' },
            { value: 'tech2', label: 'Jane Doe (Software)' },
            { value: 'tech3', label: 'Mike Johnson (Network)' },
            { value: 'tech4', label: 'Sarah Wilson (General)' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'assignment_notes',
          label: 'Assignment Notes',
          required: false
        }
      ],
      assignment: {
        targets: [
          { entity: 'role', id: 'it-coordinator' }
        ],
        allowReassignment: true
      }
    },
    {
      id: 'step-2',
      title: 'Resolve Issue',
      message: 'Work on resolving the IT issue. Update the ticket with your progress and final resolution.',
      type: FlowStepType.TASK,
      inputs: [
        {
          type: InputType.SELECT,
          name: 'resolution_status',
          label: 'Resolution Status',
          required: true,
          options: [
            { value: 'resolved', label: 'Resolved' },
            { value: 'escalated', label: 'Escalated' },
            { value: 'pending_user', label: 'Pending User Response' },
            { value: 'cannot_resolve', label: 'Cannot Resolve' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'resolution_details',
          label: 'Resolution Details',
          required: true
        },
        {
          type: InputType.NUMBER,
          name: 'time_spent',
          label: 'Time Spent (hours)',
          required: true
        }
      ],
      assignment: {
        targets: [
          { entity: 'role', id: 'it-technician' }
        ],
        allowReassignment: true
      }
    },
    {
      id: 'step-3',
      title: 'User Confirmation',
      message: 'Please confirm that your IT issue has been resolved to your satisfaction.',
      type: FlowStepType.ACKNOWLEDGE,
      inputs: [
        {
          type: InputType.SELECT,
          name: 'satisfaction_rating',
          label: 'Satisfaction Rating',
          required: true,
          options: [
            { value: '5', label: '5 - Excellent' },
            { value: '4', label: '4 - Good' },
            { value: '3', label: '3 - Average' },
            { value: '2', label: '2 - Poor' },
            { value: '1', label: '1 - Very Poor' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'feedback',
          label: 'Additional Feedback',
          required: false
        }
      ]
    }
  ]
};

// Export all sample flows
export const sampleFlows = [
  employeeOnboardingFlow,
  documentApprovalFlow,
  selfServiceExpenseReport,
  selfServiceITSupport
];

// Utility function to get a sample flow by ID
export const getSampleFlowById = (id: string): FlowTemplate | undefined => {
  return sampleFlows.find(flow => flow.name === id);
};

// Utility function to get all sample flow summaries
export const getSampleFlowSummaries = () => {
  return sampleFlows.map(flow => ({
    id: flow.name,
    title: flow.name,
    description: flow.description,
    stepCount: flow.steps.length,
    hasAssignments: flow.steps.some(step => step.assignment?.targets?.length || 0 > 0),
    hasInputForms: flow.steps.some(step => step.inputs?.length || 0 > 0),
    stepTypes: Array.from(new Set(flow.steps.map(step => step.type)))
  }));
}; 