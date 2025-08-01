import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button, 
  Badge, 
  Alert,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system';
import { 
  ChartBarIcon, 
  TableIcon, 
  DownloadIcon, 
  XIcon 
} from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DatasetDTO } from '@/common/network/dataset';

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

  const tableColumns = getTableColumns();

  return (
    <Card
      data-testid="query-results-card"
      style={{ marginTop: 'var(--spacing-6)' }}
    >
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between" style={{ columnGap: '0' }}>
        <CardTitle className="gba:flex gba:items-center" style={{ gap: 'var(--spacing-2)' }}>
          <ChartBarIcon />
          <span>Query Results</span>
        </CardTitle>
        <div className="gba:flex gba:items-center" style={{ gap: 'var(--spacing-2)' }}>
          <Button 
            variant="outline"
            onClick={exportToCSV}
            data-testid="export-csv-button"
            className="gba:flex gba:items-center"
            style={{ gap: 'var(--spacing-2)' }}
          >
            <DownloadIcon />
            Export CSV
          </Button>
          <Button 
            variant="outline"
            onClick={onClear}
            data-testid="clear-results-button"
            className="gba:flex gba:items-center"
            style={{ gap: 'var(--spacing-2)' }}
          >
            <XIcon />
            Clear
          </Button>
        </div>
      </CardHeader>

      <CardContent style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)'
      }}>
        {/* Summary Statistics */}
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3" style={{ 
          gap: 'var(--spacing-4)', 
          marginBottom: 'var(--spacing-4)' 
        }}>
          <div>
            <h3 className="gba:text-sm" style={{ 
              color: 'var(--color-muted-foreground)',
              margin: 'var(--spacing-0)'
            }}>
              Total Records
            </h3>
            <p className="gba:text-4xl gba:font-bold" style={{ 
              color: 'var(--color-foreground)',
              margin: 'var(--spacing-0)'
            }} data-testid="total-records-stat">
              {data.length}
            </p>
          </div>
          <div>
            <h3 className="gba:text-sm" style={{ 
              color: 'var(--color-muted-foreground)',
              margin: 'var(--spacing-0)'
            }}>
              Categories
            </h3>
            <p className="gba:text-4xl gba:font-bold" style={{ 
              color: 'var(--color-foreground)',
              margin: 'var(--spacing-0)'
            }} data-testid="categories-stat">
              {categories.length}
            </p>
          </div>
          <div>
            <h3 className="gba:text-sm" style={{ 
              color: 'var(--color-muted-foreground)', 
              margin: 'var(--spacing-0)',
              marginBottom: 'var(--spacing-1)'
            }}>
              Categories:
            </h3>
            <div className="gba:flex gba:flex-wrap" style={{ gap: 'var(--spacing-2)' }}>
              {categories.map(category => (
                <Badge key={category} variant="default">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {data.length === 0 ? (
          <Alert data-testid="no-data-alert">
            <div>
              <h4 style={{ 
                color: 'var(--color-info)',
                margin: 'var(--spacing-0)'
              }}>No Data</h4>
              <p style={{ margin: 'var(--spacing-0)' }}>The query executed successfully but returned no results.</p>
            </div>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="results-tabs">
            <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
              <TabsTrigger value="chart" className="gba:flex gba:items-center" style={{ gap: 'var(--spacing-2)' }}>
                <ChartBarIcon />
                Chart View
              </TabsTrigger>
              <TabsTrigger value="table" className="gba:flex gba:items-center" style={{ gap: 'var(--spacing-2)' }}>
                <TableIcon />
                Table View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chart">
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
                    <Bar dataKey="value" fill="var(--color-primary)" name="Value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="table">
              <div className="gba:border gba:rounded-md">
                <Table data-testid="results-table">
                  <TableHeader>
                    <TableRow>
                      {tableColumns.map((column) => (
                        <TableHead key={column.key}>
                          {column.title}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slice(0, 50).map((record, index) => (
                      <TableRow key={index}>
                        {tableColumns.map((column) => (
                          <TableCell key={column.key}>
                            {column.render ? column.render(record[column.dataIndex]) : record[column.dataIndex]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {data.length > 50 && (
                  <div style={{ 
                    padding: 'var(--spacing-4)', 
                    textAlign: 'center',
                    color: 'var(--color-muted-foreground)',
                    fontSize: '0.875rem'
                  }}>
                    Showing first 50 of {data.length} records
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}; 