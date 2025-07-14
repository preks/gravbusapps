import { logger } from './logger';
import { createTemplate } from '../services/templateService';

// Backend-compatible types (no ES modules)
export type StepType = 'TASK' | 'APPROVAL' | 'INFORMATION' | 'ACKNOWLEDGE';
export type InputType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT' | 'NUMBER' | 'DATE' | 'CHECKBOX' | 'FILE';

export interface InputOption {
  value: string;
  label: string;
}

export interface InputBlock {
  type: InputType;
  name: string;
  label: string;
  required?: boolean;
  options?: InputOption[];
}

export interface Link {
  name: string;
  url: string;
}

export type AssignmentTarget = {
  entity: 'user' | 'department' | 'capability' | 'role';
  id: string;
};

export enum AssignmentMode {
  CLAIM = 'CLAIM',
  ASSIGN = 'ASSIGN'
}

export type TaskAssignment = {
  targets: AssignmentTarget[];
  assignmentMode: AssignmentMode;
  allowReassignment?: boolean;
};

export interface FlowStep {
  type: StepType;
  title: string;
  message?: string;
  inputs?: InputBlock[];
  links?: Link[];
  assignment?: TaskAssignment;
}

export interface FlowTemplate {
  id?: string;
  type: 'TEMPLATE' | 'INSTANCE' | 'DRAFT';
  name: string;
  description?: string;
  version?: number;
  steps: FlowStep[];
}

export const registerSampleFlows = async (): Promise<void> => {
  try {
    logger.info('Registering sample flows...');
    
    const sampleFlows: FlowTemplate[] = [
      {
        type: 'TEMPLATE',
        name: 'Employee Onboarding Process',
        description: 'Complete onboarding workflow for new employees',
        version: 1,
        steps: [
          {
            type: 'TASK',
            title: 'Welcome & Initial Setup',
            message: 'Welcome new employee and collect initial information',
            inputs: [
              {
                type: 'TEXT',
                name: 'employeeName',
                label: 'Employee Full Name',
                required: true
              },
              {
                type: 'TEXT',
                name: 'department',
                label: 'Department',
                required: true
              },
              {
                type: 'DATE',
                name: 'startDate',
                label: 'Start Date',
                required: true
              }
            ],
            links: [
              {
                name: 'Employee Handbook',
                url: 'https://company.com/handbook'
              },
              {
                name: 'Onboarding Checklist',
                url: 'https://company.com/onboarding-checklist'
              }
            ],
            assignment: {
              targets: [{ entity: 'role', id: 'role-001' }], // HR Manager
              assignmentMode: AssignmentMode.CLAIM,
              allowReassignment: true
            }
          },
          {
            type: 'TASK',
            title: 'Equipment & Workspace Setup',
            message: 'Assign equipment and prepare workspace',
            inputs: [
              {
                type: 'SELECT',
                name: 'laptopType',
                label: 'Laptop Type',
                required: true,
                options: [
                  { value: 'macbook-pro', label: 'MacBook Pro' },
                  { value: 'macbook-air', label: 'MacBook Air' },
                  { value: 'windows-laptop', label: 'Windows Laptop' }
                ]
              },
              {
                type: 'MULTISELECT',
                name: 'accessories',
                label: 'Additional Accessories',
                required: false,
                options: [
                  { value: 'external-monitor', label: 'External Monitor' },
                  { value: 'keyboard', label: 'External Keyboard' },
                  { value: 'mouse', label: 'Mouse' },
                  { value: 'headset', label: 'Headset' }
                ]
              },
              {
                type: 'TEXT',
                name: 'workspaceLocation',
                label: 'Workspace Location',
                required: true
              }
            ],
            assignment: {
              targets: [{ entity: 'department', id: 'dept-003' }], // Engineering
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          },
          {
            type: 'APPROVAL',
            title: 'IT Systems Access Approval',
            message: 'Approve access to company IT systems',
            inputs: [
              {
                type: 'MULTISELECT',
                name: 'systemAccess',
                label: 'Required System Access',
                required: true,
                options: [
                  { value: 'email', label: 'Email System' },
                  { value: 'intranet', label: 'Company Intranet' },
                  { value: 'hr-system', label: 'HR Management System' },
                  { value: 'project-tools', label: 'Project Management Tools' }
                ]
              },
              {
                type: 'TEXTAREA',
                name: 'accessJustification',
                label: 'Access Justification',
                required: true
              }
            ],
            assignment: {
              targets: [{ entity: 'role', id: 'role-005' }], // Senior Software Engineer
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          },
          {
            type: 'INFORMATION',
            title: 'Training Schedule',
            message: 'Review mandatory training requirements and schedule',
            inputs: [
              {
                type: 'DATE',
                name: 'trainingStartDate',
                label: 'Training Start Date',
                required: true
              },
              {
                type: 'SELECT',
                name: 'trainingType',
                label: 'Training Type',
                required: true,
                options: [
                  { value: 'orientation', label: 'General Orientation' },
                  { value: 'role-specific', label: 'Role-Specific Training' },
                  { value: 'compliance', label: 'Compliance Training' }
                ]
              }
            ],
            links: [
              {
                name: 'Training Portal',
                url: 'https://company.com/training'
              }
            ],
            assignment: {
              targets: [{ entity: 'role', id: 'role-001' }], // HR Manager
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          },
          {
            type: 'ACKNOWLEDGE',
            title: 'Onboarding Complete',
            message: 'Confirm that all onboarding steps have been completed',
            assignment: {
              targets: [{ entity: 'role', id: 'role-001' }], // HR Manager
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          }
        ]
      },
      {
        type: 'TEMPLATE',
        name: 'Document Review & Approval',
        description: 'Standard document review and approval process',
        version: 1,
        steps: [
          {
            type: 'TASK',
            title: 'Document Submission',
            message: 'Submit document for review and approval',
            inputs: [
              {
                type: 'TEXT',
                name: 'documentTitle',
                label: 'Document Title',
                required: true
              },
              {
                type: 'FILE',
                name: 'documentFile',
                label: 'Document File',
                required: true
              },
              {
                type: 'SELECT',
                name: 'documentType',
                label: 'Document Type',
                required: true,
                options: [
                  { value: 'policy', label: 'Policy Document' },
                  { value: 'procedure', label: 'Procedure Manual' },
                  { value: 'guideline', label: 'Guidelines' },
                  { value: 'other', label: 'Other' }
                ]
              },
              {
                type: 'TEXTAREA',
                name: 'submissionNotes',
                label: 'Submission Notes',
                required: false
              }
            ]
            // Assignment will be set to executing user at runtime
          },
          {
            type: 'TASK',
            title: 'Initial Review',
            message: 'Conduct initial review of submitted document',
            inputs: [
              {
                type: 'SELECT',
                name: 'reviewStatus',
                label: 'Review Status',
                required: true,
                options: [
                  { value: 'approved', label: 'Approved' },
                  { value: 'needs-revision', label: 'Needs Revision' },
                  { value: 'rejected', label: 'Rejected' }
                ]
              },
              {
                type: 'TEXTAREA',
                name: 'reviewComments',
                label: 'Review Comments',
                required: true
              }
            ],
            assignment: {
              targets: [{ entity: 'capability', id: 'cap-005' }], // Software Development
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          },
          {
            type: 'APPROVAL',
            title: 'Final Approval',
            message: 'Provide final approval for document publication',
            inputs: [
              {
                type: 'CHECKBOX',
                name: 'approvalConfirmation',
                label: 'I approve this document for publication',
                required: true
              },
              {
                type: 'TEXTAREA',
                name: 'approvalNotes',
                label: 'Approval Notes',
                required: false
              }
            ],
            assignment: {
              targets: [{ entity: 'role', id: 'role-009' }], // Marketing Manager
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          }
        ]
      },
      {
        type: 'TEMPLATE',
        name: 'Expense Report Approval',
        description: 'Employee expense report submission and approval workflow',
        version: 1,
        steps: [
          {
            type: 'TASK',
            title: 'Expense Submission',
            message: 'Submit expense report with receipts',
            inputs: [
              {
                type: 'TEXT',
                name: 'expenseTitle',
                label: 'Expense Report Title',
                required: true
              },
              {
                type: 'NUMBER',
                name: 'totalAmount',
                label: 'Total Amount',
                required: true
              },
              {
                type: 'SELECT',
                name: 'expenseCategory',
                label: 'Expense Category',
                required: true,
                options: [
                  { value: 'travel', label: 'Travel' },
                  { value: 'meals', label: 'Meals & Entertainment' },
                  { value: 'supplies', label: 'Office Supplies' },
                  { value: 'training', label: 'Training & Development' },
                  { value: 'other', label: 'Other' }
                ]
              },
              {
                type: 'FILE',
                name: 'receipts',
                label: 'Receipts',
                required: true
              },
              {
                type: 'TEXTAREA',
                name: 'businessPurpose',
                label: 'Business Purpose',
                required: true
              }
            ]
            // Assignment will be set to executing user at runtime
          },
          {
            type: 'APPROVAL',
            title: 'Manager Approval',
            message: 'Review and approve expense report',
            inputs: [
              {
                type: 'SELECT',
                name: 'approvalDecision',
                label: 'Approval Decision',
                required: true,
                options: [
                  { value: 'approved', label: 'Approved' },
                  { value: 'needs-clarification', label: 'Needs Clarification' },
                  { value: 'rejected', label: 'Rejected' }
                ]
              },
              {
                type: 'TEXTAREA',
                name: 'managerComments',
                label: 'Manager Comments',
                required: false
              }
            ],
            assignment: {
              targets: [{ entity: 'user', id: 'user-002' }], // Bob Smith (Finance Manager)
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          },
          {
            type: 'TASK',
            title: 'Finance Processing',
            message: 'Process approved expense for reimbursement',
            inputs: [
              {
                type: 'DATE',
                name: 'processingDate',
                label: 'Processing Date',
                required: true
              },
              {
                type: 'TEXT',
                name: 'reimbursementMethod',
                label: 'Reimbursement Method',
                required: true
              },
              {
                type: 'TEXTAREA',
                name: 'processingNotes',
                label: 'Processing Notes',
                required: false
              }
            ],
            assignment: {
              targets: [{ entity: 'department', id: 'dept-002' }], // Finance
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          }
        ]
      },
      {
        type: 'TEMPLATE',
        name: 'Project Kickoff Process',
        description: 'Standard project initiation and kickoff workflow',
        version: 1,
        steps: [
          {
            type: 'TASK',
            title: 'Project Planning',
            message: 'Define project scope, timeline, and resources',
            inputs: [
              {
                type: 'TEXT',
                name: 'projectName',
                label: 'Project Name',
                required: true
              },
              {
                type: 'TEXTAREA',
                name: 'projectDescription',
                label: 'Project Description',
                required: true
              },
              {
                type: 'DATE',
                name: 'startDate',
                label: 'Project Start Date',
                required: true
              },
              {
                type: 'DATE',
                name: 'endDate',
                label: 'Project End Date',
                required: true
              },
              {
                type: 'MULTISELECT',
                name: 'teamMembers',
                label: 'Team Members',
                required: true,
                options: [
                  { value: 'john-doe', label: 'John Doe' },
                  { value: 'jane-smith', label: 'Jane Smith' },
                  { value: 'bob-johnson', label: 'Bob Johnson' },
                  { value: 'alice-brown', label: 'Alice Brown' }
                ]
              }
            ],
            links: [
              {
                name: 'Project Template',
                url: 'https://company.com/project-template'
              }
            ],
            assignment: {
              targets: [{ entity: 'role', id: 'role-007' }], // Sales Manager
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          },
          {
            type: 'APPROVAL',
            title: 'Stakeholder Approval',
            message: 'Approve project plan and resource allocation',
            inputs: [
              {
                type: 'SELECT',
                name: 'approvalStatus',
                label: 'Approval Status',
                required: true,
                options: [
                  { value: 'approved', label: 'Approved' },
                  { value: 'conditional', label: 'Conditional Approval' },
                  { value: 'rejected', label: 'Rejected' }
                ]
              },
              {
                type: 'TEXTAREA',
                name: 'stakeholderFeedback',
                label: 'Stakeholder Feedback',
                required: false
              }
            ],
            assignment: {
              targets: [{ entity: 'role', id: 'role-003' }], // Finance Manager (project sponsor)
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          },
          {
            type: 'INFORMATION',
            title: 'Kickoff Meeting',
            message: 'Schedule and conduct project kickoff meeting',
            inputs: [
              {
                type: 'DATE',
                name: 'meetingDate',
                label: 'Meeting Date',
                required: true
              },
              {
                type: 'TEXT',
                name: 'meetingLocation',
                label: 'Meeting Location',
                required: true
              },
              {
                type: 'TEXTAREA',
                name: 'meetingAgenda',
                label: 'Meeting Agenda',
                required: true
              }
            ],
            links: [
              {
                name: 'Meeting Room Booking',
                url: 'https://company.com/book-room'
              }
            ],
            assignment: {
              targets: [{ entity: 'role', id: 'role-007' }], // Sales Manager
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          },
          {
            type: 'ACKNOWLEDGE',
            title: 'Project Initiation Complete',
            message: 'Confirm project has been successfully initiated',
            assignment: {
              targets: [{ entity: 'role', id: 'role-003' }], // Finance Manager (project sponsor)
              assignmentMode: AssignmentMode.ASSIGN,
              allowReassignment: false
            }
          }
        ]
      }
    ];

    let successCount = 0;
    let failureCount = 0;

    for (const flow of sampleFlows) {
      try {
        await createTemplate(flow);
        logger.info(`Successfully registered sample flow: ${flow.name} (ID: ${flow.id})`);
        successCount++;
      } catch (error) {
        logger.error(`Failed to register sample flow: ${flow.name}`, error);
        failureCount++;
      }
    }

    logger.info(`Sample flow registration completed. ${successCount} flows registered successfully, ${failureCount} failed.`);
  } catch (error) {
    logger.error('Error during sample flow registration:', error);
    throw error;
  }
};

export const getSampleFlowById = (id: string): FlowTemplate | undefined => {
  const sampleFlows = [
    // Sample flows would be defined here for testing purposes
    // In production, these would be fetched from the database
  ];
  return sampleFlows.find(flow => flow.id === id);
};

export const getSampleFlowSummaries = () => {
  return [
    {
      id: 'flow_employee_onboarding_process',
      name: 'Employee Onboarding Process',
      description: 'Complete onboarding workflow for new employees',
      stepCount: 5
    },
    {
      id: 'flow_document_review_approval',
      name: 'Document Review & Approval',
      description: 'Standard document review and approval process',
      stepCount: 3
    },
    {
      id: 'flow_expense_report_approval',
      name: 'Expense Report Approval',
      description: 'Employee expense report submission and approval workflow',
      stepCount: 3
    },
    {
      id: 'flow_project_kickoff_process',
      name: 'Project Kickoff Process',
      description: 'Standard project initiation and kickoff workflow',
      stepCount: 4
    }
  ];
}; 