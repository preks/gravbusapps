import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
  Card,
  CardContent,
  Alert,
  Button,
  Badge,
  CardHeader,
  CardTitle,
} from "@newwork/nw-design-system";
import {
  PiUser,
  PiTarget,
  PiArrowUp,
  PiArrowDown,
  PiMagnifyingGlass,
} from "react-icons/pi";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { formatCurrency } from "@/business-apps/crm/common/utils/currencyUtils";
import { SalesTeamMember } from "./types";
import { useSalesTeamDataIntegration } from "./hooks/useSalesTeamDataIntegration";
import { DebouncedInput } from "@/components/data-filter/DebouncedInput";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";

const DATA_TEST_ID_PREFIX = "SalesTeamMembersList";

export interface SalesMembersListProps {
  members?: SalesTeamMember[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onMemberClick?: (member: SalesTeamMember) => void;
  selectedMemberId?: string;
  accessToken: string;
  search?: string;
  total?: number;
  currentPage?: number;
  pageSize?: number;
  onSearchChange?: (value: string) => void;
  onPaginationChange?: (page: number, newPageSize?: number) => void;
}

/**
 * Table component for displaying sales team members with their performance metrics
 */
export const SalesTeamMembersList: React.FC<SalesMembersListProps> = (
  props
) => {
  const {
    members: propsMembers,
    loading: propsLoading = false,
    error: propsError = null,
    onRetry: propsOnRetry,
    onMemberClick,
    selectedMemberId,
    accessToken,
    search = "",
    total = 0,
    currentPage = 1,
    pageSize = 20,
    onSearchChange,
    onPaginationChange,
    ...contextProps
  } = props;

  // Remove local state for search, currentPage, pageSize
  // const [search, setSearch] = useState("");
  // const [currentPage, setCurrentPage] = useState(1);
  // const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState("totalRevenue");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use props data only, do not fetch here
  const rawMembers = propsMembers || [];
  const loading = propsLoading;
  const error = propsError;
  const onRetry = propsOnRetry;

  // Sort members based on current sort criteria
  const members = useMemo(() => {
    if (!rawMembers || rawMembers.length === 0) return [];

    // Client-side search filter (case-insensitive, on name/position/manager)
    let filtered = rawMembers;
    if (search && search.trim() !== "") {
      const searchTerm = search.trim().toLowerCase();
      filtered = rawMembers.filter((member) => {
        // Search in member name
        const nameMatch = member.name?.toLowerCase().includes(searchTerm);

        // Search in position
        const positionMatch = member.position
          ?.toLowerCase()
          .includes(searchTerm);

        // Search in manager name (if manager exists)
        const managerMatch = member.manager?.name
          ?.toLowerCase()
          .includes(searchTerm);

        return nameMatch || positionMatch || managerMatch;
      });
    }

    // Sort the filtered members
    if (!sortField) return filtered;

    const sorted = [...filtered].sort((a, b) => {
      let valueA: any = "";
      let valueB: any = "";

      switch (sortField) {
        case "name":
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case "position":
          valueA = a.position.toLowerCase();
          valueB = b.position.toLowerCase();
          break;
        case "manager":
          valueA = (a.manager?.name || "").toLowerCase();
          valueB = (b.manager?.name || "").toLowerCase();
          break;
        case "totalRevenue":
          valueA = a.totalRevenue;
          valueB = b.totalRevenue;
          break;
        case "activityScore":
          valueA = a.activityScore;
          valueB = b.activityScore;
          break;
        default:
          return 0;
      }

      if (sortOrder === "ASC") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });

    return sorted;
  }, [rawMembers, sortField, sortOrder, search]);

  // Effect: Load data only when page, pageSize, or search changes (and only if shouldFetchData)
  // useEffect(() => {
  //   console.log(
  //     "Parent effect: shouldFetchData",
  //     shouldFetchData,
  //     "accessToken",
  //     accessTokenigot
  //   );
  //   if (shouldFetchData && accessToken) {
  //     loadPage(currentPage, pageSize, search);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [shouldFetchData, accessToken, currentPage, pageSize, search, loadPage]);

  // Handlers use props
  const handleSearchChange = (value: string) => {
    if (onSearchChange) onSearchChange(value);
  };

  const handlePaginationChange = (page: number, newPageSize?: number) => {
    if (onPaginationChange) onPaginationChange(page, newPageSize);
  };

  // Handle sorting change
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: ASC -> DESC -> clear
      if (sortOrder === "ASC") {
        setSortOrder("DESC");
      } else if (sortOrder === "DESC") {
        setSortField("");
        setSortOrder("DESC");
      } else {
        setSortOrder("ASC");
      }
    } else {
      setSortField(field);
      setSortOrder("ASC");
    }
  };

  // Helper function to render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    if (sortOrder === "ASC")
      return <PiArrowUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === "DESC")
      return <PiArrowDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  };

  // Handle row click to view member details
  const handleRowClick = useCallback(
    (member: SalesTeamMember) => {
      onMemberClick?.(member);
    },
    [onMemberClick]
  );

  // Handle employee avatar click to navigate to employee profile
  const handleEmployeeAvatarClick = useCallback(
    (e: React.MouseEvent, employeeId: string) => {
      e.stopPropagation(); // Prevent row click
      const url = buildPlatformUrl("/platform/employee-record", { employeeId });
      navigateTo(url);
    },
    []
  );

  // Handle manager avatar click to navigate to manager profile
  const handleManagerAvatarClick = useCallback(
    (e: React.MouseEvent, managerId: string) => {
      e.stopPropagation(); // Prevent row click
      const url = buildPlatformUrl("/platform/employee-record", {
        employeeId: managerId,
      });
      navigateTo(url);
    },
    []
  );

  // Get member initials for avatar
  const getMemberInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Get activity score badge variant based on performance
  const getActivityScoreBadgeVariant = (
    score: number
  ): "success" | "warning" | "secondary" | "destructive" => {
    if (score >= 85) return "success";
    if (score >= 70) return "warning";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  // Get activity score color based on performance
  const getActivityScoreColor = (score: number): string => {
    if (score >= 90) return "gba:text-green-600";
    if (score >= 75) return "gba:text-blue-600";
    if (score >= 60) return "gba:text-yellow-600";
    return "gba:text-red-600";
  };

  // Get progress bar color based on activity score
  const getProgressColor = (score: number): string => {
    if (score >= 90) return "bg-green-500";
    if (score >= 75) return "bg-blue-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleExpand = () => {
    setSearchExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleBlur = () => {
    if (!search) setSearchExpanded(false);
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:p-4"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <h4 className="gba:text-sm gba:font-medium">
              Error Loading Sales Team Data
            </h4>
            <p className="gba:text-sm gba:text-muted-foreground">
              {error.message || "Failed to load sales team members"}
            </p>
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
            >
              Retry
            </Button>
          )}
        </div>
      </Alert>
    );
  }

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Card wraps ONLY the table and pagination, like LeadTable */}
      <Card
        data-testid={`${DATA_TEST_ID_PREFIX}-card`}
        className="gba:w-full gba:mb-6"
      >
        <CardContent className="gba:p-0">
          {/* Loading state */}
          {loading && (
            <div className="gba:flex gba:justify-center gba:p-4">
              <Spinner />
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <Alert
              variant="destructive"
              data-testid={`${DATA_TEST_ID_PREFIX}-error`}
            >
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <h4 className="gba:text-sm gba:font-medium">
                    Error Loading Sales Team Data
                  </h4>
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {(error as any) instanceof Error
                      ? (error as any).message
                      : typeof error === "string"
                      ? error
                      : "Failed to load sales team members"}
                  </p>
                </div>
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </Alert>
          )}

          {/* Table */}
          <div className="gba:overflow-x-auto">
            <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-gray-50">
                  <TableHead
                    className="gba:w-[50px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-4"
                    data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                  >
                    ACTIONS
                  </TableHead>
                  <TableHead
                    className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("name")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-name-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Name
                      {renderSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[18%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("position")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-position-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Position
                      {renderSortIcon("position")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[19%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("manager")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-manager-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Manager
                      {renderSortIcon("manager")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[19%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("totalRevenue")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-revenue-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Total Sales
                      {renderSortIcon("totalRevenue")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[19%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("activityScore")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-activity-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Activity Score
                      {renderSortIcon("activityScore")}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length > 0 ? (
                  members.map((member) => (
                    <TableRow
                      key={member.id}
                      className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${
                        selectedMemberId === member.id ? "gba:bg-blue-50" : ""
                      }`}
                      data-testid={`${DATA_TEST_ID_PREFIX}-row-${member.id}`}
                    >
                      {/* Actions Column */}
                      <TableCell
                        className="gba:py-4 gba:px-4"
                        data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${member.id}`}
                      >
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            data-testid={`${DATA_TEST_ID_PREFIX}-update-member-button-${member.id}`}
                            size="icon"
                            contextsArray={[FlowContextName.employeeEntity]}
                            externalContextData={{
                              employeeId: member.employeeId || member.id,
                            }}
                            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-member`}
                            accessToken={accessToken}
                            emptyStateBehavior="enable"
                            deferMainContextRequestsUntilClick
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </TableCell>
                      {/* Name Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6"
                        data-testid={`${DATA_TEST_ID_PREFIX}-name-cell-${member.id}`}
                      >
                        <div
                          className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(member);
                          }}
                          data-testid={`${DATA_TEST_ID_PREFIX}-member-name-${member.id}`}
                        >
                          <Avatar
                            size="sm"
                            className="gba:cursor-pointer gba:hover:ring-2 gba:hover:ring-blue-500 gba:transition-all"
                            onClick={(e) =>
                              handleEmployeeAvatarClick(
                                e,
                                member.employeeId || member.id
                              )
                            }
                            title={`View ${member.name}'s profile`}
                          >
                            <AvatarImage
                              src={`data:image/jpeg;base64,${member?.avatar}`}
                              alt={member.name}
                            />
                            <AvatarFallback>
                              {getMemberInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="gba:font-medium gba:text-sm">
                              {member.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      {/* Position Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6"
                        data-testid={`${DATA_TEST_ID_PREFIX}-position-cell-${member.id}`}
                      >
                        <div className="gba:text-sm gba:text-gray-700">
                          {member.position}
                        </div>
                      </TableCell>
                      {/* Manager Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6"
                        data-testid={`${DATA_TEST_ID_PREFIX}-manager-cell-${member.id}`}
                      >
                        {member.manager ? (
                          <div className="gba:flex gba:items-center gba:gap-3">
                            <Avatar
                              size="sm"
                              className="gba:cursor-pointer gba:hover:ring-2 gba:hover:ring-blue-500 gba:transition-all"
                              onClick={(e) =>
                                member.manager &&
                                handleManagerAvatarClick(e, member.manager.id)
                              }
                              title={`View ${member.manager.name}'s profile`}
                            >
                              <AvatarImage
                                src={`data:image/jpeg;base64,${member.manager.avatar}`}
                                alt={member.manager.name}
                              />
                              <AvatarFallback>
                                {getMemberInitials(member.manager.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="gba:text-sm gba:text-gray-700">
                              {member.manager.name}
                            </div>
                          </div>
                        ) : (
                          <div className="gba:text-sm gba:text-gray-500 gba:italic">
                            No Manager
                          </div>
                        )}
                      </TableCell>
                      {/* Total Revenue Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6"
                        data-testid={`${DATA_TEST_ID_PREFIX}-revenue-cell-${member.id}`}
                      >
                        <span className="gba:font-medium gba:text-sm gba:text-green-600">
                          {formatCurrency(
                            member.totalRevenue,
                            member.currencyId || "EUR"
                          )}
                        </span>
                      </TableCell>
                      {/* Activity Score Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6"
                        data-testid={`${DATA_TEST_ID_PREFIX}-activity-cell-${member.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:justify-start">
                          <Badge
                            variant={getActivityScoreBadgeVariant(
                              member.activityScore
                            )}
                            className="gba:text-sm gba:px-3 gba:py-1"
                            data-testid={`${DATA_TEST_ID_PREFIX}-activity-badge-${member.id}`}
                          >
                            {member.activityScore}%
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // Empty state row
                  <TableRow>
                    <TableCell colSpan={6} className="gba:py-8 gba:text-center">
                      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center">
                        <PiUser className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
                        <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">
                          {search
                            ? "No matching team members"
                            : "No team members"}
                        </h3>
                        <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
                          {search
                            ? `No team members found matching "${search}". Try adjusting your search criteria.`
                            : "No sales team members found for the current time frame."}
                        </p>
                        {search && (
                          <p className="gba:mt-2 gba:text-xs gba:text-gray-400">
                            Search includes: member name, position, and manager
                            name
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination (always visible, matches LeadTable) */}
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
            data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}
          >
            <div
              className="gba:text-sm gba:text-muted-foreground"
              data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}
            >
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                total
              )} of ${total} members`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-3 gba:lg:space-x-4">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(e) =>
                    handlePaginationChange(1, Number(e.target.value))
                  }
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div
                className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                data-testid={`${DATA_TEST_ID_PREFIX}-page-info`}
              >
                Page {currentPage} of {Math.ceil(total / pageSize)}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-1">
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePaginationChange(1)}
                  disabled={currentPage === 1}
                  data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
                >
                  <span className="gba:sr-only">Go to first page</span>
                  ⟨⟨
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePaginationChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
                >
                  <span className="gba:sr-only">Go to previous page</span>⟨
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePaginationChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(total / pageSize)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
                >
                  <span className="gba:sr-only">Go to next page</span>⟩
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() =>
                    handlePaginationChange(Math.ceil(total / pageSize))
                  }
                  disabled={currentPage >= Math.ceil(total / pageSize)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
                >
                  <span className="gba:sr-only">Go to last page</span>
                  ⟩⟩
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesTeamMembersList;
