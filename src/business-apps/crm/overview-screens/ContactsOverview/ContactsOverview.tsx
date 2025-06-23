import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Input, 
  Button, 
  Typography, 
  Card,
  Row, 
  Col, 
  Grid,
  Spin,
  message,
  Modal,
  Dropdown,
  Menu,
  List,
  Empty,
  Badge
} from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface';
import { 
  SearchOutlined, 
  PlusOutlined, 
  MoreOutlined,
  ArrowUpOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkedinOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { useContactsData, Contact } from './hooks/useContactsData';
import { BusinessAppContextProps } from '../../../types';
import { ContactProfile } from '../ContactProfile/ContactProfile';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

interface ExtendedContact extends Contact {
  key: string;
  fullName: string;
  company: string;
  position?: string;
  version?: number;
  status?: 'active' | 'inactive';
  relatedOpportunities?: Array<{
    id: string;
    name: string;
    stage: string;
    value: number;
  }>;
  isPrimary?: boolean;
  lastUpdated?: string;
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease';
  iconBackground: string;
  iconColor: string;
}

export function ContactsOverview({ accessToken, employeeId }: BusinessAppContextProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>();
  const [isContactProfileVisible, setIsContactProfileVisible] = useState(false);
  const [isNewContact, setIsNewContact] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const screens = useBreakpoint();
  const [isMobile, setIsMobile] = useState(false);
  const [contacts, setContacts] = useState<ExtendedContact[]>([]);
  
  useEffect(() => {
    setIsMobile(!screens.md);
  }, [screens]);
  
  const { contacts: contactsData, metrics: metricsData, loading, error, refetch: refetchContacts } = useContactsData(accessToken);
  console.log(contactsData)
  useEffect(() => {
    if (contactsData && contactsData.length > 0) {
      setContacts(contactsData.map(contact => ({
        ...contact,
        key: contact.id,
        fullName: `${contact.firstName} ${contact.lastName}`,
        position: contact.jobTitle || '',
        isPrimary: false,
        lastUpdated: contact.updatedAt,
        jobTitle: contact.jobTitle || '',
        status: 'active' as const,
        company: contact.account?.name || '',
        relatedOpportunities: []
      })));
    }
  }, [contactsData]);
  
  const metrics: MetricCardProps[] = [
    {
      title: 'Total Contacts',
      value: metricsData.totalContacts.toLocaleString(),
      change: '0% from last month',
      changeType: 'increase',
      icon: <UserOutlined />,
      iconBackground: '#e6f7ff',
      iconColor: '#1890ff'
    },
    {
      title: 'Email Engagement',
      value: '0%',
      change: '0% from last month',
      changeType: 'increase',
      icon: <MailOutlined />,
      iconBackground: '#e6f7ff',
      iconColor: '#1890ff'
    },
    {
      title: 'Call Activity',
      value: '0',
      change: '0% from last month',
      changeType: 'increase',
      icon: <PhoneOutlined />,
      iconBackground: '#f9f0ff',
      iconColor: '#722ed1'
    },
    {
      title: 'Meetings Scheduled',
      value: '0',
      change: '0% from last month',
      changeType: 'increase',
      icon: <CalendarOutlined />,
      iconBackground: '#f6ffed',
      iconColor: '#52c41a'
    }
  ];

  const formatTimeDifference = (dateString: string | undefined, isCreatedAt: boolean = false) => {
    if (!dateString) return 'Unknown';
    
    try {
      const now = new Date();
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      if (diffInSeconds <= 0) {
        return `1 second ago${isCreatedAt ? '' : ''}`;
      }
      return `${diffInSeconds} ${diffInSeconds === 1 ? 'second' : 'seconds'} ago${isCreatedAt ? '' : ''}`;
    }  
      
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago${isCreatedAt ? '' : ''}`;
      }
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago${isCreatedAt ? '' : ''}`;
      }
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago${isCreatedAt ? '' : ''}`;
      }
      
      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) {
        return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago${isCreatedAt ? '' : ''}`;
      }
      
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) {
        return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago${isCreatedAt ? '' : ''}`;
      }
      
      const diffInYears = Math.floor(diffInDays / 365);
      return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago${isCreatedAt ? '' : ''}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };
  
  const getFullName = (contact: ExtendedContact): string => {
    return `${contact.firstName} ${contact.lastName}`;
  };
  
  const handleRowClick = (record: ExtendedContact) => {
    if (record && record.id) {
      setSelectedContactId(record.id);
      setIsContactProfileVisible(true);
      setIsNewContact(false);
      setIsEditMode(false);
    } else {
      message.error('Contact ID not found');
    }
  };
  
  const handleContactProfileBack = () => {
    setIsContactProfileVisible(false);
    setSelectedContactId(undefined);
    setIsNewContact(false);
    setIsEditMode(false);
  };
  
  const handleAddContact = () => {
    setIsNewContact(true);
    setIsEditMode(true);
    setIsContactProfileVisible(true);
    setSelectedContactId(undefined);
  };
  
  const handleDeleteContact = async (contact: ExtendedContact) => {
    if (!contact || !contact.id) {
      message.error('Cannot delete: Contact information is missing');
      return;
    }
    
    try {
      setIsDeletingContact(true);
      
      const deletePayload = {
        changeMode: "DELETE",
        contact: {
          id: contact.id,
          version: contact.version
        }
      };
      
      const response = await fetch('https://newwork-dev.newwork.com/processes/customer-relations/saveContact', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deletePayload)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete contact: ${response.statusText}`);
      }
      
      message.success('Contact deleted successfully');
      
      refetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      message.error(`Failed to delete contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeletingContact(false);
    }
  };
  
  const columns = [
    {
      title: 'Full Name',
      key: 'fullName',
      sorter: (a: ExtendedContact, b: ExtendedContact) => a.firstName.localeCompare(b.firstName),
      render: (_: any, record: ExtendedContact) => {
        const name = getFullName(record);
        return (
          <div>
            {name || '-'}
            {record.isPrimary && (
              <Badge
                count='Primary'
                style={{ backgroundColor: '#52c41a', marginLeft: 8 }}
              />
            )}
          </div>
        );
      },
    },
    {
      title: 'Job Title',
      dataIndex: 'position',
      key: 'position',
      sorter: (a: ExtendedContact, b: ExtendedContact) => (a.position || '').localeCompare(b.position || ''),
      responsive: ['md'] as ('md')[],
      render: (position: string) => position || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a: ExtendedContact, b: ExtendedContact) => (a.email || '').localeCompare(b.email || ''),
      render: (email: string) => {
        return email ? <a href={`mailto:${email}`}>{email}</a> : '-';
      },
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      sorter: (a: ExtendedContact, b: ExtendedContact) => (a.phone || '').localeCompare(b.phone || ''),
      render: (phone: string) => {
        return phone ? <a href={`tel:${phone}`}>{phone}</a> : '-';
      },
      responsive: ['md'] as ('md')[],
    },
    {
      title: 'Account',
      dataIndex: 'company',
      key: 'company',
      sorter: (a: ExtendedContact, b: ExtendedContact) => (a.company || '').localeCompare(b.company || ''),
      responsive: ['md'] as ('md')[],
      render: (company: string) => company || '-',
    },
    {
      title: 'Owner',
      key: 'owner',
      render: (_: any, record: ExtendedContact) => record.ownerEmployee?.fullName || '-',
      sorter: (a: ExtendedContact, b: ExtendedContact) => (a.ownerEmployee?.fullName || '').localeCompare(b.ownerEmployee?.fullName || ''),
      responsive: ['lg'] as ('lg')[],
    },
    {
      title: 'Social',
      key: 'social',
      render: (_: any, record: ExtendedContact) => {
        const hasSocial = record.linkedinUrl || record.xingUrl;
        return hasSocial ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {record.linkedinUrl && (
              <a href={record.linkedinUrl} target='_blank' rel='noopener noreferrer'>
                <LinkedinOutlined style={{ fontSize: 18, color: '#0077B5' }} />
              </a>
            )}
            {record.xingUrl && (
              <a href={record.xingUrl} target='_blank' rel='noopener noreferrer'>
                <GlobalOutlined style={{ fontSize: 18, color: '#006567' }} />
              </a>
            )}
          </div>
        ) : '-';
      },
      responsive: ['md'] as ('md')[],
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      sorter: (a: ExtendedContact, b: ExtendedContact) => {
        if (!a.lastUpdated) return -1;
        if (!b.lastUpdated) return 1;
        return new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
      },
      render: (date: string | undefined, record: ExtendedContact) => {
        if (!date) return '-';
        const isCreatedDate = !record.updatedAt && record.createdAt === date;
        return formatTimeDifference(date, isCreatedDate);
      },
      responsive: ['md'] as ('md')[],
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: ExtendedContact) => (
        <Dropdown
          overlay={
            <Menu
              items={[
                {
                  key: '1',
                  icon: <EditOutlined />,
                  label: 'Edit',
                  onClick: (info: MenuInfo) => {
                    info.domEvent.stopPropagation();
                    
                    setTimeout(() => {
                      setSelectedContactId(record.id);
                      setIsContactProfileVisible(true);
                      setIsNewContact(false);
                      setIsEditMode(true);
                    }, 0);
                  }
                },
                {
                  key: '2',
                  icon: <DeleteOutlined />,
                  onClick: (info: MenuInfo) => {
                    info.domEvent.stopPropagation();
                    
                    Modal.confirm({
                      title: 'Delete Contact',
                      content: 'Are you sure you want to delete this contact? This action cannot be undone.',
                      okText: 'Delete',
                      okType: 'danger',
                      cancelText: 'Cancel',
                      okButtonProps: { loading: isDeletingContact },
                      onOk: () => {
                        setTimeout(() => handleDeleteContact(record), 0);
                      },
                      maskClosable: true,
                    });
                  },
                  label: 'Delete',
                  danger: true
                }
              ]}
            />
          }
          trigger={['click']}
          placement='bottomRight'
        >
          <Button type='text' icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      ),
    },
  ];

  const MetricCard: React.FC<MetricCardProps> = ({ 
    icon, 
    title, 
    value, 
    change, 
    changeType,
    iconBackground,
    iconColor
  }) => {
    return (
      <Card bordered={true} style={{ height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              backgroundColor: iconBackground,
              marginRight: 16
            }}
          >
            <span style={{ color: iconColor, fontSize: 20 }}>{icon}</span>
          </div>
          <div>
            <Text type='secondary'>{title}</Text>
            <div>
              <Title level={3} style={{ margin: '4px 0' }}>{value}</Title>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {changeType === 'increase' && (
                  <ArrowUpOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                )}
                <Text style={{ color: changeType === 'increase' ? '#52c41a' : '#ff4d4f', fontSize: 12 }}>
                  {change}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };


  const filteredContacts = contacts
    .filter(contact => {
      if (!searchText.trim()) {
        return true;
      }
      
      const query = searchText.toLowerCase().trim();
      
      const fullName = getFullName(contact).toLowerCase();
      const firstName = (contact.firstName || '').toLowerCase();
      const lastName = (contact.lastName || '').toLowerCase();
      
      const email = (contact.email || '').toLowerCase();
      
      const company = (contact.company || '').toLowerCase();
      
      const phone = (contact.phone || '').toLowerCase();
      
      return fullName.includes(query) ||
             firstName.includes(query) ||
             lastName.includes(query) ||
             email.includes(query) ||
             company.includes(query) ||
             phone.includes(query);
    })
    // Sort contacts by creation date (newest first)
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });

  const renderContactCard = (contact: ExtendedContact) => (
    <List.Item 
      key={contact.id}
      onClick={() => handleRowClick(contact)}
      style={{ cursor: 'pointer' }}
    >
      <Card style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>{getFullName(contact) || '-'}</span>
              {contact.isPrimary && (
                <Badge
                  count='Primary'
                  style={{ backgroundColor: '#52c41a', marginLeft: 8 }}
                />
              )}
            </div>
            <div style={{ marginBottom: 4 }}>{contact.position || '-'}</div>
            <div style={{ marginBottom: 4 }}>
              {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : '-'}
            </div>
            <div style={{ marginBottom: 4 }}>
              {contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : '-'}
            </div>
            <div style={{ marginBottom: 4 }}>{contact.company || '-'}</div>
            <div style={{ marginBottom: 4 }}>Owner: {contact.ownerEmployee?.fullName || '-'}</div>
            <div style={{ marginBottom: 4 }}>Last updated: {contact.lastUpdated ? formatTimeDifference(contact.lastUpdated) : '-'}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {contact.linkedinUrl && (
                <a href={contact.linkedinUrl} target='_blank' rel='noopener noreferrer'>
                  <LinkedinOutlined style={{ fontSize: 18, color: '#0077B5' }} />
                </a>
              )}
              {contact.xingUrl && (
                <a href={contact.xingUrl} target='_blank' rel='noopener noreferrer'>
                  <GlobalOutlined style={{ fontSize: 18, color: '#006567' }} />
                </a>
              )}
            </div>
          </div>
          <Dropdown
            overlay={
              <Menu
                items={[
                  {
                    key: '1',
                    icon: <EditOutlined />,
                    label: 'Edit',
                    onClick: (e) => {
                      e.domEvent.stopPropagation();
                      handleRowClick(contact);
                      setIsEditMode(true);
                    }
                  },
                  {
                    key: '2',
                    icon: <DeleteOutlined />,
                    label: (
                      <span
                        onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                          e.stopPropagation();
                          // Show confirmation modal
                          Modal.confirm({
                            title: 'Delete Contact',
                            content: 'Are you sure you want to delete this contact? This action cannot be undone.',
                            okText: 'Delete',
                            okType: 'danger',
                            cancelText: 'Cancel',
                            okButtonProps: { loading: isDeletingContact },
                            onOk: () => {
                              // Add a small delay to ensure the event doesn't propagate
                              setTimeout(() => handleDeleteContact(contact), 0);
                            },
                            maskClosable: true,
                          });
                        }}
                      >
                        Delete
                      </span>
                    ),
                    danger: true
                  }
                ]}
              />
            }
            trigger={['click']}
            placement='bottomRight'
          >
            <Button type='text' icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
          </Dropdown>
        </div>
      </Card>
    </List.Item>
  );

  return (
    <div style={{ padding: 24 }}>
      {isContactProfileVisible ? (
        <ContactProfile
          accessToken={accessToken}
          employeeId={employeeId}
          contactId={selectedContactId}
          isEditMode={isEditMode}
          isNewContact={isNewContact}
          onBack={handleContactProfileBack}
          onDelete={refetchContacts}
        />
      ) : (
        <>
          {/* Header Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>Contacts</Title>
              <Paragraph type='secondary'>Manage your investor contacts and their information.</Paragraph>
            </div>
            <Button 
              type='primary' 
              icon={<PlusOutlined />} 
              onClick={handleAddContact}
            >
              Add Contact
            </Button>
          </div>

      {/* Metrics Section */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {metrics.map((metric, index) => (
          <Col xs={24} sm={12} lg={6} key={index} style={{ marginBottom: 16 }}>
            <MetricCard {...metric} />
          </Col>
        ))}
      </Row>

      {/* Search and Filter */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <Input
              placeholder='Search by name, email, account, or phone...'
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: 350 }}
            />
          </div>
        </div>
      </Card>

      {/* Contacts Table/List */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '20px' }}>Loading contacts...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
            <div>Error loading contacts: {error.message}</div>
            <Button type="primary" onClick={refetchContacts} style={{ marginTop: '20px' }}>
              Retry
            </Button>
          </div>
        ) : filteredContacts.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description='No contacts found. Try adjusting your filters or add a new contact.'
          />
        ) : isMobile ? (
          <List
            dataSource={filteredContacts}
            renderItem={renderContactCard}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Table
            dataSource={filteredContacts}
            columns={columns}
            rowKey='id'
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' }
            })}
          />
        )}
      </Card>
        </>
      )}
    </div>
  );
}

export default ContactsOverview;
