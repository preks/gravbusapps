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
  PiHouse,
  PiUsersThree,
  PiUser,
  PiSpinner,
} from "react-icons/pi";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { SalesTeamMembersList } from "./components/sales-members-list";
import { SalesMemberPerformance } from "./components/sales-member-performance";
// Re-enable TeamPerformanceView
import { TeamPerformanceView } from "./components/team-performance-view/TeamPerformanceView";
import { CEOTeamComparisonDashboard } from "./components/ceo-team-comparison/CEOTeamComparisonDashboard";
import { SimpleBypass } from "./components/debug/SimpleBypass";
import { useSalesTeamDataIntegration } from "./components/sales-members-list/hooks/useSalesTeamDataIntegration";
import { useSalesTeamTrendData } from "./components/sales-members-list/hooks/useSalesTeamTrendData";
import { useUserRole } from "./hooks/useUserRole";
import { useTeamsData } from "./hooks/useTeamsData";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { formatCurrency } from "../../utils/currencyUtils";
import { UserRole, TeamInfo } from "./types/userRoles";
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

type NavigationView = 'company' | 'team' | 'individual';

interface NavigationState {
  view: NavigationView;
  selectedTeamId?: string;
  selectedTeamName?: string;
  selectedMemberId?: string;
  selectedMemberName?: string;
}

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
  userInfo,
}) => {
  // Role detection
  const { 
    role, 
    canViewAllTeams, 
    canViewTeam, 
    managedTeamId, 
    managedTeamName,
    isLoading: roleLoading,
    error: roleError,
    permissions 
  } = useUserRole({ accessToken, userInfo });

  // Check for debug mode in URL
  const urlParams = new URLSearchParams(window.location.search);
  const debugMode = urlParams.get('debug') === 'true';
  const forceView = urlParams.get('view') as 'company' | 'team' | 'individual' | null;

  // Debug mode state
  const [useDebugBypass, setUseDebugBypass] = useState(debugMode);

  // Navigation state - enhanced for three-tier structure
  const [navigationState, setNavigationState] = useState<NavigationState>({
    view: 'company', // Default view
  });

  // Legacy state for backward compatibility
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

  // Fetch trend data for KPIs
  const { trends, refetch: refetchTrends } = useSalesTeamTrendData(accessToken);

  // Fetch real teams data from API
  const { 
    teams: availableTeams, 
    isLoading: teamsLoading, 
    error: teamsError, 
    refetch: refetchTeams 
  } = useTeamsData({ accessToken });

  // Set initial view based on user role
  useEffect(() => {
    console.log('Navigation setup effect:', { roleLoading, role, managedTeamId, managedTeamName });
    
    if (!roleLoading && role) {
      if (role === 'ceo') {
        console.log('Setting CEO company view');
        setNavigationState({ view: 'company' });
      } else if (role === 'manager' && managedTeamId && managedTeamName) {
        console.log('Setting manager team view');
        setNavigationState({ 
          view: 'team',
          selectedTeamId: managedTeamId,
          selectedTeamName: managedTeamName
        });
      } else {
        console.log('Setting individual view');
        setNavigationState({ view: 'individual' });
      }
    }
  }, [roleLoading, role, managedTeamId, managedTeamName]);

  // Add timeout fallback to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (roleLoading) {
        console.warn('Role loading timeout - enabling debug bypass automatically');
        setUseDebugBypass(true); // Enable bypass after timeout
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeoutId);
  }, [roleLoading]);

  // Handle URL force view parameter
  useEffect(() => {
    if (forceView && !roleLoading) {
      console.log('URL force view detected:', forceView);
      handleDebugViewSelection(forceView);
    }
  }, [forceView, roleLoading]);

  // Handle debug bypass view selection
  const handleDebugViewSelection = (view: 'company' | 'team' | 'individual') => {
    console.log('Debug bypass view selected:', view);
    setUseDebugBypass(false);
    
    if (view === 'team') {
      setNavigationState({ 
        view: 'team',
        selectedTeamId: 'team-1',
        selectedTeamName: 'Enterprise Sales'
      });
    } else {
      setNavigationState({ view });
    }
  };

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

  // Navigation Handlers
  const handleTeamSelect = (teamId: string) => {
    const team = availableTeams.find(t => t.id === teamId);
    if (team) {
      setNavigationState({
        view: 'team',
        selectedTeamId: teamId,
        selectedTeamName: team.name,
      });
      updateUrlWithParams({ teamId, employeeId: null });
    }
  };

  const handleMemberSelect = (member: SalesTeamMember) => {
    setNavigationState({
      ...navigationState,
      view: 'individual',
      selectedMemberId: member.employeeId || member.id,
      selectedMemberName: member.name,
    });
    updateUrlWithParams({ 
      teamId: navigationState.selectedTeamId,
      employeeId: member.employeeId || member.id
    });
  };

  const handleBackToCompany = () => {
    setNavigationState({ view: 'company' });
    updateUrlWithParams({ teamId: null, employeeId: null });
  };

  const handleBackToTeam = () => {
    setNavigationState({
      view: 'team',
      selectedTeamId: navigationState.selectedTeamId,
      selectedTeamName: navigationState.selectedTeamName,
    });
    updateUrlWithParams({ 
      teamId: navigationState.selectedTeamId,
      employeeId: null
    });
  };

  // Enhanced URL management
  const updateUrlWithParams = (params: { teamId?: string | null, employeeId?: string | null }) => {
    const url = new URL(window.location.href);
    
    if (params.teamId) {
      url.searchParams.set("teamId", params.teamId);
    } else if (params.teamId === null) {
      url.searchParams.delete("teamId");
    }
    
    if (params.employeeId) {
      url.searchParams.set("employeeId", params.employeeId);
    } else if (params.employeeId === null) {
      url.searchParams.delete("employeeId");
    }
    
    window.history.pushState({}, "", url.toString());
  };

  // Legacy handlers for backward compatibility
  const handleMemberClick = (member: SalesTeamMember) => {
    handleMemberSelect(member);
  };

  const handleBackToTeamList = () => {
    if (navigationState.selectedTeamId) {
      handleBackToTeam();
    } else {
      handleBackToCompany();
    }
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

  // Simple Breadcrumb Navigation
  const renderBreadcrumbs = () => (
    <div 
      className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600 gba:mb-4"
      data-testid={`${DATA_TEST_ID_PREFIX}-breadcrumbs`}
    >
      <button
        onClick={() => canViewAllTeams && handleBackToCompany()}
        className={`gba:flex gba:items-center gba:gap-1 gba:hover:text-blue-600 ${canViewAllTeams ? "gba:cursor-pointer" : "gba:cursor-default"}`}
        disabled={!canViewAllTeams}
      >
        <PiHouse className="gba:w-4 gba:h-4" />
        Sales Performance
      </button>
      
      {navigationState.view !== 'company' && navigationState.selectedTeamName && (
        <>
          <span className="gba:text-gray-400">/</span>
          <button
            onClick={() => navigationState.view === 'individual' && handleBackToTeam()}
            className={`gba:flex gba:items-center gba:gap-1 gba:hover:text-blue-600 ${navigationState.view === 'individual' ? "gba:cursor-pointer" : "gba:cursor-default"}`}
            disabled={navigationState.view !== 'individual'}
          >
            <PiUsersThree className="gba:w-4 gba:h-4" />
            {navigationState.selectedTeamName}
          </button>
        </>
      )}
      
      {navigationState.view === 'individual' && navigationState.selectedMemberName && (
        <>
          <span className="gba:text-gray-400">/</span>
          <span className="gba:flex gba:items-center gba:gap-1 gba:text-gray-900">
            <PiUser className="gba:w-4 gba:h-4" />
            {navigationState.selectedMemberName}
          </span>
        </>
      )}
    </div>
  );

  // Show debug bypass if enabled
  if (useDebugBypass) {
    console.log('Showing debug bypass screen');
    return <SimpleBypass onSelectView={handleDebugViewSelection} />;
  }

  // Show loading state for role detection with debugging
  console.log('Current state:', { roleLoading, role, error: roleError, navigationState, useDebugBypass });
  
  if (roleLoading) {
    console.log('Showing role loading screen');
    return (
      <div
        className="gba:bg-white gba:min-h-screen gba:p-6 gba:flex gba:items-center gba:justify-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-role-loading`}
      >
        <div className="gba:text-center">
          <PiSpinner className="gba:w-8 gba:h-8 gba:animate-spin gba:mx-auto gba:mb-2" />
          <p className="gba:text-gray-600">Loading user permissions...</p>
          <p className="gba:text-xs gba:text-gray-400 gba:mt-2">
            This should only take a moment...
          </p>
          <Button 
            onClick={() => setUseDebugBypass(true)}
            variant="outline"
            size="sm"
            className="gba:mt-4"
          >
            Use Debug Mode
          </Button>
        </div>
      </div>
    );
  }

  // Show role error
  if (roleError) {
    return (
      <div
        className="gba:bg-white gba:min-h-screen gba:p-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-role-error`}
      >
        <Alert variant="destructive">
          <span>Error loading user permissions: {typeof roleError === 'string' ? roleError : roleError?.message || 'Unknown error'}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="gba:ml-2"
          >
            Refresh
          </Button>
        </Alert>
      </div>
    );
  }

  // Show loading state - with timeout protection
  const isDataLoading = (actualLoading && !performanceData) || trends.isLoading || teamsLoading;
  
  if (isDataLoading && !roleLoading) {
    // Don't show data loading if we're still loading roles
    return (
      <div
        className="gba:bg-white gba:min-h-screen gba:p-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        {renderBreadcrumbs()}
        <div className="gba:mt-6">
          <div className="gba:text-center gba:py-8">
            <PiSpinner className="gba:w-8 gba:h-8 gba:animate-spin gba:mx-auto gba:mb-4" />
            <p className="gba:text-gray-600">Loading sales performance data...</p>
            {teamsLoading && (
              <p className="gba:text-sm gba:text-gray-500 gba:mt-2">Loading teams...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if ((actualError && !performanceData) || trends.error || teamsError) {
    return (
      <div
        className="gba:bg-white gba:min-h-screen gba:p-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-error`}
      >
        <Alert variant="destructive">
          <div className="gba:space-y-2">
            <div>Error loading sales performance data:</div>
            {actualError && <div className="gba:text-sm">• Data: {typeof actualError === 'string' ? actualError : actualError.message || 'Unknown error'}</div>}
            {trends.error && <div className="gba:text-sm">• Trends: {typeof trends.error === 'string' ? trends.error : trends.error.message || 'Unknown error'}</div>}
            {teamsError && <div className="gba:text-sm">• Teams: {typeof teamsError === 'string' ? teamsError : teamsError.message || 'Unknown error'}</div>}
          </div>
          <div className="gba:flex gba:gap-2 gba:mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onRetry) onRetry();
                refetch();
                refetchTrends();
                refetchTeams();
              }}
            >
              Retry All
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Render based on navigation state and user role
  const renderContent = () => {
    const baseProps = {
      accessToken,
      userInfo,
    };

    // Render content based on navigation state and user role
    switch (navigationState.view) {
      case 'company':
        // CEO view - company overview with team comparison
        if (role === 'ceo') {
          return (
            <CEOTeamComparisonDashboard
              {...baseProps}
              availableTeams={availableTeams}
              onTeamSelect={handleTeamSelect}
            />
          );
        }
        // Fallback to team list for non-CEOs
        return renderTeamOverview();

      case 'team':
        // Team manager view - team performance with member list
        if (navigationState.selectedTeamId && navigationState.selectedTeamName) {
          return (
            <TeamPerformanceView
              {...baseProps}
              teamId={navigationState.selectedTeamId}
              teamName={navigationState.selectedTeamName}
              onBack={canViewAllTeams ? handleBackToCompany : undefined}
              onMemberSelect={handleMemberSelect}
            />
          );
        }
        return renderTeamOverview();

      case 'individual':
        // Individual view - personal performance
        if (navigationState.selectedMemberId) {
          return (
            <SalesMemberPerformance
              memberId={navigationState.selectedMemberId}
              accessToken={accessToken}
              userInfo={userInfo}
              onBack={handleBackToTeamList}
              initialTab="performance"
            />
          );
        }
        return renderTeamOverview();

      default:
        return renderTeamOverview();
    }
  };

  // Legacy team overview for fallback
  const renderTeamOverview = () => (
    <div className="gba:space-y-6">
      {/* Header Section */}
      <div
        className="gba:bg-gradient-to-r gba:from-white-50 gba:rounded-lg gba:p-6"
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
          isLoading={actualLoading || trends.isLoading || teamsLoading}
          error={
            actualError ? (typeof actualError === 'string' ? actualError : actualError.message) :
            trends.error ? (typeof trends.error === 'string' ? trends.error : trends.error.message) :
            teamsError ? (typeof teamsError === 'string' ? teamsError : teamsError.message) :
            null
          }
          onRetry={() => {
            if (onRetry) onRetry();
            refetch();
            refetchTrends();
            refetchTeams();
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
          }}
          dataFilterProps={{
            filterGroups,
            onFilterChange: handleFilterChange,
          }}
          dataBody={
            <SalesTeamMembersList
              members={members}
              loading={isLoading}
              error={dataError ? (typeof dataError === 'string' ? dataError : dataError.message || 'Unknown error') : null}
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

  return (
    <div
      className="gba:bg-white gba:min-h-screen gba:p-6 gba:space-y-6"
      style={{ backgroundColor: "white" }}
      data-testid={DATA_TEST_ID_PREFIX}
    >
      {/* Breadcrumb Navigation */}
      {renderBreadcrumbs()}

      {/* Main Content */}
      {renderContent()}
    </div>
  );
};

export default SalesTeamPerformanceOverview;
