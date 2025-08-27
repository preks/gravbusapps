"use client";

import React, { useCallback, useState } from "react";
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
  PiCurrencyDollar,
  PiFlag,
  PiUsers,
  PiGlobe,
  PiPrinter,
  PiSignpost,
} from "react-icons/pi";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Account } from "../types";
import dayjs from "dayjs";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";
import {
  getAccountTypeBadgeVariant,
  getIndustryBadgeVariant,
} from "@/common/utils/badgeUtils";

interface AccountTableProps {
  accounts: Account[];
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
  onSelectAccount?: (account: Account) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: "ASC" | "DESC" | "") => void;
  selectedAccountId?: string;
  accessToken: string;
  sourceApp?: string;
  visibleColumns: string[];
}

const DATA_TEST_ID_PREFIX = "AccountTable";

/**
 * Table component for displaying accounts with pagination and actions
 */
export const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  sourceApp,
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
  onSelectAccount,
  onPaginationChange,
  onSortingChange,
  selectedAccountId,
  accessToken,
  visibleColumns,
}) => {
  const { t } = useTranslation();

  // Helper function to check if a column is visible
  const isColumnVisible = (columnId: string) => visibleColumns.includes(columnId);

  // Get owner display name
  const getOwnerName = (account: Account) => {
    if (account.ownerEmployee?.displayName) {
      return account.ownerEmployee.displayName;
    }
    if (account.ownerEmployee?.firstName || account.ownerEmployee?.lastName) {
      return `${account.ownerEmployee.firstName || ""} ${
        account.ownerEmployee.lastName || ""
      }`.trim();
    }
    return "-";
  };

  // Handle row click
  const handleRowClick = useCallback(
    (record: Account) => {
      // Determine source based on sourceApp
      const source =
        sourceApp === "investment-relations" || sourceApp === "IRM"
          ? "investments"
          : "customer-relations";

      // Navigate to account record page
      const url = buildPlatformUrl("/platform/crm/account-record", {
        accountId: record.id,
        source: source,
      });
      navigateTo(url);

      // Also call the selection callback if provided
      onSelectAccount?.(record);
    },
    [onSelectAccount]
  );

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

  // Show error state
  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
          {t("account.error.title", "Error Loading Accounts")}
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
                {isColumnVisible('company') && (
                  <TableHead
                    className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("name")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-company-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.company", "Company")}
                      {renderSortIcon("name")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('contact') && (
                  <TableHead
                    className="gba:w-[20%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("contactEmail")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-contact-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.contact", "Contact Info")}
                      {renderSortIcon("contactEmail")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('created') && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("createdAt")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-created-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.created", "Creation Date")}
                      {renderSortIcon("createdAt")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('owner') && (
                  <TableHead
                    className="gba:w-[20%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("ownerEmployeeId")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-owner-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.owner", "Owner")}
                      {renderSortIcon("ownerEmployeeId")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('legalForm') && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("typeRef")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-legal-form-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.legalForm", "Legal Form")}
                      {renderSortIcon("typeRef")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('industry') && (
                  <TableHead
                    className="gba:w-[13%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("industryRef")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-industry-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.industry", "Industry")}
                      {renderSortIcon("industryRef")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('annualRevenue') && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("annualRevenue")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-annual-revenue-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.annualRevenue", "Annual Revenue")}
                      {renderSortIcon("annualRevenue")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('country') && (
                  <TableHead
                    className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("billingCountry")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-country-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.country", "Country")}
                      {renderSortIcon("billingCountry")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('employees') && (
                  <TableHead
                    className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("numberOfEmployees")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-employees-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.employees", "Number of Employees")}
                      {renderSortIcon("numberOfEmployees")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('website') && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("website")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-website-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.website", "Website")}
                      {renderSortIcon("website")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('region') && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("region")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-region-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.region", "Region/State")}
                      {renderSortIcon("region")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('city') && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("city")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-city-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.city", "City")}
                      {renderSortIcon("city")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('foundationDate') && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("foundationDate")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-foundation-date-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.foundationDate", "Foundation Date")}
                      {renderSortIcon("foundationDate")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('phone') && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("phone")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-phone-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.phone", "Phone")}
                      {renderSortIcon("phone")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('email') && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("email")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-email-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.email", "Email")}
                      {renderSortIcon("email")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('fax') && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-fax-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {t("account.fax", "Fax")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('actions') && (
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
              {accounts.map((record) => (
                <TableRow
                  key={record.id}
                  className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${
                    selectedAccountId === record.id ? "gba:bg-blue-50" : ""
                  }`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                >
                  {isColumnVisible('company') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-company-cell-${record.id}`}
                    >
                      <div
                        className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(record);
                        }}
                        data-testid={`${DATA_TEST_ID_PREFIX}-company-name-${record.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:bg-blue-100 gba:rounded-full">
                          <PiBuilding size={20} className="gba:text-blue-600" />
                        </div>
                        <div className="gba:flex gba:flex-col">
                          <span className="gba:font-medium gba:text-sm">
                            {record.name || "-"}
                          </span>
                          {record.website && (
                            <span className="gba:text-xs gba:text-gray-500">
                              {record.website}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible('contact') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-contact-cell-${record.id}`}
                    >
                      <div className="gba:space-y-1">
                        {(record.contactFirstName || record.contactLastName) && (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiUser size={14} className="gba:text-gray-400" />
                            {record.contactId ? (
                              <span
                                className="gba:text-sm gba:font-medium gba:cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!record.contactId) return;
                                  const source =
                                    sourceApp === "investment-relations" ||
                                    sourceApp === "IRM"
                                      ? "investments"
                                      : "customer-relations";
                                  const url = buildPlatformUrl(
                                    "/platform/crm/contact-record",
                                    {
                                      contactId: record.contactId,
                                      source,
                                    }
                                  );
                                  navigateTo(url);
                                }}
                                data-testid={`${DATA_TEST_ID_PREFIX}-contact-name-${record.id}`}
                              >
                                {`${record.contactFirstName || ""} ${
                                  record.contactLastName || ""
                                }`.trim()}
                              </span>
                            ) : (
                              <span className="gba:text-sm gba:font-medium">
                                {`${record.contactFirstName || ""} ${
                                  record.contactLastName || ""
                                }`.trim()}
                              </span>
                            )}
                          </div>
                        )}
                        {record.email && (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiEnvelope size={14} className="gba:text-gray-400" />
                            <a
                              href={`mailto:${record.email}`}
                              className="gba:text-sm gba:text-blue-600 hover:gba:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {record.email}
                            </a>
                          </div>
                        )}
                        {record.phone && (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiPhone size={14} className="gba:text-gray-400" />
                            <a
                              href={`tel:${record.phone}`}
                              className="gba:text-sm gba:text-blue-600 hover:gba:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {record.phone}
                            </a>
                          </div>
                        )}
                        {!record.contactFirstName &&
                          !record.contactLastName &&
                          !record.email &&
                          !record.phone && (
                            <span className="gba:text-gray-400">-</span>
                          )}
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible('created') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-created-cell-${record.id}`}
                    >
                      {record.createdAt ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiCalendar size={16} className="gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {dayjs(record.createdAt).format("MMM DD, YYYY")}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('owner') && (
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
                  {isColumnVisible('legalForm') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-legal-form-cell-${record.id}`}
                    >
                      <Badge variant={getAccountTypeBadgeVariant(record.type)}>
                        {record.type?.value || "-"}
                      </Badge>
                    </TableCell>
                  )}
                  {isColumnVisible('industry') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-industry-cell-${record.id}`}
                    >
                      <Badge variant={getIndustryBadgeVariant(record.industry)}>
                        {record.industry?.value || "-"}
                      </Badge>
                    </TableCell>
                  )}
                  {isColumnVisible('annualRevenue') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-annual-revenue-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCurrencyDollar size={14} className="gba:text-green-600" />
                        <span className="gba:text-sm gba:font-medium">
                          {record.annualRevenue || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible('country') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-country-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiFlag size={14} className="gba:text-blue-600" />
                        <span className="gba:text-sm">
                          {record.billingCountry || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible('employees') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-employees-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiUsers size={14} className="gba:text-purple-600" />
                        <span className="gba:text-sm gba:font-medium">
                          {record.numberOfEmployees || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible('website') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-website-cell-${record.id}`}
                    >
                      {record.website ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiGlobe size={14} className="gba:text-blue-600" />
                          <a
                            href={record.website.startsWith('http') ? record.website : `https://${record.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gba:text-sm gba:text-blue-600 hover:gba:underline gba:max-w-[200px] gba:truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {record.website}
                          </a>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('region') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-region-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiSignpost size={14} className="gba:text-orange-600" />
                        <span className="gba:text-sm">
                          {record.region || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible('city') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-city-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiMapPin size={14} className="gba:text-green-600" />
                        <span className="gba:text-sm">
                          {record.city || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible('foundationDate') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-foundation-date-cell-${record.id}`}
                    >
                      {record.foundationDate ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiCalendar size={14} className="gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {dayjs(record.foundationDate).format("MMM DD, YYYY")}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('phone') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-phone-cell-${record.id}`}
                    >
                      {record.phone ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiPhone size={14} className="gba:text-blue-600" />
                          <a
                            href={`tel:${record.phone}`}
                            className="gba:text-sm gba:text-blue-600 hover:gba:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {record.phone}
                          </a>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('email') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-email-cell-${record.id}`}
                    >
                      {record.email ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiEnvelope size={14} className="gba:text-green-600" />
                          <a
                            href={`mailto:${record.email}`}
                            className="gba:text-sm gba:text-blue-600 hover:gba:underline gba:max-w-[200px] gba:truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {record.email}
                          </a>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('fax') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-fax-cell-${record.id}`}
                    >
                      {record.fax ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiPrinter size={14} className="gba:text-gray-600" />
                          <span className="gba:text-sm">
                            {record.fax}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('actions') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`${DATA_TEST_ID_PREFIX}-update-account-button-${record.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.accountEntity]}
                          externalContextData={{
                            accountId: record.id,
                          }}
                          prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-account`}
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
          )} of ${total} accounts`}
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
