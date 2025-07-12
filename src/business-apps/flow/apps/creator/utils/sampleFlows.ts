import { SimplifiedFlowTemplate, SimplifiedStep, StepType, InputBlockType, AssignmentMode } from '../types/flowTemplate';

/**
 * Sample flow templates for testing the simplified flow creator
 */

// Sample 1: Simple Employee Onboarding Flow
export const employeeOnboardingFlow: SimplifiedFlowTemplate = {
  id: 'employee-onboarding-001',
  title: 'Employee Onboarding Process',
  description: 'A comprehensive onboarding process for new employees covering orientation, equipment setup, and initial training.',
  flowType: 'TEMPLATE',
  steps: [
    {
      title: 'Welcome & Orientation',
      message: 'Welcome to the team! This step covers your initial orientation and introduction to company culture, policies, and procedures.',
      type: StepType.INFORMATION,
      attachments: [
        {
          type: 'document',
          url: '/documents/employee-handbook.pdf',
          title: 'Employee Handbook',
          description: 'Complete guide to company policies and procedures'
        },
        {
          type: 'document',
          url: '/documents/org-chart.pdf',
          title: 'Organization Chart',
          description: 'Current organizational structure'
        }
      ],
      requestInput: {
        enabled: false,
        inputs: []
      },
      usePredefinedAssignment: {
        enabled: true,
        assignment: {
          targets: [
            { entity: 'department', id: 'dept-001' } // HR Department
          ],
          assignmentMode: AssignmentMode.CLAIM,
          allowReassignment: false
        }
      }
    },
    {
      title: 'Equipment Setup Request',
      message: 'Please provide details about the equipment and access you need to get started in your role.',
      type: StepType.TASK,
      attachments: [
        {
          type: 'document',
          url: '/documents/equipment-catalog.pdf',
          title: 'Equipment Catalog',
          description: 'Available equipment options'
        }
      ],
      requestInput: {
        enabled: true,
        inputs: [
          {
            type: InputBlockType.DROPDOWN,
            label: 'Laptop Type',
            required: true,
            options: ['MacBook Pro', 'MacBook Air', 'Windows Laptop', 'Linux Workstation']
          },
          {
            type: InputBlockType.DROPDOWN,
            label: 'Monitor Setup',
            required: true,
            options: ['Single 24"', 'Dual 24"', 'Single 27"', 'Dual 27"', 'No additional monitor']
          },
          {
            type: InputBlockType.TEXTAREA,
            label: 'Additional Equipment Needs',
            required: false,
            placeholder: 'Describe any additional equipment or software you need...'
          },
          {
            type: InputBlockType.TEXTAREA,
            label: 'System Access Requirements',
            required: true,
            placeholder: 'List all systems, applications, and permissions you need access to...'
          }
        ]
      },
      usePredefinedAssignment: {
        enabled: false // Will be configured at execution time
      }
    },
    {
      title: 'IT Setup Approval',
      message: 'Review and approve the equipment and access requests for the new employee.',
      type: StepType.APPROVAL,
      attachments: [],
      requestInput: {
        enabled: true,
        inputs: [
          {
            type: InputBlockType.TEXTAREA,
            label: 'Approval Notes',
            required: false,
            placeholder: 'Add any notes about the approval or modifications needed...'
          }
        ]
      },
      usePredefinedAssignment: {
        enabled: true,
        assignment: {
          targets: [
            { entity: 'department', id: 'dept-003' } // IT Department
          ],
          assignmentMode: AssignmentMode.CLAIM,
          allowReassignment: true
        }
      }
    },
    {
      title: 'Complete Initial Training',
      message: 'Complete the required initial training modules and acknowledge that you understand your role and responsibilities.',
      type: StepType.ACKNOWLEDGE,
      attachments: [
        {
          type: 'hyperlink',
          url: 'https://training.company.com/initial-modules',
          title: 'Initial Training Modules',
          description: 'Complete all required training modules'
        }
      ],
      requestInput: {
        enabled: true,
        inputs: [
          {
            type: InputBlockType.TEXT,
            label: 'Training Completion Date',
            required: true,
            placeholder: 'YYYY-MM-DD'
          },
          {
            type: InputBlockType.TEXTAREA,
            label: 'Key Takeaways',
            required: true,
            placeholder: 'Summarize the key points from your training...'
          }
        ]
      },
      usePredefinedAssignment: {
        enabled: false // Will be assigned to the new employee
      }
    }
  ]
};

// Sample 2: Document Approval Workflow
export const documentApprovalFlow: SimplifiedFlowTemplate = {
  id: 'document-approval-002',
  title: 'Document Review & Approval',
  description: 'Standard process for reviewing and approving important documents before publication or implementation.',
  flowType: 'TEMPLATE',
  steps: [
    {
      title: 'Submit Document for Review',
      message: 'Please upload the document and provide necessary context for the review process.',
      type: StepType.TASK,
      attachments: [
        {
          type: 'document',
          url: '/templates/review-checklist.pdf',
          title: 'Review Checklist',
          description: 'Use this checklist to ensure your document is ready for review'
        }
      ],
      requestInput: {
        enabled: true,
        inputs: [
          {
            type: InputBlockType.TEXT,
            label: 'Document Title',
            required: true,
            placeholder: 'Enter the document title'
          },
          {
            type: InputBlockType.DROPDOWN,
            label: 'Document Type',
            required: true,
            options: ['Policy', 'Procedure', 'Guidelines', 'Manual', 'Report', 'Other']
          },
          {
            type: InputBlockType.FILE,
            label: 'Document File',
            required: true
          },
          {
            type: InputBlockType.TEXTAREA,
            label: 'Review Context',
            required: true,
            placeholder: 'Provide context about what needs to be reviewed and any specific areas of focus...'
          },
          {
            type: InputBlockType.TEXT,
            label: 'Target Publication Date',
            required: false,
            placeholder: 'YYYY-MM-DD'
          }
        ]
      },
      usePredefinedAssignment: {
        enabled: false // Submitter will be assigned at execution time
      }
    },
    {
      title: 'Technical Review',
      message: 'Conduct a thorough technical review of the submitted document for accuracy, completeness, and compliance.',
      type: StepType.APPROVAL,
      attachments: [
        {
          type: 'document',
          url: '/standards/technical-review-standards.pdf',
          title: 'Technical Review Standards',
          description: 'Standards and criteria for technical document review'
        }
      ],
      requestInput: {
        enabled: true,
        inputs: [
          {
            type: InputBlockType.DROPDOWN,
            label: 'Technical Accuracy',
            required: true,
            options: ['Excellent', 'Good', 'Needs Minor Changes', 'Needs Major Changes', 'Inaccurate']
          },
          {
            type: InputBlockType.DROPDOWN,
            label: 'Completeness',
            required: true,
            options: ['Complete', 'Minor Gaps', 'Major Gaps', 'Incomplete']
          },
          {
            type: InputBlockType.TEXTAREA,
            label: 'Technical Comments',
            required: false,
            placeholder: 'Provide detailed technical feedback...'
          },
          {
            type: InputBlockType.TEXTAREA,
            label: 'Recommended Changes',
            required: false,
            placeholder: 'List specific changes that should be made...'
          }
        ]
      },
      usePredefinedAssignment: {
        enabled: true,
        assignment: {
          targets: [
            { entity: 'capability', id: 'cap-005' }, // Software Development
            { entity: 'capability', id: 'cap-006' }  // System Architecture
          ],
          assignmentMode: AssignmentMode.CLAIM,
          allowReassignment: true
        }
      }
    },
    {
      title: 'Management Approval',
      message: 'Final management approval for document publication and implementation.',
      type: StepType.APPROVAL,
      attachments: [],
      requestInput: {
        enabled: true,
        inputs: [
          {
            type: InputBlockType.TEXTAREA,
            label: 'Management Comments',
            required: false,
            placeholder: 'Add any management comments or directives...'
          },
          {
            type: InputBlockType.TEXT,
            label: 'Approved Publication Date',
            required: true,
            placeholder: 'YYYY-MM-DD'
          }
        ]
      },
      usePredefinedAssignment: {
        enabled: true,
        assignment: {
          targets: [
            { entity: 'role', id: 'role-001' }, // HR Manager
            { entity: 'role', id: 'role-003' }  // Finance Manager
          ],
          assignmentMode: AssignmentMode.ASSIGN, // All managers must approve
          allowReassignment: false
        }
      }
    }
  ]
};

// Sample 3: Simple Information Flow
export const companyAnnouncementFlow: SimplifiedFlowTemplate = {
  id: 'company-announcement-003',
  title: 'Company Announcement',
  description: 'Share important company news and updates with all employees.',
  flowType: 'TEMPLATE',
  steps: [
    {
      title: 'Important Company Update',
      message: `Dear Team,

We have an important update to share with everyone. Please read through the attached information carefully and acknowledge that you have received and understood this communication.

This announcement contains information that may affect your work and our company operations. If you have any questions, please don't hesitate to reach out to your manager or HR.

Thank you for your attention to this matter.

Best regards,
Management Team`,
      type: StepType.ACKNOWLEDGE,
      attachments: [
        {
          type: 'document',
          url: '/announcements/company-update.pdf',
          title: 'Company Update Details',
          description: 'Detailed information about the company update'
        },
        {
          type: 'hyperlink',
          url: 'https://intranet.company.com/faq',
          title: 'Frequently Asked Questions',
          description: 'FAQ section for common questions'
        }
      ],
      requestInput: {
        enabled: true,
        inputs: [
          {
            type: InputBlockType.TEXTAREA,
            label: 'Questions or Comments',
            required: false,
            placeholder: 'If you have any questions or comments about this announcement, please share them here...'
          }
        ]
      },
      usePredefinedAssignment: {
        enabled: true,
        assignment: {
          targets: [
            { entity: 'department', id: 'dept-001' }, // HR
            { entity: 'department', id: 'dept-002' }, // Finance
            { entity: 'department', id: 'dept-003' }, // Engineering
            { entity: 'department', id: 'dept-004' }, // Sales
            { entity: 'department', id: 'dept-005' }  // Marketing
          ],
          assignmentMode: AssignmentMode.ASSIGN, // All departments must acknowledge
          allowReassignment: false
        }
      }
    }
  ]
};

// Sample 4: Mixed Assignment Flow
export const projectKickoffFlow: SimplifiedFlowTemplate = {
  id: 'project-kickoff-004',
  title: 'Project Kickoff Process',
  description: 'Complete process for initiating a new project including planning, resource allocation, and team setup.',
  flowType: 'TEMPLATE',
  steps: [
    {
      title: 'Project Planning',
      message: 'Define the project scope, objectives, timeline, and initial requirements.',
      type: StepType.TASK,
      attachments: [
        {
          type: 'document',
          url: '/templates/project-charter-template.docx',
          title: 'Project Charter Template',
          description: 'Use this template to create your project charter'
        }
      ],
      requestInput: {
        enabled: true,
        inputs: [
          {
            type: InputBlockType.TEXT,
            label: 'Project Name',
            required: true,
            placeholder: 'Enter the project name'
          },
          {
            type: InputBlockType.TEXTAREA,
            label: 'Project Objectives',
            required: true,
            placeholder: 'Describe the main objectives and goals of this project...'
          },
          {
            type: InputBlockType.TEXT,
            label: 'Expected Duration (weeks)',
            required: true,
            placeholder: 'e.g., 12'
          },
          {
            type: InputBlockType.DROPDOWN,
            label: 'Project Priority',
            required: true,
            options: ['High', 'Medium', 'Low']
          },
          {
            type: InputBlockType.FILE,
            label: 'Project Charter',
            required: true
          }
        ]
      },
      usePredefinedAssignment: {
        enabled: false // Project manager will be assigned at execution
      }
    },
    {
      title: 'Resource Approval',
      message: 'Review and approve the resource requirements for the project.',
      type: StepType.APPROVAL,
      attachments: [],
      requestInput: {
        enabled: true,
        inputs: [
          {
            type: InputBlockType.TEXTAREA,
            label: 'Resource Comments',
            required: false,
            placeholder: 'Comments about resource allocation...'
          }
        ]
      },
      usePredefinedAssignment: {
        enabled: true,
        assignment: {
          targets: [
            { entity: 'role', id: 'role-003' } // Finance Manager
          ],
          assignmentMode: AssignmentMode.CLAIM,
          allowReassignment: true
        }
      }
    },
    {
      title: 'Team Notification',
      message: 'Notify all team members about the new project and their involvement.',
      type: StepType.INFORMATION,
      attachments: [
        {
          type: 'hyperlink',
          url: 'https://project.company.com/dashboard',
          title: 'Project Dashboard',
          description: 'Access the project management dashboard'
        }
      ],
      requestInput: {
        enabled: false,
        inputs: []
      },
      usePredefinedAssignment: {
        enabled: true,
        assignment: {
          targets: [
            { entity: 'department', id: 'dept-003' }, // Engineering
            { entity: 'department', id: 'dept-004' }  // Sales
          ],
          assignmentMode: AssignmentMode.ASSIGN, // All team members must be notified
          allowReassignment: false
        }
      }
    }
  ]
};

// Export all sample flows
export const sampleFlows = [
  employeeOnboardingFlow,
  documentApprovalFlow,
  companyAnnouncementFlow,
  projectKickoffFlow
];

// Utility function to get a sample flow by ID
export const getSampleFlowById = (id: string): SimplifiedFlowTemplate | undefined => {
  return sampleFlows.find(flow => flow.id === id);
};

// Utility function to get all sample flow summaries
export const getSampleFlowSummaries = () => {
  return sampleFlows.map(flow => ({
    id: flow.id,
    title: flow.title,
    description: flow.description,
    stepCount: flow.steps.length,
    hasAssignments: flow.steps.some(step => step.usePredefinedAssignment?.enabled),
    hasInputForms: flow.steps.some(step => step.requestInput?.enabled),
    stepTypes: [...new Set(flow.steps.map(step => step.type))]
  }));
}; 