import React, { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  Spinner,
  Alert,
  Button,
  Card,
  CardContent,
} from "@newwork/nw-design-system";
import {
  PiPhone,
  PiEnvelope,
  PiUsers,
  PiListChecks,
  PiArrowUp,
  PiArrowDown,
  PiUser,
  PiBuilding,
  PiTarget,
  PiHandshake,
  PiChartLine,
  PiCalendar,
} from "react-icons/pi";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import {
  ActivitiesTableProps,
  ActivityEntityType,
} from "../../types/activitiesTypes";
import {
  ActivitySortField,
  SortOrder,
  getActivityScoreBadgeVariant,
} from "./types";
import { useEmployeeActivitiesData } from "../../hooks/useEmployeeActivitiesData";
import { DataContainer } from "@/components/layout/dataContainer";
import { useActivityFilters } from "../../hooks/useActivityFilters";
import { useDebounce } from "@/common/hooks/useDebounce";
import dayjs from "dayjs";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";

const DATA_TEST_ID_PREFIX = "EmployeeActivitiesTable";

export const ActivitiesTable: React.FC<ActivitiesTableProps> = ({
  employeeId,
  accessToken,
  userInfo: _userInfo,
  onTotalChange,
}) => {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<ActivitySortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Debounce search to prevent excessive API calls
  const debouncedSearch = useDebounce(search, 500);

  // Add filter state/hooks
  const {
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
  } = useActivityFilters({ accessToken });

  // Use the data hook to fetch real activities
  const { activities, total, loading, error, loadPage, retry } =
    useEmployeeActivitiesData({
      employeeId,
      search: debouncedSearch,
      sortField,
      sortOrder,
      accessToken,
      // userInfo, // Removed - we only want activities for the selected employee
    });

  // Load initial data when component mounts or when dependencies change
  useEffect(() => {
    if (employeeId && accessToken) {
      const filters = getFilters();
      let additionalFilters = {};
      if (filters.activityTypes && filters.activityTypes.length > 0) {
        additionalFilters = {
          activityType: { value: { _in: filters.activityTypes } },
        };
      }
      loadPage(currentPage, pageSize, additionalFilters);
    }
  }, [
    employeeId,
    accessToken,
    debouncedSearch,
    sortField,
    sortOrder,
    loadPage,
    currentPage,
    pageSize,
    getFilters,
  ]);

  // Report total change to parent component
  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(total);
    }
  }, [total, onTotalChange]);

  // Handle sorting change
  const handleSort = (field: ActivitySortField) => {
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
  const renderSortIcon = (field: ActivitySortField) => {
    if (sortField !== field) return null;
    if (sortOrder === "ASC")
      return <PiArrowUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === "DESC")
      return <PiArrowDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  };

  // Get activity type icon
  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case "Call":
        return <PiPhone size={16} style={{ color: "#52c41a" }} />; // green
      case "Email":
        return <PiEnvelope size={16} style={{ color: "#1677ff" }} />; // blue
      case "Meeting":
        return <PiUsers size={16} style={{ color: "#fa8c16" }} />; // orange
      case "Task":
        return <PiListChecks size={16} style={{ color: "#722ed1" }} />; // purple
      default:
        return <PiListChecks size={16} style={{ color: "#bfbfbf" }} />; // gray fallback
    }
  };

  // Get entity type icon
  const getEntityTypeIcon = (entityType: ActivityEntityType, size = 16) => {
    switch (entityType) {
      case "Contact":
        return <PiUser size={size} />;
      case "Lead":
        return <PiTarget size={size} />;
      case "Opportunity":
        return <PiHandshake size={size} />;
      case "Account":
        return <PiBuilding size={size} />;
      default:
        return <PiUser size={size} />;
    }
  };

  // Get entity name based on activity data
  const getEntityName = (activity: any): string => {
    // Use reference object if available (preferred method)
    if (activity.reference?.entityName) {
      return activity.reference.entityName;
    }

    // Fallback to nested object structure
    // Check if it's an account
    if (activity.account?.name) {
      return activity.account.name;
    }

    // Check if it's a contact
    if (activity.contact?.firstName || activity.contact?.lastName) {
      const firstName = activity.contact.firstName || "";
      const lastName = activity.contact.lastName || "";
      return `${firstName} ${lastName}`.trim();
    }

    // Check if it's a lead
    if (activity.lead?.name) {
      return activity.lead.name;
    }

    // Check if lead has contact info
    if (activity.lead?.contact?.firstName || activity.lead?.contact?.lastName) {
      const firstName = activity.lead.contact.firstName || "";
      const lastName = activity.lead.contact.lastName || "";
      return `${firstName} ${lastName}`.trim();
    }

    // Check if it's an opportunity
    if (activity.opportunity?.name) {
      return activity.opportunity.name;
    }

    return "Unknown";
  };

  // Get entity type based on activity data
  const getEntityType = (activity: any): ActivityEntityType => {
    // Use reference object if available (preferred method)
    if (activity.reference?.entityType) {
      return activity.reference.entityType as ActivityEntityType;
    }

    // Fallback to nested object structure
    // Check if it's an account
    if (activity.account?.name) {
      return "Account";
    }

    // Check if it's a contact
    if (activity.contact?.firstName || activity.contact?.lastName) {
      return "Contact";
    }

    // Check if it's a lead
    if (activity.lead?.name || activity.lead?.contact) {
      return "Lead";
    }

    // Check if it's an opportunity
    if (activity.opportunity?.name) {
      return "Opportunity";
    }

    return "Contact"; // Default fallback
  };

  // Handle reference click to navigate to the respective page
  const handleReferenceClick = (activity: any) => {
    let url: string | null = null;
    const source = "sales-activities";

    // Use reference object if available (preferred method)
    if (activity.reference?.entityType && activity.reference?.entityId) {
      const entityType = activity.reference.entityType;
      const entityId = activity.reference.entityId;

      switch (entityType) {
        case "Account":
          url = buildPlatformUrl("/platform/crm/account-record", {
            accountId: entityId,
            source,
          });
          break;
        case "Contact":
          url = buildPlatformUrl("/platform/crm/contact-record", {
            contactId: entityId,
            source,
          });
          break;
        case "Lead":
          url = buildPlatformUrl("/platform/crm/lead-record", {
            leadId: entityId,
            source,
          });
          break;
        case "Opportunity":
          url = buildPlatformUrl("/platform/crm/opportunity-record", {
            opportunityId: entityId,
            source,
          });
          break;
      }
    } else {
      // Fallback to nested object structure
      if (activity.account?.name) {
        url = buildPlatformUrl("/platform/crm/account-record", {
          accountId: activity.accountId,
          source,
        });
      } else if (activity.contact?.firstName || activity.contact?.lastName) {
        url = buildPlatformUrl("/platform/crm/contact-record", {
          contactId: activity.contactId,
          source,
        });
      } else if (activity.lead?.name || activity.lead?.contact) {
        url = buildPlatformUrl("/platform/crm/lead-record", {
          leadId: activity.leadId,
          source,
        });
      } else if (activity.opportunity?.name) {
        url = buildPlatformUrl("/platform/crm/opportunity-record", {
          opportunityId: activity.opportunityId,
          source,
        });
      }
    }

    if (url) {
      navigateTo(url);
    }
  };

  // Loading state
  if (loading && activities.length === 0) {
    return (
      <div
        className="gba:flex gba:justify-center gba:p-8"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error && activities.length === 0) {
    return (
      <Alert variant="destructive" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <h4 className="gba:text-sm gba:font-medium">
              Error Loading Activities
            </h4>
            <p className="gba:text-sm gba:text-muted-foreground">
              Failed to load activities data
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
          >
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <DataContainer
      dataControllerProps={{
        search,
        setSearch,
        filter: selectedFilters,
        setFilter: (filters: string[]) => {
          clearAllFilters();
          filters.forEach(addFilter);
        },
        filterLabelMap,
        listTitle: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiChartLine className="gba:text-black" size={20} />
            Recent Sales Activities
          </div>
        ),
      }}
      dataFilterProps={{
        filterGroups,
        onFilterChange: (filterId: string, selected: boolean) => {
          if (selected) addFilter(filterId);
          else removeFilter(filterId);
        },
      }}
      dataBody={
        <>
          {/* Activities Table Content */}
          {activities.length === 0 && !loading && (
            <div
              className="gba:text-center gba:p-8"
              data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}
            >
              <h3 className="gba:text-sm gba:font-medium gba:text-gray-900">
                No activities found
              </h3>
              <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
                {search
                  ? "Try adjusting your search criteria."
                  : "This employee currently has no activities."}
              </p>
            </div>
          )}
          {/* Table */}
          {activities.length > 0 && (
            <Card data-testid={`${DATA_TEST_ID_PREFIX}-table-card`}>
              <CardContent className="gba:p-0">
                {loading && (
                  <div className="gba:flex gba:justify-center gba:p-4">
                    <Spinner />
                  </div>
                )}

                <div className="gba:overflow-x-auto">
                  <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
                    <TableHeader>
                      <TableRow className="gba:border-b gba:bg-gray-50">
                        {/* Actions Column */}
                        <TableHead
                          className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-actions`}
                        >
                          Actions
                        </TableHead>

                        {/* Title Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                          onClick={() => handleSort("title")}
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-title`}
                        >
                          <div className="gba:flex gba:items-center">
                            Title {renderSortIcon("title")}
                          </div>
                        </TableHead>

                        {/* Type Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                          onClick={() => handleSort("type")}
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-type`}
                        >
                          <div className="gba:flex gba:items-center">
                            Type {renderSortIcon("type")}
                          </div>
                        </TableHead>

                        {/* Reference Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-reference`}
                        >
                          Reference
                        </TableHead>

                        {/* Created At Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                          onClick={() => handleSort("createdAt")}
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-created`}
                        >
                          <div className="gba:flex gba:items-center">
                            Creation Date {renderSortIcon("createdAt")}
                          </div>
                        </TableHead>

                        {/* Occurred At Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                          onClick={() => handleSort("occurredAt")}
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-occurred`}
                        >
                          <div className="gba:flex gba:items-center">
                            Occurred At {renderSortIcon("occurredAt")}
                          </div>
                        </TableHead>

                        {/* Activity Score Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                          onClick={() => handleSort("activityScore")}
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-score`}
                        >
                          <div className="gba:flex gba:items-center">
                            Activity Score {renderSortIcon("activityScore")}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((activity) => (
                        <TableRow
                          key={activity.id}
                          className="gba:border-b gba:hover:bg-gray-50 gba:transition-colors"
                          data-testid={`${DATA_TEST_ID_PREFIX}-row-${activity.id}`}
                        >
                          {/* Actions Column */}
                          <TableCell
                            className="gba:py-4 gba:px-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="gba:flex gba:justify-start gba:gap-2">
                              <AppActionButton
                                data-testid={`${DATA_TEST_ID_PREFIX}-update-activity-button-${activity.id}`}
                                contextsArray={[FlowContextName.flowEntity]}
                                externalContextData={{
                                  entityId: activity.id,
                                }}
                                prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-activity`}
                                accessToken={accessToken}
                                emptyStateBehavior="enable"
                                deferMainContextRequestsUntilClick
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </TableCell>

                          {/* Title Column */}
                          <TableCell
                            className="gba:py-4 gba:px-6"
                            data-testid={`${DATA_TEST_ID_PREFIX}-title-cell-${activity.id}`}
                          >
                            <div className="gba:font-medium gba:text-sm">
                              {activity.title}
                            </div>
                          </TableCell>

                          {/* Type Column */}
                          <TableCell
                            className="gba:py-4 gba:px-6"
                            data-testid={`${DATA_TEST_ID_PREFIX}-type-cell-${activity.id}`}
                          >
                            <div className="gba:flex gba:items-center gba:gap-2">
                              {getActivityTypeIcon(
                                activity.activityType?.value || activity.type
                              )}
                              <span className="gba:text-sm">
                                {activity.activityType?.value || activity.type}
                              </span>
                            </div>
                          </TableCell>

                          {/* Reference Column */}
                          <TableCell
                            className="gba:py-4 gba:px-6"
                            data-testid={`${DATA_TEST_ID_PREFIX}-reference-cell-${activity.id}`}
                          >
                            <div className="gba:flex gba:flex-col gba:gap-1">
                              <div
                                className="gba:text-sm gba:font-medium gba:text-gray-900 gba:cursor-pointer gba:hover:text-blue-600 gba:transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReferenceClick(activity);
                                }}
                                title={`View ${getEntityType(
                                  activity
                                ).toLowerCase()}: ${getEntityName(activity)}`}
                              >
                                {getEntityName(activity)}
                              </div>
                              <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-gray-500">
                                {getEntityTypeIcon(getEntityType(activity), 16)}
                                <span>{getEntityType(activity)}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Created At Column */}
                          <TableCell
                            className="gba:py-4 gba:px-6"
                            data-testid={`${DATA_TEST_ID_PREFIX}-created-cell-${activity.id}`}
                          >
                            {activity.createdAt ? (
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <PiCalendar
                                  size={16}
                                  className="gba:text-gray-400"
                                />
                                <span className="gba:text-sm">
                                  {dayjs(activity.createdAt).format(
                                    "MMM DD, YYYY"
                                  )}
                                </span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          {/* Occurred At Column */}
                          <TableCell
                            className="gba:py-4 gba:px-6"
                            data-testid={`${DATA_TEST_ID_PREFIX}-occurred-cell-${activity.id}`}
                          >
                            {activity.occurredAt ? (
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <PiCalendar
                                  size={16}
                                  className="gba:text-blue-500"
                                />
                                <span className="gba:text-sm gba:font-medium">
                                  {dayjs(activity.occurredAt).format(
                                    "MMM DD, YYYY"
                                  )}
                                </span>
                              </div>
                            ) : (
                              <span className="gba:text-gray-400 gba:text-sm gba:italic">
                                Not specified
                              </span>
                            )}
                          </TableCell>

                          {/* Activity Score Column */}
                          <TableCell
                            className="gba:py-4 gba:px-6"
                            data-testid={`${DATA_TEST_ID_PREFIX}-score-cell-${activity.id}`}
                          >
                            <Badge
                              variant={getActivityScoreBadgeVariant(
                                activity.activityScore
                              )}
                            >
                              {activity.activityScore}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Pagination (matches LeadTable) */}
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
              )} of ${total} activities`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setPageSize(Number(e.target.value));
                    loadPage(1, Number(e.target.value));
                  }}
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
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => {
                    setCurrentPage(1);
                    loadPage(1, pageSize);
                  }}
                  disabled={currentPage === 1}
                  data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
                >
                  <span className="gba:sr-only">Go to first page</span>
                  ⟨⟨
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => {
                    setCurrentPage(currentPage - 1);
                    loadPage(currentPage - 1, pageSize);
                  }}
                  disabled={currentPage === 1}
                  data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
                >
                  <span className="gba:sr-only">Go to previous page</span>⟨
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => {
                    setCurrentPage(currentPage + 1);
                    loadPage(currentPage + 1, pageSize);
                  }}
                  disabled={currentPage >= Math.ceil(total / pageSize)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
                >
                  <span className="gba:sr-only">Go to next page</span>⟩
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => {
                    setCurrentPage(Math.ceil(total / pageSize));
                    loadPage(Math.ceil(total / pageSize), pageSize);
                  }}
                  disabled={currentPage >= Math.ceil(total / pageSize)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
                >
                  <span className="gba:sr-only">Go to last page</span>
                  ⟩⟩
                </Button>
              </div>
            </div>
          </div>
        </>
      }
    />
  );
};

export default ActivitiesTable;
