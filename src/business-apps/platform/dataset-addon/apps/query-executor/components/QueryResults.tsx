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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
    id: index
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
                  Chart View
                </span>
              } 
              key="chart"
            >
              <div className="gba:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="category" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#1890ff" name="Value" />
                  </BarChart>
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