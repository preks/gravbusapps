import { FlowTemplate, FlowStep, FlowStepType, InputType, AssignmentMode, LinkType } from '../types/flowTemplate';

/**
 * Sample flow templates for testing the simplified flow creator
 */

// Sample 1: Simple Employee Onboarding Flow
export const employeeOnboardingFlow: FlowTemplate = {
  type: 'TEMPLATE',
  name: 'Employee Onboarding Process',
  description: 'A comprehensive onboarding process for new employees covering orientation, equipment setup, and initial training.',
  steps: [
    {
      id: 'step-1',
      title: 'Welcome & Orientation',
      message: 'Welcome to the team! This step covers your initial orientation and introduction to company culture, policies, and procedures.',
      type: FlowStepType.INFORMATION,
      links: [
        {
          name: 'Employee Handbook',
          url: '/documents/employee-handbook.pdf',
          type: LinkType.DOCUMENT
        },
        {
          name: 'Organization Chart',
          url: '/documents/org-chart.pdf',
          type: LinkType.DOCUMENT
        }
      ],
      inputs: [],
      assignment: {
        targets: [
          { entity: 'department', id: 'dept-001' } // HR Department
        ],
        assignmentMode: AssignmentMode.CLAIM,
        allowReassignment: false
      }
    },
    {
      id: 'step-2',
      title: 'Equipment Setup Request',
      message: 'Please provide details about the equipment and access you need to get started in your role.',
      type: FlowStepType.TASK,
      links: [
        {
          name: 'Equipment Catalog',
          url: '/documents/equipment-catalog.pdf',
          type: LinkType.DOCUMENT
        }
      ],
      inputs: [
        {
          type: InputType.SELECT,
          name: 'laptopType',
          label: 'Laptop Type',
          required: true,
          options: [
            { value: 'macbook-pro', label: 'MacBook Pro' },
            { value: 'macbook-air', label: 'MacBook Air' },
            { value: 'windows-laptop', label: 'Windows Laptop' },
            { value: 'linux-workstation', label: 'Linux Workstation' }
          ]
        },
        {
          type: InputType.SELECT,
          name: 'monitorSetup',
          label: 'Monitor Setup',
          required: true,
          options: [
            { value: 'single-24', label: 'Single 24"' },
            { value: 'dual-24', label: 'Dual 24"' },
            { value: 'single-27', label: 'Single 27"' },
            { value: 'dual-27', label: 'Dual 27"' },
            { value: 'none', label: 'No additional monitor' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'additionalEquipment',
          label: 'Additional Equipment Needs',
          required: false
        },
        {
          type: InputType.TEXTAREA,
          name: 'systemAccess',
          label: 'System Access Requirements',
          required: true
        }
      ]
    },
    {
      id: 'step-3',
      title: 'IT Setup Approval',
      message: 'Review and approve the equipment and access requests for the new employee.',
      type: FlowStepType.APPROVAL,
      links: [],
      inputs: [
        {
          type: InputType.TEXTAREA,
          name: 'approvalNotes',
          label: 'Approval Notes',
          required: false
        }
      ],
      assignment: {
        targets: [
          { entity: 'department', id: 'dept-003' } // IT Department
        ],
        assignmentMode: AssignmentMode.CLAIM,
        allowReassignment: true
      }
    },
    {
      id: 'step-4',
      title: 'Complete Initial Training',
      message: 'Complete the required initial training modules and acknowledge that you understand your role and responsibilities.',
      type: FlowStepType.ACKNOWLEDGE,
      links: [
        {
          name: 'Initial Training Modules',
          url: 'https://training.company.com/initial-modules',
          type: LinkType.URL
        }
      ],
      inputs: [
        {
          type: InputType.TEXT,
          name: 'trainingCompletionDate',
          label: 'Training Completion Date',
          required: true
        },
        {
          type: InputType.TEXTAREA,
          name: 'keyTakeaways',
          label: 'Key Takeaways',
          required: true
        }
      ]
    }
  ]
};

// Sample 2: Document Approval Workflow
export const documentApprovalFlow: FlowTemplate = {
  type: 'TEMPLATE',
  name: 'Document Review & Approval',
  description: 'Standard process for reviewing and approving important documents before publication or implementation.',
  steps: [
    {
      id: 'step-1',
      title: 'Submit Document for Review',
      message: 'Please upload the document and provide necessary context for the review process.',
      type: FlowStepType.TASK,
      links: [
        {
          name: 'Review Checklist',
          url: '/templates/review-checklist.pdf',
          type: LinkType.DOCUMENT
        }
      ],
      inputs: [
        {
          type: InputType.TEXT,
          name: 'documentTitle',
          label: 'Document Title',
          required: true
        },
        {
          type: InputType.SELECT,
          name: 'documentType',
          label: 'Document Type',
          required: true,
          options: [
            { value: 'policy', label: 'Policy' },
            { value: 'procedure', label: 'Procedure' },
            { value: 'guidelines', label: 'Guidelines' },
            { value: 'manual', label: 'Manual' },
            { value: 'report', label: 'Report' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          type: InputType.FILE,
          name: 'documentFile',
          label: 'Document File',
          required: true
        },
        {
          type: InputType.TEXTAREA,
          name: 'reviewContext',
          label: 'Review Context',
          required: true
        },
        {
          type: InputType.TEXT,
          name: 'targetPublicationDate',
          label: 'Target Publication Date',
          required: false
        }
      ],
      assignment: {
        targets: [
          { entity: 'capability', id: 'cap-005' }, // Software Development
          { entity: 'capability', id: 'cap-006' }  // System Architecture
        ],
        assignmentMode: AssignmentMode.CLAIM,
        allowReassignment: true
      }
    },
    {
      id: 'step-2',
      title: 'Technical Review',
      message: 'Conduct a thorough technical review of the submitted document for accuracy, completeness, and compliance.',
      type: FlowStepType.APPROVAL,
      links: [
        {
          name: 'Technical Review Standards',
          url: '/standards/technical-review-standards.pdf',
          type: LinkType.DOCUMENT
        }
      ],
      inputs: [
        {
          type: InputType.SELECT,
          name: 'technicalAccuracy',
          label: 'Technical Accuracy',
          required: true,
          options: [
            { value: 'excellent', label: 'Excellent' },
            { value: 'good', label: 'Good' },
            { value: 'needs-minor-changes', label: 'Needs Minor Changes' },
            { value: 'needs-major-changes', label: 'Needs Major Changes' },
            { value: 'inaccurate', label: 'Inaccurate' }
          ]
        },
        {
          type: InputType.SELECT,
          name: 'completeness',
          label: 'Completeness',
          required: true,
          options: [
            { value: 'complete', label: 'Complete' },
            { value: 'minor-gaps', label: 'Minor Gaps' },
            { value: 'major-gaps', label: 'Major Gaps' },
            { value: 'incomplete', label: 'Incomplete' }
          ]
        },
        {
          type: InputType.TEXTAREA,
          name: 'technicalComments',
          label: 'Technical Comments',
          required: false
        },
        {
          type: InputType.TEXTAREA,
          name: 'recommendedChanges',
          label: 'Recommended Changes',
          required: false
        }
      ],
      assignment: {
        targets: [
          { entity: 'capability', id: 'cap-005' }, // Software Development
          { entity: 'capability', id: 'cap-006' }  // System Architecture
        ],
        assignmentMode: AssignmentMode.CLAIM,
        allowReassignment: true
      }
    },
    {
      id: 'step-3',
      title: 'Management Approval',
      message: 'Final management approval for document publication and implementation.',
      type: FlowStepType.APPROVAL,
      links: [],
      inputs: [
        {
          type: InputType.TEXTAREA,
          name: 'managementComments',
          label: 'Management Comments',
          required: false
        },
        {
          type: InputType.TEXT,
          name: 'approvedPublicationDate',
          label: 'Approved Publication Date',
          required: true
        }
      ],
      assignment: {
        targets: [
          { entity: 'role', id: 'role-001' }, // HR Manager
          { entity: 'role', id: 'role-003' }  // Finance Manager
        ],
        assignmentMode: AssignmentMode.ASSIGN, // All managers must approve
        allowReassignment: false
      }
    }
  ]
};

// Sample 3: Simple Information Flow
export const companyAnnouncementFlow: FlowTemplate = {
  type: 'TEMPLATE',
  name: 'Company Announcement',
  description: 'Share important company news and updates with all employees.',
  steps: [
    {
      id: 'step-1',
      title: 'Important Company Update',
      message: `Dear Team,

We have an important update to share with everyone. Please read through the attached information carefully and acknowledge that you have received and understood this communication.

This announcement contains information that may affect your work and our company operations. If you have any questions, please don't hesitate to reach out to your manager or HR.

Thank you for your attention to this matter.

Best regards,
Management Team`,
      type: FlowStepType.ACKNOWLEDGE,
      links: [
        {
          name: 'Company Update Details',
          url: '/announcements/company-update.pdf',
          type: LinkType.DOCUMENT
        },
        {
          name: 'Frequently Asked Questions',
          url: 'https://intranet.company.com/faq',
          type: LinkType.URL
        }
      ],
      inputs: [
        {
          type: InputType.TEXTAREA,
          name: 'questionsOrComments',
          label: 'Questions or Comments',
          required: false
        }
      ],
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
  ]
};

// Sample 4: Mixed Assignment Flow
export const projectKickoffFlow: FlowTemplate = {
  type: 'TEMPLATE',
  name: 'Project Kickoff Process',
  description: 'Complete process for initiating a new project including planning, resource allocation, and team setup.',
  steps: [
    {
      id: 'step-1',
      title: 'Project Planning',
      message: 'Define the project scope, objectives, timeline, and initial requirements.',
      type: FlowStepType.TASK,
      links: [
        {
          name: 'Project Charter Template',
          url: '/templates/project-charter-template.docx',
          type: LinkType.DOCUMENT
        }
      ],
      inputs: [
        {
          type: InputType.TEXT,
          name: 'projectName',
          label: 'Project Name',
          required: true
        },
        {
          type: InputType.TEXTAREA,
          name: 'projectObjectives',
          label: 'Project Objectives',
          required: true
        },
        {
          type: InputType.TEXT,
          name: 'expectedDuration',
          label: 'Expected Duration (weeks)',
          required: true
        },
        {
          type: InputType.SELECT,
          name: 'projectPriority',
          label: 'Project Priority',
          required: true,
          options: [
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' }
          ]
        },
        {
          type: InputType.FILE,
          name: 'projectCharter',
          label: 'Project Charter',
          required: true
        }
      ],
      assignment: {
        targets: [
          { entity: 'role', id: 'role-003' } // Finance Manager
        ],
        assignmentMode: AssignmentMode.CLAIM,
        allowReassignment: true
      }
    },
    {
      id: 'step-2',
      title: 'Resource Approval',
      message: 'Review and approve the resource requirements for the project.',
      type: FlowStepType.APPROVAL,
      links: [],
      inputs: [
        {
          type: InputType.TEXTAREA,
          name: 'resourceComments',
          label: 'Resource Comments',
          required: false
        }
      ],
      assignment: {
        targets: [
          { entity: 'role', id: 'role-003' } // Finance Manager
        ],
        assignmentMode: AssignmentMode.CLAIM,
        allowReassignment: true
      }
    },
    {
      id: 'step-3',
      title: 'Team Notification',
      message: 'Notify all team members about the new project and their involvement.',
      type: FlowStepType.INFORMATION,
      links: [
        {
          name: 'Project Dashboard',
          url: 'https://project.company.com/dashboard',
          type: LinkType.URL
        }
      ],
      inputs: [],
      assignment: {
        targets: [
          { entity: 'department', id: 'dept-003' }, // Engineering
          { entity: 'department', id: 'dept-004' }  // Sales
        ],
        assignmentMode: AssignmentMode.ASSIGN, // All team members must be notified
        allowReassignment: false
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
    stepTypes: [...new Set(flow.steps.map(step => step.type))]
  }));
}; 