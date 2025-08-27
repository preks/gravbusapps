import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  Button,
} from "@newwork/nw-design-system";
import {
  PiUsers,
  PiTarget,
  PiCurrencyDollar,
  PiChartLine,
} from "react-icons/pi";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { SalesTeamMembersList } from "./SalesTeamMembersList";
import { useSalesTeamDataIntegration } from "./hooks/useSalesTeamDataIntegration";
import { useSalesTeamTrendData } from "./hooks/useSalesTeamTrendData";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { formatCurrency } from "@/business-apps/crm/common/utils/currencyUtils";
import {
  TeamPerformanceData,
  SalesTeamMember,
} from "./types";
import { DataContainer } from "@/components/layout/dataContainer";
import { navigateToTeamMemberRecord } from "@/common/utils/navigationUtils";

// Stub filter hook for sales team members
const useSalesTeamFilters = () => {
  const [filterSearch, setFilterSearch] = React.useState<string>("");
  const [selectedFilters, setSelectedFilters] = React.useState<string[]>([]);
  // For now, no filter groups, but structure is ready for future
  const filterGroups: any[] = [];
  const handleSetFilter = (filters: string[]) => setSelectedFilters(filters);
  return {
    filterSearch,
    setFilterSearch,
    selectedFilters,
    setSelectedFilters,
    filterGroups,
    handleSetFilter,
  };
};

interface TeamViewProps extends BusinessAppContextProps {
  data?: TeamPerformanceData;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const DATA_TEST_ID_PREFIX = "TeamView";

/**
 * Team View component showing sales team performance overview and member list
 * This is the main content for the Team Performance app within PageLayout
 */
const TeamView: React.FC<TeamViewProps> = ({
  data,
  loading: propLoading = false,
  error: propError = null,
  onRetry,
  accessToken,
}) => {
  // Use real data from GraphQL API
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");

  const {
    members,
    total,
    isLoading,
    error: dataError,
    loadPage,
    refetch,
  } = useSalesTeamDataIntegration({ accessToken });

  // Fetch trend data for KPIs
  const { trends, refetch: refetchTrends } = useSalesTeamTrendData(accessToken);

  // Add filter/search state for DataContainer
  const {
    filterSearch,
    setFilterSearch,
    selectedFilters,
    setSelectedFilters,
    filterGroups,
    handleSetFilter,
  } = useSalesTeamFilters();

  // Synchronize search states - use filterSearch as the main search state
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setFilterSearch(value); // Keep both in sync
    setCurrentPage(1);
    loadPage(1, pageSize, value);
  };

  // Update filterSearch when DataContainer search changes
  const handleDataContainerSearchChange = (value: string) => {
    setFilterSearch(value);
    setSearch(value); // Keep both in sync
    setCurrentPage(1);
    loadPage(1, pageSize, value);
  };

  const handlePaginationChange = (page: number, newPageSize?: number) => {
    const newSize = newPageSize || pageSize;
    setCurrentPage(page);
    setPageSize(newSize);
    loadPage(page, newSize, search);
  };

  // Use props data if provided, otherwise use fetched data
  const actualLoading = propLoading || isLoading;
  const actualError = propError || (dataError ? new Error(dataError) : null);
  const actualMembers = data?.teamMembers || members;

  // Generate performance data from real members data
  const [performanceData, setPerformanceData] =
    useState<TeamPerformanceData | null>(null);

  // Debounced search state
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [search]);

  // When debouncedSearch changes, trigger data reload
  useEffect(() => {
    if (accessToken) {
      // Optionally reset to first page if needed
      refetch(); // or loadPage(1, pageSize, debouncedSearch) if you want to reset page
    }
  }, [debouncedSearch, accessToken]);

  const handleFilterChange = (filterId: string, selected: boolean) => {
    if (selected) {
      setSelectedFilters((prev) => [...prev, filterId]);
    } else {
      setSelectedFilters((prev) => prev.filter((id) => id !== filterId));
    }
  };

  // Handle member click from the team list - navigate to standalone app
  const handleMemberClick = (member: SalesTeamMember) => {
    navigateToTeamMemberRecord(member.employeeId || member.id);
  };

  useEffect(() => {
    if (actualMembers && actualMembers.length > 0) {
      // Calculate KPIs from real data
      const sortedByRevenue = [...actualMembers].sort(
        (a, b) => b.totalRevenue - a.totalRevenue
      );
      const sortedByActivity = [...actualMembers].sort(
        (a, b) => b.activityScore - a.activityScore
      );

      setPerformanceData({
        highestRevenue: {
          member: sortedByRevenue[0],
          value: sortedByRevenue[0]?.totalRevenue || 0,
        },
        lowestRevenue: {
          member: sortedByRevenue[sortedByRevenue.length - 1],
          value: sortedByRevenue[sortedByRevenue.length - 1]?.totalRevenue || 0,
        },
        highestActivity: {
          member: sortedByActivity[0],
          value: sortedByActivity[0]?.activityScore || 0,
        },
        lowestActivity: {
          member: sortedByActivity[sortedByActivity.length - 1],
          value:
            sortedByActivity[sortedByActivity.length - 1]?.activityScore || 0,
        },
        teamMembers: actualMembers,
      });
    }
  }, [actualMembers]);

  // Create KPI widgets from trend data
  const createKpiWidgets = (): WidgetItem[] => {
    return [
      {
        key: "total-revenue",
        title: "Total Revenue",
        value: formatCurrency(trends.totalRevenue.currentValue),
        prefix: <PiCurrencyDollar />,
        color: "#10b981",
        description: "Monthly revenue performance",
        valueIsString: true,
        trend: {
          value: `${Math.abs(trends.totalRevenue.trendPercentage).toFixed(1)}%`,
          positive: trends.totalRevenue.trend === "up",
          description: "growth rate",
        },
      },
      {
        key: "win-rate",
        title: "Win Rate",
        value: trends.averageWinRate.currentValue,
        prefix: <PiTarget />,
        color: "#1677ff",
        description: "Average team win rate",
        precision: 1,
        suffix: "%",
        trend: {
          value: `${trends.averageWinRate.currentValue.toFixed(1)}%`,
          positive: trends.averageWinRate.currentValue >= 30,
          description: "win rate",
        },
      },
      {
        key: "total-activities",
        title: "Sales Activities",
        value: trends.totalActivities.currentValue,
        prefix: <PiUsers />,
        color: "#722ed1",
        description: "Team activity execution",
        precision: 0,
        trend: {
          value: `${Math.abs(trends.totalActivities.trendPercentage).toFixed(
            1
          )}%`,
          positive: trends.totalActivities.trend === "up",
          description: "activity rate",
        },
      },
      {
        key: "pipeline-value",
        title: "Pipeline Value",
        value: formatCurrency(trends.pipelineValue.currentValue),
        prefix: <PiChartLine />,
        color: "#ff9500",
        description: "Total pipeline value",
        valueIsString: true,
        trend: {
          value: `${Math.abs(trends.pipelineValue.trendPercentage).toFixed(
            1
          )}%`,
          positive: trends.pipelineValue.trend === "up",
          description: "pipeline growth",
        },
      },
    ];
  };

  // Show loading state
  if ((actualLoading && !performanceData) || trends.isLoading) {
    return (
      <div
        className="gba:space-y-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <WidgetGroup
          widgets={[]}
          isLoading={true}
          skeletonCount={4}
          data-testid={`${DATA_TEST_ID_PREFIX}-loading-widgets`}
        />
      </div>
    );
  }

  // Show error state
  if ((actualError && !performanceData) || trends.error) {
    return (
      <div
        className="gba:space-y-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-error`}
      >
        <Alert variant="destructive">
          <span>Error loading sales team performance data</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onRetry) onRetry();
              refetch();
              refetchTrends();
            }}
            className="gba:ml-2"
          >
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  // Show team overview content
  return (
    <div
      className="gba:space-y-6"
      data-testid={DATA_TEST_ID_PREFIX}
    >
      {/* KPI Statistics */}
      <div
        className="gba:mb-8"
        data-testid={`${DATA_TEST_ID_PREFIX}-kpi-section`}
      >
        <WidgetGroup
          widgets={createKpiWidgets()}
          isLoading={actualLoading || trends.isLoading}
          error={actualError || (trends.error ? new Error(trends.error) : null)}
          onRetry={() => {
            if (onRetry) onRetry();
            refetch();
            refetchTrends();
          }}
          skeletonCount={4}
          emptyText="No performance statistics available."
          data-testid={`${DATA_TEST_ID_PREFIX}-kpi-widgets`}
        />
      </div>

      {/* Sales Team Members Section */}
      <div
        data-testid={`${DATA_TEST_ID_PREFIX}-team-section`}
        className="gba:mb-6"
      >
        {/* DataContainer provides search/filter UI */}
        <DataContainer
          contentBackground="white"
          dataControllerProps={{
            search: filterSearch,
            setSearch: handleDataContainerSearchChange,
            filter: selectedFilters,
            setFilter: handleSetFilter,
            listTitle: (
              <div className="gba:flex gba:items-center gba:gap-2">
                <PiUsers className="gba:text-blue-600" />
                <span className="gba:text-lg gba:font-semibold">
                  Sales Team Members
                </span>
                <span className="gba:text-gray-500">
                  ({actualMembers?.length || 0})
                </span>
              </div>
            ),
            // Add more props as needed (actions, addButton, etc.)
          }}
          dataFilterProps={{
            filterGroups,
            onFilterChange: handleFilterChange,
          }}
          dataBody={
            <SalesTeamMembersList
              members={members}
              loading={isLoading}
              error={dataError ? new Error(dataError) : null}
              onRetry={refetch}
              onMemberClick={handleMemberClick}
              accessToken={accessToken}
              total={total}
              currentPage={currentPage}
              pageSize={pageSize}
              search={search}
              onSearchChange={handleSearchChange}
              onPaginationChange={handlePaginationChange}
            />
          }
        />
      </div>
    </div>
  );
};

export default TeamView;
