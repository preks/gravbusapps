import React, { useState, useEffect, useMemo } from "react";
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
import { useOpportunityData } from "./hooks/useOpportunityData";
import { OpportunityHeader } from "./components/OpportunityHeader";
import { OpportunityDetails } from "./components/OpportunityDetails";
import { InvestmentSection } from "../../components/record-sections/investment-section";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { TasksSection } from "./components/TasksSection";
import { OpportunityStageProgression } from "./components/OpportunityStageProgression";
import { OpportunityDocuments } from "./components/OpportunityDocuments";
import AccountSection from "@/common/components/common-relations/record-sections/account-section/AccountSection";
import ContactSection from "@/common/components/common-relations/record-sections/contact-section/ContactSection";

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

  // Listen for process completion events to refresh opportunity data (including stage condition updates)
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log("InvestmentOpportunityRecord: Process completion event received:", event);

        // Check for successful completion
        if (event.detail?.resolution === "success") {
          console.log("InvestmentOpportunityRecord: Refreshing opportunity data after stage condition update...");
          refetchOpportunityData();
          return;
        }

        // Also check for different event structure
        const response = event.detail?.response;
        if (response?.detail?.resolution === "success" || response?.opportunityStageConditionStatus) {
          console.log("InvestmentOpportunityRecord: Refreshing opportunity data from response...");
          refetchOpportunityData();
        }
      } catch (err) {
        console.error("Error handling process completion in InvestmentOpportunityRecord:", err);
      }
    };

    // Listen to multiple possible event names for stage condition updates
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
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });

    return () => {
      eventNames.forEach((eventName) => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
    };
  }, [refetchOpportunityData]);

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

  return (
    <div
      className="gba:opportunity-details-container"
      data-testid="investment-opportunity-detail"
      style={{ backgroundColor: "white", padding: "16px" }}
    >
      <div className="gba:back-navigation" style={{ marginBottom: "16px" }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="investment-opportunity-back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>{getBackButtonText()}</span>
        </button>
      </div>

      <OpportunityHeader opportunity={opportunity} opportunityId={opportunityId} accessToken={props.accessToken} />

      {/* Stage Progression - Show filtered pipeline stages */}
      {!loadingStages &&
        !stagesError &&
        opportunityStages.length > 0 &&
        opportunityData?.opportunityPipelineStage && (
          <OpportunityStageProgression
            currentStage={opportunity?.stage || "Discovery"}
            stages={opportunityStages}
            opportunityId={opportunityId}
            stageConditionStatuses={stageConditionStatuses || []}
            accessToken={props.accessToken}
          />
        )}

      {/* Show stages loading */}
      {loadingStages && (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spinner size="sm" />
          <span style={{ marginLeft: "8px" }}>Loading pipeline stages...</span>
        </div>
      )}

      {/* Show stages error */}
      {stagesError && (
        <div style={{ textAlign: "center", padding: "20px", color: "#ff4d4f" }}>
          <p>Failed to load pipeline stages: {stagesError}</p>
        </div>
      )}

      {/* Show info when no pipeline stage */}
      {!opportunityData?.opportunityPipelineStage && !loadingStages && (
        <div style={{ textAlign: "center", padding: "20px", color: "#8c8c8c" }}>
          <p>No pipeline stage assigned to this opportunity</p>
        </div>
      )}

      <div
        className="gba:opportunity-details-content"
        data-testid="investment-opportunity-details-content"
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gba:w-full"
        >
          <TabsList className="gba:bg-white gba:border gba:mb-6">
            <TabsTrigger value="overview" data-testid="investment-opportunity-overview-tab">
              <UserOutlined className="gba:mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="investment-opportunity-documents-tab">
              <FileOutlined className="gba:mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" data-testid="investment-opportunity-overview-content">
            <div className="gba:flex gba:gap-6 gba:mb-6">
              {/* Left side: Account and Contact info with equal heights */}
              <div className="gba:flex-1 gba:grid gba:grid-cols-2 gba:gap-6 gba:items-stretch">
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
              </div>

              {/* Right side: Stage conditions (completely independent) */}
              <div className="gba:flex-1">
                <OpportunityDetails
                  opportunityData={opportunityData}
                  stageConditionStatuses={stageConditionStatuses || []}
                  context={props}
                />
              </div>
            </div>

            {/* Investment Information */}
            <div className="gba:mb-6">
            <InvestmentSection 
              investmentData={opportunityData} 
              businessAppContext={props}
              isLoading={loading}
              error={error}
            />
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-6">
              <div>
                <ActivityTimeline
                  opportunityId={opportunityId}
                  context={props}
                />
              </div>

              <div>
                <TasksSection opportunityId={opportunityId} context={props} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" data-testid="investment-opportunity-documents-content">
            <OpportunityDocuments opportunityId={opportunityId} context={props} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

interface InvestmentOpportunityRecordProps extends BusinessAppContextProps {
  opportunityId?: string;
}

const InvestmentOpportunityRecord: React.FC<InvestmentOpportunityRecordProps> = ({
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

export default InvestmentOpportunityRecord;
