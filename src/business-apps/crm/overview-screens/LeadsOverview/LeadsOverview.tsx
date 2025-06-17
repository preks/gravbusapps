import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Card, message, Spin, Modal, Dropdown, Menu, List, Empty, Tag, Space, Avatar } from 'antd';
import { Grid } from 'antd';
const { useBreakpoint } = Grid;
import { MenuInfo } from 'rc-menu/lib/interface';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, MoreOutlined, CalendarOutlined, DollarOutlined, CloseCircleOutlined, UserOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import dayjs from 'dayjs';

import { useLeadsData } from './hooks/useLeadsData';
import AddEditLead, { LeadFormData } from './components/AddEditLead';

// Define BusinessAppContextProps interface if it's not available
interface BusinessAppContextProps {
  accessToken: string;
  userInfo?: any;
  employeeId?: string;
  structureId?: string;
}

const { Title, Paragraph } = Typography;

// LeadTableItem interface for the table
interface LeadTableItem {
  id: string;
  key?: string;
  selected?: boolean;
  companyName: string;
  contactName: string;
  contactId?: string;
  ownerName: string;
  ownerId: string;
  ownerAvatar?: string;
  createdAt: string;
  lastActivity?: string;
  tags: string[];
  status: 'active' | 'lost' | 'converted';
  version: number;
}

function LeadsOverviewComponent({ accessToken }: BusinessAppContextProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>();
  const [isLeadDetailVisible, setIsLeadDetailVisible] = useState(false);
  /* 
   * These states are currently unused but kept for future implementation
   * They will be used when the lead creation and editing functionality is implemented
   * Removing them would require significant changes to handler functions
   */
  const [isNewLead, setIsNewLead] = useState<boolean>(false); // Used in future for new lead creation
  const [isEditMode, setIsEditMode] = useState<boolean>(false); // Used in future for lead editing
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [leads, setLeads] = useState<LeadTableItem[]>([]);
  const screens = useBreakpoint();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(!screens.md);
  }, [screens]);
  
  // Fetch leads data
  const { leads: leadsData, loading, error, refetch: refetchLeads } = useLeadsData(accessToken);
  
  useEffect(() => {
    if (leadsData && leadsData.length > 0) {
      console.log('Lead data from API:', leadsData);
      setLeads(leadsData.map(lead => {
        console.log('Processing lead:', lead.id, 'Tags:', lead.tags);
        return {
          ...lead,
          key: lead.id,
          selected: false
        };
      }));
    }
  }, [leadsData]);

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
        // Handle edge cases: negative or zero seconds should show as "just now"
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
  
  // Format date in readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return dayjs(dateString).format('MMM D, YYYY');
  };
  
  // Handle row click to view lead detail
  const handleRowClick = (record: LeadTableItem) => {
    setSelectedLeadId(record.id);
    setIsLeadDetailVisible(true);
    setIsNewLead(false);
    setIsEditMode(false);
  };
  
  // Handle back button click in lead detail
  const handleLeadDetailBack = () => {
    setIsLeadDetailVisible(false);
    setSelectedLeadId(undefined);
    setIsNewLead(false);
    setIsEditMode(false);
  };
  
  // Handle add new lead
  const handleAddLead = () => {
    setIsNewLead(true);
    setIsEditMode(true);
    setIsLeadDetailVisible(false); // Hide lead detail view
    setSelectedLeadId(undefined);
  };
  
  // Handle delete lead
  const handleDeleteLead = async (lead: LeadTableItem) => {
    if (!lead || !lead.id) {
      message.error('Cannot delete: Lead information is missing');
      return;
    }
    
    try {
      setIsDeletingLead(true);
      
      // Placeholder for API call to delete lead
      // In a real implementation, we would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('Lead deleted successfully');
      
      // Refresh the leads list
      refetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      message.error(`Failed to delete lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeletingLead(false);
    }
  };
  
  // Handle mark as lost
  const handleMarkAsLost = async (lead: LeadTableItem) => {
    console.log('Marking lead as lost:', lead.id);
    try {
      // Placeholder for API call to mark lead as lost
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('Lead marked as lost');
      
      // Refresh the leads list
      refetchLeads();
    } catch (error) {
      console.error('Error marking lead as lost:', error);
      message.error(`Failed to mark lead as lost: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Handle add activity
  const handleAddActivity = (lead: LeadTableItem) => {
    message.info(`Adding activity for ${lead.companyName}...`);
    // This would typically navigate to an activity form or modal
  };
  
  // Handle convert to opportunity
  const handleConvertToOpportunity = (lead: LeadTableItem) => {
    message.info(`Converting ${lead.companyName} to opportunity...`);
    // This would typically navigate to a conversion form or modal
  };
  
  // Row selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys as string[]);
    }
  };
  
  // Handle batch edit
  const handleBatchEdit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one lead to edit');
      return;
    }
    
    message.info(`Editing ${selectedRowKeys.length} leads...`);
    // This would typically open a batch edit form or modal
  };
  
  // Filter leads based on search text
  const filteredLeads = leads.filter(lead => {
    if (!searchText.trim()) {
      return true;
    }
    
    const query = searchText.toLowerCase().trim();
    
    return (
      lead.companyName.toLowerCase().includes(query) ||
      lead.contactName.toLowerCase().includes(query) ||
      lead.ownerName.toLowerCase().includes(query) ||
      false
    );
  });
  
  // Direct onChange handler is used instead of a separate function
  
  // Table columns configuration
  const columns = [
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
        <div>
          {/* <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
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
          <div style={{ marginBottom: 4 }}>Last Activity: {formatTimeDifference(lead.lastActivity)}</div> */}
          <div>-</div>
        </div>
      ),
      responsive: ['lg'] as ('lg')[]
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: LeadTableItem) => (
        <Dropdown
          overlay={
            <Menu
              items={[
                {
                  key: '1',
                  icon: <CloseCircleOutlined />,
                  label: 'Mark as Lost',
                  onClick: (info: MenuInfo) => {
                    info.domEvent.stopPropagation();
                    handleMarkAsLost(record);
                  }
                },
                {
                  key: '2',
                  icon: <CalendarOutlined />,
                  label: 'Add Activity',
                  onClick: (info: MenuInfo) => {
                    info.domEvent.stopPropagation();
                    handleAddActivity(record);
                  }
                },
                {
                  key: '3',
                  icon: <DollarOutlined />,
                  label: 'Convert to Opportunity',
                  onClick: (info: MenuInfo) => {
                    info.domEvent.stopPropagation();
                    handleConvertToOpportunity(record);
                  }
                },
                {
                  key: '4',
                  icon: <DeleteOutlined />,
                  label: 'Delete',
                  danger: true,
                  onClick: (info: MenuInfo) => {
                    info.domEvent.stopPropagation();
                    
                    Modal.confirm({
                      title: 'Delete Lead',
                      content: 'Are you sure you want to delete this lead? This action cannot be undone.',
                      okText: 'Delete',
                      okType: 'danger',
                      cancelText: 'Cancel',
                      okButtonProps: { loading: isDeletingLead },
                      onOk: () => {
                        handleDeleteLead(record);
                      },
                      maskClosable: true,
                    });
                  }
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

  // Function to render a card for mobile view
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
            
            {/* Tags data intentionally removed */}
          </div>
          <Dropdown
            overlay={
              <Menu
                items={[
                  {
                    key: '1',
                    icon: <CloseCircleOutlined />,
                    label: 'Mark as Lost',
                    onClick: (e) => {
                      e.domEvent.stopPropagation();
                      handleMarkAsLost(lead);
                    }
                  },
                  {
                    key: '2',
                    icon: <CalendarOutlined />,
                    label: 'Add Activity',
                    onClick: (e) => {
                      e.domEvent.stopPropagation();
                      handleAddActivity(lead);
                    }
                  },
                  {
                    key: '3',
                    icon: <DollarOutlined />,
                    label: 'Convert to Opportunity',
                    onClick: (e) => {
                      e.domEvent.stopPropagation();
                      handleConvertToOpportunity(lead);
                    }
                  },
                  {
                    key: '4',
                    icon: <DeleteOutlined />,
                    label: (
                      <span
                        onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                          e.stopPropagation();
                          Modal.confirm({
                            title: 'Delete Lead',
                            content: 'Are you sure you want to delete this lead? This action cannot be undone.',
                            okText: 'Delete',
                            okType: 'danger',
                            cancelText: 'Cancel',
                            okButtonProps: { loading: isDeletingLead },
                            onOk: () => {
                              handleDeleteLead(lead);
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
  
  // No unused variable declaration needed - these states are used directly in the component

  return (
    <div style={{ padding: 24 }} data-testid="leads-overview-container">
      {isLeadDetailVisible ? (
        <div>
          {/* Placeholder for Lead Detail Component */}
          <Button onClick={handleLeadDetailBack} data-testid="lead-detail-back-button">
            Back to Leads
          </Button>
          <div>Lead detail would be displayed here (ID: {selectedLeadId})</div>
        </div>
      ) : (
        <>
          {/* Conditional rendering based on whether we're in add/edit mode */}
          {(isNewLead || (isEditMode && !!selectedLeadId)) ? (
            /* Add/Edit Lead Form */
            <AddEditLead
              onCancel={() => {
                setIsNewLead(false);
                setIsEditMode(false);
                setSelectedLeadId(undefined);
              }}
              onSave={(leadData: LeadFormData) => {
                console.log('Lead data saved:', leadData);
                // Here you would typically save the data
                setIsNewLead(false);
                setIsEditMode(false);
                setSelectedLeadId(undefined);
                message.success(`Lead ${leadData.id ? 'updated' : 'created'} successfully!`);
                // Refresh leads data
                refetchLeads();
              }}
              initialData={selectedLeadId ? leads.find(lead => lead.id === selectedLeadId) : undefined}
              isEditing={!!selectedLeadId}
              userInfo={{}}
              employeeId={''}
            />
          ) : (
            <>
              {/* Header Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }} data-testid="leads-header">
                <div>
                  <Title level={2} style={{ margin: 0 }}>Leads</Title>
                  <Paragraph type="secondary">Manage leads that don't have linked opportunities or investments.</Paragraph>
                </div>
                <div>
                  {selectedRowKeys.length > 0 && (
                    <Button 
                      icon={<EditOutlined />}
                      onClick={handleBatchEdit}
                      style={{ marginRight: 16 }}
                      data-testid="batch-edit-button"
                    >
                      Edit ({selectedRowKeys.length})
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

              {/* Search and Filter */}
              <Card style={{ marginBottom: 24 }} data-testid="leads-search-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <Input
                      placeholder="Search leads by company, contact, owner, or tags..."
                      prefix={<SearchOutlined />}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      allowClear
                      style={{ width: 350 }}
                      data-testid="leads-search-input"
                    />
                  </div>
                </div>
              </Card>

              {/* Leads Table/List */}
              <Card data-testid="leads-content-card">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: '20px' }}>Loading leads...</div>
                  </div>
                ) : error ? (
                  <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
                    <div>Error loading leads: {error.message}</div>
                    <Button type="primary" onClick={refetchLeads} style={{ marginTop: '20px' }}>
                      Retry
                    </Button>
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span className="gba:empty-state-text">
                        No leads found. {searchText ? 'Try adjusting your filters or ' : ''}
                        <a onClick={handleAddLead}>add a new lead</a>.
                      </span>
                    }
                    data-testid="leads-empty-state"
                  />
                ) : isMobile ? (
                  <List
                    dataSource={filteredLeads}
                    renderItem={renderLeadCard}
                    pagination={{ pageSize: 10 }}
                    data-testid="leads-mobile-list"
                  />
                ) : (
                  <Table
                    dataSource={filteredLeads}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 'max-content' }}
                    rowSelection={rowSelection}
                    onRow={(record) => ({
                      onClick: () => handleRowClick(record),
                      style: { cursor: 'pointer' }
                    })}
                    data-testid="leads-desktop-table"
                  />
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

export { LeadsOverviewComponent as LeadsOverview };
export default LeadsOverviewComponent;