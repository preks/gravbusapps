import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title } = Typography;
const { Option } = Select;

export interface Team {
  id: string;
  name: string;
  code: string;
  description?: string;
  teamLead: string;
  department: string;
  memberCount: number;
  focus: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  location: string;
  teamType: string;
}

export interface TeamsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration
const mockTeams: Team[] = [
  {
    id: '1',
    name: 'Frontend Development',
    code: 'FE001',
    description: 'User interface and experience development',
    teamLead: 'Alice Johnson',
    department: 'Engineering',
    memberCount: 8,
    focus: 'Web Development',
    status: 'Active',
    createdDate: '2020-01-15',
    location: 'Hamburg',
    teamType: 'Development'
  },
  {
    id: '2',
    name: 'Backend Development',
    code: 'BE001',
    description: 'Server-side development and APIs',
    teamLead: 'Bob Smith',
    department: 'Engineering',
    memberCount: 12,
    focus: 'Backend Systems',
    status: 'Active',
    createdDate: '2019-03-10',
    location: 'Hamburg',
    teamType: 'Development'
  },
  {
    id: '3',
    name: 'DevOps',
    code: 'DEVOPS001',
    description: 'Infrastructure and deployment automation',
    teamLead: 'Charlie Brown',
    department: 'Engineering',
    memberCount: 6,
    focus: 'Infrastructure',
    status: 'Active',
    createdDate: '2021-06-01',
    location: 'Berlin',
    teamType: 'Operations'
  },
  {
    id: '4',
    name: 'Product Strategy',
    code: 'PS001',
    description: 'Product planning and strategy',
    teamLead: 'Diana Wilson',
    department: 'Product',
    memberCount: 5,
    focus: 'Strategy',
    status: 'Active',
    createdDate: '2020-09-15',
    location: 'Vienna',
    teamType: 'Strategy'
  },
  {
    id: '5',
    name: 'QA Team',
    code: 'QA001',
    description: 'Quality assurance and testing',
    teamLead: 'Eva Garcia',
    department: 'Engineering',
    memberCount: 10,
    focus: 'Quality Assurance',
    status: 'Inactive',
    createdDate: '2018-11-20',
    location: 'Munich',
    teamType: 'Quality'
  }
];

const TeamsTab: React.FC<TeamsTabProps> = ({ 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [form] = Form.useForm();

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.teamLead.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.focus.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingTeam(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Team) => {
    setEditingTeam(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      teamLead: record.teamLead,
      department: record.department,
      memberCount: record.memberCount,
      focus: record.focus,
      status: record.status,
      createdDate: record.createdDate,
      location: record.location,
      teamType: record.teamType,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: Team) => {
    Modal.confirm({
      title: 'Delete Team',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setTeams(prev => prev.filter(team => team.id !== record.id));
          message.success('Team deleted successfully');
        } catch (error) {
          console.error('Error deleting team:', error);
          message.error('Failed to delete team');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingTeam) {
        // Update existing team
        setTeams(prev => 
          prev.map(team => 
            team.id === editingTeam.id 
              ? { ...team, ...values }
              : team
          )
        );
        message.success('Team updated successfully');
      } else {
        // Create new team
        const newTeam: Team = {
          id: Date.now().toString(),
          ...values
        };
        setTeams(prev => [...prev, newTeam]);
        message.success('Team created successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Team, b: Team) => a.name.localeCompare(b.name),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      sorter: (a: Team, b: Team) => a.code.localeCompare(b.code),
    },
    {
      title: 'Team Lead',
      dataIndex: 'teamLead',
      key: 'teamLead',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      filters: [
        { text: 'Engineering', value: 'Engineering' },
        { text: 'Product', value: 'Product' },
        { text: 'Marketing', value: 'Marketing' },
        { text: 'Sales', value: 'Sales' },
      ],
      onFilter: (value: any, record: Team) => record.department === value,
    },
    {
      title: 'Members',
      dataIndex: 'memberCount',
      key: 'memberCount',
      sorter: (a: Team, b: Team) => a.memberCount - b.memberCount,
    },
    {
      title: 'Focus',
      dataIndex: 'focus',
      key: 'focus',
    },
    {
      title: 'Type',
      dataIndex: 'teamType',
      key: 'teamType',
      render: (type: string) => {
        const color = 
          type === 'Development' ? 'blue' : 
          type === 'Operations' ? 'green' : 
          type === 'Strategy' ? 'purple' : 'orange';
        return <Tag color={color}>{type}</Tag>;
      },
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
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
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Team) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            data-testid={`${prefixDataTestId}-edit-team-${record.id}`}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            data-testid={`${prefixDataTestId}-delete-team-${record.id}`}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div data-testid={`${prefixDataTestId}-TeamsTab`}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TeamOutlined />
          {t('hr.teams', 'Teams')}
        </Title>
        <Space>
          <Input
            placeholder="Search teams..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 250 }}
            data-testid={`${prefixDataTestId}-search-teams`}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId}-add-team`}
          >
            Add Team
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredTeams}
        rowKey="id"
        pagination={{
          total: filteredTeams.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} teams`,
        }}
        data-testid={`${prefixDataTestId}-teams-table`}
      />

      <Modal
        title={editingTeam ? 'Edit Team' : 'Add New Team'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId}-team-modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId}-team-form`}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please input the team name!' }]}
          >
            <Input placeholder="Enter team name" />
          </Form.Item>

          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Please input the team code!' }]}
          >
            <Input placeholder="Enter team code" />
          </Form.Item>

          <Form.Item
            label="Team Lead"
            name="teamLead"
            rules={[{ required: true, message: 'Please input the team lead!' }]}
          >
            <Input placeholder="Enter team lead name" />
          </Form.Item>

          <Form.Item
            label="Department"
            name="department"
            rules={[{ required: true, message: 'Please select the department!' }]}
          >
            <Select placeholder="Select department">
              <Option value="Engineering">Engineering</Option>
              <Option value="Product">Product</Option>
              <Option value="Marketing">Marketing</Option>
              <Option value="Sales">Sales</Option>
              <Option value="HR">HR</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Member Count"
            name="memberCount"
            rules={[{ required: true, message: 'Please input the member count!' }]}
          >
            <Input type="number" placeholder="Enter member count" />
          </Form.Item>

          <Form.Item
            label="Focus"
            name="focus"
            rules={[{ required: true, message: 'Please input the team focus!' }]}
          >
            <Input placeholder="Enter team focus area" />
          </Form.Item>

          <Form.Item
            label="Team Type"
            name="teamType"
            rules={[{ required: true, message: 'Please select the team type!' }]}
          >
            <Select placeholder="Select team type">
              <Option value="Development">Development</Option>
              <Option value="Operations">Operations</Option>
              <Option value="Strategy">Strategy</Option>
              <Option value="Quality">Quality</Option>
              <Option value="Support">Support</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Location"
            name="location"
            rules={[{ required: true, message: 'Please select the location!' }]}
          >
            <Select placeholder="Select location">
              <Option value="Hamburg">Hamburg</Option>
              <Option value="Berlin">Berlin</Option>
              <Option value="Vienna">Vienna</Option>
              <Option value="Munich">Munich</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Created Date"
            name="createdDate"
            rules={[{ required: true, message: 'Please input the created date!' }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: 'Please select the status!' }]}
          >
            <Select placeholder="Select status">
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea
              placeholder="Enter team description"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamsTab;
export { TeamsTab }; 