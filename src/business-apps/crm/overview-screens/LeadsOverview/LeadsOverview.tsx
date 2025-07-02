import { useState, useEffect } from 'react';
import { Table, Input, Button, Card, message, Spin, Dropdown, List, Empty, Avatar, Modal, Form, Select, Divider, Row, Col, Typography } from 'antd';
import { Grid } from 'antd';
const { useBreakpoint } = Grid;
import { SearchOutlined, PlusOutlined, EditOutlined, MoreOutlined, CloseCircleOutlined, UserOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PieChartOutlined, TeamOutlined, FieldTimeOutlined, StarOutlined } from '@ant-design/icons';
import relativeTime from 'dayjs/plugin/relativeTime';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

import { useLeadsData } from './hooks/useLeadsData';
import { useAccountsData } from './hooks/useAccountsData';
import { useContactsData } from './hooks/useContactsData';
import { useEmployeesData } from './hooks/useEmployeesData';
import LeadDetails from './LeadDetails';

dayjs.extend(relativeTime);
dayjs.extend(weekday);
dayjs.extend(localeData);

interface BusinessAppContextProps {
  accessToken: string;
  employeeId?: string;
  structureId?: string;
}

const { Title, Paragraph } = Typography;

interface LeadTableItem {
  id: string;
  key?: string;
  selected?: boolean;
  name: string;
  companyName: string;
  contactName: string;
  contactId?: string;
  contactEmail?: string;
  contactPhone?: string;
  ownerName: string;
  ownerId: string;
  ownerAvatar?: string;
  accountId?: string;
  createdAt: string;
  lastActivity?: string;
  tags: string[];
  status: 'active' | 'lost' | 'converted';
  version: number;
  leadSource?: {
    id: string;
    value: string;
  };
  leadStatus?: {
    id: string;
    value: string;
  };
  leadRating?: {
    id: string;
    value: string;
  };
}

interface LeadFormData {
  id?: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  ownerId?: string;
  ownerName?: string;
  contactId?: string;
  accountId?: string;
  createdAt?: string;
  lastActivity?: string;
  version?: number;
}

function LeadsOverviewComponent({ accessToken }: BusinessAppContextProps) {
  // State for UI operations
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>();
  const [isLeadDetailVisible, setIsLeadDetailVisible] = useState(false);
  const [isNewLead, setIsNewLead] = useState<boolean>(false); // Used for new lead creation
  const [editingLead, setEditingLead] = useState<LeadTableItem | undefined>(undefined); // Store the lead being edited
  const [leads, setLeads] = useState<LeadTableItem[]>([]);
  const screens = useBreakpoint();
  const [isMobile, setIsMobile] = useState(false);
  
  // Modal state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form instance
  const [form] = Form.useForm();
  
  // Fetch data for dropdowns
  const { accounts, loading: accountsLoading } = useAccountsData(accessToken);
  const { contacts, loading: contactsLoading } = useContactsData(accessToken);
  const { employees, loading: employeesLoading } = useEmployeesData(accessToken);
  
  useEffect(() => {
    setIsMobile(!screens.md);
  }, [screens]);
  
  // Fetch leads data
  const { 
    leads: leadsData, 
    loading, 
    error, 
    refetch: refetchLeads,
    totalCount,
    currentPage,
    pageSize,
    handlePageChange,
    searchTerm,
    handleSearch,
    orderBy,
    handleOrderByChange 
  } = useLeadsData(accessToken);
  
  useEffect(() => {
    if (leadsData && leadsData.length > 0) {
      const mappedLeads = leadsData.map(lead => {
        return {
          ...lead,
          key: lead.id,
          selected: false
        };
      });
      setLeads(mappedLeads);
    }
  }, [leadsData]);

  // Reset form when modal opens
  useEffect(() => {
    if (isAddEditModalOpen) {
      form.resetFields();
      
      if (editingLead) {
        // Format the data for the form
        const formattedData = {
          companyName: editingLead.companyName,
          contactName: editingLead.contactName,
          contactEmail: editingLead.contactEmail,
          contactPhone: editingLead.contactPhone,
          accountId: editingLead.accountId,
          contactId: editingLead.contactId,
          ownerId: editingLead.ownerId,
        };
        
        form.setFieldsValue(formattedData);
      }
    }
  }, [isAddEditModalOpen, editingLead, form]);
  
  // Handle contact selection to auto-populate email and phone
  const handleContactChange = (contactId: string) => {
    const selectedContact = contacts.find(contact => contact.id === contactId);
    if (selectedContact) {
      form.setFieldsValue({
        contactEmail: selectedContact.email,
        contactPhone: selectedContact.phone,
        contactName: selectedContact.fullName
      });
    }
  };

  // Form submission for lead creation/editing
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);
      
      // Get selected account and contact names
      const selectedAccount = accounts.find(account => account.id === values.accountId);
      const selectedContact = contacts.find(contact => contact.id === values.contactId);
      const selectedEmployee = employees.find(employee => employee.id === values.ownerId);
      
      // Prepare data for saving
      const savePayload = !isNewLead ? {
        changeMode: "UPDATE",
        lead: {
          id: editingLead?.id,
          version: editingLead?.version || 0,
          companyName: selectedAccount?.name || values.companyName,
          ownerEmployee: values.ownerId,
          account: values.accountId,
          contact: values.contactId,
          createdAt: editingLead?.createdAt,
          updatedAt: new Date().toISOString(),
          status: { id: 'ACTIVE' }, // Ensure status is included
        }
      } : {
        changeMode: "INSERT",
        lead: {
          companyName: selectedAccount?.name || values.companyName,
          ownerEmployee: values.ownerId || null,
          account: values.accountId || null,
          contact: values.contactId || null,
        }
      };

      try {
        // Make the API call using fetch
        const response = await fetch(
          'https://newwork-dev.newwork.com/processes/customer-relations/saveLead',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(savePayload)
          }
        );
        
        const responseText = await response.text();
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { message: responseText };
        }
        
        if (response.ok || responseData?.lead?.id) {
          message.success(`Lead ${!isNewLead ? 'updated' : 'created'} successfully!`);
          
          // Close modal and reset state
          setIsAddEditModalOpen(false);
          setIsNewLead(false);
          setEditingLead(undefined);
          
          // Refresh leads data
          refetchLeads();
        } else {
          const errorMessage = responseData.message || response.statusText || 'Unknown error';
          throw new Error(`Failed to ${!isNewLead ? 'update' : 'create'} lead: ${errorMessage}`);
        }
      } catch (err: any) {
        console.error('Error saving lead:', err);
        message.error(`Failed to ${!isNewLead ? 'update' : 'create'} lead: ${err.message || 'Unknown error'}`);
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
      setIsSubmitting(false);
    }
  };
  
  // Handle table sort change
  const handleTableSortChange = (sorter: any) => {
    if (!sorter.order || !sorter.field) return;
    
    const sortOrder = sorter.order === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST';
    const sortField = sorter.field;
    
    const orderByObject = {};
    orderByObject[sortField] = sortOrder;
    
    handleOrderByChange(JSON.stringify(orderByObject));
  };
  
  // Format relative time for last activity
  const formatTimeDifference = (dateString: string | undefined) => {
    if (!dateString) return 'No activity';
    
    try {
      const now = new Date();
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
      if (diffInSeconds < 60) {
        if (diffInSeconds <= 0) {
          return 'Just now';
        }
        return `${diffInSeconds} ${diffInSeconds === 1 ? 'second' : 'seconds'} ago`;
      }  
      
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
      }
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
      }
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
      }
      
      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) {
        return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
      }
      
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) {
        return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
      }
      
      const diffInYears = Math.floor(diffInDays / 365);
      return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return dayjs(dateString).format('MMM D, YYYY');
  };
  
  const handleRowClick = (record: LeadTableItem) => {
    setSelectedLeadId(record.id);
    setIsLeadDetailVisible(true);
  };
  
  const handleLeadDetailBack = () => {
    setIsLeadDetailVisible(false);
    setSelectedLeadId(undefined);
    refetchLeads();
  };
  
  const handleAddLead = () => {
    setIsNewLead(true);
    setEditingLead(undefined); // Clear any previous editing state
    setIsAddEditModalOpen(true); // Open modal instead
    refetchLeads();
  };

  // Handle edit selected lead
const handleEditLead = () => {
  if (selectedRowKeys.length === 0) {
      message.warning('Please select a lead to edit');
      return;
    }
    
    const leadToEdit = leads.find(lead => lead.id === selectedRowKeys[0]);
    if (!leadToEdit) {
      message.error('Selected lead not found');
      return;
    }
    
    setEditingLead(leadToEdit);
    setIsNewLead(false);
    setIsAddEditModalOpen(true); // Open modal instead
  };

  // Handle cancel of lead edit/create
  const handleCancelLeadEdit = () => {
    setIsAddEditModalOpen(false);
    setIsNewLead(false);
    setEditingLead(undefined);
    form.resetFields();
  };

  // Handle mark as lost
  const handleMarkAsLost = async (lead: LeadTableItem) => {
    if (!lead || !lead.id) {
      message.error('Cannot mark as lost: Lead information is missing');
      return;
    }
    try {
      const markAsLostPayload = {
        changeMode: "DELETE",
        lead: {
          id: lead.id,
          version: lead.version,
        }
      };
      
      const response = await fetch('https://newwork-dev.newwork.com/processes/customer-relations/saveLead', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(markAsLostPayload)
      });
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error('Error response:', responseText);
        throw new Error(`Failed to mark lead as lost: ${response.statusText}`);
      }
      
      message.success(`${lead.companyName} marked as lost`);
      
      refetchLeads();
    } catch (error) {
      console.error('Error marking lead as lost:', error);
      message.error(`Failed to mark lead as lost: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Table columns configuration
  const columns = [
    {
      title: 'Name',
      key: 'name',
      dataIndex: 'name',
      sorter: (a: LeadTableItem, b: LeadTableItem) => a.name.localeCompare(b.name),
      render: (text: string, record: LeadTableItem) => (
        <a onClick={(e) => { e.stopPropagation(); handleRowClick(record); }}>
          {text || '-'}
        </a>
      ),
    },
    {
      title: 'Company',
      key: 'companyName',
      dataIndex: 'companyName',
      sorter: (a: LeadTableItem, b: LeadTableItem) => a.companyName.localeCompare(b.companyName),
      render: (text: string, record: LeadTableItem) => (
        <a onClick={(e) => { e.stopPropagation(); handleRowClick(record); }}>
          {text || '-'}
        </a>
      ),
    },
    {
      title: 'Contact',
      key: 'contactName',
      dataIndex: 'contactName',
      sorter: (a: LeadTableItem, b: LeadTableItem) => a.contactName.localeCompare(b.contactName),
      render: (text: string, record: LeadTableItem) => (
        <a onClick={(e) => { e.stopPropagation(); handleRowClick(record); }}>
          {text || '-'}
        </a>
      ),
    },
    {
      title: 'Status',
      key: 'leadStatus',
      dataIndex: 'leadStatus',
      render: (status: any, record: LeadTableItem) => (
        <span>{record.leadStatus?.value || '-'}</span>
      ),
      responsive: ['md'] as ('md')[],
    },
    {
      title: 'Source',
      key: 'leadSource',
      dataIndex: 'leadSource',
      render: (source: any, record: LeadTableItem) => (
        <span>{record.leadSource?.value || '-'}</span>
      ),
      responsive: ['md'] as ('md')[],
    },
    {
      title: 'Rating',
      key: 'leadRating',
      dataIndex: 'leadRating',
      render: (rating: any, record: LeadTableItem) => (
        <span>{record.leadRating?.value || '-'}</span>
      ),
      responsive: ['md'] as ('md')[],
    },
    {
      title: 'Owner',
      key: 'ownerName',
      dataIndex: 'ownerName',
      sorter: (a: LeadTableItem, b: LeadTableItem) => a.ownerName.localeCompare(b.ownerName),
      render: (text: string, record: LeadTableItem) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {record.ownerAvatar ? (
            <Avatar src={record.ownerAvatar} size="small" style={{ marginRight: 8 }} />
          ) : (
            <Avatar icon={<UserOutlined />} size="small" style={{ marginRight: 8 }} />
          )}
          {text || 'Unassigned'}
        </div>
      ),
    },
    {
      title: 'Created Date',
      key: 'createdAt',
      dataIndex: 'createdAt',
      sorter: (a: LeadTableItem, b: LeadTableItem) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      },
      render: (date: string) => formatDate(date),
      responsive: ['md'] as ('md')[],
      defaultSortOrder: 'descend' as const
    },
    {
      title: 'Last Activity',
      key: 'lastActivity',
      dataIndex: 'lastActivity',
      sorter: (a: LeadTableItem, b: LeadTableItem) => {
        const dateA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const dateB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return dateA - dateB;
      },
      render: (date: string) => formatTimeDifference(date),
      responsive: ['md'] as ('md')[],
    },
    {
      title: 'Tags',
      key: 'tags',
      render: (_: any, lead: LeadTableItem) => (
        <div>-</div>
      ),
      responsive: ['lg'] as ('lg')[]
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: LeadTableItem) => (
        <Dropdown
          menu={{
            items: [
              {
                key: '1',
                icon: <CloseCircleOutlined />,
                label: 'Mark as Lost',
                onClick: (info: any) => {
                  info.domEvent.stopPropagation();
                  handleMarkAsLost(record);
                }
              }
            ]
          }}
          trigger={['click']}
          placement='bottomRight'
        >
          <Button type='text' icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      ),
    },
  ];

  const renderLeadCard = (lead: LeadTableItem) => (
    <List.Item 
      key={lead.id}
      onClick={() => handleRowClick(lead)}
      style={{ cursor: 'pointer' }}
    >
      <Card style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
              {lead.companyName || '-'}
            </div>
            <div style={{ marginBottom: 4 }}>Contact: {lead.contactName || '-'}</div>
            <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center' }}>
              Owner: 
              {lead.ownerAvatar ? (
                <Avatar src={lead.ownerAvatar} size="small" style={{ margin: '0 8px' }} />
              ) : (
                <Avatar icon={<UserOutlined />} size="small" style={{ margin: '0 8px' }} />
              )}
              {lead.ownerName || 'Unassigned'}
            </div>
            <div style={{ marginBottom: 4 }}>Created: {formatDate(lead.createdAt)}</div>
            <div style={{ marginBottom: 4 }}>Last Activity: {formatTimeDifference(lead.lastActivity)}</div>
            
          </div>
          <Dropdown
            menu={{
              items: [
                {
                  key: '1',
                  icon: <CloseCircleOutlined />,
                  label: 'Mark as Lost',
                  onClick: (e) => {
                    e.domEvent.stopPropagation();
                    handleMarkAsLost(lead);
                  }
                }
              ]
            }}
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
    <div style={{ padding: 24 }} data-testid="leads-overview-container">
      {isLeadDetailVisible && selectedLeadId ? (
        <LeadDetails
          accessToken={accessToken}
          leadId={selectedLeadId}
          onBack={handleLeadDetailBack}
        />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }} data-testid="leads-header">
            <div>
              <Title level={2} style={{ margin: 0 }}>Leads</Title>
              <Paragraph type="secondary">Manage leads that don't have linked opportunities or investments.</Paragraph>
            </div>
            <div>
              {selectedRowKeys.length > 0 && leads.length > 0 && (
                <Button 
                  icon={<EditOutlined />}
                  onClick={handleEditLead}
                  style={{ marginRight: 16 }}
                  data-testid="edit-lead-button"
                >
                  Edit
                </Button>
              )}
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddLead}
                data-testid="add-lead-button"
              >
                Add Lead
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <Row gutter={16} className="gba:mb-6" data-testid="leads-kpi-cards">
            <Col xs={24} sm={12} md={6} className="gba:pb-4">
              <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
                <div className="gba:flex gba:items-center">
                  <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-blue-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PieChartOutlined className="gba:h-5 gba:w-5 gba:text-blue-500" style={{ fontSize: '18px' }} />
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Total Leads</div>
                    <div className="gba:text-2xl gba:font-bold gba:text-blue-500">
                      {leads.length}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6} className="gba:pb-4">
              <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
                <div className="gba:flex gba:items-center">
                  <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-green-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TeamOutlined className="gba:h-5 gba:w-5 gba:text-green-500" style={{ fontSize: '18px' }} />
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Lead Sources</div>
                    <div className="gba:text-2xl gba:font-bold gba:text-green-500">
                      {(() => {
                        const sourceMap = new Map();
                        leads.forEach(lead => {
                          if (lead.leadSource?.value) {
                            sourceMap.set(lead.leadSource.value, true);
                          }
                        });
                        return sourceMap.size;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6} className="gba:pb-4">
              <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
                <div className="gba:flex gba:items-center">
                  <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-yellow-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FieldTimeOutlined className="gba:h-5 gba:w-5 gba:text-yellow-500" style={{ fontSize: '18px' }} />
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Recent Leads</div>
                    <div className="gba:text-2xl gba:font-bold gba:text-yellow-500">
                      {(() => {
                        const now = dayjs();
                        return leads.filter(lead => 
                          dayjs(lead.createdAt).isAfter(now.subtract(30, 'day'))
                        ).length;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6} className="gba:pb-4">
              <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
                <div className="gba:flex gba:items-center">
                  <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-red-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <StarOutlined className="gba:h-5 gba:w-5 gba:text-red-500" style={{ fontSize: '18px' }} />
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Top Rating</div>
                    <div className="gba:text-2xl gba:font-bold gba:text-red-500">
                      {(() => {
                        const ratingMap = new Map();
                        leads.forEach(lead => {
                          if (lead.leadRating?.value) {
                            ratingMap.set(lead.leadRating.value, (ratingMap.get(lead.leadRating.value) || 0) + 1);
                          }
                        });
                        
                        let topRating = 'None';
                        let maxCount = 0;
                        
                        ratingMap.forEach((count, rating) => {
                          if (count > maxCount) {
                            maxCount = count;
                            topRating = rating;
                          }
                        });
                        
                        return topRating;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
          
          <div style={{ marginBottom: 16 }} data-testid="leads-search">
            <Input
              placeholder="Search leads..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </div>
          
          {/* Table Section */}
          {isMobile ? (
            <List
              loading={loading}
              dataSource={leads}
              renderItem={renderLeadCard}
              data-testid="leads-mobile-list"
              locale={{ emptyText: <Empty description="No leads found" /> }}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={leads}
              rowKey="id"
              rowSelection={{
                type: 'checkbox',
                selectedRowKeys,
                onChange: keys => setSelectedRowKeys(keys as string[])
              }}
              onRow={(record) => ({
                onClick: () => handleRowClick(record)
              })}
              loading={loading}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: totalCount,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                onChange: handlePageChange,
                showTotal: (total) => `Total ${total} leads`
              }}
              onChange={(pagination, filters, sorter) => handleTableSortChange(sorter)}
              data-testid="leads-table"
              className="gba:w-full"
            />
          )}
          
          {/* Add/Edit Lead Modal */}
          <Modal
            title={isNewLead ? "Create New Lead" : "Edit Lead"}
            open={isAddEditModalOpen}
            onCancel={handleCancelLeadEdit}
            footer={[
              <Button 
                key="cancel" 
                onClick={handleCancelLeadEdit}
                data-testid="modal-cancel-button"
              >
                Cancel
              </Button>,
              <Button 
                key="submit" 
                type="primary" 
                loading={isSubmitting}
                onClick={handleSubmit}
                data-testid="modal-save-button"
              >
                {isNewLead ? 'Create Lead' : 'Update Lead'}
              </Button>
            ]}
            maskClosable={false}
            destroyOnClose={true}
            className="gba:add-edit-lead-modal"
            data-testid="add-edit-lead-modal"
          >
            <Spin spinning={accountsLoading || contactsLoading || employeesLoading}>
              <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                data-testid="lead-form"
              >
                <Divider orientation="left">Company Information</Divider>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="accountId"
                      label="Company Name"
                      rules={[{ required: true, message: 'Please select a company' }]}
                      data-testid="company-name-field"
                    >
                      <Select 
                        placeholder="Select a company"
                        data-testid="company-name-select"
                        loading={accountsLoading}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {accounts.map(account => (
                          <Select.Option key={account.id} value={account.id}>
                            {account.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left">Contact Information</Divider>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="contactId"
                      label="Contact Name"
                      rules={[{ required: true, message: 'Please select a contact' }]}
                      data-testid="contact-name-field"
                    >
                      <Select 
                        placeholder="Select a contact"
                        data-testid="contact-name-select"
                        loading={contactsLoading}
                        showSearch
                        optionFilterProp="children"
                        onChange={handleContactChange}
                        filterOption={(input, option) =>
                          (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {contacts.map(contact => (
                          <Select.Option key={contact.id} value={contact.id}>
                            {contact.fullName}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="contactEmail"
                      label="Email"
                      data-testid="contact-email-field"
                    >
                      <Input 
                        prefix={<MailOutlined />} 
                        placeholder="Email will auto-populate from contact" 
                        data-testid="contact-email-input"
                        disabled
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="contactPhone"
                      label="Phone"
                      data-testid="contact-phone-field"
                    >
                      <Input 
                        prefix={<PhoneOutlined />} 
                        placeholder="Phone will auto-populate from contact" 
                        data-testid="contact-phone-input"
                        disabled
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left">Lead Details</Divider>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="ownerId"
                      label="Lead Owner"
                      rules={[{ required: true, message: 'Please select a lead owner' }]}
                      data-testid="owner-field"
                    >
                      <Select 
                        placeholder="Select lead owner"
                        data-testid="owner-select"
                        loading={employeesLoading}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {employees.map(employee => (
                          <Select.Option key={employee.id} value={employee.id}>
                            {employee.fullName}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Spin>
          </Modal>
        </>
      )}
    </div>
  );
}

export { LeadsOverviewComponent as LeadsOverview };
export default LeadsOverviewComponent;