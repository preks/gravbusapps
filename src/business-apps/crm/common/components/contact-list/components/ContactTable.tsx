import React from 'react';
import { Contact } from '../types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Table, Tag, Avatar, Space, Button } from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined,
  LinkedinOutlined,
  EditOutlined,
  EyeOutlined
} from '@ant-design/icons';

interface ContactTableProps extends BusinessAppContextProps {
  contacts: Contact[];
  loading: boolean;
  total: number;
  pageSize: number;
  currentPage: number;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  onRowClick: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onSort: (field: string, order: 'ASC' | 'DESC') => void;
  onPageChange: (page: number, size: number) => void;
}

const ContactTable: React.FC<ContactTableProps> = ({
  contacts,
  loading,
  total,
  pageSize,
  currentPage,
  sortField,
  sortOrder,
  onRowClick,
  onEdit,
  onSort,
  onPageChange
}) => {
  const columns = [
    {
      title: 'Contact',
      key: 'name',
      sortable: true,
      sorterField: 'firstName',
      width: '25%',
      render: (contact: Contact) => (
        <div className="gba:flex gba:items-center gba:gap-3">
          <Avatar 
            src={contact.ownerEmployee?.pictureThumbnail} 
            icon={<UserOutlined />}
            size="small"
          />
          <div>
            <div className="gba:font-medium">
              {contact.academicTitle?.value && (
                <span className="gba:text-gray-500 gba:mr-1">
                  {contact.academicTitle.value}
                </span>
              )}
              {contact.firstName} {contact.lastName}
            </div>
            {contact.jobTitle && (
              <div className="gba:text-sm gba:text-gray-500">
                {contact.jobTitle}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Contact Information',
      key: 'contact_info',
      width: '25%',
      render: (contact: Contact) => (
        <div className="gba:space-y-1">
          {contact.email && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
              <MailOutlined className="gba:text-gray-400" />
              <span className="gba:truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
              <PhoneOutlined className="gba:text-gray-400" />
              <span>{contact.phone}</span>
            </div>
          )}
          {contact.linkedinUrl && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
              <LinkedinOutlined className="gba:text-blue-500" />
              <span className="gba:text-blue-500">LinkedIn</span>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Account',
      key: 'account',
      width: '20%',
      render: (contact: Contact) => 
        contact.account ? (
          <div>
            <div className="gba:font-medium">{contact.account.name}</div>
          </div>
        ) : (
          <span className="gba:text-gray-400">No account</span>
        )
    },
    {
      title: 'Type & Role',
      key: 'type_role',
      width: '15%',
      render: (contact: Contact) => (
        <div className="gba:space-y-1">
          {contact.contactType && (
            <Tag color="blue">{contact.contactType}</Tag>
          )}
          {contact.contactRole && (
            <Tag color="green">{contact.contactRole}</Tag>
          )}
        </div>
      )
    },
    {
      title: 'Owner',
      key: 'owner',
      width: '15%',
      render: (contact: Contact) => 
        contact.ownerEmployee ? (
          <div className="gba:text-sm">
            {contact.ownerEmployee.displayName || 
             `${contact.ownerEmployee.firstName} ${contact.ownerEmployee.lastName}` ||
             'Unknown'}
          </div>
        ) : (
          <span className="gba:text-gray-400">Unassigned</span>
        )
    }
  ];

  const handleSort = (column: any) => {
    if (column.sortable && column.sorterField) {
      const newOrder = sortField === column.sorterField && sortOrder === 'ASC' ? 'DESC' : 'ASC';
      onSort(column.sorterField, newOrder);
    }
  };

  const handleRowAction = (action: string, contact: Contact) => {
    switch (action) {
      case 'view':
        onRowClick(contact);
        break;
      case 'edit':
        onEdit(contact);
        break;
    }
  };

  const actionButtons = (contact: Contact) => (
    <Space>
      <Button
        size="small"
        icon={<EyeOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          handleRowAction('view', contact);
        }}
        data-testid={`contact-table-view-${contact.id}`}
      >
        View
      </Button>
      <Button
        size="small"
        icon={<EditOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          handleRowAction('edit', contact);
        }}
        data-testid={`contact-table-edit-${contact.id}`}
      >
        Edit
      </Button>
    </Space>
  );

  return (
    <Table<Contact>
      dataSource={contacts}
      columns={columns.map(col => ({
        ...col,
        dataIndex: col.key,
        onHeaderCell: () => ({
          onClick: () => handleSort(col)
        }),
        render: (_, record: Contact) => col.render ? col.render(record) : (record as any)[col.key]
      }))}
      loading={loading}
      rowKey="id"
      pagination={{
        current: currentPage,
        pageSize,
        total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} contacts`,
        onChange: onPageChange,
        onShowSizeChange: onPageChange
      }}
      onRow={(record: Contact) => ({
        onClick: () => onRowClick(record),
        style: { cursor: 'pointer' }
      })}
      locale={{ emptyText: 'No contacts found' }}
      data-testid="contact-table"
    />
  );
};

export default ContactTable; 