import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Card, message, Spin, Dropdown, List, Empty, Tag, Space, Avatar } from 'antd';
import { Grid } from 'antd';
const { useBreakpoint } = Grid;
import { SearchOutlined, PlusOutlined, EditOutlined, MoreOutlined, CloseCircleOutlined, UserOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// REST client will be used directly in the save function
import { useLeadsData } from './hooks/useLeadsData';
import AddEditLead, { LeadFormData } from './components/AddEditLead';

// Initialize dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(weekday);
dayjs.extend(localeData);

// Define BusinessAppContextProps interface if it's not available
interface BusinessAppContextProps {
  accessToken: string;
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
  // State for UI operations
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>();
  const [isLeadDetailVisible, setIsLeadDetailVisible] = useState(false);
  const [isNewLead, setIsNewLead] = useState<boolean>(false); // Used for new lead creation
  const [isEditMode, setIsEditMode] = useState<boolean>(false); // Used for lead editing
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
    setIsLeadDetailVisible(false);
    setSelectedLeadId(undefined);
  };
  
  // Handle mark as lost
  const handleMarkAsLost = async (lead: LeadTableItem) => {
    if (!lead || !lead.id) {
      message.error('Cannot mark as lost: Lead information is missing');
      return;
    }
    console.log(lead)
    try {
      const markAsLostPayload = {
        changeMode: "DELETE",
        lead: {
          id: lead.id,
          version: lead.version,
        }
      };
      console.log(markAsLostPayload)
      
      // Make API call to mark lead as lost
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
      
      // Refresh the leads list
      refetchLeads();
    } catch (error) {
      console.error('Error marking lead as lost:', error);
      message.error(`Failed to mark lead as lost: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
              onSave={(_: LeadFormData) => {
                // API call is now handled in the AddEditLead component
                setIsNewLead(false);
                setIsEditMode(false);
                setSelectedLeadId(undefined);
                // Refresh leads data
                refetchLeads();
              }}
              initialData={selectedLeadId ? leads.find(lead => lead.id === selectedLeadId) : undefined}
              isEditing={!!selectedLeadId}
              accessToken={accessToken}
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