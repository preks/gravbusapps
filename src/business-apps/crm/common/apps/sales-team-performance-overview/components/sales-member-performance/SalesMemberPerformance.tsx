import React, { useState, useRef, useEffect } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner,
} from "@newwork/nw-design-system";
import { PerformanceHeader } from "./components/header";
import { SalesPerformanceTab, SalesActivitiesTab } from "./components/tabs";
import { useEmployeeHeaderData } from "./hooks/useEmployeeHeaderData";
import {
  SalesMemberPerformanceProps,
  MemberPerformanceData,
  TabItem,
} from "./types";

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
  const scrollPositionRef = useRef<number>(0);
  const tabContentRef = useRef<HTMLDivElement>(null);

  // Preserve scroll position when switching tabs
  const handleTabChange = (value: string) => {
    // Prevent any layout jumping by temporarily fixing the container height
    if (tabContentRef.current) {
      const currentHeight = tabContentRef.current.scrollHeight;
      tabContentRef.current.style.minHeight = `${currentHeight}px`;
    }

    // Save current scroll position
    scrollPositionRef.current = window.scrollY;

    setActiveTab(value as "performance" | "activities");

    // Reset height and restore scroll position after content renders
    setTimeout(() => {
      if (tabContentRef.current) {
        tabContentRef.current.style.minHeight = "1200px"; // Reset to original min-height
      }

      // Maintain scroll position without smooth scrolling to prevent jumping
      window.scrollTo(0, scrollPositionRef.current);
    }, 50);
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

      {/* Main Content with Tabs */}
      <div className="gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-content`}>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="gba:w-full"
          data-testid={`${DATA_TEST_ID_PREFIX}-tabs`}
        >
          {/* Tab Navigation */}
          <TabsList className="gba:grid gba:w-full gba:grid-cols-2 gba:mb-6">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="gba:text-base"
                data-testid={`${DATA_TEST_ID_PREFIX}-tab-${tab.key}`}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content - Stabilized container */}
          <div
            ref={tabContentRef}
            className="gba:min-h-[1200px]"
            data-testid={`${DATA_TEST_ID_PREFIX}-tab-content-container`}
          >
            <TabsContent
              value="performance"
              className="gba:m-0"
              data-testid={`${DATA_TEST_ID_PREFIX}-performance-content`}
            >
              <SalesPerformanceTab
                employeeId={memberId}
                accessToken={accessToken}
                userInfo={userInfo}
                additionalData={additionalData}
                isLoading={false}
              />
            </TabsContent>

            <TabsContent
              value="activities"
              className="gba:m-0"
              data-testid={`${DATA_TEST_ID_PREFIX}-activities-content`}
            >
              <SalesActivitiesTab
                memberId={memberId}
                accessToken={accessToken}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default SalesMemberPerformance;
