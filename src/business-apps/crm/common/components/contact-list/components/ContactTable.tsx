import React, { useCallback } from 'react';
import { Avatar, AvatarFallback, Button, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, Spinner } from '@newwork/nw-design-system';
import { PiUser, PiEnvelope, PiPhone, PiLinkedinLogo, PiBuilding, PiCaretUp, PiCaretDown } from 'react-icons/pi';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Contact } from '../types';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

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
  sortOrder: 'ASC' | 'DESC' | '';
  onSelectContact?: (contact: Contact) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void;
  selectedContactId?: string;
  onEdit?: (contact: Contact) => void;
}

const DATA_TEST_ID_PREFIX = 'ContactTable';

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
  accessToken
}) => {
  // Get contact display name
  const getContactName = (contact: Contact) => {
    const title = contact.academicTitle?.value;
    const firstName = contact.firstName || '';
    const lastName = contact.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return title ? `${title} ${fullName}` : fullName || '-';
  };

  // Handle row click
  const handleRowClick = useCallback((record: Contact) => {
    // Navigate to contact record page
    const url = buildPlatformUrl('/platform/crm/contact-record', { contactId: record.id });
    navigateTo(url);
    
    // Also call the selection callback if provided
    onSelectContact?.(record);
  }, [onSelectContact]);

  // Helper function to handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: ASC -> DESC -> clear
      if (sortOrder === 'ASC') {
        onSortingChange(field, 'DESC');
      } else if (sortOrder === 'DESC') {
        onSortingChange('', '');
      } else {
        onSortingChange(field, 'ASC');
      }
    } else {
      onSortingChange(field, 'ASC');
    }
  };

  // Helper function to render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    if (sortOrder === 'ASC') return <PiCaretUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === 'DESC') return <PiCaretDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  };

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {loading && (
        <div className="gba:flex gba:justify-center gba:p-4">
          <Spinner />
        </div>
      )}
      
      <div className="gba:overflow-x-auto">
        <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[60px]"></TableHead>
              <TableHead 
                className="gba:w-[30%] gba:cursor-pointer gba:hover:bg-gray-50"
                onClick={() => handleSort('firstName')}
              >
                Contact
                {renderSortIcon('firstName')}
              </TableHead>
              <TableHead 
                className="gba:w-[25%] gba:cursor-pointer gba:hover:bg-gray-50"
                onClick={() => handleSort('email')}
              >
                Contact Info
                {renderSortIcon('email')}
              </TableHead>
              <TableHead className="gba:w-[20%]">Account</TableHead>
              <TableHead 
                className="gba:w-[15%] gba:cursor-pointer gba:hover:bg-gray-50"
                onClick={() => handleSort('contactType')}
              >
                Type & Role
                {renderSortIcon('contactType')}
              </TableHead>
              <TableHead 
                className="gba:w-[15%] gba:cursor-pointer gba:hover:bg-gray-50"
                onClick={() => handleSort('ownerEmployeeId')}
              >
                Owner
                {renderSortIcon('ownerEmployeeId')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((record) => (
              <TableRow 
                key={record.id}
                className={`gba:hover:bg-gray-50 ${selectedContactId === record.id ? 'gba:bg-blue-50' : ''}`}
              >
                <TableCell>
                  <div className="gba:flex gba:justify-start gba:gap-2">
                    <AppActionButton
                      data-testid={`${DATA_TEST_ID_PREFIX}-update-contact-button-${record.id}`}
                      variant="secondary"
                      contextsArray={[FlowContextName.contactEntity]}
                      externalContextData={{
                        contactId: record.id
                      }}
                      prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-contact`}
                      accessToken={accessToken}
                      emptyStateBehavior="disable"
                      deferMainContextRequestsUntilClick
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div 
                    className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(record);
                    }}
                  >
                    <Avatar size="sm">
                      <AvatarFallback>
                        {getContactName(record) !== '-' 
                          ? getContactName(record).split(' ').map(n => n[0]).join('').toUpperCase()
                          : 'C'}
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
                <TableCell>
                  <div className="gba:space-y-1">
                    {record.email && (
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                        <PiEnvelope className="gba:text-gray-400" />
                        <span className="gba:truncate" title={record.email}>{record.email}</span>
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
                <TableCell>
                  {record.account ? (
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <PiBuilding className="gba:text-gray-400" />
                      <div className="gba:text-sm gba:font-medium">{record.account.name}</div>
                    </div>
                  ) : (
                    <span className="gba:text-gray-400 gba:text-sm">No account</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="gba:space-y-1">
                    {record.contactType && (
                      <Badge className="gba:px-3 gba:py-1 gba:text-sm gba:font-medium gba:flex gba:items-center gba:justify-center gba:min-h-[24px]">
                        {record.contactType}
                      </Badge>
                    )}
                    {record.contactRole && (
                      <Badge className="gba:px-3 gba:py-1 gba:text-sm gba:font-medium gba:flex gba:items-center gba:justify-center gba:min-h-[24px]">
                        {record.contactRole}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {record.ownerEmployee ? (
                    <div className="gba:text-sm gba:font-medium">
                      {record.ownerEmployee.displayName ||
                       `${record.ownerEmployee.firstName} ${record.ownerEmployee.lastName}` ||
                       'Unknown'}
                    </div>
                  ) : (
                    <span className="gba:text-gray-400">Unassigned</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4">
        <div className="gba:text-sm gba:text-muted-foreground">
          {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} of ${total} contacts`}
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
              <span className="gba:sr-only">Go to previous page</span>
              ⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(total / pageSize)}
            >
              <span className="gba:sr-only">Go to next page</span>
              ⟩
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
    </div>
  );
};

export default ContactTable; 