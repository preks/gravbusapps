"use client";

import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@newwork/nw-design-system";
import { PiUser, PiArrowUp, PiArrowDown, PiLightning } from "react-icons/pi";
import { Clock, Calendar } from "lucide-react";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { startProcess } from "@/common/utils/start-process";
import { Task } from "../types/TaskTypes";
import {
  getTaskStatusBadgeVariant,
  getTaskPriorityBadgeVariant,
  getTaskTypeBadgeVariant,
  getReferenceTypeBadgeVariant,
} from "../utils/taskBadgeUtils";
import dayjs from "dayjs";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";

interface TaskTableProps {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (page: number, pageSize?: number) => Promise<void>;
  retry: () => void;
  total: number;
  currentPage: number;
  pageSize: number;
  sortField: string;
  sortOrder: "ASC" | "DESC" | "";
  onSelectTask?: (task: Task) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: "ASC" | "DESC" | "") => void;
  selectedTaskId?: string;
  accessToken: string;
  sourceApp?: string;
  hideAssignedTo?: boolean; // New prop to hide assigned to column
}

const DATA_TEST_ID_PREFIX = "TaskTable";

/**
 * Table component for displaying tasks with pagination and actions
 */
export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  loading,
  error,
  hasMore,
  loadMore,
  loadPage,
  retry,
  total,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onSelectTask,
  onPaginationChange,
  onSortingChange,
  selectedTaskId,
  accessToken,
  sourceApp,
  hideAssignedTo,
}) => {
  const { t } = useTranslation();

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format("MM/DD/YYYY");
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Helper function to get timing type icon and tooltip
  const getTimingTypeIcon = (timingType?: string) => {
    if (!timingType) {
      return {
        icon: <Clock className="gba:h-4 gba:w-4 gba:text-gray-400" />,
        tooltip: "No timing type specified",
      };
    }

    switch (timingType.toUpperCase()) {
      case "DEADLINE":
        return {
          icon: <Clock className="gba:h-4 gba:w-4 gba:text-red-500" />,
          tooltip: "Deadline - Complete by this date",
        };
      case "SCHEDULED":
        return {
          icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
          tooltip: "Scheduled - Execute on this specific date",
        };
      default:
        return {
          icon: <Clock className="gba:h-4 gba:w-4 gba:text-gray-400" />,
          tooltip: "Unknown timing type",
        };
    }
  };

  // Handle employee profile navigation
  const handleEmployeeClick = useCallback((employee: Task["assignedTo"]) => {
    const url = buildPlatformUrl("/platform/employee-record", {
      employeeId: employee.id,
    });
    navigateTo(url);
  }, []);

  // Handle task update
  const handleUpdateTask = useCallback((task: Task) => {
    console.log("TaskTable - Updating task:", task);
    console.log("TaskTable - Raw sales task data:", task.rawSalesTask);
    startProcess({
      domain: "customer-relations",
      processName: "saveSalesTask",
      payload: {
        taskData: task.rawSalesTask, // Pass the raw sales task data
      },
      builderType: "NATIVE_SCREEN",
    });
  }, []);

  // Handle reference record navigation
  const handleReferenceClick = useCallback(
    (reference: Task["reference"]) => {
      // Determine source based on sourceApp
      const source =
        sourceApp === "investment-relations" || sourceApp === "IRM"
          ? "investments"
          : "customer-relations";

      let url: string;
      switch (reference.type) {
        case "lead":
          url = buildPlatformUrl("/platform/crm/lead-record", {
            leadId: reference.id,
            source: source,
          });
          break;
        case "account":
          url = buildPlatformUrl("/platform/crm/account-record", {
            accountId: reference.id,
            source: source,
          });
          break;
        case "contact":
          url = buildPlatformUrl("/platform/crm/contact-record", {
            contactId: reference.id,
            source: source,
          });
          break;
        case "opportunity":
          url = buildPlatformUrl("/platform/crm/opportunity-record", {
            opportunityId: reference.id,
            source: source,
          });
          break;
        default:
          console.warn("Unknown reference type:", reference.type);
          return;
      }

      navigateTo(url);
    },
    [sourceApp]
  );

  // Handle row click - opens task details in side panel
  const handleRowClick = useCallback(
    (record: Task) => {
      // Call the selection callback to open side panel
      onSelectTask?.(record);
    },
    [onSelectTask]
  );

  // Show error state
  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
          {t("task.error.title", "Error Loading Tasks")}
        </div>
        <div className="gba:text-gray-600 gba:mb-4">{error.message}</div>
        <Button
          variant="default"
          onClick={retry}
          data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
        >
          {t("common.retry", "Retry")}
        </Button>
      </div>
    );
  }

  // Helper function to handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: ASC -> DESC -> clear
      if (sortOrder === "ASC") {
        onSortingChange(field, "DESC");
      } else if (sortOrder === "DESC") {
        onSortingChange("", "");
      } else {
        onSortingChange(field, "ASC");
      }
    } else {
      onSortingChange(field, "ASC");
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

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
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
                <TableHead
                  className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("name")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-task-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t("task.name", "Task")}
                    {renderSortIcon("name")}
                  </div>
                </TableHead>
                {!hideAssignedTo && (
                  <TableHead
                    className="gba:w-[20%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("assignedTo")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-assigned-to-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("task.assignedTo", "Assigned To")}
                      {renderSortIcon("assignedTo")}
                    </div>
                  </TableHead>
                )}
                <TableHead
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("type")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-type-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t("task.type", "Type")}
                    {renderSortIcon("type")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("priority")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-priority-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t("task.priority", "Priority")}
                    {renderSortIcon("priority")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("status")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t("task.status", "Status")}
                    {renderSortIcon("status")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("reference")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-reference-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t("task.reference", "Reference")}
                    {renderSortIcon("reference")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("dueDate")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-schedule-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t("task.schedule", "Schedule / Due Date")}
                    {renderSortIcon("dueDate")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                >
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((record) => (
                <TableRow
                  key={record.id}
                  className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${
                    selectedTaskId === record.id ? "gba:bg-blue-50" : ""
                  }`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                >
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-task-cell-${record.id}`}
                  >
                    <div
                      className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(record);
                      }}
                      data-testid={`${DATA_TEST_ID_PREFIX}-task-name-${record.id}`}
                    >
                      <div>
                        <div className="gba:font-medium gba:text-sm">
                          {record.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  {!hideAssignedTo && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-assigned-to-cell-${record.id}`}
                    >
                      <div
                        className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmployeeClick(record.assignedTo);
                        }}
                        data-testid={`${DATA_TEST_ID_PREFIX}-assigned-to-link-${record.id}`}
                      >
                        <Avatar size="sm">
                          <AvatarFallback>
                            {getInitials(
                              record.assignedTo.firstName,
                              record.assignedTo.lastName
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="gba:flex gba:flex-col">
                          <span className="gba:font-medium gba:text-sm">
                            {record.assignedTo.displayName}
                          </span>
                          <span className="gba:text-xs gba:text-gray-500">
                            {record.assignedTo.department}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  )}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-type-cell-${record.id}`}
                  >
                    <Badge variant={getTaskTypeBadgeVariant(record.type)}>
                      {record.type.charAt(0).toUpperCase() +
                        record.type.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-priority-cell-${record.id}`}
                  >
                    <Badge
                      variant={getTaskPriorityBadgeVariant(record.priority)}
                    >
                      {record.priority.charAt(0).toUpperCase() +
                        record.priority.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${record.id}`}
                  >
                    <Badge variant={getTaskStatusBadgeVariant(record.status)}>
                      {record.status === "in_progress"
                        ? "In Progress"
                        : record.status.charAt(0).toUpperCase() +
                          record.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-reference-cell-${record.id}`}
                  >
                    <div
                      className="gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReferenceClick(record.reference);
                      }}
                      data-testid={`${DATA_TEST_ID_PREFIX}-reference-link-${record.id}`}
                    >
                      <div className="gba:font-medium gba:text-sm">
                        {record.reference.name}
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1">
                        <Badge
                          variant={getReferenceTypeBadgeVariant(
                            record.reference.type
                          )}
                          className="gba:text-xs"
                        >
                          {record.reference.type.charAt(0).toUpperCase() +
                            record.reference.type.slice(1)}
                        </Badge>
                        {record.reference.description && (
                          <span className="gba:text-xs gba:text-gray-500">
                            {record.reference.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-schedule-cell-${record.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="gba:flex gba:items-center">
                              {getTimingTypeIcon(record.timingType).icon}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {getTimingTypeIcon(record.timingType).tooltip}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="gba:text-sm">
                        {formatDate(record.dueDate)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <AppActionButton
                        data-testid={`${DATA_TEST_ID_PREFIX}-update-task-button-${record.id}`}
                        size="icon"
                        contextsArray={[FlowContextName.taskInstance]}
                        externalContextData={{
                          taskId: record.id,
                          taskData: record.rawSalesTask,
                        }}
                        staticFlowData={[
                          {
                            key: `update-task-${record.id}`,
                            label: "Update Task",
                            icon: "PiLightning",
                            category: "ACTION",
                            onClick: () => handleUpdateTask(record),
                          },
                        ]}
                        prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-task`}
                        accessToken={accessToken}
                        emptyStateBehavior="enable"
                        deferMainContextRequestsUntilClick
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Pagination */}
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
          )} of ${total} tasks`}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
          <div className="gba:flex gba:items-center gba:space-x-2">
            <p className="gba:text-sm gba:font-medium">Rows per page</p>
            <select
              value={pageSize}
              onChange={(e) => onPaginationChange(1, Number(e.target.value))}
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
              onClick={() => onPaginationChange(1)}
              disabled={currentPage === 1}
              data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
            >
              <span className="gba:sr-only">Go to first page</span>
              ⟨⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage - 1)}
              disabled={currentPage === 1}
              data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
            >
              <span className="gba:sr-only">Go to previous page</span>⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(total / pageSize)}
              data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
            >
              <span className="gba:sr-only">Go to next page</span>⟩
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(Math.ceil(total / pageSize))}
              disabled={currentPage >= Math.ceil(total / pageSize)}
              data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
            >
              <span className="gba:sr-only">Go to last page</span>
              ⟩⟩
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
