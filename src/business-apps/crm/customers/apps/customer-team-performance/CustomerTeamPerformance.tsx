import React, { useState, useEffect } from "react";
import { PageLayout } from "@newwork/nw-design-system";
import { PiUsers } from "react-icons/pi";
import TeamView from "./views/team-view";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getCurrentQueryParams } from "@/common/utils/navigationUtils";

interface TeamPerformanceProps extends BusinessAppContextProps {
  // Optional props for future use
  data?: any;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const DATA_TEST_ID_PREFIX = "TeamPerformance";

/**
 * Sales Team Performance Application using PageLayout with SubViews
 * This app shows team performance overview with Team as a subView
 */
export const TeamPerformance: React.FC<TeamPerformanceProps> = (props) => {
  const { accessToken } = props;
  
  // SubView configuration - currently only Team view, ready for expansion
  const subViewOptions = [
    { value: "team", label: "Team", icon: <PiUsers size={16} /> },
  ];
  
  // Get initial subView from URL parameters with validation
  const urlParams = getCurrentQueryParams();
  const validSubViews = subViewOptions.map(option => option.value);
  const urlSubView = urlParams.subView;
  const initialSubView = (urlSubView && validSubViews.includes(urlSubView)) ? urlSubView : "team";
  const [activeSubView, setActiveSubView] = useState(initialSubView);

  // Update URL when subView changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (activeSubView !== "team") {
        url.searchParams.set('subView', activeSubView);
      } else {
        url.searchParams.delete('subView'); // Remove default subView from URL
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [activeSubView]);

  // Handle subView changes with validation
  const handleSubViewChange = (newSubView: string) => {
    const validSubViews = subViewOptions.map(option => option.value);
    if (validSubViews.includes(newSubView)) {
      setActiveSubView(newSubView);
    }
  };

  const renderSubViewContent = () => {
    switch (activeSubView) {
      case "team":
        return (
          <TeamView
            {...props}
            accessToken={accessToken}
          />
        );
      default:
        return null;
    }
  };

  return (
    <PageLayout
      headerTitle="Team Performance"
      headerDescription="Monitor your team's activities with drilldown"
      headerIcon={<PiUsers size={20} />}
      headerSubViews={{
        items: subViewOptions,
        value: activeSubView,
        onValueChange: handleSubViewChange
      }}
      className="gba:min-h-screen"
      data-testid={DATA_TEST_ID_PREFIX}
    >
      <div className="gba:h-full gba:overflow-auto">
        {renderSubViewContent()}
      </div>
    </PageLayout>
  );
};

export default TeamPerformance;