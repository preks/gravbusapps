import React, { useState } from 'react'
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
} from '@newwork/nw-design-system'
import { ChartBarIcon, TableIcon, DownloadIcon, XIcon } from '@phosphor-icons/react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DatasetDTO } from '@/common/network/dataset'

interface QueryResultsProps {
  results: DatasetDTO | null
  onClear: () => void
}

export const QueryResults: React.FC<QueryResultsProps> = ({ results, onClear }) => {
  const [activeTab, setActiveTab] = useState('chart')

  if (!results) {
    return null
  }

  const { data, categories } = results

  // Detect if this is timeseries data
  const isTimeseries = data.length > 0 && 'dateCategory' in data[0]

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.getFullYear().toString()
    } catch {
      return dateStr
    }
  }

  // Prepare table columns dynamically based on data
  const getTableColumns = () => {
    if (data.length === 0) return []

    const sampleRow = data[0]
    return Object.keys(sampleRow).map(key => ({
      title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      dataIndex: key,
      key,
      render: (value: any) => {
        if (typeof value === 'number') {
          return new Intl.NumberFormat().format(value)
        }
        // Format dates in table
        if (key === 'dateCategory' && typeof value === 'string') {
          return formatDate(value)
        }
        return value
      },
      sorter: (a: any, b: any) => {
        if (typeof a[key] === 'number') {
          return a[key] - b[key]
        }
        return String(a[key]).localeCompare(String(b[key]))
      }
    }))
  }

  // Prepare chart data
  const chartData = data.map((item, index) => ({
    ...item,
    id: index,
    // Add formatted date for chart display
    ...(isTimeseries &&
      item.dateCategory && {
        formattedDate: formatDate(item.dateCategory)
      })
  }))

  const exportToCSV = () => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header]
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const tableColumns = getTableColumns()

  return (
    <Card
      data-testid="query-results-card"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 'var(--nw-spacing-4)'
      }}
    >
      <CardHeader
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 'var(--nw-spacing-4)',
          gap: 'var(--nw-spacing-4)'
        }}
      >
        <CardTitle
          className="gba:flex gba:items-center gba:flex-1"
          style={{
            gap: 'var(--nw-spacing-2)',
            minWidth: 0
          }}
        >
          <ChartBarIcon size={20} />
          <span>Query Results</span>
        </CardTitle>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--nw-spacing-2)',
            flexShrink: 0
          }}
        >
          <Button
            variant="outline"
            onClick={exportToCSV}
            data-testid="export-csv-button"
            className="gba:flex gba:items-center gba:min-w-[120px] gba:h-9"
            style={{
              gap: 'var(--nw-spacing-2)',
              fontSize: '14px',
              padding: 'var(--nw-spacing-2) var(--nw-spacing-4)'
            }}
          >
            <DownloadIcon size={16} />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={onClear}
            data-testid="clear-results-button"
            className="gba:flex gba:items-center gba:min-w-[80px] gba:h-9"
            style={{
              gap: 'var(--nw-spacing-2)',
              fontSize: '14px',
              padding: 'var(--nw-spacing-2) var(--nw-spacing-4)'
            }}
          >
            <XIcon size={16} />
            Clear
          </Button>
        </div>
      </CardHeader>

      <CardContent
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--nw-spacing-4)'
        }}
      >
        {/* Summary Statistics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--nw-spacing-4)',
            marginBottom: 'var(--nw-spacing-4)',
            flexShrink: 0
          }}
        >
          <div>
            <h3
              className="gba:text-sm"
              style={{
                color: 'var(--nw-color-muted-foreground)',
                margin: '0 0 var(--nw-spacing-1) 0'
              }}
            >
              Total Records
            </h3>
            <p
              className="gba:text-2xl gba:font-bold"
              style={{
                color: 'var(--nw-color-foreground)',
                margin: 'var(--nw-spacing-0)'
              }}
              data-testid="total-records-stat"
            >
              {data.length}
            </p>
          </div>
          <div>
            <h3
              className="gba:text-sm"
              style={{
                color: 'var(--nw-color-muted-foreground)',
                margin: '0 0 var(--nw-spacing-1) 0'
              }}
            >
              Categories
            </h3>
            <p
              className="gba:text-2xl gba:font-bold"
              style={{
                color: 'var(--nw-color-foreground)',
                margin: 'var(--nw-spacing-0)'
              }}
              data-testid="categories-stat"
            >
              {categories.length}
            </p>
          </div>
          <div>
            <h3
              className="gba:text-sm"
              style={{
                color: 'var(--nw-color-muted-foreground)',
                margin: '0 0 var(--nw-spacing-1) 0'
              }}
            >
              Categories:
            </h3>
            <div className="gba:flex gba:flex-wrap" style={{ gap: 'var(--nw-spacing-1)' }}>
              {categories.slice(0, 3).map(category => (
                <Badge key={category} variant="secondary" style={{ fontSize: '0.75rem' }}>
                  {category}
                </Badge>
              ))}
              {categories.length > 3 && (
                <Badge variant="outline" style={{ fontSize: '0.75rem' }}>
                  +{categories.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </div>

        {data.length === 0 ? (
          <Alert data-testid="no-data-alert">
            <div>
              <h4
                style={{
                  color: 'var(--nw-color-info)',
                  margin: 'var(--nw-spacing-0)'
                }}
              >
                No Data
              </h4>
              <p style={{ margin: 'var(--nw-spacing-0)' }}>The query executed successfully but returned no results.</p>
            </div>
          </Alert>
        ) : (
          <div
            style={{
              minHeight: '500px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              data-testid="results-tabs"
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1
              }}
            >
              <TabsList
                className="gba:grid gba:w-full gba:grid-cols-2"
                style={{ flexShrink: 0, marginBottom: 'var(--nw-spacing-4)' }}
              >
                <TabsTrigger value="chart" className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                  <ChartBarIcon size={16} />
                  Chart View
                </TabsTrigger>
                <TabsTrigger value="table" className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                  <TableIcon size={16} />
                  Table View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chart" style={{ flex: 1, minHeight: '400px' }}>
                <div style={{ height: '400px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="var(--nw-color-primary)" name="Value" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="table" style={{ flex: 1, minHeight: '400px' }}>
                <div
                  style={{
                    border: '1px solid var(--nw-color-border)',
                    borderRadius: 'var(--nw-border-radius-md)',
                    overflow: 'hidden',
                    height: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      overflow: 'auto'
                    }}
                  >
                    <Table data-testid="results-table">
                      <TableHeader
                        style={{ position: 'sticky', top: 0, backgroundColor: 'var(--nw-color-background)', zIndex: 1 }}
                      >
                        <TableRow>
                          {tableColumns.map(column => (
                            <TableHead key={column.key}>{column.title}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((record, index) => (
                          <TableRow key={index}>
                            {tableColumns.map(column => (
                              <TableCell key={column.key}>
                                {column.render ? column.render(record[column.dataIndex]) : record[column.dataIndex]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {data.length > 0 && (
                    <div
                      style={{
                        padding: 'var(--nw-spacing-3)',
                        textAlign: 'center',
                        color: 'var(--nw-color-muted-foreground)',
                        fontSize: '0.875rem',
                        borderTop: '1px solid var(--nw-color-border)',
                        backgroundColor: 'var(--nw-color-background)',
                        flexShrink: 0
                      }}
                    >
                      Showing all {data.length} records
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
