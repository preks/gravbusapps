import React, { useState } from 'react';
import { 
  Table, 
  Button, 
  Tag, 
  Space, 
  Tooltip, 
  Popconfirm, 
  Typography, 
  Select, 
  Input, 
  Row, 
  Col,
  Card
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { QueryDefinition, QueryType, QueryStatus } from '@/common/network/dataset';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

interface QueryDefinitionListProps {
  queries: QueryDefinition[];
  isLoading: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  totalQueries: number;
  currentPage: number;
  pageSize: number;
  onEdit: (query: QueryDefinition) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: QueryStatus) => void;
  onPageChange: (page: number, size: number) => void;
  onFilter: (filters: { queryType?: QueryType; status?: QueryStatus; search?: string }) => void;
}

export const QueryDefinitionList: React.FC<QueryDefinitionListProps> = ({
  queries,
  isLoading,
  isUpdating,
  isDeleting,
  totalQueries,
  currentPage,
  pageSize,
  onEdit,
  onDelete,
  onStatusChange,
  onPageChange,
  onFilter
}) => {
  const [filters, setFilters] = useState<{
    queryType?: QueryType;
    status?: QueryStatus;
    search?: string;
  }>({});

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilter({});
  };

  const getStatusColor = (status: QueryStatus) => {
    return status === QueryStatus.ACTIVE ? 'green' : 'orange';
  };

  const getTypeColor = (type: QueryType) => {
    return type === QueryType.DATASET ? 'blue' : 'purple';
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: QueryDefinition, b: QueryDefinition) => a.name.localeCompare(b.name),
      render: (name: string, record: QueryDefinition) => (
        <div>
          <Typography.Text strong>{name}</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Typography.Text>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'queryType',
      key: 'queryType',
      width: 100,
      filters: [
        { text: 'Dataset', value: QueryType.DATASET },
        { text: 'Timeseries', value: QueryType.TIMESERIES }
      ],
      render: (type: QueryType) => (
        <Tag color={getTypeColor(type)}>{type}</Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: 'Active', value: QueryStatus.ACTIVE },
        { text: 'Draft', value: QueryStatus.DRAFT }
      ],
      render: (status: QueryStatus, record: QueryDefinition) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      )
    },
    {
      title: 'Parameters',
      dataIndex: 'parameters',
      key: 'parameters',
      width: 120,
      render: (parameters: any[]) => (
        <span>{parameters.length} params</span>
      )
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
             render: (_value: any, record: QueryDefinition) => (
        <Space>
          <Tooltip title="Edit Query">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => onEdit(record)}
              data-testid={`edit-query-${record.name}`}
            />
          </Tooltip>
          
          <Tooltip title={record.status === QueryStatus.ACTIVE ? 'Deactivate' : 'Activate'}>
            <Button
              icon={record.status === QueryStatus.ACTIVE ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              size="small"
              loading={isUpdating}
              onClick={() => onStatusChange(
                record.id!,
                record.status === QueryStatus.ACTIVE ? QueryStatus.DRAFT : QueryStatus.ACTIVE
              )}
              data-testid={`toggle-status-${record.name}`}
            />
          </Tooltip>
          
          <Popconfirm
            title="Delete Query"
            description="Are you sure you want to delete this query? This action cannot be undone."
            onConfirm={() => onDelete(record.id!)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete Query">
              <Button
                icon={<DeleteOutlined />}
                size="small"
                danger
                loading={isDeleting}
                data-testid={`delete-query-${record.name}`}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card data-testid="query-definition-list">
      {/* Header */}
      <div className="gba:mb-4">
        <Title level={4} className="gba:mb-0">
          Query Definitions ({totalQueries})
        </Title>
      </div>

      {/* Filters */}
      <Row gutter={16} className="gba:mb-4">
        <Col span={6}>
          <Select
            placeholder="Filter by Type"
            allowClear
            style={{ width: '100%' }}
            value={filters.queryType}
            onChange={(value) => handleFilterChange('queryType', value)}
            data-testid="filter-by-type"
          >
            <Option value={QueryType.DATASET}>Dataset</Option>
            <Option value={QueryType.TIMESERIES}>Timeseries</Option>
          </Select>
        </Col>
        <Col span={6}>
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ width: '100%' }}
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            data-testid="filter-by-status"
          >
            <Option value={QueryStatus.ACTIVE}>Active</Option>
            <Option value={QueryStatus.DRAFT}>Draft</Option>
          </Select>
        </Col>
        <Col span={8}>
          <Search
            placeholder="Search queries..."
            allowClear
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            data-testid="search-queries"
          />
        </Col>
        <Col span={4}>
          <Button onClick={clearFilters}>Clear Filters</Button>
        </Col>
      </Row>

      {/* Table */}
      <Table
        dataSource={queries}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: currentPage + 1,
          pageSize,
          total: totalQueries,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} queries`,
          onChange: (page, size) => onPageChange(page - 1, size || 20)
        }}
        scroll={{ x: true }}
        data-testid="query-definitions-table"
      />
    </Card>
  );
}; 