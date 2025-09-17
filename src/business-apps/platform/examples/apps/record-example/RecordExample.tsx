import React, { useMemo, useState } from "react";
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent } from "@newwork/nw-design-system";
import {
  AccountSection,
  ContactSection,
  ActivitySection,
  DocumentSection,
  ApprovalSection,
  TaskSection,
  SummarySection,
  NoteSection,
  ConditionSection,
  type DocumentItem,
} from '@/common/components/common-relations/record-sections';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

const mockAccountData = {
  name: 'Acme Corporation',
  legalForm: { value: 'GmbH' },
  industry: { value: 'Technology' },
  addressLine: 'Main Street 123, 10115 Berlin',
  website: 'acme.example',
  phone: '+49 30 1234567',
  numberOfEmployees: { value: '120' },
  annualRevenue: { value: '€12,000,000' },
  // Company logo - dynamic demo v2.0
  logoUrl: 'https://picsum.photos/40/40?random=1',
};

const mockAccounts = [
  {
    id: 'acc_1',
    name: 'Acme Corporation',
    legalForm: { value: 'GmbH' },
    industry: { value: 'Technology' },
    addressLine: 'Main Street 123, 10115 Berlin',
    website: 'acme.example',
    phone: '+49 30 1234567',
    numberOfEmployees: { value: '120' },
    annualRevenue: { value: '€12,000,000' },
    // Has uploaded logo - shows avatar
    logoUrl: 'https://picsum.photos/40/40?random=2',
  },
  {
    id: 'acc_2',
    name: 'StartupCorp Ltd',
    legalForm: { value: 'Ltd' },
    industry: { value: 'Software' },
    addressLine: 'Innovation Street 789, 10117 Berlin',
    website: 'startupcorp.example',
    phone: '+49 30 5555555',
    numberOfEmployees: { value: '25' },
    annualRevenue: { value: '€2,500,000' },
    // No logo uploaded - shows bank icon
    // logoUrl: undefined
  },
  {
    id: 'acc_3',
    name: 'GlobalTech Solutions',
    legalForm: { value: 'AG' },
    industry: { value: 'Consulting' },
    addressLine: 'Business Park 456, 10119 Berlin',
    website: 'globaltech.example',
    phone: '+49 30 9876543',
    numberOfEmployees: { value: '500' },
    annualRevenue: { value: '€45,000,000' },
    // Has logo
    logoUrl: 'https://picsum.photos/40/40?random=4',
  },
];

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
  pictureThumbnailUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
};

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
    createdAt: new Date().toISOString(),
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
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
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
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
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
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

const mockEntityIds = {
  accountId: 'acc_mock_1',
  contactId: 'con_mock_1',
  opportunityId: 'opp_mock_1',
  leadId: 'lead_mock_1',
};

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
];

const RecordExample: React.FC<BusinessAppContextProps> = (context) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  const entityIds = useMemo(() => mockEntityIds, []);

  const handleRefreshDocuments = () => {
    setDocumentsLoading(true);
    setDocumentsError(null);
    
    // Simulate API call
    setTimeout(() => {
      setDocumentsLoading(false);
      console.log('Documents refreshed successfully');
    }, 2000);
  };

  const handleSimulateError = () => {
    setDocumentsError('Failed to load documents. Please try again.');
  };

  const handleClearError = () => {
    setDocumentsError(null);
  };

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="record-example">
      <Card>
        <CardHeader>
          <CardTitle>Record Example</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-sm">This example demonstrates the centralized record sections with mock data.</div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
        <TabsList className="gba:bg-white gba:border">
          <TabsTrigger value="overview" data-testid="record-example-tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="documents" data-testid="record-example-tab-documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" data-testid="record-example-overview">
          <div className="gba:flex gba:gap-6">
            <div className="gba:w-80 gba:flex-shrink-0">
              <AccountSection
                {...context}
                accountId={entityIds.accountId}
                accountData={mockAccountData}
                data-testid="record-example-account-section"
              />
            </div>
            <div className="gba:w-80 gba:flex-shrink-0">
              <ContactSection
                {...context}
                contactId={entityIds.contactId}
                contact={mockContact}
                data-testid="record-example-contact-section"
              />
            </div>
          </div>

          {/* Multiple associations demo */}
          <div className="gba:flex gba:gap-6 gba:mt-6">
            <div className="gba:w-80 gba:flex-shrink-0">
              <AccountSection
                {...context}
                accounts={mockAccounts}
                data-testid="record-example-account-section-multiple"
              />
            </div>
            <div className="gba:w-80 gba:flex-shrink-0">
              <ContactSection
                {...context}
                contacts={mockContacts}
                data-testid="record-example-contact-section-multiple"
              />
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6 gba:mt-6">
            <div>
              <ActivitySection
                {...context}
                activities={[
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
                    }
                  },
                  { 
                    id: 'a2', 
                    title: 'Email Follow-up', 
                    description: 'Sent recap and next steps', 
                    occurredAt: new Date(Date.now()-86400000).toISOString(), 
                    createdBy: 'You', 
                    activityType: { value: 'Email' },
                    ownerEmployee: { 
                      id: context.userInfo?.employeeDetails.employeeId || 'emp_current_user', 
                      displayName: 'Current User',
                      firstName: 'Current',
                      lastName: 'User'
                    }
                  },
                ]}
                activitiesLoading={false}
                activitiesError={null}
                onReloadActivities={() => {}}
                data-testid="record-example-activity-section"
              />
            </div>
            <div>
              <TaskSection
                {...context}
                demo
                taskActionProps={{
                  contextsArray: [FlowContextName.createCustomerTask],
                  externalContextData: { ...entityIds },
                  prefixDataTestId: 'tasks',
                  emptyStateBehavior: 'enable'
                }}
                demoTasks={[
                  { 
                    id: 't1', 
                    title: 'Prepare proposal', 
                    assignee: 'Daniel Vorberg', 
                    due: 'Fri 17:00', 
                    statusCode: 'IN_PROGRESS',
                    assigneeEmployee: {
                      id: 'emp_daniel_vorberg',
                      displayName: 'Daniel Vorberg',
                      firstName: 'Daniel',
                      lastName: 'Vorberg'
                    }
                  },
                  { 
                    id: 't2', 
                    title: 'Schedule workshop', 
                    assignee: 'You', 
                    due: 'Mon 10:00', 
                    statusCode: 'PENDING',
                    assigneeEmployee: {
                      id: context.userInfo?.employeeDetails.employeeId || 'emp_current_user',
                      displayName: 'Current User',
                      firstName: 'Current',
                      lastName: 'User'
                    }
                  },
                  { 
                    id: 't3', 
                    title: 'Contract review', 
                    assignee: 'Legal Team', 
                    due: 'Tue 12:00', 
                    statusCode: 'COMPLETED'
                    // No assigneeEmployee for Legal Team (generic team)
                  },
                  { 
                    id: 't4', 
                    title: 'Follow-up call', 
                    assignee: 'You', 
                    due: 'Yesterday 16:00', 
                    statusCode: 'OVERDUE',
                    assigneeEmployee: {
                      id: context.userInfo?.employeeDetails.employeeId || 'emp_current_user',
                      displayName: 'Current User',
                      firstName: 'Current',
                      lastName: 'User'
                    }
                  },
                ]}
                data-testid="record-example-task-section"
              />
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6 gba:mt-6">
            <div>
              <ApprovalSection
                {...context}
                demo
                approvalActionProps={{
                  contextsArray: [FlowContextName.customerAccountEntity],
                  externalContextData: { ...entityIds },
                  prefixDataTestId: 'approvals',
                  emptyStateBehavior: 'enable'
                }}
                demoApprovals={[
                  { 
                    id: 1, 
                    date: 'Created today', 
                    title: 'Budget Approval', 
                    status: 'pending',
                    actorEmployee: {
                      id: context.userInfo?.employeeDetails.employeeId || 'emp_current_user',
                      displayName: 'Current User',
                      firstName: 'Current',
                      lastName: 'User'
                    }
                  },
                  { 
                    id: 2, 
                    date: 'Yesterday', 
                    title: 'Legal Review', 
                    status: 'approved', 
                    actor: 'Legal Team'
                    // No actorEmployee for Legal Team (generic team)
                  }
                ]}
                data-testid="record-example-approval-section"
              />
            </div>
            <div>
              <NoteSection
                {...context}
                demo
                noteActionProps={{
                  contextsArray: [FlowContextName.investmentNoteEntity],
                  externalContextData: { ...entityIds },
                  prefixDataTestId: 'notes',
                  emptyStateBehavior: 'enable'
                }}
                data-testid="record-example-note-section"
              />
            </div>
          </div>

          <div className="gba:mt-6">
            <SummarySection data-testid="record-example-summary-section">
              <div className="gba:text-sm">AI summary preview: ACME shows strong engagement. Next steps: finalize proposal, schedule exec review.</div>
            </SummarySection>
          </div>

          {/* Conditions demo */}
          <div className="gba:mt-6">
            <ConditionSection
              {...context}
              opportunity={{ salesPipelineStage: { code: 'DISCOVERY', value: 'Discovery' } }}
              stageConditionActionProps={{
                contextsArray: [FlowContextName.saveOpportunityStageConditionStatus],
                externalContextData: { ...entityIds },
                prefixDataTestId: 'stage-condition-status-icon',
                emptyStateBehavior: 'disable'
              }}
              stageConditionStatuses={[
                {
                  id: 'cond_1',
                  completed: false,
                  salesPipelineStageCondition: { code: 'REQ_DOCS', value: 'Requirements Document', parentEntryId: 'SalesPipelineStage:v1:DISCOVERY' },
                  configSnapshot: { description: 'Upload requirements document for validation', check_type: 'MANUAL', deadline_enabled: true, deadline_duration: 3, deadline_duration_measurement_unit_ref: 'MeasurementUnit:v1:DAY' },
                  deadlineAt: new Date(Date.now() + 3*24*60*60*1000).toISOString(),
                },
                {
                  id: 'cond_2',
                  completed: true,
                  completedAt: new Date().toISOString(),
                  completedByEmployee: { firstName: 'Alice', lastName: 'Example' },
                  salesPipelineStageCondition: { code: 'STAKEHOLDER_OK', value: 'Stakeholder Alignment', parentEntryId: 'SalesPipelineStage:v1:DISCOVERY' },
                  configSnapshot: { description: 'Ensure stakeholders are aligned', check_type: 'MANUAL' },
                }
              ]}
              data-testid="record-example-condition-section"
            />
          </div>
        </TabsContent>

        
        
        <TabsContent value="documents" data-testid="record-example-documents">
          <div className="gba:space-y-4">
            {/* Demo Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Document Section Demo Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:flex gba:gap-2">
                  <button 
                    onClick={handleRefreshDocuments}
                    className="gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded gba:text-sm hover:gba:bg-blue-600"
                    disabled={documentsLoading}
                  >
                    {documentsLoading ? 'Loading...' : 'Test Loading State'}
                  </button>
                  <button 
                    onClick={handleSimulateError}
                    className="gba:px-4 gba:py-2 gba:bg-red-500 gba:text-white gba:rounded gba:text-sm hover:gba:bg-red-600"
                  >
                    Test Error State
                  </button>
                  <button 
                    onClick={handleClearError}
                    className="gba:px-4 gba:py-2 gba:bg-green-500 gba:text-white gba:rounded gba:text-sm hover:gba:bg-green-600"
                  >
                    Clear Error
                  </button>
                </div>
                <p className="gba:text-sm gba:text-gray-600 gba:mt-2">
                  Use these buttons to test different states of the DocumentSection component.
                </p>
              </CardContent>
            </Card>

            {/* DocumentSection */}
            <DocumentSection
              {...context}
              entityId={entityIds.accountId}
              entityType="account"
              documents={documentsError ? [] : mockDocuments}
              isLoading={documentsLoading}
              error={documentsError}
              onRefresh={handleRefreshDocuments}
              createFolderActionProps={{
                contextsArray: [FlowContextName.saveInvestmentDocument],
                externalContextData: { 
                  accountId: entityIds.accountId,
                  entityType: 'account',
                  folder: true
                },
                prefixDataTestId: 'document-create-folder'
              }}
              uploadActionProps={{
                contextsArray: [FlowContextName.saveInvestmentDocument],
                externalContextData: { 
                  accountId: entityIds.accountId,
                  entityType: 'account'
                },
                prefixDataTestId: 'document-upload'
              }}
              data-testid="record-example-document-section"
            />
          </div>
        </TabsContent>
        
      </Tabs>
      
      
    </div>
  );
};

export default RecordExample;


