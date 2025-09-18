import React, { useEffect, useMemo, useState } from "react";
import {
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
} from "@newwork/nw-design-system";
import {
  ArrowLeftOutlined,
  UserOutlined,
  FileOutlined,
} from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo } from "@/common/utils/navigationUtils";
import { useLeadData } from "./hooks/useLeadData";
import { LeadHeader } from "./components/LeadHeader";
import { StatusProgression } from "./components/StatusProgression";
import { InvestmentSection } from "../../components/record-sections/investment-section";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { TasksSection } from "./components/TasksSection";
import { LeadDocuments } from "./components/LeadDocuments";
import AccountSection from "@/common/components/common-relations/record-sections/account-section/AccountSection";
import ContactSection from "@/common/components/common-relations/record-sections/contact-section/ContactSection";


interface LeadRecordContentProps extends BusinessAppContextProps {
  leadId: string;
  onBack: () => void;
  fromEntity?: string;
}

const InvestmentLeadRecordContent: React.FC<LeadRecordContentProps> = ({
  leadId,
  onBack,
  fromEntity,
  ...props
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const {
    lead,
    leadData,
    loading,
    error,
    leadStatuses,
    loadingStatuses,
    refetch,
  } = useLeadData(leadId, props.accessToken);

  const getBackButtonText = () => {
    if (fromEntity === "investment-relations") {
      return "Back to Investment Relations";
    }
    return "Back to Investment Leads";
  };

  // Listen for process completion events to refresh lead data (including status updates)
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log("LeadRecord: Process completion event received:", event);

        // Check for successful completion
        if (event.detail?.resolution === "success") {
          console.log("LeadRecord: Refreshing lead data...");
          refetch();
          return;
        }

        // Also check for different event structure
        const response = event.detail?.response;
        if (response?.detail?.resolution === "success" || response?.lead) {
          console.log("LeadRecord: Refreshing lead data from response...");
          refetch();
        }
      } catch (err) {
        console.error("Error handling process completion in LeadRecord:", err);
      }
    };

    // Listen to multiple possible event names for lead updates
    const eventNames = [
      "com.newwork.process.taskCompletion",
      "com.newwork.process.completion",
      "com.newwork.process.continue",
      "com.newwork.process.processCompletion",
      "processCompletion",
      "taskCompletion",
      "taskCompleted",
      "processCompleted",
      "task-completion",
      "process-completion",
    ];

    eventNames.forEach((eventName) => {
      window.addEventListener(
        eventName,
        handleProcessCompletion as EventListener
      );
    });

    return () => {
      eventNames.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          handleProcessCompletion as EventListener
        );
      });
    };
  }, [leadId, refetch]);

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">
            {error || "Lead not found"}
          </p>
          <Button onClick={onBack} className="gba:mt-4" variant="default">
            {getBackButtonText()}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="gba:lead-details-container"
      data-testid="investment-lead-detail"
      style={{ backgroundColor: "white", padding: "16px" }}
    >
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: "16px" }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="investment-lead-back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>{getBackButtonText()}</span>
        </button>
      </div>

      {/* Lead header */}
      <LeadHeader
        lead={lead}
        leadData={leadData}
        leadId={leadId}
        additionalData={props}
        accessToken={props.accessToken}
        onStatusUpdate={refetch}
      />

      {/* Status Progression */}
      {!loadingStatuses && leadStatuses.length > 0 && lead && (
        <StatusProgression
          currentStatus={lead?.leadStatus?.value || "New"}
          statuses={leadStatuses}
          leadId={leadId}
          leadVersion={typeof lead.version === 'string' ? parseInt(lead.version) : (lead.version || 0)}
          accessToken={props.accessToken}
          onStatusUpdate={refetch}
        />
      )}

      {/* Main content with tabs */}
      <div
        className="gba:lead-details-content"
        data-testid="investment-lead-details-content"
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gba:w-full"
        >
          <TabsList className="gba:bg-white gba:border gba:mb-6">
            <TabsTrigger value="overview" data-testid="investment-lead-overview-tab">
              <UserOutlined className="gba:mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="investment-lead-documents-tab">
              <FileOutlined className="gba:mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" data-testid="investment-lead-overview-content">
            {/* First Row: Company Information + Contacts */}
            <div className="gba:grid gba:grid-cols-4 gba:gap-6 gba:mb-6 gba:items-stretch">
              {/* Company Information - 3/4 width */}
              <div className="gba:col-span-3 gba:flex">
                <AccountSection 
                  account={leadData ? {
                    name: leadData.companyName,
                    email: leadData.companyEmail,
                    phone: leadData.companyPhone,
                    website: leadData.companyWebsite,
                    legalForm: leadData.legalForm?.value || leadData.legalForm?.code,
                    industry: leadData.industryClass?.value || leadData.industryClass?.code,
                    companySize: leadData.companySize?.value || leadData.companySize?.code,
                    // Add other mapping as needed
                  } : undefined}
                  data-testid="lead-account-section"
                  className="gba:h-full"
                  {...props}
                />
              </div>

              {/* Contacts - 1/4 width */}
              <div className="gba:col-span-1 gba:flex">
                <ContactSection 
                  contact={leadData ? {
                    firstName: leadData.firstName,
                    lastName: leadData.lastName,
                    email: leadData.email,
                    phone: leadData.phoneNumber,
                    jobTitle: leadData.position,
                    academicTitle: leadData.academicTitle?.value || leadData.academicTitle?.code,
                    salutation: leadData.salutation?.value || leadData.salutation?.code,
                  } : undefined}
                  data-testid="lead-contact-section"
                  className="gba:h-full"
                  {...props}
                />
              </div>
            </div>

            {/* Second Row: Investment Information */}
            <div className="gba:mb-6">
            <InvestmentSection 
              investmentData={leadData} 
              businessAppContext={props}
              isLoading={loading}
              error={error}
            />
            </div>

            {/* Third Row: Activity Timeline + Tasks */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-6">
              {/* Activity Timeline - 1/2 width */}
              <div>
                <ActivityTimeline leadId={leadId} context={props} />
              </div>

              {/* Tasks - 1/2 width */}
              <div>
                <TasksSection leadId={leadId} context={props} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" data-testid="investment-lead-documents-content">
            <LeadDocuments leadId={leadId} context={props} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

interface LeadRecordProps extends BusinessAppContextProps {
  leadId?: string;
  source?: string;
  fromEntity?: string;
  onBack?: () => void;
}

const LeadRecord: React.FC<LeadRecordProps> = (props) => {
  const leadId =
    props.leadId || new URLSearchParams(window.location.search).get("leadId");


  const fromEntity = useMemo(() => {
    const urlFromEntity = new URLSearchParams(window.location.search).get(
      "fromEntity"
    );
    return props.fromEntity || urlFromEntity;
  }, [props.fromEntity, window.location.search]);

  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else {
      // Always navigate to investment relations
      navigateTo("/platform/irm/investment-relations?view=leads");
    }
  };

  if (!leadId) {
    return (
      <div data-testid="investment-lead-record-no-id">
        <p>No lead ID provided</p>
      </div>
    );
  }
          return (
            <InvestmentLeadRecordContent
              {...props}
              leadId={leadId}
              onBack={handleBack}
              fromEntity={fromEntity || undefined}
            />
          );
};

export { LeadRecord, InvestmentLeadRecordContent };

export default LeadRecord;
