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
} from '@/common/components/common-relations/record-sections';

const mockAccountData = {
  name: 'Acme Corporation',
  legalForm: { value: 'GmbH' },
  industry: { value: 'Technology' },
  addressLine: 'Main Street 123, 10115 Berlin',
  website: 'acme.example',
  phone: '+49 30 1234567',
  numberOfEmployees: { value: '120' },
  annualRevenue: { value: '€12,000,000' },
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
  },
  {
    id: 'acc_2',
    name: 'Globex GmbH',
    legalForm: { value: 'GmbH' },
    industry: { value: 'Consulting' },
    addressLine: 'Consulting Allee 10, 80331 München',
    website: 'globex.example',
    phone: '+49 89 9876543',
    numberOfEmployees: { value: '80' },
    annualRevenue: { value: '€8,500,000' },
  },
];

const mockContact = {
  firstName: 'Max',
  lastName: 'Mustermann',
  email: 'max.mustermann@example.com',
  phone: '+49 30 7654321',
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
    createdAt: new Date().toISOString(),
  },
  {
    id: 'con_2',
    firstName: 'Erika',
    lastName: 'Musterfrau',
    email: 'erika.musterfrau@example.com',
    phone: '+49 30 11223344',
    jobTitle: 'Account Executive',
    department: 'sales',
    academicTitle: { id: 'at2', value: 'M.Sc.' },
    linkedinUrl: 'https://linkedin.com/in/erika-musterfrau',
    xingUrl: 'https://www.xing.com/profile/Erika_Musterfrau',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const mockEntityIds = {
  accountId: 'acc_mock_1',
  contactId: 'con_mock_1',
  opportunityId: 'opp_mock_1',
  leadId: 'lead_mock_1',
};

const RecordExample: React.FC<BusinessAppContextProps> = (context) => {
  const [activeTab, setActiveTab] = useState('overview');

  const entityIds = useMemo(() => mockEntityIds, []);

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
          <div className="gba:grid gba:grid-cols-4 gba:gap-6">
            <div className="gba:col-span-3">
              <AccountSection
                {...context}
                accountId={entityIds.accountId}
                accountData={mockAccountData}
                data-testid="record-example-account-section"
              />
            </div>
            <div className="gba:col-span-1">
              <ContactSection
                {...context}
                contactId={entityIds.contactId}
                contact={mockContact}
                data-testid="record-example-contact-section"
              />
            </div>
          </div>

          {/* Multiple associations demo */}
          <div className="gba:grid gba:grid-cols-4 gba:gap-6 gba:mt-6">
            <div className="gba:col-span-3">
              <AccountSection
                {...context}
                accounts={mockAccounts}
                data-testid="record-example-account-section-multiple"
              />
            </div>
            <div className="gba:col-span-1">
              <ContactSection
                {...context}
                contacts={mockContacts}
                data-testid="record-example-contact-section-multiple"
              />
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:mt-6">
            <div>
              <ActivitySection
                {...context}
                activities={[
                  { id: 'a1', title: 'Intro Call', description: 'Initial discovery with client', occurredAt: new Date().toISOString(), createdBy: 'Daniel Vorberg', activityType: { value: 'Call' } },
                  { id: 'a2', title: 'Email Follow-up', description: 'Sent recap and next steps', occurredAt: new Date(Date.now()-86400000).toISOString(), createdBy: 'You', activityType: { value: 'Email' } },
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
                demoTasks={[
                  { id: 't1', title: 'Prepare proposal', assignee: 'Daniel Vorberg', due: 'Fri 17:00', statusCode: 'IN_PROGRESS' },
                  { id: 't2', title: 'Schedule workshop', assignee: 'You', due: 'Mon 10:00', statusCode: 'PENDING' },
                  { id: 't3', title: 'Contract review', assignee: 'Legal Team', due: 'Tue 12:00', statusCode: 'COMPLETED' },
                  { id: 't4', title: 'Follow-up call', assignee: 'You', due: 'Yesterday 16:00', statusCode: 'OVERDUE' },
                ]}
                data-testid="record-example-task-section"
              />
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:mt-6">
            <div>
              <ApprovalSection
                {...context}
                demo
                demoApprovals={[
                  { id: 1, date: 'Created today', title: 'Budget Approval', status: 'pending' },
                  { id: 2, date: 'Yesterday', title: 'Legal Review', status: 'approved', actor: 'Legal Team' }
                ]}
                data-testid="record-example-approval-section"
              />
            </div>
            <div>
              <NoteSection
                {...context}
                demo
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
          <DocumentSection
            {...context}
            entityId={entityIds.accountId}
            entityType="account"
            demo
            data-testid="record-example-document-section"
          />
        </TabsContent>
        
      </Tabs>
      
      
    </div>
  );
};

export default RecordExample;


