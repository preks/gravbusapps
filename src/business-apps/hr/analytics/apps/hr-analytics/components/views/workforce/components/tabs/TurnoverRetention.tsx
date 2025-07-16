import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system';
import { PiFileText, PiFilePdf } from 'react-icons/pi';
import { BusinessAppContextProps } from '../../../../../../../../../../common/BusinessAppContext';
import TurnoverRetentionStatistics from '../components/TurnoverRetentionStatistics';
import TurnoverRateChart from '../components/TurnoverRateChart';
import TenureDistributionChart from '../components/TenureDistributionChart';
import RetentionByDepartmentChart from '../components/RetentionByDepartmentChart';
import { useTurnoverRetentionData } from '../hooks/useTurnoverRetentionData';

interface TurnoverRetentionProps extends BusinessAppContextProps {}

interface TableData {
  category: string;
  value: number | string;
  date?: string;
}

const TurnoverRetention: React.FC<TurnoverRetentionProps> = (context) => {
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [exportingTable, setExportingTable] = useState<string | null>(null);

  const {
    turnoverRateOverTime,
    tenureDistribution,
    retentionByDepartment,
    statistics,
    isLoading,
    error,
    refetch
  } = useTurnoverRetentionData(context);

  // Transform data for table display
  const transformTurnoverRateData = (): TableData[] => {
    return turnoverRateOverTime.map(item => ({
      category: new Date(item.dateCategory).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      }),
      value: `${item.value.toFixed(1)}%`,
      date: item.dateCategory
    }));
  };

  const transformTenureDistributionData = (): TableData[] => {
    const total = tenureDistribution.reduce((sum, item) => sum + item.value, 0);
    return tenureDistribution.map(item => ({
      category: item.category,
      value: `${item.value} employees (${total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'}%)`
    }));
  };

  const transformRetentionByDepartmentData = (): TableData[] => {
    return retentionByDepartment
      .sort((a, b) => a.value - b.value) // Sort by retention rate (lowest first)
      .map(item => ({
        category: item.category,
        value: `${item.value.toFixed(1)}% retention`
      }));
  };

  // Mock export functions
  const handleExport = async (format: 'excel' | 'pdf', tableName: string, data: TableData[]) => {
    setExportingTable(`${tableName}-${format}`);
    
    // Mock export delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log(`Exporting ${tableName} as ${format}:`, data);
    
    setExportingTable(null);
  };

  const handleChartClick = (chartId: string) => {
    setSelectedChart(selectedChart === chartId ? null : chartId);
  };

  // Chart configurations
  const chartConfigs = [
    {
      title: 'Turnover Rate Over Time',
      data: turnoverRateOverTime,
      tableData: transformTurnoverRateData(),
      testId: 'turnover-rate-chart',
      tag: `${turnoverRateOverTime.length} months`,
      icon: '📉',
      description: 'Monthly employee turnover rates over time'
    },
    {
      title: 'Employee Tenure Distribution',
      data: tenureDistribution,
      tableData: transformTenureDistributionData(),
      testId: 'tenure-distribution-chart',
      tag: `${tenureDistribution.length} tenure ranges`,
      icon: '⏱️',
      description: 'Distribution of employees by tenure length'
    },
    {
      title: 'Retention by Department',
      data: retentionByDepartment,
      tableData: transformRetentionByDepartmentData(),
      testId: 'retention-by-department-chart',
      tag: `${retentionByDepartment.length} departments`,
      icon: '🏢',
      description: 'Employee retention rates by organizational unit'
    }
  ];

  if (error) {
    return (
      <div data-testid="turnover-retention-error">
        <Card className="gba:border-red-200 gba:bg-red-50">
          <CardContent className="gba:p-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-red-900 gba:font-medium gba:mb-2">Failed to Load Turnover & Retention Data</h3>
                <p className="gba:text-red-700">{error}</p>
              </div>
              <button 
                onClick={refetch}
                className="gba:px-4 gba:py-2 gba:bg-red-600 gba:text-white gba:rounded gba:hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="turnover-retention-tab">
      {/* Statistics Overview */}
      <TurnoverRetentionStatistics 
        statistics={statistics}
        isLoading={isLoading}
        dataTestId="turnover-retention"
      />

      {/* Interactive Charts Section */}
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
          Turnover & Retention Analytics
        </h3>
        <p className="gba:text-sm gba:text-gray-600">
          Click on any chart to view detailed data table
        </p>
      </div>

      {/* Top Row: Two Charts Side by Side */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:mt-6">
        {chartConfigs.slice(0, 2).map((config) => {
          const isSelected = selectedChart === config.testId;
          
          return (
            <Card 
              key={config.testId}
              data-testid={`${config.testId}-card`}
              className={`gba:cursor-pointer gba:transition-all gba:duration-200 ${
                isSelected 
                  ? 'gba:ring-2 gba:ring-blue-500 gba:shadow-lg' 
                  : 'gba:hover:shadow-lg'
              }`}
              onClick={() => handleChartClick(config.testId)}
            >
              <CardHeader className="gba:border-b">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span>{config.icon}</span>
                    <CardTitle className="gba:text-sm">{config.title}</CardTitle>
                  </div>
                  <Badge variant="outline" className="gba:text-xs">
                    {config.tag}
                  </Badge>
                </div>
                {isSelected && (
                  <p className="gba:text-xs gba:text-blue-600 gba:mt-1">
                    ✓ Selected - Table shown below
                  </p>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="gba:h-64">
                  {config.testId === 'turnover-rate-chart' && (
                    <TurnoverRateChart 
                      data={turnoverRateOverTime}
                      isLoading={isLoading}
                      dataTestId="turnover-rate-chart"
                    />
                  )}
                  {config.testId === 'tenure-distribution-chart' && (
                    <TenureDistributionChart 
                      data={tenureDistribution}
                      isLoading={isLoading}
                      dataTestId="tenure-distribution-chart"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom Row: Full Width Chart */}
      <div className="gba:mt-6">
        {(() => {
          const config = chartConfigs[2]; // Retention by Department chart
          const isSelected = selectedChart === config.testId;
          
          return (
            <Card 
              data-testid={`${config.testId}-card`}
              className={`gba:cursor-pointer gba:transition-all gba:duration-200 ${
                isSelected 
                  ? 'gba:ring-2 gba:ring-blue-500 gba:shadow-lg' 
                  : 'gba:hover:shadow-lg'
              }`}
              onClick={() => handleChartClick(config.testId)}
            >
              <CardHeader className="gba:border-b">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span>{config.icon}</span>
                    <CardTitle className="gba:text-sm">{config.title}</CardTitle>
                  </div>
                  <Badge variant="outline" className="gba:text-xs">
                    {config.tag}
                  </Badge>
                </div>
                {isSelected && (
                  <p className="gba:text-xs gba:text-blue-600 gba:mt-1">
                    ✓ Selected - Table shown below
                  </p>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="gba:h-64">
                  <RetentionByDepartmentChart 
                    data={retentionByDepartment}
                    isLoading={isLoading}
                    dataTestId="retention-by-department-chart"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Interactive Data Table */}
      {selectedChart && (() => {
        const selectedConfig = chartConfigs.find(config => config.testId === selectedChart);
        return selectedConfig && (
          <Card data-testid={`${selectedChart}-table`} className="gba:mt-6">
            <CardHeader>
              <div className="gba:flex gba:justify-between gba:items-center">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span>{selectedConfig.icon}</span>
                  <CardTitle className="gba:text-xl">Data Table: {selectedConfig.title}</CardTitle>
                  <Badge variant="outline" className="gba:bg-green-50 gba:text-green-700">
                    {selectedConfig.tableData.length} entries
                  </Badge>
                </div>
                <div className="gba:flex gba:gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={exportingTable === `${selectedConfig.testId}-excel`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('excel', selectedConfig.testId, selectedConfig.tableData);
                    }}
                    data-testid={`${selectedConfig.testId}-export-excel`}
                    className="gba:flex gba:items-center gba:gap-1"
                  >
                    <PiFileText className="gba:w-3 gba:h-3" />
                    Export Excel
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={exportingTable === `${selectedConfig.testId}-pdf`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('pdf', selectedConfig.testId, selectedConfig.tableData);
                    }}
                    data-testid={`${selectedConfig.testId}-export-pdf`}
                    className="gba:flex gba:items-center gba:gap-1"
                  >
                    <PiFilePdf className="gba:w-3 gba:h-3" />
                    Export PDF
                  </Button>
                </div>
              </div>
              <p className="gba:text-sm gba:text-gray-600 gba:mt-2">
                {selectedConfig.description}
              </p>
            </CardHeader>
            
            <CardContent>
              <div className="gba:max-h-96 gba:overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="gba:w-2/5">
                        {selectedConfig.testId === 'turnover-rate-chart' ? 'Month' :
                         selectedConfig.testId === 'tenure-distribution-chart' ? 'Tenure Range' :
                         'Department'}
                      </TableHead>
                      <TableHead className="gba:w-3/5">
                        {selectedConfig.testId === 'turnover-rate-chart' ? 'Turnover Rate' :
                         selectedConfig.testId === 'tenure-distribution-chart' ? 'Employees' :
                         'Retention Rate'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedConfig.tableData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="gba:font-medium">{item.category}</TableCell>
                        <TableCell>
                          {typeof item.value === 'number' ? (
                            <Badge variant="outline" className="gba:bg-blue-50 gba:text-blue-700">
                              {item.value.toLocaleString()}
                            </Badge>
                          ) : (
                            <span className="gba:text-sm">{item.value}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Summary */}
              <div className="gba:mt-4 gba:p-3 gba:bg-gray-50 gba:rounded-md gba:flex gba:justify-between gba:items-center">
                <span className="gba:font-medium gba:text-sm">
                  Total entries: {selectedConfig.tableData.length}
                </span>
                <span className="gba:text-sm gba:text-gray-600">
                  {selectedConfig.title}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Help Text */}
      {!selectedChart && (
        <div className="gba:text-center gba:py-8">
          <p className="gba:text-gray-500">
            Click on any chart above to view its detailed data table
          </p>
        </div>
      )}
    </div>
  );
};

export default TurnoverRetention; 