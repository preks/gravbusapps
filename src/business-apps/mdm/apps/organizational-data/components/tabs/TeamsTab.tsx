import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  Button, 
  Input, 
  Space, 
  Typography, 
  message, 
  Modal, 
  Form, 
  Tag, 
  Spin, 
  Alert,
  Avatar,
  Card,
  Tooltip,
  Select,
  Row,
  Col,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  TeamOutlined,
  UserOutlined,
  CrownOutlined,
  CalendarOutlined,
  SearchOutlined,
  AppstoreOutlined,
  BarsOutlined,
  FileImageOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useTeams } from '../../hooks';
import { Team } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;

export interface TeamsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const TeamsTab: React.FC<TeamsTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  const {
    teams,
    isLoading,
    error,
    refetch,
    searchTeams,
    getTeamsByStatus,
    getSortedTeams,
    totalTeams,
    activeTeams,
    inactiveTeams,
    teamsWithLeaders,
    teamsWithoutLeaders
  } = useTeams(context);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'rank' | 'created' | 'leader'>('rank');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [form] = Form.useForm();

  // Get filtered and sorted teams
  const getDisplayTeams = (): Team[] => {
    let displayTeams = teams;
    
    // Apply search filter
    if (searchQuery) {
      displayTeams = searchTeams(searchQuery);
    }
    
    // Apply status filter
    if (statusFilter !== 'All') {
      displayTeams = displayTeams.filter(team => team.status === statusFilter);
    }
    
    // Apply sorting
    return getSortedTeams(sortBy).filter(team => 
      searchQuery ? searchTeams(searchQuery).includes(team) : true
    ).filter(team =>
      statusFilter === 'All' ? true : team.status === statusFilter
    );
  };

  const handleAddTeam = () => {
    setEditingTeam(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    form.setFieldsValue({
      name: team.name,
      description: team.description,
      rank: team.rank
    });
    setIsModalVisible(true);
  };

  const handleDeleteTeam = (team: Team) => {
    Modal.confirm({
      title: 'Delete Matrix Team',
      content: `Are you sure you want to delete matrix team "${team.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        message.warning('Delete team functionality will be implemented with process API integration');
        await refetch();
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingTeam) {
        message.warning('Edit team functionality will be implemented with process API integration');
      } else {
        message.warning('Add team functionality will be implemented with process API integration');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      await refetch();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const parseImageUrl = (pictureUrl: string): string | null => {
    try {
      if (!pictureUrl) return null;
      const parsed = JSON.parse(pictureUrl);
      return parsed.path || null;
    } catch {
      return pictureUrl || null;
    }
  };

  // Table columns for table view
  const columns = [
    {
      title: 'Team',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Team) => (
        <div>
          <Text strong>{text}</Text>
          {record.description && (
            <div>
              <Text type="secondary" className="gba:text-sm">{record.description}</Text>
            </div>
          )}
        </div>
      ),
      sorter: (a: Team, b: Team) => a.name.localeCompare(b.name),
    },
    {
      title: 'Leader',
      key: 'leader',
      render: (record: Team) => {
        if (!record.hasLeader) {
          return <Text type="secondary">No leader assigned</Text>;
        }

        const imageUrl = parseImageUrl(record.leaderPictureUrl || '');
        
        return (
          <div className="gba:flex gba:items-center gba:space-x-2">
            <Avatar 
              size="small"
              src={imageUrl}
              icon={<UserOutlined />}
            />
            <div>
              <Text strong>{record.leaderName}</Text>
              <div>
                <Text type="secondary" className="gba:text-xs">{record.leaderJobPosition}</Text>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'green' : 'red'}>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Inactive', value: 'Inactive' },
      ],
      onFilter: (value: any, record: Team) => record.status === value,
    },
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      sorter: (a: Team, b: Team) => a.rank - b.rank,
    },
    {
      title: 'Created',
      dataIndex: 'age',
      key: 'age',
      render: (age: string, record: Team) => (
        <Tooltip title={new Date(record.createdAt).toLocaleDateString()}>
          <Text type="secondary">{age}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Team) => (
        <Space size="small">
          <Tooltip title="Edit Team">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditTeam(record)}
              data-testid={`${prefixDataTestId}-edit-team-${record.id}`}
            />
          </Tooltip>
          <Tooltip title="Delete Team">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteTeam(record)}
              data-testid={`${prefixDataTestId}-delete-team-${record.id}`}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Render team card for cards view
  const renderTeamCard = (team: Team) => {
    const imageUrl = parseImageUrl(team.leaderPictureUrl || '');
    
    return (
      <Card
        key={team.id}
        className="gba:h-full"
        actions={[
          <Tooltip title="Edit Team" key="edit">
            <EditOutlined onClick={() => handleEditTeam(team)} />
          </Tooltip>,
          <Tooltip title="Delete Team" key="delete">
            <DeleteOutlined onClick={() => handleDeleteTeam(team)} />
          </Tooltip>
        ]}
        data-testid={`${prefixDataTestId}-team-card-${team.id}`}
      >
        <Card.Meta
          avatar={<TeamOutlined className="gba:text-2xl gba:text-blue-500" />}
          title={
            <div className="gba:flex gba:items-center gba:justify-between">
              <Text strong className="gba:text-base">{team.name}</Text>
              <Tag color={team.status === 'Active' ? 'green' : 'red'} className="gba:text-xs">
                {team.status}
              </Tag>
            </div>
          }
          description={
            <div className="gba:space-y-2">
              {team.description && (
                <Text type="secondary" className="gba:text-sm gba:block">
                  {team.description}
                </Text>
              )}
              
              <div className="gba:flex gba:items-center gba:justify-between">
                <Tag color="blue" className="gba:text-xs">
                  Rank {team.rank}
                </Tag>
                <Text type="secondary" className="gba:text-xs">
                  <CalendarOutlined className="gba:mr-1" />
                  {team.age}
                </Text>
              </div>

              {team.hasLeader ? (
                <div className="gba:flex gba:items-center gba:space-x-2 gba:pt-2 gba:border-t gba:border-gray-200">
                  <Avatar 
                    size="small"
                    src={imageUrl}
                    icon={imageUrl ? <FileImageOutlined /> : <UserOutlined />}
                  />
                  <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:space-x-1">
                      <CrownOutlined className="gba:text-yellow-500 gba:text-xs" />
                      <Text strong className="gba:text-sm">{team.leaderName}</Text>
                    </div>
                    <Text type="secondary" className="gba:text-xs gba:block">
                      {team.leaderJobPosition}
                    </Text>
                    {team.leaderMatrixUnitName && (
                      <Tag color="purple" className="gba:text-xs gba:mt-1">
                        {team.leaderMatrixUnitName}
                      </Tag>
                    )}
                  </div>
                </div>
              ) : (
                <div className="gba:pt-2 gba:border-t gba:border-gray-200">
                  <Text type="secondary" className="gba:text-sm">
                    <UserOutlined className="gba:mr-1" />
                    No leader assigned
                  </Text>
                </div>
              )}
            </div>
          }
        />
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Teams"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={refetch}>
            Retry
          </Button>
        }
      />
    );
  }

  const displayTeams = getDisplayTeams();

  return (
    <div
      data-testid={`${prefixDataTestId || ''}-TeamsTab`}
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
            Matrix Teams
          </Title>
          <Tag color="blue">{totalTeams} total</Tag>
          <Tag color="green">{activeTeams} active</Tag>
          <Tag color="red">{inactiveTeams} inactive</Tag>
          <Tag color="orange">{teamsWithLeaders} with leaders</Tag>
          <Tag color="gray">{teamsWithoutLeaders} without leaders</Tag>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddTeam}
          data-testid={`${prefixDataTestId || ''}-TeamsTab-AddButton`}
        >
          Add Team
        </Button>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Input
            placeholder={t('mdm.search_teams', 'Search teams...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            allowClear
            data-testid={`${prefixDataTestId || ''}-TeamsTab-SearchInput`}
          />
          
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            data-testid={`${prefixDataTestId || ''}-TeamsTab-StatusFilter`}
          >
            <Option value="All">All</Option>
            <Option value="Active">Active</Option>
            <Option value="Inactive">Inactive</Option>
          </Select>

          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 150 }}
            data-testid={`${prefixDataTestId || ''}-TeamsTab-SortBy`}
          >
            <Option value="rank">By Rank</Option>
            <Option value="name">By Name</Option>
            <Option value="created">By Created Date</Option>
            <Option value="leader">By Leader</Option>
          </Select>
        </div>
        
        <div>
          <Button.Group>
            <Button
              icon={<AppstoreOutlined />}
              type={viewMode === 'cards' ? 'primary' : 'default'}
              onClick={() => setViewMode('cards')}
              data-testid={`${prefixDataTestId || ''}-TeamsTab-CardsView`}
            >
              Cards
            </Button>
            <Button
              icon={<BarsOutlined />}
              type={viewMode === 'table' ? 'primary' : 'default'}
              onClick={() => setViewMode('table')}
              data-testid={`${prefixDataTestId || ''}-TeamsTab-TableView`}
            >
              Table
            </Button>
          </Button.Group>
        </div>
      </div>

      {/* Content */}
      {displayTeams.length > 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: viewMode === 'cards' ? '24px' : '0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {viewMode === 'cards' ? (
            <Row gutter={[16, 16]}>
              {displayTeams.map(team => (
                <Col xs={24} sm={12} md={8} lg={6} key={team.id}>
                  {renderTeamCard(team)}
                </Col>
              ))}
            </Row>
          ) : (
            <Table
              columns={columns}
              dataSource={displayTeams}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} teams`,
              }}
              data-testid={`${prefixDataTestId || ''}-TeamsTab-Table`}
            />
          )}
        </div>
      ) : (
        <Empty
          description="No teams found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTeam}>
            Add First Team
          </Button>
        </Empty>
      )}

      {/* Modal for Add/Edit */}
      <Modal
        title={editingTeam ? 'Edit Matrix Team' : 'Add Matrix Team'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId || ''}-TeamsTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-TeamsTab-Form`}
        >
          <Form.Item
            label="Team Name"
            name="name"
            rules={[{ required: true, message: 'Please enter team name' }]}
          >
            <Input placeholder="Enter team name" />
          </Form.Item>
          
          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea 
              placeholder="Enter team description (optional)" 
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Rank"
            name="rank"
            rules={[{ required: true, message: 'Please enter team rank' }]}
          >
            <Input type="number" placeholder="Enter team rank" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamsTab;
export { TeamsTab }; 