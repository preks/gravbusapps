import React, { useCallback } from "react";
import {
  Avatar,
  AvatarFallback,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
  Card,
  CardContent,
  AvatarImage,
} from "@newwork/nw-design-system";
import {
  PiUser,
  PiEnvelope,
  PiPhone,
  PiLinkedinLogo,
  PiBuilding,
  PiArrowUp,
  PiArrowDown,
  PiBriefcase,
  PiGlobe,
} from "react-icons/pi";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { Contact } from "../types";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";

interface ContactTableProps extends BusinessAppContextProps {
  contacts: Contact[];
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
  onSelectContact?: (contact: Contact) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: "ASC" | "DESC" | "") => void;
  selectedContactId?: string;
  onEdit?: (contact: Contact) => void;
  sourceApp?: string;
  visibleColumns: string[];
}

const DATA_TEST_ID_PREFIX = "ContactTable";

const ContactTable: React.FC<ContactTableProps> = ({
  contacts,
  loading,
  error: _error,
  hasMore: _hasMore,
  loadMore: _loadMore,
  loadPage: _loadPage,
  retry: _retry,
  total,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onSelectContact,
  onPaginationChange,
  onSortingChange,
  selectedContactId,
  onEdit: _onEdit,
  accessToken,
  sourceApp,
  visibleColumns,
}) => {
  // Helper function to check if a column is visible
  const isColumnVisible = (columnId: string) => visibleColumns.includes(columnId);

  // Get contact display name
  const getContactName = (contact: Contact) => {
    const title = contact.academicTitle?.value;
    const firstName = contact.firstName || "";
    const lastName = contact.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return title ? `${title} ${fullName}` : fullName || "-";
  };

  // Get owner display name
  const getOwnerName = (contact: Contact) => {
    if (contact.ownerEmployee?.displayName) {
      return contact.ownerEmployee.displayName;
    }
    if (contact.ownerEmployee?.firstName || contact.ownerEmployee?.lastName) {
      return `${contact.ownerEmployee.firstName || ""} ${
        contact.ownerEmployee.lastName || ""
      }`.trim();
    }
    return "-";
  };

  const handleRowClick = useCallback(
    (record: Contact) => {
      console.log("🔍 Contact clicked:", {
        id: record.id,
        name: `${record.firstName} ${record.lastName}`,
        sourceApp,
      });

      // Determine source based on sourceApp
      const source =
        sourceApp === "investment-relations" || sourceApp === "IRM"
          ? "investments"
          : "customer-relations";

      // Navigate to contact record page
      const url = buildPlatformUrl("/platform/crm/contact-record", {
        contactId: record.id,
        source: source,
      });
      
      console.log("🔗 Navigating to URL:", url);
      navigateTo(url);

      // Also call the selection callback if provided
      onSelectContact?.(record);
    },
    [onSelectContact, sourceApp]
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
                {isColumnVisible('name') && (
                  <TableHead
                    className="gba:w-[30%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("firstName")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-contact-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Contact
                      {renderSortIcon("firstName")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('contact') && (
                  <TableHead
                    className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("email")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-contact-info-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Contact Info
                      {renderSortIcon("email")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('company') && (
                  <TableHead
                    className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("accountId")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-account-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Account
                      {renderSortIcon("accountId")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('department') && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("department")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-department-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Department
                      {renderSortIcon("department")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('type') && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("contactType")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-type-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Type
                      {renderSortIcon("contactType")}
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
                      Creation Date
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
                      Owner
                      {renderSortIcon("ownerEmployeeId")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('academicTitle') && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("academicTitle")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-academic-title-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Academic Title
                      {renderSortIcon("academicTitle")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('birthDate') && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("birthDate")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-birth-date-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Birth Date
                      {renderSortIcon("birthDate")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('account') && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("accountId")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-account-detail-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Account
                      {renderSortIcon("accountId")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('linkedin') && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("linkedinUrl")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-linkedin-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      LinkedIn Profile
                      {renderSortIcon("linkedinUrl")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('xing') && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("xingUrl")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-xing-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Xing Profile
                      {renderSortIcon("xingUrl")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible('jobTitle') && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("jobTitle")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-job-title-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Job Title
                      {renderSortIcon("jobTitle")}
                    </div>
                  </TableHead>
                )}
                
                <TableHead
                  className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                >
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((record) => (
                <TableRow
                  key={record.id}
                  className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer ${
                    selectedContactId === record.id ? "gba:bg-blue-50" : ""
                  }`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                  onClick={() => handleRowClick(record)}
                >
                  {isColumnVisible('name') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-contact-cell-${record.id}`}
                    >
                    <div
                      className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(record);
                      }}
                      data-testid={`${DATA_TEST_ID_PREFIX}-contact-name-${record.id}`}
                    >
                      <Avatar size="sm">
                        {record.pictureUrl && (
                          <AvatarImage
                            src={record.pictureUrl}
                            alt={getContactName(record)}
                          />
                        )}
                        <AvatarFallback>
                          {getContactName(record) !== "-"
                            ? getContactName(record)
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="gba:font-medium gba:text-sm">
                          {getContactName(record)}
                        </div>
                        {record.jobTitle && (
                          <div className="gba:text-xs gba:text-gray-500">
                            {record.jobTitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  )}
                  {isColumnVisible('contact') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-contact-info-cell-${record.id}`}
                    >
                    <div className="gba:space-y-1">
                      {record.email && (
                        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                          <PiEnvelope className="gba:text-gray-400" />
                          <span className="gba:truncate" title={record.email}>
                            {record.email}
                          </span>
                        </div>
                      )}
                      {record.phone && (
                        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                          <PiPhone className="gba:text-gray-400" />
                          <span>{record.phone}</span>
                        </div>
                      )}
                      {record.linkedinUrl && (
                        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                          <PiLinkedinLogo className="gba:text-blue-600" />
                          <a
                            href={record.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gba:text-blue-600 hover:gba:underline gba:truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            LinkedIn
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  )}
                  {isColumnVisible('company') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-account-cell-${record.id}`}
                    >
                    {record.account ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiBuilding className="gba:text-gray-400" />
                        <span
                          className="gba:text-sm gba:font-medium gba:cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!record.account?.id) return;
                            const source =
                              sourceApp === "investment-relations" ||
                              sourceApp === "IRM"
                                ? "investments"
                                : "customer-relations";
                            const url = buildPlatformUrl(
                              "/platform/crm/account-record",
                              {
                                accountId: record.account.id,
                                source,
                                fromEntity: "contacts",
                              }
                            );
                            console.log(
                              "Navigating from contacts to account:",
                              url
                            );
                            navigateTo(url);
                          }}
                          data-testid={`${DATA_TEST_ID_PREFIX}-account-name-${record.id}`}
                        >
                          {record.account.name}
                        </span>
                      </div>
                    ) : (
                      <span className="gba:text-gray-400 gba:text-sm">
                        No account
                      </span>
                    )}
                  </TableCell>
                  )}
                  {isColumnVisible('department') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-department-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center">
                        <span className="gba:text-sm gba:truncate" title={record.department}>
                          {record.department
                            ? record.department.charAt(0).toUpperCase() + record.department.slice(1)
                            : "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {/* Role cell removed */}
                  {isColumnVisible('type') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-type-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiUser size={14} className="gba:text-green-600" />
                        <span className="gba:text-sm gba:truncate" title={record.contactType}>
                          {record.contactType || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible('created') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-created-cell-${record.id}`}
                    >
                      <span className="gba:text-sm gba:text-gray-600">
                        {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "-"}
                      </span>
                    </TableCell>
                  )}
                  {isColumnVisible('owner') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-owner-cell-${record.id}`}
                    >
                    {record.ownerEmployee ? (
                      <div
                        className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group"
                        onClick={(e) => {
                          e.stopPropagation();
                          const empId = record.ownerEmployee?.id;
                          if (empId) {
                            navigateTo(`/platform/employee-record?employeeId=${empId}`);
                          }
                        }}
                      >
                        <Avatar size="sm" className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full">
                          {record.ownerEmployee?.pictureThumbnail && (
                            <AvatarImage
                              src={`data:image/gif;base64,${record.ownerEmployee.pictureThumbnail}`}
                              alt={getOwnerName(record)}
                              className="gba:object-cover gba:object-center"
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
                    ) : (
                      <span className="gba:text-gray-400 gba:text-sm">No owner</span>
                    )}
                  </TableCell>
                  )}
                  {isColumnVisible('academicTitle') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-academic-title-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiUser size={14} className="gba:text-indigo-600" />
                        <span className="gba:text-sm gba:truncate" title={record.academicTitle?.value}>
                          {record.academicTitle?.value || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible('birthDate') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-birth-date-cell-${record.id}`}
                    >
                      <span className="gba:text-sm gba:text-gray-600">
                        {record.birthDate ? new Date(record.birthDate).toLocaleDateString() : "-"}
                      </span>
                    </TableCell>
                  )}
                  {isColumnVisible('account') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-account-detail-cell-${record.id}`}
                    >
                      {record.account ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiBuilding size={14} className="gba:text-gray-600" />
                          <span className="gba:text-sm gba:truncate" title={record.account.name}>
                            {record.account.name}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400 gba:text-sm">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('linkedin') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-linkedin-cell-${record.id}`}
                    >
                      {record.linkedinUrl ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiLinkedinLogo size={14} className="gba:text-blue-600" />
                          <a
                            href={record.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gba:text-blue-600 gba:hover:underline gba:text-sm gba:truncate"
                            title={record.linkedinUrl}
                          >
                            LinkedIn
                          </a>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400 gba:text-sm">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('xing') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-xing-cell-${record.id}`}
                    >
                      {record.xingUrl ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiGlobe size={14} className="gba:text-green-600" />
                          <a
                            href={record.xingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gba:text-green-600 gba:hover:underline gba:text-sm gba:truncate"
                            title={record.xingUrl}
                          >
                            Xing
                          </a>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400 gba:text-sm">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('jobTitle') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-job-title-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiBriefcase size={14} className="gba:text-purple-600" />
                        <span className="gba:text-sm gba:truncate" title={record.jobTitle}>
                          {record.jobTitle || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <AppActionButton
                        data-testid={`${DATA_TEST_ID_PREFIX}-update-contact-button-${record.id}`}
                        size="icon"
                        contextsArray={[FlowContextName.contactEntity]}
                        externalContextData={{
                          contactId: record.id,
                        }}
                        prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-contact`}
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
      <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4">
        <div className="gba:text-sm gba:text-muted-foreground">
          {`${(currentPage - 1) * pageSize + 1}-${Math.min(
            currentPage * pageSize,
            total
          )} of ${total} contacts`}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
          <div className="gba:flex gba:items-center gba:space-x-2">
            <p className="gba:text-sm gba:font-medium">Rows per page</p>
            <select
              value={pageSize}
              onChange={(e) => onPaginationChange(1, Number(e.target.value))}
              className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium">
            Page {currentPage} of {Math.ceil(total / pageSize)}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2">
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(1)}
              disabled={currentPage === 1}
            >
              <span className="gba:sr-only">Go to first page</span>
              ⟨⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="gba:sr-only">Go to previous page</span>⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(total / pageSize)}
            >
              <span className="gba:sr-only">Go to next page</span>⟩
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(Math.ceil(total / pageSize))}
              disabled={currentPage >= Math.ceil(total / pageSize)}
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

export default ContactTable;
