import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Typography, Input, Spin, Alert, Empty, List, Button } from 'antd';
import { DataTable } from '@newwork/gravity-ui-catalog';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useExpenseReportData, ReportType } from '../../hooks/useExpenseReportData';
import dayjs from 'dayjs';
import { ensureShortDateFormat } from '../../utils/dateUtils';
import { formatAmount } from '../../utils/currencyUtils';

const { Title, Text } = Typography;

interface ExpenseReportsModalProps extends BusinessAppContextProps {
  visible: boolean;
  onCancel: () => void;
}

const ExpenseReportsModal: React.FC<ExpenseReportsModalProps> = ({
  visible,
  onCancel,
  accessToken,
  userInfo
}) => {
  // Local state for report type filtering
  const [reportTypeSearchTerm, setReportTypeSearchTerm] = useState<string>('');
  
  // Use the custom hook for report data
  const {
    reportTypes,
    selectedReportType,
    setSelectedReportType,
    reportData,
    isLoading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    fetchReportData
  } = useExpenseReportData({ accessToken, userInfo });

  // Fetch data when modal becomes visible, report type changes, or search parameters change
  useEffect(() => {
    if (visible && selectedReportType) {
      fetchReportData();
    }
  }, [visible, selectedReportType, fetchReportData, currentPage, pageSize, searchTerm]);
  
  // Filter report types based on search term
  const filteredReportTypes = useMemo(() => {
    if (!reportTypeSearchTerm) return reportTypes;
    return reportTypes.filter(report => 
      report.name.toLowerCase().includes(reportTypeSearchTerm.toLowerCase())
    );
  }, [reportTypes, reportTypeSearchTerm]);
  
  // Handle report type selection
  const handleReportTypeSelect = (type: ReportType) => {
    setSelectedReportType(type);
    setCurrentPage(1); // Reset to first page when changing report type
  };

  // Get column definitions based on selected report type
  const getColumns = () => {
    switch (selectedReportType) {
      case ReportType.EXPENSE_ITEM:
        return [
          {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (date: string) => ensureShortDateFormat(date),
            sorter: (a: any, b: any) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
          },
          {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            ellipsis: true,
            sorter: (a: any, b: any) => (a.title || '').localeCompare(b.title || '')
          },
          {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            sorter: (a: any, b: any) => (a.category || '').localeCompare(b.category || '')
          },
          {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount: number, record: any) => {
              // Handle undefined or null amount values
              const safeAmount = amount !== undefined && amount !== null ? amount : 0;
              return `${record.currency || '$'}${safeAmount.toFixed(2)}`;
            },
            sorter: (a: any, b: any) => {
              const amountA = a.amount !== undefined && a.amount !== null ? a.amount : 0;
              const amountB = b.amount !== undefined && b.amount !== null ? b.amount : 0;
              return amountA - amountB;
            }
          },
          {
            title: 'Employee',
            dataIndex: 'employeeName',
            key: 'employeeName',
            render: (name: string) => name || '-',
            ellipsis: true,
            sorter: (a: any, b: any) => (a.employeeName || '').localeCompare(b.employeeName || '')
          }
        ];
      
      case ReportType.EXPENSE_PLAN:
        return [
          {
            title: 'Date',
            dataIndex: 'startDate',
            key: 'startDate',
            render: (date: string) => ensureShortDateFormat(date),
            sorter: (a: any, b: any) => {
              const dateA = a.startDate ? dayjs(a.startDate).valueOf() : 0;
              const dateB = b.startDate ? dayjs(b.startDate).valueOf() : 0;
              return dateA - dateB;
            }
          },
          {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            ellipsis: true,
            sorter: (a: any, b: any) => (a.title || '').localeCompare(b.title || '')
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
              <span data-testid={`status-${status?.toLowerCase() || 'unknown'}`}>
                {status || 'Unknown'}
              </span>
            ),
            sorter: (a: any, b: any) => (a.status || '').localeCompare(b.status || '')
          },
          {
            title: 'Amount',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount: number, record: any) => {
              // Handle undefined or null amount values
              const safeAmount = amount !== undefined && amount !== null ? amount : 0;
              return `${record.currency || '$'}${safeAmount.toFixed(2)}`;
            },
            sorter: (a: any, b: any) => {
              const amountA = a.totalAmount !== undefined && a.totalAmount !== null ? a.totalAmount : 0;
              const amountB = b.totalAmount !== undefined && b.totalAmount !== null ? b.totalAmount : 0;
              return amountA - amountB;
            }
          },
          {
            title: 'Employee',
            dataIndex: 'employeeName',
            key: 'employeeName',
            render: (name: string) => name || '-',
            ellipsis: true,
            sorter: (a: any, b: any) => (a.employeeName || '').localeCompare(b.employeeName || '')
          }
        ];
      
      case ReportType.EXPENSE_REQUEST:
        return [
          {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => ensureShortDateFormat(date),
            sorter: (a: any, b: any) => {
              const dateA = a.createdAt ? dayjs(a.createdAt).valueOf() : 0;
              const dateB = b.createdAt ? dayjs(b.createdAt).valueOf() : 0;
              return dateA - dateB;
            }
          },
          {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            ellipsis: true,
            sorter: (a: any, b: any) => (a.title || '').localeCompare(b.title || '')
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
              <span data-testid={`status-${status?.toLowerCase() || 'unknown'}`}>
                {status || 'Unknown'}
              </span>
            ),
            sorter: (a: any, b: any) => (a.status || '').localeCompare(b.status || '')
          },
          {
            title: 'Amount',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount: number, record: any) => {
              // Handle undefined or null amount values
              const safeAmount = amount !== undefined && amount !== null ? amount : 0;
              return `${record.currency || '$'}${safeAmount.toFixed(2)}`;
            },
            sorter: (a: any, b: any) => {
              const amountA = a.totalAmount !== undefined && a.totalAmount !== null ? a.totalAmount : 0;
              const amountB = b.totalAmount !== undefined && b.totalAmount !== null ? b.totalAmount : 0;
              return amountA - amountB;
            }
          },
          {
            title: 'Employee',
            dataIndex: 'employeeName',
            key: 'employeeName',
            render: (name: string) => name || '-',
            ellipsis: true,
            sorter: (a: any, b: any) => (a.employeeName || '').localeCompare(b.employeeName || '')
          }
        ];
      
      case ReportType.ADVANCE_PAYMENT:
        return [
          {
            title: 'Date',
            dataIndex: 'startDate',
            key: 'startDate',
            render: (date: string) => ensureShortDateFormat(date),
            sorter: (a: any, b: any) => {
              const dateA = a.startDate ? dayjs(a.startDate).valueOf() : 0;
              const dateB = b.startDate ? dayjs(b.startDate).valueOf() : 0;
              return dateA - dateB;
            }
          },
          {
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            sorter: (a: any, b: any) => (a.code || '').localeCompare(b.code || '')
          },
          {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            ellipsis: true,
            sorter: (a: any, b: any) => (a.title || '').localeCompare(b.title || '')
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
              <span data-testid={`status-${status?.toLowerCase() || 'unknown'}`}>
                {status || 'Unknown'}
              </span>
            ),
            sorter: (a: any, b: any) => (a.status || '').localeCompare(b.status || '')
          },
          {
            title: 'Amount',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount: number) => {
              // Handle undefined or null amount values
              const safeAmount = amount !== undefined && amount !== null ? amount : 0;
              return formatAmount(safeAmount);
            },
            sorter: (a: any, b: any) => {
              const amountA = a.totalAmount !== undefined && a.totalAmount !== null ? a.totalAmount : 0;
              const amountB = b.totalAmount !== undefined && b.totalAmount !== null ? b.totalAmount : 0;
              return amountA - amountB;
            }
          },
          {
            title: 'Advance',
            dataIndex: 'advanceAmount',
            key: 'advanceAmount',
            render: (amount: number) => {
              // Handle undefined or null amount values
              const safeAmount = amount !== undefined && amount !== null ? amount : 0;
              return formatAmount(safeAmount);
            },
            sorter: (a: any, b: any) => {
              const amountA = a.advanceAmount !== undefined && a.advanceAmount !== null ? a.advanceAmount : 0;
              const amountB = b.advanceAmount !== undefined && b.advanceAmount !== null ? b.advanceAmount : 0;
              return amountA - amountB;
            }
          },
          {
            title: 'Employee',
            dataIndex: 'employeeName',
            key: 'employeeName',
            render: (name: string) => name || '-',
            ellipsis: true,
            sorter: (a: any, b: any) => (a.employeeName || '').localeCompare(b.employeeName || '')
          }
        ];
      
      default:
        return [];
    }
  };

  // Get report title based on selected report type
  const getReportTitle = () => {
    const report = reportTypes.find(r => r.type === selectedReportType);
    return report ? report.name : 'Expense Report';
  };

  return (
    <Modal
      title="Report List"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1200}
      className="gba:h-[90vh]"
      bodyStyle={{ height: 'calc(90vh - 110px)', overflow: 'hidden', padding: 0 }}
      style={{ paddingBottom: 0, maxWidth: '100vw' }}
      centered
      data-testid="expense-reports-modal"
    >
      <div className="gba:flex gba:h-full gba:overflow-hidden">
        {/* Left sidebar with report types */}
        <div className="gba:w-1/4 gba:pr-4 gba:border-r gba:border-gray-200 gba:overflow-y-auto gba:p-4">
          <div className="gba:mb-4">
            <Input
              placeholder="Filter report types..."
              prefix={<SearchOutlined />}
              onChange={(e) => setReportTypeSearchTerm(e.target.value)}
              value={reportTypeSearchTerm}
              data-testid="report-type-search-input"
            />
          </div>
          <List
            dataSource={filteredReportTypes}
            renderItem={(report) => (
              <List.Item
                className={`gba:cursor-pointer gba:px-2 gba:py-3 ${selectedReportType === report.type ? 'gba:bg-gray-100' : ''}`}
                onClick={() => handleReportTypeSelect(report.type)}
                data-testid={`report-type-${report.type}`}
              >
                <Text strong={selectedReportType === report.type}>{report.name}</Text>
              </List.Item>
            )}
          />
        </div>
        
        {/* Main content area */}
        <div className="gba:w-3/4 gba:pl-4 gba:p-4 gba:overflow-y-auto gba:h-full">
          {/* Report title and actions */}
          <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
            <Title level={4}>{getReportTitle()}</Title>
            <div className="gba:flex gba:items-center gba:gap-4">
              <Input
                placeholder="Search report contents..."
                prefix={<SearchOutlined />}
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
                style={{ width: 250 }}
                data-testid="report-content-search-input"
              />
            </div>
          </div>
          
          {/* Reports table */}
          {isLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
              <Spin size="large" data-testid="loading-spinner" />
            </div>
          ) : error ? (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              data-testid="error-alert"
            />
          ) : reportData.length === 0 ? (
            <Empty
              description="No data found"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              data-testid="empty-state"
            />
          ) : (
            <div className="gba:flex gba:flex-col gba:w-full">
              <div className="gba:relative">
                <DataTable
                  dataSource={reportData}
                  columns={getColumns()}
                  rowKey="id"
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: totalCount,
                    onChange: setCurrentPage,
                    onShowSizeChange: (_: number, size: number) => setPageSize(size),
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                  }}
                  data-testid="reports-table"
                />
                <div className="gba:absolute gba:bottom-4 gba:left-4">
                  <Button
                    icon={<DownloadOutlined />}
                    disabled={reportData.length === 0 || isLoading}
                    data-testid="download-report-button"
                    onClick={() => console.log(`Downloading ${getReportTitle()}`)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ExpenseReportsModal;
