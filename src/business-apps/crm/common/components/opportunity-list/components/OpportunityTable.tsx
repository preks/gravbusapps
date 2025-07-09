import React from 'react';
import { Table, Tag, Avatar, Typography, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Opportunity } from '../types';

const { Text } = Typography;

export interface OpportunityTableProps {
  data: Opportunity[];
  loading: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, size?: number) => void;
    showQuickJumper?: boolean;
    showSizeChanger?: boolean;
    pageSizeOptions?: string[];
  };
  scroll?: { x?: number; y?: number };
  onRowClick?: (opportunity: Opportunity) => void;
  sortOrder?: 'ASC' | 'DESC';
  sortField?: string;
  onSort?: (field: string, order: 'ASC' | 'DESC') => void;
}

const OpportunityTable: React.FC<OpportunityTableProps> = ({
  data,
  loading,
  pagination,
  scroll,
  onRowClick,
  sortOrder,
  sortField,
  onSort
}) => {
  const formatCurrency = (amount: number | undefined, currency?: string): string => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStageColor = (stage?: string): string => {
    const stageColors: Record<string, string> = {
      'Qualification': 'blue',
      'Needs Analysis': 'cyan',
      'Proposal': 'orange',
      'Negotiation': 'purple',
      'Closed Won': 'green',
      'Closed Lost': 'red'
    };
    return stageColors[stage || ''] || 'default';
  };

  const getWinRateColor = (winningChance?: number): string => {
    if (!winningChance) return '#d9d9d9';
    if (winningChance >= 75) return '#52c41a';
    if (winningChance >= 50) return '#fa8c16';
    if (winningChance >= 25) return '#faad14';
    return '#ff4d4f';
  };

  const columns: ColumnsType<Opportunity> = [
    {
      title: 'Opportunity',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: true,
      sortOrder: sortField === 'name' ? (sortOrder === 'ASC' ? 'ascend' : 'descend') : null,
      render: (text: string, record: Opportunity) => (
        <div data-testid={`opportunity-name-${record.id}`}>
          <Text strong className="gba:block gba:truncate" title={text}>
            {text}
          </Text>
          {record.account && (
            <Text type="secondary" className="gba:text-xs gba:truncate" title={record.account.name}>
              {record.account.name}
            </Text>
          )}
        </div>
      )
    },
    {
      title: 'Value',
      dataIndex: 'estimatedAmount',
      key: 'estimatedAmount',
      width: 120,
      align: 'right',
      sorter: true,
      sortOrder: sortField === 'estimatedAmount' ? (sortOrder === 'ASC' ? 'ascend' : 'descend') : null,
      render: (amount: number | undefined, record: Opportunity) => (
        <Text strong data-testid={`opportunity-value-${record.id}`}>
          {formatCurrency(amount, record.currency?.code)}
        </Text>
      )
    },
    {
      title: 'Win Rate',
      dataIndex: 'winningChance',
      key: 'winningChance',
      width: 100,
      align: 'center',
      sorter: true,
      sortOrder: sortField === 'winningChance' ? (sortOrder === 'ASC' ? 'ascend' : 'descend') : null,
      render: (winningChance: number | undefined, record: Opportunity) => (
        <Tag 
          color={getWinRateColor(winningChance)} 
          data-testid={`opportunity-winrate-${record.id}`}
        >
          {winningChance ? `${winningChance}%` : '0%'}
        </Tag>
      )
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      width: 130,
      sorter: true,
      sortOrder: sortField === 'stage' ? (sortOrder === 'ASC' ? 'ascend' : 'descend') : null,
      render: (stage: string | undefined, record: Opportunity) => (
        <Tag 
          color={getStageColor(stage)} 
          data-testid={`opportunity-stage-${record.id}`}
        >
          {stage || 'Unknown'}
        </Tag>
      )
    },
    {
      title: 'Pipeline',
      dataIndex: 'salesPipeline',
      key: 'salesPipeline',
      width: 140,
      render: (pipeline: Opportunity['salesPipeline'], record: Opportunity) => (
        <Text 
          className="gba:truncate gba:block" 
          title={pipeline?.value}
          data-testid={`opportunity-pipeline-${record.id}`}
        >
          {pipeline?.value || '-'}
        </Text>
      )
    },
    {
      title: 'Close Date',
      dataIndex: 'closeDate',
      key: 'closeDate',
      width: 110,
      sorter: true,
      sortOrder: sortField === 'closeDate' ? (sortOrder === 'ASC' ? 'ascend' : 'descend') : null,
      render: (closeDate: string | undefined, record: Opportunity) => (
        <Text data-testid={`opportunity-closedate-${record.id}`}>
          {formatDate(closeDate)}
        </Text>
      )
    },
    {
      title: 'Owner',
      dataIndex: 'ownerEmployee',
      key: 'ownerEmployee',
      width: 150,
      render: (owner: Opportunity['ownerEmployee'], record: Opportunity) => (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`opportunity-owner-${record.id}`}>
          <Avatar 
            size="small" 
            src={owner?.pictureThumbnail} 
            icon={<UserOutlined />}
          />
          <Tooltip title={owner?.displayName}>
            <Text className="gba:truncate">
              {owner?.displayName || 'Unassigned'}
            </Text>
          </Tooltip>
        </div>
      )
    },
    {
      title: 'Source',
      dataIndex: 'salesLeadSource',
      key: 'salesLeadSource',
      width: 120,
      render: (source: Opportunity['salesLeadSource'], record: Opportunity) => (
        <Text 
          className="gba:truncate gba:block" 
          title={source?.value}
          data-testid={`opportunity-source-${record.id}`}
        >
          {source?.value || '-'}
        </Text>
      )
    }
  ];

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    if (sorter && onSort) {
      const order = sorter.order === 'ascend' ? 'ASC' : 'DESC';
      onSort(sorter.field, order);
    }
  };

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={pagination}
      scroll={scroll}
      rowKey="id"
      size="small"
      onChange={handleTableChange}
      onRow={(record) => ({
        onClick: () => onRowClick?.(record),
        style: { cursor: onRowClick ? 'pointer' : 'default' }
      })}
      data-testid="opportunity-table"
    />
  );
};

export default OpportunityTable; 