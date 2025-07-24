import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  Button,
} from "@newwork/nw-design-system";
import {
  PiTrendUp,
  PiTrendDown,
  PiUsers,
  PiTarget,
  PiCurrencyDollar,
  PiChartLine,
} from "react-icons/pi";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { SalesTeamMembersList } from "./components/sales-members-list";
import { SalesMemberPerformance } from "./components/sales-member-performance";
import { useSalesTeamDataIntegration } from "./components/sales-members-list/hooks/useSalesTeamDataIntegration";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { formatCurrency } from "../../utils/currencyUtils";
import {
  SalesTeamPerformanceData,
  SalesTeamMember,
} from "./components/sales-members-list/types";
import { DataContainer } from "@/components/layout/dataContainer";

// Stub filter hook for sales team members
const useSalesTeamFilters = (context: BusinessAppContextProps) => {
  const [filterSearch, setFilterSearch] = React.useState<string>("");
  const [selectedFilters, setSelectedFilters] = React.useState<string[]>([]);
  // For now, no filter groups, but structure is ready for future
  const filterGroups: any[] = [];
  const filterLabelMap: Record<string, string> = {};
  const handleSetFilter = (filters: string[]) => setSelectedFilters(filters);
  return {
    filterSearch,
    setFilterSearch,
    selectedFilters,
    setSelectedFilters,
    filterGroups,
    filterLabelMap,
    handleSetFilter,
  };
};

interface SalesTeamPerformanceOverviewProps extends BusinessAppContextProps {
  data?: SalesTeamPerformanceData;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const DATA_TEST_ID_PREFIX = "SalesTeamPerformanceOverview";

/**
 * Sales Team Performance Overview component with navigation to individual member performance
 */
export const SalesTeamPerformanceOverview: React.FC<
  SalesTeamPerformanceOverviewProps
> = ({
  data,
  loading: propLoading = false,
  error: propError = null,
  onRetry,
  accessToken,
}) => {
  // Navigation state for individual member performance
  const [selectedMember, setSelectedMember] = useState<SalesTeamMember | null>(
    null
  );

  // Get employee ID from URL parameters
  const getEmployeeIdFromUrl = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("employeeId");
  };

  // Update URL with employee ID
  const updateUrlWithEmployeeId = (employeeId: string | null) => {
    const url = new URL(window.location.href);
    if (employeeId) {
      url.searchParams.set("employeeId", employeeId);
    } else {
      url.searchParams.delete("employeeId");
    }
    window.history.pushState({}, "", url.toString());
  };

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

  // Add filter/search state for DataContainer
  const {
    filterSearch,
    setFilterSearch,
    selectedFilters,
    setSelectedFilters,
    filterGroups,
    filterLabelMap,
    handleSetFilter,
  } = useSalesTeamFilters({ accessToken });

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
    useState<SalesTeamPerformanceData | null>(null);

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

  // Handle member click from the team list
  const handleMemberClick = (member: SalesTeamMember) => {
    setSelectedMember(member);
    // Update URL with employee ID
    updateUrlWithEmployeeId(member.employeeId || member.id);
  };

  // Handle back navigation from individual performance
  const handleBackToTeamList = () => {
    setSelectedMember(null);
    // Clear employee ID from URL
    updateUrlWithEmployeeId(null);
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

      // Check if there's an employee ID in the URL and set selected member
      const employeeIdFromUrl = getEmployeeIdFromUrl();
      if (employeeIdFromUrl && !selectedMember) {
        const memberFromUrl = actualMembers.find(
          (member) =>
            member.employeeId === employeeIdFromUrl ||
            member.id === employeeIdFromUrl
        );
        if (memberFromUrl) {
          setSelectedMember(memberFromUrl);
        } else {
          // If employee ID in URL doesn't match any member, clear it
          updateUrlWithEmployeeId(null);
        }
      }
    }
  }, [actualMembers, selectedMember]);

  // Create KPI widgets from performance data
  const createKpiWidgets = (): WidgetItem[] => {
    if (!performanceData) return [];

    return [
      {
        key: "highest-revenue",
        title: "Highest Revenue",
        value: formatCurrency(performanceData.highestRevenue.value),
        prefix: <PiTrendUp />,
        color: "#10b981",
        description: `${
          performanceData.highestRevenue.member?.name || "Unknown"
        } - Leading performer`,
        valueIsString: true,
      },
      {
        key: "lowest-revenue",
        title: "Lowest Revenue",
        value: formatCurrency(performanceData.lowestRevenue.value),
        prefix: <PiTrendDown />,
        color: "#ef4444",
        description: `${
          performanceData.lowestRevenue.member?.name || "Unknown"
        } - Needs attention`,
        valueIsString: true,
      },
      {
        key: "highest-activity",
        title: "Highest Activity Score",
        value: performanceData.highestActivity.value,
        prefix: <PiTarget />,
        color: "#3b82f6",
        description: `${
          performanceData.highestActivity.member?.name || "Unknown"
        } - Most active`,
        precision: 1,
      },
      {
        key: "lowest-activity",
        title: "Lowest Activity Score",
        value: performanceData.lowestActivity.value,
        prefix: <PiChartLine />,
        color: "#f59e0b",
        description: `${
          performanceData.lowestActivity.member?.name || "Unknown"
        } - Boost engagement`,
        precision: 1,
      },
    ];
  };

  // Show loading state
  if (actualLoading && !performanceData) {
    return (
      <div
        className="gba:bg-white gba:min-h-screen gba:p-6"
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
  if (actualError && !performanceData) {
    return (
      <div
        className="gba:bg-white gba:min-h-screen gba:p-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-error`}
      >
        <Alert variant="destructive">
          <span>Error loading sales team performance data</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry || refetch}
            className="gba:ml-2"
          >
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  // Show individual performance if a member is selected
  if (selectedMember) {
    return (
      <SalesMemberPerformance
        memberId={selectedMember.employeeId || selectedMember.id}
        accessToken={accessToken}
        onBack={handleBackToTeamList}
        initialTab="performance"
      />
    );
  }

  // Show team overview by default
  return (
    <div
      className="gba:bg-white gba:min-h-screen gba:p-6 gba:space-y-6"
      style={{ backgroundColor: "white" }}
      data-testid={DATA_TEST_ID_PREFIX}
    >
      {/* Header Section */}
      <div
        className="gba:bg-gradient-to-r gba:from-white-50  gba:rounded-lg gba:p-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-header`}
      >
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:mb-2">
              Sales Team Performance Overview
            </h1>
            <p className="gba:text-gray-600">
              Monitor your sales team's performance with real-time KPIs and
              individual member insights
            </p>
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2 gba:text-sm gba:text-gray-500">
            <PiUsers className="gba:w-4 gba:h-4" />
            <span>
              {performanceData?.teamMembers?.length || 0} Team Members
            </span>
          </div>
        </div>
      </div>

      {/* KPI Statistics */}
      <div
        className="gba:mb-8"
        data-testid={`${DATA_TEST_ID_PREFIX}-kpi-section`}
      >
        <WidgetGroup
          widgets={createKpiWidgets()}
          isLoading={actualLoading}
          error={actualError}
          onRetry={onRetry || refetch}
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

export default SalesTeamPerformanceOverview;
