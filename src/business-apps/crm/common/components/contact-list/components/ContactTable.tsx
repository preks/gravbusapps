import React, { useCallback } from "react";
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
}

const DATA_TEST_ID_PREFIX = "ContactTable";

const ContactTable: React.FC<ContactTableProps> = ({
  contacts,
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
  onSelectContact,
  onPaginationChange,
  onSortingChange,
  selectedContactId,
  onEdit,
  accessToken,
  sourceApp,
}) => {
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
                <TableHead
                  className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                >
                  ACTIONS
                </TableHead>
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
                <TableHead
                  className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-contact-info-header`}
                >
                  Contact Info
                </TableHead>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((record) => (
                <TableRow
                  key={record.id}
                  className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${
                    selectedContactId === record.id ? "gba:bg-blue-50" : ""
                  }`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                >
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}
                  >
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <AppActionButton
                        data-testid={`${DATA_TEST_ID_PREFIX}-update-contact-button-${record.id}`}
                        variant="secondary"
                        contextsArray={[FlowContextName.contactEntity]}
                        externalContextData={{
                          contactId: record.id,
                        }}
                        prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-contact`}
                        accessToken={accessToken}
                        emptyStateBehavior="disable"
                        deferMainContextRequestsUntilClick
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>
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

                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-owner-cell-${record.id}`}
                  >
                    {record.ownerEmployee ? (
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
                    ) : (
                      <span className="gba:text-gray-400 gba:text-sm">
                        No owner
                      </span>
                    )}
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
