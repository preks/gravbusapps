import React, { useState, useEffect } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@newwork/nw-design-system";
import { PageLayout } from "@newwork/nw-design-system";
import {
  Users,
  Building2,
  Briefcase,
  PeopleDuoOutlined,
} from "lucide-react";
import { PiUsersThree, PiBriefcase } from "react-icons/pi";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { EmployeeList } from "./components/views/employee-view/EmployeeList";
import { JobPositionList } from "./components/views/job-position-view/JobPositionList";

export interface HumanResourcesProps extends BusinessAppContextProps {}

export const HumanResources: React.FC<HumanResourcesProps> = (context) => {
  const viewOptions = [
    {
      key: "employees",
      icon: <PiUsersThree />,
      label: "Employees",
    },
    {
      key: "positions",
      icon: <PiBriefcase />,
      label: "Job Positions",
    },
  ];

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewFromUrl = urlParams.get("view");

    // Validate that the view exists in our options
    if (
      viewFromUrl &&
      viewOptions.some((option) => option.key === viewFromUrl)
    ) {
      return viewFromUrl;
    }

    // Default to first view
    return viewOptions[0].key;
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialView());

  // Update URL when view changes
  const updateUrl = (view: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("view", view);
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, "", newUrl);
  };

  const handleTabChange = (key: string) => {
    // Prevent deselection - if key is empty or same as current, ignore the change
    if (!key || key === activeTab) {
      return;
    }
    setActiveTab(key);
    updateUrl(key);
  };

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("view")) {
      updateUrl(activeTab);
    }
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView();
      setActiveTab(newView);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "employees":
        return (
          <div data-testid="employees-tab-content">
            <EmployeeList {...context} />
          </div>
        );
      case "positions":
        return (
          <div data-testid="positions-tab-content">
            <JobPositionList {...context} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div data-testid="human-resources-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: PiUsersThree,
          variant: "premium",
          size: "lg",
          label: "Human Resources",
        }}
        headerTitle="Human Resources"
        headerDescription="Manage employees, job positions, and organizational structure"
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map((option) => ({
            value: option.key,
            label: option.label,
            icon: option.icon,
          })),
        }}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">{renderTabContent()}</div>
      </PageLayout>
    </div>
  );
};

export default HumanResources;
