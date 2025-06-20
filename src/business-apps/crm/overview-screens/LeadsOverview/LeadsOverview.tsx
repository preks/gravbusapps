import { useState, useEffect } from 'react';
import { Table, Input, Button, Card, message, Dropdown, List, Empty, Avatar, Row, Col } from 'antd';
import { Grid } from 'antd';
const { useBreakpoint } = Grid;
import { SearchOutlined, PlusOutlined, EditOutlined, MoreOutlined, CloseCircleOutlined, UserOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import dayjs from 'dayjs';
import { PieChartOutlined, TeamOutlined, FieldTimeOutlined, StarOutlined } from '@ant-design/icons';
import relativeTime from 'dayjs/plugin/relativeTime';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

import { useLeadsData } from './hooks/useLeadsData';
import AddEditLead, { LeadFormData } from './components/AddEditLead';
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

function LeadsOverviewComponent({ accessToken }: BusinessAppContextProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>();
  const [isLeadDetailVisible, setIsLeadDetailVisible] = useState(false);
  const [isNewLead, setIsNewLead] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<LeadTableItem | undefined>(undefined);
  const [leads, setLeads] = useState<LeadTableItem[]>([]);
  const screens = useBreakpoint();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(!screens.md);
  }, [screens]);
  
  const { leads: leadsData, loading, refetch: refetchLeads } = useLeadsData(accessToken);
  console.log(leadsData)
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
  };
  
  const handleAddLead = () => {
    setIsNewLead(true);
    setIsEditMode(true);
    setIsLeadDetailVisible(false);
    setSelectedLeadId(undefined);
    setEditingLead(undefined); 
  };

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
    setIsEditMode(true);
    setIsLeadDetailVisible(false);
    setSelectedLeadId(undefined);
  };
  
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
      ) : isNewLead || isEditMode ? (
        <AddEditLead
          onCancel={() => {
            setIsNewLead(false);
            setIsEditMode(false);
            setSelectedLeadId(undefined);
            setEditingLead(undefined);
          }}
          onSave={(_: LeadFormData) => {
            setIsNewLead(false);
            setIsEditMode(false);
            setSelectedLeadId(undefined);
            setEditingLead(undefined);
            refetchLeads();
          }}
          initialData={editingLead}
          isEditing={!isNewLead && !!editingLead}
          accessToken={accessToken}
          employeeId={''}
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
              <div className="gba:p-4 gba:bg-white gba:shadow-sm gba:rounded gba:border gba:border-gray-200">
                <div className="gba:flex gba:items-center">
                  <div className="gba:mr-3">
                    <span className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-blue-50">
                      <PieChartOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                    </span>
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Total Leads</div>
                    <div className="gba:text-2xl gba:font-semibold gba:text-blue-500">
                      {leads.length}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6} className="gba:pb-4">
              <div className="gba:p-4 gba:bg-white gba:shadow-sm gba:rounded gba:border gba:border-gray-200">
                <div className="gba:flex gba:items-center">
                  <div className="gba:mr-3">
                    <span className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-green-50">
                      <TeamOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                    </span>
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Lead Sources</div>
                    <div className="gba:text-2xl gba:font-semibold gba:text-green-500">
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
              <div className="gba:p-4 gba:bg-white gba:shadow-sm gba:rounded gba:border gba:border-gray-200">
                <div className="gba:flex gba:items-center">
                  <div className="gba:mr-3">
                    <span className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-yellow-50">
                      <FieldTimeOutlined style={{ color: '#faad14', fontSize: '18px' }} />
                    </span>
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Recent Leads</div>
                    <div className="gba:text-2xl gba:font-semibold gba:text-yellow-500">
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
              <div className="gba:p-4 gba:bg-white gba:shadow-sm gba:rounded gba:border gba:border-gray-200">
                <div className="gba:flex gba:items-center">
                  <div className="gba:mr-3">
                    <span className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-red-50">
                      <StarOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
                    </span>
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Top Rating</div>
                    <div className="gba:text-2xl gba:font-semibold gba:text-red-500">
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
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </div>
          
          {/* Table Section */}
          {isMobile ? (
            <List
              loading={loading}
              dataSource={leads.filter(lead => 
                lead.companyName.toLowerCase().includes(searchText.toLowerCase()) ||
                lead.contactName.toLowerCase().includes(searchText.toLowerCase()) ||
                lead.ownerName.toLowerCase().includes(searchText.toLowerCase())
              )}
              renderItem={renderLeadCard}
              data-testid="leads-mobile-list"
              locale={{ emptyText: <Empty description="No leads found" /> }}
            />
          ) : (
            <Table
              dataSource={leads.filter(lead => 
                lead.companyName.toLowerCase().includes(searchText.toLowerCase()) ||
                lead.contactName.toLowerCase().includes(searchText.toLowerCase()) ||
                lead.ownerName.toLowerCase().includes(searchText.toLowerCase())
              )}
              columns={columns}
              pagination={{ pageSize: 10 }}
              loading={loading}
              rowKey="id"
              rowSelection={{
                type: 'checkbox',
                selectedRowKeys,
                onChange: keys => setSelectedRowKeys(keys as string[])
              }}
              onRow={(record) => ({
                onClick: () => handleRowClick(record)
              })}
              data-testid="leads-table"
              locale={{ emptyText: <Empty description="No leads found" /> }}
            />
          )}
        </>
      )}
    </div>
  );
}

export { LeadsOverviewComponent as LeadsOverview };
export default LeadsOverviewComponent;