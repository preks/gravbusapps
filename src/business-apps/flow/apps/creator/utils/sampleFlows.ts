import { FlowTemplate, FlowStepType, InputType, AssignmentMode } from '../types/flowTemplate'

/**
 * Sample flow templates for testing the simplified flow creator
 */

// Sample 1: Simple Employee Onboarding Flow
export const employeeOnboardingFlow: FlowTemplate = {
  type: 'TEMPLATE',
  name: 'Employee Onboarding Process',
  description:
    'A comprehensive onboarding process for new employees covering orientation, equipment setup, and initial training.',
  assignmentMode: AssignmentMode.CLAIM, // Template-level assignment mode
  steps: [
    {
      id: 'step-1',
      title: 'Welcome & Orientation',
      message:
        'Welcome to the team! This step covers your initial orientation and introduction to company culture, policies, and procedures.',
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
      message:
        "Let's get your workspace and equipment ready. Please complete the equipment request form and schedule your IT setup appointment.",
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
          {
            users: [],
            organizationalUnits: ['it-department'],
            matrixTeams: [],
            companies: [],
            siteLocations: [],
            costCenters: [],
            capabilities: []
          }
        ],
        allowReassignment: true
      }
    },
    {
      id: 'step-3',
      title: 'Initial Training Schedule',
      message:
        'Schedule your mandatory training sessions. These sessions are required to be completed within your first two weeks.',
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
          {
            users: [],
            organizationalUnits: ['hr-department'],
            matrixTeams: [],
            companies: [],
            siteLocations: [],
            costCenters: [],
            capabilities: []
          }
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
}

// Sample 2: Document Approval Workflow
export const documentApprovalFlow: FlowTemplate = {
  type: 'TEMPLATE',
  name: 'Document Review & Approval',
  description:
    'A streamlined document review and approval process with multiple approval levels for sensitive documents.',
  assignmentMode: AssignmentMode.CLAIM,
  steps: [
    {
      id: 'step-1',
      title: 'Document Submission',
      message:
        'Submit your document for review and approval. Please provide all required information and attach the document file.',
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
            { value: 'procedure', label: 'Procedure Manual' },
            { value: 'guideline', label: 'Guidelines' },
            { value: 'contract', label: 'Contract' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'submission_notes',
          label: 'Submission Notes',
          required: false
        }
      ]
    },
    {
      id: 'step-2',
      title: 'Initial Review',
      message: 'Conduct initial review of the submitted document. Check for completeness, accuracy, and compliance.',
      type: FlowStepType.TASK,
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
          {
            users: [],
            organizationalUnits: [],
            matrixTeams: [],
            companies: [],
            siteLocations: [],
            costCenters: [],
            capabilities: ['document-reviewer']
          }
        ],
        allowReassignment: true
      }
    },
    {
      id: 'step-3',
      title: 'Manager Approval',
      message: 'Final approval from department manager required before document publication.',
      type: FlowStepType.APPROVAL,
      inputs: [
        {
          type: InputType.CHECKBOX,
          name: 'approval_confirmation',
          label: 'I approve this document for publication',
          required: true
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
          {
            users: [],
            organizationalUnits: ['management'],
            matrixTeams: [],
            companies: [],
            siteLocations: [],
            costCenters: [],
            capabilities: []
          }
        ],
        allowReassignment: false
      }
    }
  ]
}

// Sample 3: Project Approval Process
export const projectApprovalFlow: FlowTemplate = {
  type: 'TEMPLATE',
  name: 'Project Approval Process',
  description:
    'Multi-step project approval workflow including budget approval, resource allocation, and stakeholder sign-off.',
  assignmentMode: AssignmentMode.ASSIGN,
  steps: [
    {
      id: 'step-1',
      title: 'Project Proposal',
      message: 'Submit your project proposal with detailed scope, timeline, and resource requirements.',
      type: FlowStepType.TASK,
      inputs: [
        {
          type: InputType.TEXT,
          name: 'project_name',
          label: 'Project Name',
          required: true
        },
        {
          type: InputType.TEXTAREA,
          name: 'project_description',
          label: 'Project Description',
          required: true
        },
        {
          type: InputType.DATE,
          name: 'start_date',
          label: 'Planned Start Date',
          required: true
        },
        {
          type: InputType.DATE,
          name: 'end_date',
          label: 'Planned End Date',
          required: true
        },
        {
          type: InputType.NUMBER,
          name: 'estimated_budget',
          label: 'Estimated Budget (USD)',
          required: true
        },
        {
          type: InputType.MULTISELECT,
          name: 'required_skills',
          label: 'Required Skills',
          required: true,
          options: [
            { value: 'project_management', label: 'Project Management' },
            { value: 'software_development', label: 'Software Development' },
            { value: 'design', label: 'Design' },
            { value: 'marketing', label: 'Marketing' },
            { value: 'finance', label: 'Finance' }
          ]
        }
      ]
    },
    {
      id: 'step-2',
      title: 'Budget Approval',
      message: 'Review project budget and financial implications. Approve or request modifications.',
      type: FlowStepType.APPROVAL,
      inputs: [
        {
          type: InputType.SELECT,
          name: 'budget_decision',
          label: 'Budget Decision',
          required: true,
          options: [
            { value: 'approved', label: 'Approved as Submitted' },
            { value: 'approved_modified', label: 'Approved with Modifications' },
            { value: 'rejected', label: 'Rejected' }
          ]
        },
        {
          type: InputType.NUMBER,
          name: 'approved_budget',
          label: 'Approved Budget (USD)',
          required: false
        },
        {
          type: InputType.TEXTAREA,
          name: 'budget_comments',
          label: 'Budget Comments',
          required: false
        }
      ],
      assignment: {
        targets: [
          {
            users: [],
            organizationalUnits: ['finance'],
            matrixTeams: [],
            companies: [],
            siteLocations: [],
            costCenters: [],
            capabilities: []
          }
        ],
        allowReassignment: true
      }
    },
    {
      id: 'step-3',
      title: 'Resource Allocation',
      message: 'Assign team members and allocate necessary resources for the project.',
      type: FlowStepType.TASK,
      inputs: [
        {
          type: InputType.MULTISELECT,
          name: 'team_members',
          label: 'Assigned Team Members',
          required: true,
          options: [
            { value: 'john_doe', label: 'John Doe (PM)' },
            { value: 'jane_smith', label: 'Jane Smith (Developer)' },
            { value: 'bob_johnson', label: 'Bob Johnson (Designer)' },
            { value: 'alice_brown', label: 'Alice Brown (Analyst)' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'resource_allocation_notes',
          label: 'Resource Allocation Notes',
          required: false
        }
      ],
      assignment: {
        targets: [
          {
            users: [],
            organizationalUnits: [],
            matrixTeams: [],
            companies: [],
            siteLocations: [],
            costCenters: [],
            capabilities: ['resource-manager']
          }
        ],
        allowReassignment: true
      }
    },
    {
      id: 'step-4',
      title: 'Final Stakeholder Approval',
      message: 'Final approval from key stakeholders before project initiation.',
      type: FlowStepType.ACKNOWLEDGE,
      inputs: [
        {
          type: InputType.CHECKBOX,
          name: 'stakeholder_approval',
          label: 'All stakeholders approve project initiation',
          required: true
        }
      ],
      assignment: {
        targets: [
          {
            users: [],
            organizationalUnits: ['executive'],
            matrixTeams: [],
            companies: [],
            siteLocations: [],
            costCenters: [],
            capabilities: []
          }
        ],
        allowReassignment: false
      }
    }
  ]
}

// Sample 4: Self-Service IT Support Request
export const selfServiceITSupport: FlowTemplate = {
  type: 'SELF_SERVICE',
  name: 'IT Support Request',
  description: 'Self-service IT support request with automatic ticket creation and routing.',
  assignmentMode: AssignmentMode.CLAIM,
  initStep: {
    title: 'Submit IT Support Request',
    message:
      'Describe your IT issue or request. Please provide as much detail as possible to help our team assist you quickly.',
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
          {
            users: [],
            organizationalUnits: [],
            matrixTeams: [],
            companies: [],
            siteLocations: [],
            costCenters: [],
            capabilities: ['it-coordinator']
          }
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
          {
            users: [],
            organizationalUnits: [],
            matrixTeams: [],
            companies: [],
            siteLocations: [],
            costCenters: [],
            capabilities: ['it-technician']
          }
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
}

// Sample 5: Performance Review Process
export const performanceReviewFlow: FlowTemplate = {
  type: 'TEMPLATE',
  name: 'Annual Performance Review',
  description:
    'Comprehensive annual performance review process including self-assessment, manager review, and goal setting.',
  assignmentMode: AssignmentMode.ASSIGN,
  steps: [
    {
      id: 'step-1',
      title: 'Employee Self-Assessment',
      message:
        'Complete your self-assessment by reflecting on your achievements, challenges, and goals for the past year.',
      type: FlowStepType.TASK,
      inputs: [
        {
          type: InputType.TEXTAREA,
          name: 'achievements',
          label: 'Key Achievements',
          required: true
        },
        {
          type: InputType.TEXTAREA,
          name: 'challenges',
          label: 'Challenges Faced',
          required: true
        },
        {
          type: InputType.TEXTAREA,
          name: 'skills_developed',
          label: 'Skills Developed',
          required: true
        },
        {
          type: InputType.TEXTAREA,
          name: 'future_goals',
          label: 'Goals for Next Year',
          required: true
        },
        {
          type: InputType.SELECT,
          name: 'overall_satisfaction',
          label: 'Overall Job Satisfaction',
          required: true,
          options: [
            { value: '5', label: 'Very Satisfied' },
            { value: '4', label: 'Satisfied' },
            { value: '3', label: 'Neutral' },
            { value: '2', label: 'Dissatisfied' },
            { value: '1', label: 'Very Dissatisfied' }
          ]
        }
      ]
    },
    {
      id: 'step-2',
      title: 'Manager Review',
      message: 'Review employee performance, provide feedback, and rate performance across different areas.',
      type: FlowStepType.TASK,
      inputs: [
        {
          type: InputType.SELECT,
          name: 'performance_rating',
          label: 'Overall Performance Rating',
          required: true,
          options: [
            { value: 'exceptional', label: 'Exceptional' },
            { value: 'exceeds', label: 'Exceeds Expectations' },
            { value: 'meets', label: 'Meets Expectations' },
            { value: 'below', label: 'Below Expectations' },
            { value: 'unsatisfactory', label: 'Unsatisfactory' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'manager_feedback',
          label: 'Manager Feedback',
          required: true
        },
        {
          type: InputType.TEXTAREA,
          name: 'development_areas',
          label: 'Areas for Development',
          required: true
        },
        {
          type: InputType.TEXTAREA,
          name: 'next_year_objectives',
          label: 'Objectives for Next Year',
          required: true
        }
      ],
      assignment: {
        targets: [
          {
            users: [],
            organizationalUnits: [],
            matrixTeams: [],
            companies: [],
            siteLocations: [],
            costCenters: [],
            capabilities: ['manager']
          }
        ],
        allowReassignment: false
      }
    },
    {
      id: 'step-3',
      title: 'HR Review & Documentation',
      message: 'HR review of the performance evaluation and documentation for employee records.',
      type: FlowStepType.ACKNOWLEDGE,
      inputs: [
        {
          type: InputType.CHECKBOX,
          name: 'review_complete',
          label: 'Performance review completed and documented',
          required: true
        },
        {
          type: InputType.TEXTAREA,
          name: 'hr_notes',
          label: 'HR Notes',
          required: false
        }
      ],
      assignment: {
        targets: [
          {
            users: [],
            organizationalUnits: ['hr'],
            matrixTeams: [],
            companies: [],
            siteLocations: [],
            costCenters: [],
            capabilities: []
          }
        ],
        allowReassignment: true
      }
    }
  ]
}

// Export all sample flows
export const sampleFlows = [
  employeeOnboardingFlow,
  documentApprovalFlow,
  projectApprovalFlow,
  selfServiceITSupport,
  performanceReviewFlow
]

// Utility function to get a sample flow by ID
export const getSampleFlowById = (id: string): FlowTemplate | undefined => {
  return sampleFlows.find(flow => flow.name === id)
}

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
  }))
}
