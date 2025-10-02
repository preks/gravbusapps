import React, { useState, useEffect, useMemo } from "react";
import {
  Spinner,
  Button,
  RecordLayout,
  Badge,
} from "@newwork/nw-design-system";
import {
  UserOutlined,
  FileOutlined,
  DollarOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { Trash2, Edit } from 'lucide-react';
import { LightbulbIcon } from '@phosphor-icons/react';
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo } from "@/common/utils/navigationUtils";
import { useOpportunityData } from "./hooks/useOpportunityData";
import { useProcessCompletion } from "@/common/hooks/useProcessCompletion";
import { formatCurrency, extractCurrencyCode } from '@/business-apps/crm/common/utils/currencyUtils';
import { useAiSummary } from './hooks/useAiSummary';
import { AiSummaryButton } from "@/common/components/common-relations/record-sections/header-section/ai-summary-button";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import ConditionSection from "@/common/components/common-relations/record-sections/condition-section/ConditionSection";
import { InvestmentSection } from "../../components/record-sections/investment-section";
import { OpportunityStageProgression } from "./components/OpportunityStageProgression";
import { isOpportunityOpen } from "./utils/opportunityStatusUtils";
import { AccountSection } from "@/common/components/common-relations/record-sections/account-section";
import { ContactSection } from "@/common/components/common-relations/record-sections/contact-section";
import { ActivitySection } from "@/common/components/common-relations/record-sections/activity-section";
import { NoteSection } from "@/common/components/common-relations/record-sections/note-section";
import { TaskSection } from "@/common/components/common-relations/record-sections/task-section";
import { ApprovalSection } from "@/common/components/common-relations/record-sections/approval-section";
import { DocumentSection, type DocumentItem } from "@/common/components/common-relations/record-sections/document-section";
import { useGetInvestmentActivities } from "@/common/data/investment/hooks/useInvestmentActivities";
import { useGetInvestmentNotesByOpportunityId, useGetInvestmentTasksByOpportunityId, useGetInvestmentDocumentsByOpportunityId } from "@/common/data/investment/hooks/useInvestmentOpportunities";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { startProcess } from "@/common/utils/start-process";

interface OpportunityRecordContentProps extends BusinessAppContextProps {
  opportunityId: string;
  onBack: () => void;
  getBackButtonText: () => string;
  fromEntity?: string | null;
}

const InvestmentOpportunityRecordContent: React.FC<OpportunityRecordContentProps> = ({
  opportunityId,
  onBack,
  getBackButtonText,
  ...props
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const {
    opportunity,
    opportunityData,
    stageConditionStatuses,
    loading,
    error,
    opportunityStages,
    loadingStages,
    stagesError,
    refetchOpportunityData,
  } = useOpportunityData(opportunityId, props.accessToken);

  // AI Summary hook for HeaderSection
  const aiSummaryHook = useAiSummary(opportunityId, props.accessToken);

  // Activity data loading
  const { fetchInvestmentActivities } = useGetInvestmentActivities(props);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  // Notes and Tasks data loading
  const { fetchInvestmentNotesByOpportunityId } = useGetInvestmentNotesByOpportunityId(props);
  const { fetchInvestmentTasksByOpportunityId } = useGetInvestmentTasksByOpportunityId(props);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);

  // Documents data loading
  const { fetchInvestmentDocumentsByOpportunityId } = useGetInvestmentDocumentsByOpportunityId(props);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  const loadActivities = async () => {
    if (!opportunityId) return;

    setActivitiesLoading(true);
    setActivitiesError(null);

    try {
      const result = await fetchInvestmentActivities({ opportunityId });
      const sortedActivities = (result.InvestmentActivity || []).sort((a, b) => {
        const dateA = new Date(a.occurredAt || a.createdAt).getTime();
        const dateB = new Date(b.occurredAt || b.createdAt).getTime();
        return dateB - dateA;
      });
      setActivities(sortedActivities);
    } catch (err) {
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadNotes = async () => {
    if (!opportunityId) return;
    try {
      const result = await fetchInvestmentNotesByOpportunityId(opportunityId);
      // Transform investment notes to match central NoteSection expected structure
      const transformedNotes = (result || []).map(note => ({
        id: note.id,
        noteTitle: note.title || '',
        noteText: note.text || '',
        createdAt: note.createdAt,
        createdBy: note.authorEmployee?.displayName || note.authorDisplayName || note.authorEmployee?.id || '', 
        assigneeEmployee: note.authorEmployee ? {
          id: note.authorEmployee.id,
          displayName: note.authorEmployee.displayName || note.authorDisplayName || 
                      `${note.authorEmployee.firstName || ''} ${note.authorEmployee.lastName || ''}`.trim()
        } : undefined,
        reminderAt: note.reminderDate
      }));
      setNotes(transformedNotes);
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const loadTasksAndApprovals = async () => {
    if (!opportunityId) return;
    try {
      const result = await fetchInvestmentTasksByOpportunityId(opportunityId);
      const allTasks = result || [];
      
      // Separate regular tasks from approval tasks
      const regularTasks = allTasks.filter(task => {
        const taskTypeValue = task.taskType?.value || task.taskType?.code;
        const isApprovalTask = taskTypeValue?.toLowerCase() === 'approval';
        return !isApprovalTask;
      });
      
      const approvalTasks = allTasks.filter(task => {
        const taskTypeValue = task.taskType?.value || task.taskType?.code;
        const isApprovalTask = taskTypeValue?.toLowerCase() === 'approval';
        return isApprovalTask;
      });

      setTasks(regularTasks);
      setApprovals(approvalTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const loadDocuments = async () => {
    if (!opportunityId) return;

    setDocumentsLoading(true);
    setDocumentsError(null);

    try {
      const result = await fetchInvestmentDocumentsByOpportunityId(opportunityId);
      
      // Transform investment documents to DocumentItem format
      const transformedDocuments: DocumentItem[] = (result || []).map(doc => ({
        id: doc.id,
        name: doc.name || null,
        description: doc.description || null,
        createdAt: doc.createdAt,
        expirationDate: doc.expirationDate || null,
        documentType: doc.documentType ? {
          id: doc.documentType.id,
          value: doc.documentType.value || '',
          code: doc.documentType.code
        } : null,
        documentGroup: doc.documentGroup ? {
          id: doc.documentGroup.id,
          value: doc.documentGroup.value || '',
          code: doc.documentGroup.code
        } : null,
        file: doc.file || null,
        mimeType: doc.mimeType || null,
        fileSize: doc.fileSize,
        createdBy: doc.createdBy || null,
        parentDocument: typeof doc.parentDocument === 'string' ? doc.parentDocument : doc.parentDocument?.id || null,
        folder: doc.folder,
        verified: doc.verified,
        verificationDate: doc.verificationDate || null,
        authenticated: doc.authenticated,
        authenticationDate: doc.authenticationDate || null,
        mandatory: doc.mandatory,
        version: doc.version
      }));

      setDocuments(transformedDocuments);
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Load all data on mount and when opportunityId changes
  useEffect(() => {
    loadActivities();
    loadNotes();
    loadTasksAndApprovals();
    loadDocuments();
  }, [opportunityId]);


  useProcessCompletion({
    onSuccess: () => {
      refetchOpportunityData();
      loadActivities();
      loadNotes();
      loadTasksAndApprovals();
      loadDocuments();
    }
  });

  // Memoize stage condition action props to prevent recreation
  const stageConditionActionProps = useMemo(() => ({
    contextsArray: [FlowContextName.investmentOpportunityConditionUpdate],
    externalContextData: undefined,
    prefixDataTestId: "stage-condition-status-icon",
  }), []);

  // Memoize header action button to prevent recreation
  const headerActionButton = useMemo(() => (
    <AppActionButton
      size="icon"
      contextsArray={[FlowContextName.investmentOpportunityEntity]}
      externalContextData={{ opportunityId }}
      prefixDataTestId="opportunity-record-action"
      emptyStateBehavior="hide"
      deferMainContextRequestsUntilClick={false}
      accessToken={props.accessToken}
    />
  ), [opportunityId, props.accessToken]);

  // Memoize action props to prevent recreation and unnecessary re-renders
  const taskActionProps = useMemo(() => ({
    contextsArray: [FlowContextName.investmentTaskCreate],
    externalContextData: { opportunityId },
    prefixDataTestId: "opportunity-task"
  }), [opportunityId]);

  const approvalActionProps = useMemo(() => ({
    contextsArray: [FlowContextName.investmentTaskCreate],
    externalContextData: { opportunityId, typeRef: 'InvestmentTaskType:v1:APPROVAL' },
    prefixDataTestId: "opportunity-approval"
  }), [opportunityId]);

  const noteActionProps = useMemo(() => ({
    contextsArray: [FlowContextName.createInvestmentNote],
    externalContextData: { opportunityId },
    prefixDataTestId: "opportunity-note"
  }), [opportunityId]);

  const noteEntityActionProps = useMemo(() => ({
    contextsArray: [FlowContextName.investmentNoteEntity],
    externalContextData: { opportunityId },
    prefixDataTestId: "opportunity-note-entity"
  }), [opportunityId]);


  const activityEntityActionProps = useMemo(() => ({
    contextsArray: [FlowContextName.investmentActivityEntity],
    externalContextData: { opportunityId },
    prefixDataTestId: "opportunity-activity-entity"
  }), [opportunityId]);

  const documentCreateFolderActionProps = useMemo(() => ({
    contextsArray: [FlowContextName.investmentDocumentCreate],
    externalContextData: { 
      opportunityId,
      folder: true
    },
    prefixDataTestId: 'opportunity-document-create-folder'
  }), [opportunityId]);

  const documentUploadActionProps = useMemo(() => ({
    contextsArray: [FlowContextName.investmentDocumentCreate],
    externalContextData: { 
      opportunityId
    },
    prefixDataTestId: 'opportunity-document-upload'
  }), [opportunityId]);

  const activityActionProps = useMemo(() => ({
    contextsArray: [FlowContextName.createInvestmentActivity],
    externalContextData: { 
      opportunityId, 
      opportunity: opportunityId,
      investmentActivity: { opportunity: opportunityId }
    },
    prefixDataTestId: "add-activity"
  }), [opportunityId]);

  // Memoize RecordLayout data to prevent unnecessary re-renders (must be before early returns)
  const headerMeta = useMemo(() => opportunity?.value ? (
    <Badge variant="outline" className="gba:gap-1">
      <DollarOutlined className="gba:w-4 gba:h-4" />
      {formatCurrency(
        opportunity.value, 
        opportunity?.currency?.id || 'Currency:v1:EUR'
      )}
    </Badge>
  ) : undefined, [opportunity?.value, opportunity?.currency?.id]);

  const headerDetailGroups = useMemo(() => [
    {
      id: 'opportunity-details',
      items: [
        {
          label: 'Status',
          value: opportunity?.status,
          icon: StarOutlined
        },
        {
          label: 'Currency',
          value: extractCurrencyCode(opportunity?.currency?.id || 'Currency:v1:EUR')
        },
        {
          label: 'Estimated Amount',
          value: opportunity?.value ? 
            formatCurrency(opportunity.value, opportunity.currency.id) : 
            'Not set'
        },
        {
          label: 'Owner',
          value: opportunity?.ownerEmployee ? 
            `${opportunity.ownerEmployee.firstName} ${opportunity.ownerEmployee.lastName}` : 
            'Not assigned',
          icon: UserOutlined
        }
      ]
    }
  ], [opportunity?.status, opportunity?.currency?.id, opportunity?.value, opportunity?.ownerEmployee]);

  const headerActions = useMemo(() => (
    <AiSummaryButton
      config={{
        entityType: 'opportunity',
        loadingMessage: 'Generating AI Summary...',
        loadingSubtitle: 'Analyzing opportunity data and activities'
      }}
      summaryHook={aiSummaryHook}
      dataTestId={`opportunity-update-button-${opportunityId}`}
    />
  ), [aiSummaryHook, opportunityId]);

  const headerContent = useMemo(() => {
    const isReadonly = !isOpportunityOpen(opportunityData?.opportunityStatus?.value);
    
    return !loadingStages &&
      !stagesError &&
      opportunityStages.length > 0 &&
      opportunityData?.opportunityPipelineStage ? (
        <OpportunityStageProgression
          currentStage={opportunity?.stage || "Discovery"}
          stages={opportunityStages}
          opportunityId={opportunityId}
          stageConditionStatuses={stageConditionStatuses || []}
          accessToken={props.accessToken}
          readonly={isReadonly}
          opportunityStatus={opportunityData?.opportunityStatus?.value}
        />
      ) : loadingStages ? (
        <div style={{ 
          textAlign: "center", 
          padding: "var(--nw-spacing-lg)" 
        }}>
          <Spinner size="sm" />
          <span style={{ marginLeft: "var(--nw-spacing-sm)" }}>Loading pipeline stages...</span>
        </div>
      ) : stagesError ? (
        <div style={{ 
          textAlign: "center", 
          padding: "var(--nw-spacing-lg)", 
          color: "var(--nw-color-danger-500)" 
        }}>
          <p>Failed to load pipeline stages: {stagesError}</p>
        </div>
      ) : !opportunityData?.opportunityPipelineStage ? (
        <div style={{ 
          textAlign: "center", 
          padding: "var(--nw-spacing-lg)", 
          color: "var(--nw-color-text-secondary)" 
        }}>
          <p>No pipeline stage assigned to this opportunity</p>
        </div>
      ) : undefined;
  }, [loadingStages, stagesError, opportunityStages, opportunityData?.opportunityPipelineStage, opportunity?.stage, opportunityId, stageConditionStatuses, props.accessToken, opportunityData?.opportunityStatus?.value]);

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">{error || 'Investment Opportunity not found'}</p>
          <Button
            onClick={onBack}
            className="gba:mt-4"
            variant="default"
          >
            {getBackButtonText()}
          </Button>
        </div>
      </div>
    );
  }

  const subViewsConfig = {
    defaultValue: activeTab,
    onValueChange: setActiveTab,
    items: [
      {
        value: 'overview',
        label: 'Overview',
        icon: <UserOutlined className="gba:mr-2" />,
        content: (
          <>
            {/* Left side: Main content - spans 8/11 on lg, 7/11 on md */}
            <div className="gba:col-span-3 gba:sm:col-span-6 gba:md:col-span-9 gba:lg:col-span-9 gba:flex gba:flex-col gba:gap-6">
              {/* Account and Contact info */}
              <div className="gba:grid gba:grid-cols-3 gba:gap-6 gba:items-stretch">
                <AccountSection 
                  account={opportunityData?.account ? {
                    id: opportunityData.account.id,
                    name: opportunityData.account.name,
                    email: opportunityData.account.email,
                    phone: opportunityData.account.phone,
                    website: opportunityData.account.website,
                    legalForm: opportunityData.account.legalForm?.value || opportunityData.account.legalForm?.code,
                    industry: opportunityData.account.industryClass?.value || opportunityData.account.industryClass?.code,
                    size: opportunityData.account.companySize?.value || opportunityData.account.companySize?.code,
                    revenue: opportunityData.account.accountAnnualRevenueBand?.value || opportunityData.account.accountAnnualRevenueBand?.code,
                    numberOfEmployees: opportunityData.account.companySize,
                    annualRevenue: opportunityData.account.accountAnnualRevenueBand,
                    logoUrl: opportunityData.account.picture || opportunityData.account.pictureThumbnail,
                    foundationDate: opportunityData.account.foundationDate,
                    geographicPresence: opportunityData.account.geographicPresence,
                  } : undefined}
                  data-testid="opportunity-account-section"
                  className="gba:h-full gba:flex"
                  {...props}
                />

                <ContactSection 
                  contacts={opportunityData?.investmentOpportunityContact?.map((ioc: any) => ioc.contact ? {
                    id: ioc.contact.id,
                    firstName: ioc.contact.firstName,
                    lastName: ioc.contact.lastName,
                    fullName: ioc.contact.fullName,
                    email: ioc.contact.email,
                    phone: ioc.contact.phone,
                    jobTitle: ioc.contact.jobPosition,
                    department: ioc.contact.department,
                    picture: ioc.contact.picture || ioc.contact.pictureThumbnail,
                    academicTitle: ioc.contact.academicTitle?.value || ioc.contact.academicTitle?.code,
                    salutation: ioc.contact.salutation?.value || ioc.contact.salutation?.code,
                  } : null).filter(Boolean)}
                  data-testid="opportunity-contact-section"
                  className="gba:h-full gba:flex"
                  {...props}
                />
                <InvestmentSection 
                  investmentData={opportunityData} 
                  businessAppContext={props}
                  isLoading={loading}
                  error={error}
                  className="gba:h-full"
                />
              </div>

              {/* Stage conditions + Tasks/Approvals row */}
              <div className="gba:grid gba:grid-cols-2 gba:gap-6">
                <div>
                  <ConditionSection
                    opportunity={opportunityData}
                    stageConditionStatuses={stageConditionStatuses || []}
                    stageConditionActionProps={stageConditionActionProps}
                    accessToken={props.accessToken}
                    data-testid="opportunity-condition-section"
                  />
                </div>
                <div className="gba:flex gba:flex-col gba:gap-6">
                  <TaskSection
                    opportunityId={opportunityId}
                    tasks={tasks.map(task => ({
                      id: task.id,
                      title: task.name,
                      due: task.dueDate,
                      assignee: task.assignedEmployee?.displayName || task.assignedEmployee?.fullName,
                      statusCode: task.taskStatus?.value?.toUpperCase() as any,
                      assigneeEmployee: task.assignedEmployee
                    }))}
                    taskActionProps={taskActionProps}
                    data-testid="opportunity-task-section"
                    {...props}
                  />
                  <ApprovalSection
                    opportunityId={opportunityId}
                    approvals={approvals.map(approval => ({
                      id: approval.id,
                      title: approval.name,
                      status: approval.taskStatus?.value,
                      date: approval.createdAt,
                      actor: approval.creatorEmployee?.displayName || approval.creatorEmployee?.fullName,
                      actorEmployee: approval.creatorEmployee
                    }))}
                    approvalActionProps={approvalActionProps}
                    data-testid="opportunity-approval-section"
                    {...props}
                  />
                </div>
              </div>

              {/* Notes full width */}
              <div>
                <NoteSection
                  opportunityId={opportunityId}
                  notes={notes}
                  noteActionProps={noteActionProps}
                  noteEntityActionProps={noteEntityActionProps}
                  data-testid="opportunity-note-section"
                  {...props}
                />
              </div>
            </div>

            {/* Right side: Activities - spans last 3/11 on lg, 4/11 on md */}
            <div className="gba:col-span-1 gba:lg:col-start-10 gba:lg:col-end-13 gba:w-full gba:h-full gba:h-full">
              <ActivitySection
                opportunityId={opportunityId}
                activities={activities}
                activitiesLoading={activitiesLoading}
                activitiesError={activitiesError}
                onReloadActivities={loadActivities}
                {...activityActionProps}
                activityEntityActionProps={activityEntityActionProps}
                showTranslation={true}
                className="gba:h-full gba:h-full"
                data-testid="opportunity-activity-section"
                {...props}
              />
            </div>
          </>
        )
      },
      {
        value: 'documents',
        label: 'Documents',
        icon: <FileOutlined className="gba:mr-2" />,
        content: (
          <div className="gba:col-span-12">
            <DocumentSection
              entityId={opportunityId}
              documents={documents}
              isLoading={documentsLoading}
              error={documentsError}
              onRefresh={loadDocuments}
              apiConfig={{
                baseEndpoint: '/investment-relations',
                entityFieldName: 'opportunity',
                documentFieldName: 'investmentDocument'
              }}
              enableGraphQLSearch={true}
              graphQLSearchConfig={{
                entityType: 'opportunity'
              }}
              customActions={[
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <Trash2 className="gba:h-4 gba:w-4" />,
                  apiEndpoint: '/investment-relations/deleteInvestmentDocument',
                  confirmMessage: 'Are you sure you want to delete this document? This action cannot be undone.'
                },
                {
                  key: 'update',
                  label: 'Update',
                  icon: <Edit className="gba:h-4 gba:w-4" />,
                  onClick: (documentId: string, document: any, entityId: string) => {
                    // Open the document update popup
                    startProcess({
                      domain: 'investment-relations',
                      processName: 'updateInvestmentDocument',
                      payload: {
                        documentId: documentId,
                        opportunityId: entityId,
                        investmentDocument: {
                          id: documentId,
                          version: document.version,
                          name: document.name,
                          documentGroupRef: document.documentGroup?.id,
                          documentTypeRef: document.documentType?.id,
                          expirationDate: document.expirationDate,
                          description: document.description,
                          folder: document.folder || false,
                        },
                      },
                      builderType: 'NATIVE_SCREEN',
                    });
                  }
                }
              ]}
              createFolderActionProps={documentCreateFolderActionProps}
              uploadActionProps={documentUploadActionProps}
              deleteActionProps={{
                contextsArray: [FlowContextName.investmentDocumentDelete],
                externalContextData: { 
                  opportunityId,
                  entityType: 'opportunity'
                },
                prefixDataTestId: 'opportunity-document-delete'
              }}
              data-testid="opportunity-document-section"
              {...props}
            />
          </div>
        )
      }
    ]
  };

  return (
    <div
      className="gba:opportunity-details-container"
      data-testid="investment-opportunity-detail"
    >
      <RecordLayout
        headerOrientation="horizontal"
        headerIcon={LightbulbIcon}
        headerCategory="OPPORTUNITY"
        onBack={onBack}
        headerTitle={opportunity.name}
        headerMeta={headerMeta}
        headerActions={headerActions}
        headerActionButton={headerActionButton}
        headerDetailGroups={headerDetailGroups}
        headerContent={headerContent}
        subViews={subViewsConfig}
      />
    </div>
  );
};

interface InvestmentOpportunityRecordProps extends BusinessAppContextProps {
  opportunityId?: string;
}

const OpportunityRecord: React.FC<InvestmentOpportunityRecordProps> = ({
  opportunityId: propOpportunityId,
  ...props
}) => {
  const opportunityId = useMemo(() => {
    return (
      propOpportunityId ||
      new URLSearchParams(window.location.search).get("opportunityId")
    );
  }, [propOpportunityId]);
  const handleBack = () => {
    // Always navigate to investment relations
    navigateTo('/platform/irm/investment-relations?view=opportunities');
  };

  const getBackButtonText = () => {
    // Always return investment relations text
    return 'Back to Investment Relations';
  };

  if (!opportunityId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">Opportunity ID is required</p>
          <Button
            onClick={handleBack}
            className="gba:mt-4"
            variant="default"
          >
            Back to Investment Opportunities
          </Button>
        </div>
      </div>
    );
  }

  return (
    <InvestmentOpportunityRecordContent
      opportunityId={opportunityId}
      onBack={handleBack}
      getBackButtonText={getBackButtonText}
      fromEntity={new URLSearchParams(window.location.search).get('fromEntity')}
      {...props}
    />
  );
};

export { OpportunityRecord, InvestmentOpportunityRecordContent };
export default OpportunityRecord;
