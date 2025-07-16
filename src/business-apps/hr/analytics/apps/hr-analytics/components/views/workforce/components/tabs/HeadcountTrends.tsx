import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system';
import { PiFileText, PiFilePdf } from 'react-icons/pi';
import { BusinessAppContextProps } from '../../../../../../../../../../common/BusinessAppContext';
import HeadcountStatistics from '../components/HeadcountStatistics';
import HeadcountTrendsChart from '../components/HeadcountTrendsChart';
import HiresAndDeparturesChart from '../components/HiresAndDeparturesChart';
import HeadcountByOrgUnitChart from '../components/HeadcountByOrgUnitChart';
import { useHeadcountTrendsData } from '../hooks/useHeadcountTrendsData';

interface HeadcountTrendsProps extends BusinessAppContextProps {}

interface TableData {
  category: string;
  value: number | string;
  date?: string;
}

const HeadcountTrends: React.FC<HeadcountTrendsProps> = (context) => {
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [exportingTable, setExportingTable] = useState<string | null>(null);

  const {
    currentHeadcount,
    headcountOverTime,
    monthlyHires,
    monthlyExits,
    netChange,
    departmentData,
    statistics,
    isLoading,
    error,
    refetch
  } = useHeadcountTrendsData(context);

  // Transform data for table display
  const transformHeadcountOverTimeData = (): TableData[] => {
    return headcountOverTime.map(item => ({
      category: new Date(item.dateCategory).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      }),
      value: item.value,
      date: item.dateCategory
    }));
  };

  const transformHiresAndDeparturesData = (): TableData[] => {
    // Combine hires, exits, and net change data by date
    const dataMap = new Map();
    
    monthlyHires.forEach(item => {
      const date = new Date(item.dateCategory).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      if (!dataMap.has(item.dateCategory)) {
        dataMap.set(item.dateCategory, { date, hires: 0, departures: 0, netChange: 0 });
      }
      dataMap.get(item.dateCategory).hires = item.value;
    });
    
    monthlyExits.forEach(item => {
      const date = new Date(item.dateCategory).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      if (!dataMap.has(item.dateCategory)) {
        dataMap.set(item.dateCategory, { date, hires: 0, departures: 0, netChange: 0 });
      }
      dataMap.get(item.dateCategory).departures = item.value;
    });
    
    netChange.forEach(item => {
      const date = new Date(item.dateCategory).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      if (!dataMap.has(item.dateCategory)) {
        dataMap.set(item.dateCategory, { date, hires: 0, departures: 0, netChange: 0 });
      }
      dataMap.get(item.dateCategory).netChange = item.value;
    });

    return Array.from(dataMap.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([_, data]) => ({
        category: data.date,
        value: `${data.hires} hires, ${data.departures} departures (${data.netChange > 0 ? '+' : ''}${data.netChange})`,
        date: _
      }));
  };

  const transformOrgUnitData = (): TableData[] => {
    return departmentData
      .sort((a, b) => b.value - a.value)
      .map(item => ({
        category: item.category,
        value: item.value
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
      title: 'Total Headcount Over Time',
      data: headcountOverTime,
      tableData: transformHeadcountOverTimeData(),
      testId: 'headcount-trends-chart',
      tag: `${headcountOverTime.length} data points`,
      icon: '📈',
      description: 'Historical headcount trends over time'
    },
    {
      title: 'Monthly Hires & Departures',
      data: [...monthlyHires, ...monthlyExits],
      tableData: transformHiresAndDeparturesData(),
      testId: 'hires-departures-chart',
      tag: `${Math.max(monthlyHires.length, monthlyExits.length)} months`,
      icon: '🔄',
      description: 'Monthly hiring and departure activity'
    },
    {
      title: 'Headcount by Organizational Unit',
      data: departmentData,
      tableData: transformOrgUnitData(),
      testId: 'headcount-by-org-unit-chart',
      tag: `${departmentData.length} departments`,
      icon: '🏢',
      description: 'Current headcount distribution by organizational unit'
    }
  ];

  if (error) {
    return (
      <div data-testid="headcount-trends-error">
        <Card className="gba:border-red-200 gba:bg-red-50">
          <CardContent className="gba:p-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-red-900 gba:font-medium gba:mb-2">Failed to Load Headcount Data</h3>
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
    <div data-testid="headcount-trends-tab">
      {/* Statistics Overview */}
      <HeadcountStatistics 
        statistics={statistics}
        isLoading={isLoading}
        dataTestId="headcount-trends"
      />

      {/* Interactive Charts Section */}
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
          Workforce Charts
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
                  {config.testId === 'headcount-trends-chart' && (
                    <HeadcountTrendsChart 
                      data={headcountOverTime}
                      isLoading={isLoading}
                      dataTestId="headcount-trends-chart"
                    />
                  )}
                  {config.testId === 'hires-departures-chart' && (
                    <HiresAndDeparturesChart 
                      hiresData={monthlyHires}
                      exitsData={monthlyExits}
                      netChangeData={netChange}
                      isLoading={isLoading}
                      dataTestId="hires-departures-chart"
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
          const config = chartConfigs[2]; // Organizational Unit chart
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
                  <HeadcountByOrgUnitChart 
                    data={departmentData}
                    isLoading={isLoading}
                    dataTestId="headcount-by-org-unit-chart"
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
                        {selectedConfig.testId === 'headcount-trends-chart' ? 'Month' :
                         selectedConfig.testId === 'hires-departures-chart' ? 'Month' :
                         'Organizational Unit'}
                      </TableHead>
                      <TableHead className="gba:w-3/5">
                        {selectedConfig.testId === 'headcount-trends-chart' ? 'Headcount' :
                         selectedConfig.testId === 'hires-departures-chart' ? 'Activity' :
                         'Employees'}
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

export default HeadcountTrends; 