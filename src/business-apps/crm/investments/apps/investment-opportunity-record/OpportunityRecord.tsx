import React, { useState, useEffect, useMemo } from "react";
import {
  Spinner,
  Button,
  RecordLayout,
  Badge,
} from "@newwork/nw-design-system";
import { User, FileText, Star, Lightbulb as LightbulbIcon, Trash as Trash2, PencilSimple as Edit } from '@phosphor-icons/react';
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { useOpportunityData } from "./hooks/useOpportunityData";
import { useProcessCompletion } from "@/common/hooks/useProcessCompletion";
import { formatCurrency, extractCurrencyCode } from '@/business-apps/crm/common/utils/currencyUtils';
import { getOpportunityStatusBadgeVariant } from '@/common/utils/badgeUtils';
import { useAiSummary } from './hooks/useAiSummary';
import { AiActions, AiAction } from "@/common/components/common-relations/record-sections/header-section/ai-actions";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { Bot } from 'lucide-react';
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet';
import ConditionSection from "@/common/components/common-relations/record-sections/condition-section/ConditionSection";
import InvestmentSection from "@/common/components/common-relations/record-sections/investment-section/InvestmentSection";
import { OpportunityStageProgression } from "./components/OpportunityStageProgression";
import { isOpportunityOpen } from "./utils/opportunityStatusUtils";
import AccountSection from "@/common/components/common-relations/record-sections/account-section/AccountSection";
import ContactSection from "@/common/components/common-relations/record-sections/contact-section/ContactSection";
import ActivitySection from "@/common/components/common-relations/record-sections/activity-section/ActivitySection";
import NoteSection from "@/common/components/common-relations/record-sections/note-section/NoteSection";
import TaskSection from "@/common/components/common-relations/record-sections/task-section/TaskSection";
import SectionWrapper from "@/common/components/common-relations/record-sections/section-card/SectionCard";
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
  const ALLOWED_TABS = ['overview', 'documents'] as const;
  type TabKey = typeof ALLOWED_TABS[number];
  const [activeTab, setActiveTab] = useState("overview");
  
  // Construct businessAppContext from props for sections
  const businessAppContext: BusinessAppContextProps = {
    accessToken: props.accessToken,
    userInfo: props.userInfo,
    additionalData: props.additionalData,
  };
  
  // Initialize activeTab from URL on mount and write default if missing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('tab') || 'overview';
    const validated = ALLOWED_TABS.includes(initial as TabKey) ? (initial as TabKey) : 'overview';
    setActiveTab(validated);
    if (!params.get('tab') || initial !== validated) {
      params.set('tab', validated);
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    }
    const onPopState = () => {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('tab') || 'overview';
      setActiveTab(ALLOWED_TABS.includes(t as TabKey) ? (t as TabKey) : 'overview');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
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

  // Build reference URLs for IRM context
  const buildReferenceUrl = (reference: TaskReference): string => {
    switch (reference.type) {
      case 'lead': 
        return buildPlatformUrl('/platform/irm/lead-record', { leadId: reference.id });
      case 'account': 
        return buildPlatformUrl('/platform/irm/account-record', { accountId: reference.id });
      case 'contact': 
        return buildPlatformUrl('/platform/irm/contact-record', { contactId: reference.id });
      case 'opportunity': 
        return buildPlatformUrl('/platform/irm/opportunity-record', { opportunityId: reference.id });
      case 'investment':
        return buildPlatformUrl('/platform/irm/investment-record', { investmentId: reference.id });
      default: 
        return '';
    }
  };

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
        authorEmployee: note.authorEmployee ? {
          id: note.authorEmployee.id,
          displayName: note.authorEmployee.displayName || note.authorDisplayName || 
                      `${note.authorEmployee.firstName || ''} ${note.authorEmployee.lastName || ''}`.trim(),
          firstName: note.authorEmployee.firstName,
          lastName: note.authorEmployee.lastName
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


  const approvalEntityActionProps = useMemo(() => ({
    contextsArray: [FlowContextName.investmentTaskEntity],
    externalContextData: { opportunityId },
    prefixDataTestId: "opportunity-approval-entity"
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
  const headerMeta = useMemo(() => (
    <div className="gba:flex gba:items-center gba:gap-2">
      {opportunityData?.opportunityStatus?.value && (
        <Badge 
          variant={getOpportunityStatusBadgeVariant(opportunityData.opportunityStatus)}
          className="gba:gap-1"
        >
          {opportunityData.opportunityStatus.value}
        </Badge>
      )}
      {opportunity?.value && (
        <Badge variant="outline" className="gba:gap-1">
          {formatCurrency(
            opportunity.value, 
            opportunity?.currency?.id || 'Currency:v1:EUR'
          )}
        </Badge>
      )}
    </div>
  ), [opportunity?.value, opportunity?.currency?.id, opportunityData?.opportunityStatus?.value]);

  // Helper function to convert deal type codes to human-readable values
  const getDealTypeDisplayValue = (dealType: string | undefined): string => {
    if (!dealType) return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set');
    
    const dealTypeMap: Record<string, string> = {
      'INVESTMENT_DEAL': getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType.investment', 'Investment Deal'),
      'DIVESTMENT_DEAL': getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType.divestment', 'Divestment Deal'),
      'REFINANCING_DEAL': getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType.refinancing', 'Refinancing Deal'),
      'ACQUISITION_DEAL': getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType.acquisition', 'Acquisition Deal'),
      'MERGER_DEAL': getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType.merger', 'Merger Deal'),
    };
    
    return dealTypeMap[dealType] || dealType; // Fallback to original value if not mapped
  };

  const headerDetailGroups = useMemo(() => [
    {
      id: 'opportunity-details',
      items: [
        {
          label: getTranslationFromI18nKeyAndLabel('crm.opportunity.dealType', 'Deal Type'),
          value: getDealTypeDisplayValue(opportunity?.dealType),
          icon: Star
        },
        {
          label: getTranslationFromI18nKeyAndLabel('crm.opportunity.expectedCloseDate', 'Expected Close Date'),
          value: opportunity?.expectedCloseDate ? 
            new Date(opportunity.expectedCloseDate).toLocaleDateString() : 
            getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
        },
        {
          label: getTranslationFromI18nKeyAndLabel('crm.common.currency', 'Currency'),
          value: extractCurrencyCode(opportunity?.currency?.id || 'Currency:v1:EUR')
        },
        {
          label: getTranslationFromI18nKeyAndLabel('crm.opportunity.estimatedAmount', 'Estimated Amount'),
          value: opportunity?.value ? 
            formatCurrency(opportunity.value, opportunity.currency.id) : 
            getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
        },
        {
          label: getTranslationFromI18nKeyAndLabel('crm.common.owner', 'Owner'),
          value: opportunity?.ownerEmployee ? 
            `${opportunity.ownerEmployee.firstName} ${opportunity.ownerEmployee.lastName}` : 
            getTranslationFromI18nKeyAndLabel('crm.common.notAssigned', 'Not assigned'),
          icon: User
        }
      ]
    }
  ], [opportunity?.dealType, opportunity?.expectedCloseDate, opportunity?.currency?.id, opportunity?.value, opportunity?.ownerEmployee]);

  const headerActions = useMemo(() => {
    const actions: AiAction[] = [
      {
        key: 'ai-summary',
        label: getTranslationFromI18nKeyAndLabel('crm.ai.summary', 'AI Summary'),
        icon: <Bot size={16} />,
        hook: aiSummaryHook,
        config: {
          entityType: 'opportunity',
          loadingMessage: getTranslationFromI18nKeyAndLabel('crm.ai.summary.loading', 'Generating AI Summary...'),
          loadingSubtitle: getTranslationFromI18nKeyAndLabel('crm.ai.summary.subtitle', 'Analyzing opportunity data and activities')
        }
      }
    ];
    
    return <AiActions actions={actions} dataTestId={`opportunity-update-button-${opportunityId}`} buttonText={getTranslationFromI18nKeyAndLabel('crm.ai.summary', 'AI Summary')} />;
  }, [aiSummaryHook, opportunityId]);

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
          <span style={{ marginLeft: "var(--nw-spacing-sm)" }}>
            {getTranslationFromI18nKeyAndLabel('crm.opportunity.loadingStages', 'Loading pipeline stages...')}
          </span>
        </div>
      ) : stagesError ? (
        <div style={{ textAlign: "center", padding: "var(--nw-spacing-lg)", color: "var(--nw-color-danger-500)" }}>
          <p>{getTranslationFromI18nKeyAndLabel('crm.opportunity.failedToLoadStages', 'Failed to load pipeline stages')}: {stagesError}</p>
        </div>
      ) : !opportunityData?.opportunityPipelineStage ? (
        <div style={{ 
          textAlign: "center", 
          padding: "var(--nw-spacing-lg)", 
          color: "var(--nw-color-text-secondary)" 
        }}>
          <p>{getTranslationFromI18nKeyAndLabel('crm.opportunity.noStageAssigned', 'No pipeline stage assigned to this opportunity')}</p>
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
          <p style={{ color: 'var(--nw-color-danger-500)' }} data-testid="opportunity-error-text">
            {error || getTranslationFromI18nKeyAndLabel('crm.opportunity.notFound', 'Investment Opportunity not found')}
          </p>
          <Button
            onClick={onBack}
            style={{ marginTop: 'var(--nw-spacing-md)' }}
            variant="default"
            data-testid="opportunity-error-back-button"
          >
            {getTranslationFromI18nKeyAndLabel('crm.opportunity.back', getBackButtonText())}
          </Button>
        </div>
      </div>
    );
  }

  const subViewsConfig = {
    defaultValue: activeTab,
    onValueChange: (val: string) => {
      const next = ALLOWED_TABS.includes(val as TabKey) ? (val as TabKey) : 'overview';
      setActiveTab(next);
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        params.set('tab', next);
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
      }
    },
    items: [
      {
        value: 'overview',
        label: getTranslationFromI18nKeyAndLabel('crm.common.overview', 'Overview'),
        icon: <User size={16} style={{ marginRight: 'var(--nw-spacing-xs)' }} />,
        content: (
          <>
            {/* Account Information - 1/4 width */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-3 gba:lg:col-span-3 gba:row-span-1"
              sections={[
                {
                  id: 'account-section',
                  component: AccountSection,
                  props: {
                    ...props,
                    account: opportunityData?.account ? {
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
                    } : undefined,
                    address: opportunityData?.account ? (() => {
                      const addresses = opportunityData.account.addresses || [];
                      const primaryAddress = addresses.find(addr => addr.addressType === 'PRIMARY_ADDRESS');
                      const address = primaryAddress || addresses[0];
                      
                      return address ? {
                        addressLine: address.addressLine,
                        postalCode: address.postalCode,
                        locality: address.locality,
                        country: typeof address.country === 'string' ? address.country : address.country?.value,
                        region: typeof address.region === 'string' ? address.region : address.region?.value,
                      } : undefined;
                    })() : undefined,
                    accountId: opportunityData?.account?.id,
                    recordUrl: opportunityData?.account?.id
                      ? buildPlatformUrl('/platform/irm/account-record', {
                          accountId: opportunityData.account.id,
                          source: 'opportunity-relations',
                          fromEntity: 'opportunities'
                        })
                      : undefined,
                    actionButtonProps: {
                      contextsArray: [FlowContextName.investmentAccountEntity],
                      externalContextData: { accountId: opportunityData?.account?.id },
                      prefixDataTestId: "investment-opportunity-account-action"
                    }
                  }
                }
              ]}
              data-testid="opportunity-account-section-wrapper"
            />

            {/* Contact Information - 1/4 width */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-3 gba:lg:col-span-3 gba:row-span-1"
              sections={[
                {
                  id: 'contact-section',
                  component: ContactSection,
                  props: {
                    ...props,
                    contacts: opportunityData?.investmentOpportunityContact?.map((ioc: any) => ioc.contact ? {
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
                      communicationChannels: ioc.contact.communicationChannels
                    } : null).filter(Boolean),
                    contactId: opportunityData?.investmentOpportunityContact?.[0]?.contact?.id,
                    recordUrl: opportunityData?.investmentOpportunityContact?.[0]?.contact?.id
                      ? buildPlatformUrl('/platform/irm/contact-record', {
                          contactId: opportunityData.investmentOpportunityContact[0].contact.id,
                          source: 'opportunity-relations',
                          fromEntity: 'opportunities'
                        })
                      : undefined,
                    actionButtonProps: {
                      contextsArray: [FlowContextName.investmentContactEntity],
                      externalContextData: { contactId: opportunityData?.investmentOpportunityContact?.[0]?.contact?.id },
                      prefixDataTestId: "investment-opportunity-contact-action"
                    }
                  }
                }
              ]}
              data-testid="opportunity-contact-section-wrapper"
            />

            {/* Investment Information - 2/4 width (half) */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-1"
              sections={[
                {
                  id: 'investment-section',
                  component: InvestmentSection,
                  props: {
                    businessAppContext: businessAppContext,
                    investmentData: opportunityData,
                    isLoading: loading,
                    error: error
                  }
                }
              ]}
              data-testid="opportunity-investment-section-wrapper"
            />

            {/* Stage Conditions - 1/2 of left side, row span 2 */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4 gba:row-span-2"
              sections={[
                {
                  id: 'condition-section',
                  component: ConditionSection,
                  props: {
                    ...props,
                    opportunity: opportunityData,
                    stageConditionStatuses: stageConditionStatuses || [],
                    stageConditionActionProps: {
                      ...stageConditionActionProps,
                      emptyStateBehavior: 'enable'
                    }
                  }
                }
              ]}
              data-testid="opportunity-condition-section-wrapper"
            />

            {/* Tasks/Approvals Tabbed - 1/2 of left side, row span 2 */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4 gba:row-span-2"
              sections={[
                {
                  id: 'tasks-section',
                  component: TaskSection,
                  props: {
                    ...props,
                    opportunityId: opportunityId,
                    buildReferenceUrl,
                    tasks: tasks.map(task => ({
                      id: task.id,
                      title: task.name,
                      description: task.description,
                      createdAt: task.createdAt,
                      due: task.dueDate,
                      assignee: task.assignedEmployee?.displayName || task.assignedEmployee?.fullName,
                      statusCode: task.taskStatus?.value?.toUpperCase() as any,
                      taskStatus: task.taskStatus,
                      taskPriority: task.taskPriority,
                      assigneeEmployee: task.assignedEmployee,
                      taskTiming: task.taskTiming,
                      startDate: task.startDate,
                      creatorEmployee: task.creatorEmployee,
                      reference: task.lead ? {
                        type: 'lead' as const,
                        id: task.lead.id,
                        name: `${task.lead.firstName || ''} ${task.lead.lastName || ''}`.trim() || task.lead.code || 'Lead'
                      } : task.account ? {
                        type: 'account' as const,
                        id: task.account.id,
                        name: task.account.name || task.account.code || 'Account'
                      } : task.contact ? {
                        type: 'contact' as const,
                        id: task.contact.id,
                        name: `${task.contact.firstName || ''} ${task.contact.lastName || ''}`.trim() || task.contact.code || 'Contact'
                      } : task.opportunity ? {
                        type: 'opportunity' as const,
                        id: task.opportunity.id,
                        name: task.opportunity.name || task.opportunity.code || 'Opportunity'
                      } : task.investment ? {
                        type: 'investment' as const,
                        id: task.investment.id,
                        name: task.investment.name || task.investment.code || 'Investment'
                      } : undefined
                    })),
                    taskActionProps: {
                      ...taskActionProps,
                      emptyStateBehavior: 'enable'
                    },
                    taskEntityActionProps: {
                      contextsArray: [FlowContextName.investmentTaskEntity],
                      externalContextData: { opportunityId },
                      prefixDataTestId: "opportunity-task-entity",
                      emptyStateBehavior: 'enable'
                    }
                  }
                },
                {
                  id: 'approval-tasks-section',
                  component: TaskSection,
                  props: {
                    ...props,
                    sectionTitle: 'Approval Tasks',
                    buildReferenceUrl,
                    tasks: approvals.map(approval => ({
                      id: approval.id,
                      title: approval.name,
                      description: approval.description,
                      createdAt: approval.createdAt,
                      due: approval.dueDate,
                      assignee: approval.assignedEmployee?.displayName || approval.assignedEmployee?.fullName,
                      statusCode: approval.taskStatus?.value?.toUpperCase() as any,
                      taskStatus: approval.taskStatus,
                      taskPriority: approval.taskPriority,
                      assigneeEmployee: approval.assignedEmployee,
                      taskTiming: approval.taskTiming,
                      startDate: approval.startDate,
                      creatorEmployee: approval.creatorEmployee,
                      reference: approval.lead ? {
                        type: 'lead' as const,
                        id: approval.lead.id,
                        name: `${approval.lead.firstName || ''} ${approval.lead.lastName || ''}`.trim() || approval.lead.code || 'Lead'
                      } : approval.account ? {
                        type: 'account' as const,
                        id: approval.account.id,
                        name: approval.account.name || approval.account.code || 'Account'
                      } : approval.contact ? {
                        type: 'contact' as const,
                        id: approval.contact.id,
                        name: `${approval.contact.firstName || ''} ${approval.contact.lastName || ''}`.trim() || approval.contact.code || 'Contact'
                      } : approval.opportunity ? {
                        type: 'opportunity' as const,
                        id: approval.opportunity.id,
                        name: approval.opportunity.name || approval.opportunity.code || 'Opportunity'
                      } : approval.investment ? {
                        type: 'investment' as const,
                        id: approval.investment.id,
                        name: approval.investment.name || approval.investment.code || 'Investment'
                      } : undefined
                    })),
                    taskActionProps: {
                      ...approvalActionProps,
                      emptyStateBehavior: 'enable'
                    },
                    taskEntityActionProps: {
                      contextsArray: [FlowContextName.investmentTaskEntity],
                      externalContextData: { opportunityId },
                      prefixDataTestId: "opportunity-approval-entity",
                      emptyStateBehavior: 'enable'
                    }
                  }
                }
              ]}
              data-testid="opportunity-tasks-approvals-section-wrapper"
            />

            {/* Activities - Right aligned, row span 4, starts same row as conditions/tasks */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4 gba:row-span-4"
              sections={[
                {
                  id: 'activities-section',
                  component: ActivitySection,
                  props: {
                    ...props,
                    activities: activities,
                    activitiesLoading: activitiesLoading,
                    activitiesError: activitiesError,
                    onReloadActivities: loadActivities,
                    alignment: 'right',
                    activitySectionActionProps: {
                      ...activityActionProps,
                      emptyStateBehavior: 'enable'
                    },
                    activityEntityActionProps: {
                      ...activityEntityActionProps,
                      emptyStateBehavior: 'enable'
                    }
                  }
                }
              ]}
              data-testid="opportunity-activities-section-wrapper"
            />

            {/* Notes - Full width of left side (2/2) */}
            <SectionWrapper
              className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-8 gba:lg:col-span-8 gba:row-span-2"
              sections={[
                {
                  id: 'notes-section',
                  component: NoteSection,
                  props: {
                    ...props,
                    notes: notes,
                    noteActionProps: {
                      ...noteActionProps,
                      emptyStateBehavior: 'enable'
                    },
                    noteEntityActionProps: {
                      ...noteEntityActionProps,
                      emptyStateBehavior: 'enable'
                    }
                  }
                }
              ]}
              data-testid="opportunity-notes-section-wrapper"
            />
          </>
        )
      },
      {
        value: 'documents',
        label: getTranslationFromI18nKeyAndLabel('crm.common.documents', 'Documents'),
        icon: <FileText size={16} style={{ marginRight: 'var(--nw-spacing-xs)' }} />,
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
                  icon: <Trash2 size={16} />,
                  apiEndpoint: '/investment-relations/deleteInvestmentDocument',
                  confirmMessage: 'Are you sure you want to delete this document? This action cannot be undone.'
                },
                {
                  key: 'update',
                  label: 'Update',
                  icon: <Edit size={16} />,
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
    if (propOpportunityId) return propOpportunityId;
    if (typeof window === 'undefined') return undefined;
    return new URLSearchParams(window.location.search).get('opportunityId') || undefined;
  }, [propOpportunityId]);
  
  const fromEntity = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return new URLSearchParams(window.location.search).get('fromEntity') || undefined;
  }, []);
  
  const handleBack = async () => {
    // Always navigate to investment relations
    const { buildPlatformUrl } = await import('@/common/utils/navigationUtils');
    navigateTo(buildPlatformUrl('/platform/irm/investment-relations', { view: 'opportunities' }));
  };

  const getBackButtonText = () => {
    // Always return investment relations text
    return 'Back to Investment Relations';
  };

  if (!opportunityId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg" style={{ color: "var(--nw-color-danger-500)" }}>Opportunity ID is required</p>
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
      fromEntity={fromEntity}
      {...props}
    />
  );
};

export { OpportunityRecord, InvestmentOpportunityRecordContent };
export default OpportunityRecord;
