import React, { useCallback } from 'react';
import { DataTable, Avatar, Tag } from '@newwork/gravity-ui-catalog';
import { PiUser, PiCurrencyDollar, PiTarget, PiFunnel, PiCalendar, PiBuilding } from 'react-icons/pi';
import { Opportunity } from '../types';

export interface OpportunityTableProps {
  data: Opportunity[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (page: number, pageSize?: number) => Promise<void>;
  retry: () => void;
  total: number;
  currentPage: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  onSelectOpportunity?: (opportunity: Opportunity) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: 'ASC' | 'DESC') => void;
  selectedOpportunityId?: string;
  accessToken: string;
}

const DATA_TEST_ID_PREFIX = 'OpportunityTable';

const OpportunityTable: React.FC<OpportunityTableProps> = ({
  data,
  loading,
  error,
  hasMore,
  loadMore,
  loadPage,
  retry,
  total,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onSelectOpportunity,
  onPaginationChange,
  onSortingChange,
  selectedOpportunityId,
  accessToken
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
    return stageColors[stage || ''] || 'gray';
  };

  const getWinRateColor = (winningChance?: number): string => {
    if (!winningChance) return 'gray';
    if (winningChance >= 75) return 'green';
    if (winningChance >= 50) return 'orange';
    if (winningChance >= 25) return 'yellow';
    return 'red';
  };

  // Get sort order for column
  const getSortOrder = (columnField: string): any => {
    if (sortField === 'createdAt' && sortOrder === 'DESC' && columnField === 'createdAt') {
      return false;
    }
    if (sortField === columnField) {
      return sortOrder === 'ASC' ? 'ascend' : 'descend';
    }
    return false;
  };

  // Handle row click
  const handleRowClick = useCallback((record: Opportunity) => {
    onSelectOpportunity?.(record);
  }, [onSelectOpportunity]);

  // Handle table change
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    const targetPage = pagination.current ?? 1;
    const targetPageSize = pagination.pageSize ?? 20;
    
    if (pagination.current !== currentPage || pagination.pageSize !== pageSize) {
      onPaginationChange(targetPage, targetPageSize);
    }
  };

  // Handle sorting change
  const handleSorterChange = (sorter: any) => {
    if (sorter.field && sorter.order) {
      const field = Array.isArray(sorter.field) ? sorter.field[0] : sorter.field;
      const order = sorter.order === 'ascend' ? 'ASC' : 'DESC';
      
      if (field !== sortField || order !== sortOrder) {
        onSortingChange(field, order);
      }
    } else {
      if (sortField !== 'createdAt' || sortOrder !== 'DESC') {
        onSortingChange('createdAt', 'DESC');
      }
    }
  };

  const columns = [
    {
      title: 'Opportunity',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: getSortOrder('name'),
      width: '25%',
      render: (_: any, record: Opportunity) => (
        <div>
          <div className="gba:font-medium gba:text-sm gba:truncate" title={record.name}>
            {record.name}
          </div>
          {record.account && (
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-gray-500">
              <PiBuilding size={12} />
              <span className="gba:truncate" title={record.account.name}>
                {record.account.name}
              </span>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Value',
      dataIndex: 'estimatedAmount',
      key: 'estimatedAmount',
      sorter: true,
      sortOrder: getSortOrder('estimatedAmount'),
      width: '15%',
      align: 'right',
      render: (_: any, record: Opportunity) => (
        <div className="gba:text-sm gba:font-medium">
          {formatCurrency(record.estimatedAmount, record.currency?.code)}
        </div>
      )
    },
    {
      title: 'Win Rate',
      dataIndex: 'winningChance',
      key: 'winningChance',
      sorter: true,
      sortOrder: getSortOrder('winningChance'),
      width: '12%',
      align: 'center',
      render: (_: any, record: Opportunity) => (
        <Tag color={getWinRateColor(record.winningChance)}>
          {record.winningChance ? `${record.winningChance}%` : '0%'}
        </Tag>
      )
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      sorter: true,
      sortOrder: getSortOrder('stage'),
      width: '15%',
      render: (_: any, record: Opportunity) => (
        <Tag color={getStageColor(record.stage)}>
          {record.stage || 'Unknown'}
        </Tag>
      )
    },
    {
      title: 'Pipeline',
      dataIndex: 'salesPipeline',
      key: 'salesPipeline',
      width: '15%',
      render: (_: any, record: Opportunity) => (
        <div className="gba:text-sm gba:truncate" title={record.salesPipeline?.value}>
          {record.salesPipeline?.value || '-'}
        </div>
      )
    },
    {
      title: 'Close Date',
      dataIndex: 'closeDate',
      key: 'closeDate',
      sorter: true,
      sortOrder: getSortOrder('closeDate'),
      width: '12%',
      render: (_: any, record: Opportunity) => (
        <div className="gba:text-sm">
          {formatDate(record.closeDate)}
        </div>
      )
    },
    {
      title: 'Owner',
      dataIndex: 'ownerEmployee',
      key: 'ownerEmployee',
      width: '15%',
      render: (_: any, record: Opportunity) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Avatar 
            size="small" 
            src={record.ownerEmployee?.pictureThumbnail} 
            fallback={<PiUser />}
          />
          <div className="gba:text-sm gba:truncate" title={record.ownerEmployee?.displayName}>
            {record.ownerEmployee?.displayName || 'Unassigned'}
          </div>
        </div>
      )
    }
  ];

  return (
    <DataTable
      dataSource={data}
      columns={columns}
      loading={loading}
      onChange={handleTableChange}
      onSorterChange={handleSorterChange}
      onRowClick={handleRowClick}
      pagination={{
        current: currentPage,
        pageSize,
        total,
        showQuickJumper: true,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100]
      }}
      rowKey="id"
      selectedRowKeys={selectedOpportunityId ? [selectedOpportunityId] : []}
      scroll={{ x: 1000 }}
      data-testid={`${DATA_TEST_ID_PREFIX}-table`}
    />
  );
};

export default OpportunityTable; 