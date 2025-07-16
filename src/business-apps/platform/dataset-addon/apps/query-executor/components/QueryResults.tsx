import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Typography, 
  Space, 
  Button, 
  Tag, 
  Alert,
  Tabs,
  Statistic,
  Row,
  Col
} from 'antd';
import { 
  BarChartOutlined, 
  TableOutlined, 
  DownloadOutlined, 
  CloseOutlined 
} from '@ant-design/icons';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DatasetDTO } from '@/common/network/dataset';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface QueryResultsProps {
  results: DatasetDTO | null;
  onClear: () => void;
}

export const QueryResults: React.FC<QueryResultsProps> = ({
  results,
  onClear
}) => {
  const [activeTab, setActiveTab] = useState('chart');

  if (!results) {
    return null;
  }

  const { data, categories } = results;

  // Detect if this is timeseries data
  const isTimeseries = data.length > 0 && 'dateCategory' in data[0];

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.getFullYear().toString();
    } catch {
      return dateStr;
    }
  };

  // Prepare table columns dynamically based on data
  const getTableColumns = () => {
    if (data.length === 0) return [];

    const sampleRow = data[0];
    return Object.keys(sampleRow).map(key => ({
      title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      dataIndex: key,
      key,
      render: (value: any) => {
        if (typeof value === 'number') {
          return new Intl.NumberFormat().format(value);
        }
        // Format dates in table
        if (key === 'dateCategory' && typeof value === 'string') {
          return formatDate(value);
        }
        return value;
      },
      sorter: (a: any, b: any) => {
        if (typeof a[key] === 'number') {
          return a[key] - b[key];
        }
        return String(a[key]).localeCompare(String(b[key]));
      }
    }));
  };

  // Prepare chart data
  const chartData = data.map((item, index) => ({
    ...item,
    id: index,
    // Add formatted date for chart display
    ...(isTimeseries && item.dateCategory && {
      formattedDate: formatDate(item.dateCategory)
    })
  }));

  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card
      data-testid="query-results-card"
      className="gba:mt-6"
      title={
        <Space>
          <BarChartOutlined />
          <Title level={4} className="gba:mb-0">Query Results</Title>
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={exportToCSV}
            data-testid="export-csv-button"
          >
            Export CSV
          </Button>
          <Button 
            icon={<CloseOutlined />} 
            onClick={onClear}
            data-testid="clear-results-button"
          >
            Clear
          </Button>
        </Space>
      }
    >
      <div className="gba:space-y-4">
        {/* Summary Statistics */}
        <Row gutter={16} className="gba:mb-4">
          <Col span={8}>
            <Statistic 
              title="Total Records" 
              value={data.length} 
              data-testid="total-records-stat"
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="Categories" 
              value={categories.length} 
              data-testid="categories-stat"
            />
          </Col>
          <Col span={8}>
            <div>
              <Text className="gba:text-gray-500 gba:block">Categories:</Text>
              <Space wrap>
                {categories.map(category => (
                  <Tag key={category} color="blue">{category}</Tag>
                ))}
              </Space>
            </div>
          </Col>
        </Row>

        {data.length === 0 ? (
          <Alert
            message="No Data"
            description="The query executed successfully but returned no results."
            type="info"
            showIcon
            data-testid="no-data-alert"
          />
        ) : (
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            data-testid="results-tabs"
          >
            <TabPane 
              tab={
                <span>
                  <BarChartOutlined />
                  {isTimeseries ? 'Timeseries Chart' : 'Dataset Chart'}
                </span>
              } 
              key="chart"
            >
              <div className="gba:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  {isTimeseries ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="formattedDate" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(label) => `Year: ${label}`}
                        formatter={(value, name) => [new Intl.NumberFormat().format(value as number), name]}
                      />
                      <Legend />
                      {categories.map((category, index) => (
                        <Line 
                          key={category}
                          type="monotone" 
                          dataKey="value" 
                          stroke={`hsl(${index * 137.5 % 360}, 70%, 50%)`}
                          strokeWidth={2}
                          name={category}
                        />
                      ))}
                    </LineChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="category" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [new Intl.NumberFormat().format(value as number), name]}
                      />
                      <Legend />
                      <Bar dataKey="value" fill="#1890ff" name="Value" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </TabPane>

            <TabPane 
              tab={
                <span>
                  <TableOutlined />
                  Table View
                </span>
              } 
              key="table"
            >
              <Table
                dataSource={data}
                columns={getTableColumns()}
                rowKey={(record, index) => index?.toString() || '0'}
                pagination={{
                  pageSize: 50,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} of ${total} records`
                }}
                scroll={{ x: true }}
                data-testid="results-table"
              />
            </TabPane>
          </Tabs>
        )}
      </div>
    </Card>
  );
}; 