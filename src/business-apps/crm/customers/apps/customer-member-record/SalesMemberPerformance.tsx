import React, { useState, useRef, useEffect } from "react";
import { Spinner, Button, Alert } from "@newwork/nw-design-system";
import { PageLayout } from "@/components/layout/pageLayout";
import { PiUser, PiArrowLeft } from "react-icons/pi";
import { PerformanceHeader } from "./components/header";
import { SalesPerformanceTab, SalesActivitiesTab } from "./components/tabs";
import { useEmployeeHeaderData } from "./hooks/useEmployeeHeaderData";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getCurrentQueryParams, navigateToTeamPerformance } from "@/common/utils/navigationUtils";

export interface TabItem {
  key: string;
  label: string;
}

interface SalesMemberPerformanceProps extends BusinessAppContextProps {
  // Override props for standalone app - all data comes from URL params
}

const DATA_TEST_ID_PREFIX = "SalesMemberPerformance";

/**
 * Sales Member Performance Application - Standalone app
 * Gets employeeId from URL query parameters and supports back navigation
 */
export const SalesMemberPerformance: React.FC<SalesMemberPerformanceProps> = ({
  accessToken,
  userInfo,
  additionalData,
}) => {
  // Get URL parameters
  const urlParams = getCurrentQueryParams();
  const employeeId = urlParams.employeeId;
  const initialTab = (urlParams.tab as "performance" | "activities") || "performance";

  const [activeTab, setActiveTab] = useState<"performance" | "activities">(initialTab);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);

  // Update URL when tab changes but keep employeeId
  useEffect(() => {
    if (typeof window !== 'undefined' && employeeId) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url.toString());
    }
  }, [activeTab, employeeId]);

  // Simplified tab change handler
  const handleTabChange = (value: string) => {
    setActiveTab(value as "performance" | "activities");
  };

  // Back button handler
  const handleBack = () => {
    navigateToTeamPerformance();
  };

  // Fetch real employee header data
  const {
    headerData,
    isLoading: headerLoading,
    error: headerError,
    refetch,
  } = useEmployeeHeaderData({ accessToken }, employeeId || '');

  // Tab configuration
  const tabs: TabItem[] = [
    {
      key: "performance",
      label: "Sales Performance",
    },
    {
      key: "activities",
      label: "Sales Activities",
    },
  ];

  // Error state if no employeeId provided
  if (!employeeId) {
    return (
      <PageLayout
        headerIcon={<PiUser />}
        headerLabel="Team Member Record"
        variant="default"
        pageHeaderLeftExtra={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}
          >
            <PiArrowLeft size={16} />
            Back to Team
          </Button>
        }
        contentContainer={
          <div className="gba:p-6">
            <Alert variant="destructive">
              <span>No employee ID provided. Please navigate from the team performance page.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="gba:ml-2"
              >
                Go to Team Performance
              </Button>
            </Alert>
          </div>
        }
        className={DATA_TEST_ID_PREFIX}
        data-testid={`${DATA_TEST_ID_PREFIX}-no-employee-id`}
      />
    );
  }

  // Loading state
  if (headerLoading) {
    return (
      <PageLayout
        headerIcon={<PiUser />}
        headerLabel="Team Member Record"
        variant="default"
        pageHeaderLeftExtra={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}
          >
            <PiArrowLeft size={16} />
            Back to Team
          </Button>
        }
        contentContainer={
          <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
            <Spinner size="lg" />
          </div>
        }
        className={DATA_TEST_ID_PREFIX}
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      />
    );
  }

  // Error state
  if (headerError) {
    return (
      <PageLayout
        headerIcon={<PiUser />}
        headerLabel="Team Member Record"
        variant="default"
        pageHeaderLeftExtra={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}
          >
            <PiArrowLeft size={16} />
            Back to Team
          </Button>
        }
        contentContainer={
          <div className="gba:p-6">
            <Alert variant="destructive">
              <span>Error loading team member data</span>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                className="gba:ml-2"
              >
                Retry
              </Button>
            </Alert>
          </div>
        }
        className={DATA_TEST_ID_PREFIX}
        data-testid={`${DATA_TEST_ID_PREFIX}-error`}
      />
    );
  }

  // Main content
  const pageContent = (
    <div className="gba:space-y-6" data-testid={`${DATA_TEST_ID_PREFIX}-content`}>
      {/* Header Section */}
      <div data-testid={`${DATA_TEST_ID_PREFIX}-header-section`}>
        <PerformanceHeader
          headerData={headerData}
          isLoading={headerLoading}
          error={headerError}
          onBack={handleBack}
          onRetry={refetch}
        />
      </div>

      {/* Main Content with Button Tab Navigation */}
      <div data-testid={`${DATA_TEST_ID_PREFIX}-main-content`}>
        {/* Button Tab Navigation using Design System */}
        <div className="gba:mb-6" data-testid={`${DATA_TEST_ID_PREFIX}-tabs`}>
          <div className="gba:flex gba:flex-row gba:gap-0">
            {tabs.map((tab, index) => (
              <div
                key={tab.key}
                className="gba:relative gba:flex gba:items-center"
                onMouseEnter={() => setHoveredTab(tab.key)}
                onMouseLeave={() => setHoveredTab(null)}
              >
                <Button
                  variant={activeTab === tab.key ? "default" : "ghost"}
                  onClick={() => handleTabChange(tab.key)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-tab-${tab.key}`}
                  className="gba:px-6 gba:py-3 gba:text-sm gba:font-medium gba:border-2 gba:mr-0 gba:transition-all gba:duration-200"
                  style={{
                    borderColor: "var(--nw-color-card)",
                    borderTop: "2px solid var(--nw-color-card)",
                    borderLeft:
                      index === 0
                        ? "2px solid var(--nw-color-card)"
                        : "1px solid var(--nw-color-card)",
                    borderRight:
                      index === tabs.length - 1
                        ? "2px solid var(--nw-color-card)"
                        : "1px solid var(--nw-color-card)",
                    borderBottom:
                      activeTab === tab.key
                        ? "none"
                        : "2px solid var(--nw-color-card)",
                    borderRadius: "0",
                    backgroundColor:
                      activeTab === tab.key
                        ? "var(--nw-color-card)"
                        : "transparent",
                    color:
                      activeTab === tab.key
                        ? "var(--nw-color-foreground)"
                        : "var(--nw-color-muted-foreground)",
                    ...(hoveredTab === tab.key &&
                      activeTab !== tab.key && {
                        backgroundColor: "var(--nw-color-muted)",
                        color: "var(--nw-color-foreground)",
                      }),
                  }}
                >
                  {tab.label}
                </Button>
                {activeTab === tab.key && (
                  <div
                    className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:h-0.5 gba:z-10"
                    style={{
                      backgroundColor: "var(--nw-color-foreground)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div
          ref={tabContentRef}
          className="gba:w-full"
          data-testid={`${DATA_TEST_ID_PREFIX}-tab-content-container`}
        >
          {activeTab === "performance" && (
            <div data-testid={`${DATA_TEST_ID_PREFIX}-performance-content`}>
              <SalesPerformanceTab
                employeeId={employeeId}
                accessToken={accessToken}
                userInfo={userInfo}
                additionalData={additionalData}
                isLoading={false}
              />
            </div>
          )}

          {activeTab === "activities" && (
            <div data-testid={`${DATA_TEST_ID_PREFIX}-activities-content`}>
              <SalesActivitiesTab
                memberId={employeeId}
                accessToken={accessToken}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      headerIcon={<PiUser />}
      headerLabel={headerData?.displayName || "Team Member Record"}
      variant="default"
      pageHeaderLeftExtra={
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gba:flex gba:items-center gba:gap-2"
          data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}
        >
          <PiArrowLeft size={16} />
          Back to Team
        </Button>
      }
      contentContainer={pageContent}
      className={DATA_TEST_ID_PREFIX}
      data-testid={DATA_TEST_ID_PREFIX}
    />
  );
};

export default SalesMemberPerformance;