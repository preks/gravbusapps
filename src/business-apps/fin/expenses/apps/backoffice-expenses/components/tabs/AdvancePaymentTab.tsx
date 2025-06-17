import React, { useEffect, useState } from 'react';
import { Table, Alert, Input, Spin } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useAdvancePayments } from '../../hooks/useAdvancePayment';

const { Search } = Input;

const AdvancePaymentTab: React.FC<BusinessAppContextProps> = (props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { 
    payments, 
    isLoading, 
    error, 
    totalCount, 
    fetchPayments 
  } = useAdvancePayments(props);

  useEffect(() => {
    fetchPayments(searchTerm, currentPage, pageSize);
  }, [fetchPayments, searchTerm, currentPage, pageSize]);

  const handleTableChange = (pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Employee', dataIndex: 'employeeDisplayName', key: 'employee' },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate' },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate' },
  ];

  if (error) {
    return <Alert message="Error" description={error.message ?? 'Failed to load data.'} type="error" showIcon />;
  }

  return (
    <div>
      <Search
        placeholder="Search by code, description, or status"
        onSearch={setSearchTerm}
        style={{ marginBottom: 16, width: 300 }}
        enterButton
      />
      <Spin spinning={isLoading}>
        <Table
          dataSource={payments}
          columns={columns}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
          }}
          onChange={handleTableChange}
        />
      </Spin>
    </div>
  );
};

export default AdvancePaymentTab;
