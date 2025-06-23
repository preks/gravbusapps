import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Collapse, Table, Button, Space, Typography, Tag, Tooltip, Modal, Form, Input, InputNumber, message, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownOutlined, RightOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useJobStructureDataIntegration } from '../../hooks';
import { JobLevel, JobLevelGroup } from '../../types';
import { calculateJobLevelInGroup } from '../../utils/levelCalculations';

const { Title, Text } = Typography;
const { Panel } = Collapse;

export interface JobLevelGroupDetailsProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Re-export types for external usage
export type { JobLevel, JobLevelGroup } from '../../types';

const JobLevelGroupDetails: React.FC<JobLevelGroupDetailsProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  const { jobLevelGroups, isLoading, error, refetch } = useJobStructureDataIntegration(context);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'group' | 'level'>('group');
  const [editingGroup, setEditingGroup] = useState<JobLevelGroup | null>(null);
  const [editingLevel, setEditingLevel] = useState<JobLevel | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [form] = Form.useForm();

  const handleCollapseChange = (keys: string | string[]) => {
    setActiveKeys(Array.isArray(keys) ? keys : [keys]);
  };

  const handleAddGroup = () => {
    setModalType('group');
    setEditingGroup(null);
    setEditingLevel(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditGroup = (group: JobLevelGroup) => {
    setModalType('group');
    setEditingGroup(group);
    setEditingLevel(null);
    form.setFieldsValue({
      name: group.name,
      code: group.code,
      description: group.description,
      isActive: group.isActive,
    });
    setIsModalVisible(true);
  };

  const handleAddLevel = (groupId: string) => {
    setModalType('level');
    setEditingGroup(null);
    setEditingLevel(null);
    setSelectedGroupId(groupId);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditLevel = (level: JobLevel, groupId: string) => {
    setModalType('level');
    setEditingLevel(level);
    setEditingGroup(null);
    setSelectedGroupId(groupId);
    form.setFieldsValue({
      name: level.name,
      code: level.code,
      description: level.description,
      level: level.level,
      experienceYears: level.experienceYears,
      compensationBandId: level.compensationBandId,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (type: 'group' | 'level', item: JobLevelGroup | JobLevel) => {
    const title = type === 'group' ? 'Delete Job Level Group' : 'Delete Job Level';
    const content = type === 'group' 
      ? `Are you sure you want to delete "${item.name}"? This will also delete all associated job levels.`
      : `Are you sure you want to delete job level "${item.name}"?`;

    Modal.confirm({
      title,
      content,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        message.warning(`Delete functionality will be implemented with process API integration`);
        await refetch();
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (modalType === 'group') {
        message.warning('Save group functionality will be implemented with process API integration');
      } else {
        message.warning('Save level functionality will be implemented with process API integration');
      }
      
      setIsModalVisible(false);
      await refetch();
    } catch (error) {
      console.error('Error saving:', error);
      message.error('Failed to save');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const renderJobLevelTable = (group: JobLevelGroup) => {
    const columns = [
      {
        title: 'Level',
        key: 'level',
        width: 80,
        sorter: (a: JobLevel, b: JobLevel) => {
          const aLevel = calculateJobLevelInGroup(a, group) ?? 999;
          const bLevel = calculateJobLevelInGroup(b, group) ?? 999;
          return aLevel - bLevel;
        },
        render: (_: any, record: JobLevel) => {
          const calculatedLevel = calculateJobLevelInGroup(record, group);
          return calculatedLevel !== undefined ? (
            <Tag color="blue" className="gba:font-mono">{calculatedLevel}</Tag>
          ) : (
            <Tag color="gray">Not assigned</Tag>
          );
        },
      },
      {
        title: 'Code',
        dataIndex: 'code',
        key: 'code',
        width: 120,
        sorter: (a: JobLevel, b: JobLevel) => (a.code || '').localeCompare(b.code || ''),
      },
      {
        title: 'Name',
        dataIndex: 'displayName',
        key: 'displayName',
        sorter: (a: JobLevel, b: JobLevel) => a.displayName.localeCompare(b.displayName),
        render: (text: string, record: JobLevel) => (
          <div>
            <div className="gba:font-semibold">{text}</div>
            {record.description && (
              <div className="gba:text-sm gba:text-gray-500 gba:mt-1">{record.description}</div>
            )}
          </div>
        ),
      },
      {
        title: 'Compensation Band',
        key: 'compensationBand',
        width: 180,
        render: (_: any, record: JobLevel) => (
          record.compensationBand ? (
            <Tag color="green" className="gba:px-3 gba:py-1">
              {record.compensationBand.name}
            </Tag>
          ) : (
            <Tag color="gray">Not assigned</Tag>
          )
        ),
      },
      {
        title: 'Experience Required',
        dataIndex: 'experienceYears',
        key: 'experienceYears',
        width: 150,
        render: (years?: number) => (
          years !== undefined ? (
            <Tooltip title={`${years} years of experience required`}>
              <Tag color="orange">{years}+ years</Tag>
            </Tooltip>
          ) : (
            <Tag color="gray">Not specified</Tag>
          )
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 120,
        render: (_: any, record: JobLevel) => (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditLevel(record, group.id)}
              data-testid={`${prefixDataTestId}-edit-level-${record.id}`}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete('level', record)}
              data-testid={`${prefixDataTestId}-delete-level-${record.id}`}
            />
          </Space>
        ),
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={group.jobLevels}
        rowKey="id"
        pagination={false}
        size="small"
        className="gba:mb-4"
        locale={{
          emptyText: (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              <UserOutlined className="gba:text-2xl gba:mb-2" />
              <div>No job levels defined for this group</div>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddLevel(group.id)}
                className="gba:mt-2"
              >
                Add First Level
              </Button>
            </div>
          ),
        }}
      />
    );
  };

  const renderGroupHeader = (group: JobLevelGroup) => (
    <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
      <div className="gba:flex gba:items-center gba:space-x-3">
        <div>
          <Title level={5} className="gba:mb-0">
            {group.name}
          </Title>
          <div className="gba:flex gba:items-center gba:space-x-4 gba:mt-1">
            <Text type="secondary" className="gba:text-sm">
              Code: {group.code}
            </Text>
            <Tag color="blue" icon={<TeamOutlined />}>
              {group.jobLevelCount} levels
            </Tag>
          </div>
        </div>
      </div>
      <Space>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleAddLevel(group.id);
          }}
          data-testid={`${prefixDataTestId}-add-level-${group.id}`}
        >
          Add Level
        </Button>
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleEditGroup(group);
          }}
          data-testid={`${prefixDataTestId}-edit-group-${group.id}`}
        />
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleDelete('group', group);
          }}
          data-testid={`${prefixDataTestId}-delete-group-${group.id}`}
        />
      </Space>
    </div>
  );

  const renderGroupSummary = (group: JobLevelGroup) => (
    <div className="gba:bg-gray-50 gba:p-4 gba:rounded-lg gba:mb-4">
      <div>
        <Text strong>Description:</Text>
        <div className="gba:mt-1 gba:text-sm gba:text-gray-600">
          {group.description || 'No description provided'}
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Typography.Text type="danger">Error loading job level groups: {error}</Typography.Text>
        <div className="gba:mt-4">
          <Button onClick={refetch}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:p-6">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <Title level={3} className="gba:mb-2">Job Level Groups & Career Paths</Title>
          <Text type="secondary">
            Manage job levels organized by career groups and progression paths
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddGroup}
          data-testid={`${prefixDataTestId}-add-group`}
        >
          Add Job Level Group
        </Button>
      </div>

      {jobLevelGroups.length === 0 && !isLoading ? (
        <Card className="gba:text-center gba:py-12">
          <TeamOutlined className="gba:text-4xl gba:text-gray-400 gba:mb-4" />
          <Title level={4} type="secondary">No Job Level Groups Found</Title>
          <Text type="secondary">Create your first job level group to start organizing career paths</Text>
          <div className="gba:mt-4">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddGroup}>
              Create First Group
            </Button>
          </div>
        </Card>
      ) : (
        <Collapse
          activeKey={activeKeys}
          onChange={handleCollapseChange}
          className="gba:bg-white"
          expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
        >
          {jobLevelGroups.map((group) => (
            <Panel
              key={group.id}
              header={renderGroupHeader(group)}
              className="gba:mb-4"
            >
              {renderGroupSummary(group)}
              {renderJobLevelTable(group)}
            </Panel>
          ))}
        </Collapse>
      )}

      <Modal
        title={
          modalType === 'group'
            ? (editingGroup ? 'Edit Job Level Group' : 'Add Job Level Group')
            : (editingLevel ? 'Edit Job Level' : 'Add Job Level')
        }
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="Save"
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
          className="gba:mt-4"
        >
          {modalType === 'group' ? (
            <>
              <Form.Item
                name="name"
                label="Group Name"
                rules={[{ required: true, message: 'Please enter group name' }]}
              >
                <Input placeholder="e.g., Software Engineering, Management, Sales" />
              </Form.Item>
              <Form.Item
                name="code"
                label="Code"
                rules={[{ required: true, message: 'Please enter code' }]}
              >
                <Input placeholder="e.g., SWE, MGT, SALES" />
              </Form.Item>
              <Form.Item
                name="description"
                label="Description"
              >
                <Input.TextArea 
                  placeholder="Describe the career path and role types in this group"
                  rows={3}
                />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                name="name"
                label="Job Level Name"
                rules={[{ required: true, message: 'Please enter job level name' }]}
              >
                <Input placeholder="e.g., Senior Software Engineer, Engineering Manager" />
              </Form.Item>
              <Form.Item
                name="code"
                label="Code"
                rules={[{ required: true, message: 'Please enter code' }]}
              >
                <Input placeholder="e.g., SSE, EM" />
              </Form.Item>
              <Form.Item
                name="level"
                label="Level Number"
                rules={[{ required: true, message: 'Please enter level number' }]}
              >
                <InputNumber 
                  min={1} 
                  max={20} 
                  placeholder="1-20" 
                  className="gba:w-full"
                />
              </Form.Item>
              <Form.Item
                name="experienceYears"
                label="Experience Required (Years)"
              >
                <InputNumber 
                  min={0} 
                  max={30} 
                  placeholder="Years of experience"
                  className="gba:w-full"
                />
              </Form.Item>
              <Form.Item
                name="description"
                label="Description"
              >
                <Input.TextArea 
                  placeholder="Describe the responsibilities and requirements for this level"
                  rows={3}
                />
              </Form.Item>
              <Form.Item
                name="compensationBandId"
                label="Compensation Band"
              >
                <Select 
                  placeholder="Select compensation band (optional)"
                  allowClear
                >
                  <Select.Option value="band1">AZ1 - Entry Level</Select.Option>
                  <Select.Option value="band2">AZ2 - Junior</Select.Option>
                  <Select.Option value="band3">AZ3 - Mid Level</Select.Option>
                  <Select.Option value="band4">K/T1 - Senior</Select.Option>
                  <Select.Option value="band5">K/T2 - Principal</Select.Option>
                  <Select.Option value="band6">K/T3 - Staff</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default JobLevelGroupDetails; 