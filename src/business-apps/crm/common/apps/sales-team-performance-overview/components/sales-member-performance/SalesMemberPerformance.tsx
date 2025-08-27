import React, { useState, useRef } from "react";
import { Spinner, Button } from "@newwork/nw-design-system";
import { PerformanceHeader } from "./components/header";
import { SalesPerformanceTab, SalesActivitiesTab } from "./components/tabs";
import { useEmployeeHeaderData } from "./hooks/useEmployeeHeaderData";
import { SalesMemberPerformanceProps, TabItem } from "./types";

const DATA_TEST_ID_PREFIX = "SalesMemberPerformance";

export const SalesMemberPerformance: React.FC<SalesMemberPerformanceProps> = ({
  memberId,
  onBack,
  initialTab = "performance",
  accessToken,
  userInfo,
  additionalData,
}) => {
  const [activeTab, setActiveTab] = useState<"performance" | "activities">(
    initialTab
  );
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);

  // Simplified tab change handler
  const handleTabChange = (value: string) => {
    setActiveTab(value as "performance" | "activities");
  };

  // Fetch real employee header data
  const {
    headerData,
    isLoading: headerLoading,
    error: headerError,
    refetch,
  } = useEmployeeHeaderData({ accessToken }, memberId);

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

  // Overall loading state (only for header since other data is still mocked)
  if (headerLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-screen"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      className="gba:w-full gba:min-h-screen gba:bg-gray-50"
      data-testid={`${DATA_TEST_ID_PREFIX}-container`}
    >
      {/* Header Section */}
      <div className="gba:p-6 gba:bg-white gba:border-b">
        <PerformanceHeader
          headerData={headerData}
          isLoading={headerLoading}
          error={headerError}
          onBack={onBack}
          onRetry={refetch}
        />
      </div>

      {/* Main Content with Button Tab Navigation */}
      <div className="gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-content`}>
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
                employeeId={memberId}
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
                memberId={memberId}
                accessToken={accessToken}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesMemberPerformance;
