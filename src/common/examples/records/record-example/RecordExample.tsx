import React, { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  RecordLayout,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  IconAvatar,
  HeaderSlot
} from '@newwork/nw-design-system'
import { DocumentSection, type DocumentItem } from '@/components/document-section'
import { SummarySection } from '@/common/components/common-relations/record-sections/summary-section'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import InvestmentSection from '@/common/components/common-relations/record-sections/investment-section/InvestmentSection'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import ConditionSection from '@/common/components/common-relations/record-sections/condition-section/ConditionSection'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { TASK_TYPE, TASK_PRIORITY, ACTIVITY_TYPE } from '@/common/data/investment/constants/investmentCatalogs'
import { FileTextIcon, UsersIcon, BuildingIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { buildIrmRelatedEntityRecordUrl } from '@/common/utils/relatedEntityRecordUrls'

const mockAccountData = {
  id: 'acc_mock_1',
  name: 'Acme Corporation',
  legalForm: { value: 'GmbH' },
  industry: { value: 'Technology' },
  addressLine: { lines: ['Main Street 123', 'BuildingIcon 5'] },
  locality: 'Berlin',
  postalCode: '10115',
  region: { value: 'Berlin' },
  country: { value: 'Germany' },
  website: 'acme.example',
  phone: '+49 30 1234567',
  numberOfEmployees: { value: '120' },
  annualRevenue: { value: '€12,000,000' },
  addresses: [
    {
      id: 'addr_acme_primary',
      addressType: 'PRIMARY_ADDRESS',
      addressLine: { lines: ['Main Street 123', 'Building 5'] },
      locality: 'Berlin',
      postalCode: '10115',
      region: { value: 'Berlin' },
      country: { value: 'Germany' }
    },
    {
      id: 'addr_acme_secondary',
      addressType: 'SECONDARY_ADDRESS',
      addressLine: { lines: ['Warehouse Campus 8', 'Gate B'] },
      locality: 'Potsdam',
      postalCode: '14467',
      region: { value: 'Brandenburg' },
      country: { value: 'Germany' }
    }
  ],
  // Company logo - dynamic demo v2.0
  logoUrl: 'https://picsum.photos/40/40?random=1'
}

const mockContact = {
  firstName: 'Max',
  lastName: 'Mustermann',
  email: 'max.mustermann@example.com',
  phone: '+49 30 7654321',
  jobTitle: 'Chief Technology Officer',
  department: 'engineering',
  academicTitle: { id: 'at1', value: 'Dr.' },
  linkedinUrl: 'https://linkedin.com/in/max-mustermann',
  xingUrl: 'https://xing.com/profile/max-mustermann',
  // Profile picture - shows when uploaded
  pictureThumbnailUrl: 'https://randomuser.me/api/portraits/men/32.jpg'
}

const mockAccounts = [
  {
    id: 'acc_1',
    name: 'Acme Corporation',
    legalForm: { value: 'GmbH' },
    industry: { value: 'Technology' },
    addressLine: { lines: ['Main Street 123'] },
    locality: 'Berlin',
    postalCode: '10115',
    region: { value: 'Berlin' },
    country: { value: 'Germany' },
    website: 'acme.example',
    phone: '+49 30 1234567',
    numberOfEmployees: { value: '120' },
    annualRevenue: { value: '€12,000,000' },
    addresses: [
      {
        id: 'addr_acc_1_primary',
        addressType: 'PRIMARY_ADDRESS',
        addressLine: { lines: ['Main Street 123'] },
        locality: 'Berlin',
        postalCode: '10115',
        region: { value: 'Berlin' },
        country: { value: 'Germany' }
      },
      {
        id: 'addr_acc_1_secondary',
        addressType: 'SECONDARY_ADDRESS',
        addressLine: { lines: ['Logistics Hub 42'] },
        locality: 'Hamburg',
        postalCode: '20457',
        region: { value: 'Hamburg' },
        country: { value: 'Germany' }
      }
    ],
    // Has uploaded logo - shows avatar
    logoUrl: 'https://picsum.photos/40/40?random=2'
  },
  {
    id: 'acc_2',
    name: 'StartupCorp Ltd',
    legalForm: { value: 'Ltd' },
    industry: { value: 'Software' },
    addressLine: { lines: ['Innovation Street 789', 'Suite 200'] },
    locality: 'Berlin',
    postalCode: '10117',
    region: { value: 'Berlin' },
    country: { value: 'Germany' },
    website: 'startupcorp.example',
    phone: '+49 30 5555555',
    numberOfEmployees: { value: '25' },
    annualRevenue: { value: '€2,500,000' }
    // No logo uploaded - shows bank icon
    // logoUrl: undefined
  },
  {
    id: 'acc_3',
    name: 'GlobalTech Solutions',
    legalForm: { value: 'AG' },
    industry: { value: 'Consulting' },
    addressLine: { lines: ['Business Park 456', 'BuildingIcon A, Floor 3'] },
    locality: 'Berlin',
    postalCode: '10119',
    region: { value: 'Berlin' },
    country: { value: 'Germany' },
    website: 'globaltech.example',
    phone: '+49 30 9876543',
    numberOfEmployees: { value: '500' },
    annualRevenue: { value: '€45,000,000' },
    // Has logo
    logoUrl: 'https://picsum.photos/40/40?random=4'
  },
  {
    id: 'acc_4',
    name: 'TechStart GmbH',
    legalForm: { value: 'GmbH' },
    industry: { value: 'Fintech' },
    addressLine: { lines: ['Startup Hub 321', 'Co-working Space'] },
    locality: 'Berlin',
    postalCode: '10115',
    region: { value: 'Berlin' },
    country: { value: 'Germany' },
    website: 'techstart.example',
    phone: '+49 30 1111111',
    numberOfEmployees: { value: '15' },
    annualRevenue: { value: '€1,200,000' }
  },
  {
    id: 'acc_5',
    name: 'DataCorp AG',
    legalForm: { value: 'AG' },
    industry: { value: 'Data Analytics' },
    addressLine: { lines: ['Data Center 999', 'Server Hall 2'] },
    locality: 'Berlin',
    postalCode: '10117',
    region: { value: 'Berlin' },
    country: { value: 'Germany' },
    website: 'datacorp.example',
    phone: '+49 30 9999999',
    numberOfEmployees: { value: '200' },
    annualRevenue: { value: '€8,500,000' },
    logoUrl: 'https://picsum.photos/40/40?random=5'
  }
]

const mockContacts = [
  {
    id: 'con_1',
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max.mustermann@example.com',
    phone: '+49 30 7654321',
    jobTitle: 'Sales Manager',
    department: 'sales',
    academicTitle: { id: 'at1', value: 'Dr.' },
    linkedinUrl: 'https://linkedin.com/in/max-mustermann',
    xingUrl: 'https://www.xing.com/profile/Max_Mustermann',
    // Has uploaded profile picture - shows avatar
    pictureThumbnailUrl: 'https://randomuser.me/api/portraits/men/45.jpg',
    createdAt: new Date().toISOString()
  },
  {
    id: 'con_2',
    firstName: 'Anna',
    lastName: 'Schmidt',
    email: 'anna.schmidt@example.com',
    phone: '+49 30 9988776',
    jobTitle: 'Software Developer',
    department: 'engineering',
    academicTitle: { id: 'at3', value: 'B.Sc.' },
    linkedinUrl: 'https://linkedin.com/in/anna-schmidt',
    // No profile picture uploaded - shows user icon
    // pictureThumbnailUrl: undefined
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'con_3',
    firstName: 'Julia',
    lastName: 'Weber',
    email: 'julia.weber@example.com',
    phone: '+49 30 1122334',
    jobTitle: 'Product Manager',
    department: 'product',
    academicTitle: { id: 'at4', value: 'M.Sc.' },
    linkedinUrl: 'https://linkedin.com/in/julia-weber',
    // Has profile picture
    pictureThumbnailUrl: 'https://randomuser.me/api/portraits/women/32.jpg',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'con_4',
    firstName: 'Thomas',
    lastName: 'Fischer',
    email: 'thomas.fischer@example.com',
    phone: '+49 30 5566778',
    jobTitle: 'Marketing Director',
    department: 'marketing',
    xingUrl: 'https://xing.com/profile/thomas-fischer',
    // No profile picture
    // pictureThumbnailUrl: undefined
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'con_5',
    firstName: 'Sarah',
    lastName: 'Müller',
    email: 'sarah.mueller@example.com',
    phone: '+49 30 3344556',
    jobTitle: 'HR Manager',
    department: 'human-resources',
    academicTitle: { id: 'at5', value: 'M.A.' },
    linkedinUrl: 'https://linkedin.com/in/sarah-mueller',
    pictureThumbnailUrl: 'https://randomuser.me/api/portraits/women/28.jpg',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: 'con_6',
    firstName: 'Michael',
    lastName: 'Wagner',
    email: 'michael.wagner@example.com',
    phone: '+49 30 7788990',
    jobTitle: 'CTO',
    department: 'engineering',
    academicTitle: { id: 'at6', value: 'Prof. Dr.' },
    linkedinUrl: 'https://linkedin.com/in/michael-wagner',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
  }
]

const mockInvestmentData = {
  investmentName: 'TechGrowth Venture Capital Fund',
  investmentGroup: {
    id: 'ig_1',
    value: 'Venture Capital',
    code: 'VC'
  },
  investmentType: {
    id: 'it_1',
    value: 'Growth Stage Fund',
    code: 'GROWTH_FUND'
  },
  investmentRole: {
    id: 'ir_1',
    value: 'Lead Investor',
    code: 'LEAD'
  },
  investmentStakeType: {
    id: 'ist_1',
    value: 'Equity Stake',
    code: 'EQUITY'
  },
  // Dynamic fields that would come from catalog reference fields
  targetReturn: 15.5,
  investmentHorizon: '5-7 years',
  minInvestment: 1000000,
  riskRating: 'Medium-High',
  currencyRef: 'Currency:v1:EUR'
}

const mockEntityIds = {
  accountId: 'acc_mock_1',
  contactId: 'con_mock_1',
  opportunityId: 'opp_mock_1',
  leadId: 'lead_mock_1',
  investmentId: 'inv_mock_1'
}

const mockDocuments: DocumentItem[] = [
  // Folders
  {
    id: 'folder-contracts',
    name: 'Contracts',
    createdAt: '2024-01-25T10:00:00Z',
    folder: true,
    parentDocument: null,
    createdBy: 'emp_daniel_vorberg',
    documentGroup: { id: 'dg1', value: 'Legal Documents' },
    verified: true,
    verificationDate: '2024-01-25T10:30:00Z'
  },
  {
    id: 'folder-marketing',
    name: 'Marketing Materials',
    createdAt: '2024-01-22T08:00:00Z',
    folder: true,
    parentDocument: null,
    createdBy: 'emp_current_user',
    documentGroup: { id: 'dg2', value: 'Marketing' }
  },
  {
    id: 'folder-technical',
    name: 'Technical Documentation',
    createdAt: '2024-01-20T09:00:00Z',
    folder: true,
    parentDocument: null,
    createdBy: 'emp_anna_schmidt',
    documentGroup: { id: 'dg3', value: 'Technical' }
  },

  // Files in Contracts folder
  {
    id: 'file-agreement',
    name: 'Master Service Agreement.pdf',
    createdAt: '2024-01-24T09:30:00Z',
    parentDocument: 'folder-contracts',
    mimeType: 'application/pdf',
    fileSize: 2_048_576, // 2MB
    createdBy: 'emp_daniel_vorberg',
    documentType: { id: 'dt1', value: 'Contract' },
    documentGroup: { id: 'dg1', value: 'Legal Documents' },
    verified: true,
    verificationDate: '2024-01-24T10:00:00Z',
    authenticated: true,
    authenticationDate: '2024-01-24T10:15:00Z',
    mandatory: true,
    expirationDate: '2025-01-24T00:00:00Z'
  },
  {
    id: 'file-nda',
    name: 'Mutual NDA.docx',
    createdAt: '2024-01-23T12:15:00Z',
    parentDocument: 'folder-contracts',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 512_000, // 512KB
    createdBy: 'emp_daniel_vorberg',
    documentType: { id: 'dt2', value: 'Legal Agreement' },
    documentGroup: { id: 'dg1', value: 'Legal Documents' },
    verified: true,
    verificationDate: '2024-01-23T13:00:00Z',
    mandatory: true
  },
  {
    id: 'file-amendment',
    name: 'Contract Amendment Q1.pdf',
    createdAt: '2024-01-21T14:20:00Z',
    parentDocument: 'folder-contracts',
    mimeType: 'application/pdf',
    fileSize: 1_024_000, // 1MB
    createdBy: 'emp_legal_team',
    documentType: { id: 'dt3', value: 'Amendment' },
    documentGroup: { id: 'dg1', value: 'Legal Documents' },
    verified: false // Pending review
  },

  // Files in Marketing folder
  {
    id: 'file-logo',
    name: 'Company Logo.png',
    createdAt: '2024-01-21T16:45:00Z',
    parentDocument: 'folder-marketing',
    mimeType: 'image/png',
    fileSize: 256_000, // 256KB
    createdBy: 'emp_current_user',
    documentType: { id: 'dt4', value: 'Brand Asset' },
    documentGroup: { id: 'dg2', value: 'Marketing' },
    verified: true,
    verificationDate: '2024-01-21T17:00:00Z'
  },
  {
    id: 'file-press',
    name: 'Press Release Q1.txt',
    createdAt: '2024-01-20T14:00:00Z',
    parentDocument: 'folder-marketing',
    mimeType: 'text/plain',
    fileSize: 64_000, // 64KB
    createdBy: 'emp_current_user',
    documentType: { id: 'dt5', value: 'Press Release' },
    documentGroup: { id: 'dg2', value: 'Marketing' }
  },
  {
    id: 'file-brochure',
    name: 'Product Brochure 2024.pdf',
    createdAt: '2024-01-19T11:30:00Z',
    parentDocument: 'folder-marketing',
    mimeType: 'application/pdf',
    fileSize: 3_145_728, // 3MB
    createdBy: 'emp_marketing_team',
    documentType: { id: 'dt6', value: 'Marketing Material' },
    documentGroup: { id: 'dg2', value: 'Marketing' },
    verified: true,
    verificationDate: '2024-01-19T12:00:00Z'
  },

  // Files in Technical folder
  {
    id: 'file-api-docs',
    name: 'API Documentation.md',
    createdAt: '2024-01-18T10:15:00Z',
    parentDocument: 'folder-technical',
    mimeType: 'text/markdown',
    fileSize: 128_000, // 128KB
    createdBy: 'emp_anna_schmidt',
    documentType: { id: 'dt7', value: 'Technical Documentation' },
    documentGroup: { id: 'dg3', value: 'Technical' },
    verified: true,
    verificationDate: '2024-01-18T11:00:00Z'
  },
  {
    id: 'file-architecture',
    name: 'System Architecture.xlsx',
    createdAt: '2024-01-17T08:45:00Z',
    parentDocument: 'folder-technical',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: 891_000, // 891KB
    createdBy: 'emp_anna_schmidt',
    documentType: { id: 'dt8', value: 'Architecture Document' },
    documentGroup: { id: 'dg3', value: 'Technical' }
  },

  // Root level files
  {
    id: 'readme',
    name: 'README.md',
    createdAt: new Date().toISOString(),
    parentDocument: null,
    mimeType: 'text/markdown',
    fileSize: 8_192, // 8KB
    createdBy: 'emp_current_user',
    documentType: { id: 'dt9', value: 'Documentation' },
    verified: true,
    verificationDate: new Date().toISOString()
  },
  {
    id: 'getting-started',
    name: 'Getting Started Guide.pdf',
    createdAt: '2024-01-15T09:20:00Z',
    parentDocument: null,
    mimeType: 'application/pdf',
    fileSize: 1_572_864, // 1.5MB
    createdBy: 'emp_support_team',
    documentType: { id: 'dt10', value: 'User Guide' },
    expirationDate: '2024-12-31T23:59:59Z'
  }
]

const RecordExample: React.FC<BusinessAppContextProps> = context => {
  const [activeTab, setActiveTab] = useState('overview')
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsError, setDocumentsError] = useState<string | null>(null)

  // REST client for document operations (Example uses Kogito processes)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const entityIds = useMemo(() => mockEntityIds, [])

  const handleRefreshDocuments = () => {
    setDocumentsLoading(true)
    setDocumentsError(null)

    // Simulate API call
    setTimeout(() => {
      setDocumentsLoading(false)
      console.log('Documents refreshed successfully')
    }, 2000)
  }

  const handleSimulateError = () => {
    setDocumentsError('Failed to load documents. Please try again.')
  }

  const handleClearError = () => {
    setDocumentsError(null)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Header data for RecordLayout
  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'example-details',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.type', 'Type'),
            value: 'Record Example',
            icon: BuildingIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.status', 'Status'),
            value: 'Demo Mode',
            icon: UsersIcon
          }
        ]
      }
    ],
    []
  )

  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'overview',
          label: getTranslationFromI18nKeyAndLabel('crm.common.overview', 'Overview'),
          icon: <UsersIcon className="gba:mr-2" />,
          content: (
            <>
              {/* Account Section - 1/3 width */}
              <SectionWrapper
                className="gba:col-span-3 gba:row-span-1"
                sections={[
                  {
                    id: 'account-section',
                    component: AccountSection,
                    props: {
                      ...context,
                      accountId: entityIds.accountId,
                      account: mockAccountData,
                      actionButtonProps: {
                        contextsArray: [FlowContextName.customerAccountEntity],
                        externalContextData: { accountId: entityIds.accountId },
                        prefixDataTestId: 'record-example-account'
                      }
                    }
                  }
                ]}
                data-testid="record-example-account-section-wrapper"
              />

              {/* Contact Section - 1/3 width */}
              <SectionWrapper
                className="gba:col-span-3 gba:row-span-1"
                sections={[
                  {
                    id: 'contact-section',
                    component: ContactSection,
                    props: {
                      ...context,
                      contactId: entityIds.contactId,
                      contact: mockContact,
                      actionButtonProps: {
                        contextsArray: [FlowContextName.customerContactEntity],
                        externalContextData: { contactId: entityIds.contactId },
                        prefixDataTestId: 'record-example-contact'
                      }
                    }
                  }
                ]}
                data-testid="record-example-contact-section-wrapper"
              />

              {/* Investment Section - 1/3 width */}
              <SectionWrapper
                className="gba:col-span-6 gba:row-span-1"
                sections={[
                  {
                    id: 'investment-section',
                    component: InvestmentSection,
                    props: {
                      investmentData: mockInvestmentData,
                      businessAppContext: context,
                      actionButtonProps: {
                        contextsArray: [FlowContextName.investmentLeadEntity],
                        externalContextData: { investmentId: entityIds.investmentId },
                        prefixDataTestId: 'record-example-investment'
                      }
                    }
                  }
                ]}
                data-testid="record-example-investment-section-wrapper"
              />

              {/* Activities Section - 1/3 width, full height */}
              <SectionWrapper
                className="gba:col-span-4 gba:row-span-5"
                sections={[
                  {
                    id: 'activities-section',
                    component: ActivitySection,
                    props: {
                      ...context,
                      investmentId: entityIds.investmentId,
                      activities: [
                        {
                          id: 'a1',
                          title: 'Intro Call',
                          description: 'Initial discovery with client',
                          occurredAt: new Date().toISOString(),
                          createdBy: 'Daniel Vorberg',
                          activityType: { value: 'Call' },
                          ownerEmployee: {
                            id: 'emp_daniel_vorberg',
                            displayName: 'Daniel Vorberg',
                            firstName: 'Daniel',
                            lastName: 'Vorberg'
                          },
                          accountId: entityIds.accountId,
                          contactId: entityIds.contactId,
                          opportunityId: entityIds.opportunityId,
                          leadId: entityIds.leadId,
                          account: {
                            name: mockAccountData.name,
                            pictureThumbnail: mockAccountData.logoUrl
                          },
                          contact: {
                            firstName: mockContact.firstName,
                            lastName: mockContact.lastName,
                            pictureThumbnail: mockContact.pictureThumbnailUrl
                          },
                          opportunity: { name: 'Q1 Enterprise expansion' },
                          lead: { companyName: 'Acme pipeline — EU rollout' },
                          documents: [
                            {
                              id: 'doc_activity_1',
                              name: 'Call Notes.pdf',
                              mimeType: 'application/pdf',
                              file: 'https://example.com/call-notes.pdf'
                            },
                            {
                              id: 'doc_activity_2',
                              name: 'Meeting Agenda.docx',
                              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                              file: 'https://example.com/agenda.docx'
                            }
                          ]
                        },
                        {
                          id: 'a2',
                          title: 'Email Follow-up',
                          description: 'Sent recap and next steps',
                          occurredAt: new Date(Date.now() - 86400000).toISOString(),
                          createdBy: 'You',
                          activityType: { value: 'Email' },
                          ownerEmployee: {
                            id: context.userInfo?.employeeDetails.employeeId || 'emp_current_user',
                            displayName: 'Current User',
                            firstName: 'Current',
                            lastName: 'User'
                          },
                          accountId: entityIds.accountId,
                          contactId: entityIds.contactId,
                          opportunityId: entityIds.opportunityId,
                          investmentId: entityIds.investmentId,
                          account: { name: mockAccountData.name },
                          contact: {
                            firstName: mockContact.firstName,
                            lastName: mockContact.lastName
                          },
                          opportunity: { name: 'Q1 Enterprise expansion' },
                          investment: { name: 'Demo growth mandate' },
                          documents: [
                            {
                              id: 'doc_activity_3',
                              name: 'Follow-up Email.txt',
                              mimeType: 'text/plain',
                              file: 'https://example.com/followup.txt'
                            }
                          ]
                        }
                      ],
                      activitiesLoading: false,
                      activitiesError: null,
                      onReloadActivities: () => {},
                      getRelatedRecordUrl: buildIrmRelatedEntityRecordUrl,
                      activitySectionActionProps: {
                        contextsArray: [FlowContextName.investmentActivityCreate],
                        externalContextData: { ...entityIds },
                        prefixDataTestId: 'record-example-activities',
                        emptyStateBehavior: 'enable'
                      },
                      activityEntityActionProps: {
                        contextsArray: [FlowContextName.investmentActivityEntity],
                        externalContextData: { ...entityIds },
                        prefixDataTestId: 'record-example-activity-entity',
                        emptyStateBehavior: 'enable'
                      },
                      activityTypeCatalog: ACTIVITY_TYPE
                    }
                  }
                ]}
                data-testid="record-example-activity-section-wrapper"
              />

              {/* Notes Section - 2/3 width, spans 2 rows */}
              <SectionWrapper
                className="gba:col-span-8 gba:row-span-2"
                sections={[
                  {
                    id: 'note-section',
                    component: NoteSection,
                    props: {
                      ...context,
                      notes: [
                        {
                          id: 'note_1',
                          noteTitle: 'Client Requirements',
                          noteText:
                            'Client needs integration with their existing CRM system. Priority features: automated reporting and real-time data sync.',
                          createdAt: new Date().toISOString(),
                          createdBy: 'Daniel Vorberg',
                          authorEmployee: {
                            id: 'emp_daniel_vorberg',
                            displayName: 'Daniel Vorberg',
                            firstName: 'Daniel',
                            lastName: 'Vorberg'
                          },
                          documents: [
                            {
                              id: 'doc_note_1',
                              name: 'Requirements.pdf',
                              mimeType: 'application/pdf',
                              file: 'https://example.com/requirements.pdf'
                            },
                            {
                              id: 'doc_note_2',
                              name: 'Integration Specs.xlsx',
                              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                              file: 'https://example.com/specs.xlsx'
                            }
                          ]
                        },
                        {
                          id: 'note_2',
                          noteTitle: 'Follow-up Action Items',
                          noteText:
                            'Schedule technical demo for next week. Prepare cost estimate and timeline proposal.',
                          createdAt: new Date(Date.now() - 86400000).toISOString(),
                          createdBy: 'Current User',
                          reminderAt: new Date(Date.now() + 3 * 86400000).toISOString(),
                          documents: [
                            {
                              id: 'doc_note_3',
                              name: 'Demo Preparation.docx',
                              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                              file: 'https://example.com/demo-prep.docx'
                            }
                          ]
                        }
                      ],
                      noteActionProps: {
                        contextsArray: [FlowContextName.investmentNoteEntity],
                        externalContextData: { ...entityIds },
                        prefixDataTestId: 'record-example-notes',
                        emptyStateBehavior: 'enable'
                      },
                      noteEntityActionProps: {
                        contextsArray: [FlowContextName.investmentNoteEntity],
                        externalContextData: { ...entityIds },
                        prefixDataTestId: 'record-example-note-entity',
                        emptyStateBehavior: 'enable'
                      }
                    }
                  }
                ]}
                data-testid="record-example-note-section-wrapper"
              />

              {/* Tasks Section - full width */}
              <SectionWrapper
                className="gba:col-span-12 gba:row-span-1"
                sections={[
                  {
                    id: 'task-section',
                    component: TaskSection,
                    props: {
                      ...context,
                      tasks: [
                        {
                          id: 'task_1',
                          title: 'Prepare Technical Proposal',
                          description:
                            'Create comprehensive technical proposal including architecture diagrams and cost estimates',
                          createdAt: new Date().toISOString(),
                          due: new Date(Date.now() + 7 * 86400000).toISOString(),
                          statusCode: 'IN_PROGRESS' as const,
                          taskStatus: { code: 'IN_PROGRESS', value: 'In Progress' },
                          taskPriority: { code: 'HIGH', value: 'High', type: 'HIGH' },
                          taskTiming: 'DEADLINE' as const,
                          assigneeEmployee: {
                            id: 'emp_daniel_vorberg',
                            displayName: 'Daniel Vorberg',
                            firstName: 'Daniel',
                            lastName: 'Vorberg'
                          },
                          documents: [
                            {
                              id: 'doc_task_1',
                              name: 'Architecture Diagram.png',
                              mimeType: 'image/png',
                              file: 'https://example.com/architecture.png'
                            },
                            {
                              id: 'doc_task_2',
                              name: 'Cost Estimate Template.xlsx',
                              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                              file: 'https://example.com/cost-template.xlsx'
                            }
                          ]
                        },
                        {
                          id: 'task_2',
                          title: 'Schedule Client Demo',
                          description: 'Coordinate with client stakeholders for product demo next week',
                          createdAt: new Date(Date.now() - 86400000).toISOString(),
                          due: new Date(Date.now() + 3 * 86400000).toISOString(),
                          statusCode: 'PENDING' as const,
                          taskStatus: { code: 'PENDING', value: 'Pending' },
                          taskPriority: { code: 'MEDIUM', value: 'Medium', type: 'MEDIUM' },
                          taskTiming: 'SCHEDULED' as const,
                          startDate: new Date(Date.now() + 3 * 86400000).toISOString(),
                          assigneeEmployee: {
                            id: context.userInfo?.employeeDetails.employeeId || 'emp_current_user',
                            displayName: 'Current User',
                            firstName: 'Current',
                            lastName: 'User'
                          },
                          documents: [
                            {
                              id: 'doc_task_3',
                              name: 'Demo Script.docx',
                              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                              file: 'https://example.com/demo-script.docx'
                            }
                          ]
                        },
                        {
                          id: 'task_3',
                          title: 'Review Contract Terms',
                          description: 'Legal review of proposed contract terms',
                          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
                          due: new Date(Date.now() - 1 * 86400000).toISOString(),
                          statusCode: 'COMPLETED' as const,
                          taskStatus: { code: 'COMPLETED', value: 'Completed' },
                          taskPriority: { code: 'HIGH', value: 'High', type: 'HIGH' },
                          taskTiming: 'DEADLINE' as const,
                          assigneeEmployee: {
                            id: 'emp_legal_team',
                            displayName: 'Legal Team',
                            firstName: 'Legal',
                            lastName: 'Team'
                          },
                          documents: [
                            {
                              id: 'doc_task_4',
                              name: 'Contract Review.pdf',
                              mimeType: 'application/pdf',
                              file: 'https://example.com/contract-review.pdf'
                            },
                            {
                              id: 'doc_task_5',
                              name: 'Legal Comments.docx',
                              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                              file: 'https://example.com/legal-comments.docx'
                            }
                          ]
                        }
                      ],
                      taskActionProps: {
                        contextsArray: [FlowContextName.investmentTaskCreate],
                        externalContextData: { ...entityIds },
                        prefixDataTestId: 'record-example-tasks',
                        emptyStateBehavior: 'enable'
                      },
                      taskEntityActionProps: {
                        contextsArray: [FlowContextName.investmentTaskEntity],
                        externalContextData: { ...entityIds },
                        prefixDataTestId: 'record-example-task-entity',
                        emptyStateBehavior: 'enable'
                      },
                      typeCatalog: TASK_TYPE,
                      priorityCatalog: TASK_PRIORITY
                    }
                  }
                ]}
                data-testid="record-example-task-section-wrapper"
              />

              {/* Summary Section - full width */}
              <div className="gba:col-span-12 gba:row-span-1">
                <SummarySection data-testid="record-example-summary-section">
                  <div className="gba:text-sm">
                    AI summary preview: ACME shows strong engagement. Next steps: finalize proposal, schedule exec
                    review.
                  </div>
                </SummarySection>
              </div>

              {/* Multiple Accounts Section - 1/4 width */}
              <SectionWrapper
                className="gba:col-span-3 gba:row-span-1"
                sections={[
                  {
                    id: 'multiple-accounts-section',
                    component: AccountSection,
                    props: {
                      ...context,
                      accounts: mockAccounts,
                      actionButtonProps: {
                        contextsArray: [FlowContextName.customerAccountEntity],
                        externalContextData: { accountId: mockAccounts[0]?.id },
                        prefixDataTestId: 'record-example-account-multiple'
                      }
                    }
                  }
                ]}
                data-testid="record-example-account-section-multiple-wrapper"
              />

              {/* Multiple Contacts Section - 1/4 width */}
              <SectionWrapper
                className="gba:col-span-3 gba:row-span-1"
                sections={[
                  {
                    id: 'multiple-contacts-section',
                    component: ContactSection,
                    props: {
                      ...context,
                      contacts: mockContacts,
                      actionButtonProps: {
                        contextsArray: [FlowContextName.customerContactEntity],
                        externalContextData: { contactId: mockContacts[0]?.id },
                        prefixDataTestId: 'record-example-contact-multiple'
                      }
                    }
                  }
                ]}
                data-testid="record-example-contact-section-multiple-wrapper"
              />

              {/* Conditions Section - full width */}
              <div className="gba:col-span-12 gba:row-span-1">
                <SectionWrapper
                  sections={[
                    {
                      id: 'condition-section',
                      component: ConditionSection,
                      props: {
                        ...context,
                        opportunity: {
                          opportunityPipelineStage: {
                            code: 'DISCOVERY',
                            value: 'Discovery Phase',
                            id: 'SalesPipelineStage:v1:DISCOVERY'
                          }
                        },
                        stageConditionActionProps: {
                          contextsArray: [FlowContextName.saveOpportunityStageConditionStatus],
                          externalContextData: { ...entityIds },
                          prefixDataTestId: 'record-example-stage-condition-status-icon',
                          emptyStateBehavior: 'disable'
                        },
                        stageConditionStatuses: [
                          {
                            id: 'cond_1',
                            completed: false,
                            opportunityPipelineStageCondition: {
                              code: 'REQ_DOCS',
                              value: 'Requirements Document',
                              parentEntryId: 'SalesPipelineStage:v1:DISCOVERY'
                            },
                            configSnapshot: {
                              description:
                                'Upload comprehensive requirements document for technical validation and stakeholder review',
                              check_type: 'MANUAL',
                              deadline_enabled: true,
                              deadline_duration: 3,
                              deadline_duration_measurement_unit_ref: 'MeasurementUnit:v1:DAY',
                              generate_task: true
                            },
                            deadlineAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
                          },
                          {
                            id: 'cond_2',
                            completed: true,
                            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                            completedByEmployee: {
                              firstName: 'Alice',
                              lastName: 'Johnson',
                              displayName: 'Alice Johnson'
                            },
                            opportunityPipelineStageCondition: {
                              code: 'STAKEHOLDER_OK',
                              value: 'Stakeholder Alignment',
                              parentEntryId: 'SalesPipelineStage:v1:DISCOVERY'
                            },
                            configSnapshot: {
                              description: 'Ensure all key stakeholders are aligned with project scope and timeline',
                              check_type: 'MANUAL',
                              generate_task: false
                            }
                          },
                          {
                            id: 'cond_3',
                            completed: false,
                            opportunityPipelineStageCondition: {
                              code: 'BUDGET_APPROVAL',
                              value: 'Budget Approval',
                              parentEntryId: 'SalesPipelineStage:v1:DISCOVERY'
                            },
                            configSnapshot: {
                              description: 'Obtain formal budget approval from finance department',
                              check_type: 'MANUAL',
                              deadline_enabled: true,
                              deadline_duration: 5,
                              deadline_duration_measurement_unit_ref: 'MeasurementUnit:v1:DAY',
                              generate_task: true
                            },
                            deadlineAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
                          },
                          {
                            id: 'cond_4',
                            completed: true,
                            completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                            completedByEmployee: {
                              firstName: 'Michael',
                              lastName: 'Chen',
                              displayName: 'Michael Chen'
                            },
                            opportunityPipelineStageCondition: {
                              code: 'TECH_REVIEW',
                              value: 'Technical Review',
                              parentEntryId: 'SalesPipelineStage:v1:DISCOVERY'
                            },
                            configSnapshot: {
                              description: 'Complete technical feasibility review with engineering team',
                              check_type: 'AUTOMATED',
                              generate_task: false
                            }
                          },
                          {
                            id: 'cond_5',
                            completed: false,
                            opportunityPipelineStageCondition: {
                              code: 'LEGAL_CLEARANCE',
                              value: 'Legal Clearance',
                              parentEntryId: 'SalesPipelineStage:v1:DISCOVERY'
                            },
                            configSnapshot: {
                              description: 'Obtain legal clearance for proposed contract terms and conditions',
                              check_type: 'MANUAL',
                              deadline_enabled: true,
                              deadline_duration: 7,
                              deadline_duration_measurement_unit_ref: 'MeasurementUnit:v1:DAY',
                              generate_task: true
                            },
                            deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                          },
                          {
                            id: 'cond_6',
                            completed: false,
                            opportunityPipelineStageCondition: {
                              code: 'RISK_ASSESSMENT',
                              value: 'Risk Assessment',
                              parentEntryId: 'SalesPipelineStage:v1:DISCOVERY'
                            },
                            configSnapshot: {
                              description: 'Complete comprehensive risk assessment and mitigation strategy',
                              check_type: 'MANUAL',
                              deadline_enabled: true,
                              deadline_duration: 4,
                              deadline_duration_measurement_unit_ref: 'MeasurementUnit:v1:DAY',
                              generate_task: true
                            },
                            deadlineAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
                          }
                        ]
                      }
                    }
                  ]}
                  data-testid="record-example-condition-section-wrapper"
                />
              </div>
            </>
          )
        },
        {
          value: 'documents',
          label: getTranslationFromI18nKeyAndLabel('crm.common.documents', 'Documents'),
          icon: <FileTextIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <div className="gba:space-y-4">
                {/* Demo Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle>Document Section Demo Controls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="gba:flex gba:gap-2">
                      <Button
                        onClick={handleRefreshDocuments}
                        variant="default"
                        disabled={documentsLoading}
                        data-testid="test-loading-button"
                      >
                        {documentsLoading ? 'Loading...' : 'Test Loading State'}
                      </Button>
                      <Button onClick={handleSimulateError} variant="destructive" data-testid="test-error-button">
                        Test Error State
                      </Button>
                      <Button onClick={handleClearError} variant="outline" data-testid="clear-error-button">
                        Clear Error
                      </Button>
                    </div>
                    <p
                      className="gba:text-sm gba:text-muted-foreground gba:mt-2"
                      data-testid="demo-controls-description"
                    >
                      Use these buttons to test different states of the DocumentSection component.
                    </p>
                  </CardContent>
                </Card>

                {/* DocumentSection */}
                <DocumentSection
                  {...context}
                  entityId={entityIds.accountId}
                  documents={documentsError ? [] : mockDocuments}
                  isLoading={documentsLoading}
                  error={documentsError}
                  onRefresh={handleRefreshDocuments}
                  restClient={restClient}
                  createFolderActionProps={{
                    contextsArray: [FlowContextName.customerAccountEntity],
                    externalContextData: {
                      accountId: entityIds.accountId,
                      folder: true
                    },
                    prefixDataTestId: 'document-create-folder'
                  }}
                  uploadActionProps={{
                    contextsArray: [FlowContextName.customerAccountEntity],
                    externalContextData: {
                      accountId: entityIds.accountId
                    },
                    prefixDataTestId: 'document-upload'
                  }}
                  data-testid="record-example-document-section"
                />
              </div>
            </div>
          )
        }
      ]
    }),
    [activeTab, context, entityIds, documentsLoading, documentsError]
  )

  return (
    <RecordLayout
      data-testid="record-example"
      headerOrientation="horizontal"
      headerAvatar={<IconAvatar icon={BuildingIcon} variant="decorative" size="xl" />}
      headerOverline={getTranslationFromI18nKeyAndLabel('crm.common.example', 'EXAMPLE')}
      headerTitle="Record Example"
      headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
      views={subViewsConfig.items}
      defaultView={subViewsConfig.defaultValue}
      onViewChange={subViewsConfig.onValueChange}
    />
  )
}

export default RecordExample
