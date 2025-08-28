"use client";

import React, { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
  Card,
  CardContent,
} from "@newwork/nw-design-system";
import {
  PiUser,
  PiEnvelope,
  PiPhone,
  PiBuilding,
  PiCalendar,
  PiMapPin,
  PiArrowUp,
  PiArrowDown,
  PiGlobe,
  PiFactory,
  PiCheckCircle,
  PiXCircle,
} from "react-icons/pi";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Lead } from "../types";
import dayjs from "dayjs";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";
import {
  getLeadStatusBadgeVariant,
  getLeadRatingBadgeVariant,
} from "@/common/utils/badgeUtils";

interface LeadTableProps {
  leads: Lead[];
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
  onSelectLead?: (lead: Lead) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: "ASC" | "DESC" | "") => void;
  selectedLeadId?: string;
  accessToken: string;
  sourceApp?: string;
  visibleColumns: string[];
}

const DATA_TEST_ID_PREFIX = "LeadTable";

/**
 * Table component for displaying leads with pagination and actions
 */
export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
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
  onSelectLead,
  onPaginationChange,
  onSortingChange,
  selectedLeadId,
  accessToken,
  sourceApp,
  visibleColumns,
}) => {
  const { t } = useTranslation();

  // Helper function to check if a column is visible
  const isColumnVisible = (columnId: string) =>
    visibleColumns.includes(columnId);

  // Get contact display name
  const getContactName = (lead: Lead) => {
    // First try to use contact information if available
    if (lead.contact?.firstName || lead.contact?.lastName) {
      return `${lead.contact.firstName || ""} ${
        lead.contact.lastName || ""
      }`.trim();
    }

    return "-";
  };

  // Get owner display name
  const getOwnerName = (lead: Lead) => {
    if (lead.ownerEmployee?.displayName) {
      return lead.ownerEmployee.displayName;
    }
    if (lead.ownerEmployee?.firstName || lead.ownerEmployee?.lastName) {
      return `${lead.ownerEmployee.firstName || ""} ${
        lead.ownerEmployee.lastName || ""
      }`.trim();
    }
    return "-";
  };

  // Handle row click
  const handleRowClick = useCallback(
    (record: Lead) => {
      // Determine source based on sourceApp
      const source =
        sourceApp === "investment-relations" || sourceApp === "IRM"
          ? "investments"
          : "customer-relations";

      // Navigate to lead record page
      const url = buildPlatformUrl("/platform/crm/lead-record", {
        leadId: record.id,
        source: source,
      });
      navigateTo(url);

      // Also call the selection callback if provided
      onSelectLead?.(record);
    },
    [onSelectLead, sourceApp]
  );

  // Show error state
  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
          {t("lead.error.title", "Error Loading Leads")}
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
    if (sortField !== field || !sortField) return null;
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
          <Table
            data-testid={`${DATA_TEST_ID_PREFIX}-table`}
            style={{ minWidth: "1200px" }}
          >
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                {isColumnVisible("name") && (
                  <TableHead
                    className="gba:w-[300px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("firstName")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-lead-contact-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.contact", "Lead Contact")}
                      {renderSortIcon("firstName")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("company") && (
                  <TableHead
                    className="gba:w-[240px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("companyName")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-lead-company-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.company", "Lead Company")}
                      {renderSortIcon("companyName")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("contact") && (
                  <TableHead
                    className="gba:w-[180px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("email")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-contact-info-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.contactInfo", "Contact Info")}
                      {renderSortIcon("email")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("country") && (
                  <TableHead
                    className="gba:w-[120px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("countryRef")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-country-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.country", "Country")}
                      {renderSortIcon("countryRef")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("region") && (
                  <TableHead
                    className="gba:w-[130px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("regionRef")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-region-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.region", "Region/State")}
                      {renderSortIcon("regionRef")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("city") && (
                  <TableHead
                    className="gba:w-[120px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("city")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-city-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.city", "City")}
                      {renderSortIcon("city")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("status") && (
                  <TableHead
                    className="gba:w-[144px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("leadStatusRef")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.status", "Status")}
                      {renderSortIcon("leadStatusRef")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("rating") && (
                  <TableHead
                    className="gba:w-[144px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("leadRatingRef")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-rating-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.rating", "Rating")}
                      {renderSortIcon("leadRatingRef")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("source") && (
                  <TableHead
                    className="gba:w-[144px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("leadSourceRef")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-source-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.source", "Source")}
                      {renderSortIcon("leadSourceRef")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("owner") && (
                  <TableHead
                    className="gba:w-[180px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("ownerEmployeeId")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-owner-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.owner", "Owner")}
                      {renderSortIcon("ownerEmployeeId")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("created") && (
                  <TableHead
                    className="gba:w-[144px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("createdAt")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-created-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.created", "Creation Date")}
                      {renderSortIcon("createdAt")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("industry") && (
                  <TableHead
                    className="gba:w-[180px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("industryRef")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-industry-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.industry", "Industry")}
                      {renderSortIcon("industryRef")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("companyWebsite") && (
                  <TableHead
                    className="gba:w-[180px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("companyWebsite")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-company-website-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.companyWebsite", "Company Website")}
                      {renderSortIcon("companyWebsite")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("companyPhone") && (
                  <TableHead
                    className="gba:w-[180px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("companyPhone")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-company-phone-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.companyPhone", "Company Phone")}
                      {renderSortIcon("companyPhone")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("conversionStatus") && (
                  <TableHead
                    className="gba:w-[180px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("leadStatusRef")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-conversion-status-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("lead.conversionStatus", "Conversion Status")}
                      {renderSortIcon("leadStatusRef")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("sensitive") && (
                  <TableHead
                    className="gba:w-[80px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:text-center"
                    data-testid={`${DATA_TEST_ID_PREFIX}-sensitive-header`}
                  >
                    Sensitive
                  </TableHead>
                )}
                {isColumnVisible("actions") && (
                  <TableHead
                    className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                  >
                    ACTIONS
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((record) => (
                <TableRow
                  key={record.id}
                  className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${
                    selectedLeadId === record.id ? "gba:bg-blue-50" : ""
                  }`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                >
                  {isColumnVisible("name") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-lead-contact-cell-${record.id}`}
                    >
                      <div
                        className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(record);
                        }}
                        data-testid={`${DATA_TEST_ID_PREFIX}-lead-contact-name-${record.id}`}
                      >
                        <Avatar size="sm">
                          {record.contact?.pictureUrl && (
                            <AvatarImage
                              src={record.contact.pictureUrl}
                              alt={getContactName(record)}
                            />
                          )}
                          <AvatarFallback>
                            {getContactName(record) !== "-"
                              ? getContactName(record)
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .toUpperCase()
                              : "L"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="gba:font-medium gba:text-sm">
                            {getContactName(record)}
                          </div>
                          {record.companyName &&
                            !isColumnVisible("company") && (
                              <div className="gba:text-xs gba:text-gray-500">
                                {record.companyName}
                              </div>
                            )}
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("company") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-lead-company-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiBuilding size={14} className="gba:text-blue-600" />
                        <span
                          className="gba:text-sm gba:truncate"
                          title={record.companyName}
                        >
                          {record.companyName || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("contact") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-contact-info-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:flex-col gba:gap-1">
                        {record.email && (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiEnvelope
                              size={12}
                              className="gba:text-gray-400"
                            />
                            <span
                              className="gba:text-xs gba:truncate"
                              title={record.email}
                            >
                              {record.email}
                            </span>
                          </div>
                        )}
                        {record.phoneNumber && (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiPhone size={12} className="gba:text-gray-400" />
                            <span className="gba:text-xs">
                              {record.phoneNumber}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("country") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-country-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiMapPin size={14} className="gba:text-gray-400" />
                        <span
                          className="gba:text-sm gba:truncate"
                          title={record.country?.value}
                        >
                          {record.country?.value || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("region") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-region-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiMapPin size={14} className="gba:text-gray-400" />
                        <span
                          className="gba:text-sm gba:truncate"
                          title={record.region?.value}
                        >
                          {record.region?.value || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("city") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-city-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiMapPin size={14} className="gba:text-gray-400" />
                        <span
                          className="gba:text-sm gba:truncate"
                          title={record.city}
                        >
                          {record.city || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("status") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${record.id}`}
                    >
                      <Badge
                        variant={getLeadStatusBadgeVariant(record.leadStatus)}
                      >
                        {record.leadStatus?.value || "-"}
                      </Badge>
                    </TableCell>
                  )}
                  {isColumnVisible("rating") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-rating-cell-${record.id}`}
                    >
                      <Badge
                        variant={getLeadRatingBadgeVariant(record.leadRating)}
                      >
                        {record.leadRating?.value || "-"}
                      </Badge>
                    </TableCell>
                  )}
                  {isColumnVisible("source") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-source-cell-${record.id}`}
                    >
                      <div
                        className="gba:text-sm gba:truncate"
                        title={record.leadSource?.value}
                      >
                        {record.leadSource?.value || "-"}
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("owner") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-owner-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <Avatar size="sm">
                          {record.ownerEmployee?.pictureThumbnail && (
                            <AvatarImage
                              src={`data:image/gif;base64,${record.ownerEmployee.pictureThumbnail}`}
                              alt={getOwnerName(record)}
                            />
                          )}
                          <AvatarFallback>
                            {getOwnerName(record) !== "-"
                              ? getOwnerName(record)
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                              : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="gba:flex gba:flex-col">
                          <span className="gba:font-medium gba:text-sm">
                            {getOwnerName(record)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("created") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-created-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar size={14} className="gba:text-gray-400" />
                        <span className="gba:text-sm">
                          {record.createdAt
                            ? dayjs(record.createdAt).format("MMM DD, YYYY")
                            : "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("industry") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-industry-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiFactory size={14} className="gba:text-purple-600" />
                        <span
                          className="gba:text-sm gba:truncate"
                          title={record.industry?.value}
                        >
                          {record.industry?.value || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("companyWebsite") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-company-website-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiGlobe size={14} className="gba:text-blue-600" />
                        {record.companyWebsite ? (
                          <a
                            href={record.companyWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gba:text-sm gba:text-blue-600 gba:hover:underline gba:truncate"
                            title={record.companyWebsite}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {record.companyWebsite.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          <span className="gba:text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("companyPhone") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-company-phone-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiPhone size={14} className="gba:text-green-600" />
                        <span className="gba:text-sm">
                          {record.companyPhone || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("conversionStatus") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-conversion-status-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        {record.leadStatus?.code === "CONVERTED" ? (
                          <>
                            <PiCheckCircle
                              size={14}
                              className="gba:text-green-600"
                            />
                            <span className="gba:text-sm gba:font-medium gba:text-green-600">
                              Converted
                            </span>
                          </>
                        ) : (
                          <>
                            <PiXCircle
                              size={14}
                              className="gba:text-gray-400"
                            />
                            <span className="gba:text-sm gba:text-gray-500">
                              Not Converted
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("sensitive") && (
                    <TableCell
                      className="gba:py-4 gba:px-6 gba:text-center"
                      data-testid={`${DATA_TEST_ID_PREFIX}-sensitive-cell-${record.id}`}
                    >
                      {record.sensitive === true ? (
                        <span
                          className="gba:text-green-600 gba:text-lg"
                          data-testid={`${DATA_TEST_ID_PREFIX}-sensitive-check-${record.id}`}
                          title="Sensitive lead"
                        >
                          ✓
                        </span>
                      ) : (
                        <span
                          className="gba:text-gray-500 gba:text-lg"
                          data-testid={`${DATA_TEST_ID_PREFIX}-sensitive-x-${record.id}`}
                          title="Not sensitive"
                        >
                          ✕
                        </span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible("actions") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`${DATA_TEST_ID_PREFIX}-update-lead-button-${record.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.leadEntity]}
                          externalContextData={{
                            leadId: record.id,
                          }}
                          prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-lead`}
                          accessToken={accessToken}
                          emptyStateBehavior="disable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                  )}
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
          )} of ${total} leads`}
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
