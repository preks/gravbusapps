import type { ServiceRequestTemplate } from '../../packages/services-plus-core/src'

/**
 * Employee Onboarding Service Request Template
 *
 * This template defines the service portal interface for employee onboarding requests.
 * It integrates with the Custom Flow Engine's employee-onboarding-service.json template
 * to provide a complete end-to-end onboarding workflow.
 */
export const employeeOnboardingServiceTemplate: ServiceRequestTemplate = {
  id: 'template-employee-onboarding',
  categoryId: 'hr',
  key: 'employee-onboarding-request',
  title: 'Employee Onboarding Request',
  description:
    'Complete onboarding process for new employees including equipment, access, training, and workspace setup',

  formSchema: {
    type: 'object',
    title: 'Employee Onboarding Request',
    description: 'Please provide the new employee information to start the onboarding process',
    properties: {
      employeeName: {
        type: 'string',
        title: 'Employee Full Name',
        description: 'Full name of the new employee'
      },
      employeeEmail: {
        type: 'string',
        title: 'Employee Email Address',
        format: 'email',
        description: 'Personal or temporary email address for initial contact'
      },
      startDate: {
        type: 'string',
        title: 'Start Date',
        format: 'date',
        description: 'First day of employment'
      },
      department: {
        type: 'string',
        title: 'Department',
        description: 'Department where the employee will work (loaded from GraphQL)'
      },
      position: {
        type: 'string',
        title: 'Position/Job Title',
        description: 'Official job title (loaded from GraphQL, filtered by department)'
      },
      reportingManager: {
        type: 'string',
        title: 'Reporting Manager',
        description: 'Direct supervisor (loaded from GraphQL)'
      },
      employmentType: {
        type: 'string',
        title: 'Employment Type',
        description: 'Type of employment (loaded from catalog)'
      },
      workLocation: {
        type: 'string',
        title: 'Work Location',
        enum: ['office-main', 'office-branch', 'remote', 'hybrid'],
        enumNames: ['Main Office', 'Branch Office', 'Remote', 'Hybrid'],
        description: 'Primary work location'
      },
      laptopType: {
        type: 'string',
        title: 'Laptop Type',
        enum: ['macbook-pro', 'macbook-air', 'windows-laptop', 'linux-laptop'],
        enumNames: ['MacBook Pro', 'MacBook Air', 'Windows Laptop', 'Linux Laptop'],
        description: 'Preferred laptop type for the employee'
      },
      accessories: {
        type: 'array',
        title: 'Additional Equipment',
        items: {
          type: 'string',
          enum: ['external-monitor', 'keyboard', 'mouse', 'headset', 'webcam', 'docking-station']
        },
        uniqueItems: true,
        description: 'Additional equipment needed by the employee'
      },
      urgency: {
        type: 'string',
        title: 'Urgency Level',
        enum: ['standard', 'urgent', 'critical'],
        enumNames: ['Standard (5-7 business days)', 'Urgent (2-3 business days)', 'Critical (1 business day)'],
        default: 'standard',
        description: 'How quickly the onboarding needs to be completed'
      },
      specialRequirements: {
        type: 'string',
        title: 'Special Requirements or Notes',
        description: 'Any special requirements, accommodations, or additional notes for the onboarding process'
      }
    },
    required: [
      'employeeName',
      'employeeEmail',
      'startDate',
      'department',
      'position',
      'reportingManager',
      'employmentType',
      'workLocation',
      'laptopType',
      'urgency'
    ]
  },

  uiSchema: {
    employeeName: {
      'ui:placeholder': 'John Doe',
      'ui:help': 'Enter the full legal name as it should appear in company records'
    },
    employeeEmail: {
      'ui:placeholder': 'john.doe@personal-email.com',
      'ui:help': 'Personal or temporary email for initial contact (company email will be created during onboarding)'
    },
    startDate: {
      'ui:widget': 'date',
      'ui:help': 'Select the first day the employee should start work'
    },
    department: {
      'ui:widget': 'select',
      'ui:placeholder': 'Select department...',
      'ui:help': 'The primary department where the employee will be working (loaded dynamically from GraphQL)'
    },
    position: {
      'ui:widget': 'select',
      'ui:placeholder': 'Select position...',
      'ui:help': 'Official job title (options filtered by selected department)'
    },
    reportingManager: {
      'ui:widget': 'select',
      'ui:placeholder': 'Select manager...',
      'ui:help': 'Direct supervisor for the new employee'
    },
    employmentType: {
      'ui:widget': 'select',
      'ui:placeholder': 'Select employment type...',
      'ui:help': 'Type of employment contract (loaded from catalog)'
    },
    workLocation: {
      'ui:widget': 'radio',
      'ui:help': 'Where will the employee primarily work?'
    },
    laptopType: {
      'ui:widget': 'radio',
      'ui:help': "Select the laptop type based on the employee's role and preferences"
    },
    accessories: {
      'ui:widget': 'checkboxes',
      'ui:help': 'Select any additional equipment the employee will need'
    },
    urgency: {
      'ui:widget': 'radio',
      'ui:help': 'How quickly does this onboarding need to be completed?'
    },
    specialRequirements: {
      'ui:widget': 'textarea',
      'ui:placeholder': 'Any special accommodations, security clearances, or additional setup requirements...',
      'ui:help': 'Provide details about any special requirements for this employee'
    }
  },

  steps: [
    {
      id: 'hr-documentation',
      name: 'HR Documentation & Contract Setup',
      receiver: 'HR',
      slaHours: 8,
      requires: [],
      inputs: {
        description: 'Process new employee documentation, create HR records, and prepare employment contracts'
      }
    },
    {
      id: 'it-equipment-setup',
      name: 'IT Equipment Preparation & Provisioning',
      receiver: 'IT',
      slaHours: 24,
      requires: [],
      inputs: {
        description: 'Prepare and configure IT equipment, setup hardware, and prepare workspace technology'
      }
    },
    {
      id: 'access-provisioning',
      name: 'System Access & Identity Management',
      receiver: 'AccessIdentity',
      slaHours: 4,
      requires: ['hr-documentation'],
      inputs: {
        description: 'Create user accounts, configure system access, and setup authentication'
      }
    },
    {
      id: 'training-setup',
      name: 'Training Schedule & Learning Path Setup',
      receiver: 'L&D',
      slaHours: 16,
      requires: ['hr-documentation', 'access-provisioning'],
      inputs: {
        description: 'Schedule mandatory training sessions and setup personalized learning paths'
      }
    },
    {
      id: 'facilities-setup',
      name: 'Workspace & Facilities Setup',
      receiver: 'Facilities',
      slaHours: 48,
      requires: ['it-equipment-setup'],
      inputs: {
        description: 'Prepare physical workspace, coordinate facilities, and setup workplace amenities'
      }
    },
    {
      id: 'manager-notification',
      name: 'Manager Notification & Team Introduction',
      receiver: 'HR',
      slaHours: 1,
      requires: ['training-setup', 'facilities-setup'],
      inputs: {
        description: 'Notify the hiring manager and team about onboarding completion and schedule team introductions'
      }
    },
    {
      id: 'final-verification',
      name: 'Employee Welcome & First Day Setup',
      receiver: 'HR',
      slaHours: 0.5,
      requires: ['manager-notification'],
      inputs: {
        description:
          'Final confirmation that all onboarding preparations are complete and employee is ready for first day'
      }
    }
  ],

  version: 1,
  enabled: true
}

/**
 * Helper function to get the employee onboarding template
 */
export const getEmployeeOnboardingTemplate = (): ServiceRequestTemplate => {
  return employeeOnboardingServiceTemplate
}

/**
 * Template metadata for service catalog
 */
export const employeeOnboardingTemplateMetadata = {
  category: 'hr',
  tags: ['onboarding', 'new-employee', 'hr', 'it-setup'],
  estimatedDuration: '5-7 business days',
  complexity: 'medium' as const,
  isPopular: true,
  requiredCapabilities: [
    'HR_SPECIALIST',
    'IT_SPECIALIST',
    'ACCESS_ADMIN',
    'LEARNING_DEVELOPMENT',
    'FACILITIES_MANAGEMENT'
  ],
  description: {
    overview:
      'Streamlined onboarding process that coordinates across multiple departments to ensure new employees have everything they need for their first day.',
    whatYouGet: [
      'Complete HR documentation and contract setup',
      'Fully configured laptop and IT equipment',
      'All necessary system access and accounts',
      'Scheduled training and orientation sessions',
      'Prepared workspace and facilities access',
      'Manager and team notifications'
    ],
    prerequisites: [
      'Employee has accepted the job offer',
      'Start date has been confirmed',
      'Department and manager have been assigned'
    ],
    sla: 'Standard: 5-7 business days, Urgent: 2-3 business days, Critical: 1 business day'
  }
}
