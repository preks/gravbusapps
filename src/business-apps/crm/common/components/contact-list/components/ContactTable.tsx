import React, { useCallback } from 'react';
import { DataTable, Avatar, Button, Tag } from '@newwork/gravity-ui-catalog';
import { PiUser, PiEnvelope, PiPhone, PiLinkedinLogo, PiBuilding } from 'react-icons/pi';
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

  // Get sort order for column
  const getSortOrder = (columnField: string) => {
    // Show indicator only if this column is currently being sorted and we're not in the cleared state
    if (sortField === columnField && sortOrder !== '') {
      return sortOrder === 'ASC' ? 'ascend' : 'descend';
    }
    return false;
  };

  // Handle row click
  const handleRowClick = useCallback((record: Contact) => {
    // Navigate to contact record page
    const url = buildPlatformUrl('/platform/crm/contact-record', { contactId: record.id });
    navigateTo(url);
    
    // Also call the selection callback if provided
    onSelectContact?.(record);
  }, [onSelectContact]);

  // Handle table change
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    const targetPage = pagination.current ?? 1;
    const targetPageSize = pagination.pageSize ?? 20;
    
    if (pagination.current !== currentPage || pagination.pageSize !== pageSize) {
      onPaginationChange(targetPage, targetPageSize);
    }
  };

  // Handle sorting change
  const handleSorterChange = (sorter: any) => {
    if (sorter.field && sorter.order) {
      const field = Array.isArray(sorter.field) ? sorter.field[0] : sorter.field;
      const order = sorter.order === 'ascend' ? 'ASC' : 'DESC';
      
      if (field !== sortField || order !== sortOrder) {
        onSortingChange(field, order);
      }
    } else {
      // Sort order is null - clear sorting (3-state behavior)
      if (sortField !== '' || sortOrder !== '') {
        onSortingChange('', '');
      }
    }
  };

  const columns = [
    {
      title: 'Contact',
      dataIndex: 'firstName',
      key: 'firstName',
      sorter: true,
      sortOrder: getSortOrder('firstName'),
      width: '30%',
      render: (_: any, record: Contact) => (
        <div className="gba:flex gba:items-center gba:gap-3">
          <Avatar 
            src={record.ownerEmployee?.pictureThumbnail} 
            fallback={<PiUser />}
            size="sm"
          />
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
      )
    },
    {
      title: 'Contact Info',
      dataIndex: 'email',
      key: 'email',
      sorter: true,
      sortOrder: getSortOrder('email'),
      width: '25%',
      render: (_: any, record: Contact) => (
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
              <PiLinkedinLogo className="gba:text-blue-500" />
              <span className="gba:text-blue-500">LinkedIn</span>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Account',
      dataIndex: 'account',
      key: 'account',
      width: '20%',
      render: (_: any, record: Contact) => 
        record.account ? (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiBuilding className="gba:text-gray-400" />
            <div className="gba:text-sm gba:font-medium">{record.account.name}</div>
          </div>
        ) : (
          <span className="gba:text-gray-400 gba:text-sm">No account</span>
        )
    },
    {
      title: 'Type & Role',
      dataIndex: 'contactType',
      key: 'contactType',
      width: '15%',
      render: (_: any, record: Contact) => (
        <div className="gba:space-y-1">
          {record.contactType && (
            <Tag 
              color="blue"
              className="gba:px-3 gba:py-1 gba:text-sm gba:font-medium gba:flex gba:items-center gba:justify-center gba:min-h-[24px]"
            >
              {record.contactType}
            </Tag>
          )}
          {record.contactRole && (
            <Tag 
              color="green"
              className="gba:px-3 gba:py-1 gba:text-sm gba:font-medium gba:flex gba:items-center gba:justify-center gba:min-h-[24px]"
            >
              {record.contactRole}
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'Owner',
      dataIndex: 'ownerEmployee',
      key: 'owner',
      width: '15%',
      render: (_: any, record: Contact) => 
        record.ownerEmployee ? (
          <div className="gba:text-sm">
            {record.ownerEmployee.displayName || 
             `${record.ownerEmployee.firstName} ${record.ownerEmployee.lastName}` ||
             'Unknown'}
          </div>
        ) : (
          <span className="gba:text-gray-400">Unassigned</span>
        )
    }
  ];

  return (
    <DataTable
      dataSource={contacts}
      columns={columns}
      loading={loading}
      onChange={handleTableChange}
      onSorterChange={handleSorterChange}
      onRow={(record) => ({
        onClick: () => handleRowClick(record as Contact),
        className: selectedContactId === (record as Contact).id ? 'gba:bg-blue-50' : '',
        style: { cursor: 'pointer' }
      })}
      sorter={
        // Only set sorter if we have an active sort field and order
        sortField && sortOrder 
          ? {
              field: sortField,
              order: sortOrder === 'ASC' ? 'ascend' : 'descend'
            }
          : undefined
      }
      pagination={{
        current: currentPage,
        pageSize,
        total,
        showQuickJumper: true,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100]
      }}
      rowKey="id"
      selectedRowKeys={selectedContactId ? [selectedContactId] : []}
      scroll={{ x: 800 }}
      data-testid={`${DATA_TEST_ID_PREFIX}-table`}
    />
  );
};

export default ContactTable; 